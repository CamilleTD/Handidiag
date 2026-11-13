from fastapi import APIRouter, HTTPException, Response, status

from app import stats
from app.config import get_settings
from app.models import Level, Question
from app.schemas import EventIn
from app.services import PROFILE_QUESTION, public_content

router = APIRouter(tags=["public"])


@router.get("/content")
async def content(response: Response):
    """Questionnaire, règles et restitution, en une seule requête."""
    response.headers["Cache-Control"] = "no-cache"
    return await public_content()


@router.post("/events", status_code=status.HTTP_204_NO_CONTENT)
async def event(body: EventIn):
    """Incrémente des compteurs anonymes. Aucune réponse individuelle n'est reçue."""
    if get_settings().disable_stats:
        return
    if body.t == "deep":
        await stats.increment("deep")
    elif body.t == "start":
        if body.lang not in stats.LANGS:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Langue inconnue")
        await stats.increment("start")
        await stats.increment("lang", body.lang)
    elif body.t == "complete":
        profile = await Question.get_or_none(key=PROFILE_QUESTION).prefetch_related("options")
        profiles = {o.key for o in profile.options} if profile else set()
        if body.profile not in profiles or not await Level.exists(key=body.level):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Profil ou niveau inconnu")
        # Compteurs séparés : le couple (profil, niveau) n'est jamais enregistré
        await stats.increment("complete")
        await stats.increment("profile", body.profile)
        await stats.increment("level", body.level)
    elif body.t == "doc":
        if body.doc not in stats.DOCUMENTS:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Document inconnu")
        await stats.increment("doc", body.doc)
