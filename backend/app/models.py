"""Modèle de données HandiDiag : une banque de questionnaires.

Bibliothèques partagées (réutilisables par plusieurs questionnaires) :
    Question / QuestionOption   questions et réponses possibles
    Rule                        condition + messages (points d'attention, pistes, interlocuteurs)
    Flag, Suggestion, Contact   messages et interlocuteurs de la restitution

Propre à chaque questionnaire :
    Section / SectionItem       ordre des questions, condition d'affichage, réponse fixée d'office
    RuleUsage                   règle utilisée : ordre, points ajoutés, résultat imposé
    Outcome                     résultats possibles (par seuil de score ou imposés par une règle)
    QuestionnaireVersion        versions publiées, figées : le public ne voit qu'elles

Les tables ci-dessus forment le brouillon ; publier en fige une copie (snapshot JSON).
Les textes sont stockés en JSON {"fr": "...", "en": "..."} à côté de leur structure. Les clés
(`key`) sont immuables : conditions, statistiques et versions publiées s'y réfèrent.
"""

from enum import StrEnum

from tortoise import fields
from tortoise.models import Model


class QuestionKind(StrEnum):
    SINGLE = "single"
    MULTIPLE = "multiple"


class ContactGroup(StrEnum):
    """Rubrique de la page Ressources où l'interlocuteur apparaît (« À l'école »)."""

    SCHOOL = "school"  # études à l'école
    WORK = "work"  # stage, alternance, emploi
    OTHER = "other"  # autres services de l'école


class ResourceSection(StrEnum):
    OFFICIAL = "official"  # liens officiels du kit documentaire (ouvertures comptées)
    PUBLIC = "public"  # organismes publics (page Ressources)
    ASSOCIATION = "association"
    LAW = "law"  # textes de loi


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


# --------------------------------------------------------------------------- bibliothèques


class Question(TimestampedModel):
    id = fields.IntField(primary_key=True)
    key = fields.CharField(max_length=64, unique=True)
    kind = fields.CharEnumField(QuestionKind, max_length=16)
    text = fields.JSONField()
    text_falc = fields.JSONField(null=True)
    help = fields.JSONField(null=True)

    options: fields.ReverseRelation["QuestionOption"]
    items: fields.ReverseRelation["SectionItem"]

    class Meta:
        table = "question"
        ordering = ["key"]


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


class Flag(TimestampedModel):
    """Point d'attention affiché dans la restitution (ordre d'affichage = position)."""

    id = fields.IntField(primary_key=True)
    key = fields.CharField(max_length=64, unique=True)
    position = fields.IntField(default=0)
    text = fields.JSONField()
    # Met en avant les interlocuteurs tenus au secret médical (ex. crainte du regard des autres)
    highlight_confidential = fields.BooleanField(default=False)

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
    # Tenu au secret médical : proposé en premier si un point d'attention le demande
    is_confidential = fields.BooleanField(default=False)
    group = fields.CharEnumField(ContactGroup, max_length=16, null=True)

    class Meta:
        table = "contact"
        ordering = ["position", "id"]


class Rule(TimestampedModel):
    """Partie partagée d'une règle : quand elle se déclenche et ce qu'elle ajoute."""

    id = fields.IntField(primary_key=True)
    key = fields.CharField(max_length=64, unique=True)
    condition = fields.JSONField()
    # Phrase affichée dans « Ce qui a été pris en compte » (null : règle non expliquée)
    explanation = fields.JSONField(null=True)
    flags: fields.ManyToManyRelation[Flag] = fields.ManyToManyField(
        "models.Flag", related_name="rules", through="rule_flag"
    )
    suggestions: fields.ManyToManyRelation[Suggestion] = fields.ManyToManyField(
        "models.Suggestion", related_name="rules", through="rule_suggestion"
    )
    contacts: fields.ReverseRelation["RuleContact"]
    usages: fields.ReverseRelation["RuleUsage"]

    class Meta:
        table = "rule"
        ordering = ["key"]


