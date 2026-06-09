"""Testes de integração para o endpoint de upvotes."""

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


FARE_PAYLOAD = {
    "value": "1500.00",
    "currency": "BRL",
    "flight_date": "2025-09-01T10:00:00",
    "duration_minutes": 180,
    "stops": 0,
    "checked_baggage": True,
    "origin_airport": "GRU",
    "destination_airport": "EZE",
    "airline": "LATAM",
}


def _create_fare(client: TestClient, headers: dict[str, str]) -> dict[str, object]:
    trip_res = client.post(
        "/trips",
        json={"name": "Trip", "description": "", "origin": "São Paulo"},
        headers=headers,
    )
    trip_id = trip_res.json()["trip"]["id"]
    leg_res = client.post(f"/trips/{trip_id}/legs", json={}, headers=headers)
    leg_id = leg_res.json()["id"]
    fare_res = client.post(f"/legs/{leg_id}/fares", json=FARE_PAYLOAD, headers=headers)
    assert fare_res.status_code == 201
    return fare_res.json()


def test_post_upvote_adds_upvote(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    fare = _create_fare(client, headers)
    res = client.post(f"/fares/{fare['id']}/upvote", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["count"] == 1
    assert body["voted"] is True


def test_post_upvote_twice_removes_upvote(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    fare = _create_fare(client, headers)
    client.post(f"/fares/{fare['id']}/upvote", headers=headers)
    res = client.post(f"/fares/{fare['id']}/upvote", headers=headers)
    assert res.status_code == 200
    assert res.json()["count"] == 0
    assert res.json()["voted"] is False


def test_post_upvote_by_non_member_returns_403(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    bob_headers = _auth_headers(BOB_EMAIL, monkeypatch)
    fare = _create_fare(client, alice_headers)
    res = client.post(f"/fares/{fare['id']}/upvote", headers=bob_headers)
    assert res.status_code == 403


def test_get_fare_includes_upvote_count(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    fare = _create_fare(client, headers)
    client.post(f"/fares/{fare['id']}/upvote", headers=headers)
    res = client.get(f"/fares/{fare['id']}/upvote", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["count"] == 1
    assert body["voted"] is True
