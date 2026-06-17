"""Modelos do boundary fares."""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from typing import ClassVar

from sqlalchemy import UniqueConstraint
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
    # Par opcional de pontos (programa de fidelidade), ao lado do par de dinheiro
    # (ADR-0019, invariante 15 estendido): arranjos só-dinheiro, só-pontos ou
    # pontos + taxa. `loyalty_program` é o rótulo livre da unidade (ex.: "milhas
    # LATAM"). Nada se converte entre dinheiro e pontos.
    points: int | None = None
    loyalty_program: str | None = None
    flight_date: datetime
    duration_minutes: int
    stops: int = 0
    checked_baggage: bool = False
    origin_airport: str
    destination_airport: str
    airline: str
    link: str = ""
    notes: str = ""


class Preference(SQLModel, table=True):  # type: ignore[call-arg]
    """`Preferida`/`Comprada` por-pessoa (ADR-0018/0019, invariantes 11/13).

    Uma linha por (`Usuário`, `Trecho`): a `Pesquisa` que a pessoa vai usar
    naquele `Trecho` aéreo (≤1 por `Trecho` por pessoa, garantido pelo unique).
    `purchased` marca a `Comprada`. Só o dono escreve a própria.
    """

    __tablename__: ClassVar[str] = "preferences"  # pyright: ignore[reportIncompatibleVariableOverride]
    __table_args__ = (UniqueConstraint("user_id", "segment_id", name="uq_preference_user_segment"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    segment_id: uuid.UUID = Field(foreign_key="segments.id", index=True)
    fare_quote_id: uuid.UUID = Field(foreign_key="fare_quotes.id", index=True)
    purchased: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class FareQuotePublic(SQLModel):
    id: uuid.UUID
    leg_id: uuid.UUID
    segment_id: uuid.UUID
    registered_by: uuid.UUID
    created_at: datetime
    value: Decimal
    currency: str
    points: int | None = None
    loyalty_program: str | None = None
    flight_date: datetime
    duration_minutes: int
    stops: int
    checked_baggage: bool
    origin_airport: str
    destination_airport: str
    airline: str
    link: str
    notes: str


class Upvote(SQLModel, table=True):  # type: ignore[call-arg]
    __tablename__: ClassVar[str] = "upvotes"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    fare_quote_id: uuid.UUID = Field(foreign_key="fare_quotes.id")
    user_id: uuid.UUID = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class FareMarker(SQLModel):
    """Quem marcou uma `Pesquisa` como `Preferida`/`Comprada` (pilha de avatares)."""

    user_id: uuid.UUID
    display_name: str | None = None
    avatar_url: str | None = None


class FareQuoteWithVote(FareQuotePublic):
    upvote_count: int
    user_voted: bool
    registered_by_display_name: str | None = None
    registered_by_avatar_url: str | None = None
    # Decisão por-pessoa (ADR-0018): marcação do próprio usuário + pilha do grupo.
    user_preferred: bool = False
    user_purchased: bool = False
    preferred_by: list[FareMarker] = Field(default_factory=list)
    purchased_by: list[FareMarker] = Field(default_factory=list)


class FareQuoteCreate(SQLModel):
    value: Decimal
    currency: str
    points: int | None = None
    loyalty_program: str | None = None
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
    points: int | None = None
    loyalty_program: str | None = None
    flight_date: datetime | None = None
    duration_minutes: int | None = None
    stops: int | None = None
    checked_baggage: bool | None = None
    origin_airport: str | None = None
    destination_airport: str | None = None
    airline: str | None = None
    link: str | None = None
    notes: str | None = None
