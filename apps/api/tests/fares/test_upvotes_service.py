"""Testes de domínio para fares.upvotes_service."""

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.fares.service import create_fare_quote
from traveltogether.fares.upvotes_service import toggle_upvote
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


@pytest.fixture(name="fare_id")
def fare_id_fixture(session: Session, user: User, leg: Leg) -> uuid.UUID:
    fare = create_fare_quote(
        session=session,
        leg_id=leg.id,
        registered_by=user.id,
        value=Decimal("1500.00"),
        currency="BRL",
        flight_date=datetime(2025, 9, 1, tzinfo=UTC),
        duration_minutes=180,
        origin_airport="GRU",
        destination_airport="EZE",
        airline="LATAM",
    )
    return fare.id


def test_toggle_upvote_adds_upvote(session: Session, user: User, fare_id: uuid.UUID) -> None:
    count, voted = toggle_upvote(session, fare_id, user.id)
    assert voted is True
    assert count == 1


def test_toggle_upvote_removes_upvote_on_second_call(
    session: Session, user: User, fare_id: uuid.UUID
) -> None:
    toggle_upvote(session, fare_id, user.id)
    count, voted = toggle_upvote(session, fare_id, user.id)
    assert voted is False
    assert count == 0
