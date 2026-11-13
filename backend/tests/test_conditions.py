import pytest

from app.conditions import ConditionError, questions_in, references, validate_condition

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
    ("condition", "code"),
    [
        ({"q": "unknown", "in": ["x"]}, "condition_unknown_question"),
        ({"q": "duration", "in": ["maybe"]}, "condition_unknown_option"),
        ({"q": "duration", "in": ["long"], "answered": True}, "condition_operator"),
        ({"all": []}, "condition_group_empty"),
        ({"all": [{"q": "duration", "in": ["long"]}], "any": []}, "condition_group_mixed"),
        ({"q": "areas", "countAtLeast": 0}, "condition_count"),
        ({"q": "duration", "in": ["long"], "extra": 1}, "condition_unexpected_field"),
    ],
)
def test_invalid_conditions(condition, code):
    with pytest.raises(ConditionError) as error:
        validate_condition(condition, CATALOG)
    assert error.value.code == code


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
    assert questions_in(condition) == {"duration", "areas"}
