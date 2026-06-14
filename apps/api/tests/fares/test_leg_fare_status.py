"""Testes de fares.service.leg_fare_status (agregação para o painel #58)."""

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.fares.chosen_service import mark_chosen
from traveltogether.fares.models import FareQuote
from traveltogether.fares.service import create_fare_quote, leg_fare_status
from traveltogether.identity.models import User
from traveltogether.trips.legs_service import create_leg
from traveltogether.trips.models import Leg
from traveltogether.trips.service import create_trip


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


def _leg(session: Session, user: User) -> Leg:
    trip, _ = create_trip(session, user.id, "Trip", "", "São Paulo")
    return create_leg(session, trip.id)


def _fare(session: Session, user: User, leg: Leg) -> FareQuote:
    return create_fare_quote(
        session=session,
        leg_id=leg.id,
        registered_by=user.id,
        value=Decimal("1500.00"),
        currency="BRL",
        flight_date=datetime(2026, 9, 1, tzinfo=UTC),
        duration_minutes=600,
        origin_airport="GRU",
        destination_airport="LIS",
        airline="LATAM",
    )


def test_leg_without_fare_absent_from_status(session: Session, user: User) -> None:
    leg = _leg(session, user)
    status = leg_fare_status(session, [leg.id])
    assert leg.id not in status


def test_leg_with_fare_but_no_chosen(session: Session, user: User) -> None:
    leg = _leg(session, user)
    _fare(session, user, leg)
    _fare(session, user, leg)
    status = leg_fare_status(session, [leg.id])
    assert status[leg.id] == (2, False)


def test_leg_with_chosen_fare(session: Session, user: User) -> None:
    leg = _leg(session, user)
    fare = _fare(session, user, leg)
    mark_chosen(session, leg.id, fare.id)
    status = leg_fare_status(session, [leg.id])
    assert status[leg.id] == (1, True)


def test_empty_leg_ids(session: Session, user: User) -> None:
    assert leg_fare_status(session, []) == {}
