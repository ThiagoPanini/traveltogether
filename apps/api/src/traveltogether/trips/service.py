"""Lógica de domínio para o boundary trips."""

import uuid
from datetime import date

from sqlmodel import Session, col, select

from traveltogether.trips.models import Membership, MembershipRole, Stop, Trip


class TripPeriodError(ValueError):
    """end_date anterior a start_date."""


def _validate_period(start_date: date | None, end_date: date | None) -> None:
    if start_date and end_date and end_date < start_date:
        raise TripPeriodError("end_date não pode ser anterior a start_date")


def create_trip(
    session: Session,
    creator_id: uuid.UUID,
    name: str,
    description: str,
    origin: str,
    *,
    airport_code: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[Trip, Membership]:
    """Cria uma Viagem e registra o criador como Organizador (invariante 2)."""
    _validate_period(start_date, end_date)
    trip = Trip(
        name=name,
        description=description,
        origin=origin,
        created_by=creator_id,
        airport_code=airport_code.upper() if airport_code else None,
        latitude=latitude,
        longitude=longitude,
        start_date=start_date,
        end_date=end_date,
    )
    session.add(trip)
    session.flush()

    membership = Membership(trip_id=trip.id, user_id=creator_id, role=MembershipRole.organizer)
    session.add(membership)
    session.commit()
    session.refresh(trip)
    session.refresh(membership)
    return trip, membership


def list_user_trips(session: Session, user_id: uuid.UUID) -> list[tuple[Trip, Membership]]:
    """Retorna Viagens em que o usuário tem Membership, junto com o papel."""
    rows = session.exec(
        select(Trip, Membership)
        .join(Membership, Membership.trip_id == Trip.id)  # type: ignore[arg-type]
        .where(Membership.user_id == user_id)
        .order_by(Trip.created_at.desc())  # type: ignore[attr-defined]
    ).all()
    return list(rows)


def list_user_trip_summaries(
    session: Session, user_id: uuid.UUID
) -> list[tuple[Trip, Membership, list[Stop]]]:
    """Retorna Viagens do usuário com Paradas ordenadas para cards de lista."""
    rows = list_user_trips(session, user_id)
    trip_ids = [trip.id for trip, _ in rows]
    stops_by_trip: dict[uuid.UUID, list[Stop]] = {trip_id: [] for trip_id in trip_ids}

    if trip_ids:
        stops = session.exec(
            select(Stop)
            .where(col(Stop.trip_id).in_(trip_ids))
            .order_by(col(Stop.trip_id), col(Stop.order))
        )
        for stop in stops:
            stops_by_trip[stop.trip_id].append(stop)

    return [(trip, membership, stops_by_trip[trip.id]) for trip, membership in rows]


def get_trip_membership(
    session: Session, trip_id: uuid.UUID, user_id: uuid.UUID
) -> Membership | None:
    """Retorna a Membership do usuário na Viagem, ou None se não for membro."""
    return session.exec(
        select(Membership).where(Membership.trip_id == trip_id).where(Membership.user_id == user_id)
    ).first()


def update_trip(
    session: Session,
    trip: Trip,
    name: str | None,
    description: str | None,
    origin: str | None,
    *,
    airport_code: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> Trip:
    """Atualiza metadados da Viagem — chamador garante que é Organizador (invariante 7)."""
    new_start = start_date if start_date is not None else trip.start_date
    new_end = end_date if end_date is not None else trip.end_date
    _validate_period(new_start, new_end)

    if name is not None:
        trip.name = name
    if description is not None:
        trip.description = description
    if origin is not None:
        trip.origin = origin
    if airport_code is not None:
        trip.airport_code = airport_code.upper()
    if latitude is not None:
        trip.latitude = latitude
    if longitude is not None:
        trip.longitude = longitude
    if start_date is not None:
        trip.start_date = start_date
    if end_date is not None:
        trip.end_date = end_date
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return trip
