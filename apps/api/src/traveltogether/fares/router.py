"""Rotas HTTP do boundary fares."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlmodel import Session

from traveltogether.fares.models import (
    FareMarker,
    FareQuote,
    FareQuoteCreate,
    FareQuotePublic,
    FareQuoteUpdate,
    FareQuoteWithVote,
)
from traveltogether.fares.preferences_service import (
    PreferenceError,
    fare_marker_ids,
    toggle_preference,
    toggle_purchased,
    user_prefers_fare,
    user_purchased_fare,
)
from traveltogether.fares.service import (
    create_fare_quote,
    delete_fare_quote,
    fare_leg_id,
    fare_to_public,
    list_fare_quotes,
    update_fare_quote,
)
from traveltogether.fares.upvotes_service import (
    get_upvote_count,
    toggle_upvote,
    user_has_upvoted,
)
from traveltogether.identity.deps import get_current_user
from traveltogether.identity.models import User
from traveltogether.identity.service import get_users_by_ids
from traveltogether.platform.db import get_session
from traveltogether.trips.models import Leg
from traveltogether.trips.service import get_trip_membership

router = APIRouter(prefix="/legs", tags=["fares"])
upvote_router = APIRouter(prefix="/fares", tags=["fares"])


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
    if fare is None or fare_leg_id(session, fare_id) != leg_id:
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
        points=body.points,
        loyalty_program=body.loyalty_program,
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
    return fare_to_public(session, fare)


@router.get("/{leg_id}/fares", response_model=list[FareQuoteWithVote])
def get_fares(
    leg_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[FareQuoteWithVote]:
    leg = _get_leg_or_404(session, leg_id)
    _require_trip_membership(session, leg, current_user.id)
    fares = list_fare_quotes(session, leg_id)
    marker_ids: list[uuid.UUID] = []
    fare_markers: dict[uuid.UUID, tuple[list[uuid.UUID], list[uuid.UUID]]] = {}
    for f in fares:
        preferred, purchased = fare_marker_ids(session, f.id)
        fare_markers[f.id] = (preferred, purchased)
        marker_ids.extend(preferred)
    people = get_users_by_ids(session, [f.registered_by for f in fares] + marker_ids)

    def _markers(ids: list[uuid.UUID]) -> list[FareMarker]:
        return [
            FareMarker(
                user_id=uid,
                display_name=(u.display_name if (u := people.get(uid)) else None),
                avatar_url=(people[uid].avatar_url if uid in people else None),
            )
            for uid in ids
        ]

    return [
        FareQuoteWithVote(
            **fare_to_public(session, f).model_dump(),
            upvote_count=get_upvote_count(session, f.id),
            user_voted=user_has_upvoted(session, f.id, current_user.id),
            registered_by_display_name=(
                author.display_name if (author := people.get(f.registered_by)) else None
            ),
            registered_by_avatar_url=(
                people[f.registered_by].avatar_url if f.registered_by in people else None
            ),
            user_preferred=user_prefers_fare(session, f.id, current_user.id),
            user_purchased=user_purchased_fare(session, f.id, current_user.id),
            preferred_by=_markers(fare_markers[f.id][0]),
            purchased_by=_markers(fare_markers[f.id][1]),
        )
        for f in fares
    ]


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
        points=body.points,
        loyalty_program=body.loyalty_program,
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
    return fare_to_public(session, updated)


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


class DecisionResponse(BaseModel):
    fare_id: uuid.UUID
    user_preferred: bool
    user_purchased: bool


@router.post("/{leg_id}/fares/{fare_id}/prefer", response_model=DecisionResponse)
def post_prefer(
    leg_id: uuid.UUID,
    fare_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> DecisionResponse:
    """Marca/desmarca a `Pesquisa` como `Preferida` do próprio usuário (invariante 13)."""
    leg = _get_leg_or_404(session, leg_id)
    _require_trip_membership(session, leg, current_user.id)
    _get_fare_or_404(session, leg_id, fare_id)
    preferred = toggle_preference(session, fare_id, current_user.id)
    return DecisionResponse(
        fare_id=fare_id,
        user_preferred=preferred,
        user_purchased=user_purchased_fare(session, fare_id, current_user.id),
    )


@router.post("/{leg_id}/fares/{fare_id}/purchase", response_model=DecisionResponse)
def post_purchase(
    leg_id: uuid.UUID,
    fare_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> DecisionResponse:
    """Marca/desmarca a `Comprada` do próprio usuário (exige `Preferida` antes)."""
    leg = _get_leg_or_404(session, leg_id)
    _require_trip_membership(session, leg, current_user.id)
    _get_fare_or_404(session, leg_id, fare_id)
    try:
        purchased = toggle_purchased(session, fare_id, current_user.id)
    except PreferenceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return DecisionResponse(
        fare_id=fare_id,
        user_preferred=user_prefers_fare(session, fare_id, current_user.id),
        user_purchased=purchased,
    )


# ── upvotes ───────────────────────────────────────────────────────────────────


class UpvoteResponse(BaseModel):
    count: int
    voted: bool


def _get_fare_by_id_or_404(session: Session, fare_id: uuid.UUID) -> FareQuote:
    fare = session.get(FareQuote, fare_id)
    if fare is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="fare not found")
    return fare


def _require_fare_membership(session: Session, fare: FareQuote, user_id: uuid.UUID) -> None:
    leg_id = fare_leg_id(session, fare.id)
    leg = session.get(Leg, leg_id) if leg_id is not None else None
    if leg is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="leg not found")
    membership = get_trip_membership(session, leg.trip_id, user_id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not a member")


@upvote_router.post("/{fare_id}/upvote", response_model=UpvoteResponse)
def post_upvote(
    fare_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> UpvoteResponse:
    fare = _get_fare_by_id_or_404(session, fare_id)
    _require_fare_membership(session, fare, current_user.id)
    count, voted = toggle_upvote(session, fare_id, current_user.id)
    return UpvoteResponse(count=count, voted=voted)


@upvote_router.get("/{fare_id}/upvote", response_model=UpvoteResponse)
def get_upvote(
    fare_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> UpvoteResponse:
    fare = _get_fare_by_id_or_404(session, fare_id)
    _require_fare_membership(session, fare, current_user.id)
    count = get_upvote_count(session, fare_id)
    voted = user_has_upvoted(session, fare_id, current_user.id)
    return UpvoteResponse(count=count, voted=voted)
