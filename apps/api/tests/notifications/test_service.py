"""Testes de domínio para notifications.service (Notificação — ADR-0017).

Cobrem o núcleo: criar a Notificação por destinatário, listar só as do
destinatário, estado lida/não-lida e contador de não-lidas, e o filtro por
`Preferências de Notificação` (invariante 20).
"""

import uuid
from collections.abc import Iterator

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

import traveltogether.trips.models  # noqa: F401  # pyright: ignore[reportUnusedImport]  # FK trips
from traveltogether.identity.models import User
from traveltogether.identity.notification_prefs_service import update_notification_prefs
from traveltogether.notifications.models import NotificationKind
from traveltogether.notifications.service import (
    count_unread,
    list_for_user,
    mark_all_read,
    mark_read,
    notify,
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


@pytest.fixture(name="user")
def user_fixture(session: Session) -> User:
    user = User(id=uuid.uuid4(), email="alice@example.com")
    session.add(user)
    session.commit()
    return user


def test_notify_creates_notification_listed_for_recipient(session: Session, user: User) -> None:
    notify(
        session,
        recipient_id=user.id,
        kind=NotificationKind.invite,
        text="Você foi convidado para Eurotrip",
        trip_id=uuid.uuid4(),
    )

    items = list_for_user(session, user.id)

    assert len(items) == 1
    assert items[0].recipient_id == user.id
    assert items[0].kind == NotificationKind.invite
    assert items[0].read_at is None
    assert count_unread(session, user.id) == 1


def test_mark_read_flips_state_and_drops_unread_count(session: Session, user: User) -> None:
    created = notify(
        session,
        recipient_id=user.id,
        kind=NotificationKind.decision,
        text="Escolhida marcada",
        trip_id=uuid.uuid4(),
    )
    assert created is not None

    marked = mark_read(session, created, user.id)

    assert marked.read_at is not None
    assert count_unread(session, user.id) == 0


def test_mark_all_read_clears_every_unread(session: Session, user: User) -> None:
    trip = uuid.uuid4()
    for _ in range(3):
        notify(session, recipient_id=user.id, kind=NotificationKind.task, text="t", trip_id=trip)

    mark_all_read(session, user.id)

    assert count_unread(session, user.id) == 0


def test_list_and_count_are_per_recipient(session: Session, user: User) -> None:
    other = User(id=uuid.uuid4(), email="bob@example.com")
    session.add(other)
    session.commit()
    notify(
        session, recipient_id=user.id, kind=NotificationKind.invite, text="a", trip_id=uuid.uuid4()
    )
    notify(
        session, recipient_id=other.id, kind=NotificationKind.invite, text="b", trip_id=uuid.uuid4()
    )

    assert len(list_for_user(session, user.id)) == 1
    assert count_unread(session, other.id) == 1


def test_notify_respects_prefs_toggle_off(session: Session, user: User) -> None:
    # Destinatário desligou avisos de `decision`.
    update_notification_prefs(session, user.id, decision=False)

    suppressed = notify(
        session,
        recipient_id=user.id,
        kind=NotificationKind.decision,
        text="não deve aparecer",
        trip_id=uuid.uuid4(),
    )

    assert suppressed is None
    assert list_for_user(session, user.id) == []


def test_invite_is_always_delivered_regardless_of_prefs(session: Session, user: User) -> None:
    # Mesmo com tudo desligado, `invite` não tem interruptor — sempre entrega.
    update_notification_prefs(session, user.id, decision=False, task=False, mention=False)

    delivered = notify(
        session,
        recipient_id=user.id,
        kind=NotificationKind.invite,
        text="você foi convidado",
        trip_id=uuid.uuid4(),
    )

    assert delivered is not None
    assert len(list_for_user(session, user.id)) == 1
