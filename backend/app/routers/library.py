"""Bibliothèques partagées : questions, règles, points d'attention, pistes, interlocuteurs."""

from typing import Any

from fastapi import APIRouter, Depends, status
from tortoise.models import Model
from tortoise.transactions import in_transaction

from app.auth import current_admin
from app.errors import conflict, invalid, not_found
from app.models import (
    Contact,
    Flag,
    OutcomeContact,
    Question,
    QuestionOption,
    Rule,
    RuleContact,
    SectionItem,
    Suggestion,
)
from app.schemas import ContactIn, QuestionIn, ReorderIn, RuleIn, TextItemIn
from app.services import (
    RULE_PREFETCH,
    check_condition,
    contact_public,
    option_out,
    question_usages,
    rule_out,
)

router = APIRouter(prefix="/admin", tags=["bibliothèques"], dependencies=[Depends(current_admin)])


async def get_or_404[M: Model](model: type[M], item_id: int) -> M:
    item = await model.get_or_none(id=item_id)
    if item is None:
        raise not_found()
    return item


def keep_key(item: Any, key: str) -> None:
    if item.key != key:
        raise conflict("key_immutable", "La clé ne peut pas être modifiée.")


async def ensure_new_key(model: type[Model], key: str) -> None:
    if await model.exists(key=key):
        raise conflict("key_exists", f"La clé « {key} » existe déjà.", key=key)


async def next_position(model: type[Model]) -> int:
    last = await model.all().order_by("-position").first()
    return last.position + 1 if last else 0


async def reorder(model: type[Model], ids: list[int]) -> None:
    existing = list(await model.all().values_list("id", flat=True))
    if sorted(ids) != sorted(existing):
        raise invalid("reorder_mismatch", "La liste doit contenir chaque élément une seule fois.")
    async with in_transaction():
        for position, item_id in enumerate(ids):
            await model.filter(id=item_id).update(position=position)


def text(value: Any) -> Any:
    return value.model_dump() if value is not None else None


# =========================================================================== banque de questions


async def question_catalog() -> dict[str, set[str]]:
    return {
        q.key: {o.key for o in q.options} for q in await Question.all().prefetch_related("options")
    }


async def question_out(question: Question, used_in: dict[str, set[str]]) -> dict[str, Any]:
    return {
        "id": question.id,
        "key": question.key,
        "kind": question.kind,
        "text": question.text,
        "text_falc": question.text_falc,
        "help": question.help,
        "options": [option_out(o) for o in question.options],
        "used_in": sorted(used_in.get(question.key, set())),
    }


async def questions_used_in() -> dict[str, set[str]]:
    used: dict[str, set[str]] = {}
    for item in await SectionItem.all().prefetch_related("question", "section__questionnaire"):
        used.setdefault(item.question.key, set()).add(item.section.questionnaire.key)
    return used


async def load_question(question_id: int) -> dict[str, Any]:
    question = await Question.get(id=question_id).prefetch_related("options")
    return await question_out(question, await questions_used_in())


def check_options(body: QuestionIn) -> None:
    keys = [o.key for o in body.options]
    if len(set(keys)) != len(keys):
        raise invalid("duplicate_option", "Deux réponses ont la même clé.")


async def save_options(question: Question, body: QuestionIn) -> None:
    await QuestionOption.filter(question=question).delete()
    await QuestionOption.bulk_create(
        [
            QuestionOption(
                question=question,
                key=o.key,
                exclusive=o.exclusive,
                label=o.label.model_dump(),
                position=i,
            )
            for i, o in enumerate(body.options)
        ]
    )


@router.get("/questions")
async def list_questions():
    used = await questions_used_in()
    return [await question_out(q, used) for q in await Question.all().prefetch_related("options")]


@router.post("/questions", status_code=status.HTTP_201_CREATED)
async def create_question(body: QuestionIn):
    await ensure_new_key(Question, body.key)
    check_options(body)
    async with in_transaction():
        question = await Question.create(
            key=body.key,
            kind=body.kind,
            text=text(body.text),
            text_falc=text(body.text_falc),
            help=text(body.help),
        )
        await save_options(question, body)
    return await load_question(question.id)


