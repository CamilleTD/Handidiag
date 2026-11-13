import pytest

from app.conditions import ConditionError, references, validate_condition

CATALOG = {"duration": {"none", "short", "long"}, "areas": {"energy", "senses", "other"}}


@pytest.mark.parametrize(
    "condition",
    [
        {"q": "duration", "in": ["long"]},
        {"q": "areas", "hasAny": ["energy", "senses"]},
        {"q": "areas", "countAtLeast": 2, "among": ["energy", "senses"]},
        {"q": "areas", "answered": False},
        {"all": [{"q": "duration", "in": ["long"]}, {"not": {"q": "areas", "answered": True}}]},
    ],
)
def test_valid_conditions(condition):
    validate_condition(condition, CATALOG)


@pytest.mark.parametrize(
    ("condition", "message"),
    [
        ({"q": "unknown", "in": ["x"]}, "question inconnue"),
        ({"q": "duration", "in": ["maybe"]}, "option « maybe » inconnue"),
        ({"q": "duration", "in": ["long"], "answered": True}, "exactement un opérateur"),
        ({"all": []}, "liste de conditions vide"),
        ({"all": [{"q": "duration", "in": ["long"]}], "any": []}, "un seul opérateur"),
        ({"q": "areas", "countAtLeast": 0}, "entier supérieur"),
        ({"q": "duration", "in": ["long"], "extra": 1}, "inattendu"),
    ],
)
def test_invalid_conditions(condition, message):
    with pytest.raises(ConditionError, match=message):
        validate_condition(condition, CATALOG)


def test_references_walks_nested_groups():
    condition = {
        "any": [{"q": "duration", "in": ["long"]}, {"not": {"q": "areas", "hasAny": ["energy"]}}]
    }
    assert set(references(condition)) == {
        ("duration", None),
        ("duration", "long"),
        ("areas", None),
        ("areas", "energy"),
    }
