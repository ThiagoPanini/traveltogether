"""Testes de domínio para trips.legs_service."""

import uuid
from collections.abc import Iterator

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.identity.models import User
from traveltogether.trips.legs_service import (
    StopAnchoredError,
    check_stop_not_anchored,
    create_leg,
    delete_leg,
    list_legs,
    update_leg,
)
from traveltogether.trips.models import Stop, Trip


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
    from traveltogether.trips.service import create_trip

    user = User(id=uuid.uuid4(), email="a@a.com")
    session.add(user)
    session.commit()
    trip, _ = create_trip(session, user.id, "Road Trip", "", "São Paulo")
    return trip


@pytest.fixture(name="stops")
def stops_fixture(session: Session, trip: Trip) -> tuple[Stop, Stop]:
    from traveltogether.trips.stops_service import create_stop

    s1 = create_stop(session, trip.id, "Buenos Aires")
    s2 = create_stop(session, trip.id, "Montevideo")
    return s1, s2


def test_create_leg_between_two_stops(
    session: Session, trip: Trip, stops: tuple[Stop, Stop]
) -> None:
    s1, s2 = stops
    leg = create_leg(session, trip.id, origin_stop_id=s1.id, destination_stop_id=s2.id)
    assert leg.trip_id == trip.id
    assert leg.origin_stop_id == s1.id
    assert leg.destination_stop_id == s2.id
    assert leg.order == 1
    assert leg.target_date is None


def test_create_leg_with_null_home(session: Session, trip: Trip, stops: tuple[Stop, Stop]) -> None:
    s1, _ = stops
    leg = create_leg(session, trip.id, origin_stop_id=None, destination_stop_id=s1.id)
    assert leg.origin_stop_id is None
    assert leg.destination_stop_id == s1.id


def test_list_legs_returns_ordered(session: Session, trip: Trip, stops: tuple[Stop, Stop]) -> None:
    s1, s2 = stops
    create_leg(session, trip.id, origin_stop_id=None, destination_stop_id=s1.id)
    create_leg(session, trip.id, origin_stop_id=s1.id, destination_stop_id=s2.id)
    create_leg(session, trip.id, origin_stop_id=s2.id, destination_stop_id=None)
    legs = list_legs(session, trip.id)
    assert len(legs) == 3
    assert [leg.order for leg in legs] == [1, 2, 3]


def test_update_leg_changes_target_date(
    session: Session, trip: Trip, stops: tuple[Stop, Stop]
) -> None:
    from datetime import UTC, datetime

    s1, s2 = stops
    leg = create_leg(session, trip.id, origin_stop_id=s1.id, destination_stop_id=s2.id)
    dt = datetime(2025, 8, 15, tzinfo=UTC)
    updated = update_leg(session, leg, target_date=dt)
    assert updated.target_date is not None


def test_delete_leg_removes_it(session: Session, trip: Trip, stops: tuple[Stop, Stop]) -> None:
    s1, s2 = stops
    leg = create_leg(session, trip.id, origin_stop_id=s1.id, destination_stop_id=s2.id)
    delete_leg(session, leg)
    assert list_legs(session, trip.id) == []


def test_check_stop_anchored_raises_when_referenced(
    session: Session, trip: Trip, stops: tuple[Stop, Stop]
) -> None:
    s1, s2 = stops
    create_leg(session, trip.id, origin_stop_id=s1.id, destination_stop_id=s2.id)
    with pytest.raises(StopAnchoredError):
        check_stop_not_anchored(session, s1)


def test_check_stop_not_anchored_ok_when_no_leg(
    session: Session, trip: Trip, stops: tuple[Stop, Stop]
) -> None:
    s1, _ = stops
    check_stop_not_anchored(session, s1)
