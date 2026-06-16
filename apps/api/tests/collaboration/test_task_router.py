"""Testes de integração dos endpoints de Tarefa (collaboration, invariante 18)."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.identity.auth import generate_token
from traveltogether.main import app
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


def _auth(email: str, monkeypatch: pytest.MonkeyPatch) -> dict[str, str]:
    monkeypatch.setenv("AUTH_SECRET", TEST_SECRET)
    return {"Authorization": f"Bearer {generate_token(email, secret=TEST_SECRET)}"}


def _create_trip(client: TestClient, headers: dict[str, str]) -> str:
    res = client.post(
        "/trips",
        json={"name": "Trip", "description": "", "origin": "São Paulo"},
        headers=headers,
    )
    assert res.status_code == 201
    return res.json()["trip"]["id"]


def _add_member(
    client: TestClient,
    trip_id: str,
    email: str,
    organizer: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
) -> str:
    res = client.post(
        f"/trips/{trip_id}/members",
        json={"email": email, "role": "member"},
        headers=organizer,
    )
    assert res.status_code in (200, 201)
    # ADR-0015: convite vira Membership só no aceite explícito. O usuário
    # materializa (JIT) ao autenticar e então aceita o convite.
    member_h = _auth(email, monkeypatch)
    me = client.get("/identity/me", headers=member_h)
    assert me.status_code == 200
    invites = client.get("/me/invitations", headers=member_h).json()
    client.post(f"/me/invitations/{invites[0]['id']}/accept", headers=member_h)
    return me.json()["id"]


def test_organizer_creates_and_assignee_moves(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice = _auth(ALICE_EMAIL, monkeypatch)
    trip_id = _create_trip(client, alice)
    bob_id = _add_member(client, trip_id, BOB_EMAIL, alice, monkeypatch)

    created = client.post(
        f"/trips/{trip_id}/tasks",
        json={"title": "Reservar hotel", "assignee_ids": [bob_id]},
        headers=alice,
    )
    assert created.status_code == 201
    task = created.json()
    assert task["status"] == "todo"
    assert task["assignee_ids"] == [bob_id]
    assert task["assignees"][0]["user_id"] == bob_id

    # Bob (Responsável, Membro) move o status.
    bob = _auth(BOB_EMAIL, monkeypatch)
    moved = client.patch(f"/tasks/{task['id']}/status", json={"status": "doing"}, headers=bob)
    assert moved.status_code == 200
    assert moved.json()["status"] == "doing"


def test_member_cannot_create_task(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    alice = _auth(ALICE_EMAIL, monkeypatch)
    trip_id = _create_trip(client, alice)
    _add_member(client, trip_id, BOB_EMAIL, alice, monkeypatch)
    bob = _auth(BOB_EMAIL, monkeypatch)

    res = client.post(
        f"/trips/{trip_id}/tasks",
        json={"title": "Não pode"},
        headers=bob,
    )
    assert res.status_code == 403


def test_my_tasks_lists_assigned(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    alice = _auth(ALICE_EMAIL, monkeypatch)
    trip_id = _create_trip(client, alice)
    bob_id = _add_member(client, trip_id, BOB_EMAIL, alice, monkeypatch)
    client.post(
        f"/trips/{trip_id}/tasks",
        json={"title": "Levar adaptador", "assignee_ids": [bob_id]},
        headers=alice,
    )

    bob = _auth(BOB_EMAIL, monkeypatch)
    mine = client.get("/me/tasks", headers=bob)
    assert mine.status_code == 200
    assert len(mine.json()) == 1
    assert mine.json()[0]["title"] == "Levar adaptador"
