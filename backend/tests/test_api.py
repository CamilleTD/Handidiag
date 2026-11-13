from app.models import StatCounter
from app.stats import mask_dimension


def question(key="new_q", **extra):
    return {
        "key": key,
        "kind": "single",
        "text": {"fr": "Une question ?", "en": "A question?"},
        "options": [
            {"key": "yes", "label": {"fr": "Oui", "en": "Yes"}},
            {"key": "no", "label": {"fr": "Non"}},
        ],
        **extra,
    }


async def find(admin, path, key):
    return next(item for item in (await admin.get(path)).json() if item["key"] == key)


async def test_public_content_contains_seeded_data(client):
    data = (await client.get("/api/content")).json()
    assert len(data["questions"]) == 59
    assert {level["key"] for level in data["levels"]} == {"explore", "talk", "talk_soon", "already"}
    assert data["profile_contacts"]["student"][0] == "pole_social"
    assert "id" not in data["questions"][0]


async def test_admin_routes_require_a_session(client):
    assert (await client.get("/api/admin/questions")).status_code == 401


async def test_login_rejects_wrong_password(client):
    response = await client.post("/api/auth/login", json={"username": "admin", "password": "nope"})
    assert response.status_code == 401


async def test_logout_revokes_the_session(admin):
    assert (await admin.post("/api/auth/logout")).status_code == 204
    assert (await admin.get("/api/auth/me")).status_code == 401


async def test_create_question_validates_its_condition(admin):
    bad = question(show_if={"q": "duration", "in": ["unknown_option"]})
    response = await admin.post("/api/admin/questions", json=bad)
    assert response.status_code == 422
    assert "unknown_option" in response.json()["detail"]

    good = question(show_if={"q": "duration", "in": ["long"]})
    response = await admin.post("/api/admin/questions", json=good)
    assert response.status_code == 201
    assert response.json()["options"][1]["label"] == {"fr": "Non", "en": ""}


async def test_question_key_is_immutable(admin):
    created = (await admin.post("/api/admin/questions", json=question())).json()
    response = await admin.put(f"/api/admin/questions/{created['id']}", json=question("renamed"))
    assert response.status_code == 409


async def test_cannot_delete_a_question_used_by_rules(admin):
    duration = await find(admin, "/api/admin/questions", "duration")
    response = await admin.delete(f"/api/admin/questions/{duration['id']}")
    assert response.status_code == 409
    assert "R_duration_long" in response.json()["detail"]


async def test_cannot_remove_an_option_used_by_a_rule(admin):
    duration = await find(admin, "/api/admin/questions", "duration")
    duration["options"] = [o for o in duration["options"] if o["key"] != "long"]
    response = await admin.put(f"/api/admin/questions/{duration['id']}", json=duration)
    assert response.status_code == 409


async def test_rule_crud_and_reference_checks(admin):
    rule = {
        "key": "R_test",
        "condition": {"q": "duration", "in": ["long"]},
        "points": 2,
        "flags": ["urgent"],
        "suggestions": ["posture"],
        "override_level": "talk",
        "explanation": {"fr": "Test"},
    }
    created = await admin.post("/api/admin/rules", json=rule)
    assert created.status_code == 201
    assert created.json()["flags"] == ["urgent"]

    rule["flags"] = ["does_not_exist"]
    updated = await admin.put(f"/api/admin/rules/{created.json()['id']}", json=rule)
    assert updated.status_code == 422

    talk = await find(admin, "/api/admin/levels", "talk")
    assert (await admin.delete(f"/api/admin/levels/{talk['id']}")).status_code == 409


async def test_flag_used_by_a_rule_cannot_be_deleted(admin):
    urgent = await find(admin, "/api/admin/flags", "urgent")
    assert (await admin.delete(f"/api/admin/flags/{urgent['id']}")).status_code == 409


async def test_reorder_rules(admin):
    rules = (await admin.get("/api/admin/rules")).json()
    ids = [rule["id"] for rule in reversed(rules)]
    assert (await admin.post("/api/admin/rules/reorder", json={"ids": ids})).status_code == 204
    assert (await admin.get("/api/admin/rules")).json()[0]["id"] == ids[0]
    assert (await admin.post("/api/admin/rules/reorder", json={"ids": ids[1:]})).status_code == 422


async def test_contact_profiles_are_validated(admin):
    contact = {
        "key": "new_contact",
        "name": {"fr": "Contact"},
        "role": {"fr": "Rôle"},
        "profiles": ["astronaut"],
    }
    assert (await admin.post("/api/admin/contacts", json=contact)).status_code == 422
    contact["profiles"] = ["student"]
    assert (await admin.post("/api/admin/contacts", json=contact)).status_code == 201
    content = (await admin.get("/api/content")).json()
    assert content["profile_contacts"]["student"][-1] == "new_contact"


async def test_pole_outcome_update(admin):
    body = {"title": {"fr": "Titre"}, "body": {"fr": "Corps", "en": "Body"}}
    assert (await admin.put("/api/admin/pole-outcomes/maybe", json=body)).status_code == 200
    content = (await admin.get("/api/content")).json()
    assert content["pole_outcomes"]["maybe"]["title"] == {"fr": "Titre", "en": ""}


async def test_events_are_whitelisted_and_counted_separately(client):
    assert (await client.post("/api/events", json={"t": "start", "lang": "de"})).status_code == 422
    assert (await client.post("/api/events", json={"t": "start", "lang": "fr"})).status_code == 204
    complete = {"t": "complete", "profile": "student", "level": "talk"}
    assert (await client.post("/api/events", json=complete)).status_code == 204
    metrics = {(c.metric, c.key) for c in await StatCounter.all()}
    assert metrics == {
        ("start", ""),
        ("lang", "fr"),
        ("complete", ""),
        ("profile", "student"),
        ("level", "talk"),
    }


def test_single_small_cell_forces_a_second_mask():
    masked = mask_dimension({"a": 2, "b": 10, "c": 30}, ["a", "b", "c"], k=5)
    assert masked == {"a": "<5", "b": "<5*", "c": 30}


async def test_password_change_rules(admin):
    weak = {"current": "Test-Password-2026", "new": "short"}
    assert (await admin.post("/api/auth/password", json=weak)).status_code == 422
    wrong = {"current": "wrong", "new": "Another-Password-2027"}
    assert (await admin.post("/api/auth/password", json=wrong)).status_code == 403
    ok = {"current": "Test-Password-2026", "new": "Another-Password-2027"}
    assert (await admin.post("/api/auth/password", json=ok)).status_code == 204
    assert (await admin.get("/api/auth/me")).status_code == 200
