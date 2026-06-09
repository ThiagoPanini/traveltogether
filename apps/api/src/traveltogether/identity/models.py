"""Modelos do boundary identity."""

import uuid
from datetime import UTC, datetime
from typing import ClassVar

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):  # type: ignore[call-arg]
    __tablename__: ClassVar[str] = "users"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class UserPublic(SQLModel):
    id: uuid.UUID
    email: str
