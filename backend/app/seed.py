"""Initialisation d'une base vide : contenu de départ et premier compte administrateur."""

import json
import logging
import secrets
from pathlib import Path

from tortoise.transactions import in_transaction

from app.auth import hash_password
from app.config import get_settings
from app.models import (
    AdminUser,
    Contact,
    Flag,
    Level,
    PoleOutcome,
    ProfileContact,
    Question,
    QuestionOption,
    Rule,
    Suggestion,
)

CONTENT_FILE = Path(__file__).resolve().parents[1] / "seed" / "content.json"
logger = logging.getLogger("handidiag")


async def seed_content(path: Path = CONTENT_FILE) -> bool:
    """Charge le contenu de départ si la base ne contient encore aucune question."""
    if await Question.exists():
        return False
    data = json.loads(path.read_text(encoding="utf-8"))
    async with in_transaction():
        for position, item in enumerate(data["questions"]):
            options = item.pop("options")
            question = await Question.create(**item, position=position)
            await QuestionOption.bulk_create(
                [QuestionOption(question=question, position=i, **o) for i, o in enumerate(options)]
            )
        levels = {}
        for position, item in enumerate(data["levels"]):
            levels[item["key"]] = await Level.create(**item, position=position)
        flags = {
            item["key"]: await Flag.create(**item, position=position)
            for position, item in enumerate(data["flags"])
        }
        suggestions = {
            item["key"]: await Suggestion.create(**item, position=position)
            for position, item in enumerate(data["suggestions"])
        }
        for position, item in enumerate(data["rules"]):
            rule = await Rule.create(
                key=item["key"],
                position=position,
                condition=item["condition"],
                points=item["points"],
                override_level=levels.get(item["override_level"]),
                pole_outcome=item["pole_outcome"],
                explanation=item["explanation"],
            )
            if item["flags"]:
                await rule.flags.add(*(flags[key] for key in item["flags"]))
            if item["suggestions"]:
                await rule.suggestions.add(*(suggestions[key] for key in item["suggestions"]))
        for item in data["pole_outcomes"]:
            await PoleOutcome.create(**item)
        contacts = {
            item["key"]: await Contact.create(**item, position=position)
            for position, item in enumerate(data["contacts"])
        }
        for profile, keys in data["profile_contacts"].items():
            await ProfileContact.bulk_create(
                [
                    ProfileContact(profile=profile, contact=contacts[key], position=i)
                    for i, key in enumerate(keys)
                ]
            )
    return True


async def seed_admin() -> None:
    """Crée le premier compte s'il n'en existe aucun.

    Sans ADMIN_PASSWORD, un mot de passe aléatoire est généré et affiché une seule fois dans
    les journaux ; il devra être changé à la première connexion.
    """
    if await AdminUser.exists():
        return
    settings = get_settings()
    password = settings.admin_password or secrets.token_urlsafe(12)
    await AdminUser.create(
        username=settings.admin_username.lower(),
        password_hash=hash_password(password),
        must_change_password=not settings.admin_password,
    )
    if not settings.admin_password:
        logger.warning(
            "Compte administrateur créé : %s / %s (à changer à la première connexion)",
            settings.admin_username,
            password,
        )


async def seed() -> None:
    if await seed_content():
        logger.info("Contenu de départ chargé.")
    await seed_admin()