class RuleContact(Model):
    """Interlocuteurs proposés par une règle, dans l'ordre."""

    id = fields.IntField(primary_key=True)
    rule: fields.ForeignKeyRelation[Rule] = fields.ForeignKeyField(
        "models.Rule", related_name="contacts", on_delete=fields.CASCADE
    )
    contact: fields.ForeignKeyRelation[Contact] = fields.ForeignKeyField(
        "models.Contact", related_name="rule_links", on_delete=fields.RESTRICT
    )
    position = fields.IntField(default=0)

    class Meta:
        table = "rule_contact"
        unique_together = (("rule", "contact"),)
        ordering = ["position", "id"]


# --------------------------------------------------------------------------- questionnaires


class Questionnaire(TimestampedModel):
    id = fields.IntField(primary_key=True)
    key = fields.CharField(max_length=64, unique=True)
    position = fields.IntField(default=0)
    title = fields.JSONField()
    description = fields.JSONField(null=True)
    # Questionnaire mis en avant sur l'accueil (un seul à la fois)
    featured = fields.BooleanField(default=False)
    # Numéro de la version servie au public (null : non publié)
    published_number = fields.IntField(null=True)
    # Verrou de modification : une seule session modifie le brouillon à la fois (voir app/locks.py)
    lock_session = fields.CharField(max_length=64, null=True)
    locked_by = fields.CharField(max_length=80, null=True)
    locked_until = fields.DatetimeField(null=True)

    sections: fields.ReverseRelation["Section"]
    outcomes: fields.ReverseRelation["Outcome"]
    rule_usages: fields.ReverseRelation["RuleUsage"]
    versions: fields.ReverseRelation["QuestionnaireVersion"]

    class Meta:
        table = "questionnaire"
        ordering = ["position", "id"]


class Section(Model):
    id = fields.IntField(primary_key=True)
    questionnaire: fields.ForeignKeyRelation[Questionnaire] = fields.ForeignKeyField(
        "models.Questionnaire", related_name="sections", on_delete=fields.CASCADE
    )
    position = fields.IntField(default=0)
    title = fields.JSONField()
    intro = fields.JSONField(null=True)
    # Section facultative : proposée après les autres (« questions complémentaires »)
    optional = fields.BooleanField(default=False)

    items: fields.ReverseRelation["SectionItem"]

    class Meta:
        table = "section"
        ordering = ["position", "id"]


class SectionItem(Model):
    """Question de la banque placée dans une section, avec ses réglages propres."""

    id = fields.IntField(primary_key=True)
    section: fields.ForeignKeyRelation[Section] = fields.ForeignKeyField(
        "models.Section", related_name="items", on_delete=fields.CASCADE
    )
    question: fields.ForeignKeyRelation[Question] = fields.ForeignKeyField(
        "models.Question", related_name="items", on_delete=fields.RESTRICT
    )
    position = fields.IntField(default=0)
    required = fields.BooleanField(default=False)
    show_if = fields.JSONField(null=True)
    # Réponse fixée d'office : la question n'est pas posée (ex. profil « student »)
    auto_answer = fields.CharField(max_length=64, null=True)

    class Meta:
        table = "section_item"
        ordering = ["position", "id"]


class Outcome(TimestampedModel):
    """Résultat possible d'un questionnaire. min_score null : imposé uniquement par une règle."""

    id = fields.IntField(primary_key=True)
    questionnaire: fields.ForeignKeyRelation[Questionnaire] = fields.ForeignKeyField(
        "models.Questionnaire", related_name="outcomes", on_delete=fields.CASCADE
    )
    key = fields.CharField(max_length=64)
    position = fields.IntField(default=0)
    min_score = fields.IntField(null=True)
    icon = fields.CharField(max_length=32, default="book")
    title = fields.JSONField()
    body = fields.JSONField()
    body_falc = fields.JSONField(null=True)
    # Questionnaire proposé ensuite (ex. « Voir si une RQTH peut avoir du sens »)
    next_questionnaire: fields.ForeignKeyNullableRelation[Questionnaire] = fields.ForeignKeyField(
        "models.Questionnaire", related_name=False, null=True, on_delete=fields.SET_NULL
    )
    contacts: fields.ReverseRelation["OutcomeContact"]

    class Meta:
        table = "outcome"
        unique_together = (("questionnaire", "key"),)
        ordering = ["position", "id"]


