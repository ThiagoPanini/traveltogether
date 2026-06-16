"""Testes do digest por e-mail de Notificações (ADR-0017, #112).

Cobrem: a agregação pura das `Notificação`s não lidas agrupadas por Viagem, e a
orquestração do job — um e-mail por destinatário, respeitando a preferência de
`digest` e a marca d'água do último envio (não reenvia o que já foi mandado).
"""

import uuid
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.identity.models import User
from traveltogether.identity.notification_prefs_service import update_notification_prefs
from traveltogether.notifications.digest_service import (
    DigestEmail,
    build_digest_groups,
    run_digest,
)
from traveltogether.notifications.models import Notification, NotificationKind
from traveltogether.trips.models import Trip


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


def _notif(trip_id: uuid.UUID, text: str) -> Notification:
    return Notification(
        recipient_id=uuid.uuid4(),
        kind=NotificationKind.task,
        trip_id=trip_id,
        text=text,
    )


def test_build_digest_groups_empty_when_no_notifications() -> None:
    assert build_digest_groups([], {}) == []


def test_build_digest_groups_groups_by_trip_in_order() -> None:
    eurotrip = uuid.uuid4()
    andes = uuid.uuid4()
    notifs = [
        _notif(eurotrip, "Tarefa atribuída a você"),
        _notif(andes, "Escolhida marcada"),
        _notif(eurotrip, "Você foi mencionado"),
    ]
    names = {eurotrip: "Eurotrip", andes: "Andes 2027"}

    groups = build_digest_groups(notifs, names)

    assert [g.trip_id for g in groups] == [eurotrip, andes]
    assert groups[0].trip_name == "Eurotrip"
    assert groups[0].lines == ["Tarefa atribuída a você", "Você foi mencionado"]
    assert groups[1].lines == ["Escolhida marcada"]


def test_build_digest_groups_falls_back_to_generic_trip_name() -> None:
    trip = uuid.uuid4()
    groups = build_digest_groups([_notif(trip, "algo")], {})
    assert groups[0].trip_name == "Viagem"


def _persist_user(session: Session, email: str, *, digest: bool) -> User:
    user = User(id=uuid.uuid4(), email=email, display_name=email.split("@")[0])
    session.add(user)
    session.commit()
    update_notification_prefs(session, user.id, digest=digest)
    return user


def _persist_trip(session: Session, name: str) -> Trip:
    trip = Trip(id=uuid.uuid4(), name=name, origin="São Paulo", created_by=uuid.uuid4())
    session.add(trip)
    session.commit()
    return trip


def _persist_notif(
    session: Session,
    recipient: User,
    trip: Trip,
    text: str,
    *,
    created_at: datetime | None = None,
) -> None:
    notification = Notification(
        recipient_id=recipient.id,
        kind=NotificationKind.task,
        trip_id=trip.id,
        text=text,
    )
    if created_at is not None:
        notification.created_at = created_at
    session.add(notification)
    session.commit()


def test_run_digest_sends_one_email_to_opted_in_recipient(session: Session) -> None:
    user = _persist_user(session, "alice@example.com", digest=True)
    trip = _persist_trip(session, "Eurotrip")
    _persist_notif(session, user, trip, "Tarefa atribuída a você")
    _persist_notif(session, user, trip, "Você foi mencionado")
    sent: list[DigestEmail] = []

    emailed = run_digest(session, send=sent.append)

    assert emailed == [user.id]
    assert len(sent) == 1
    assert sent[0].recipient_email == "alice@example.com"
    assert sent[0].groups[0].trip_name == "Eurotrip"
    assert sent[0].groups[0].lines == ["Tarefa atribuída a você", "Você foi mencionado"]


def test_run_digest_skips_opted_out_recipient(session: Session) -> None:
    optin = _persist_user(session, "alice@example.com", digest=True)
    optout = _persist_user(session, "bob@example.com", digest=False)
    trip = _persist_trip(session, "Eurotrip")
    _persist_notif(session, optin, trip, "para alice")
    _persist_notif(session, optout, trip, "para bob")
    sent: list[DigestEmail] = []

    emailed = run_digest(session, send=sent.append)

    assert emailed == [optin.id]
    assert [e.recipient_email for e in sent] == ["alice@example.com"]


def test_run_digest_uses_watermark_to_avoid_resending(session: Session) -> None:
    base = datetime(2026, 1, 1, tzinfo=UTC)
    user = _persist_user(session, "alice@example.com", digest=True)
    trip = _persist_trip(session, "Eurotrip")
    _persist_notif(session, user, trip, "primeiro", created_at=base)
    sent: list[DigestEmail] = []

    first = run_digest(session, send=sent.append, now=base + timedelta(minutes=1))
    assert first == [user.id]

    # Segunda passada sem nada novo: não reenvia.
    again = run_digest(session, send=sent.append, now=base + timedelta(minutes=2))
    assert again == []
    assert len(sent) == 1

    # Chega uma Notificação nova depois do último envio: só ela vai no próximo digest.
    _persist_notif(session, user, trip, "segundo", created_at=base + timedelta(minutes=3))
    third = run_digest(session, send=sent.append, now=base + timedelta(minutes=4))
    assert third == [user.id]
    assert len(sent) == 2
    assert sent[1].groups[0].lines == ["segundo"]
