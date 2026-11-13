from fastapi import APIRouter, Response, status

from app import stats
from app.config import get_settings
from app.errors import invalid, not_found
from app.models import ContentPage, Questionnaire
from app.schemas import EventIn
from app.services import public_content, published_version

router = APIRouter(tags=["public"])


async def published(key: str) -> dict:
    q = await Questionnaire.get_or_none(key=key, published_number__isnull=False)
    version = await published_version(q) if q else None
    if version is None:
        raise not_found("Questionnaire introuvable")
    return {**version.snapshot, "version": version.number}


@router.get("/content")
async def content(response: Response):
    """Questionnaires publiés, ressources, pages et interlocuteurs de l'école."""
    response.headers["Cache-Control"] = "no-cache"
    return await public_content()


@router.get("/questionnaires/{key}")
async def questionnaire(key: str, response: Response):
    """Version publiée d'un questionnaire : le navigateur la déroule et l'évalue seul."""
    response.headers["Cache-Control"] = "no-cache"
    return await published(key)


@router.get("/pages/{slug}")
async def page(slug: str):
    item = await ContentPage.get_or_none(slug=slug, is_published=True)
    if item is None:
        raise not_found("Page introuvable")
    return {"slug": item.slug, "title": item.title, "intro": item.intro, "blocks": item.blocks}


@router.post("/events", status_code=status.HTTP_204_NO_CONTENT)
async def event(body: EventIn):
    """Incrémente des compteurs anonymes. Aucune réponse individuelle n'est reçue."""
    if get_settings().disable_stats:
        return
    if body.t == "doc":
        if body.doc not in await stats.document_keys():
            raise invalid("unknown_document", "Document inconnu")
        await stats.increment("doc", body.doc)
        return
    snapshot = await published(body.questionnaire or "")
    key = snapshot["key"]
    if body.t == "start":
        if body.lang not in stats.LANGS:
            raise invalid("unknown_lang", "Langue inconnue")
        await stats.increment("start", questionnaire=key)
        await stats.increment("lang", body.lang, questionnaire=key)
    elif body.t == "optional":
        await stats.increment("optional", questionnaire=key)
    elif body.t == "complete":
        if body.outcome not in {o["key"] for o in snapshot["outcomes"]}:
            raise invalid("unknown_outcome", "Résultat inconnu")
        await stats.increment("complete", questionnaire=key)
        await stats.increment("outcome", body.outcome, questionnaire=key)
