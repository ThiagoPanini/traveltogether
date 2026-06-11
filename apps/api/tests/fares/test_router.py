"""Testes de integração para endpoints de pesquisas de passagem (fares)."""

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


def _create_leg(client: TestClient, headers: dict[str, str]) -> dict[str, object]:
    trip_res = client.post(
        "/trips",
        json={"name": "Trip", "description": "", "origin": "São Paulo"},
        headers=headers,
    )
    trip_id = trip_res.json()["trip"]["id"]
    leg_res = client.post(f"/trips/{trip_id}/legs", json={}, headers=headers)
    assert leg_res.status_code == 201
    return leg_res.json()


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
    "link": "",
    "notes": "",
}


def test_post_fare_creates_fare_and_returns_201(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    leg = _create_leg(client, headers)
    res = client.post(f"/legs/{leg['id']}/fares", json=FARE_PAYLOAD, headers=headers)
    assert res.status_code == 201
    body = res.json()
    assert body["airline"] == "LATAM"
    assert body["currency"] == "BRL"
    assert body["leg_id"] == leg["id"]


def test_get_fares_returns_list(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    leg = _create_leg(client, headers)
    client.post(f"/legs/{leg['id']}/fares", json=FARE_PAYLOAD, headers=headers)
    client.post(
        f"/legs/{leg['id']}/fares",
        json={**FARE_PAYLOAD, "airline": "Gol"},
        headers=headers,
    )
    res = client.get(f"/legs/{leg['id']}/fares", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_post_fare_by_non_member_returns_403(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    bob_headers = _auth_headers(BOB_EMAIL, monkeypatch)
    leg = _create_leg(client, alice_headers)
    res = client.post(f"/legs/{leg['id']}/fares", json=FARE_PAYLOAD, headers=bob_headers)
    assert res.status_code == 403


def test_patch_fare_updates_airline(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    leg = _create_leg(client, headers)
    fare_res = client.post(f"/legs/{leg['id']}/fares", json=FARE_PAYLOAD, headers=headers)
    fare_id = fare_res.json()["id"]
    res = client.patch(
        f"/legs/{leg['id']}/fares/{fare_id}",
        json={"airline": "Azul"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["airline"] == "Azul"


def test_delete_fare_returns_204(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    leg = _create_leg(client, headers)
    fare_res = client.post(f"/legs/{leg['id']}/fares", json=FARE_PAYLOAD, headers=headers)
    fare_id = fare_res.json()["id"]
    res = client.delete(f"/legs/{leg['id']}/fares/{fare_id}", headers=headers)
    assert res.status_code == 204


def test_fare_not_found_returns_404(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    leg = _create_leg(client, headers)
    fake_id = str(uuid.uuid4())
    res = client.patch(
        f"/legs/{leg['id']}/fares/{fake_id}",
        json={"airline": "Nope"},
        headers=headers,
    )
    assert res.status_code == 404


def test_organizer_can_delete_any_fare(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    alice_headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    leg = _create_leg(client, alice_headers)
    fare_res = client.post(f"/legs/{leg['id']}/fares", json=FARE_PAYLOAD, headers=alice_headers)
    fare_id = fare_res.json()["id"]
    res = client.delete(f"/legs/{leg['id']}/fares/{fare_id}", headers=alice_headers)
    assert res.status_code == 204


def test_get_fares_includes_upvote_count_and_user_voted(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    bob_headers = _auth_headers(BOB_EMAIL, monkeypatch)
    leg = _create_leg(client, alice_headers)
    fare_res = client.post(f"/legs/{leg['id']}/fares", json=FARE_PAYLOAD, headers=alice_headers)
    fare_id = fare_res.json()["id"]

    # initially no votes
    fares = client.get(f"/legs/{leg['id']}/fares", headers=alice_headers).json()
    assert fares[0]["upvote_count"] == 0
    assert fares[0]["user_voted"] is False

    # alice upvotes
    client.post(f"/fares/{fare_id}/upvote", headers=alice_headers)

    # after alice votes: count=1, alice user_voted=True, bob user_voted=False
    alice_fares = client.get(f"/legs/{leg['id']}/fares", headers=alice_headers).json()
    assert alice_fares[0]["upvote_count"] == 1
    assert alice_fares[0]["user_voted"] is True

    # add bob as member
    client.post(
        f"/trips/{leg['trip_id']}/members",
        json={"email": BOB_EMAIL, "role": "member"},
        headers=alice_headers,
    )
    client.get(f"/legs/{leg['id']}/fares", headers=bob_headers)

    bob_fares = client.get(f"/legs/{leg['id']}/fares", headers=bob_headers).json()
    assert bob_fares[0]["upvote_count"] == 1
    assert bob_fares[0]["user_voted"] is False
