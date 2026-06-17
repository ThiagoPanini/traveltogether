"""Modelos do boundary fares."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import ClassVar

from sqlmodel import Field, SQLModel


class FareQuoteSegment(SQLModel, table=True):  # type: ignore[call-arg]
    """Ligação `Pesquisa`↔`Trecho` (ADR-0018/0019).

    Reancora a `Pesquisa de Passagem` no `Trecho` (deixa de ancorar `Leg`).
    Cardinalidade M:N preparando o ida-e-volta (ADR-0019); no esqueleto (#143)
    é sempre 1 `Trecho` por `Pesquisa`.
    """

    __tablename__: ClassVar[str] = "fare_quote_segments"  # pyright: ignore[reportIncompatibleVariableOverride]

    fare_quote_id: uuid.UUID = Field(foreign_key="fare_quotes.id", primary_key=True)
    segment_id: uuid.UUID = Field(foreign_key="segments.id", primary_key=True)


class FareQuote(SQLModel, table=True):  # type: ignore[call-arg]
    __tablename__: ClassVar[str] = "fare_quotes"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    registered_by: uuid.UUID = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    value: Decimal
    currency: str
    flight_date: datetime
    duration_minutes: int
    stops: int = 0
    checked_baggage: bool = False
    origin_airport: str
    destination_airport: str
    airline: str
    link: str = ""
    notes: str = ""
    is_chosen: bool = False


class FareQuotePublic(SQLModel):
    id: uuid.UUID
    leg_id: uuid.UUID
    segment_id: uuid.UUID
    registered_by: uuid.UUID
    created_at: datetime
    value: Decimal
    currency: str
    flight_date: datetime
    duration_minutes: int
    stops: int
    checked_baggage: bool
    origin_airport: str
    destination_airport: str
    airline: str
    link: str
    notes: str
    is_chosen: bool


class Upvote(SQLModel, table=True):  # type: ignore[call-arg]
    __tablename__: ClassVar[str] = "upvotes"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    fare_quote_id: uuid.UUID = Field(foreign_key="fare_quotes.id")
    user_id: uuid.UUID = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class FareQuoteWithVote(FareQuotePublic):
    upvote_count: int
    user_voted: bool
    registered_by_display_name: str | None = None
    registered_by_avatar_url: str | None = None


class FareQuoteCreate(SQLModel):
    value: Decimal
    currency: str
    flight_date: datetime
    duration_minutes: int
    stops: int = 0
    checked_baggage: bool = False
    origin_airport: str
    destination_airport: str
    airline: str
    link: str = ""
    notes: str = ""


class FareQuoteUpdate(SQLModel):
    value: Decimal | None = None
    currency: str | None = None
    flight_date: datetime | None = None
    duration_minutes: int | None = None
    stops: int | None = None
    checked_baggage: bool | None = None
    origin_airport: str | None = None
    destination_airport: str | None = None
    airline: str | None = None
    link: str | None = None
    notes: str | None = None
