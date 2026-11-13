"""Administration : édition du questionnaire, des règles et de la restitution, statistiques."""

import csv
import io
import random
from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from tortoise.models import Model
from tortoise.transactions import in_transaction

from app import stats
from app.auth import current_admin
from app.config import get_settings
from app.models import (
    Contact,
    Flag,
    Level,
    PoleOutcome,
    PoleOutcomeKey,
    ProfileContact,
    Question,
    QuestionOption,
    Rule,
    StatCounter,
    Suggestion,
)
from app.schemas import (
    ContactIn,
    ContactOut,
    LevelIn,
    LevelOut,
    PoleOutcomeIn,
    PoleOutcomeOut,
    QuestionIn,
    QuestionOut,
    ReorderIn,
    RuleIn,
    RuleOut,
    TextItemIn,
    TextItemOut,
)
from app.services import (
    PROFILE_QUESTION,
    all_contacts,
    all_questions,
    all_rules,
    catalog,
    check_condition,
    conflict,
    contact_out,
    invalid,
    question_out,
    rule_out,
    usages,
)

router = APIRouter(prefix="/admin", tags=["administration"], dependencies=[Depends(current_admin)])


async def get_or_404[M: Model](model: type[M], item_id: int) -> M:
    item = await model.get_or_none(id=item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Élément introuvable")
    return item


def keep_key(item: Any, key: str) -> None:
    if item.key != key:
        raise conflict(
            "La clé ne peut pas être modifiée : des conditions ou des statistiques s'y réfèrent."
        )


async def ensure_new_key(model: type[Model], key: str) -> None:
    if await model.exists(key=key):
        raise conflict(f"La clé « {key} » existe déjà.")


async def next_position(model: type[Model]) -> int:
    last = await model.all().order_by("-position").first()
    return (last.position + 1) if last else 0


async def reorder(model: type[Model], ids: list[int]) -> None:
    existing = set(await model.all().values_list("id", flat=True))
    if set(ids) != existing or len(ids) != len(existing):
        raise invalid("La liste doit contenir chaque élément une seule fois.")
    async with in_transaction():
        for position, item_id in enumerate(ids):
            await model.filter(id=item_id).update(position=position)


def text(value: Any) -> Any:
    """LocalizedText -> dict JSON (None reste None)."""
    return value.model_dump() if value is not None else None


# =========================================================================== questions


async def validate_question(body: QuestionIn, current_key: str | None = None) -> None:
    option_keys = [o.key for o in body.options]
    if len(set(option_keys)) != len(option_keys):
        raise invalid("Deux réponses ont la même clé.")
    if body.auto_answer and body.auto_answer not in option_keys:
        raise invalid("La réponse automatique doit être l'une des réponses de la question.")
    if body.hidden and not body.auto_answer:
        raise invalid("Une question masquée doit avoir une réponse automatique.")
    known = await catalog()
    if current_key:
        known.pop(current_key, None)
    known[body.key] = set(option_keys)
    if body.show_if:
        check_condition(body.show_if, known, "Condition d'affichage")
    if body.stop_if:
        check_condition(body.stop_if, known, "Condition d'arrêt")


async def save_options(question: Question, body: QuestionIn) -> None:
    await QuestionOption.filter(question=question).delete()
    await QuestionOption.bulk_create(
        [
            QuestionOption(
                question=question,
                key=o.key,
                exclusive=o.exclusive,
                label=o.label.model_dump(),
                position=index,
            )
            for index, o in enumerate(body.options)
        ]
    )


def question_fields(body: QuestionIn) -> dict[str, Any]:
    data = body.model_dump(exclude={"options", "key"})
    for field in ("text", "text_falc", "help"):
        data[field] = text(getattr(body, field))
    return data


@router.get("/questions", response_model=list[QuestionOut])
async def list_questions():
    return [question_out(q) for q in await all_questions()]


@router.post("/questions", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
async def create_question(body: QuestionIn):
    await ensure_new_key(Question, body.key)
    await validate_question(body)
    async with in_transaction():
        question = await Question.create(
            key=body.key, position=await next_position(Question), **question_fields(body)
        )
        await save_options(question, body)
    return question_out(await Question.get(id=question.id).prefetch_related("options"))


@router.put("/questions/{item_id}", response_model=QuestionOut)
async def update_question(item_id: int, body: QuestionIn):
    question = await get_or_404(Question, item_id)
    keep_key(question, body.key)
    await validate_question(body, current_key=question.key)
    old_options = set(await QuestionOption.filter(question=question).values_list("key", flat=True))
    removed = old_options - {o.key for o in body.options}
    if removed and (used := await usages(question.key, removed)):
        raise conflict(
            f"Réponse(s) {', '.join(sorted(removed))} utilisée(s) par : {', '.join(used)}."
        )
    async with in_transaction():
        await question.update_from_dict(question_fields(body)).save()
        await save_options(question, body)
    return question_out(await Question.get(id=question.id).prefetch_related("options"))


@router.delete("/questions/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(item_id: int):
    question = await get_or_404(Question, item_id)
    if question.key == PROFILE_QUESTION:
        raise conflict("La question « profile » sert à choisir les interlocuteurs.")
    if used := await usages(question.key):
        raise conflict(f"Question utilisée par : {', '.join(used)}.")
    await question.delete()


@router.post("/questions/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_questions(body: ReorderIn):
    await reorder(Question, body.ids)


# =========================================================================== règles


async def apply_rule(rule: Rule, body: RuleIn) -> None:
    check_condition(body.condition, await catalog(), "Condition")
    override = None
    if body.override_level:
        override = await Level.get_or_none(key=body.override_level)
        if override is None:
            raise invalid(f"Niveau inconnu : {body.override_level}")
    flags = await Flag.filter(key__in=body.flags)
    suggestions = await Suggestion.filter(key__in=body.suggestions)
    missing = (set(body.flags) - {f.key for f in flags}) | (
        set(body.suggestions) - {s.key for s in suggestions}
    )
    if missing:
        raise invalid(f"Élément(s) inconnu(s) : {', '.join(sorted(missing))}")
    rule.condition = body.condition
    rule.points = body.points
    rule.override_level = override
    rule.pole_outcome = body.pole_outcome
    rule.explanation = text(body.explanation)
    async with in_transaction():
        await rule.save()
        await rule.flags.clear()
        await rule.suggestions.clear()
        if flags:
            await rule.flags.add(*flags)
        if suggestions:
            await rule.suggestions.add(*suggestions)


async def load_rule(item_id: int) -> dict[str, Any]:
    rule = await Rule.get(id=item_id).prefetch_related("flags", "suggestions", "override_level")
    return rule_out(rule)


@router.get("/rules", response_model=list[RuleOut])
async def list_rules():
    return [rule_out(rule) for rule in await all_rules()]


@router.post("/rules", response_model=RuleOut, status_code=status.HTTP_201_CREATED)
async def create_rule(body: RuleIn):
    await ensure_new_key(Rule, body.key)
    rule = Rule(key=body.key, position=await next_position(Rule))
    await apply_rule(rule, body)
    return await load_rule(rule.id)


@router.put("/rules/{item_id}", response_model=RuleOut)
async def update_rule(item_id: int, body: RuleIn):
    rule = await get_or_404(Rule, item_id)
    keep_key(rule, body.key)
    await apply_rule(rule, body)
    return await load_rule(rule.id)


@router.delete("/rules/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(item_id: int):
    await (await get_or_404(Rule, item_id)).delete()


@router.post("/rules/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_rules(body: ReorderIn):
    await reorder(Rule, body.ids)


# =========================================================================== niveaux


@router.get("/levels", response_model=list[LevelOut])
async def list_levels():
    return await Level.all()


@router.post("/levels", response_model=LevelOut, status_code=status.HTTP_201_CREATED)
async def create_level(body: LevelIn):
    await ensure_new_key(Level, body.key)
    data = body.model_dump()
    return await Level.create(**data, position=await next_position(Level))


@router.put("/levels/{item_id}", response_model=LevelOut)
async def update_level(item_id: int, body: LevelIn):
    level = await get_or_404(Level, item_id)
    keep_key(level, body.key)
    await level.update_from_dict(body.model_dump(exclude={"key"})).save()
    return level


@router.delete("/levels/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_level(item_id: int):
    level = await get_or_404(Level, item_id)
    rules = await Rule.filter(override_level=level).values_list("key", flat=True)
    if rules:
        raise conflict(f"Niveau imposé par les règles : {', '.join(rules)}.")
    await level.delete()


@router.post("/levels/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_levels(body: ReorderIn):
    await reorder(Level, body.ids)


# ====================================================== points d'attention et pistes


def text_items(path: str, model: type[Flag] | type[Suggestion], label: str) -> None:
    """Routes identiques pour les points d'attention (flags) et les pistes (suggestions)."""

    @router.get(f"/{path}", response_model=list[TextItemOut], name=f"list_{path}")
    async def list_items():
        return await model.all()

    @router.post(
        f"/{path}",
        response_model=TextItemOut,
        status_code=status.HTTP_201_CREATED,
        name=f"create_{path}",
    )
    async def create_item(body: TextItemIn):
        await ensure_new_key(model, body.key)
        return await model.create(
            key=body.key, text=body.text.model_dump(), position=await next_position(model)
        )

    @router.put(f"/{path}/{{item_id}}", response_model=TextItemOut, name=f"update_{path}")
    async def update_item(item_id: int, body: TextItemIn):
        item = await get_or_404(model, item_id)
        keep_key(item, body.key)
        item.text = body.text.model_dump()
        await item.save()
        return item

    @router.delete(
        f"/{path}/{{item_id}}", status_code=status.HTTP_204_NO_CONTENT, name=f"delete_{path}"
    )
    async def delete_item(item_id: int):
        item = await get_or_404(model, item_id)
        rules = await item.rules.all().values_list("key", flat=True)
        if rules:
            raise conflict(f"{label} utilisé(e) par les règles : {', '.join(rules)}.")
        await item.delete()

    @router.post(f"/{path}/reorder", status_code=status.HTTP_204_NO_CONTENT, name=f"reorder_{path}")
    async def reorder_items(body: ReorderIn):
        await reorder(model, body.ids)


text_items("flags", Flag, "Point d'attention")
text_items("suggestions", Suggestion, "Piste")


# =========================================================================== pôle handicap


@router.get("/pole-outcomes", response_model=list[PoleOutcomeOut])
async def list_pole_outcomes():
    return await PoleOutcome.all()


@router.put("/pole-outcomes/{key}", response_model=PoleOutcomeOut)
async def update_pole_outcome(key: PoleOutcomeKey, body: PoleOutcomeIn):
    outcome, _ = await PoleOutcome.get_or_create(
        key=key, defaults={"title": text(body.title), "body": text(body.body)}
    )
    outcome.title, outcome.body = text(body.title), text(body.body)
    await outcome.save()
    return outcome


# =========================================================================== interlocuteurs


async def apply_contact(contact: Contact, body: ContactIn) -> None:
    profile = await Question.get_or_none(key=PROFILE_QUESTION).prefetch_related("options")
    profiles = {o.key for o in profile.options} if profile else set()
    if unknown := set(body.profiles) - profiles:
        raise invalid(f"Profil(s) inconnu(s) : {', '.join(sorted(unknown))}")
    contact.icon = body.icon
    contact.name, contact.role = text(body.name), text(body.role)
    contact.email = str(body.email) if body.email else None
    contact.link_url = str(body.link_url) if body.link_url else None
    contact.link_label = text(body.link_label) if body.link_url else None
    contact.is_confidential = body.is_confidential
    contact.pole_group = body.pole_group
    async with in_transaction():
        await contact.save()
        current = {link.profile: link for link in await ProfileContact.filter(contact=contact)}
        for profile_key, link in current.items():
            if profile_key not in body.profiles:
                await link.delete()
        for profile_key in body.profiles:
            if profile_key not in current:
                last = (
                    await ProfileContact.filter(profile=profile_key).order_by("-position").first()
                )
                await ProfileContact.create(
                    profile=profile_key, contact=contact, position=last.position + 1 if last else 0
                )


async def load_contact(item_id: int) -> dict[str, Any]:
    return contact_out(await Contact.get(id=item_id).prefetch_related("profiles"))


@router.get("/contacts", response_model=list[ContactOut])
async def list_contacts():
    return [contact_out(c) for c in await all_contacts()]


@router.post("/contacts", response_model=ContactOut, status_code=status.HTTP_201_CREATED)
async def create_contact(body: ContactIn):
    await ensure_new_key(Contact, body.key)
    contact = Contact(key=body.key, position=await next_position(Contact))
    await apply_contact(contact, body)
    return await load_contact(contact.id)


@router.put("/contacts/{item_id}", response_model=ContactOut)
async def update_contact(item_id: int, body: ContactIn):
    contact = await get_or_404(Contact, item_id)
    keep_key(contact, body.key)
    await apply_contact(contact, body)
    return await load_contact(contact.id)


@router.delete("/contacts/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(item_id: int):
    await (await get_or_404(Contact, item_id)).delete()


@router.post("/contacts/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_contacts(body: ReorderIn):
    await reorder(Contact, body.ids)


@router.get("/profile-contacts")
async def get_profile_contacts() -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    for link in await ProfileContact.all().prefetch_related("contact"):
        result.setdefault(link.profile, []).append(link.contact.key)
    return result


@router.put("/profile-contacts/{profile}", status_code=status.HTTP_204_NO_CONTENT)
async def order_profile_contacts(profile: str, keys: list[str]):
    """Ordre d'affichage des interlocuteurs pour un profil."""
    links = {
        link.contact.key: link
        for link in await ProfileContact.filter(profile=profile).prefetch_related("contact")
    }
    if set(keys) != set(links) or len(keys) != len(links):
        raise invalid("La liste doit contenir chaque interlocuteur du profil une seule fois.")
    async with in_transaction():
        for position, key in enumerate(keys):
            await ProfileContact.filter(id=links[key].id).update(position=position)


# =========================================================================== statistiques


async def stat_keys() -> tuple[list[str], list[str]]:
    levels = list(await Level.all().values_list("key", flat=True))
    profile = await Question.get_or_none(key=PROFILE_QUESTION).prefetch_related("options")
    return levels, [o.key for o in profile.options] if profile else []


@router.get("/stats")
async def get_stats():
    levels, profiles = await stat_keys()
    data = await stats.dashboard(get_settings().stats_min_count, levels, profiles)
    data["disabled"] = get_settings().disable_stats
    return data


@router.get("/stats.csv")
async def export_stats():
    data = await get_stats()
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["metrique", "cle", "valeur"])
    for key, value in data["totals"].items():
        writer.writerow(["total", key, "" if value is None else value])
    for metric in ("by_level", "by_profile", "by_lang", "documents"):
        for key, value in data[metric].items():
            writer.writerow([metric, key, value])
    for day in data["daily"]:
        writer.writerow(["jour_debut", day["date"], day["start"]])
        writer.writerow(["jour_fin", day["date"], day["complete"]])
    return StreamingResponse(
        iter([out.getvalue().encode("utf-8-sig")]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="handidiag-stats.csv"'},
    )


def not_in_production() -> None:
    if get_settings().is_production:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Indisponible en production.")


@router.post("/stats/demo", status_code=status.HTTP_204_NO_CONTENT)
async def add_demo_stats(sessions: int = 120):
    """Ajoute des compteurs fictifs pour une démonstration (hors production)."""
    not_in_production()
    levels, profiles = await stat_keys()
    for _ in range(max(1, min(sessions, 1000))):
        day = date.today() - timedelta(days=random.randrange(14))
        await stats.increment("start", day=day)
        await stats.increment("lang", random.choice(["fr"] * 6 + ["en"]), day=day)
        if random.random() < 0.7:
            await stats.increment("complete", day=day)
            await stats.increment("profile", random.choice(profiles or ["student"]), day=day)
            await stats.increment("level", random.choice(levels or ["explore"]), day=day)
        if random.random() < 0.35:
            await stats.increment("deep", day=day)
        if random.random() < 0.5:
            await stats.increment("doc", random.choice(stats.DOCUMENTS), day=day)


@router.delete("/stats", status_code=status.HTTP_204_NO_CONTENT)
async def reset_stats():
    not_in_production()
    await StatCounter.all().delete()
