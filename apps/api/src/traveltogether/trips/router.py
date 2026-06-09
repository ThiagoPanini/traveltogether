"""Rotas HTTP do boundary trips."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session

from traveltogether.identity.deps import get_current_user
from traveltogether.identity.models import User
from traveltogether.platform.db import get_session
from traveltogether.trips.models import (
    Membership,
    MembershipPublic,
    MembershipRole,
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


def _require_membership(
    session: Session, trip_id: uuid.UUID, user_id: uuid.UUID
) -> Membership:
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
