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


async def test_public_content_lists_published_questionnaires(client):
    data = (await client.get("/api/content")).json()
    assert [(q["key"], q["featured"]) for q in data["questionnaires"]] == [
        ("pole", True),
        ("rqth", False),
    ]
    rqth = (await client.get("/api/questionnaires/rqth")).json()
    assert rqth["version"] == 1
    assert [s["optional"] for s in rqth["sections"]] == [False, True]
    assert {o["key"] for o in rqth["outcomes"]} == {"explore", "talk", "talk_soon", "already"}
    pole = (await client.get("/api/questionnaires/pole")).json()
    assert {o["next"]["key"] for o in pole["outcomes"]} == {"rqth"}


async def test_admin_routes_require_a_session(client):
    response = await client.get("/api/admin/questions")
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "session_expired"


async def test_login_rejects_wrong_password(client):
    response = await client.post("/api/auth/login", json={"username": "admin", "password": "nope"})
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "login_failed"


async def test_logout_revokes_the_session(admin):
    assert (await admin.post("/api/auth/logout")).status_code == 204
    assert (await admin.get("/api/auth/me")).status_code == 401


async def test_question_bank_crud(admin):
    created = await admin.post("/api/admin/questions", json=question())
    assert created.status_code == 201
    assert created.json()["options"][1]["label"] == {"fr": "Non", "en": ""}
    renamed = await admin.put(f"/api/admin/questions/{created.json()['id']}", json=question("x"))
    assert renamed.json()["detail"]["code"] == "key_immutable"
    assert (await admin.delete(f"/api/admin/questions/{created.json()['id']}")).status_code == 204


async def test_question_used_by_a_questionnaire_cannot_be_deleted(admin):
    duration = await find(admin, "/api/admin/questions", "duration")
    assert duration["used_in"] == ["rqth"]
    response = await admin.delete(f"/api/admin/questions/{duration['id']}")
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "question_in_use"


async def test_option_cited_by_a_rule_cannot_be_removed(admin):
    duration = await find(admin, "/api/admin/questions", "duration")
    duration["options"] = [o for o in duration["options"] if o["key"] != "long"]
    response = await admin.put(f"/api/admin/questions/{duration['id']}", json=duration)
    assert response.status_code == 409
    assert "R_duration_long" in response.json()["detail"]["params"]["places"]


async def test_rule_condition_must_fit_every_questionnaire_using_it(admin):
    rule = await find(admin, "/api/admin/rules", "R_duration_long")
    assert rule["used_in"] == ["rqth"]
    rule["condition"] = {"q": "pole", "in": ["yes"]}  # question absente du questionnaire RQTH
    response = await admin.put(f"/api/admin/rules/{rule['id']}", json=rule)
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "condition_unknown_question"


async def test_shared_rule_and_deletion_protection(admin):
    shared = [r for r in (await admin.get("/api/admin/rules")).json() if len(r["used_in"]) == 2]
    assert shared, "au moins une règle est partagée par les deux questionnaires"
    response = await admin.delete(f"/api/admin/rules/{shared[0]['id']}")
    assert response.json()["detail"]["code"] == "rule_in_use"


async def test_flag_and_contact_in_use_are_protected(admin):
    urgent = await find(admin, "/api/admin/flags", "urgent")
    assert (await admin.delete(f"/api/admin/flags/{urgent['id']}")).status_code == 409
    mdph = await find(admin, "/api/admin/contacts", "mdph")
    assert (await admin.delete(f"/api/admin/contacts/{mdph['id']}")).status_code == 409


async def test_events_are_whitelisted_and_counted_per_questionnaire(client):
    start = {"t": "start", "questionnaire": "rqth", "lang": "fr"}
    assert (await client.post("/api/events", json={**start, "lang": "de"})).status_code == 422
    assert (
        await client.post("/api/events", json={**start, "questionnaire": "x"})
    ).status_code == 404
    assert (await client.post("/api/events", json=start)).status_code == 204
    complete = {"t": "complete", "questionnaire": "rqth", "outcome": "talk"}
    assert (await client.post("/api/events", json=complete)).status_code == 204
    bad = {**complete, "outcome": "followed"}  # résultat du questionnaire « pole »
    assert (await client.post("/api/events", json=bad)).status_code == 422
    metrics = {(c.questionnaire, c.metric, c.key) for c in await StatCounter.all()}
    assert metrics == {
        ("rqth", "start", ""),
        ("rqth", "lang", "fr"),
        ("rqth", "complete", ""),
        ("rqth", "outcome", "talk"),
    }


async def test_stats_dashboard(admin):
    assert (await admin.post("/api/admin/stats/rqth/demo")).status_code == 204
    data = (await admin.get("/api/admin/stats/rqth")).json()
    assert set(data["by_outcome"]) == {"explore", "talk", "talk_soon", "already"}
    assert (await admin.get("/api/admin/stats/unknown")).status_code == 404


def test_single_small_cell_forces_a_second_mask():
    masked = mask_dimension({"a": 2, "b": 10, "c": 30}, ["a", "b", "c"], k=5)
    assert masked == {"a": "<5", "b": "<5*", "c": 30}


async def test_password_change_rules(admin):
    weak = {"current": "Test-Password-2026", "new": "short"}
    assert (await admin.post("/api/auth/password", json=weak)).status_code == 422
    wrong = {"current": "wrong", "new": "Another-Password-2027"}
    response = await admin.post("/api/auth/password", json=wrong)
    assert response.json()["detail"]["code"] == "password_wrong"
    ok = {"current": "Test-Password-2026", "new": "Another-Password-2027"}
    assert (await admin.post("/api/auth/password", json=ok)).status_code == 204
    assert (await admin.get("/api/auth/me")).status_code == 200