class OutcomeContact(Model):
    id = fields.IntField(primary_key=True)
    outcome: fields.ForeignKeyRelation[Outcome] = fields.ForeignKeyField(
        "models.Outcome", related_name="contacts", on_delete=fields.CASCADE
    )
    contact: fields.ForeignKeyRelation[Contact] = fields.ForeignKeyField(
        "models.Contact", related_name="outcome_links", on_delete=fields.RESTRICT
    )
    position = fields.IntField(default=0)

    class Meta:
        table = "outcome_contact"
        unique_together = (("outcome", "contact"),)
        ordering = ["position", "id"]


class RuleUsage(Model):
    """Règle utilisée par un questionnaire : ordre, points et résultat imposé y sont propres."""

    id = fields.IntField(primary_key=True)
    questionnaire: fields.ForeignKeyRelation[Questionnaire] = fields.ForeignKeyField(
        "models.Questionnaire", related_name="rule_usages", on_delete=fields.CASCADE
    )
    rule: fields.ForeignKeyRelation[Rule] = fields.ForeignKeyField(
        "models.Rule", related_name="usages", on_delete=fields.RESTRICT
    )
    position = fields.IntField(default=0)
    points = fields.IntField(default=0)
    # La première règle déclenchée qui impose un résultat l'emporte sur le score
    override_outcome: fields.ForeignKeyNullableRelation[Outcome] = fields.ForeignKeyField(
        "models.Outcome", related_name="overriding_usages", null=True, on_delete=fields.RESTRICT
    )

    class Meta:
        table = "rule_usage"
        unique_together = (("questionnaire", "rule"),)
        ordering = ["position", "id"]


class QuestionnaireVersion(Model):
    """Version publiée et figée d'un questionnaire, servie telle quelle au public."""

    id = fields.IntField(primary_key=True)
    questionnaire: fields.ForeignKeyRelation[Questionnaire] = fields.ForeignKeyField(
        "models.Questionnaire", related_name="versions", on_delete=fields.CASCADE
    )
    number = fields.IntField()
    snapshot = fields.JSONField()
    published_at = fields.DatetimeField(auto_now_add=True)
    published_by = fields.CharField(max_length=80, null=True)

    class Meta:
        table = "questionnaire_version"
        unique_together = (("questionnaire", "number"),)
        ordering = ["-number"]


# --------------------------------------------------------------------------- contenus éditoriaux


class Resource(TimestampedModel):
    id = fields.IntField(primary_key=True)
    section = fields.CharEnumField(ResourceSection, max_length=16)
    key = fields.CharField(max_length=64)
    position = fields.IntField(default=0)
    url = fields.CharField(max_length=2048, null=True)
    title = fields.JSONField()
    description = fields.JSONField()
    # Référence juridique (textes de loi)
    reference = fields.JSONField(null=True)
    is_published = fields.BooleanField(default=True)

    class Meta:
        table = "resource"
        unique_together = (("section", "key"),)
        ordering = ["section", "position", "id"]


class ContentPage(TimestampedModel):
    """Page « S'informer » : introduction puis blocs (texte, section dépliable, lien, PDF)."""

    id = fields.IntField(primary_key=True)
    slug = fields.CharField(max_length=80, unique=True)
    position = fields.IntField(default=0)
    title = fields.JSONField()
    intro = fields.JSONField(null=True)
    blocks = fields.JSONField(default=list)
    is_published = fields.BooleanField(default=True)

    class Meta:
        table = "content_page"
        ordering = ["position", "id"]


# --------------------------------------------------------------------------- statistiques


class StatCounter(Model):
    """Compteur anonyme journalier. Chaque dimension est comptée séparément, jamais croisée."""

    id = fields.IntField(primary_key=True)
    day = fields.DateField()
    # Questionnaire concerné ("" pour les compteurs généraux : langue, documents)
    questionnaire = fields.CharField(max_length=64, default="")
    metric = fields.CharField(max_length=32)  # start, complete, optional, lang, outcome, doc
    key = fields.CharField(max_length=64, default="")
    count = fields.IntField(default=0)

    class Meta:
        table = "stat_counter"
        unique_together = (("day", "questionnaire", "metric", "key"),)
