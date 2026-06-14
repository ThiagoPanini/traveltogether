"""Testes de itinerary_service.stop_ids_with_itinerary (painel #58)."""

import uuid
from collections.abc import Iterator

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.identity.models import User
from traveltogether.trips.itinerary_service import (
    create_itinerary_item,
    stop_ids_with_itinerary,
)
from traveltogether.trips.models import Stop
from traveltogether.trips.service import create_trip
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


def _stop(session: Session, user: User, city: str) -> Stop:
    trip, _ = create_trip(session, user.id, "Trip", "", "São Paulo")
    return create_stop(session, trip.id, city)


def test_stop_without_itinerary_absent(session: Session, user: User) -> None:
    stop = _stop(session, user, "Lisboa")
    assert stop_ids_with_itinerary(session, [stop.id]) == set()


def test_stop_with_itinerary_present(session: Session, user: User) -> None:
    stop = _stop(session, user, "Lisboa")
    create_itinerary_item(session, stop.id, "Torre de Belém")
    assert stop_ids_with_itinerary(session, [stop.id]) == {stop.id}


def test_empty_stop_ids(session: Session, user: User) -> None:
    assert stop_ids_with_itinerary(session, []) == set()
