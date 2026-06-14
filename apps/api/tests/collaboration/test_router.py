"""Testes de integração dos endpoints de Comentário (collaboration)."""

import uuid
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
CAROL_EMAIL = "carol@example.com"


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


def _create_trip(client: TestClient, headers: dict[str, str]) -> str:
    res = client.post(
        "/trips",
        json={"name": "Trip", "description": "", "origin": "São Paulo"},
        headers=headers,
    )
    assert res.status_code == 201
    return res.json()["trip"]["id"]


def test_member_posts_and_lists_comment(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip_id = _create_trip(client, headers)
    target_id = str(uuid.uuid4())

    post = client.post(
        f"/trips/{trip_id}/comments",
        json={"target_type": "fare_quote", "target_id": target_id, "body": "ótimo preço"},
        headers=headers,
    )
    assert post.status_code == 201
    assert post.json()["body"] == "ótimo preço"

    listed = client.get(
        f"/trips/{trip_id}/comments",
        params={"target_type": "fare_quote", "target_id": target_id},
        headers=headers,
    )
    assert listed.status_code == 200
    body = listed.json()
    assert len(body) == 1
    assert body[0]["body"] == "ótimo preço"


def test_non_member_cannot_post(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    alice = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip_id = _create_trip(client, alice)
    bob = _auth_headers(BOB_EMAIL, monkeypatch)

    res = client.post(
        f"/trips/{trip_id}/comments",
        json={"target_type": "fare_quote", "target_id": str(uuid.uuid4()), "body": "oi"},
        headers=bob,
    )
    assert res.status_code == 403


def test_only_author_patches(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    alice = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip_id = _create_trip(client, alice)
    target_id = str(uuid.uuid4())
    created = client.post(
        f"/trips/{trip_id}/comments",
        json={"target_type": "trip", "target_id": target_id, "body": "original"},
        headers=alice,
    ).json()

    edited = client.patch(f"/comments/{created['id']}", json={"body": "editado"}, headers=alice)
    assert edited.status_code == 200
    assert edited.json()["body"] == "editado"


def test_organizer_deletes_member_comment(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Alice (organizer) cria viagem e convida Bob; Bob comenta; Alice apaga.
    alice = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip_id = _create_trip(client, alice)
    invite = client.post(
        f"/trips/{trip_id}/members",
        json={"email": BOB_EMAIL, "role": "member"},
        headers=alice,
    )
    assert invite.status_code in (200, 201)

    bob = _auth_headers(BOB_EMAIL, monkeypatch)
    target_id = str(uuid.uuid4())
    comment = client.post(
        f"/trips/{trip_id}/comments",
        json={"target_type": "fare_quote", "target_id": target_id, "body": "do bob"},
        headers=bob,
    ).json()

    deleted = client.delete(f"/comments/{comment['id']}", headers=alice)
    assert deleted.status_code == 204
