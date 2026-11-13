"""Constructeur de questionnaires : brouillon, publication et versions."""

from typing import Any

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from tortoise.transactions import in_transaction

from app.auth import current_admin, current_session
from app.conditions import questions_in
from app.errors import Problem, conflict, invalid, not_found
from app.locks import acquire, editable, held_by_other, lock_info, release
from app.models import (
    AdminSession,
    AdminUser,
    Contact,
    Outcome,
    OutcomeContact,
    Question,
    Questionnaire,
    QuestionnaireVersion,
    Rule,
    RuleUsage,
    Section,
    SectionItem,
)
from app.schemas import (
    ItemIn,
    OutcomeIn,
    QuestionnaireIn,
    ReorderIn,
    RuleUsageIn,
    SectionIn,
)
from app.services import (
    catalog_of,
    check_condition,
    check_publishable,
    comparable,
    draft_snapshot,
    get_questionnaire,
    published_version,
    questionnaire_detail,
)

router = APIRouter(
    prefix="/admin/questionnaires",
    tags=["questionnaires"],
    dependencies=[Depends(current_admin), Depends(editable)],
)


def text(value: Any) -> Any:
    return value.model_dump() if value is not None else None


async def detail(questionnaire_id: int) -> dict[str, Any]:
    q = await get_questionnaire(questionnaire_id)
    return await questionnaire_detail(q, await draft_snapshot(q))


async def catalog(questionnaire_id: int) -> dict[str, set[str]]:
    return catalog_of(await draft_snapshot(await get_questionnaire(questionnaire_id)))


async def reorder(rows: list, ids: list[int]) -> None:
    if not rows or sorted(ids) != sorted(row.id for row in rows):
        raise invalid("reorder_mismatch", "La liste doit contenir chaque élément une seule fois.")
    async with in_transaction():
        for position, row_id in enumerate(ids):
            await type(rows[0]).filter(id=row_id).update(position=position)


async def unfeature_others(questionnaire_id: int) -> None:
    await Questionnaire.exclude(id=questionnaire_id).update(featured=False)


# =========================================================================== questionnaires


@router.get("")
async def list_questionnaires(session: AdminSession = Depends(current_session)):
    result = []
    for q in await Questionnaire.all().prefetch_related(
        "sections__items", "rule_usages", "outcomes"
    ):
        full = await get_questionnaire(q.id)
        info = await questionnaire_detail(full, await draft_snapshot(full))
        result.append(
            {
                "id": q.id,
                "key": q.key,
                "title": q.title,
                "description": q.description,
                "featured": q.featured,
                "published": info["published"],
                "has_changes": info["has_changes"],
                "questions": sum(len(s.items) for s in q.sections),
                "rules": len(q.rule_usages),
                "outcomes": len(q.outcomes),
                "lock": lock_info(q, session),
            }
        )
    return result


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_questionnaire(body: QuestionnaireIn):
    if await Questionnaire.exists(key=body.key):
        raise conflict("key_exists", f"La clé « {body.key} » existe déjà.", key=body.key)
    last = await Questionnaire.all().order_by("-position").first()
    async with in_transaction():
        q = await Questionnaire.create(
            key=body.key,
            title=text(body.title),
            description=text(body.description),
            featured=body.featured,
            position=last.position + 1 if last else 0,
        )
        # Point de départ : une section et un résultat par défaut
        await Section.create(questionnaire=q, title={"fr": "Questions", "en": "Questions"})
        await Outcome.create(
            questionnaire=q,
            key="default",
            min_score=0,
            title={"fr": "Votre résultat", "en": "Your result"},
            body={"fr": "À compléter.", "en": "To be completed."},
        )
        if body.featured:
            await unfeature_others(q.id)
    return await detail(q.id)


@router.post("/reorder", status_code=status.HTTP_204_NO_CONTENT)
async def reorder_questionnaires(body: ReorderIn):
    await reorder(list(await Questionnaire.all()), body.ids)


class RepublishIn(BaseModel):
    # Questionnaires à republier ; absent : tous les questionnaires publiés
    keys: list[str] | None = Field(default=None)


