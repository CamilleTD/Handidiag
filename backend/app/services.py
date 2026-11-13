"""Lecture, validation et publication des questionnaires."""

from typing import Any

from app.conditions import Catalog, ConditionError, references, validate_condition
from app.errors import Problem, invalid, not_found
from app.models import (
    Contact,
    ContactGroup,
    ContentPage,
    Flag,
    Question,
    Questionnaire,
    QuestionnaireVersion,
    Resource,
    Rule,
    SectionItem,
    Suggestion,
)

# --------------------------------------------------------------------------- sérialisation


def option_out(option) -> dict[str, Any]:
    return {"key": option.key, "exclusive": option.exclusive, "label": option.label}


def question_public(question: Question) -> dict[str, Any]:
    return {
        "key": question.key,
        "kind": question.kind,
        "text": question.text,
        "text_falc": question.text_falc,
        "help": question.help,
        "options": [option_out(o) for o in question.options],
    }


def contact_public(contact: Contact) -> dict[str, Any]:
    return {
        "key": contact.key,
        "icon": contact.icon,
        "name": contact.name,
        "role": contact.role,
        "email": contact.email,
        "link_url": contact.link_url,
        "link_label": contact.link_label,
        "is_confidential": contact.is_confidential,
        "group": contact.group,
    }


def rule_out(rule: Rule) -> dict[str, Any]:
    """Règle de la bibliothèque, avec les questionnaires qui l'utilisent."""
    return {
        "id": rule.id,
        "key": rule.key,
        "condition": rule.condition,
        "explanation": rule.explanation,
        "flags": [f.key for f in rule.flags],
        "suggestions": [s.key for s in rule.suggestions],
        "contacts": [link.contact.key for link in rule.contacts],
        "used_in": sorted({usage.questionnaire.key for usage in rule.usages}),
    }


RULE_PREFETCH = ("flags", "suggestions", "contacts__contact", "usages__questionnaire")
QUESTIONNAIRE_PREFETCH = (
    "sections__items__question__options",
    "outcomes__contacts__contact",
    "outcomes__next_questionnaire",
    "rule_usages__rule__flags",
    "rule_usages__rule__suggestions",
    "rule_usages__rule__contacts__contact",
    "rule_usages__override_outcome",
)


async def get_questionnaire(questionnaire_id: int) -> Questionnaire:
    questionnaire = await Questionnaire.get_or_none(id=questionnaire_id).prefetch_related(
        *QUESTIONNAIRE_PREFETCH
    )
    if questionnaire is None:
        raise not_found("Questionnaire introuvable")
    return questionnaire


async def published_version(q: Questionnaire) -> QuestionnaireVersion | None:
    if q.published_number is None:
        return None
    return await QuestionnaireVersion.get_or_none(questionnaire=q, number=q.published_number)


async def questionnaire_detail(q: Questionnaire, draft: dict[str, Any]) -> dict[str, Any]:
    """Vue d'édition d'un questionnaire (brouillon) pour l'administration."""
    published = await published_version(q)
    return {
        "id": q.id,
        "key": q.key,
        "title": q.title,
        "description": q.description,
        "featured": q.featured,
        "sections": [
            {
                "id": section.id,
                "title": section.title,
                "intro": section.intro,
                "optional": section.optional,
                "items": [
                    {
                        "id": item.id,
                        "question": item.question.key,
                        "required": item.required,
                        "show_if": item.show_if,
                        "auto_answer": item.auto_answer,
                    }
                    for item in section.items
                ],
            }
            for section in q.sections
        ],
        "outcomes": [
            {
                "id": outcome.id,
                "key": outcome.key,
                "min_score": outcome.min_score,
                "icon": outcome.icon,
                "title": outcome.title,
                "body": outcome.body,
                "body_falc": outcome.body_falc,
                "next_questionnaire": (
                    outcome.next_questionnaire.key if outcome.next_questionnaire else None
                ),
                "contacts": [link.contact.key for link in outcome.contacts],
            }
            for outcome in q.outcomes
        ],
        "rules": [
            {
                "id": usage.id,
                "rule": usage.rule.key,
                "points": usage.points,
                "override_outcome": usage.override_outcome.key if usage.override_outcome else None,
            }
            for usage in q.rule_usages
        ],
        "published": (
            {"number": published.number, "published_at": published.published_at}
            if published
            else None
        ),
        "has_changes": published is None or comparable(published.snapshot) != comparable(draft),
    }


# --------------------------------------------------------------------------- version publiable


