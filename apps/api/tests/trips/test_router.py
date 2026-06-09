"""Testes de integração para os endpoints do boundary trips."""

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


def _auth_headers(email: str, monkeypatch: pytest.MonkeyPatch) -> dict[str, str]:
    monkeypatch.setenv("AUTH_SECRET", TEST_SECRET)
    token = generate_token(email, secret=TEST_SECRET)
    return {"Authorization": f"Bearer {token}"}


def test_post_trips_creates_trip_and_returns_201(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    payload = {"name": "NYC Weekend", "description": "Fim de semana", "origin": "São Paulo"}

    response = client.post("/trips", json=payload, headers=headers)

    assert response.status_code == 201
    data = response.json()
    assert data["trip"]["name"] == "NYC Weekend"
    assert data["trip"]["origin"] == "São Paulo"
    assert data["membership"]["role"] == "organizer"


def test_post_trips_returns_401_without_token(client: TestClient) -> None:
    response = client.post("/trips", json={"name": "T", "description": "", "origin": "SP"})
    assert response.status_code == 401


def test_get_trips_returns_user_trips(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    payload_a = {"name": "Trip A", "description": "", "origin": "SP"}
    payload_b = {"name": "Trip B", "description": "", "origin": "RJ"}
    client.post("/trips", json=payload_a, headers=headers)
    client.post("/trips", json=payload_b, headers=headers)

    response = client.get("/trips", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = {item["trip"]["name"] for item in data}
    assert names == {"Trip A", "Trip B"}


def test_get_trips_returns_empty_list_for_new_user(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    response = client.get("/trips", headers=headers)
    assert response.status_code == 200
    assert response.json() == []


def test_get_trip_detail_returns_trip(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    create_resp = client.post(
        "/trips", json={"name": "NYC", "description": "", "origin": "SP"}, headers=headers
    )
    trip_id = create_resp.json()["trip"]["id"]

    response = client.get(f"/trips/{trip_id}", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["trip"]["id"] == trip_id
    assert data["membership"]["role"] == "organizer"


def test_get_trip_detail_returns_403_for_non_member(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    bob_headers = _auth_headers(BOB_EMAIL, monkeypatch)

    create_resp = client.post(
        "/trips", json={"name": "Alice's Trip", "description": "", "origin": "SP"},
        headers=alice_headers,
    )
    trip_id = create_resp.json()["trip"]["id"]

    response = client.get(f"/trips/{trip_id}", headers=bob_headers)
    assert response.status_code == 403


def test_patch_trip_updates_metadata_for_organizer(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    create_resp = client.post(
        "/trips", json={"name": "Old Name", "description": "", "origin": "SP"}, headers=headers
    )
    trip_id = create_resp.json()["trip"]["id"]

    response = client.patch(f"/trips/{trip_id}", json={"name": "New Name"}, headers=headers)

    assert response.status_code == 200
    assert response.json()["name"] == "New Name"


def test_patch_trip_returns_403_for_non_member(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    bob_headers = _auth_headers(BOB_EMAIL, monkeypatch)

    create_resp = client.post(
        "/trips", json={"name": "Alice Trip", "description": "", "origin": "SP"},
        headers=alice_headers,
    )
    trip_id = create_resp.json()["trip"]["id"]

    response = client.patch(f"/trips/{trip_id}", json={"name": "Hijacked"}, headers=bob_headers)
    assert response.status_code == 403
