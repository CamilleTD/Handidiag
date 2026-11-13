"""Constructeur de questionnaires : brouillon, validation, publication."""

BASE = "/api/admin/questionnaires"


async def create(admin, key="test", **extra):
    body = {"key": key, "title": {"fr": "Test"}, **extra}
    response = await admin.post(BASE, json=body)
    assert response.status_code == 201, response.text
    return response.json()


async def test_new_questionnaire_starts_as_unpublished_draft(admin):
    q = await create(admin)
    assert q["published"] is None and q["has_changes"]
    assert len(q["sections"]) == 1 and q["outcomes"][0]["min_score"] == 0
    # Pas encore publié : invisible du public
    assert (await admin.get("/api/questionnaires/test")).status_code == 404
    # Rien à publier sans question
    response = await admin.post(f"{BASE}/{q['id']}/publish")
    assert response.json()["detail"]["code"] == "publish_no_question"


async def test_build_publish_and_edit_without_breaking_the_published_version(admin):
    q = await create(admin)
    section = q["sections"][0]["id"]
    q = (
        await admin.post(
            f"{BASE}/{q['id']}/sections/{section}/items", json={"question": "duration"}
        )
    ).json()
    # Une question de la banque n'est placée qu'une fois par questionnaire
    again = await admin.post(
        f"{BASE}/{q['id']}/sections/{section}/items", json={"question": "duration"}
    )
    assert again.json()["detail"]["code"] == "question_already_in"

    q = (
        await admin.post(f"{BASE}/{q['id']}/rules", json={"rule": "R_duration_long", "points": 2})
    ).json()
    published = (await admin.post(f"{BASE}/{q['id']}/publish")).json()
    assert published["published"]["number"] == 1 and not published["has_changes"]
    public = (await admin.get("/api/questionnaires/test")).json()
    assert public["rules"][0]["points"] == 2

    # Modifier le brouillon ne change pas la version publiée
    usage = published["rules"][0]["id"]
    draft = (
        await admin.put(
            f"{BASE}/{q['id']}/rules/{usage}", json={"rule": "R_duration_long", "points": 5}
        )
    ).json()
    assert draft["has_changes"]
    assert (await admin.get("/api/questionnaires/test")).json()["rules"][0]["points"] == 2

    republished = (await admin.post(f"{BASE}/{q['id']}/publish")).json()
    assert republished["published"]["number"] == 2
    versions = (await admin.get(f"{BASE}/{q['id']}/versions")).json()
    assert [v["number"] for v in versions] == [2, 1]
    # Revenir à la version 1
    await admin.post(f"{BASE}/{q['id']}/versions/1/restore")
    assert (await admin.get("/api/questionnaires/test")).json()["rules"][0]["points"] == 2


async def test_rule_must_only_cite_questions_of_the_questionnaire(admin):
    q = await create(admin)
    response = await admin.post(f"{BASE}/{q['id']}/rules", json={"rule": "R_duration_long"})
    assert response.status_code == 422
    assert response.json()["detail"]["params"]["question"] == "duration"


async def test_cited_question_cannot_be_removed(admin):
    detail = next(q for q in (await admin.get(BASE)).json() if q["key"] == "rqth")
    rqth = (await admin.get(f"{BASE}/{detail['id']}")).json()
    duration = next(i for s in rqth["sections"] for i in s["items"] if i["question"] == "duration")
    response = await admin.delete(f"{BASE}/{rqth['id']}/items/{duration['id']}")
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "question_cited"


async def test_item_condition_is_validated_against_the_questionnaire(admin):
    q = await create(admin)
    section = q["sections"][0]["id"]
    bad = {"question": "areas", "show_if": {"q": "duration", "in": ["long"]}}
    response = await admin.post(f"{BASE}/{q['id']}/sections/{section}/items", json=bad)
    assert response.json()["detail"]["code"] == "condition_unknown_question"
    auto = {"question": "profile", "auto_answer": "astronaut"}
    response = await admin.post(f"{BASE}/{q['id']}/sections/{section}/items", json=auto)
    assert response.json()["detail"]["code"] == "auto_answer_unknown"


async def test_outcomes_and_featured_flag(admin):
    q = await create(admin, featured=True)
    listing = {item["key"]: item["featured"] for item in (await admin.get(BASE)).json()}
    assert listing == {"pole": False, "rqth": False, "test": True}
    outcome = {
        "key": "special",
        "title": {"fr": "Spécial"},
        "body": {"fr": "Texte"},
        "next_questionnaire": "rqth",
        "contacts": ["mdph"],
    }
    q = (await admin.post(f"{BASE}/{q['id']}/outcomes", json=outcome)).json()
    assert q["outcomes"][-1]["contacts"] == ["mdph"]
    unknown = {**outcome, "key": "other", "next_questionnaire": "nope"}
    response = await admin.post(f"{BASE}/{q['id']}/outcomes", json=unknown)
    assert response.json()["detail"]["code"] == "next_questionnaire_invalid"


async def test_preview_returns_the_draft(admin):
    q = await create(admin)
    preview = (await admin.get(f"{BASE}/{q['id']}/preview")).json()
    assert preview["key"] == "test" and "version" not in preview
