"""Rotas HTTP do boundary trips."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlmodel import Session

from traveltogether.identity.deps import get_current_user
from traveltogether.identity.models import User
from traveltogether.platform.db import get_session
from traveltogether.trips.members_service import (
    LastOrganizerError,
    MemberAlreadyExists,
    add_member_by_email,
    list_trip_members,
    promote_or_demote_member,
    remove_member_from_trip,
)
from traveltogether.trips.models import (
    Membership,
    MembershipPublic,
    MembershipRole,
    PendingMembershipPublic,
    Trip,
    TripCreate,
    TripPublic,
    TripUpdate,
)
from traveltogether.trips.service import (
    create_trip,
    get_trip_membership,
    list_user_trips,
    update_trip,
)

router = APIRouter(prefix="/trips", tags=["trips"])


class TripWithMembershipResponse(BaseModel):
    trip: TripPublic
    membership: MembershipPublic


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
    trip, membership = create_trip(
        session,
        creator_id=current_user.id,
        name=body.name,
        description=body.description,
        origin=body.origin,
    )
    return TripWithMembershipResponse(
        trip=TripPublic.model_validate(trip),
        membership=MembershipPublic.model_validate(membership),
    )


@router.get("", response_model=list[TripWithMembershipResponse])
def get_trips(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[TripWithMembershipResponse]:
    rows = list_user_trips(session, current_user.id)
    return [
        TripWithMembershipResponse(
            trip=TripPublic.model_validate(trip),
            membership=MembershipPublic.model_validate(membership),
        )
        for trip, membership in rows
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

    updated = update_trip(session, trip, body.name, body.description, body.origin)
    return TripPublic.model_validate(updated)


# ── member management ─────────────────────────────────────────────────────────


class AddMemberRequest(BaseModel):
    email: str


class AddMemberResponse(BaseModel):
    pending: bool
    membership: MembershipPublic | None = None
    pending_membership: PendingMembershipPublic | None = None


class MemberWithUser(BaseModel):
    membership: MembershipPublic
    email: str


class MembersListResponse(BaseModel):
    members: list[MemberWithUser]
    pending: list[PendingMembershipPublic]


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
    _get_trip_or_404(session, trip_id)
    membership = _require_membership(session, trip_id, current_user.id)
    _require_organizer(membership)

    try:
        result = add_member_by_email(session, trip_id, body.email)
    except MemberAlreadyExists as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return AddMemberResponse(
        pending=result.pending,
        membership=(
            MembershipPublic.model_validate(result.membership) if result.membership else None
        ),
        pending_membership=(
            PendingMembershipPublic.model_validate(result.pending_membership)
            if result.pending_membership
            else None
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
            )
            for m, user in active
        ],
        pending=[PendingMembershipPublic.model_validate(p) for p in pending],
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
