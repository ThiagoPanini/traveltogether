"""Testes do serviço mark_chosen (invariante 5: ≤1 escolhida por Trajeto)."""

import uuid
from collections.abc import Iterator
from datetime import datetime
from decimal import Decimal

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import traveltogether.fares.models  # noqa: F401  # pyright: ignore[reportUnusedImport]
import traveltogether.identity.models  # noqa: F401  # pyright: ignore[reportUnusedImport]
import traveltogether.trips.models  # noqa: F401  # pyright: ignore[reportUnusedImport]
from traveltogether.fares.chosen_service import mark_chosen
from traveltogether.fares.models import FareQuote
from traveltogether.fares.service import create_fare_quote


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


def _make_fare(session: Session, leg_id: uuid.UUID) -> FareQuote:
    return create_fare_quote(
        session=session,
        leg_id=leg_id,
        registered_by=uuid.uuid4(),
        value=Decimal("100.00"),
        currency="BRL",
        flight_date=datetime(2025, 9, 1, 10, 0, 0),
        duration_minutes=120,
        origin_airport="GRU",
        destination_airport="GIG",
        airline="LATAM",
    )


def test_mark_chosen_sets_flag(session: Session) -> None:
    leg_id = uuid.uuid4()
    fare = _make_fare(session, leg_id)
    result = mark_chosen(session, leg_id, fare.id)
    assert result.is_chosen is True


def test_mark_chosen_twice_toggles_off(session: Session) -> None:
    leg_id = uuid.uuid4()
    fare = _make_fare(session, leg_id)
    mark_chosen(session, leg_id, fare.id)
    result = mark_chosen(session, leg_id, fare.id)
    assert result.is_chosen is False


def test_mark_chosen_moves_mark(session: Session) -> None:
    leg_id = uuid.uuid4()
    fare_a = _make_fare(session, leg_id)
    fare_b = _make_fare(session, leg_id)
    mark_chosen(session, leg_id, fare_a.id)
    mark_chosen(session, leg_id, fare_b.id)
    session.refresh(fare_a)
    assert fare_a.is_chosen is False
    assert fare_b.is_chosen is True


def test_mark_chosen_wrong_leg_raises(session: Session) -> None:
    leg_id = uuid.uuid4()
    other_leg = uuid.uuid4()
    fare = _make_fare(session, leg_id)
    with pytest.raises(ValueError, match="fare does not belong to leg"):
        mark_chosen(session, other_leg, fare.id)
