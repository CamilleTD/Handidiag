from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, StringConstraints

from app.models import ContactGroup, QuestionKind, ResourceSection

Key = Annotated[str, StringConstraints(pattern=r"^[A-Za-z][A-Za-z0-9_]{0,63}$")]
Icon = Literal["book", "chat", "clock", "badge", "user", "building", "shield", "doc", "compass"]
Condition = dict[str, Any]


class LocalizedText(BaseModel):
    """Texte bilingue : français obligatoire, anglais facultatif (repli sur le français)."""

    model_config = ConfigDict(str_strip_whitespace=True)

    fr: str = Field(min_length=1, max_length=4000)
    en: str = Field(default="", max_length=4000)


class Schema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ReorderIn(BaseModel):
    ids: list[int] = Field(min_length=1)


# --------------------------------------------------------------------------- authentification


class LoginIn(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=200)


class PasswordChangeIn(BaseModel):
    current: str = Field(min_length=1, max_length=200)
    new: str = Field(min_length=12, max_length=200)


class AdminOut(Schema):
    username: str
    must_change_password: bool


# --------------------------------------------------------------------------- bibliothèques


class OptionIn(BaseModel):
    key: Key
    exclusive: bool = False
    label: LocalizedText


class QuestionIn(BaseModel):
    key: Key
    kind: QuestionKind
    text: LocalizedText
    text_falc: LocalizedText | None = None
    help: LocalizedText | None = None
    options: list[OptionIn] = Field(min_length=1, max_length=30)


class TextItemIn(BaseModel):
    key: Key
    text: LocalizedText
    highlight_confidential: bool = False


class ContactIn(BaseModel):
    key: Key
    icon: Icon = "user"
    name: LocalizedText
    role: LocalizedText
    email: EmailStr | None = None
    link_url: HttpUrl | None = None
    link_label: LocalizedText | None = None
    is_confidential: bool = False
    group: ContactGroup | None = None


class RuleIn(BaseModel):
    key: Key
    condition: Condition
    explanation: LocalizedText | None = None
    flags: list[Key] = []
    suggestions: list[Key] = []
    contacts: list[Key] = []


# --------------------------------------------------------------------------- questionnaires


class QuestionnaireIn(BaseModel):
    key: Key
    title: LocalizedText
    description: LocalizedText | None = None
    featured: bool = False


class SectionIn(BaseModel):
    title: LocalizedText
    intro: LocalizedText | None = None
    optional: bool = False


class ItemIn(BaseModel):
    question: Key
    required: bool = False
    show_if: Condition | None = None
    auto_answer: Key | None = None


class OutcomeIn(BaseModel):
    key: Key
    min_score: int | None = Field(default=None, ge=-1000, le=1000)
    icon: Icon = "book"
    title: LocalizedText
    body: LocalizedText
    body_falc: LocalizedText | None = None
    next_questionnaire: Key | None = None
    contacts: list[Key] = []


class RuleUsageIn(BaseModel):
    rule: Key
    points: int = Field(default=0, ge=-100, le=100)
    override_outcome: Key | None = None


# --------------------------------------------------------------------------- contenus éditoriaux


class ResourceIn(BaseModel):
    section: ResourceSection
    key: Key
    url: HttpUrl | None = None
    title: LocalizedText
    description: LocalizedText
    reference: LocalizedText | None = None
    is_published: bool = True


class ResourceOut(ResourceIn, Schema):
    id: int
    position: int
    url: str | None = None


class TextBlock(BaseModel):
    type: Literal["text", "accordion"]
    title: LocalizedText
    text: LocalizedText


class LinkBlock(BaseModel):
    type: Literal["link"]
    title: LocalizedText
    text: LocalizedText | None = None
    url: Annotated[str, StringConstraints(pattern=r"^https://\S+$", max_length=2048)]


class DocumentBlock(BaseModel):
    """PDF servi par le site lui-même (dossier frontend/public/docs)."""

    type: Literal["document"]
    title: LocalizedText
    text: LocalizedText | None = None
    url: Annotated[str, StringConstraints(pattern=r"^/docs/[A-Za-z0-9_.-]+\.pdf$")]


PageBlock = Annotated[TextBlock | LinkBlock | DocumentBlock, Field(discriminator="type")]


class ContentPageIn(BaseModel):
    slug: Annotated[str, StringConstraints(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", max_length=80)]
    title: LocalizedText
    intro: LocalizedText | None = None
    blocks: list[PageBlock] = Field(default_factory=list, max_length=60)
    is_published: bool = True


class ContentPageOut(ContentPageIn, Schema):
    id: int
    position: int
    updated_at: datetime


# --------------------------------------------------------------------------- statistiques


class EventIn(BaseModel):
    t: Literal["start", "complete", "optional", "doc"]
    questionnaire: Key | None = None
    lang: Key | None = None
    outcome: Key | None = None
    doc: Key | None = None
