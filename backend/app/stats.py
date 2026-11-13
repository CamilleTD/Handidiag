"""Statistiques anonymes : compteurs journaliers séparés, affichés avec un seuil minimal."""

from datetime import date, timedelta

from tortoise.expressions import F

from app.models import Resource, ResourceSection, StatCounter

# Exports comptés en plus des liens officiels du kit
EXPORTS = ["print", "pdf_download", "summary_download"]
LANGS = ["fr", "en"]


async def document_keys() -> list[str]:
    """Documents dont l'ouverture peut être comptée : liens officiels du kit et exports."""
    official = await Resource.filter(section=ResourceSection.OFFICIAL).values_list("key", flat=True)
    return [*official, *EXPORTS]


async def increment(
    metric: str, key: str = "", questionnaire: str = "", day: date | None = None
) -> None:
    counter, _ = await StatCounter.get_or_create(
        day=day or date.today(), questionnaire=questionnaire, metric=metric, key=key
    )
    await StatCounter.filter(id=counter.id).update(count=F("count") + 1)


def mask(value: int, k: int) -> int | str:
    return f"<{k}" if 0 < value < k else value


def mask_dimension(values: dict[str, int], keys: list[str], k: int) -> dict[str, int | str]:
    """Masque les petites valeurs ; si une seule l'est, masque aussi la plus petite autre,
    sinon une soustraction avec le total la révélerait."""
    cells = {key: values.get(key, 0) for key in keys}
    small = [key for key, value in cells.items() if 0 < value < k]
    forced: set[str] = set()
    if len(small) == 1:
        others = sorted((v, key) for key, v in cells.items() if v >= k)
        if others:
            forced.add(others[0][1])
    return {key: f"<{k}*" if key in forced else mask(value, k) for key, value in cells.items()}


async def dashboard(k: int, questionnaire: str, outcomes: list[str]) -> dict:
    """Indicateurs d'un questionnaire, plus les compteurs généraux (documents)."""
    counters = await StatCounter.filter(questionnaire__in=[questionnaire, ""])
    totals: dict[str, dict[str, int]] = {}
    days: dict[str, dict[str, int]] = {}
    for counter in counters:
        scope = totals.setdefault(counter.metric, {})
        if counter.metric == "doc" or counter.questionnaire == questionnaire:
            scope[counter.key] = scope.get(counter.key, 0) + counter.count
        if counter.questionnaire == questionnaire and counter.metric in ("start", "complete"):
            day = days.setdefault(counter.day.isoformat(), {"start": 0, "complete": 0})
            day[counter.metric] += counter.count

    starts = sum(totals.get("start", {}).values())
    completes = sum(totals.get("complete", {}).values())
    since = (date.today() - timedelta(days=29)).isoformat()
    return {
        "k": k,
        "totals": {
            "starts": mask(starts, k),
            "completes": mask(completes, k),
            "completion_rate": round(completes / starts * 100) if starts >= k else None,
            "optional": mask(sum(totals.get("optional", {}).values()), k),
        },
        "by_outcome": mask_dimension(totals.get("outcome", {}), outcomes, k),
        "by_lang": mask_dimension(totals.get("lang", {}), LANGS, k),
        "documents": mask_dimension(totals.get("doc", {}), await document_keys(), k),
        "daily": [
            {"date": day, "start": mask(v["start"], k), "complete": mask(v["complete"], k)}
            for day, v in sorted(days.items())
            if day >= since
        ],
    }
