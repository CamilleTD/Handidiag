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
    ContentPage,
    Flag,
    Outcome,
    OutcomeContact,
    Question,
    Questionnaire,
    QuestionnaireVersion,
    QuestionOption,
    Resource,
    Rule,
    RuleContact,
    RuleUsage,
    Section,
    SectionItem,
    Suggestion,
)
from app.services import check_publishable, draft_snapshot, get_questionnaire

CONTENT_FILE = Path(__file__).resolve().parents[1] / "seed" / "content.json"
logger = logging.getLogger("handidiag")


async def seed_library(data: dict) -> None:
    for item in data["questions"]:
        options = item.pop("options")
        question = await Question.create(**item)
        await QuestionOption.bulk_create(
            [QuestionOption(question=question, position=i, **o) for i, o in enumerate(options)]
        )
    for position, item in enumerate(data["flags"]):
        await Flag.create(**item, position=position)
    for position, item in enumerate(data["suggestions"]):
        await Suggestion.create(**item, position=position)
    for position, item in enumerate(data["contacts"]):
        await Contact.create(**item, position=position)

    flags = {f.key: f for f in await Flag.all()}
    suggestions = {s.key: s for s in await Suggestion.all()}
    contacts = {c.key: c for c in await Contact.all()}
    for item in data["rules"]:
        rule = await Rule.create(
            key=item["key"], condition=item["condition"], explanation=item["explanation"]
        )
        if item["flags"]:
            await rule.flags.add(*(flags[k] for k in item["flags"]))
        if item["suggestions"]:
            await rule.suggestions.add(*(suggestions[k] for k in item["suggestions"]))
        await RuleContact.bulk_create(
            [
                RuleContact(rule=rule, contact=contacts[k], position=i)
                for i, k in enumerate(item["contacts"])
            ]
        )


async def seed_questionnaires(data: dict) -> list[Questionnaire]:
    questions = {q.key: q for q in await Question.all()}
    contacts = {c.key: c for c in await Contact.all()}
    rules = {r.key: r for r in await Rule.all()}
    created: dict[str, Questionnaire] = {}
    for position, item in enumerate(data["questionnaires"]):
        created[item["key"]] = await Questionnaire.create(
            key=item["key"],
            title=item["title"],
            description=item["description"],
            featured=item["featured"],
            position=position,
        )
    for item in data["questionnaires"]:
        q = created[item["key"]]
        for s_pos, section_data in enumerate(item["sections"]):
            section = await Section.create(
                questionnaire=q,
                position=s_pos,
                title=section_data["title"],
                intro=section_data["intro"],
                optional=section_data["optional"],
            )
            for i_pos, it in enumerate(section_data["items"]):
                await SectionItem.create(
                    section=section,
                    question=questions[it["question"]],
                    position=i_pos,
                    required=it["required"],
                    show_if=it["show_if"],
                    auto_answer=it["auto_answer"],
                )
        outcomes = {}
        for o_pos, o in enumerate(item["outcomes"]):
            outcomes[o["key"]] = outcome = await Outcome.create(
                questionnaire=q,
                key=o["key"],
                position=o_pos,
                min_score=o["min_score"],
                icon=o["icon"],
                title=o["title"],
                body=o["body"],
                body_falc=o["body_falc"],
                next_questionnaire=created.get(o["next"]) if o["next"] else None,
            )
            await OutcomeContact.bulk_create(
                [
                    OutcomeContact(outcome=outcome, contact=contacts[k], position=i)
                    for i, k in enumerate(o["contacts"])
                ]
            )
        for u_pos, usage in enumerate(item["rules"]):
            await RuleUsage.create(
                questionnaire=q,
                rule=rules[usage["rule"]],
                position=u_pos,
                points=usage["points"],
                override_outcome=outcomes[usage["override"]] if usage["override"] else None,
            )
    return list(created.values())


async def publish(questionnaire: Questionnaire) -> None:
    q = await get_questionnaire(questionnaire.id)
    snapshot = await draft_snapshot(q)
    check_publishable(snapshot)
    version = await QuestionnaireVersion.create(
        questionnaire=q, number=1, snapshot=snapshot, published_by="contenu de départ"
    )
    q.published_number = version.number
    await q.save(update_fields=["published_number"])


async def seed_content(path: Path = CONTENT_FILE) -> bool:
    """Charge le contenu de départ et publie les questionnaires si la base est vide."""
    if await Question.exists():
        return False
    data = json.loads(path.read_text(encoding="utf-8"))
    async with in_transaction():
        await seed_library(data)
        for questionnaire in await seed_questionnaires(data):
            await publish(questionnaire)
        for position, item in enumerate(data["pages"]):
            await ContentPage.create(**item, position=position)
        positions: dict[str, int] = {}
        for item in data["resources"]:
            position = positions[item["section"]] = positions.get(item["section"], -1) + 1
            await Resource.create(**item, position=position)
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
        logger.info("Contenu de départ chargé et publié.")
    await seed_admin()
