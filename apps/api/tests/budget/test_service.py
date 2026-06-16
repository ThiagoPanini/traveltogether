"""Testes de domínio para budget.service (Orçamento — ADR-0016).

Cobrem a agregação por moeda (sem conversão de câmbio), o rateio por base
(`per_person` × `split`), as noites derivadas das datas da Parada, e o CRUD.
"""

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.budget.models import RateioBasis
from traveltogether.budget.service import (
    aggregate_budget,
    create_extra,
    create_lodging,
    delete_extra,
    list_extras,
    list_lodgings,
    update_lodging,
)
from traveltogether.fares.chosen_service import mark_chosen
from traveltogether.fares.service import create_fare_quote
from traveltogether.identity.models import User
from traveltogether.trips.legs_service import create_leg
from traveltogether.trips.models import Membership, MembershipRole, Stop, Trip
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


@pytest.fixture(name="trip")
def trip_fixture(session: Session, user: User) -> Trip:
    trip, _ = create_trip(session, user.id, "Eurotrip", "", "São Paulo")
    return trip


def _add_member(session: Session, trip: Trip) -> Membership:
    member = User(id=uuid.uuid4(), email=f"{uuid.uuid4().hex}@example.com")
    session.add(member)
    membership = Membership(trip_id=trip.id, user_id=member.id, role=MembershipRole.member)
    session.add(membership)
    session.commit()
    return membership


def _add_stop(
    session: Session,
    trip: Trip,
    *,
    nights: int = 3,
    order: int = 0,
) -> Stop:
    arrival = datetime(2025, 9, 1, tzinfo=UTC)
    departure = datetime(2025, 9, 1 + nights, tzinfo=UTC)
    stop = Stop(
        trip_id=trip.id,
        city="Lisboa",
        arrival_date=arrival,
        departure_date=departure,
        order=order,
    )
    session.add(stop)
    session.commit()
    session.refresh(stop)
    return stop


def _add_chosen_fare(session: Session, trip: Trip, user: User, value: str, currency: str) -> None:
    leg = create_leg(session, trip.id)
    fare = create_fare_quote(
        session=session,
        leg_id=leg.id,
        registered_by=user.id,
        value=Decimal(value),
        currency=currency,
        flight_date=datetime(2025, 9, 1, tzinfo=UTC),
        duration_minutes=180,
        origin_airport="GRU",
        destination_airport="LIS",
        airline="TAP",
    )
    mark_chosen(session, leg.id, fare.id)


# --- agregação -------------------------------------------------------------


def test_aggregate_empty_budget_has_member_count_and_no_subtotals(
    session: Session, trip: Trip
) -> None:
    summary = aggregate_budget(session, trip.id)
    assert summary.member_count == 1  # só o Organizador
    assert summary.subtotals == []


def test_aggregate_keeps_currencies_separate_without_conversion(
    session: Session, trip: Trip, user: User
) -> None:
    # 1 pessoa (organizador). Passagem em BRL, hospedagem em EUR.
    _add_chosen_fare(session, trip, user, "1500.00", "BRL")
    stop = _add_stop(session, trip, nights=2)
    create_lodging(
        session,
        trip_id=trip.id,
        stop_id=stop.id,
        created_by=user.id,
        nightly_value=Decimal("100.00"),
        currency="EUR",
        basis=RateioBasis.prorated,
    )

    summary = aggregate_budget(session, trip.id)
    by_currency = {s.currency: s for s in summary.subtotals}

    assert set(by_currency) == {"BRL", "EUR"}
    assert by_currency["BRL"].per_person == Decimal("1500.00")
    assert by_currency["EUR"].per_person == Decimal("200.00")  # 100 × 2 noites, 1 pessoa


