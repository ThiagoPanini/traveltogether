"""Serviço de trajetos (legs) de uma viagem."""

import uuid
from datetime import datetime

from sqlmodel import Session, col, func, select

from traveltogether.trips.models import Leg, Stop


class StopAnchoredError(Exception):
    """Raised when trying to delete a Stop that is referenced by a Leg."""


def _next_order(session: Session, trip_id: uuid.UUID) -> int:
    count = session.exec(
        select(func.count()).select_from(Leg).where(col(Leg.trip_id) == trip_id)
    ).one()
    return count + 1


def create_leg(
    session: Session,
    trip_id: uuid.UUID,
    origin_stop_id: uuid.UUID | None = None,
    destination_stop_id: uuid.UUID | None = None,
    target_date: datetime | None = None,
) -> Leg:
    leg = Leg(
        trip_id=trip_id,
        origin_stop_id=origin_stop_id,
        destination_stop_id=destination_stop_id,
        target_date=target_date,
        order=_next_order(session, trip_id),
    )
    session.add(leg)
    session.commit()
    session.refresh(leg)
    return leg


def list_legs(session: Session, trip_id: uuid.UUID) -> list[Leg]:
    return list(
        session.exec(select(Leg).where(col(Leg.trip_id) == trip_id).order_by(col(Leg.order)))
    )


def update_leg(
    session: Session,
    leg: Leg,
    origin_stop_id: uuid.UUID | None = None,
    destination_stop_id: uuid.UUID | None = None,
    target_date: datetime | None = None,
) -> Leg:
    if origin_stop_id is not None:
        leg.origin_stop_id = origin_stop_id
    if destination_stop_id is not None:
        leg.destination_stop_id = destination_stop_id
    if target_date is not None:
        leg.target_date = target_date
    session.add(leg)
    session.commit()
    session.refresh(leg)
    return leg


def delete_leg(session: Session, leg: Leg) -> None:
    session.delete(leg)
    session.commit()


def check_stop_not_anchored(session: Session, stop: Stop) -> None:
    """Raise StopAnchoredError if any Leg references this stop."""
    anchored = session.exec(
        select(Leg).where(
            (col(Leg.origin_stop_id) == stop.id) | (col(Leg.destination_stop_id) == stop.id)
        )
    ).first()
    if anchored is not None:
        raise StopAnchoredError(
            f"stop {stop.id} is anchored by leg {anchored.id} and cannot be deleted"
        )
