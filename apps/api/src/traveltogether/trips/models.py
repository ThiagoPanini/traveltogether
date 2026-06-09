"""Modelos do boundary trips."""

import uuid
from datetime import UTC, datetime
from enum import StrEnum
from typing import ClassVar

from sqlmodel import Field, SQLModel


class MembershipRole(StrEnum):
    organizer = "organizer"
    member = "member"


class Trip(SQLModel, table=True):  # type: ignore[call-arg]
    __tablename__: ClassVar[str] = "trips"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    description: str = ""
    origin: str
    created_by: uuid.UUID = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Membership(SQLModel, table=True):  # type: ignore[call-arg]
    __tablename__: ClassVar[str] = "memberships"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    trip_id: uuid.UUID = Field(foreign_key="trips.id")
    user_id: uuid.UUID = Field(foreign_key="users.id")
    role: MembershipRole = MembershipRole.member
    joined_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TripPublic(SQLModel):
    id: uuid.UUID
    name: str
    description: str
    origin: str
    created_by: uuid.UUID
    created_at: datetime


class MembershipPublic(SQLModel):
    id: uuid.UUID
    trip_id: uuid.UUID
    user_id: uuid.UUID
    role: MembershipRole
    joined_at: datetime


class TripCreate(SQLModel):
    name: str
    description: str = ""
    origin: str


class TripUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    origin: str | None = None
