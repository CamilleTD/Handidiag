"""Verrou de modification des questionnaires et republication groupée."""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth import hash_password
from app.main import app
from app.models import AdminUser, Questionnaire

BASE = "/api/admin/questionnaires"
PASSWORD = "Autre-Mot-De-Passe-2026"


@pytest.fixture
async def other():
    """Deuxième administrateur, connecté dans son propre navigateur."""
    await AdminUser.create(username="camille", password_hash=hash_password(PASSWORD))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        response = await c.post(
            "/api/auth/login", json={"username": "camille", "password": PASSWORD}
        )
        assert response.status_code == 200
        yield c


async def questionnaire_id(admin, key="rqth") -> int:
    rows = (await admin.get(BASE)).json()
    return next(q["id"] for q in rows if q["key"] == key)


def code(response) -> str:
    return response.json()["detail"]["code"]


# --------------------------------------------------------------------------- verrou


async def test_lock_blocks_changes_from_another_session(admin, other):
    qid = await questionnaire_id(admin)
    lock = (await admin.post(f"{BASE}/{qid}/lock", json={})).json()
    assert lock["by"] == "admin" and lock["mine"]

    # L'autre administrateur voit qui modifie, peut lire, mais pas modifier
    response = await other.post(f"{BASE}/{qid}/lock", json={})
    assert response.status_code == 409 and code(response) == "questionnaire_locked"
    assert response.json()["detail"]["params"]["user"] == "admin"
    assert (await other.get(f"{BASE}/{qid}")).status_code == 200
    row = next(q for q in (await other.get(BASE)).json() if q["id"] == qid)
    assert row["lock"] == {"by": "admin", "until": row["lock"]["until"], "mine": False}

    for method, path, body in [
        ("put", "", {"key": "rqth", "title": {"fr": "Piraté"}}),
        ("post", "/publish", {}),
        ("post", "/unpublish", {}),
        ("post", "/sections", {"title": {"fr": "Nouvelle"}}),
        ("delete", "", None),
    ]:
        kwargs = {"json": body} if body is not None else {}
        response = await other.request(method.upper(), f"{BASE}/{qid}{path}", **kwargs)
        assert response.status_code == 409, (method, path)
        assert code(response) == "questionnaire_locked"

    # Celui qui tient le verrou modifie normalement
    response = await admin.post(f"{BASE}/{qid}/sections", json={"title": {"fr": "Nouvelle"}})
    assert response.status_code == 201


async def test_released_lock_lets_someone_else_edit(admin, other):
    qid = await questionnaire_id(admin)
    await admin.post(f"{BASE}/{qid}/lock", json={})
    # Rendre le verrou d'un autre n'a aucun effet
    assert (await other.delete(f"{BASE}/{qid}/lock")).status_code == 204
    assert (await other.post(f"{BASE}/{qid}/lock", json={})).status_code == 409

    assert (await admin.delete(f"{BASE}/{qid}/lock")).status_code == 204
    assert (await other.post(f"{BASE}/{qid}/lock", json={})).json()["by"] == "camille"
    response = await admin.post(f"{BASE}/{qid}/sections", json={"title": {"fr": "x"}})
    assert code(response) == "questionnaire_locked"


async def test_expired_lock_is_ignored(admin, other):
    qid = await questionnaire_id(admin)
    await admin.post(f"{BASE}/{qid}/lock", json={})
    # Onglet fermé sans prévenir : le verrou n'est plus renouvelé
    await Questionnaire.filter(id=qid).update(locked_until=datetime.now(UTC) - timedelta(seconds=1))
    assert next(q for q in (await other.get(BASE)).json() if q["id"] == qid)["lock"] is None
    assert (await other.post(f"{BASE}/{qid}/lock", json={})).json()["mine"]


async def test_force_takes_over_and_the_previous_editor_is_stopped(admin, other):
    qid = await questionnaire_id(admin)
    await admin.post(f"{BASE}/{qid}/lock", json={})
    taken = (await other.post(f"{BASE}/{qid}/lock", json={"force": True})).json()
    assert taken["by"] == "camille"
    # Le renouvellement suivant de l'ancien détenteur échoue : son écran passe en lecture seule
    response = await admin.post(f"{BASE}/{qid}/lock", json={})
    assert code(response) == "questionnaire_locked"


# --------------------------------------------------------------------------- republication


async def edit_shared_question(admin, key="duration") -> None:
    rows = (await admin.get("/api/admin/questions")).json()
    question = next(q for q in rows if q["key"] == key)
    question["text"] = {"fr": "Depuis combien de temps ?", "en": "For how long?"}
    response = await admin.put(f"/api/admin/questions/{question['id']}", json=question)
    assert response.status_code == 200, response.text


def public_text(questionnaire: dict, key: str) -> str:
    questions = [q for section in questionnaire["sections"] for q in section["questions"]]
    return next(q["text"]["fr"] for q in questions if q["key"] == key)


async def test_republish_all_questionnaires_using_a_shared_question(admin):
    await edit_shared_question(admin)
    rqth = (await admin.get(f"{BASE}/{await questionnaire_id(admin)}")).json()
    assert rqth["has_changes"]
    # La version publique reste l'ancienne tant qu'on ne republie pas
    public = (await admin.get("/api/questionnaires/rqth")).json()
    assert public_text(public, "duration") != "Depuis combien de temps ?"

    result = (await admin.post(f"{BASE}/republish", json={})).json()
    assert result == {"published": ["rqth"], "unchanged": ["pole"], "locked": []}
    public = (await admin.get("/api/questionnaires/rqth")).json()
    assert public["version"] == 2
    assert public_text(public, "duration") == "Depuis combien de temps ?"


async def test_republish_only_the_requested_questionnaires(admin):
    await edit_shared_question(admin)
    result = (await admin.post(f"{BASE}/republish", json={"keys": ["pole"]})).json()
    assert result == {"published": [], "unchanged": ["pole"], "locked": []}
    assert (await admin.get("/api/questionnaires/rqth")).json()["version"] == 1


async def test_republish_skips_questionnaires_being_edited_by_someone_else(admin, other):
    await edit_shared_question(admin)
    qid = await questionnaire_id(admin)
    await other.post(f"{BASE}/{qid}/lock", json={})
    result = (await admin.post(f"{BASE}/republish", json={})).json()
    assert result["published"] == []
    assert result["locked"] == [{"key": "rqth", "by": "camille"}]
    assert (await admin.get("/api/questionnaires/rqth")).json()["version"] == 1


async def test_republish_is_all_or_nothing(admin):
    await edit_shared_question(admin)
    # « pole » devient impubliable : plus aucun résultat par défaut (score minimal)
    pole = (await admin.get(f"{BASE}/{await questionnaire_id(admin, 'pole')}")).json()
    for outcome in pole["outcomes"]:
        outcome["min_score"] = None
        response = await admin.put(f"{BASE}/{pole['id']}/outcomes/{outcome['id']}", json=outcome)
        assert response.status_code == 200, response.text

    response = await admin.post(f"{BASE}/republish", json={})
    assert code(response) == "republish_blocked"
    assert response.json()["detail"]["params"]["questionnaire"] == "pole"
    # « rqth » n'a pas été publié non plus
    assert (await admin.get("/api/questionnaires/rqth")).json()["version"] == 1
