"""Modèle de données HandiDiag.

Les textes affichés au public sont stockés en JSON sous la forme {"fr": "...", "en": "..."}
(type LocalizedText côté API) : la structure d'une question et ses libellés vivent dans la même
ligne, ce qui évite les clés de traduction à synchroniser à la main.

Les conditions (affichage d'une question, déclenchement d'une règle) sont des arbres JSON
validés par app.conditions avant chaque enregistrement. Les clés (`key`) des questions et des
options sont immuables une fois créées : les conditions s'y réfèrent.
"""

from enum import StrEnum

from tortoise import fields
from tortoise.models import Model


class QuestionKind(StrEnum):
    SINGLE = "single"
    MULTIPLE = "multiple"


class QuestionPhase(StrEnum):
    CORE = "core"  # questions essentielles
    DEEP = "deep"  # questions complémentaires, facultatives


class PoleOutcomeKey(StrEnum):
    FOLLOWED = "followed"  # déjà suivi(e) par le pôle handicap
    SUGGEST = "suggest"  # le pôle peut aider
    MAYBE = "maybe"  # cela vaut la peine d'en parler
    NONE = "none"  # rien n'indique un besoin pour l'instant
    DECLINED = "declined"  # la personne n'a pas souhaité regarder


class PoleGroup(StrEnum):
    SCHOOL = "school"  # études à l'école
    WORK = "work"  # stage, alternance, emploi


class TimestampedModel(Model):
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        abstract = True


# --------------------------------------------------------------------------- administration


class AdminUser(TimestampedModel):
    id = fields.IntField(primary_key=True)
    username = fields.CharField(max_length=80, unique=True)
    password_hash = fields.CharField(max_length=255)
    must_change_password = fields.BooleanField(default=False)
    last_login_at = fields.DatetimeField(null=True)

    sessions: fields.ReverseRelation["AdminSession"]

    class Meta:
        table = "admin_user"


class AdminSession(Model):
    """Session côté serveur : seul le hachage du jeton est stocké, la déconnexion la révoque."""

    id = fields.IntField(primary_key=True)
    token_hash = fields.CharField(max_length=64, unique=True)
    user: fields.ForeignKeyRelation[AdminUser] = fields.ForeignKeyField(
        "models.AdminUser", related_name="sessions", on_delete=fields.CASCADE
    )
    expires_at = fields.DatetimeField()
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "admin_session"


# --------------------------------------------------------------------------- questionnaire


class Question(TimestampedModel):
    id = fields.IntField(primary_key=True)
    key = fields.CharField(max_length=64, unique=True)
    kind = fields.CharEnumField(QuestionKind, max_length=16)
    phase = fields.CharEnumField(QuestionPhase, max_length=16, default=QuestionPhase.CORE)
    # Étape à part dans le parcours (ex. « pole ») : hors du décompte des questions RQTH
    step = fields.CharField(max_length=32, null=True)
    position = fields.IntField(default=0)
    required = fields.BooleanField(default=False)
    # Question masquée dont la réponse est fixée d'office (ex. profil « student »)
    hidden = fields.BooleanField(default=False)
    auto_answer = fields.CharField(max_length=64, null=True)
    show_if = fields.JSONField(null=True)
    # La liste des questions essentielles s'arrête après cette question si la condition est vraie
    stop_if = fields.JSONField(null=True)
    # Parcours pour lesquels une question complémentaire reste proposée (ex. ["pole"])
    tracks = fields.JSONField(default=list)
    text = fields.JSONField()
    text_falc = fields.JSONField(null=True)
    help = fields.JSONField(null=True)

    options: fields.ReverseRelation["QuestionOption"]

    class Meta:
        table = "question"
        ordering = ["position", "id"]


class QuestionOption(Model):
    id = fields.IntField(primary_key=True)
    question: fields.ForeignKeyRelation[Question] = fields.ForeignKeyField(
        "models.Question", related_name="options", on_delete=fields.CASCADE
    )
    key = fields.CharField(max_length=64)
    position = fields.IntField(default=0)
    exclusive = fields.BooleanField(default=False)
    label = fields.JSONField()

    class Meta:
        table = "question_option"
        unique_together = (("question", "key"),)
        ordering = ["position", "id"]


# --------------------------------------------------------------------------- restitution


