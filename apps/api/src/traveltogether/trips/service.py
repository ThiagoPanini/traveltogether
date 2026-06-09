"""Lógica de domínio para o boundary trips."""

import uuid

from sqlmodel import Session, select

from traveltogether.trips.models import Membership, MembershipRole, Trip


def create_trip(
    session: Session,
    creator_id: uuid.UUID,
    name: str,
    description: str,
    origin: str,
) -> tuple[Trip, Membership]:
    """Cria uma Viagem e registra o criador como Organizador (invariante 2)."""
    trip = Trip(name=name, description=description, origin=origin, created_by=creator_id)
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


def get_trip_membership(
    session: Session, trip_id: uuid.UUID, user_id: uuid.UUID
) -> Membership | None:
    """Retorna a Membership do usuário na Viagem, ou None se não for membro."""
    return session.exec(
        select(Membership)
        .where(Membership.trip_id == trip_id)
        .where(Membership.user_id == user_id)
    ).first()


def update_trip(
    session: Session,
    trip: Trip,
    name: str | None,
    description: str | None,
    origin: str | None,
) -> Trip:
    """Atualiza metadados da Viagem — chamador garante que é Organizador (invariante 7)."""
    if name is not None:
        trip.name = name
    if description is not None:
        trip.description = description
    if origin is not None:
        trip.origin = origin
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return trip
