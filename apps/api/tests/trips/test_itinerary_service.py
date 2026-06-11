"""Testes de domínio para trips.itinerary_service — sem Postgres real."""

import uuid
from collections.abc import Iterator
from datetime import date

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.identity.models import User
from traveltogether.trips.itinerary_service import (
    create_itinerary_item,
    delete_itinerary_item,
    list_itinerary_items,
    reorder_itinerary_items,
    update_itinerary_item,
)
from traveltogether.trips.models import Stop


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


@pytest.fixture(name="stop")
def stop_fixture(session: Session) -> Stop:
    from traveltogether.trips.service import create_trip

    user = User(id=uuid.uuid4(), email="org@test.com")
    session.add(user)
    session.commit()
    trip, _ = create_trip(session, user.id, "Viagem Test", "", "São Paulo")
    stop = Stop(id=uuid.uuid4(), trip_id=trip.id, city="Lisboa", order=1)
    session.add(stop)
    session.commit()
    session.refresh(stop)
    return stop


def test_create_itinerary_item_returns_item_with_title(session: Session, stop: Stop) -> None:
    item = create_itinerary_item(session, stop.id, "Visitar Torre de Belém")
    assert item.title == "Visitar Torre de Belém"
    assert item.stop_id == stop.id
    assert item.order == 1


def test_list_itinerary_items_returns_sorted_by_order(session: Session, stop: Stop) -> None:
    create_itinerary_item(session, stop.id, "Primeiro")
    create_itinerary_item(session, stop.id, "Segundo")
    create_itinerary_item(session, stop.id, "Terceiro")
    items = list_itinerary_items(session, stop.id)
    assert [i.title for i in items] == ["Primeiro", "Segundo", "Terceiro"]
    assert [i.order for i in items] == [1, 2, 3]


def test_create_itinerary_item_with_optional_fields(session: Session, stop: Stop) -> None:
    item = create_itinerary_item(
        session,
        stop.id,
        "Jantar",
        notes="Reservar com antecedência",
        link="https://restaurante.com",
        day=date(2026, 7, 2),
        time="20:00",
    )
    assert item.notes == "Reservar com antecedência"
    assert item.link == "https://restaurante.com"
    assert item.day == date(2026, 7, 2)
    assert item.time == "20:00"


def test_update_itinerary_item_changes_title(session: Session, stop: Stop) -> None:
    item = create_itinerary_item(session, stop.id, "Título original")
    updated = update_itinerary_item(session, item, title="Título novo")
    assert updated.title == "Título novo"
    assert updated.id == item.id


def test_update_itinerary_item_changes_optional_fields(session: Session, stop: Stop) -> None:
    item = create_itinerary_item(session, stop.id, "Passeio")
    updated = update_itinerary_item(
        session,
        item,
        notes="Nova observação",
        link="https://nova-url.com",
        day=date(2026, 7, 3),
        time="09:30",
    )
    assert updated.notes == "Nova observação"
    assert updated.link == "https://nova-url.com"
    assert updated.day == date(2026, 7, 3)
    assert updated.time == "09:30"


def test_delete_itinerary_item_removes_it(session: Session, stop: Stop) -> None:
    item = create_itinerary_item(session, stop.id, "Para remover")
    delete_itinerary_item(session, item)
    assert list_itinerary_items(session, stop.id) == []


def test_reorder_itinerary_items_changes_sequence(session: Session, stop: Stop) -> None:
    i1 = create_itinerary_item(session, stop.id, "A")
    i2 = create_itinerary_item(session, stop.id, "B")
    i3 = create_itinerary_item(session, stop.id, "C")
    reorder_itinerary_items(session, stop.id, [i3.id, i1.id, i2.id])
    items = list_itinerary_items(session, stop.id)
    assert [i.title for i in items] == ["C", "A", "B"]
