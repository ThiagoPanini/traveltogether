"""Serviço de trajetos (legs) de uma viagem."""

import uuid
from datetime import datetime

from sqlmodel import Session, col, func, select

from traveltogether.trips.models import Leg, Stop, Trip


class StopAnchoredError(Exception):
    """Raised when trying to delete a Stop that is referenced by a Leg."""


class LegHasFareError(Exception):
    """Raised when sync would delete a Leg that already has FareQuotes."""


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
    from traveltogether.trips.routes_service import ensure_default_route_and_segment

    existing = session.exec(
        select(Leg).where(
            col(Leg.trip_id) == trip_id,
            col(Leg.origin_stop_id) == origin_stop_id,
            col(Leg.destination_stop_id) == destination_stop_id,
        )
    ).first()
    if existing is not None:
        ensure_default_route_and_segment(
            session, existing, created_by=_leg_author(session, trip_id)
        )
        return existing

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
    ensure_default_route_and_segment(session, leg, created_by=_leg_author(session, trip_id))
    return leg


def _leg_author(session: Session, trip_id: uuid.UUID) -> uuid.UUID:
    """Autor da `Rota` "direta" derivada: o criador da `Viagem` (Organizador)."""
    trip = session.get(Trip, trip_id)
    if trip is None:
        raise ValueError(f"trip {trip_id} not found")
    return trip.created_by


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
    from traveltogether.trips.routes_service import delete_routes_for_leg

    delete_routes_for_leg(session, leg.id, commit=False)
    session.delete(leg)
    session.commit()


def check_stop_not_anchored(session: Session, stop: Stop) -> None:
    anchored = session.exec(
        select(Leg).where(
            (col(Leg.origin_stop_id) == stop.id) | (col(Leg.destination_stop_id) == stop.id)
        )
    ).first()
    if anchored is not None:
        raise StopAnchoredError(
            f"stop {stop.id} is anchored by leg {anchored.id} and cannot be deleted"
        )


def sync_legs_from_stops(
    session: Session, trip: Trip, stops: list[Stop] | None = None, *, commit: bool = True
) -> None:
    """Rebuild Legs from the current ordered Stop list.

    Derives N+1 legs for N stops: (None→s1), (s1→s2), ..., (sN→None).
    Raises LegHasFareError if a leg that would be removed has FareQuotes.
    """
    from traveltogether.fares.service import leg_has_fare_quotes
    from traveltogether.trips.routes_service import (
        delete_routes_for_leg,
        ensure_default_route_and_segment,
    )
    from traveltogether.trips.stops_service import list_stops

    if stops is None:
        stops = list_stops(session, trip.id)
    existing_legs = list_legs(session, trip.id)

    # Build desired (origin_id, destination_id) pairs
    if not stops:
        desired: list[tuple[uuid.UUID | None, uuid.UUID | None]] = []
    else:
        desired = [(None, stops[0].id)]
        for i in range(len(stops) - 1):
            desired.append((stops[i].id, stops[i + 1].id))
        desired.append((stops[-1].id, None))

    desired_set = set(desired)
    existing_map = {(leg.origin_stop_id, leg.destination_stop_id): leg for leg in existing_legs}

    # Check legs to remove don't have fares
    to_remove = [leg for key, leg in existing_map.items() if key not in desired_set]
    for leg in to_remove:
        if leg_has_fare_quotes(session, leg.id):
            raise LegHasFareError(f"leg {leg.id} has fares and cannot be removed during sync")

    # Remove obsolete legs (cascade their Rotas/Trechos first)
    for leg in to_remove:
        delete_routes_for_leg(session, leg.id, commit=False)
        session.delete(leg)
    session.flush()

    # Add missing legs
    to_add = [pair for pair in desired if pair not in existing_map]
    for i, (origin_id, dest_id) in enumerate(desired):
        if (origin_id, dest_id) in to_add:
            leg = Leg(
                trip_id=trip.id,
                origin_stop_id=origin_id,
                destination_stop_id=dest_id,
                order=i + 1,
            )
            session.add(leg)

    # Re-number all legs to match desired order
    session.flush()
    current = list_legs(session, trip.id)
    for leg in current:
        pair = (leg.origin_stop_id, leg.destination_stop_id)
        if pair in desired_set:
            leg.order = desired.index(pair) + 1
            session.add(leg)

    # Garante a Rota "direta" + Trecho aéreo de cada Trajeto (esqueleto ADR-0018)
    session.flush()
    for leg in list_legs(session, trip.id):
        ensure_default_route_and_segment(session, leg, created_by=trip.created_by, commit=False)

    if commit:
        session.commit()
    else:
        session.flush()
