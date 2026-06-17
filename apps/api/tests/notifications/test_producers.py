"""Testes dos produtores de Notificação (ADR-0017, #102).

Cada boundary que origina um evento chama `notifications.service.notify`
direto (sem barramento), respeitando as `Preferências de Notificação`. Aqui
exercitamos os services produtores e conferimos a Notificação resultante para o
destinatário certo, sem notificar o próprio autor da ação.
"""

import uuid
from collections.abc import Iterator
from datetime import datetime
from decimal import Decimal

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import traveltogether.collaboration.models  # noqa: F401  # pyright: ignore[reportUnusedImport]
import traveltogether.fares.models  # noqa: F401  # pyright: ignore[reportUnusedImport]
import traveltogether.notifications.models  # noqa: F401  # pyright: ignore[reportUnusedImport]
from traveltogether.fares.models import FareQuote
from traveltogether.identity.models import User
from traveltogether.notifications.models import NotificationKind
from traveltogether.notifications.service import list_for_user
from traveltogether.trips.models import Leg, Membership, MembershipRole, Trip


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


def _user(session: Session, email: str) -> User:
    user = User(id=uuid.uuid4(), email=email)
    session.add(user)
    session.commit()
    return user


def _trip(session: Session, owner: User, name: str = "Eurotrip") -> Trip:
    trip = Trip(name=name, origin="São Paulo", created_by=owner.id)
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return trip


def _member(session: Session, trip: Trip, user: User, role: MembershipRole) -> Membership:
    membership = Membership(trip_id=trip.id, user_id=user.id, role=role)
    session.add(membership)
    session.commit()
    return membership


def _leg(session: Session, trip: Trip) -> Leg:
    from traveltogether.trips.routes_service import ensure_default_route_and_segment

    leg = Leg(trip_id=trip.id, order=0)
    session.add(leg)
    session.commit()
    session.refresh(leg)
    ensure_default_route_and_segment(session, leg, created_by=trip.created_by)
    return leg


def _fare(session: Session, leg: Leg, registered_by: User) -> FareQuote:
    from traveltogether.fares.service import create_fare_quote

    return create_fare_quote(
        session=session,
        leg_id=leg.id,
        registered_by=registered_by.id,
        value=Decimal("1200.00"),
        currency="BRL",
        flight_date=datetime(2026, 7, 1, 8, 0),
        duration_minutes=600,
        origin_airport="GRU",
        destination_airport="LIS",
        airline="TAP",
    )


def test_invite_to_existing_user_creates_invite_notification(session: Session) -> None:
    from traveltogether.trips.members_service import add_member_by_email

    organizer = _user(session, "alice@example.com")
    invitee = _user(session, "bob@example.com")
    trip = _trip(session, organizer)
    _member(session, trip, organizer, MembershipRole.organizer)

    add_member_by_email(session, trip.id, invitee.email, trip_name=trip.name)

    items = list_for_user(session, invitee.id)
    assert len(items) == 1
    assert items[0].kind == NotificationKind.invite
    assert items[0].trip_id == trip.id
    assert trip.name in items[0].text


def test_mark_chosen_notifies_members_except_actor(session: Session) -> None:
    from traveltogether.fares.chosen_service import mark_chosen

    organizer = _user(session, "alice@example.com")
    member = _user(session, "bob@example.com")
    trip = _trip(session, organizer)
    _member(session, trip, organizer, MembershipRole.organizer)
    _member(session, trip, member, MembershipRole.member)
    leg = _leg(session, trip)
    fare = _fare(session, leg, organizer)

    mark_chosen(session, leg.id, fare.id, actor_id=organizer.id)

    member_items = list_for_user(session, member.id)
    assert len(member_items) == 1
    assert member_items[0].kind == NotificationKind.decision
    assert member_items[0].trip_id == trip.id
    # Ator não se notifica (invariante 20 / ADR-0017).
    assert list_for_user(session, organizer.id) == []


