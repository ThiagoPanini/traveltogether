"""Serviço de paradas (stops) de uma viagem."""

import uuid
from datetime import datetime

from sqlmodel import Session, col, func, select

from traveltogether.trips.models import Stop, Trip


class StopDateError(ValueError):
    """Datas de Parada inválidas (fora do Período ou saída anterior a chegada)."""


def _validate_stop_dates(
    trip: Trip,
    arrival_date: datetime | None,
    departure_date: datetime | None,
) -> None:
    if arrival_date and departure_date and departure_date < arrival_date:
        raise StopDateError("departure_date não pode ser anterior a arrival_date")

    if trip.start_date and arrival_date:
        arrival_naive = arrival_date.replace(tzinfo=None)
        if arrival_naive.date() < trip.start_date:
            raise StopDateError("arrival_date fora do Período da Viagem")

    if trip.end_date and departure_date:
        departure_naive = departure_date.replace(tzinfo=None)
        if departure_naive.date() > trip.end_date:
            raise StopDateError("departure_date fora do Período da Viagem")


def list_stops(session: Session, trip_id: uuid.UUID) -> list[Stop]:
    return list(
        session.exec(select(Stop).where(col(Stop.trip_id) == trip_id).order_by(col(Stop.order)))
    )


def delete_stop(session: Session, stop: Stop, *, commit: bool = True) -> None:
    session.delete(stop)
    if commit:
        session.commit()


def reorder_stops(
    session: Session, trip_id: uuid.UUID, stop_ids: list[uuid.UUID], *, commit: bool = True
) -> None:
    stops = {s.id: s for s in list_stops(session, trip_id)}
    for new_order, stop_id in enumerate(stop_ids, start=1):
        stops[stop_id].order = new_order
        session.add(stops[stop_id])
    if commit:
        session.commit()


def update_stop(
    session: Session,
    stop: Stop,
    city: str | None = None,
    airport_code: str | None = None,
    arrival_date: datetime | None = None,
    departure_date: datetime | None = None,
    *,
    latitude: float | None = None,
    longitude: float | None = None,
) -> Stop:
    trip = session.get(Trip, stop.trip_id)
    new_arrival = arrival_date if arrival_date is not None else stop.arrival_date
    new_departure = departure_date if departure_date is not None else stop.departure_date
    if trip:
        _validate_stop_dates(trip, new_arrival, new_departure)

    if city is not None:
        stop.city = city
    if airport_code is not None:
        stop.airport_code = airport_code.upper()
    if latitude is not None:
        stop.latitude = latitude
    if longitude is not None:
        stop.longitude = longitude
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
    *,
    airport_code: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    commit: bool = True,
) -> Stop:
    trip = session.get(Trip, trip_id)
    if trip:
        _validate_stop_dates(trip, arrival_date, departure_date)

    current_count = session.exec(
        select(func.count()).select_from(Stop).where(col(Stop.trip_id) == trip_id)
    ).one()
    stop = Stop(
        trip_id=trip_id,
        city=city,
        airport_code=airport_code.upper() if airport_code else None,
        latitude=latitude,
        longitude=longitude,
        arrival_date=arrival_date,
        departure_date=departure_date,
        order=current_count + 1,
    )
    session.add(stop)
    if commit:
        session.commit()
        session.refresh(stop)
    else:
        session.flush()
    return stop
