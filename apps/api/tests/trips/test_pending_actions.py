"""Testes de trips.service.list_pending_actions (painel #58)."""

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.fares.chosen_service import mark_chosen
from traveltogether.fares.service import create_fare_quote
from traveltogether.identity.models import User
from traveltogether.trips.itinerary_service import create_itinerary_item
from traveltogether.trips.legs_service import create_leg
from traveltogether.trips.models import PendingActionKind
from traveltogether.trips.service import create_trip, list_pending_actions
from traveltogether.trips.stops_service import create_stop


@pytest.fixture(name="session")
def session_fixture() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="user")
def user_fixture(session: Session) -> User:
    user = User(id=uuid.uuid4(), email="alice@example.com")
    session.add(user)
    session.commit()
    return user


def _fare(session: Session, user: User, leg_id: uuid.UUID) -> uuid.UUID:
    fare = create_fare_quote(
        session=session,
        leg_id=leg_id,
        registered_by=user.id,
        value=Decimal("1500.00"),
        currency="BRL",
        flight_date=datetime(2026, 9, 1, tzinfo=UTC),
        duration_minutes=600,
        origin_airport="GRU",
        destination_airport="LIS",
        airline="LATAM",
    )
    return fare.id


def test_no_trips_no_pendencias(session: Session, user: User) -> None:
    assert list_pending_actions(session, user.id) == []


def test_leg_without_fare_is_pendencia(session: Session, user: User) -> None:
    trip, _ = create_trip(session, user.id, "Eurotrip", "", "São Paulo")
    leg = create_leg(session, trip.id)
    actions = list_pending_actions(session, user.id)
    kinds = [a.kind for a in actions]
    assert PendingActionKind.leg_without_fare in kinds
    pend = next(a for a in actions if a.kind == PendingActionKind.leg_without_fare)
    assert pend.trip_id == trip.id
    assert pend.trip_name == "Eurotrip"
    assert pend.target_kind == "leg"
    assert pend.target_id == leg.id


def test_leg_with_fare_but_no_chosen(session: Session, user: User) -> None:
    trip, _ = create_trip(session, user.id, "Eurotrip", "", "São Paulo")
    leg = create_leg(session, trip.id)
    _fare(session, user, leg.id)
    kinds = [a.kind for a in list_pending_actions(session, user.id)]
    assert PendingActionKind.fare_without_chosen in kinds
    assert PendingActionKind.leg_without_fare not in kinds


def test_leg_with_chosen_fare_no_pendencia(session: Session, user: User) -> None:
    trip, _ = create_trip(session, user.id, "Eurotrip", "", "São Paulo")
    leg = create_leg(session, trip.id)
    fare_id = _fare(session, user, leg.id)
    mark_chosen(session, leg.id, fare_id)
    leg_kinds = {a.kind for a in list_pending_actions(session, user.id) if a.target_kind == "leg"}
    assert leg_kinds == set()


def test_stop_without_itinerary_is_pendencia(session: Session, user: User) -> None:
    trip, _ = create_trip(session, user.id, "Eurotrip", "", "São Paulo")
    stop = create_stop(session, trip.id, "Lisboa")
    pend = next(
        a
        for a in list_pending_actions(session, user.id)
        if a.kind == PendingActionKind.stop_without_itinerary
    )
    assert pend.target_id == stop.id
    assert pend.target_kind == "stop"
    assert pend.label == "Lisboa"


def test_stop_with_itinerary_no_pendencia(session: Session, user: User) -> None:
    trip, _ = create_trip(session, user.id, "Eurotrip", "", "São Paulo")
    stop = create_stop(session, trip.id, "Lisboa")
    create_itinerary_item(session, stop.id, "Torre de Belém")
    stop_pend = [
        a
        for a in list_pending_actions(session, user.id)
        if a.kind == PendingActionKind.stop_without_itinerary
    ]
    assert stop_pend == []


def test_other_users_trips_excluded(session: Session, user: User) -> None:
    other = User(id=uuid.uuid4(), email="bob@example.com")
    session.add(other)
    session.commit()
    trip, _ = create_trip(session, other.id, "Solo", "", "Recife")
    create_leg(session, trip.id)
    assert list_pending_actions(session, user.id) == []
