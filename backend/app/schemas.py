from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, StringConstraints

from app.models import PoleGroup, PoleOutcomeKey, QuestionKind, QuestionPhase

Key = Annotated[str, StringConstraints(pattern=r"^[A-Za-z][A-Za-z0-9_]{0,63}$")]
Icon = Literal["book", "chat", "clock", "badge", "user", "building", "shield", "doc", "compass"]


class LocalizedText(BaseModel):
    """Texte bilingue : français obligatoire, anglais facultatif (repli sur le français)."""

    model_config = ConfigDict(str_strip_whitespace=True)

    fr: str = Field(min_length=1, max_length=4000)
    en: str = Field(default="", max_length=4000)


class Schema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


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


# --------------------------------------------------------------------------- questionnaire


class OptionIn(BaseModel):
    key: Key
    exclusive: bool = False
    label: LocalizedText


class OptionOut(OptionIn, Schema):
    pass


class QuestionIn(BaseModel):
    key: Key
    kind: QuestionKind
    phase: QuestionPhase = QuestionPhase.CORE
    step: Key | None = None
    required: bool = False
    hidden: bool = False
    auto_answer: Key | None = None
    show_if: dict[str, Any] | None = None
    stop_if: dict[str, Any] | None = None
    tracks: list[Key] = []
    text: LocalizedText
    text_falc: LocalizedText | None = None
    help: LocalizedText | None = None
    options: list[OptionIn] = Field(min_length=1, max_length=30)


class QuestionOut(QuestionIn, Schema):
    id: int
    position: int
    options: list[OptionOut]
    updated_at: datetime


class ReorderIn(BaseModel):
    ids: list[int] = Field(min_length=1)


# --------------------------------------------------------------------------- restitution


class LevelIn(BaseModel):
    key: Key
    min_score: int | None = Field(default=None, ge=0, le=1000)
    icon: Icon = "book"
    title: LocalizedText
    body: LocalizedText
    body_falc: LocalizedText | None = None


class LevelOut(LevelIn, Schema):
    id: int
    position: int


class TextItemIn(BaseModel):
    key: Key
    text: LocalizedText


class TextItemOut(TextItemIn, Schema):
    id: int
    position: int


class PoleOutcomeIn(BaseModel):
    title: LocalizedText
    body: LocalizedText


class PoleOutcomeOut(PoleOutcomeIn, Schema):
    key: PoleOutcomeKey


class RuleIn(BaseModel):
    key: Key
    condition: dict[str, Any]
    points: int = Field(default=0, ge=-100, le=100)
    override_level: Key | None = None
    pole_outcome: Literal[PoleOutcomeKey.SUGGEST, PoleOutcomeKey.MAYBE] | None = None
    explanation: LocalizedText | None = None
    flags: list[Key] = []
    suggestions: list[Key] = []


class RuleOut(RuleIn):
    id: int
    position: int


class ContactIn(BaseModel):
    key: Key
    icon: Icon = "user"
    name: LocalizedText
    role: LocalizedText
    email: EmailStr | None = None
    link_url: HttpUrl | None = None
    link_label: LocalizedText | None = None
    is_confidential: bool = False
    pole_group: PoleGroup | None = None
    profiles: list[Key] = []


class ContactOut(ContactIn):
    id: int
    position: int
    email: str | None = None
    link_url: str | None = None


# --------------------------------------------------------------------------- statistiques


class EventIn(BaseModel):
    t: Literal["start", "complete", "deep", "doc"]
    lang: Key | None = None
    profile: Key | None = None
    level: Key | None = None
    doc: Key | None = None
