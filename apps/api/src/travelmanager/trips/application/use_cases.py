"""Use-cases do contexto `trips` (ADR-0005): a orquestração da criação e do ciclo.

Cada use-case é um `@dataclass(frozen=True, slots=True)` callable: os Ports entram
como campos no composition-time e a borda chama só `use_case(args)`. Nenhuma linha de
HTTP nem de SQLAlchemy. A criação é **atômica** (ADR-0011): Trip + Stops + a
Participação do criador (Organizador) + Convites pendentes apensados à Viagem e
gravados numa só unit-of-work — o use-case **não commita** (commit só no `get_db`).

Os argumentos chegam como dataclasses puras (`StopInput`, `TransferInput`,
`InvitationInput`): a borda traduz o Pydantic para elas, mantendo a aplicação
agnóstica de framework. O criador entra por `creator_id` (uuid), não pela entidade
`User` — `trips` não importa o `identity` (a costura é o FK e o `UserDirectory`).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import date

from travelmanager.shared.clock import Clock
from travelmanager.shared.errors import Conflict, Forbidden, Invalid, NotFound
from travelmanager.trips.application.ports import (
    InvitationRepository,
    MemberDisplay,
    MembershipRepository,
    TripRepository,
    UserDirectory,
)
from travelmanager.trips.domain.models import (
    INVITATION_PENDING,
    INVITATION_REVOKED,
    ROLE_MEMBER,
    ROLE_ORGANIZER,
    Invitation,
    Membership,
    Stop,
    Trip,
)
from travelmanager.trips.domain.rules import (
    UNDECIDED,
    clean_other_text,
    initials,
    normalize_email,
    validate_transfer_kind,
)

VALID_ROLES = frozenset({ROLE_ORGANIZER, ROLE_MEMBER})


# --- Entradas puras (a borda traduz Pydantic → estas) ---------------------------------


@dataclass(frozen=True, slots=True)
class TransferInput:
    """Translado proposto: tipo + texto livre (só quando `other`)."""

    kind: str
    other_text: str | None = None


@dataclass(frozen=True, slots=True)
class StopInput:
    """Parada de entrada: cidade + país + data + translado desejado do salto que chega."""

    city: str
    country: str | None = None
    arrival_date: date | None = None
    desired_transfer: TransferInput | None = None


@dataclass(frozen=True, slots=True)
class InvitationInput:
    """Convite de entrada: e-mail + papel (default Membro)."""

    email: str
    role: str = ROLE_MEMBER


# --- Views de saída (a borda traduz estas → Pydantic) ---------------------------------


@dataclass(frozen=True, slots=True)
class TripBackbone:
    """O esqueleto de uma Viagem visto por um membro (rota + tripulação resolvida)."""

    trip: Trip
    viewer_membership: Membership
    member_displays: dict[uuid.UUID, MemberDisplay]


@dataclass(frozen=True, slots=True)
class IncomingInvitation:
    """Um Convite pendente na caixa do convidado, com o nome de quem convidou."""

    invitation: Invitation
    inviter_name: str | None


# --- Helpers de domínio ----------------------------------------------------------------


def _clean_country(country: str | None) -> str | None:
    """Normaliza o país para ISO-3166 alfa-2 em caixa-alta, ou `None`."""
    code = (country or "").strip().upper()
    return code or None


def _resolve_role(role: str) -> str:
    """Valida o papel do Convite, caindo em Membro quando vazio.

    Raises:
        Invalid: papel fora de `{organizer, member}`.
    """
    if not role:
        return ROLE_MEMBER
    if role not in VALID_ROLES:
        raise Invalid(f"papel inválido: {role!r}", code="role_invalid")
    return role


def _transfer_columns(transfer: TransferInput | None) -> tuple[str | None, str | None]:
    """Resolve `(kind, other_text)` de um translado proposto (valida o tipo)."""
    if transfer is None:
        return None, None
    kind = validate_transfer_kind(transfer.kind)
    return kind, clean_other_text(kind, transfer.other_text)


# --- Use-cases -------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class CreateTrip:
    """Cria a Viagem inteira numa transação atômica (ADR-0011)."""

    trips: TripRepository
    clock: Clock

    def __call__(
        self,
        *,
        creator_id: uuid.UUID,
        name: str,
        description: str | None = None,
        departure_date: date | None = None,
        entry_transfer: TransferInput | None = None,
        stops: list[StopInput] | None = None,
        invitations: list[InvitationInput] | None = None,
    ) -> Trip:
        """Monta e persiste Trip + Stops + a Participação do criador + Convites.

        A última Parada é o destino (derivado). A 1ª Parada nasce **sem** translado
        compartilhado (`desired_transfer=None`); as demais default `undecided`
        (ADR-0009). O criador vira a 1ª Participação, como **Organizador** (inv. 9), e
        sua ponta pessoal casa→1ª parada entra como `entry_transfer`. Convites nascem
        pendentes, e-mail lowercase, deduplicados no request.

        Args:
            creator_id: Id do usuário criador (vira a Participação Organizador).
            name: Nome livre da Viagem (obrigatório).
            description: Descrição opcional curta.
            departure_date: Partida aproximada da origem (nullable, "a definir").
            entry_transfer: Proposta pessoal da ida casa→1ª parada do criador.
            stops: Sequência ordenada de Paradas (≥1; a última é o destino).
            invitations: Convites a criar junto (cego, com papel).

        Returns:
            A Viagem persistida (com Paradas, a Participação do criador e os Convites).

        Raises:
            Invalid: nome vazio, sem Paradas, parada sem cidade, tipo/ papel inválido.
        """
        stops = stops or []
        invitations = invitations or []
        clean_name = name.strip()
        if not clean_name:
            raise Invalid("o nome da viagem é obrigatório", code="trip_name_required")
        if not stops:
            raise Invalid("a viagem precisa de ao menos um destino", code="trip_stops_required")

        clean_desc = (description or "").strip() or None
        trip = Trip(
            name=clean_name,
            description=clean_desc,
            departure_date=departure_date,
            created_by=creator_id,
        )

        for position, stop in enumerate(stops):
            city = stop.city.strip()
            if not city:
                raise Invalid("toda parada precisa de uma cidade", code="stop_city_required")
            # A 1ª parada não tem salto compartilhado: o que chega nela é a ponta
            # pessoal (entry_transfer). As demais nascem em `undecided` se não vier nada.
            if position == 0:
                kind, other = None, None
            else:
                kind, other = _transfer_columns(stop.desired_transfer or TransferInput(UNDECIDED))
            trip.stops.append(
                Stop(
                    position=position,
                    city=city,
                    country=_clean_country(stop.country),
                    arrival_date=stop.arrival_date,
                    desired_transfer=kind,
                    desired_transfer_other=other,
                )
            )

        entry_kind, entry_other = _transfer_columns(entry_transfer)
        trip.memberships.append(
            Membership(
                user_id=creator_id,
                role=ROLE_ORGANIZER,
                entry_transfer=entry_kind,
                entry_transfer_other=entry_other,
            )
        )

        seen: set[str] = set()
        for invite in invitations:
            email = normalize_email(invite.email)
            if not email or email in seen:
                continue
            seen.add(email)
            trip.invitations.append(
                Invitation(
                    email=email,
                    role=_resolve_role(invite.role),
                    status=INVITATION_PENDING,
                    invited_by=creator_id,
                )
            )

        self.trips.save(trip)
        return trip


@dataclass(frozen=True, slots=True)
class GetTripBackbone:
    """Carrega o esqueleto de uma Viagem para um membro (visibilidade — inv. 9)."""

    trips: TripRepository
    memberships: MembershipRepository
    directory: UserDirectory

    def __call__(self, trip_id: uuid.UUID, viewer_id: uuid.UUID) -> TripBackbone:
        """Devolve a rota + tripulação resolvida, ou recusa se o viewer não participa.

        Não vaza existência: quem não é membro recebe `NotFound` (404), igual a uma
        Viagem inexistente (inv. 9/10).

        Args:
            trip_id: A Viagem pedida.
            viewer_id: Quem está olhando (define o papel e o "is_me").

        Returns:
            O `TripBackbone` com a Viagem, a Participação do viewer e o display de
            cada membro.

        Raises:
            NotFound: o viewer não participa (ou a Viagem não existe).
        """
        membership = self.memberships.get_for(trip_id, viewer_id)
        if membership is None:
            raise NotFound("viagem não encontrada", code="trip_not_found")
        trip = self.trips.get(trip_id)
        if trip is None:  # pragma: no cover — membership implica trip
            raise NotFound("viagem não encontrada", code="trip_not_found")
        displays = self.directory.displays_for([m.user_id for m in trip.memberships])
        return TripBackbone(trip=trip, viewer_membership=membership, member_displays=displays)


@dataclass(frozen=True, slots=True)
class ListMyTrips:
    """Lista as Viagens que um usuário vê (suas Participações — inv. 9)."""

    memberships: MembershipRepository

    def __call__(self, user_id: uuid.UUID) -> list[Membership]:
        """Devolve as Participações do usuário (cada uma com `.trip`).

        Args:
            user_id: Dono das Participações.

        Returns:
            As Participações (a borda mapeia para itens de lista).
        """
        return self.memberships.list_for_user(user_id)


@dataclass(frozen=True, slots=True)
class InviteToTrip:
    """Convida um e-mail para uma Viagem já criada (Organizador; convite cego)."""

    memberships: MembershipRepository
    invitations: InvitationRepository

    def __call__(
        self, trip_id: uuid.UUID, inviter_id: uuid.UUID, *, email: str, role: str = ROLE_MEMBER
    ) -> Invitation:
        """Cria um Convite pendente, se quem convida é Organizador da Viagem.

        Args:
            trip_id: A Viagem.
            inviter_id: Quem convida (precisa ser Organizador — inv. 9).
            email: E-mail do convidado (normalizado lowercase).
            role: Papel que o Convite carrega (default Membro).

        Returns:
            O Convite pendente recém-criado.

        Raises:
            Forbidden: quem convida não é Organizador da Viagem.
            Invalid: e-mail vazio ou papel inválido.
            Conflict: já existe um Convite pendente para esse e-mail nessa Viagem.
        """
        actor = self.memberships.get_for(trip_id, inviter_id)
        if actor is None or not actor.is_organizer:
            raise Forbidden("só Organizadores podem convidar", code="forbidden")
        normalized = normalize_email(email)
        if not normalized:
            raise Invalid("e-mail do convite é obrigatório", code="invitation_email_required")
        resolved_role = _resolve_role(role)
        if self.invitations.find_pending(trip_id, normalized) is not None:
            raise Conflict("já há um convite pendente para esse e-mail", code="invitation_exists")
        invitation = Invitation(
            trip_id=trip_id,
            email=normalized,
            role=resolved_role,
            status=INVITATION_PENDING,
            invited_by=inviter_id,
        )
        self.invitations.save(invitation)
        return invitation


@dataclass(frozen=True, slots=True)
class RevokeInvitation:
    """Revoga um Convite pendente (Organizador) — libera o e-mail pro re-convite."""

    invitations: InvitationRepository
    memberships: MembershipRepository

    def __call__(self, invitation_id: uuid.UUID, actor_id: uuid.UUID) -> None:
        """Marca o Convite como revogado, se o ator é Organizador da Viagem dele.

        Args:
            invitation_id: O Convite a revogar.
            actor_id: Quem revoga (precisa ser Organizador da Viagem).

        Raises:
            NotFound: Convite inexistente ou não-pendente (revogar é só para os vivos —
                aceito/já-revogado não se mexe, pra não corromper o histórico do aceite).
            Forbidden: o ator não é Organizador da Viagem do Convite.
        """
        invitation = self.invitations.get(invitation_id)
        if invitation is None or not invitation.is_pending:
            raise NotFound("convite não encontrado", code="invitation_not_found")
        actor = self.memberships.get_for(invitation.trip_id, actor_id)
        if actor is None or not actor.is_organizer:
            raise Forbidden("só Organizadores podem revogar", code="forbidden")
        invitation.status = INVITATION_REVOKED
        self.invitations.save(invitation)


@dataclass(frozen=True, slots=True)
class ListMyInvitations:
    """Lista os Convites pendentes do usuário logado (match por e-mail)."""

    invitations: InvitationRepository
    directory: UserDirectory

    def __call__(self, email: str) -> list[IncomingInvitation]:
        """Devolve os Convites pendentes do e-mail, com o nome de quem convidou.

        Args:
            email: E-mail da conta logada (normalizado aqui).

        Returns:
            Os Convites pendentes, cada um com o nome do convidador (quando resolvível).
        """
        normalized = normalize_email(email)
        pending = self.invitations.list_pending_for_email(normalized)
        inviter_ids = [i.invited_by for i in pending if i.invited_by is not None]
        displays = self.directory.displays_for(inviter_ids) if inviter_ids else {}
        result: list[IncomingInvitation] = []
        for invitation in pending:
            display = displays.get(invitation.invited_by) if invitation.invited_by else None
            result.append(IncomingInvitation(invitation, display.display_name if display else None))
        return result


@dataclass(frozen=True, slots=True)
class AcceptInvitation:
    """Aceita um Convite: cria a Participação com o papel do Convite (ADR-0002)."""

    invitations: InvitationRepository
    memberships: MembershipRepository
    clock: Clock

    def __call__(
        self, invitation_id: uuid.UUID, *, user_id: uuid.UUID, user_email: str
    ) -> Membership:
        """Casa e-mail→conta e cria a Participação, carimbando o aceite no Convite.

        Ninguém entra sem aceitar (inv. 10) e o papel é o que o Convite carrega
        (inv. 9). Idempotente: se a pessoa já participa, só carimba o aceite.

        Args:
            invitation_id: O Convite a aceitar.
            user_id: Id da conta logada (vira a Participação).
            user_email: E-mail da conta logada (precisa casar com o do Convite).

        Returns:
            A Participação (criada ou já existente).

        Raises:
            NotFound: Convite inexistente ou não-pendente.
            Forbidden: o e-mail do Convite não casa com o da conta.
        """
        invitation = self.invitations.get(invitation_id)
        if invitation is None or not invitation.is_pending:
            raise NotFound("convite não encontrado", code="invitation_not_found")
        if normalize_email(user_email) != invitation.email:
            raise Forbidden("este convite é de outro e-mail", code="invitation_email_mismatch")

        existing = self.memberships.get_for(invitation.trip_id, user_id)
        if existing is not None:
            invitation.accept(membership_id=existing.id, moment=self.clock.now())
            self.invitations.save(invitation)
            return existing

        membership = Membership(trip_id=invitation.trip_id, user_id=user_id, role=invitation.role)
        self.memberships.save(membership)
        invitation.accept(membership_id=membership.id, moment=self.clock.now())
        self.invitations.save(invitation)
        return membership


# Exposto para a borda montar as iniciais do criador sem reimplementar a regra.
__all__ = [
    "AcceptInvitation",
    "CreateTrip",
    "GetTripBackbone",
    "IncomingInvitation",
    "InvitationInput",
    "InviteToTrip",
    "ListMyInvitations",
    "ListMyTrips",
    "RevokeInvitation",
    "StopInput",
    "TransferInput",
    "TripBackbone",
    "initials",
]
