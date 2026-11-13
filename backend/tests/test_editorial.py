from app.models import StatCounter


def page(slug="nouvelle-page", **extra):
    return {
        "slug": slug,
        "title": {"fr": "Titre", "en": "Title"},
        "intro": {"fr": "Introduction"},
        "blocks": [
            {"type": "text", "title": {"fr": "Bloc"}, "text": {"fr": "Texte"}},
            {"type": "link", "title": {"fr": "Lien"}, "url": "https://example.org/"},
        ],
        **extra,
    }


async def test_public_content_lists_resources_and_pages(client):
    data = (await client.get("/api/content")).json()
    sections = {r["section"] for r in data["resources"]}
    assert sections == {"official", "public", "association", "law"}
    assert {"slug", "title"} == set(data["pages"][0])
    first = data["pages"][0]["slug"]
    assert (await client.get(f"/api/pages/{first}")).json()["blocks"]


async def test_page_crud_and_validation(admin):
    created = await admin.post("/api/admin/pages", json=page())
    assert created.status_code == 201
    assert (await admin.post("/api/admin/pages", json=page())).status_code == 409

    bad_link = page(
        "autre", blocks=[{"type": "link", "title": {"fr": "x"}, "url": "javascript:alert(1)"}]
    )
    assert (await admin.post("/api/admin/pages", json=bad_link)).status_code == 422
    bad_pdf = page(
        "autre", blocks=[{"type": "document", "title": {"fr": "x"}, "url": "https://x/a.pdf"}]
    )
    assert (await admin.post("/api/admin/pages", json=bad_pdf)).status_code == 422

    page_id = created.json()["id"]
    hidden = page(is_published=False)
    assert (await admin.put(f"/api/admin/pages/{page_id}", json=hidden)).status_code == 200
    assert (await admin.get("/api/pages/nouvelle-page")).status_code == 404


async def test_resource_crud_and_stats_whitelist(admin):
    resource = {
        "section": "official",
        "key": "new_link",
        "url": "https://example.org/",
        "title": {"fr": "Nouveau lien"},
        "description": {"fr": "Description"},
    }
    created = await admin.post("/api/admin/resources", json=resource)
    assert created.status_code == 201
    # Un lien officiel ajouté devient comptable dans les statistiques
    assert (
        await admin.post("/api/events", json={"t": "doc", "doc": "new_link"})
    ).status_code == 204
    assert await StatCounter.exists(metric="doc", key="new_link")

    moved = {**resource, "section": "law"}
    response = await admin.put(f"/api/admin/resources/{created.json()['id']}", json=moved)
    assert response.status_code == 409


async def test_reorder_resources_within_a_section(admin):
    laws = [r for r in (await admin.get("/api/admin/resources")).json() if r["section"] == "law"]
    ids = [r["id"] for r in reversed(laws)]
    assert (
        await admin.post("/api/admin/resources/reorder/law", json={"ids": ids})
    ).status_code == 204
    laws = [r for r in (await admin.get("/api/admin/resources")).json() if r["section"] == "law"]
    assert [r["id"] for r in laws] == ids