class Level(TimestampedModel):
    """Niveau d'orientation RQTH. min_score null : niveau atteint uniquement par une règle."""

    id = fields.IntField(primary_key=True)
    key = fields.CharField(max_length=64, unique=True)
    position = fields.IntField(default=0)
    min_score = fields.IntField(null=True)
    icon = fields.CharField(max_length=32, default="book")
    title = fields.JSONField()
    body = fields.JSONField()
    body_falc = fields.JSONField(null=True)

    class Meta:
        table = "level"
        ordering = ["position", "id"]


class Flag(TimestampedModel):
    """Point d'attention affiché dans la restitution (ordre d'affichage = position)."""

    id = fields.IntField(primary_key=True)
    key = fields.CharField(max_length=64, unique=True)
    position = fields.IntField(default=0)
    text = fields.JSONField()

    class Meta:
        table = "flag"
        ordering = ["position", "id"]


class Suggestion(TimestampedModel):
    """Piste pour avancer, proposée par une ou plusieurs règles."""

    id = fields.IntField(primary_key=True)
    key = fields.CharField(max_length=64, unique=True)
    position = fields.IntField(default=0)
    text = fields.JSONField()

    class Meta:
        table = "suggestion"
        ordering = ["position", "id"]


class PoleOutcome(TimestampedModel):
    """Message de la section « pôle handicap » de la restitution."""

    id = fields.IntField(primary_key=True)
    key = fields.CharEnumField(PoleOutcomeKey, max_length=16, unique=True)
    title = fields.JSONField()
    body = fields.JSONField()

    class Meta:
        table = "pole_outcome"


class Rule(TimestampedModel):
    id = fields.IntField(primary_key=True)
    key = fields.CharField(max_length=64, unique=True)
    position = fields.IntField(default=0)
    condition = fields.JSONField()
    points = fields.IntField(default=0)
    override_level: fields.ForeignKeyNullableRelation[Level] = fields.ForeignKeyField(
        "models.Level", related_name="overriding_rules", null=True, on_delete=fields.RESTRICT
    )
    pole_outcome = fields.CharEnumField(PoleOutcomeKey, max_length=16, null=True)
    # Phrase affichée dans « Ce qui a été pris en compte » (null : règle non expliquée)
    explanation = fields.JSONField(null=True)
    flags: fields.ManyToManyRelation[Flag] = fields.ManyToManyField(
        "models.Flag", related_name="rules", through="rule_flag"
    )
    suggestions: fields.ManyToManyRelation[Suggestion] = fields.ManyToManyField(
        "models.Suggestion", related_name="rules", through="rule_suggestion"
    )

    class Meta:
        table = "rule"
        ordering = ["position", "id"]


class Contact(TimestampedModel):
    id = fields.IntField(primary_key=True)
    key = fields.CharField(max_length=64, unique=True)
    position = fields.IntField(default=0)
    icon = fields.CharField(max_length=32, default="user")
    name = fields.JSONField()
    role = fields.JSONField()
    email = fields.CharField(max_length=254, null=True)
    link_url = fields.CharField(max_length=2048, null=True)
    link_label = fields.JSONField(null=True)
    # Tenu au secret médical : proposé en premier quand la personne craint le regard des autres
    is_confidential = fields.BooleanField(default=False)
    pole_group = fields.CharEnumField(PoleGroup, max_length=16, null=True)

    profiles: fields.ReverseRelation["ProfileContact"]

    class Meta:
        table = "contact"
        ordering = ["position", "id"]


class ProfileContact(Model):
    """Interlocuteurs proposés pour un profil (clé d'option de la question « profile »)."""

    id = fields.IntField(primary_key=True)
    profile = fields.CharField(max_length=64)
    contact: fields.ForeignKeyRelation[Contact] = fields.ForeignKeyField(
        "models.Contact", related_name="profiles", on_delete=fields.CASCADE
    )
    position = fields.IntField(default=0)

    class Meta:
        table = "profile_contact"
        unique_together = (("profile", "contact"),)
        ordering = ["profile", "position"]


# --------------------------------------------------------------------------- statistiques


class StatCounter(Model):
    """Compteur anonyme journalier. Chaque dimension est comptée séparément, jamais croisée."""

    id = fields.IntField(primary_key=True)
    day = fields.DateField()
    metric = fields.CharField(max_length=32)  # start, complete, deep, lang, profile, level, doc
    key = fields.CharField(max_length=64, default="")
    count = fields.IntField(default=0)

    class Meta:
        table = "stat_counter"
        unique_together = (("day", "metric", "key"),)
