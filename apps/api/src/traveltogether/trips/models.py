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


class InvitationStatus(StrEnum):
    """Estado de um `Convite` (ADR-0015, invariante 21)."""

    pending = "pending"
    accepted = "accepted"
    declined = "declined"


class Invitation(SQLModel, table=True):  # type: ignore[call-arg]
    """`Convite` para uma Viagem. Aceite explícito vira `Membership` (ADR-0015).

    Substitui a resolução JIT silenciosa: adicionar um e-mail cria um Convite
    `pending`, nunca uma `Membership` direta. Vale tanto para quem já tem conta
    quanto para quem ainda vai se cadastrar (o Convite aguarda o login).
    """

    __tablename__: ClassVar[str] = "invitations"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    trip_id: uuid.UUID = Field(foreign_key="trips.id")
    email: str = Field(index=True)
    role: MembershipRole = MembershipRole.member
    status: InvitationStatus = InvitationStatus.pending
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    responded_at: datetime | None = None


class InvitationPublic(SQLModel):
    id: uuid.UUID
    trip_id: uuid.UUID
    email: str
    role: MembershipRole
    status: InvitationStatus
    created_at: datetime
    responded_at: datetime | None


class PendingInvitePublic(SQLModel):
    """Visão de um Convite pendente na lista de membros do Organizador.

    Espelha o formato antigo de `PendingMembership` (a UI de membros mostra só
    o e-mail e o estado pendente); o `Convite` completo vai em `InvitationPublic`.
    """

    id: uuid.UUID
    trip_id: uuid.UUID
    email: str
    role: MembershipRole
    invited_at: datetime


class InviteForUserPublic(SQLModel):
    """Convite pendente apresentado ao convidado, com o nome da Viagem."""

    id: uuid.UUID
    trip_id: uuid.UUID
    trip_name: str
    email: str
    role: MembershipRole
    created_at: datetime


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


class SegmentMode(StrEnum):
    """Modo de um `Trecho` (ADR-0019, invariante 26).

    `air` hospeda `Pesquisa`/`Upvote`/`Preferida`; `ground` é conector estrutural
    sem tarifa (custo de aluguel vira `Extra`).
    """

    air = "air"
    ground = "ground"


class Route(SQLModel, table=True):  # type: ignore[call-arg]
    """`Rota` — caminho candidato **autorado** de um `Trajeto` (ADR-0018).

    Ex.: "direto" ou "via Miami". Vive entre os dois extremos do `Trajeto`
    (invariante 22); é uma sequência ordenada de `Trecho`s.
    """

    __tablename__: ClassVar[str] = "routes"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    leg_id: uuid.UUID = Field(foreign_key="legs.id")
    label: str = ""
    order: int
    created_by: uuid.UUID = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Segment(SQLModel, table=True):  # type: ignore[call-arg]
    """`Trecho` — perna aeroporto→aeroporto (ou terrestre) de uma `Rota` (ADR-0018/0019).

    Nova unidade de comparação: `Pesquisa de Passagem` ancora aqui (via
    `fare_quote_segments`). `mode` default `air`; só `air` hospeda tarifa.
    """

    __tablename__: ClassVar[str] = "segments"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    route_id: uuid.UUID = Field(foreign_key="routes.id")
    mode: SegmentMode = SegmentMode.air
    origin_airport: str | None = None
    destination_airport: str | None = None
    order: int


class RoutePublic(SQLModel):
    id: uuid.UUID
    leg_id: uuid.UUID
    label: str
    order: int
    created_by: uuid.UUID
    created_at: datetime


class SegmentPublic(SQLModel):
    id: uuid.UUID
    route_id: uuid.UUID
    mode: SegmentMode
    origin_airport: str | None
    destination_airport: str | None
    order: int


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


class ActivityKind(StrEnum):
    comment = "comment"
    fare_registered = "fare_registered"
    member_joined = "member_joined"


class ActivityItemPublic(SQLModel):
    """Item de atividade recente derivado para o painel (#71)."""

    id: uuid.UUID
    kind: ActivityKind
    trip_id: uuid.UUID
    trip_name: str
    actor_name: str | None
    body: str
    occurred_at: datetime


class PendingActionKind(StrEnum):
    leg_without_fare = "leg_without_fare"
    fare_without_chosen = "fare_without_chosen"
    stop_without_itinerary = "stop_without_itinerary"


class PendingActionPublic(SQLModel):
    """Pendência derivada para o painel 'O que precisa de mim' (#58).

    Não há entidade nova: cada pendência é computada do estado atual das Viagens
    do usuário. `target_kind` é "leg" ou "stop" para o web montar o link.
    """

    kind: PendingActionKind
    trip_id: uuid.UUID
    trip_name: str
    target_kind: str
    target_id: uuid.UUID
    label: str
