"""Verrou de modification des questionnaires.

Une seule session d'administration modifie un brouillon à la fois. Le constructeur prend le
verrou à l'ouverture, le renouvelle régulièrement tant qu'il est ouvert et le rend en partant.
Un verrou non renouvelé expire seul (onglet fermé, ordinateur en veille) ; un autre
administrateur peut aussi « prendre la main » explicitement.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import Depends, Request

from app.auth import current_session
from app.errors import conflict
from app.models import AdminSession, Questionnaire

# Durée de validité d'un verrou non renouvelé ; le navigateur le renouvelle toutes les 30 s
LOCK_SECONDS = 120


def active(q: Questionnaire) -> bool:
    return bool(q.lock_session and q.locked_until and q.locked_until > datetime.now(UTC))


def held_by_other(q: Questionnaire, session: AdminSession) -> bool:
    return active(q) and q.lock_session != session.token_hash


def lock_info(q: Questionnaire, session: AdminSession) -> dict[str, Any] | None:
    """État du verrou vu par la session courante (None : personne ne modifie)."""
    if not active(q):
        return None
    return {
        "by": q.locked_by,
        "until": q.locked_until,
        "mine": q.lock_session == session.token_hash,
    }


def locked_error(q: Questionnaire):
    return conflict(
        "questionnaire_locked",
        f"{q.locked_by} est en train de modifier ce questionnaire.",
        user=q.locked_by or "?",
    )


async def acquire(q: Questionnaire, session: AdminSession, force: bool = False) -> None:
    """Prend ou renouvelle le verrou. Refusé s'il est tenu par une autre session (sauf force)."""
    if held_by_other(q, session) and not force:
        raise locked_error(q)
    q.lock_session = session.token_hash
    q.locked_by = session.user.username
    q.locked_until = datetime.now(UTC) + timedelta(seconds=LOCK_SECONDS)
    await q.save(update_fields=["lock_session", "locked_by", "locked_until"])


async def release(q: Questionnaire, session: AdminSession) -> None:
    if q.lock_session == session.token_hash:
        q.lock_session = q.locked_by = q.locked_until = None
        await q.save(update_fields=["lock_session", "locked_by", "locked_until"])


async def editable(request: Request, session: AdminSession = Depends(current_session)) -> None:
    """Dépendance du routeur : refuse toute modification d'un questionnaire verrouillé par
    une autre session. Les lectures et la gestion du verrou lui-même restent permises."""
    qid = request.path_params.get("qid")
    if request.method in {"GET", "HEAD"} or qid is None or request.url.path.endswith("/lock"):
        return
    q = await Questionnaire.get_or_none(id=int(qid))
    if q is not None and held_by_other(q, session):
        raise locked_error(q)
