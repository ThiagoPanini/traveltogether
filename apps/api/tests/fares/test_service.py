"""Testes de domínio para fares.service."""

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.fares.models import FareQuote
from traveltogether.fares.service import (
    create_fare_quote,
    delete_fare_quote,
    list_fare_quotes,
    update_fare_quote,
)
from traveltogether.identity.models import User
from traveltogether.trips.models import Leg


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


@pytest.fixture(name="leg")
def leg_fixture(session: Session, user: User) -> Leg:
    from traveltogether.trips.legs_service import create_leg
    from traveltogether.trips.service import create_trip

    trip, _ = create_trip(session, user.id, "Road Trip", "", "São Paulo")
    return create_leg(session, trip.id)


def _make_fare(session: Session, user: User, leg: Leg, airline: str = "LATAM") -> FareQuote:
    return create_fare_quote(
        session=session,
        leg_id=leg.id,
        registered_by=user.id,
        value=Decimal("1500.00"),
        currency="BRL",
        flight_date=datetime(2025, 9, 1, tzinfo=UTC),
        duration_minutes=180,
        stops=0,
        checked_baggage=True,
        origin_airport="GRU",
        destination_airport="EZE",
        airline=airline,
    )


def test_create_fare_quote_returns_fare(session: Session, user: User, leg: Leg) -> None:
    fare = _make_fare(session, user, leg)
    assert fare.leg_id == leg.id
    assert fare.registered_by == user.id
    assert fare.currency == "BRL"
    assert fare.origin_airport == "GRU"
    assert fare.airline == "LATAM"
    assert fare.stops == 0


def test_list_fare_quotes_returns_fares_for_leg(session: Session, user: User, leg: Leg) -> None:
    _make_fare(session, user, leg, "LATAM")
    _make_fare(session, user, leg, "Gol")
    fares = list_fare_quotes(session, leg.id)
    assert len(fares) == 2
    assert {f.airline for f in fares} == {"LATAM", "Gol"}


def test_update_fare_quote_changes_airline(session: Session, user: User, leg: Leg) -> None:
    fare = _make_fare(session, user, leg)
    updated = update_fare_quote(session, fare, airline="Azul")
    assert updated.airline == "Azul"


def test_delete_fare_quote_removes_it(session: Session, user: User, leg: Leg) -> None:
    fare = _make_fare(session, user, leg)
    delete_fare_quote(session, fare)
    assert list_fare_quotes(session, leg.id) == []
