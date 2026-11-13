"""Lecture et validation du contenu partagées par l'API publique et l'administration."""

from typing import Any

from fastapi import HTTPException, status

from app.conditions import Catalog, ConditionError, references, validate_condition
from app.models import Contact, Flag, Level, PoleOutcome, Question, Rule, Suggestion

PROFILE_QUESTION = "profile"


def conflict(message: str) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, message)


def invalid(message: str) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, message)


# --------------------------------------------------------------------------- sérialisation


def question_out(question: Question) -> dict[str, Any]:
    return {
        "id": question.id,
        "key": question.key,
        "kind": question.kind,
        "phase": question.phase,
        "step": question.step,
        "position": question.position,
        "required": question.required,
        "hidden": question.hidden,
        "auto_answer": question.auto_answer,
        "show_if": question.show_if,
        "stop_if": question.stop_if,
        "tracks": question.tracks,
        "text": question.text,
        "text_falc": question.text_falc,
        "help": question.help,
        "updated_at": question.updated_at,
        "options": [
            {"key": o.key, "exclusive": o.exclusive, "label": o.label} for o in question.options
        ],
    }


def rule_out(rule: Rule) -> dict[str, Any]:
    return {
        "id": rule.id,
        "key": rule.key,
        "position": rule.position,
        "condition": rule.condition,
        "points": rule.points,
        "override_level": rule.override_level.key if rule.override_level else None,
        "pole_outcome": rule.pole_outcome,
        "explanation": rule.explanation,
        "flags": [flag.key for flag in rule.flags],
        "suggestions": [suggestion.key for suggestion in rule.suggestions],
    }


def contact_out(contact: Contact) -> dict[str, Any]:
    return {
        "id": contact.id,
        "key": contact.key,
        "position": contact.position,
        "icon": contact.icon,
        "name": contact.name,
        "role": contact.role,
        "email": contact.email,
        "link_url": contact.link_url,
        "link_label": contact.link_label,
        "is_confidential": contact.is_confidential,
        "pole_group": contact.pole_group,
        "profiles": [link.profile for link in contact.profiles],
    }


async def all_questions() -> list[Question]:
    return await Question.all().prefetch_related("options")


async def all_rules() -> list[Rule]:
    return await Rule.all().prefetch_related("flags", "suggestions", "override_level")


async def all_contacts() -> list[Contact]:
    return await Contact.all().prefetch_related("profiles")


# --------------------------------------------------------------------------- validation


async def catalog() -> Catalog:
    return {q.key: {o.key for o in q.options} for q in await all_questions()}


def check_condition(condition: Any, known: Catalog, label: str) -> None:
    try:
        validate_condition(condition, known, label)
    except ConditionError as error:
        raise invalid(str(error)) from error


async def usages(question_key: str, removed_options: set[str] | None = None) -> list[str]:
    """Éléments dont une condition cite la question (ou l'une des options retirées)."""

    def cites(condition: Any) -> bool:
        for question, option in references(condition):
            if question != question_key:
                continue
            if removed_options is None or option in removed_options:
                return True
        return False

    found = [f"règle {rule.key}" for rule in await Rule.all() if cites(rule.condition)]
    for question in await Question.exclude(key=question_key):
        if cites(question.show_if) or cites(question.stop_if):
            found.append(f"question {question.key}")
    return found


# --------------------------------------------------------------------------- contenu public


async def public_content() -> dict[str, Any]:
    """Tout ce dont le navigateur a besoin pour dérouler le questionnaire et la restitution."""
    contacts = await all_contacts()
    profile_contacts: dict[str, list[tuple[int, str]]] = {}
    for contact in contacts:
        for link in contact.profiles:
            profile_contacts.setdefault(link.profile, []).append((link.position, contact.key))

    def public_question(question: Question) -> dict[str, Any]:
        data = question_out(question)
        for private in ("id", "position", "updated_at"):
            data.pop(private)
        return data

    return {
        "questions": [public_question(q) for q in await all_questions()],
        "levels": [
            {
                "key": level.key,
                "min_score": level.min_score,
                "icon": level.icon,
                "title": level.title,
                "body": level.body,
                "body_falc": level.body_falc,
            }
            for level in await Level.all()
        ],
        "rules": [
            {k: v for k, v in rule_out(rule).items() if k not in ("id", "position")}
            for rule in await all_rules()
        ],
        "flags": [{"key": f.key, "text": f.text} for f in await Flag.all()],
        "suggestions": [{"key": s.key, "text": s.text} for s in await Suggestion.all()],
        "pole_outcomes": {
            str(o.key): {"title": o.title, "body": o.body} for o in await PoleOutcome.all()
        },
        "contacts": [
            {k: v for k, v in contact_out(c).items() if k not in ("id", "position", "profiles")}
            for c in contacts
        ],
        "profile_contacts": {
            profile: [key for _, key in sorted(items)]
            for profile, items in profile_contacts.items()
        },
    }
