"""Testes do esqueleto Rota/Trecho (ADR-0018/0019, #143)."""

import uuid
from collections.abc import Iterator

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.identity.models import User
from traveltogether.trips.legs_service import create_leg, delete_leg
from traveltogether.trips.models import SegmentMode
from traveltogether.trips.routes_service import (
    default_segment_for_leg,
    list_routes,
    list_segments,
    segment_leg_id,
    segment_trip_id,
)
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


def test_new_leg_has_default_route_and_air_segment(session: Session, user: User) -> None:
    trip, _ = create_trip(session, user.id, "EUA Trip", "", "São Paulo")
    leg = create_leg(session, trip.id)

    routes = list_routes(session, leg.id)
    assert len(routes) == 1
    assert routes[0].leg_id == leg.id

    segments = list_segments(session, routes[0].id)
    assert len(segments) == 1
    assert segments[0].mode == SegmentMode.air


def test_default_segment_resolves_for_leg(session: Session, user: User) -> None:
    trip, _ = create_trip(session, user.id, "EUA Trip", "", "São Paulo")
    leg = create_leg(session, trip.id)
    segment = default_segment_for_leg(session, leg.id)
    assert segment is not None
    assert segment_leg_id(session, segment.id) == leg.id
    assert segment_trip_id(session, segment.id) == trip.id


def test_delete_leg_cascades_routes_and_segments(session: Session, user: User) -> None:
    trip, _ = create_trip(session, user.id, "EUA Trip", "", "São Paulo")
    leg = create_leg(session, trip.id)
    route_id = list_routes(session, leg.id)[0].id
    delete_leg(session, leg)
    assert list_routes(session, leg.id) == []
    assert list_segments(session, route_id) == []