def test_unmark_chosen_does_not_notify(session: Session) -> None:
    from traveltogether.fares.chosen_service import mark_chosen

    organizer = _user(session, "alice@example.com")
    member = _user(session, "bob@example.com")
    trip = _trip(session, organizer)
    _member(session, trip, organizer, MembershipRole.organizer)
    _member(session, trip, member, MembershipRole.member)
    leg = _leg(session, trip)
    fare = _fare(session, leg, organizer)

    mark_chosen(session, leg.id, fare.id, actor_id=organizer.id)  # marca
    mark_chosen(session, leg.id, fare.id, actor_id=organizer.id)  # desmarca

    # Continua só a notificação do primeiro marcar; desmarcar não gera evento.
    assert len(list_for_user(session, member.id)) == 1


def test_create_task_notifies_new_assignees_except_actor(session: Session) -> None:
    from traveltogether.collaboration.task_service import create_task

    organizer = _user(session, "alice@example.com")
    member = _user(session, "bob@example.com")
    trip = _trip(session, organizer)
    _member(session, trip, organizer, MembershipRole.organizer)
    _member(session, trip, member, MembershipRole.member)

    create_task(
        session,
        trip_id=trip.id,
        created_by=organizer.id,
        title="Reservar hostel",
        assignee_ids=[organizer.id, member.id],
    )

    member_items = list_for_user(session, member.id)
    assert len(member_items) == 1
    assert member_items[0].kind == NotificationKind.task
    assert "Reservar hostel" in member_items[0].text
    # Ator (organizer) também é responsável mas não se notifica.
    assert list_for_user(session, organizer.id) == []


def test_update_task_only_notifies_newly_added_assignee(session: Session) -> None:
    from traveltogether.collaboration.task_service import create_task, update_task

    organizer = _user(session, "alice@example.com")
    bob = _user(session, "bob@example.com")
    carol = _user(session, "carol@example.com")
    trip = _trip(session, organizer)
    _member(session, trip, organizer, MembershipRole.organizer)
    _member(session, trip, bob, MembershipRole.member)
    _member(session, trip, carol, MembershipRole.member)

    task = create_task(
        session,
        trip_id=trip.id,
        created_by=organizer.id,
        title="Comprar passagens",
        assignee_ids=[bob.id],
    )
    assert len(list_for_user(session, bob.id)) == 1

    update_task(session, task, organizer.id, assignee_ids=[bob.id, carol.id])

    # Bob já era responsável → não re-notifica; Carol é nova → 1.
    assert len(list_for_user(session, bob.id)) == 1
    assert len(list_for_user(session, carol.id)) == 1


def test_comment_mention_notifies_mentioned_member_except_author(session: Session) -> None:
    from traveltogether.collaboration.models import CommentTargetType
    from traveltogether.collaboration.service import create_comment

    author = _user(session, "alice@example.com")
    mentioned = _user(session, "bob@example.com")
    trip = _trip(session, author)
    _member(session, trip, author, MembershipRole.organizer)
    _member(session, trip, mentioned, MembershipRole.member)

    create_comment(
        session,
        author_id=author.id,
        trip_id=trip.id,
        target_type=CommentTargetType.trip,
        target_id=trip.id,
        body="Combinado @bob@example.com? E @alice@example.com já viu.",
    )

    mentioned_items = list_for_user(session, mentioned.id)
    assert len(mentioned_items) == 1
    assert mentioned_items[0].kind == NotificationKind.mention
    assert mentioned_items[0].trip_id == trip.id
    # Autor mencionou a si mesmo mas não se notifica (invariante 20).
    assert list_for_user(session, author.id) == []


def test_comment_mention_ignores_non_members(session: Session) -> None:
    from traveltogether.collaboration.models import CommentTargetType
    from traveltogether.collaboration.service import create_comment

    author = _user(session, "alice@example.com")
    outsider = _user(session, "stranger@example.com")
    trip = _trip(session, author)
    _member(session, trip, author, MembershipRole.organizer)

    create_comment(
        session,
        author_id=author.id,
        trip_id=trip.id,
        target_type=CommentTargetType.trip,
        target_id=trip.id,
        body="Oi @stranger@example.com, quer entrar?",
    )

    # Quem não é Membro da Viagem não recebe menção.
    assert list_for_user(session, outsider.id) == []
