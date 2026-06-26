"""Modelos ORM do contexto `trips` (SQLAlchemy 2.0) — as entidades (ADR-0005/0011).

O modelo ORM **é** a entidade (padrão pragmático): comportamento que fala do próprio
estado mora como método aqui; o Pydantic só na borda (`adapters/schemas.py`). As
quatro tabelas da criação vivem juntas (ADR-0011): `Trip`, `Stop`, `Membership`
(Participação) e `Invitation` (Convite).

Convenções herdadas do `identity` (ADR-0011): PK `uuid.uuid4` (não enumera em URL);
enums (`role`, `status`, `transfer_kind`) como `String` validado na borda — sem
DB-enum nem CHECK; timestamps tz-aware com default no banco; FK indexada. A FK
cross-contexto `memberships.user_id → users.id` (e `created_by`/`invited_by`) é
**one-directional**: nenhum back-ref em `User`, a seta de dependência fica
`trips → identity` e o `identity` nunca importa `trips`.

A `Base` mora em `shared/db.py`; o `alembic/env.py` importa este módulo para que as
tabelas registrem em `Base.metadata`.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from travelmanager.shared.db import Base

# Status do Convite (ADR-0002): nasce pendente; vira aceito ou revogado. O índice
# parcial só vigia os pendentes, então revogar/recusar libera o e-mail pro re-convite.
INVITATION_PENDING = "pending"
INVITATION_ACCEPTED = "accepted"
INVITATION_REVOKED = "revoked"

# Papéis (CONTEXT inv. 9 / ADR-0002): Organizador mexe no backbone; Membro explora.
ROLE_ORGANIZER = "organizer"
ROLE_MEMBER = "member"


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(Uuid, primary_key=True, default=uuid.uuid4)


def _created_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now())


def _as_aware(moment: datetime) -> datetime:
    """Normaliza para UTC-aware (SQLite devolve naive; Postgres já vem aware)."""
    return moment if moment.tzinfo is not None else moment.replace(tzinfo=UTC)


class Trip(Base):
    """Viagem: jornada de um grupo (destino derivado, sem origem própria — CONTEXT).

    `created_by` guarda o fato **imutável** "quem criou" (distinto do conjunto
    mutável de Organizadores — papéis são reversíveis, ADR-0002). As Paradas, a
    Participação do criador e os Convites nascem na mesma transação (ADR-0011).
    """

    __tablename__ = "trips"

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(String(280), default=None)
    departure_date: Mapped[date | None] = mapped_column(Date, default=None)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    stops: Mapped[list[Stop]] = relationship(
        back_populates="trip",
        cascade="all, delete-orphan",
        order_by="Stop.position",
    )
    memberships: Mapped[list[Membership]] = relationship(
        back_populates="trip", cascade="all, delete-orphan"
    )
    invitations: Mapped[list[Invitation]] = relationship(
        back_populates="trip", cascade="all, delete-orphan"
    )

    @property
    def destination(self) -> Stop | None:
        """A Parada de destino: a **última** da sequência (derivada — CONTEXT).

        Returns:
            A Parada de maior `position`, ou `None` se a Viagem ainda não tem Paradas.
        """
        if not self.stops:
            return None
        return max(self.stops, key=lambda s: s.position)


class Stop(Base):
    """Parada: cidade onde o grupo permanece (nível de cidade, sem aeroporto — inv. 7).

    Nó ordenado do itinerário; a **última é o destino**. `desired_transfer` é o
    translado **proposto** do salto compartilhado parada[i-1]→parada[i] que chega
    nela (ADR-0009) — **null na 1ª Parada** (o salto que chega ali é a ponta pessoal,
    no `Membership.entry_transfer`); as demais nascem `undecided`. Hint denormalizado,
    não um Trecho.
    """

    __tablename__ = "stops"
    __table_args__ = (UniqueConstraint("trip_id", "position", name="uq_stop_trip_position"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    trip_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    city: Mapped[str] = mapped_column(String(120))
    country: Mapped[str | None] = mapped_column(String(2), default=None)
    arrival_date: Mapped[date | None] = mapped_column(Date, default=None)
    desired_transfer: Mapped[str | None] = mapped_column(String(40), default=None)
    desired_transfer_other: Mapped[str | None] = mapped_column(String(120), default=None)
    created_at: Mapped[datetime] = _created_at()

    trip: Mapped[Trip] = relationship(back_populates="stops")


class Membership(Base):
    """Participação: o elo Usuário↔Viagem, carregando o **papel** ali (inv. 9).

    Nasce na criação (o criador, Organizador) ou no aceite de um Convite. É por ela
    que a Viagem aparece pra pessoa e que o papel libera as camadas. `entry_transfer`
    é a proposta **pessoal** da ponta casa→1ª parada (por-pessoa — inv. 6).
    """

    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("trip_id", "user_id", name="uq_membership_trip_user"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    trip_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(20))
    entry_transfer: Mapped[str | None] = mapped_column(String(40), default=None)
    entry_transfer_other: Mapped[str | None] = mapped_column(String(120), default=None)
    created_at: Mapped[datetime] = _created_at()

    trip: Mapped[Trip] = relationship(back_populates="memberships")

    @property
    def is_organizer(self) -> bool:
        """Diz se a Participação é de Organizador (poder sobre o backbone — inv. 9)."""
        return self.role == ROLE_ORGANIZER


class Invitation(Base):
    """Convite: intenção de incluir um e-mail **com um papel**, virando Participação só
    no aceite (ADR-0002). Cego: guarda só e-mail (lowercase) + papel + status — nenhum
    dado de perfil (anti-enumeração, inv. 10).

    `status='pending'` é o único vigiado pelo **índice parcial** `unique(trip_id, email)`:
    revogar/recusar libera o e-mail pra ser re-convidado sem apagar o histórico. `role`
    default Membro, elevável a Organizador — o Convite **carrega** o papel que vigora no
    aceite. `accepted_at`/`membership_id` carimbam o aceite.
    """

    __tablename__ = "invitations"
    __table_args__ = (
        Index(
            "uq_invitation_trip_email_pending",
            "trip_id",
            "email",
            unique=True,
            sqlite_where=text("status = 'pending'"),
            postgresql_where=text("status = 'pending'"),
        ),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    trip_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("trips.id", ondelete="CASCADE"), index=True
    )
    email: Mapped[str] = mapped_column(String(320), index=True)
    role: Mapped[str] = mapped_column(String(20), default=ROLE_MEMBER)
    status: Mapped[str] = mapped_column(String(20), default=INVITATION_PENDING)
    invited_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), default=None)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=None)
    membership_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("memberships.id", ondelete="SET NULL"), default=None
    )
    created_at: Mapped[datetime] = _created_at()

    trip: Mapped[Trip] = relationship(back_populates="invitations")

    @property
    def is_pending(self) -> bool:
        """Diz se o Convite ainda aguarda aceite (vivo)."""
        return self.status == INVITATION_PENDING

    def accept(self, *, membership_id: uuid.UUID, moment: datetime) -> None:
        """Marca o Convite como aceito, vinculando a Participação criada.

        Args:
            membership_id: A Participação recém-criada no aceite.
            moment: Instante do aceite (timezone-aware, vindo do `Clock`).
        """
        self.status = INVITATION_ACCEPTED
        self.membership_id = membership_id
        self.accepted_at = _as_aware(moment)