def test_split_basis_divides_per_person_by_member_count(
    session: Session, trip: Trip, user: User
) -> None:
    _add_member(session, trip)
    _add_member(session, trip)  # 3 pessoas no total
    stop = _add_stop(session, trip, nights=2)
    create_lodging(
        session,
        trip_id=trip.id,
        stop_id=stop.id,
        created_by=user.id,
        nightly_value=Decimal("90.00"),
        currency="EUR",
        basis=RateioBasis.prorated,
    )

    summary = aggregate_budget(session, trip.id)
    eur = next(s for s in summary.subtotals if s.currency == "EUR")

    assert summary.member_count == 3
    assert eur.per_group == Decimal("180.00")  # 90 × 2 noites
    assert eur.per_person == Decimal("60.00")  # 180 ÷ 3


def test_per_person_basis_does_not_divide(session: Session, trip: Trip, user: User) -> None:
    _add_member(session, trip)  # 2 pessoas
    create_extra(
        session,
        trip_id=trip.id,
        created_by=user.id,
        value=Decimal("250.00"),
        currency="EUR",
        basis=RateioBasis.per_person,
    )

    summary = aggregate_budget(session, trip.id)
    eur = next(s for s in summary.subtotals if s.currency == "EUR")

    assert eur.per_person == Decimal("250.00")  # já é por cabeça
    assert eur.per_group == Decimal("500.00")  # 250 × 2 pessoas


def test_lodging_nights_derived_from_stop_dates(session: Session, trip: Trip, user: User) -> None:
    stop = _add_stop(session, trip, nights=5)
    create_lodging(
        session,
        trip_id=trip.id,
        stop_id=stop.id,
        created_by=user.id,
        nightly_value=Decimal("80.00"),
        currency="EUR",
        basis=RateioBasis.per_person,
    )

    summary = aggregate_budget(session, trip.id)
    eur = next(s for s in summary.subtotals if s.currency == "EUR")

    assert eur.per_person == Decimal("400.00")  # 80 × 5 noites


def test_lodging_without_stop_dates_contributes_nothing(
    session: Session, trip: Trip, user: User
) -> None:
    stop = Stop(trip_id=trip.id, city="Porto", order=0)  # sem datas
    session.add(stop)
    session.commit()
    session.refresh(stop)
    create_lodging(
        session,
        trip_id=trip.id,
        stop_id=stop.id,
        created_by=user.id,
        nightly_value=Decimal("80.00"),
        currency="EUR",
        basis=RateioBasis.prorated,
    )

    summary = aggregate_budget(session, trip.id)
    assert summary.subtotals == []  # 0 noites → nada entra


# --- CRUD ------------------------------------------------------------------


def test_create_and_list_lodging(session: Session, trip: Trip, user: User) -> None:
    stop = _add_stop(session, trip)
    create_lodging(
        session,
        trip_id=trip.id,
        stop_id=stop.id,
        created_by=user.id,
        nightly_value=Decimal("120.00"),
        currency="EUR",
        basis=RateioBasis.prorated,
        description="Airbnb centro",
    )
    lodgings = list_lodgings(session, trip.id)
    assert len(lodgings) == 1
    assert lodgings[0].description == "Airbnb centro"
    assert lodgings[0].currency == "EUR"


def test_update_lodging_changes_value(session: Session, trip: Trip, user: User) -> None:
    stop = _add_stop(session, trip)
    lodging = create_lodging(
        session,
        trip_id=trip.id,
        stop_id=stop.id,
        created_by=user.id,
        nightly_value=Decimal("100.00"),
        currency="EUR",
        basis=RateioBasis.prorated,
    )
    updated = update_lodging(session, lodging, nightly_value=Decimal("130.00"))
    assert updated.nightly_value == Decimal("130.00")


def test_delete_extra_removes_it(session: Session, trip: Trip, user: User) -> None:
    extra = create_extra(
        session,
        trip_id=trip.id,
        created_by=user.id,
        value=Decimal("50.00"),
        currency="USD",
        basis=RateioBasis.prorated,
    )
    delete_extra(session, extra)
    assert list_extras(session, trip.id) == []
