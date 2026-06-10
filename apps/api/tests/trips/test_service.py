"""Testes de domínio para trips.service — sem Postgres real."""

from collections.abc import Iterator
from datetime import date

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.identity.models import User
from traveltogether.trips.models import MembershipRole
from traveltogether.trips.service import (
    TripPeriodError,
    create_trip,
    get_trip_membership,
    list_user_trips,
    update_trip,
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


@pytest.fixture(name="alice")
def alice_fixture(session: Session) -> User:
    user = User(email="alice@example.com")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="bob")
def bob_fixture(session: Session) -> User:
    user = User(email="bob@example.com")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def test_list_user_trips_returns_only_own_trips(session: Session, alice: User, bob: User) -> None:
    create_trip(session, alice.id, "Alice Trip", "", "São Paulo")
    create_trip(session, bob.id, "Bob Trip", "", "Rio de Janeiro")

    alice_trips = list_user_trips(session, alice.id)

    assert len(alice_trips) == 1
    trip, membership = alice_trips[0]
    assert trip.name == "Alice Trip"
    assert membership.user_id == alice.id


def test_list_user_trips_returns_empty_for_user_with_no_trips(
    session: Session, alice: User
) -> None:
    assert list_user_trips(session, alice.id) == []


def test_create_trip_returns_trip_with_organizer_membership(session: Session, alice: User) -> None:
    trip, membership = create_trip(
        session,
        creator_id=alice.id,
        name="NYC Weekend",
        description="Fim de semana em NY",
        origin="São Paulo",
    )

    assert trip.name == "NYC Weekend"
    assert trip.origin == "São Paulo"
    assert trip.created_by == alice.id
    assert membership.user_id == alice.id
    assert membership.role == MembershipRole.organizer


def test_get_trip_membership_returns_none_for_non_member(
    session: Session, alice: User, bob: User
) -> None:
    trip, _ = create_trip(session, alice.id, "Alice Trip", "", "São Paulo")
    assert get_trip_membership(session, trip.id, bob.id) is None


def test_get_trip_membership_returns_membership_for_member(session: Session, alice: User) -> None:
    trip, original_membership = create_trip(session, alice.id, "Alice Trip", "", "SP")
    membership = get_trip_membership(session, trip.id, alice.id)
    assert membership is not None
    assert membership.id == original_membership.id
    assert membership.role == MembershipRole.organizer


def test_update_trip_changes_metadata(session: Session, alice: User) -> None:
    trip, _ = create_trip(session, alice.id, "Old Name", "Old desc", "São Paulo")

    updated = update_trip(session, trip, name="New Name", description=None, origin=None)

    assert updated.name == "New Name"
    assert updated.description == "Old desc"
    assert updated.origin == "São Paulo"


def test_create_trip_persists_period_and_airport(session: Session, alice: User) -> None:
    start = date(2025, 6, 10)
    end = date(2025, 6, 20)
    trip, _ = create_trip(
        session,
        alice.id,
        "Euro",
        "",
        "São Paulo (GRU)",
        start_date=start,
        end_date=end,
        airport_code="GRU",
    )
    assert trip.start_date == start
    assert trip.end_date == end
    assert trip.airport_code == "GRU"


def test_create_trip_end_before_start_raises(session: Session, alice: User) -> None:
    with pytest.raises(TripPeriodError):
        create_trip(
            session,
            alice.id,
            "Bad Trip",
            "",
            "SP",
            start_date=date(2025, 6, 20),
            end_date=date(2025, 6, 10),
        )


def test_create_trip_airport_code_normalized_uppercase(session: Session, alice: User) -> None:
    trip, _ = create_trip(
        session,
        alice.id,
        "T",
        "",
        "SP",
        start_date=date(2025, 1, 1),
        end_date=date(2025, 1, 5),
        airport_code="gru",
    )
    assert trip.airport_code == "GRU"
