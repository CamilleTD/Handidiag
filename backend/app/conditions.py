"""Grammaire des conditions, partagée par les règles et l'affichage conditionnel des questions.

    {"all": [c, ...]} | {"any": [c, ...]} | {"not": c}
    {"q": "<question>", "in": ["<option>", ...]}          réponse parmi ces options
    {"q": "<question>", "hasAny": ["<option>", ...]}      au moins une de ces options cochée
    {"q": "<question>", "countAtLeast": n, "among": [...]} au moins n options cochées (parmi...)
    {"q": "<question>", "answered": true|false}           question répondue ou non

L'évaluation se fait dans le navigateur (frontend/src/app/core/engine.ts) : les réponses ne
quittent jamais l'appareil. Le serveur ne fait que valider la structure et les références.
"""

from collections.abc import Iterator
from typing import Any

# question -> options existantes
Catalog = dict[str, set[str]]

GROUPS = ("all", "any", "not")
OPERATORS = ("in", "hasAny", "countAtLeast", "answered")


class ConditionError(ValueError):
    """Erreur de condition : code stable et paramètres, pour une traduction côté interface."""

    def __init__(self, code: str, message: str, **params: Any) -> None:
        super().__init__(message)
        self.code = code
        self.params = params


def validate_condition(condition: Any, catalog: Catalog, path: str = "condition") -> None:
    if not isinstance(condition, dict) or not condition:
        raise ConditionError(
            "condition_not_object", f"{path} : une condition doit être un objet non vide", path=path
        )

    groups = [name for name in GROUPS if name in condition]
    if groups:
        if len(condition) != 1:
            raise ConditionError(
                "condition_group_mixed",
                f"{path} : un groupe ne contient qu'un opérateur",
                path=path,
            )
        group = groups[0]
        if group == "not":
            validate_condition(condition["not"], catalog, f"{path}.not")
            return
        children = condition[group]
        if not isinstance(children, list) or not children:
            raise ConditionError(
                "condition_group_empty", f"{path}.{group} : liste de conditions vide", path=path
            )
        for index, child in enumerate(children):
            validate_condition(child, catalog, f"{path}.{group}[{index}]")
        return

    question = condition.get("q")
    if not isinstance(question, str) or question not in catalog:
        raise ConditionError(
            "condition_unknown_question",
            f"{path} : question « {question} » absente de ce questionnaire",
            path=path,
            question=str(question),
        )
    operators = [name for name in OPERATORS if name in condition]
    if len(operators) != 1:
        raise ConditionError(
            "condition_operator",
            f"{path} : indiquez exactement un opérateur ({', '.join(OPERATORS)})",
            path=path,
        )
    operator = operators[0]
    allowed = {"q", operator} | ({"among"} if operator == "countAtLeast" else set())
    unknown = set(condition) - allowed
    if unknown:
        fields = ", ".join(sorted(unknown))
        raise ConditionError(
            "condition_unexpected_field",
            f"{path} : champ(s) inattendu(s) {fields}",
            path=path,
            fields=fields,
        )

    options = catalog[question]
    if operator in ("in", "hasAny") or "among" in condition:
        field = "among" if operator == "countAtLeast" else operator
        values = condition[field]
        if not isinstance(values, list) or not values:
            raise ConditionError(
                "condition_no_option", f"{path}.{field} : liste de réponses vide", path=path
            )
        for value in values:
            if value not in options:
                raise ConditionError(
                    "condition_unknown_option",
                    f"{path} : réponse « {value} » inconnue pour « {question} »",
                    path=path,
                    question=question,
                    option=str(value),
                )
    if operator == "countAtLeast":
        count = condition["countAtLeast"]
        if not isinstance(count, int) or isinstance(count, bool) or count < 1:
            raise ConditionError(
                "condition_count", f"{path}.countAtLeast : entier ≥ 1 attendu", path=path
            )
    if operator == "answered" and not isinstance(condition["answered"], bool):
        raise ConditionError(
            "condition_answered", f"{path}.answered : true ou false attendu", path=path
        )


def references(condition: Any) -> Iterator[tuple[str, str | None]]:
    """Couples (question, réponse) cités par une condition ; réponse None = question seule."""
    if not isinstance(condition, dict):
        return
    for group in ("all", "any"):
        for child in condition.get(group) or []:
            yield from references(child)
    if "not" in condition:
        yield from references(condition["not"])
    question = condition.get("q")
    if isinstance(question, str):
        yield question, None
        for field in ("in", "hasAny", "among"):
            for value in condition.get(field) or []:
                yield question, value


def questions_in(condition: Any) -> set[str]:
    return {question for question, _ in references(condition)}
