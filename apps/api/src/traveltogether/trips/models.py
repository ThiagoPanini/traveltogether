"""Modelos do boundary trips."""

import uuid
from datetime import UTC, date, datetime
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
    airport_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    start_date: date | None = None
    end_date: date | None = None
    cover_image_key: str | None = None
    cover_image_url: str | None = None
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
    airport_code: str | None
    latitude: float | None
    longitude: float | None
    start_date: date | None
    end_date: date | None
    cover_image_key: str | None
    cover_image_url: str | None
    created_by: uuid.UUID
    created_at: datetime


class MembershipPublic(SQLModel):
    id: uuid.UUID
    trip_id: uuid.UUID
    user_id: uuid.UUID
    role: MembershipRole
    joined_at: datetime


class PendingMembership(SQLModel, table=True):  # type: ignore[call-arg]
    __tablename__: ClassVar[str] = "pending_memberships"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    trip_id: uuid.UUID = Field(foreign_key="trips.id")
    email: str = Field(index=True)
    role: MembershipRole = MembershipRole.member
    invited_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PendingMembershipPublic(SQLModel):
    id: uuid.UUID
    trip_id: uuid.UUID
    email: str
    role: MembershipRole
    invited_at: datetime


class Stop(SQLModel, table=True):  # type: ignore[call-arg]
    __tablename__: ClassVar[str] = "stops"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    trip_id: uuid.UUID = Field(foreign_key="trips.id")
    city: str
    airport_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    arrival_date: datetime | None = None
    departure_date: datetime | None = None
    cover_image_key: str | None = None
    cover_image_url: str | None = None
    order: int


class StopPublic(SQLModel):
    id: uuid.UUID
    trip_id: uuid.UUID
    city: str
    airport_code: str | None
    latitude: float | None
    longitude: float | None
    arrival_date: datetime | None
    departure_date: datetime | None
    cover_image_key: str | None
    cover_image_url: str | None
    order: int


class StopCreate(SQLModel):
    city: str
    airport_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    arrival_date: datetime | None = None
    departure_date: datetime | None = None


class StopUpdate(SQLModel):
    city: str | None = None
    airport_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    arrival_date: datetime | None = None
    departure_date: datetime | None = None


class Leg(SQLModel, table=True):  # type: ignore[call-arg]
    __tablename__: ClassVar[str] = "legs"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    trip_id: uuid.UUID = Field(foreign_key="trips.id")
    origin_stop_id: uuid.UUID | None = Field(default=None, foreign_key="stops.id")
    destination_stop_id: uuid.UUID | None = Field(default=None, foreign_key="stops.id")
    target_date: datetime | None = None
    order: int


class LegPublic(SQLModel):
    id: uuid.UUID
    trip_id: uuid.UUID
    origin_stop_id: uuid.UUID | None
    destination_stop_id: uuid.UUID | None
    target_date: datetime | None
    order: int


class LegCreate(SQLModel):
    origin_stop_id: uuid.UUID | None = None
    destination_stop_id: uuid.UUID | None = None
    target_date: datetime | None = None


class LegUpdate(SQLModel):
    origin_stop_id: uuid.UUID | None = None
    destination_stop_id: uuid.UUID | None = None
    target_date: datetime | None = None


class TripCreate(SQLModel):
    name: str
    description: str = ""
    origin: str
    airport_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    start_date: date | None = None
    end_date: date | None = None


class TripUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    origin: str | None = None
    airport_code: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    start_date: date | None = None
    end_date: date | None = None


class ItineraryItem(SQLModel, table=True):  # type: ignore[call-arg]
    __tablename__: ClassVar[str] = "itinerary_items"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    stop_id: uuid.UUID = Field(foreign_key="stops.id")
    title: str
    notes: str = ""
    link: str = ""
    day: date | None = None
    time: str | None = None
    order: int


class ItineraryItemPublic(SQLModel):
    id: uuid.UUID
    stop_id: uuid.UUID
    title: str
    notes: str
    link: str
    day: date | None
    time: str | None
    order: int


class ItineraryItemCreate(SQLModel):
    title: str
    notes: str = ""
    link: str = ""
    day: date | None = None
    time: str | None = None


class ItineraryItemUpdate(SQLModel):
    title: str | None = None
    notes: str | None = None
    link: str | None = None
    day: date | None = None
    time: str | None = None


class ReorderItineraryItemsRequest(SQLModel):
    item_ids: list[uuid.UUID]