async def draft_snapshot(q: Questionnaire) -> dict[str, Any]:
    """Copie autonome du questionnaire, telle que le navigateur la déroule."""
    rules = [usage.rule for usage in q.rule_usages]
    flag_keys = {f.key for rule in rules for f in rule.flags}
    suggestion_keys = {s.key for rule in rules for s in rule.suggestions}
    contacts: dict[str, Contact] = {}
    for outcome in q.outcomes:
        for link in outcome.contacts:
            contacts[link.contact.key] = link.contact
    for rule in rules:
        for link in rule.contacts:
            contacts[link.contact.key] = link.contact
    return {
        "key": q.key,
        "title": q.title,
        "description": q.description,
        "sections": [
            {
                "title": section.title,
                "intro": section.intro,
                "optional": section.optional,
                "questions": [
                    {
                        **question_public(item.question),
                        "required": item.required,
                        "show_if": item.show_if,
                        "auto_answer": item.auto_answer,
                    }
                    for item in section.items
                ],
            }
            for section in q.sections
        ],
        "outcomes": [
            {
                "key": outcome.key,
                "min_score": outcome.min_score,
                "icon": outcome.icon,
                "title": outcome.title,
                "body": outcome.body,
                "body_falc": outcome.body_falc,
                "next": (
                    {
                        "key": outcome.next_questionnaire.key,
                        "title": outcome.next_questionnaire.title,
                    }
                    if outcome.next_questionnaire
                    else None
                ),
                "contacts": [link.contact.key for link in outcome.contacts],
            }
            for outcome in q.outcomes
        ],
        "rules": [
            {
                "key": usage.rule.key,
                "condition": usage.rule.condition,
                "points": usage.points,
                "override": usage.override_outcome.key if usage.override_outcome else None,
                "explanation": usage.rule.explanation,
                "flags": [f.key for f in usage.rule.flags],
                "suggestions": [s.key for s in usage.rule.suggestions],
                "contacts": [link.contact.key for link in usage.rule.contacts],
            }
            for usage in q.rule_usages
        ],
        # Messages utilisés, dans l'ordre de la bibliothèque
        "flags": [
            {"key": f.key, "text": f.text, "highlight_confidential": f.highlight_confidential}
            for f in await Flag.filter(key__in=flag_keys)
        ],
        "suggestions": [
            {"key": s.key, "text": s.text} for s in await Suggestion.filter(key__in=suggestion_keys)
        ],
        "contacts": [contact_public(c) for c in contacts.values()],
    }


def comparable(snapshot: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in snapshot.items() if k not in ("version", "published_at")}


def catalog_of(snapshot: dict[str, Any]) -> Catalog:
    return {
        question["key"]: {o["key"] for o in question["options"]}
        for section in snapshot["sections"]
        for question in section["questions"]
    }


def check_condition(condition: Any, catalog: Catalog, label: str) -> None:
    try:
        validate_condition(condition, catalog, label)
    except ConditionError as error:
        raise Problem(422, error.code, str(error), **error.params) from error


def check_publishable(snapshot: dict[str, Any]) -> None:
    """Vérifications avant publication (le brouillon peut être incomplet)."""
    required = [s for s in snapshot["sections"] if not s["optional"]]
    if not any(s["questions"] for s in required):
        raise invalid("publish_no_question", "Ajoutez au moins une question non facultative.")
    if not any(o["min_score"] is not None for o in snapshot["outcomes"]):
        raise invalid(
            "publish_no_default_outcome",
            "Ajoutez au moins un résultat avec un score minimal (résultat par défaut).",
        )
    catalog = catalog_of(snapshot)
    for section in snapshot["sections"]:
        for question in section["questions"]:
            if question["show_if"]:
                check_condition(question["show_if"], catalog, question["key"])
    for rule in snapshot["rules"]:
        check_condition(rule["condition"], catalog, rule["key"])


# --------------------------------------------------------------------------- usages


async def question_usages(key: str, removed_options: set[str] | None = None) -> list[str]:
    """Où une question (ou certaines de ses réponses) est utilisée."""

    def cites(condition: Any) -> bool:
        return any(
            question == key and (removed_options is None or option in removed_options)
            for question, option in references(condition)
        )

    found: list[str] = []
    items = await SectionItem.all().prefetch_related("question", "section__questionnaire")
    for item in items:
        place = item.section.questionnaire.key
        if removed_options is None and item.question.key == key:
            found.append(place)
        elif cites(item.show_if):
            found.append(f"{place}/{item.question.key}")
        elif item.question.key == key and item.auto_answer in (removed_options or set()):
            found.append(f"{place}/{item.question.key}")
    found += [rule.key for rule in await Rule.all() if cites(rule.condition)]
    return sorted(set(found))


# --------------------------------------------------------------------------- contenu public


async def public_content() -> dict[str, Any]:
    """Questionnaires publiés, ressources, pages et interlocuteurs de l'école."""
    questionnaires = await Questionnaire.filter(published_number__isnull=False)
    return {
        "questionnaires": [
            {"key": q.key, "title": q.title, "description": q.description, "featured": q.featured}
            for q in questionnaires
        ],
        "resources": [
            {
                "section": r.section,
                "key": r.key,
                "url": r.url,
                "title": r.title,
                "description": r.description,
                "reference": r.reference,
            }
            for r in await Resource.filter(is_published=True)
        ],
        "pages": [
            {"slug": p.slug, "title": p.title} for p in await ContentPage.filter(is_published=True)
        ],
        "school_contacts": [
            contact_public(c)
            for c in await Contact.filter(
                group__in=[ContactGroup.SCHOOL, ContactGroup.WORK, ContactGroup.OTHER]
            )
        ],
    }
