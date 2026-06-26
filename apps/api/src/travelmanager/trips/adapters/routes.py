"""Adapter inbound: rotas de `trips` (ADR-0005). O inbound **pode** falar HTTP.

Reusa a costura de sessão do `identity` (`CurrentSession`): a API admite contra o
token opaco que o BFF repassa como Bearer, e a Participação (inv. 9) decide o que cada
um vê. Erros de domínio sobem como categorias (`shared/errors.py`) e o handler central
mapeia categoria→status; o body `{code, detail}` é o contrato com o web.

A montagem dos DTOs de leitura (origem derivada do Perfil de quem vê — inv. 6; bloco
rico só pra membro aceito; convites pendentes só pra Organizador) vive nos helpers
`_backbone_to_read`/`_display_from_user`.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from travelmanager.identity.adapters.routes import CurrentSession
from travelmanager.identity.domain.models import User
from travelmanager.trips.adapters.dependencies import (
    provide_accept_invitation,
    provide_create_trip,
    provide_get_trip_backbone,
    provide_invite_to_trip,
    provide_list_my_invitations,
    provide_list_my_trips,
    provide_revoke_invitation,
)
from travelmanager.trips.adapters.schemas import (
    AcceptResult,
    CrewRead,
    InvitationIn,
    InvitationRead,
    MemberRead,
    MyInvitationRead,
    OriginRead,
    PendingInvitationRead,
    StopRead,
    Transfer,
    TripBackboneRead,
    TripCreateIn,
    TripListItem,
)
from travelmanager.trips.application.ports import MemberDisplay
from travelmanager.trips.application.use_cases import (
    AcceptInvitation,
    CreateTrip,
    GetTripBackbone,
    InvitationInput,
    InviteToTrip,
    ListMyInvitations,
    ListMyTrips,
    RevokeInvitation,
    StopInput,
    TransferInput,
    TripBackbone,
)
from travelmanager.trips.domain.rules import initials

router = APIRouter(tags=["trips"])


# --- tradução de borda --------------------------------------------------------------


def _to_transfer_input(transfer: Transfer | None) -> TransferInput | None:
    """Pydantic → entrada de aplicação para um translado proposto."""
    if transfer is None:
        return None
    return TransferInput(kind=transfer.kind, other_text=transfer.other_text)


def _transfer_read(kind: str | None, other: str | None) -> Transfer | None:
    """Colunas (kind, other) → DTO de translado, ou `None` quando indefinido."""
    if kind is None:
        return None
    return Transfer(kind=kind, other_text=other)


def _display_from_user(user: User) -> MemberDisplay:
    """Display do criador a partir do Perfil já carregado na sessão (sem nova query)."""
    profile = user.profile
    name = profile.display_name if profile is not None else None
    city = profile.origin_city if profile is not None else None
    return MemberDisplay(display_name=name, initials=initials(name), city=city)


def _backbone_to_read(backbone: TripBackbone, viewer: User) -> TripBackboneRead:
    """Monta o `TripBackboneRead` para `viewer` (origem/entry pessoais; cego onde deve).

    Args:
        backbone: A Viagem + a Participação do viewer + os displays dos membros.
        viewer: O usuário corrente (origem derivada do Perfil dele — inv. 6).

    Returns:
        O DTO completo do backbone, com a tripulação resolvida.
    """
    trip = backbone.trip
    viewer_membership = backbone.viewer_membership
    profile = viewer.profile
    origin = OriginRead(
        city=profile.origin_city if profile is not None else None,
        country=profile.country if profile is not None else None,
    )
    stops = [
        StopRead(
            id=stop.id,
            position=stop.position,
            city=stop.city,
            country=stop.country,
            arrival_date=stop.arrival_date,
            desired_transfer=_transfer_read(stop.desired_transfer, stop.desired_transfer_other),
        )
        for stop in sorted(trip.stops, key=lambda s: s.position)
    ]
    members = []
    for membership in trip.memberships:
        display = backbone.member_displays.get(membership.user_id)
        members.append(
            MemberRead(
                display_name=display.display_name if display is not None else None,
                initials=display.initials if display is not None else "",
                city=display.city if display is not None else None,
                role=membership.role,
                is_me=membership.user_id == viewer.id,
            )
        )
    # Convite cego (ADR-0002): os pendentes só aparecem para quem é Organizador.
    pending = (
        [
            PendingInvitationRead(id=inv.id, email=inv.email, role=inv.role)
            for inv in trip.invitations
            if inv.is_pending
        ]
        if viewer_membership.is_organizer
        else []
    )
    return TripBackboneRead(
        id=trip.id,
        name=trip.name,
        description=trip.description,
        departure_date=trip.departure_date,
        my_role=viewer_membership.role,
        origin=origin,
        entry_transfer=_transfer_read(
            viewer_membership.entry_transfer, viewer_membership.entry_transfer_other
        ),
        stops=stops,
        crew=CrewRead(members=members, pending_invitations=pending),
    )


# --- rotas --------------------------------------------------------------------------


@router.post("/trips", response_model=TripBackboneRead, status_code=status.HTTP_201_CREATED)
def create_trip(
    payload: TripCreateIn,
    session: CurrentSession,
    create: Annotated[CreateTrip, Depends(provide_create_trip)],
) -> TripBackboneRead:
    """Cria a Viagem inteira (atômico) e devolve seu backbone para o web navegar.

    Args:
        payload: O esqueleto da Viagem (destino + paradas + translados + convites).
        session: Sessão corrente (o criador vira o 1º Organizador — inv. 9).
        create: Use-case de criação atômica.

    Returns:
        O `TripBackboneRead` da Viagem recém-criada.

    Raises:
        Invalid: nome vazio, sem paradas, ou tipo/papel inválido (→ 422).
    """
    trip = create(
        creator_id=session.user.id,
        name=payload.name,
        description=payload.description,
        departure_date=payload.departure_date,
        entry_transfer=_to_transfer_input(payload.entry_transfer),
        stops=[
            StopInput(
                city=s.city,
                country=s.country,
                arrival_date=s.arrival_date,
                desired_transfer=_to_transfer_input(s.desired_transfer),
            )
            for s in payload.stops
        ],
        invitations=[InvitationInput(email=i.email, role=i.role) for i in payload.invitations],
    )
    creator_membership = next(m for m in trip.memberships if m.user_id == session.user.id)
    backbone = TripBackbone(
        trip=trip,
        viewer_membership=creator_membership,
        member_displays={session.user.id: _display_from_user(session.user)},
    )
    return _backbone_to_read(backbone, session.user)


@router.get("/trips", response_model=list[TripListItem])
def list_trips(
    session: CurrentSession,
    list_my_trips: Annotated[ListMyTrips, Depends(provide_list_my_trips)],
) -> list[TripListItem]:
    """Lista as Viagens que o usuário corrente vê (suas Participações — inv. 9).

    Args:
        session: Sessão corrente.
        list_my_trips: Use-case que lê as Participações.

    Returns:
        Itens de lista (id, nome, cidade-destino, nº de paradas, meu papel).
    """
    memberships = list_my_trips(session.user.id)
    return [
        TripListItem(
            id=m.trip.id,
            name=m.trip.name,
            destination_city=m.trip.destination.city if m.trip.destination is not None else "",
            stop_count=len(m.trip.stops),
            my_role=m.role,
        )
        for m in memberships
    ]


@router.get("/trips/{trip_id}", response_model=TripBackboneRead)
def get_trip(
    trip_id: uuid.UUID,
    session: CurrentSession,
    get_backbone: Annotated[GetTripBackbone, Depends(provide_get_trip_backbone)],
) -> TripBackboneRead:
    """Devolve o backbone de uma Viagem para um membro (404 se não participa).

    Args:
        trip_id: A Viagem pedida.
        session: Sessão corrente (define papel e "is_me"; origem do Perfil dele).
        get_backbone: Use-case que carrega rota + tripulação.

    Returns:
        O `TripBackboneRead`.

    Raises:
        NotFound: o usuário não participa da Viagem (→ 404, sem vazar existência).
    """
    backbone = get_backbone(trip_id, session.user.id)
    return _backbone_to_read(backbone, session.user)


@router.post(
    "/trips/{trip_id}/invitations",
    response_model=InvitationRead,
    status_code=status.HTTP_201_CREATED,
)
def invite_to_trip(
    trip_id: uuid.UUID,
    payload: InvitationIn,
    session: CurrentSession,
    invite: Annotated[InviteToTrip, Depends(provide_invite_to_trip)],
) -> InvitationRead:
    """Convida um e-mail para uma Viagem já criada (Organizador; convite cego).

    Args:
        trip_id: A Viagem.
        payload: E-mail + papel do convidado.
        session: Sessão corrente (precisa ser Organizador — inv. 9).
        invite: Use-case de convite.

    Returns:
        O Convite pendente criado (só e-mail + papel — cego).

    Raises:
        Forbidden: não-Organizador (→ 403).
        Conflict: já há convite pendente para o e-mail (→ 409).
    """
    invitation = invite(trip_id, session.user.id, email=payload.email, role=payload.role)
    return InvitationRead(id=invitation.id, email=invitation.email, role=invitation.role)


@router.get("/invitations", response_model=list[MyInvitationRead])
def list_my_invitations(
    session: CurrentSession,
    list_invitations: Annotated[ListMyInvitations, Depends(provide_list_my_invitations)],
) -> list[MyInvitationRead]:
    """Lista os Convites pendentes do usuário logado (match por e-mail).

    Args:
        session: Sessão corrente (o e-mail da conta casa com o do Convite).
        list_invitations: Use-case que lê os pendentes.

    Returns:
        Os Convites pendentes (com nome de quem convidou, quando resolvível).
    """
    items = list_invitations(session.user.email)
    return [
        MyInvitationRead(
            id=item.invitation.id,
            trip_id=item.invitation.trip_id,
            trip_name=item.invitation.trip.name,
            role=item.invitation.role,
            invited_by_name=item.inviter_name,
        )
        for item in items
    ]


@router.post("/invitations/{invitation_id}/accept", response_model=AcceptResult)
def accept_invitation(
    invitation_id: uuid.UUID,
    session: CurrentSession,
    accept: Annotated[AcceptInvitation, Depends(provide_accept_invitation)],
) -> AcceptResult:
    """Aceita um Convite e entra na Viagem com o papel que ele carrega (inv. 9/10).

    Args:
        invitation_id: O Convite a aceitar.
        session: Sessão corrente (id + e-mail viram/casam a Participação).
        accept: Use-case de aceite.

    Returns:
        A Viagem em que o usuário entrou (`trip_id`).

    Raises:
        NotFound: Convite inexistente/não-pendente (→ 404).
        Forbidden: o e-mail do Convite não casa com o da conta (→ 403).
    """
    membership = accept(invitation_id, user_id=session.user.id, user_email=session.user.email)
    return AcceptResult(trip_id=membership.trip_id)


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_invitation(
    invitation_id: uuid.UUID,
    session: CurrentSession,
    revoke: Annotated[RevokeInvitation, Depends(provide_revoke_invitation)],
) -> Response:
    """Revoga um Convite pendente (Organizador) — libera o e-mail pro re-convite.

    Args:
        invitation_id: O Convite a revogar.
        session: Sessão corrente (precisa ser Organizador da Viagem do Convite).
        revoke: Use-case de revogação.

    Returns:
        Resposta 204 sem corpo.

    Raises:
        NotFound: Convite inexistente (→ 404).
        Forbidden: não-Organizador (→ 403).
    """
    revoke(invitation_id, session.user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
