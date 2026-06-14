"""Testes de trips.activity_service.list_recent_activity (painel #71)."""

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.collaboration.service import create_comment
from traveltogether.fares.service import create_fare_quote
from traveltogether.identity.models import User
from traveltogether.trips.activity_service import ActivityKind, list_recent_activity
from traveltogether.trips.legs_service import create_leg
from traveltogether.trips.models import Membership, MembershipRole
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


@pytest.fixture(name="alice")
def alice_fixture(session: Session) -> User:
    user = User(id=uuid.uuid4(), email="alice@example.com", display_name="Alice")
    session.add(user)
    session.commit()
    return user


@pytest.fixture(name="bob")
def bob_fixture(session: Session) -> User:
    user = User(id=uuid.uuid4(), email="bob@example.com", display_name="Bob")
    session.add(user)
    session.commit()
    return user


# ── Slice 1: member_joined ──────────────────────────────────────────────────


def test_sem_viagens_retorna_vazio(session: Session, alice: User) -> None:
    assert list_recent_activity(session, alice.id) == []


def test_membro_novo_gera_activity_member_joined(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Eurotrip", "", "São Paulo")
    membership = Membership(
        trip_id=trip.id,
        user_id=bob.id,
        role=MembershipRole.member,
        joined_at=datetime(2026, 7, 1, 12, 0, tzinfo=UTC),
    )
    session.add(membership)
    session.commit()

    items = list_recent_activity(session, alice.id)
    member_items = [i for i in items if i.kind == ActivityKind.member_joined]
    assert len(member_items) == 1
    item = member_items[0]
    assert item.trip_id == trip.id
    assert item.trip_name == "Eurotrip"
    assert item.actor_name == "Bob"
    assert item.occurred_at == datetime(2026, 7, 1, 12, 0)


def test_propria_entrada_excluida(session: Session, alice: User) -> None:
    create_trip(session, alice.id, "Solo", "", "São Paulo")
    items = list_recent_activity(session, alice.id)
    member_items = [i for i in items if i.kind == ActivityKind.member_joined]
    assert member_items == []


def test_viagens_de_outros_excluidas(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, bob.id, "Bob Trip", "", "Recife")
    carol = User(id=uuid.uuid4(), email="carol@example.com")
    session.add(carol)
    session.commit()
    session.add(Membership(trip_id=trip.id, user_id=carol.id, role=MembershipRole.member))
    session.commit()

    assert list_recent_activity(session, alice.id) == []


# ── Slice 2: comment ─────────────────────────────────────────────────────────


def test_comentario_gera_activity_comment(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Eurotrip", "", "São Paulo")
    session.add(Membership(trip_id=trip.id, user_id=bob.id, role=MembershipRole.member))
    session.commit()

    from traveltogether.collaboration.models import CommentTargetType  # noqa: PLC0415

    comment = create_comment(
        session,
        trip_id=trip.id,
        author_id=bob.id,
        target_type=CommentTargetType.trip,
        target_id=trip.id,
        body="Adorei o roteiro!",
    )

    items = list_recent_activity(session, alice.id)
    comment_items = [i for i in items if i.kind == ActivityKind.comment]
    assert len(comment_items) == 1
    item = comment_items[0]
    assert item.trip_id == trip.id
    assert item.actor_name == "Bob"
    assert "Adorei o roteiro!" in item.body
    assert item.occurred_at == comment.created_at


# ── Slice 3: fare_registered ──────────────────────────────────────────────────


def test_pesquisa_registrada_gera_activity_fare(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Eurotrip", "", "São Paulo")
    session.add(Membership(trip_id=trip.id, user_id=bob.id, role=MembershipRole.member))
    session.commit()
    leg = create_leg(session, trip.id)

    fare = create_fare_quote(
        session=session,
        leg_id=leg.id,
        registered_by=bob.id,
        value=Decimal("1500.00"),
        currency="BRL",
        flight_date=datetime(2026, 9, 1, tzinfo=UTC),
        duration_minutes=600,
        origin_airport="GRU",
        destination_airport="LIS",
        airline="LATAM",
    )

    items = list_recent_activity(session, alice.id)
    fare_items = [i for i in items if i.kind == ActivityKind.fare_registered]
    assert len(fare_items) == 1
    item = fare_items[0]
    assert item.trip_id == trip.id
    assert item.actor_name == "Bob"
    assert "GRU" in item.body or "LIS" in item.body or "LATAM" in item.body
    assert item.occurred_at == fare.created_at


# ── ordenação e limit ─────────────────────────────────────────────────────────


def test_ordenado_por_tempo_decrescente(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Eurotrip", "", "São Paulo")
    session.add(Membership(trip_id=trip.id, user_id=bob.id, role=MembershipRole.member))
    session.commit()

    from traveltogether.collaboration.models import CommentTargetType  # noqa: PLC0415

    create_comment(
        session,
        trip_id=trip.id,
        author_id=alice.id,
        target_type=CommentTargetType.trip,
        target_id=trip.id,
        body="A",
    )
    create_comment(
        session,
        trip_id=trip.id,
        author_id=bob.id,
        target_type=CommentTargetType.trip,
        target_id=trip.id,
        body="B",
    )

    items = list_recent_activity(session, alice.id)
    comment_items = [i for i in items if i.kind == ActivityKind.comment]
    assert len(comment_items) == 2
    assert comment_items[0].occurred_at >= comment_items[1].occurred_at


def test_limit_respeitado(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Eurotrip", "", "São Paulo")
    session.add(Membership(trip_id=trip.id, user_id=bob.id, role=MembershipRole.member))
    session.commit()

    from traveltogether.collaboration.models import CommentTargetType  # noqa: PLC0415

    for i in range(5):
        create_comment(
            session,
            trip_id=trip.id,
            author_id=alice.id,
            target_type=CommentTargetType.trip,
            target_id=trip.id,
            body=f"msg {i}",
        )

    items = list_recent_activity(session, alice.id, limit=3)
    assert len(items) == 3
