"""Schemas Pydantic v2 — o contrato que viaja na API de `trips` (ADR-0005; borda).

Separados do ORM de propósito: aqui só a forma que entra/sai. O `code` estável dos
erros (handler central) e estes shapes são o contrato com o web BFF. Convites
pendentes nunca expõem dado de perfil (cego — ADR-0002); o bloco rico (`MemberRead`)
só sai para membros **aceitos**.
"""

from __future__ import annotations

import uuid
from datetime import date

from pydantic import BaseModel, Field


class Transfer(BaseModel):
    """Translado proposto: tipo (`transfer_kind`) + texto livre (só quando `other`)."""

    kind: str
    other_text: str | None = None


class StopIn(BaseModel):
    """Parada de entrada na criação: cidade + país + data + translado do salto que chega."""

    city: str
    country: str | None = None
    arrival_date: date | None = None
    desired_transfer: Transfer | None = None


class InvitationIn(BaseModel):
    """Convite de entrada: e-mail + papel (default Membro). Serve também ao convidar-depois."""

    email: str
    role: str = "member"


class TripCreateIn(BaseModel):
    """Corpo de `POST /trips`: o esqueleto inteiro da Viagem (criação atômica — ADR-0011).

    A obrigatoriedade/trim de cada campo é regra de domínio (no use-case); a borda só
    transporta. `stops` ordenada (a última é o destino); 1ª parada sem salto
    compartilhado.
    """

    name: str
    description: str | None = None
    departure_date: date | None = None
    entry_transfer: Transfer | None = None
    stops: list[StopIn] = Field(default_factory=list)
    invitations: list[InvitationIn] = Field(default_factory=list)


class StopRead(BaseModel):
    """Parada exposta no backbone."""

    id: uuid.UUID
    position: int
    city: str
    country: str | None
    arrival_date: date | None
    desired_transfer: Transfer | None


class MemberRead(BaseModel):
    """Membro **aceito** (bloco rico: nome + iniciais + cidade + papel)."""

    display_name: str | None
    initials: str
    city: str | None
    role: str
    is_me: bool


class PendingInvitationRead(BaseModel):
    """Convite pendente no backbone: só e-mail + papel (cego — ADR-0002)."""

    id: uuid.UUID
    email: str
    role: str


class CrewRead(BaseModel):
    """A tripulação: membros aceitos + convites pendentes (estes só para Organizadores)."""

    members: list[MemberRead]
    pending_invitations: list[PendingInvitationRead]


class OriginRead(BaseModel):
    """A origem derivada do Perfil de **quem vê** (CONTEXT inv. 6) — não da Viagem."""

    city: str | None
    country: str | None


class TripBackboneRead(BaseModel):
    """Resposta de `POST /trips` e `GET /trips/{id}`: a rota + a tripulação.

    `origin` e `entry_transfer` são de **quem faz o request** (a ponta é por-pessoa).
    """

    id: uuid.UUID
    name: str
    description: str | None
    departure_date: date | None
    my_role: str
    origin: OriginRead
    entry_transfer: Transfer | None
    stops: list[StopRead]
    crew: CrewRead


class TripListItem(BaseModel):
    """Item de `GET /trips`: as Viagens que eu vejo."""

    id: uuid.UUID
    name: str
    destination_city: str
    stop_count: int
    my_role: str


class InvitationRead(BaseModel):
    """Resposta de `POST /trips/{id}/invitations`: o Convite criado (cego)."""

    id: uuid.UUID
    email: str
    role: str


class MyInvitationRead(BaseModel):
    """Item de `GET /invitations`: um Convite pendente na minha caixa."""

    id: uuid.UUID
    trip_id: uuid.UUID
    trip_name: str
    role: str
    invited_by_name: str | None


class AcceptResult(BaseModel):
    """Resposta de `POST /invitations/{id}/accept`: a Viagem em que entrei."""

    trip_id: uuid.UUID