@router.put("/questions/{item_id}")
async def update_question(item_id: int, body: QuestionIn):
    question = await get_or_404(Question, item_id)
    keep_key(question, body.key)
    check_options(body)
    old = set(await QuestionOption.filter(question=question).values_list("key", flat=True))
    removed = old - {o.key for o in body.options}
    if removed and (used := await question_usages(question.key, removed)):
        raise conflict(
            "option_in_use",
            f"Réponse(s) {', '.join(sorted(removed))} utilisée(s) par : {', '.join(used)}.",
            options=", ".join(sorted(removed)),
            places=", ".join(used),
        )
    async with in_transaction():
        question.kind = body.kind
        question.text, question.text_falc = text(body.text), text(body.text_falc)
        question.help = text(body.help)
        await question.save()
        await save_options(question, body)
    return await load_question(question.id)


@router.delete("/questions/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(item_id: int):
    question = await get_or_404(Question, item_id)
    if used := await question_usages(question.key):
        raise conflict(
            "question_in_use",
            f"Question utilisée par : {', '.join(used)}.",
            places=", ".join(used),
        )
    await question.delete()


# =========================================================================== règles


async def check_rule_condition(rule_key: str, condition: dict) -> None:
    """La condition doit rester valable dans chaque questionnaire qui utilise la règle."""
    rule = await Rule.get_or_none(key=rule_key).prefetch_related("usages__questionnaire")
    usages = list(rule.usages) if rule else []
    if not usages:
        check_condition(condition, await question_catalog(), rule_key)
        return
    for usage in usages:
        items = await SectionItem.filter(
            section__questionnaire_id=usage.questionnaire_id
        ).prefetch_related("question__options")
        catalog = {i.question.key: {o.key for o in i.question.options} for i in items}
        check_condition(condition, catalog, f"{usage.questionnaire.key}/{rule_key}")


async def apply_rule(rule: Rule, body: RuleIn) -> None:
    await check_rule_condition(body.key, body.condition)
    flags = await Flag.filter(key__in=body.flags)
    suggestions = await Suggestion.filter(key__in=body.suggestions)
    contacts = {c.key: c for c in await Contact.filter(key__in=body.contacts)}
    missing = (
        (set(body.flags) - {f.key for f in flags})
        | (set(body.suggestions) - {s.key for s in suggestions})
        | (set(body.contacts) - set(contacts))
    )
    if missing:
        names = ", ".join(sorted(missing))
        raise invalid("unknown_items", f"Élément(s) inconnu(s) : {names}", items=names)
    rule.condition = body.condition
    rule.explanation = text(body.explanation)
    async with in_transaction():
        await rule.save()
        await rule.flags.clear()
        await rule.suggestions.clear()
        if flags:
            await rule.flags.add(*flags)
        if suggestions:
            await rule.suggestions.add(*suggestions)
        await RuleContact.filter(rule=rule).delete()
        await RuleContact.bulk_create(
            [
                RuleContact(rule=rule, contact=contacts[key], position=i)
                for i, key in enumerate(body.contacts)
            ]
        )


async def load_rule(rule_id: int) -> dict[str, Any]:
    return rule_out(await Rule.get(id=rule_id).prefetch_related(*RULE_PREFETCH))


@router.get("/rules")
async def list_rules():
    return [rule_out(r) for r in await Rule.all().prefetch_related(*RULE_PREFETCH)]


@router.post("/rules", status_code=status.HTTP_201_CREATED)
async def create_rule(body: RuleIn):
    await ensure_new_key(Rule, body.key)
    rule = Rule(key=body.key)
    await apply_rule(rule, body)
    return await load_rule(rule.id)


@router.put("/rules/{item_id}")
async def update_rule(item_id: int, body: RuleIn):
    rule = await get_or_404(Rule, item_id)
    keep_key(rule, body.key)
    await apply_rule(rule, body)
    return await load_rule(rule.id)


@router.delete("/rules/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(item_id: int):
    rule = await Rule.get_or_none(id=item_id).prefetch_related("usages__questionnaire")
    if rule is None:
        raise not_found()
    if rule.usages:
        places = ", ".join(sorted({u.questionnaire.key for u in rule.usages}))
        raise conflict("rule_in_use", f"Règle utilisée par : {places}.", places=places)
    await rule.delete()


# ============================================================ points d'attention et pistes


def text_item_out(item: Flag | Suggestion) -> dict[str, Any]:
    data = {"id": item.id, "key": item.key, "position": item.position, "text": item.text}
    if isinstance(item, Flag):
        data["highlight_confidential"] = item.highlight_confidential
    return data


def text_items(path: str, model: type[Flag] | type[Suggestion]) -> None:
    """Routes identiques pour les points d'attention (flags) et les pistes (suggestions)."""

    @router.get(f"/{path}", name=f"list_{path}")
    async def list_items():
        return [text_item_out(i) for i in await model.all()]

    @router.post(f"/{path}", status_code=status.HTTP_201_CREATED, name=f"create_{path}")
    async def create_item(body: TextItemIn):
        await ensure_new_key(model, body.key)
        extra = {"highlight_confidential": body.highlight_confidential} if model is Flag else {}
        item = await model.create(
            key=body.key, text=text(body.text), position=await next_position(model), **extra
        )
        return text_item_out(item)

    @router.put(f"/{path}/{{item_id}}", name=f"update_{path}")
    async def update_item(item_id: int, body: TextItemIn):
        item = await get_or_404(model, item_id)
        keep_key(item, body.key)
        item.text = text(body.text)
        if isinstance(item, Flag):
            item.highlight_confidential = body.highlight_confidential
        await item.save()
        return text_item_out(item)

    @router.delete(f"/{path}/{{item_id}}", status_code=204, name=f"delete_{path}")
    async def delete_item(item_id: int):
        item = await get_or_404(model, item_id)
        rules = list(await item.rules.all().values_list("key", flat=True))
        if rules:
            names = ", ".join(rules)
            raise conflict("item_in_use", f"Utilisé par les règles : {names}.", places=names)
        await item.delete()

    @router.post(f"/{path}/reorder", status_code=204, name=f"reorder_{path}")
    async def reorder_items(body: ReorderIn):
        await reorder(model, body.ids)


text_items("flags", Flag)
text_items("suggestions", Suggestion)


# =========================================================================== interlocuteurs


def contact_out(contact: Contact) -> dict[str, Any]:
    return {"id": contact.id, "position": contact.position, **contact_public(contact)}


async def apply_contact(contact: Contact, body: ContactIn) -> None:
    contact.icon = body.icon
    contact.name, contact.role = text(body.name), text(body.role)
    contact.email = str(body.email) if body.email else None
    contact.link_url = str(body.link_url) if body.link_url else None
    contact.link_label = text(body.link_label) if body.link_url else None
    contact.is_confidential = body.is_confidential
    contact.group = body.group
    await contact.save()


@router.get("/contacts")
async def list_contacts():
    return [contact_out(c) for c in await Contact.all()]


@router.post("/contacts", status_code=status.HTTP_201_CREATED)
async def create_contact(body: ContactIn):
    await ensure_new_key(Contact, body.key)
    contact = Contact(key=body.key, position=await next_position(Contact))
    await apply_contact(contact, body)
    return contact_out(contact)


@router.put("/contacts/{item_id}")
async def update_contact(item_id: int, body: ContactIn):
    contact = await get_or_404(Contact, item_id)
    keep_key(contact, body.key)
    await apply_contact(contact, body)
    return contact_out(contact)


@router.delete("/contacts/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(item_id: int):
    contact = await get_or_404(Contact, item_id)
    rules = await RuleContact.filter(contact=contact).prefetch_related("rule")
    outcomes = await OutcomeContact.filter(contact=contact).prefetch_related(
        "outcome__questionnaire"
    )
    places = [link.rule.key for link in rules] + [
        f"{link.outcome.questionnaire.key}/{link.outcome.key}" for link in outcomes
    ]
    if places:
        names = ", ".join(sorted(places))
        raise conflict("contact_in_use", f"Interlocuteur utilisé par : {names}.", places=names)
    await contact.delete()


@router.post("/contacts/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_contacts(body: ReorderIn):
    await reorder(Contact, body.ids)
