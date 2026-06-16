"""Testes HTTP do boundary notifications: inbox por destinatário e prefs.

Foco nos critérios de aceite: só o próprio destinatário lê/marca as suas
(invariante 20); contador de não-lidas; prefs persistidas e devolvidas.
"""

import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from traveltogether.identity.auth import generate_token
from traveltogether.identity.models import User
from traveltogether.main import app
from traveltogether.notifications.models import NotificationKind
from traveltogether.notifications.service import notify
from traveltogether.platform.db import get_session

TEST_SECRET = "public-test-auth-secret-not-for-production"
ALICE_EMAIL = "alice@example.com"
BOB_EMAIL = "bob@example.com"


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


@pytest.fixture(name="client")
def client_fixture(session: Session) -> Iterator[TestClient]:
    app.dependency_overrides[get_session] = lambda: session
    client = TestClient(app, raise_server_exceptions=True)
    yield client  # type: ignore[misc]
    app.dependency_overrides.clear()


def _auth_headers(email: str, monkeypatch: pytest.MonkeyPatch) -> dict[str, str]:
    monkeypatch.setenv("AUTH_SECRET", TEST_SECRET)
    token = generate_token(email, secret=TEST_SECRET)
    return {"Authorization": f"Bearer {token}"}


def _materialize_user(
    client: TestClient, session: Session, email: str, headers: dict[str, str]
) -> User:
    client.get("/identity/me", headers=headers)
    return session.exec(select(User).where(User.email == email)).one()


def test_inbox_lists_recipient_notifications_with_unread_count(
    client: TestClient, session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    alice = _materialize_user(client, session, ALICE_EMAIL, headers)
    notify(
        session,
        recipient_id=alice.id,
        kind=NotificationKind.invite,
        text="Você foi convidado",
        trip_id=uuid.uuid4(),
    )

    res = client.get("/me/notifications", headers=headers)

    assert res.status_code == 200
    body = res.json()
    assert body["unread_count"] == 1
    assert len(body["items"]) == 1
    assert body["items"][0]["kind"] == "invite"


def test_mark_read_endpoint_clears_unread(
    client: TestClient, session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    alice = _materialize_user(client, session, ALICE_EMAIL, headers)
    created = notify(
        session,
        recipient_id=alice.id,
        kind=NotificationKind.invite,
        text="x",
        trip_id=uuid.uuid4(),
    )
    assert created is not None

    res = client.post(f"/me/notifications/{created.id}/read", headers=headers)
    assert res.status_code == 200

    inbox = client.get("/me/notifications", headers=headers).json()
    assert inbox["unread_count"] == 0


def test_cannot_mark_another_users_notification(
    client: TestClient, session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    alice = _materialize_user(client, session, ALICE_EMAIL, alice_headers)
    created = notify(
        session,
        recipient_id=alice.id,
        kind=NotificationKind.invite,
        text="x",
        trip_id=uuid.uuid4(),
    )
    assert created is not None

    bob_headers = _auth_headers(BOB_EMAIL, monkeypatch)
    _materialize_user(client, session, BOB_EMAIL, bob_headers)
    res = client.post(f"/me/notifications/{created.id}/read", headers=bob_headers)
    assert res.status_code == 404


def test_get_and_update_prefs(
    client: TestClient, session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    _materialize_user(client, session, ALICE_EMAIL, headers)

    default = client.get("/me/notification-prefs", headers=headers).json()
    assert default == {"decision": True, "task": True, "mention": True, "digest": False}

    res = client.put(
        "/me/notification-prefs", json={"decision": False, "digest": True}, headers=headers
    )
    assert res.status_code == 200
    assert res.json() == {"decision": False, "task": True, "mention": True, "digest": True}
