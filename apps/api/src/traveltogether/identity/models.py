"""Modelos do boundary identity."""

import uuid
from datetime import UTC, datetime
from typing import ClassVar

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):  # type: ignore[call-arg]
    __tablename__: ClassVar[str] = "users"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    display_name: str | None = Field(default=None)
    avatar_url: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class UserPublic(SQLModel):
    id: uuid.UUID
    email: str
    display_name: str | None = None
    avatar_url: str | None = None


class UserUpdate(SQLModel):
    display_name: str | None = None
    avatar_url: str | None = None


class NotificationPrefs(SQLModel, table=True):  # type: ignore[call-arg]
    """Preferências de Notificação do Usuário (ADR-0017).

    Uma linha por `Usuário` (PK = `user_id`). Interruptor por tipo
    (`decision`/`task`/`mention`) + opt-in de resumo por e-mail (`digest`).
    `invite` não tem interruptor — convite sempre é entregue. A ausência de linha
    significa "tudo no padrão" (todos ligados, digest desligado).
    """

    __tablename__: ClassVar[str] = "notification_prefs"  # pyright: ignore[reportIncompatibleVariableOverride]

    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True)
    decision: bool = Field(default=True)
    task: bool = Field(default=True)
    mention: bool = Field(default=True)
    digest: bool = Field(default=False)


class NotificationPrefsPublic(SQLModel):
    decision: bool
    task: bool
    mention: bool
    digest: bool


class NotificationPrefsUpdate(SQLModel):
    decision: bool | None = None
    task: bool | None = None
    mention: bool | None = None
    digest: bool | None = None


class OtpCode(SQLModel, table=True):  # type: ignore[call-arg]
    __tablename__: ClassVar[str] = "otp_codes"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(index=True)
    code_hash: str
    expires_at: datetime
    used: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class OtpRequestBody(SQLModel):
    email: str


class OtpVerifyBody(SQLModel):
    email: str
    code: str


class OtpVerifyResponse(SQLModel):
    valid: bool
    email: str | None = None
