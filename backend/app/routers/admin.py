"""Statistiques de l'administration."""

import csv
import io
import random
from datetime import date, timedelta

from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse

from app import stats
from app.auth import current_admin
from app.config import get_settings
from app.errors import Problem, not_found
from app.models import Outcome, Questionnaire, StatCounter

router = APIRouter(prefix="/admin", tags=["statistiques"], dependencies=[Depends(current_admin)])


async def outcome_keys(questionnaire: str) -> list[str]:
    q = await Questionnaire.get_or_none(key=questionnaire)
    if q is None:
        raise not_found("Questionnaire introuvable")
    return list(await Outcome.filter(questionnaire=q).values_list("key", flat=True))


@router.get("/stats/{questionnaire}")
async def get_stats(questionnaire: str):
    data = await stats.dashboard(
        get_settings().stats_min_count, questionnaire, await outcome_keys(questionnaire)
    )
    data["disabled"] = get_settings().disable_stats
    return data


@router.get("/stats/{questionnaire}/csv")
async def export_stats(questionnaire: str):
    data = await get_stats(questionnaire)
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["questionnaire", "metrique", "cle", "valeur"])
    for key, value in data["totals"].items():
        writer.writerow([questionnaire, "total", key, "" if value is None else value])
    for metric in ("by_outcome", "by_lang", "documents"):
        for key, value in data[metric].items():
            writer.writerow([questionnaire, metric, key, value])
    for day in data["daily"]:
        writer.writerow([questionnaire, "jour_debut", day["date"], day["start"]])
        writer.writerow([questionnaire, "jour_fin", day["date"], day["complete"]])
    return StreamingResponse(
        iter([out.getvalue().encode("utf-8-sig")]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="handidiag-{questionnaire}.csv"'},
    )


def not_in_production() -> None:
    if get_settings().is_production:
        raise Problem(status.HTTP_403_FORBIDDEN, "production_only", "Indisponible en production.")


@router.post("/stats/{questionnaire}/demo", status_code=status.HTTP_204_NO_CONTENT)
async def add_demo_stats(questionnaire: str, sessions: int = 120):
    """Ajoute des compteurs fictifs pour une démonstration (hors production)."""
    not_in_production()
    outcomes = await outcome_keys(questionnaire) or ["default"]
    documents = await stats.document_keys()
    for _ in range(max(1, min(sessions, 1000))):
        day = date.today() - timedelta(days=random.randrange(14))
        await stats.increment("start", questionnaire=questionnaire, day=day)
        lang = random.choice(["fr"] * 6 + ["en"])
        await stats.increment("lang", lang, questionnaire=questionnaire, day=day)
        if random.random() < 0.7:
            await stats.increment("complete", questionnaire=questionnaire, day=day)
            outcome = random.choice(outcomes)
            await stats.increment("outcome", outcome, questionnaire=questionnaire, day=day)
        if random.random() < 0.35:
            await stats.increment("optional", questionnaire=questionnaire, day=day)
        if random.random() < 0.3:
            await stats.increment("doc", random.choice(documents), day=day)


@router.delete("/stats", status_code=status.HTTP_204_NO_CONTENT)
async def reset_stats():
    not_in_production()
    await StatCounter.all().delete()
