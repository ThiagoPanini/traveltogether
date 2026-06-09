"""Testes de domínio para trips.stops_service."""

from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.identity.models import User
from traveltogether.trips.models import Trip
from traveltogether.trips.stops_service import (
    create_stop,
    delete_stop,
    list_stops,
    reorder_stops,
    update_stop,
)


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


@pytest.fixture(name="trip")
def trip_fixture(session: Session) -> Trip:
    import uuid

    from traveltogether.trips.service import create_trip

    user = User(id=uuid.uuid4(), email="a@a.com")
    session.add(user)
    session.commit()
    trip, _ = create_trip(session, user.id, "Road Trip", "", "São Paulo")
    return trip


def test_list_stops_returns_ordered(session: Session, trip: Trip) -> None:
    create_stop(session, trip.id, "Montevideo")
    create_stop(session, trip.id, "Buenos Aires")
    stops = list_stops(session, trip.id)
    assert [s.city for s in stops] == ["Montevideo", "Buenos Aires"]
    assert [s.order for s in stops] == [1, 2]


def test_update_stop_changes_city(session: Session, trip: Trip) -> None:
    stop = create_stop(session, trip.id, "Santiago")
    updated = update_stop(session, stop, city="Mendoza")
    assert updated.city == "Mendoza"
    assert updated.order == stop.order


def test_delete_stop_removes_it(session: Session, trip: Trip) -> None:
    stop = create_stop(session, trip.id, "Lima")
    delete_stop(session, stop)
    assert list_stops(session, trip.id) == []


def test_reorder_stops_changes_sequence(session: Session, trip: Trip) -> None:
    s1 = create_stop(session, trip.id, "A")
    s2 = create_stop(session, trip.id, "B")
    s3 = create_stop(session, trip.id, "C")
    reorder_stops(session, trip.id, [s3.id, s1.id, s2.id])
    stops = list_stops(session, trip.id)
    assert [s.city for s in stops] == ["C", "A", "B"]


def test_create_stop_adds_stop_to_trip(session: Session, trip: Trip) -> None:
    arrival = datetime(2025, 7, 1, tzinfo=UTC)
    departure = datetime(2025, 7, 3, tzinfo=UTC)
    stop = create_stop(session, trip.id, "Buenos Aires", arrival, departure)
    assert stop.city == "Buenos Aires"
    assert stop.trip_id == trip.id
    assert stop.arrival_date == arrival.replace(tzinfo=None)
    assert stop.departure_date == departure.replace(tzinfo=None)
    assert stop.order == 1
