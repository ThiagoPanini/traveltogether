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