@router.post("/republish")
async def republish(body: RepublishIn, session: AdminSession = Depends(current_session)):
    """Republie d'un coup les questionnaires publiés dont le brouillon a changé, typiquement
    après la modification d'une question ou d'une règle partagée de la bibliothèque.

    Tout ou rien : si l'un d'eux ne peut pas être publié, aucun ne l'est. Un questionnaire
    en cours de modification par quelqu'un d'autre est laissé de côté (signalé dans « locked »).
    """
    targets = Questionnaire.filter(published_number__isnull=False)
    if body.keys is not None:
        targets = targets.filter(key__in=body.keys)
    ready, result = [], {"published": [], "unchanged": [], "locked": []}
    for row in await targets:
        q = await get_questionnaire(row.id)
        snapshot = await draft_snapshot(q)
        current = await published_version(q)
        if current and comparable(current.snapshot) == comparable(snapshot):
            result["unchanged"].append(q.key)
        elif held_by_other(q, session):
            result["locked"].append({"key": q.key, "by": q.locked_by})
        else:
            try:
                check_publishable(snapshot)
            except Problem as problem:
                raise invalid(
                    "republish_blocked",
                    f"« {q.key} » ne peut pas être publié : {problem.detail['message']}",
                    questionnaire=q.key,
                ) from problem
            ready.append((q, snapshot))
    async with in_transaction():
        for q, snapshot in ready:
            await publish_snapshot(q, snapshot, session.user.username)
            result["published"].append(q.key)
    return result


@router.get("/{qid}")
async def get_detail(qid: int):
    return await detail(qid)


@router.put("/{qid}")
async def update_questionnaire(qid: int, body: QuestionnaireIn):
    q = await get_questionnaire(qid)
    if q.key != body.key:
        raise conflict("key_immutable", "La clé ne peut pas être modifiée.")
    q.title, q.description, q.featured = text(body.title), text(body.description), body.featured
    await q.save(update_fields=["title", "description", "featured", "updated_at"])
    if body.featured:
        await unfeature_others(q.id)
    return await detail(qid)


