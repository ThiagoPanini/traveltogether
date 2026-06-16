"""Rotas HTTP do boundary budget (Orçamento — ADR-0016).

Leitura do Orçamento agregado e CRUD das linhas `Hospedagem`/`Extra`. Leitura
liberada a qualquer `Membership`; escrita restrita a `Organizador`es
(invariante 19). Sem regra de domínio aqui — só autorização e tradução HTTP.
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session

from traveltogether.budget.models import (
    BudgetSummary,
    Extra,
    ExtraCreate,
    ExtraPublic,
    ExtraUpdate,
    Lodging,
    LodgingCreate,
    LodgingPublic,
    LodgingUpdate,
)
from traveltogether.budget.service import (
    aggregate_budget,
    create_extra,
    create_lodging,
    delete_extra,
    delete_lodging,
    list_extras,
    list_lodgings,
    update_extra,
    update_lodging,
)
from traveltogether.identity.deps import get_current_user
from traveltogether.identity.models import User
from traveltogether.platform.db import get_session
from traveltogether.trips.service import get_trip_membership

router = APIRouter(prefix="/trips", tags=["budget"])


def _require_membership(session: Session, trip_id: uuid.UUID, user_id: uuid.UUID) -> None:
    membership = get_trip_membership(session, trip_id, user_id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not a member")


def _require_organizer(session: Session, trip_id: uuid.UUID, user_id: uuid.UUID) -> None:
    membership = get_trip_membership(session, trip_id, user_id)
    if membership is None or membership.role != "organizer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="organizer required")


def _get_lodging_or_404(session: Session, trip_id: uuid.UUID, lodging_id: uuid.UUID) -> Lodging:
    lodging = session.get(Lodging, lodging_id)
    if lodging is None or lodging.trip_id != trip_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="lodging not found")
    return lodging


def _get_extra_or_404(session: Session, trip_id: uuid.UUID, extra_id: uuid.UUID) -> Extra:
    extra = session.get(Extra, extra_id)
    if extra is None or extra.trip_id != trip_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="extra not found")
    return extra


@router.get("/{trip_id}/budget", response_model=BudgetSummary)
def get_budget(
    trip_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> BudgetSummary:
    _require_membership(session, trip_id, current_user.id)
    return aggregate_budget(session, trip_id)


# --- Hospedagem ------------------------------------------------------------


@router.get("/{trip_id}/lodgings", response_model=list[LodgingPublic])
def get_lodgings(
    trip_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[Lodging]:
    _require_membership(session, trip_id, current_user.id)
    return list_lodgings(session, trip_id)


@router.post(
    "/{trip_id}/lodgings",
    status_code=status.HTTP_201_CREATED,
    response_model=LodgingPublic,
)
def post_lodging(
    trip_id: uuid.UUID,
    body: LodgingCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Lodging:
    _require_organizer(session, trip_id, current_user.id)
    return create_lodging(
        session,
        trip_id=trip_id,
        stop_id=body.stop_id,
        created_by=current_user.id,
        nightly_value=body.nightly_value,
        currency=body.currency,
        basis=body.basis,
        description=body.description,
    )


@router.patch("/{trip_id}/lodgings/{lodging_id}", response_model=LodgingPublic)
def patch_lodging(
    trip_id: uuid.UUID,
    lodging_id: uuid.UUID,
    body: LodgingUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Lodging:
    _require_organizer(session, trip_id, current_user.id)
    lodging = _get_lodging_or_404(session, trip_id, lodging_id)
    return update_lodging(
        session,
        lodging,
        stop_id=body.stop_id,
        description=body.description,
        nightly_value=body.nightly_value,
        currency=body.currency,
        basis=body.basis,
    )


@router.delete("/{trip_id}/lodgings/{lodging_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_lodging(
    trip_id: uuid.UUID,
    lodging_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    _require_organizer(session, trip_id, current_user.id)
    lodging = _get_lodging_or_404(session, trip_id, lodging_id)
    delete_lodging(session, lodging)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Extra -----------------------------------------------------------------


@router.get("/{trip_id}/extras", response_model=list[ExtraPublic])
def get_extras(
    trip_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[Extra]:
    _require_membership(session, trip_id, current_user.id)
    return list_extras(session, trip_id)


@router.post(
    "/{trip_id}/extras",
    status_code=status.HTTP_201_CREATED,
    response_model=ExtraPublic,
)
def post_extra(
    trip_id: uuid.UUID,
    body: ExtraCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Extra:
    _require_organizer(session, trip_id, current_user.id)
    return create_extra(
        session,
        trip_id=trip_id,
        created_by=current_user.id,
        value=body.value,
        currency=body.currency,
        basis=body.basis,
        description=body.description,
    )


@router.patch("/{trip_id}/extras/{extra_id}", response_model=ExtraPublic)
def patch_extra(
    trip_id: uuid.UUID,
    extra_id: uuid.UUID,
    body: ExtraUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Extra:
    _require_organizer(session, trip_id, current_user.id)
    extra = _get_extra_or_404(session, trip_id, extra_id)
    return update_extra(
        session,
        extra,
        description=body.description,
        value=body.value,
        currency=body.currency,
        basis=body.basis,
    )


@router.delete("/{trip_id}/extras/{extra_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_extra(
    trip_id: uuid.UUID,
    extra_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    _require_organizer(session, trip_id, current_user.id)
    extra = _get_extra_or_404(session, trip_id, extra_id)
    delete_extra(session, extra)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
