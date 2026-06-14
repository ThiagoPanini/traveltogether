"""Modelos do boundary collaboration — Comentário (ADR-0014).

O alvo é polimórfico (target_type, target_id): id apenas, nunca FK para
tabelas de outros boundaries além de trips/users (ADR-0014).
"""

import uuid
from datetime import UTC, datetime
from enum import StrEnum
from typing import ClassVar

from sqlmodel import Field, SQLModel


class CommentTargetType(StrEnum):
    fare_quote = "fare_quote"
    itinerary_item = "itinerary_item"
    trip = "trip"


class Comment(SQLModel, table=True):  # type: ignore[call-arg]
    __tablename__: ClassVar[str] = "comments"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    trip_id: uuid.UUID = Field(foreign_key="trips.id", index=True)
    target_type: CommentTargetType
    target_id: uuid.UUID = Field(index=True)
    author_id: uuid.UUID = Field(foreign_key="users.id")
    body: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class CommentPublic(SQLModel):
    id: uuid.UUID
    trip_id: uuid.UUID
    target_type: CommentTargetType
    target_id: uuid.UUID
    author_id: uuid.UUID
    body: str
    created_at: datetime
    updated_at: datetime


class CommentCreate(SQLModel):
    target_type: CommentTargetType
    target_id: uuid.UUID
    body: str


class CommentUpdate(SQLModel):
    body: str