@router.delete("/{qid}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_questionnaire(qid: int):
    q = await get_questionnaire(qid)
    async with in_transaction():
        await RuleUsage.filter(questionnaire=q).delete()
        await SectionItem.filter(section__questionnaire=q).delete()
        await Outcome.filter(next_questionnaire=q).update(next_questionnaire=None)
        await q.delete()


# =========================================================================== verrou


class LockIn(BaseModel):
    # Prendre la main sur un autre administrateur
    force: bool = False


@router.post("/{qid}/lock")
async def lock(qid: int, body: LockIn, session: AdminSession = Depends(current_session)):
    """Prend ou renouvelle le verrou de modification (appelé régulièrement par le constructeur)."""
    q = await Questionnaire.get_or_none(id=qid)
    if q is None:
        raise not_found("Questionnaire introuvable")
    await acquire(q, session, force=body.force)
    return lock_info(q, session)


@router.delete("/{qid}/lock", status_code=status.HTTP_204_NO_CONTENT)
async def unlock(qid: int, session: AdminSession = Depends(current_session)):
    q = await Questionnaire.get_or_none(id=qid)
    if q is not None:
        await release(q, session)


# =========================================================================== publication


@router.get("/{qid}/preview")
async def preview(qid: int):
    """Brouillon au format public : sert à tester le questionnaire avant de le publier."""
    return await draft_snapshot(await get_questionnaire(qid))


async def publish_snapshot(q: Questionnaire, snapshot: dict, username: str) -> None:
    last = await QuestionnaireVersion.filter(questionnaire=q).order_by("-number").first()
    version = await QuestionnaireVersion.create(
        questionnaire=q,
        number=last.number + 1 if last else 1,
        snapshot=snapshot,
        published_by=username,
    )
    q.published_number = version.number
    await q.save(update_fields=["published_number", "updated_at"])


@router.post("/{qid}/publish")
async def publish(qid: int, admin: AdminUser = Depends(current_admin)):
    q = await get_questionnaire(qid)
    snapshot = await draft_snapshot(q)
    check_publishable(snapshot)
    async with in_transaction():
        await publish_snapshot(q, snapshot, admin.username)
    return await detail(qid)


@router.post("/{qid}/unpublish")
async def unpublish(qid: int):
    q = await get_questionnaire(qid)
    q.published_number = None
    await q.save(update_fields=["published_number", "updated_at"])
    return await detail(qid)


@router.get("/{qid}/versions")
async def versions(qid: int):
    return [
        {"number": v.number, "published_at": v.published_at, "published_by": v.published_by}
        for v in await QuestionnaireVersion.filter(questionnaire_id=qid)
    ]


@router.post("/{qid}/versions/{number}/restore")
async def restore(qid: int, number: int):
    """Republie une ancienne version telle quelle (le brouillon n'est pas modifié)."""
    q = await get_questionnaire(qid)
    version = await QuestionnaireVersion.get_or_none(questionnaire=q, number=number)
    if version is None:
        raise not_found("Version introuvable")
    q.published_number = version.number
    await q.save(update_fields=["published_number", "updated_at"])
    return await detail(qid)


# =========================================================================== sections


async def get_section(qid: int, sid: int) -> Section:
    section = await Section.get_or_none(id=sid, questionnaire_id=qid)
    if section is None:
        raise not_found("Section introuvable")
    return section


@router.post("/{qid}/sections", status_code=status.HTTP_201_CREATED)
async def create_section(qid: int, body: SectionIn):
    q = await get_questionnaire(qid)
    await Section.create(
        questionnaire=q,
        title=text(body.title),
        intro=text(body.intro),
        optional=body.optional,
        position=len(q.sections),
    )
    return await detail(qid)


@router.put("/{qid}/sections/{sid}")
async def update_section(qid: int, sid: int, body: SectionIn):
    section = await get_section(qid, sid)
    section.title, section.intro = text(body.title), text(body.intro)
    section.optional = body.optional
    await section.save()
    return await detail(qid)


@router.delete("/{qid}/sections/{sid}")
async def delete_section(qid: int, sid: int):
    section = await get_section(qid, sid)
    for item in await SectionItem.filter(section=section).prefetch_related("question"):
        await check_item_removable(qid, item)
    await section.delete()
    return await detail(qid)


@router.post("/{qid}/sections/reorder")
async def reorder_sections(qid: int, body: ReorderIn):
    await reorder(list(await Section.filter(questionnaire_id=qid)), body.ids)
    return await detail(qid)


# =========================================================================== questions placées


class ItemUpdate(BaseModel):
    required: bool = False
    show_if: dict | None = None
    auto_answer: str | None = None
    section_id: int | None = None


async def get_item(qid: int, item_id: int) -> SectionItem:
    item = await SectionItem.get_or_none(
        id=item_id, section__questionnaire_id=qid
    ).prefetch_related("question__options")
    if item is None:
        raise not_found("Question introuvable dans ce questionnaire")
    return item


def check_auto_answer(question: Question, auto_answer: str | None) -> None:
    if auto_answer and auto_answer not in {o.key for o in question.options}:
        raise invalid(
            "auto_answer_unknown",
            "La réponse fixée doit être l'une des réponses de la question.",
        )


async def check_item_removable(qid: int, item: SectionItem) -> None:
    """Une question citée par une autre question ou par une règle du questionnaire reste."""
    key = item.question.key
    places = [
        other.question.key
        for other in await SectionItem.filter(section__questionnaire_id=qid)
        .exclude(id=item.id)
        .prefetch_related("question")
        if key in questions_in(other.show_if)
    ]
    places += [
        usage.rule.key
        for usage in await RuleUsage.filter(questionnaire_id=qid).prefetch_related("rule")
        if key in questions_in(usage.rule.condition)
    ]
    if places:
        names = ", ".join(sorted(places))
        raise conflict(
            "question_cited",
            f"« {key} » est citée par : {names}.",
            question=key,
            places=names,
        )


@router.post("/{qid}/sections/{sid}/items", status_code=status.HTTP_201_CREATED)
async def add_item(qid: int, sid: int, body: ItemIn):
    section = await get_section(qid, sid)
    question = await Question.get_or_none(key=body.question).prefetch_related("options")
    if question is None:
        raise not_found("Question introuvable")
    if await SectionItem.exists(section__questionnaire_id=qid, question=question):
        raise conflict(
            "question_already_in",
            f"« {question.key} » est déjà dans ce questionnaire.",
            question=question.key,
        )
    check_auto_answer(question, body.auto_answer)
    known = await catalog(qid)
    known[question.key] = {o.key for o in question.options}
    if body.show_if:
        check_condition(body.show_if, known, question.key)
    await SectionItem.create(
        section=section,
        question=question,
        required=body.required,
        show_if=body.show_if,
        auto_answer=body.auto_answer,
        position=await SectionItem.filter(section=section).count(),
    )
    return await detail(qid)


@router.put("/{qid}/items/{item_id}")
async def update_item(qid: int, item_id: int, body: ItemUpdate):
    item = await get_item(qid, item_id)
    check_auto_answer(item.question, body.auto_answer)
    if body.show_if:
        check_condition(body.show_if, await catalog(qid), item.question.key)
    item.required, item.show_if, item.auto_answer = body.required, body.show_if, body.auto_answer
    if body.section_id and body.section_id != item.section_id:
        target = await get_section(qid, body.section_id)
        item.section = target
        item.position = await SectionItem.filter(section=target).count()
    await item.save()
    return await detail(qid)


@router.delete("/{qid}/items/{item_id}")
async def remove_item(qid: int, item_id: int):
    item = await get_item(qid, item_id)
    await check_item_removable(qid, item)
    await item.delete()
    return await detail(qid)


@router.post("/{qid}/sections/{sid}/items/reorder")
async def reorder_items(qid: int, sid: int, body: ReorderIn):
    section = await get_section(qid, sid)
    await reorder(list(await SectionItem.filter(section=section)), body.ids)
    return await detail(qid)


# =========================================================================== résultats


async def get_outcome(qid: int, oid: int) -> Outcome:
    outcome = await Outcome.get_or_none(id=oid, questionnaire_id=qid)
    if outcome is None:
        raise not_found("Résultat introuvable")
    return outcome


async def apply_outcome(outcome: Outcome, body: OutcomeIn) -> None:
    next_q = None
    if body.next_questionnaire:
        next_q = await Questionnaire.get_or_none(key=body.next_questionnaire)
        if next_q is None or next_q.id == outcome.questionnaire_id:
            raise invalid("next_questionnaire_invalid", "Questionnaire suivant invalide.")
    contacts = {c.key: c for c in await Contact.filter(key__in=body.contacts)}
    if missing := set(body.contacts) - set(contacts):
        names = ", ".join(sorted(missing))
        raise invalid("unknown_items", f"Élément(s) inconnu(s) : {names}", items=names)
    outcome.min_score, outcome.icon = body.min_score, body.icon
    outcome.title, outcome.body = text(body.title), text(body.body)
    outcome.body_falc = text(body.body_falc)
    outcome.next_questionnaire = next_q
    async with in_transaction():
        await outcome.save()
        await OutcomeContact.filter(outcome=outcome).delete()
        await OutcomeContact.bulk_create(
            [
                OutcomeContact(outcome=outcome, contact=contacts[key], position=i)
                for i, key in enumerate(body.contacts)
            ]
        )


@router.post("/{qid}/outcomes", status_code=status.HTTP_201_CREATED)
async def create_outcome(qid: int, body: OutcomeIn):
    q = await get_questionnaire(qid)
    if await Outcome.exists(questionnaire=q, key=body.key):
        raise conflict("key_exists", f"La clé « {body.key} » existe déjà.", key=body.key)
    outcome = Outcome(questionnaire=q, key=body.key, position=len(q.outcomes))
    await apply_outcome(outcome, body)
    return await detail(qid)


@router.put("/{qid}/outcomes/{oid}")
async def update_outcome(qid: int, oid: int, body: OutcomeIn):
    outcome = await get_outcome(qid, oid)
    if outcome.key != body.key:
        raise conflict("key_immutable", "La clé ne peut pas être modifiée.")
    await apply_outcome(outcome, body)
    return await detail(qid)


@router.delete("/{qid}/outcomes/{oid}")
async def delete_outcome(qid: int, oid: int):
    outcome = await get_outcome(qid, oid)
    rules = [
        u.rule.key
        for u in await RuleUsage.filter(override_outcome=outcome).prefetch_related("rule")
    ]
    if rules:
        names = ", ".join(rules)
        raise conflict("outcome_in_use", f"Résultat imposé par : {names}.", places=names)
    await outcome.delete()
    return await detail(qid)


@router.post("/{qid}/outcomes/reorder")
async def reorder_outcomes(qid: int, body: ReorderIn):
    await reorder(list(await Outcome.filter(questionnaire_id=qid)), body.ids)
    return await detail(qid)


# =========================================================================== règles utilisées


async def resolve_override(qid: int, key: str | None) -> Outcome | None:
    if key is None:
        return None
    outcome = await Outcome.get_or_none(questionnaire_id=qid, key=key)
    if outcome is None:
        raise invalid("unknown_items", f"Résultat inconnu : {key}", items=key)
    return outcome


@router.post("/{qid}/rules", status_code=status.HTTP_201_CREATED)
async def add_rule(qid: int, body: RuleUsageIn):
    q = await get_questionnaire(qid)
    rule = await Rule.get_or_none(key=body.rule)
    if rule is None:
        raise not_found("Règle introuvable")
    if await RuleUsage.exists(questionnaire=q, rule=rule):
        raise conflict("rule_already_in", f"« {rule.key} » est déjà utilisée ici.", rule=rule.key)
    check_condition(rule.condition, await catalog(qid), rule.key)
    await RuleUsage.create(
        questionnaire=q,
        rule=rule,
        points=body.points,
        override_outcome=await resolve_override(qid, body.override_outcome),
        position=len(q.rule_usages),
    )
    return await detail(qid)


@router.put("/{qid}/rules/{uid}")
async def update_rule_usage(qid: int, uid: int, body: RuleUsageIn):
    usage = await RuleUsage.get_or_none(id=uid, questionnaire_id=qid)
    if usage is None:
        raise not_found()
    usage.points = body.points
    usage.override_outcome = await resolve_override(qid, body.override_outcome)
    await usage.save()
    return await detail(qid)


@router.delete("/{qid}/rules/{uid}")
async def remove_rule(qid: int, uid: int):
    usage = await RuleUsage.get_or_none(id=uid, questionnaire_id=qid)
    if usage is None:
        raise not_found()
    await usage.delete()
    return await detail(qid)


@router.post("/{qid}/rules/reorder")
async def reorder_rules(qid: int, body: ReorderIn):
    await reorder(list(await RuleUsage.filter(questionnaire_id=qid)), body.ids)
    return await detail(qid)
