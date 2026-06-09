"""Serviço de paradas (stops) de uma viagem."""

import uuid
from datetime import datetime

from sqlmodel import Session, func, select

from traveltogether.trips.models import Stop


def list_stops(session: Session, trip_id: uuid.UUID) -> list[Stop]:
    return list(session.exec(select(Stop).where(Stop.trip_id == trip_id).order_by(Stop.order)))


def delete_stop(session: Session, stop: Stop) -> None:
    session.delete(stop)
    session.commit()


def reorder_stops(session: Session, trip_id: uuid.UUID, stop_ids: list[uuid.UUID]) -> None:
    stops = {s.id: s for s in list_stops(session, trip_id)}
    for new_order, stop_id in enumerate(stop_ids, start=1):
        stops[stop_id].order = new_order
        session.add(stops[stop_id])
    session.commit()


def update_stop(
    session: Session,
    stop: Stop,
    city: str | None = None,
    arrival_date: datetime | None = None,
    departure_date: datetime | None = None,
) -> Stop:
    if city is not None:
        stop.city = city
    if arrival_date is not None:
        stop.arrival_date = arrival_date
    if departure_date is not None:
        stop.departure_date = departure_date
    session.add(stop)
    session.commit()
    session.refresh(stop)
    return stop


def create_stop(
    session: Session,
    trip_id: uuid.UUID,
    city: str,
    arrival_date: datetime | None = None,
    departure_date: datetime | None = None,
) -> Stop:
    current_count = session.exec(select(func.count(Stop.id)).where(Stop.trip_id == trip_id)).one()
    stop = Stop(
        trip_id=trip_id,
        city=city,
        arrival_date=arrival_date,
        departure_date=departure_date,
        order=current_count + 1,
    )
    session.add(stop)
    session.commit()
    session.refresh(stop)
    return stop
