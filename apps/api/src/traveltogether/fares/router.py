"""Rotas HTTP do boundary fares."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session

from traveltogether.fares.models import (
    FareQuote,
    FareQuoteCreate,
    FareQuotePublic,
    FareQuoteUpdate,
)
from traveltogether.fares.service import (
    create_fare_quote,
    delete_fare_quote,
    list_fare_quotes,
    update_fare_quote,
)
from traveltogether.identity.deps import get_current_user
from traveltogether.identity.models import User
from traveltogether.platform.db import get_session
from traveltogether.trips.models import Leg
from traveltogether.trips.service import get_trip_membership

router = APIRouter(prefix="/legs", tags=["fares"])


def _get_leg_or_404(session: Session, leg_id: uuid.UUID) -> Leg:
    leg = session.get(Leg, leg_id)
    if leg is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="leg not found")
    return leg


def _require_trip_membership(session: Session, leg: Leg, user_id: uuid.UUID) -> None:
    membership = get_trip_membership(session, leg.trip_id, user_id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not a member")


def _get_fare_or_404(session: Session, leg_id: uuid.UUID, fare_id: uuid.UUID) -> FareQuote:
    fare = session.get(FareQuote, fare_id)
    if fare is None or fare.leg_id != leg_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="fare not found")
    return fare


@router.post(
    "/{leg_id}/fares",
    status_code=status.HTTP_201_CREATED,
    response_model=FareQuotePublic,
)
def post_fare(
    leg_id: uuid.UUID,
    body: FareQuoteCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> FareQuotePublic:
    leg = _get_leg_or_404(session, leg_id)
    _require_trip_membership(session, leg, current_user.id)
    fare = create_fare_quote(
        session=session,
        leg_id=leg_id,
        registered_by=current_user.id,
        value=body.value,
        currency=body.currency,
        flight_date=body.flight_date,
        duration_minutes=body.duration_minutes,
        stops=body.stops,
        checked_baggage=body.checked_baggage,
        origin_airport=body.origin_airport,
        destination_airport=body.destination_airport,
        airline=body.airline,
        link=body.link,
        notes=body.notes,
    )
    return FareQuotePublic.model_validate(fare)


@router.get("/{leg_id}/fares", response_model=list[FareQuotePublic])
def get_fares(
    leg_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[FareQuotePublic]:
    leg = _get_leg_or_404(session, leg_id)
    _require_trip_membership(session, leg, current_user.id)
    return [FareQuotePublic.model_validate(f) for f in list_fare_quotes(session, leg_id)]


@router.patch("/{leg_id}/fares/{fare_id}", response_model=FareQuotePublic)
def patch_fare(
    leg_id: uuid.UUID,
    fare_id: uuid.UUID,
    body: FareQuoteUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> FareQuotePublic:
    leg = _get_leg_or_404(session, leg_id)
    _require_trip_membership(session, leg, current_user.id)
    fare = _get_fare_or_404(session, leg_id, fare_id)
    updated = update_fare_quote(
        session=session,
        fare=fare,
        value=body.value,
        currency=body.currency,
        flight_date=body.flight_date,
        duration_minutes=body.duration_minutes,
        stops=body.stops,
        checked_baggage=body.checked_baggage,
        origin_airport=body.origin_airport,
        destination_airport=body.destination_airport,
        airline=body.airline,
        link=body.link,
        notes=body.notes,
    )
    return FareQuotePublic.model_validate(updated)


@router.delete("/{leg_id}/fares/{fare_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fare(
    leg_id: uuid.UUID,
    fare_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    leg = _get_leg_or_404(session, leg_id)
    _require_trip_membership(session, leg, current_user.id)
    fare = _get_fare_or_404(session, leg_id, fare_id)
    delete_fare_quote(session, fare)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
