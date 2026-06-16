"""Rotas HTTP do boundary trips."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlmodel import Session

from traveltogether.identity.deps import get_current_user
from traveltogether.identity.models import User, UserPublic
from traveltogether.platform.db import get_session
from traveltogether.trips.activity_service import list_recent_activity
from traveltogether.trips.itinerary_service import (
    create_itinerary_item,
    delete_itinerary_item,
    list_itinerary_items,
    reorder_itinerary_items,
    update_itinerary_item,
)
from traveltogether.trips.legs_service import (
    LegHasFareError,
    create_leg,
    delete_leg,
    list_legs,
    sync_legs_from_stops,
    update_leg,
)
from traveltogether.trips.members_service import (
    InvitationNotForUser,
    LastOrganizerError,
    MemberAlreadyExists,
    accept_invitation,
    add_member_by_email,
    decline_invitation,
    get_network_suggestions,
    list_pending_invitations_for_user,
    list_trip_members,
    promote_or_demote_member,
    remove_member_from_trip,
)
from traveltogether.trips.models import (
    ActivityItemPublic,
    Invitation,
    InviteForUserPublic,
    ItineraryItem,
    ItineraryItemCreate,
    ItineraryItemPublic,
    ItineraryItemUpdate,
    Leg,
    LegCreate,
    LegPublic,
    LegUpdate,
    Membership,
    MembershipPublic,
    MembershipRole,
    PendingActionPublic,
    PendingInvitePublic,
    ReorderItineraryItemsRequest,
    Stop,
    StopCreate,
    StopPublic,
    StopUpdate,
    Trip,
    TripCreate,
    TripPublic,
    TripUpdate,
)
from traveltogether.trips.service import (
    TripPeriodError,
    create_trip,
    get_trip_membership,
    list_pending_actions,
    list_user_trip_summaries,
    update_trip,
)
from traveltogether.trips.stops_service import (
    StopDateError,
    create_stop,
    delete_stop,
    list_stops,
    reorder_stops,
    update_stop,
)

router = APIRouter(prefix="/trips", tags=["trips"])
me_router = APIRouter(tags=["trips"])


@me_router.get("/me/activity", response_model=list[ActivityItemPublic])
def get_my_activity(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    limit: int = 20,
) -> list[ActivityItemPublic]:
    """Atividade recente do grupo — alimenta o painel (#71)."""
    return list_recent_activity(session, current_user.id, limit=limit)


@me_router.get("/me/pending-actions", response_model=list[PendingActionPublic])
def get_my_pending_actions(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[PendingActionPublic]:
    """Pendências derivadas cross-Viagem — alimenta 'O que precisa de mim' (#58)."""
    return list_pending_actions(session, current_user.id)


# ── convites do usuário (aceite explícito — ADR-0015) ───────────────────────


def _get_invitation_for_user_or_404(
    session: Session, invitation_id: uuid.UUID, user: User
) -> Invitation:
    inv = session.get(Invitation, invitation_id)
    if inv is None or inv.email != user.email:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="invitation not found")
    return inv


@me_router.get("/me/invitations", response_model=list[InviteForUserPublic])
def get_my_invitations(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[InviteForUserPublic]:
    """Convites pendentes endereçados ao Usuário (ADR-0015)."""
    return [
        InviteForUserPublic(
            id=inv.id,
            trip_id=inv.trip_id,
            trip_name=trip_name,
            email=inv.email,
            role=inv.role,
            created_at=inv.created_at,
        )
        for inv, trip_name in list_pending_invitations_for_user(session, current_user)
    ]


@me_router.post("/me/invitations/{invitation_id}/accept", response_model=MembershipPublic)
def post_accept_invitation(
    invitation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> MembershipPublic:
    """Aceita o Convite e materializa a `Membership` (idempotente)."""
    invitation = _get_invitation_for_user_or_404(session, invitation_id, current_user)
    try:
        membership = accept_invitation(session, invitation, current_user)
    except InvitationNotForUser as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    return MembershipPublic.model_validate(membership)


@me_router.post("/me/invitations/{invitation_id}/decline", status_code=status.HTTP_204_NO_CONTENT)
def post_decline_invitation(
    invitation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> None:
    """Recusa o Convite (idempotente); não cria Membership."""
    invitation = _get_invitation_for_user_or_404(session, invitation_id, current_user)
    try:
        decline_invitation(session, invitation, current_user)
    except InvitationNotForUser as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


class TripWithMembershipResponse(BaseModel):
    trip: TripPublic
    membership: MembershipPublic


class TripSummaryResponse(BaseModel):
    trip: TripPublic
    membership: MembershipPublic
    stops: list[StopPublic]
    cover_image_url: str | None = None


def _get_trip_or_404(session: Session, trip_id: uuid.UUID) -> Trip:
    trip = session.get(Trip, trip_id)
    if trip is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="trip not found")
    return trip


def _require_membership(session: Session, trip_id: uuid.UUID, user_id: uuid.UUID) -> Membership:
    membership = get_trip_membership(session, trip_id, user_id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not a member")
    return membership


@router.post("", status_code=status.HTTP_201_CREATED, response_model=TripWithMembershipResponse)
def post_trip(
    body: TripCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> TripWithMembershipResponse:
    try:
        trip, membership = create_trip(
            session,
            creator_id=current_user.id,
            name=body.name,
            description=body.description,
            origin=body.origin,
            airport_code=body.airport_code,
            latitude=body.latitude,
            longitude=body.longitude,
            start_date=body.start_date,
            end_date=body.end_date,
        )
    except TripPeriodError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        ) from exc
    return TripWithMembershipResponse(
        trip=TripPublic.model_validate(trip),
        membership=MembershipPublic.model_validate(membership),
    )


@router.get("", response_model=list[TripSummaryResponse])
def get_trips(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[TripSummaryResponse]:
    rows = list_user_trip_summaries(session, current_user.id)
    return [
        TripSummaryResponse(
            trip=TripPublic.model_validate(trip),
            membership=MembershipPublic.model_validate(membership),
            stops=[StopPublic.model_validate(stop) for stop in stops],
            cover_image_url=trip.cover_image_url,
        )
        for trip, membership, stops in rows
    ]


@router.get("/{trip_id}", response_model=TripWithMembershipResponse)
def get_trip(
    trip_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> TripWithMembershipResponse:
    trip = _get_trip_or_404(session, trip_id)
    membership = _require_membership(session, trip_id, current_user.id)
    return TripWithMembershipResponse(
        trip=TripPublic.model_validate(trip),
        membership=MembershipPublic.model_validate(membership),
    )


@router.patch("/{trip_id}", response_model=TripPublic)
def patch_trip(
    trip_id: uuid.UUID,
    body: TripUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> TripPublic:
    trip = _get_trip_or_404(session, trip_id)
    membership = _require_membership(session, trip_id, current_user.id)

    if membership.role != MembershipRole.organizer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="only organizers can edit trip metadata",
        )

    try:
        updated = update_trip(
            session,
            trip,
            body.name,
            body.description,
            body.origin,
            airport_code=body.airport_code,
            latitude=body.latitude,
            longitude=body.longitude,
            start_date=body.start_date,
            end_date=body.end_date,
        )
    except TripPeriodError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        ) from exc
    return TripPublic.model_validate(updated)


# ── member management ─────────────────────────────────────────────────────────


class AddMemberRequest(BaseModel):
    email: str


class AddMemberResponse(BaseModel):
    # ADR-0015: adicionar por e-mail sempre cria um Convite pendente; `pending`
    # fica True e `membership` nulo até a pessoa aceitar. `existing_user` traz o
    # preview de quem já tem conta.
    pending: bool
    membership: MembershipPublic | None = None
    pending_membership: PendingInvitePublic | None = None
    existing_user: UserPublic | None = None


class NetworkSuggestionItem(BaseModel):
    email: str
    display_name: str | None = None
    avatar_url: str | None = None


class NetworkSuggestionsResponse(BaseModel):
    suggestions: list[NetworkSuggestionItem]


class MemberWithUser(BaseModel):
    membership: MembershipPublic
    email: str
    display_name: str | None = None
    avatar_url: str | None = None


class MembersListResponse(BaseModel):
    members: list[MemberWithUser]
    pending: list[PendingInvitePublic]


def _invitation_to_pending(inv: Invitation) -> PendingInvitePublic:
    return PendingInvitePublic(
        id=inv.id,
        trip_id=inv.trip_id,
        email=inv.email,
        role=inv.role,
        invited_at=inv.created_at,
    )


class UpdateMemberRequest(BaseModel):
    role: MembershipRole


def _require_organizer(membership: Membership) -> None:
    if membership.role != MembershipRole.organizer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="only organizers can manage members",
        )


def _get_membership_or_404(
    session: Session, trip_id: uuid.UUID, membership_id: uuid.UUID
) -> Membership:
    m = session.get(Membership, membership_id)
    if m is None or m.trip_id != trip_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="membership not found")
    return m


@router.post(
    "/{trip_id}/members",
    status_code=status.HTTP_201_CREATED,
    response_model=AddMemberResponse,
)
def post_member(
    trip_id: uuid.UUID,
    body: AddMemberRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> AddMemberResponse:
    trip = _get_trip_or_404(session, trip_id)
    membership = _require_membership(session, trip_id, current_user.id)
    _require_organizer(membership)

    try:
        result = add_member_by_email(
            session,
            trip_id,
            body.email,
            inviter_name=current_user.display_name,
            trip_name=trip.name,
        )
    except MemberAlreadyExists as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return AddMemberResponse(
        pending=True,
        membership=None,
        pending_membership=_invitation_to_pending(result.invitation),
        existing_user=(
            UserPublic.model_validate(result.existing_user) if result.existing_user else None
        ),
    )


@router.get("/{trip_id}/members", response_model=MembersListResponse)
def get_members(
    trip_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> MembersListResponse:
    _get_trip_or_404(session, trip_id)
    _require_membership(session, trip_id, current_user.id)

    active, pending = list_trip_members(session, trip_id)
    return MembersListResponse(
        members=[
            MemberWithUser(
                membership=MembershipPublic.model_validate(m),
                email=user.email,
                display_name=user.display_name,
                avatar_url=user.avatar_url,
            )
            for m, user in active
        ],
        pending=[_invitation_to_pending(p) for p in pending],
    )


@router.get("/{trip_id}/members/suggestions", response_model=NetworkSuggestionsResponse)
def get_member_suggestions(
    trip_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
    q: str = "",
) -> NetworkSuggestionsResponse:
    _get_trip_or_404(session, trip_id)
    _require_membership(session, trip_id, current_user.id)

    suggestions = get_network_suggestions(session, current_user, trip_id, q=q)
    return NetworkSuggestionsResponse(
        suggestions=[
            NetworkSuggestionItem(
                email=u.email,
                display_name=u.display_name,
                avatar_url=u.avatar_url,
            )
            for u in suggestions
        ]
    )


@router.patch("/{trip_id}/members/{membership_id}", response_model=MembershipPublic)
def patch_member(
    trip_id: uuid.UUID,
    membership_id: uuid.UUID,
    body: UpdateMemberRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> MembershipPublic:
    _get_trip_or_404(session, trip_id)
    caller_membership = _require_membership(session, trip_id, current_user.id)
    _require_organizer(caller_membership)

    target = _get_membership_or_404(session, trip_id, membership_id)

    try:
        updated = promote_or_demote_member(session, target, body.role)
    except LastOrganizerError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return MembershipPublic.model_validate(updated)


@router.delete("/{trip_id}/members/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(
    trip_id: uuid.UUID,
    membership_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    _get_trip_or_404(session, trip_id)
    caller_membership = _require_membership(session, trip_id, current_user.id)
    _require_organizer(caller_membership)

    target = _get_membership_or_404(session, trip_id, membership_id)

    try:
        remove_member_from_trip(session, target)
    except LastOrganizerError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── stops ─────────────────────────────────────────────────────────────────────


class ReorderStopsRequest(BaseModel):
    stop_ids: list[uuid.UUID]


def _get_stop_or_404(session: Session, trip_id: uuid.UUID, stop_id: uuid.UUID) -> Stop:
    stop = session.get(Stop, stop_id)
    if stop is None or stop.trip_id != trip_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="stop not found")
    return stop


@router.post(
    "/{trip_id}/stops",
    status_code=status.HTTP_201_CREATED,
    response_model=StopPublic,
)
def post_stop(
    trip_id: uuid.UUID,
    body: StopCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> StopPublic:
    trip = _get_trip_or_404(session, trip_id)
    membership = _require_membership(session, trip_id, current_user.id)
    if membership.role != MembershipRole.organizer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="only organizers can manage stops",
        )
    try:
        stop = create_stop(
            session,
            trip_id,
            body.city,
            body.arrival_date,
            body.departure_date,
            airport_code=body.airport_code,
            latitude=body.latitude,
            longitude=body.longitude,
            commit=False,
        )
        sync_legs_from_stops(session, trip, commit=False)
        session.commit()
        session.refresh(stop)
    except StopDateError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        ) from exc
    except LegHasFareError as exc:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return StopPublic.model_validate(stop)


@router.get("/{trip_id}/stops", response_model=list[StopPublic])
def get_stops(
    trip_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[StopPublic]:
    _get_trip_or_404(session, trip_id)
    _require_membership(session, trip_id, current_user.id)
    return [StopPublic.model_validate(s) for s in list_stops(session, trip_id)]


@router.patch("/{trip_id}/stops", response_model=list[StopPublic])
def patch_stops_reorder(
    trip_id: uuid.UUID,
    body: ReorderStopsRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[StopPublic]:
    trip = _get_trip_or_404(session, trip_id)
    membership = _require_membership(session, trip_id, current_user.id)
    if membership.role != MembershipRole.organizer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="only organizers can reorder stops",
        )
    reorder_stops(session, trip_id, body.stop_ids, commit=False)
    try:
        sync_legs_from_stops(session, trip, commit=False)
        session.commit()
    except LegHasFareError as exc:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return [StopPublic.model_validate(s) for s in list_stops(session, trip_id)]


@router.patch("/{trip_id}/stops/{stop_id}", response_model=StopPublic)
def patch_stop(
    trip_id: uuid.UUID,
    stop_id: uuid.UUID,
    body: StopUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> StopPublic:
    _get_trip_or_404(session, trip_id)
    membership = _require_membership(session, trip_id, current_user.id)
    if membership.role != MembershipRole.organizer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="only organizers can edit stops",
        )
    stop = _get_stop_or_404(session, trip_id, stop_id)
    try:
        updated = update_stop(
            session,
            stop,
            body.city,
            airport_code=body.airport_code,
            arrival_date=body.arrival_date,
            departure_date=body.departure_date,
            latitude=body.latitude,
            longitude=body.longitude,
        )
    except StopDateError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)
        ) from exc
    return StopPublic.model_validate(updated)


@router.delete("/{trip_id}/stops/{stop_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stop_route(
    trip_id: uuid.UUID,
    stop_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    trip = _get_trip_or_404(session, trip_id)
    membership = _require_membership(session, trip_id, current_user.id)
    if membership.role != MembershipRole.organizer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="only organizers can delete stops",
        )
    stop = _get_stop_or_404(session, trip_id, stop_id)
    remaining_stops = [s for s in list_stops(session, trip_id) if s.id != stop.id]
    try:
        sync_legs_from_stops(session, trip, stops=remaining_stops, commit=False)
        delete_stop(session, stop, commit=False)
        session.commit()
    except LegHasFareError as exc:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ── legs ──────────────────────────────────────────────────────────────────────


def _get_leg_or_404(session: Session, trip_id: uuid.UUID, leg_id: uuid.UUID) -> Leg:
    leg = session.get(Leg, leg_id)
    if leg is None or leg.trip_id != trip_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="leg not found")
    return leg


@router.post(
    "/{trip_id}/legs",
    status_code=status.HTTP_201_CREATED,
    response_model=LegPublic,
)
def post_leg(
    trip_id: uuid.UUID,
    body: LegCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> LegPublic:
    _get_trip_or_404(session, trip_id)
    membership = _require_membership(session, trip_id, current_user.id)
    if membership.role != MembershipRole.organizer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="only organizers can manage legs",
        )
    leg = create_leg(
        session,
        trip_id,
        body.origin_stop_id,
        body.destination_stop_id,
        body.target_date,
    )
    return LegPublic.model_validate(leg)


@router.get("/{trip_id}/legs", response_model=list[LegPublic])
def get_legs(
    trip_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[LegPublic]:
    _get_trip_or_404(session, trip_id)
    _require_membership(session, trip_id, current_user.id)
    return [LegPublic.model_validate(leg) for leg in list_legs(session, trip_id)]


@router.patch("/{trip_id}/legs/{leg_id}", response_model=LegPublic)
def patch_leg(
    trip_id: uuid.UUID,
    leg_id: uuid.UUID,
    body: LegUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> LegPublic:
    _get_trip_or_404(session, trip_id)
    membership = _require_membership(session, trip_id, current_user.id)
    if membership.role != MembershipRole.organizer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="only organizers can edit legs",
        )
    leg = _get_leg_or_404(session, trip_id, leg_id)
    updated = update_leg(
        session,
        leg,
        body.origin_stop_id,
        body.destination_stop_id,
        body.target_date,
    )
    return LegPublic.model_validate(updated)


@router.delete("/{trip_id}/legs/{leg_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_leg_route(
    trip_id: uuid.UUID,
    leg_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    _get_trip_or_404(session, trip_id)
    membership = _require_membership(session, trip_id, current_user.id)
    if membership.role != MembershipRole.organizer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="only organizers can delete legs",
        )
    leg = _get_leg_or_404(session, trip_id, leg_id)
    delete_leg(session, leg)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Itinerary (Roteiro) ---


def _get_itinerary_item_or_404(
    session: Session, stop_id: uuid.UUID, item_id: uuid.UUID
) -> ItineraryItem:
    item = session.get(ItineraryItem, item_id)
    if item is None or item.stop_id != stop_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="itinerary item not found"
        )
    return item


@router.get(
    "/{trip_id}/stops/{stop_id}/itinerary",
    response_model=list[ItineraryItemPublic],
)
def get_itinerary(
    trip_id: uuid.UUID,
    stop_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[ItineraryItemPublic]:
    _get_trip_or_404(session, trip_id)
    _require_membership(session, trip_id, current_user.id)
    _get_stop_or_404(session, trip_id, stop_id)
    return [ItineraryItemPublic.model_validate(i) for i in list_itinerary_items(session, stop_id)]


@router.post(
    "/{trip_id}/stops/{stop_id}/itinerary",
    status_code=status.HTTP_201_CREATED,
    response_model=ItineraryItemPublic,
)
def post_itinerary_item(
    trip_id: uuid.UUID,
    stop_id: uuid.UUID,
    body: ItineraryItemCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> ItineraryItemPublic:
    _get_trip_or_404(session, trip_id)
    membership = _require_membership(session, trip_id, current_user.id)
    if membership.role != MembershipRole.organizer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="only organizers can add itinerary items",
        )
    _get_stop_or_404(session, trip_id, stop_id)
    item = create_itinerary_item(
        session, stop_id, body.title, body.notes, body.link, body.day, body.time
    )
    return ItineraryItemPublic.model_validate(item)


@router.patch(
    "/{trip_id}/stops/{stop_id}/itinerary/{item_id}",
    response_model=ItineraryItemPublic,
)
def patch_itinerary_item(
    trip_id: uuid.UUID,
    stop_id: uuid.UUID,
    item_id: uuid.UUID,
    body: ItineraryItemUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> ItineraryItemPublic:
    _get_trip_or_404(session, trip_id)
    membership = _require_membership(session, trip_id, current_user.id)
    if membership.role != MembershipRole.organizer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="only organizers can edit itinerary items",
        )
    _get_stop_or_404(session, trip_id, stop_id)
    item = _get_itinerary_item_or_404(session, stop_id, item_id)
    updated = update_itinerary_item(
        session, item, body.title, body.notes, body.link, body.day, body.time
    )
    return ItineraryItemPublic.model_validate(updated)


@router.delete(
    "/{trip_id}/stops/{stop_id}/itinerary/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_itinerary_item_route(
    trip_id: uuid.UUID,
    stop_id: uuid.UUID,
    item_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    _get_trip_or_404(session, trip_id)
    membership = _require_membership(session, trip_id, current_user.id)
    if membership.role != MembershipRole.organizer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="only organizers can delete itinerary items",
        )
    _get_stop_or_404(session, trip_id, stop_id)
    item = _get_itinerary_item_or_404(session, stop_id, item_id)
    delete_itinerary_item(session, item)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{trip_id}/stops/{stop_id}/itinerary/reorder",
    response_model=list[ItineraryItemPublic],
)
def post_itinerary_reorder(
    trip_id: uuid.UUID,
    stop_id: uuid.UUID,
    body: ReorderItineraryItemsRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[ItineraryItemPublic]:
    _get_trip_or_404(session, trip_id)
    membership = _require_membership(session, trip_id, current_user.id)
    if membership.role != MembershipRole.organizer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="only organizers can reorder itinerary items",
        )
    _get_stop_or_404(session, trip_id, stop_id)
    reorder_itinerary_items(session, stop_id, body.item_ids)
    return [ItineraryItemPublic.model_validate(i) for i in list_itinerary_items(session, stop_id)]
