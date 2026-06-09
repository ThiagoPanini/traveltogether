"""Testes de integração para o endpoint de escolha de passagem."""

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
    return {"fare": fare_res.json(), "leg_id": leg_id, "trip_id": trip_id}


def test_organizer_can_mark_chosen(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    data = _create_fare(client, headers)
    fare = data["fare"]
    assert isinstance(fare, dict)
    leg_id = data["leg_id"]
    res = client.post(f"/legs/{leg_id}/fares/{fare['id']}/choose", headers=headers)
    assert res.status_code == 200
    assert res.json()["is_chosen"] is True


def test_mark_chosen_toggle(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    data = _create_fare(client, headers)
    fare = data["fare"]
    assert isinstance(fare, dict)
    leg_id = data["leg_id"]
    client.post(f"/legs/{leg_id}/fares/{fare['id']}/choose", headers=headers)
    res = client.post(f"/legs/{leg_id}/fares/{fare['id']}/choose", headers=headers)
    assert res.json()["is_chosen"] is False


def test_mark_chosen_moves_mark(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    data = _create_fare(client, headers)
    leg_id = data["leg_id"]
    assert isinstance(leg_id, str)
    fare_b_res = client.post(f"/legs/{leg_id}/fares", json=FARE_PAYLOAD, headers=headers)
    fare_a = data["fare"]
    fare_b = fare_b_res.json()
    assert isinstance(fare_a, dict)

    client.post(f"/legs/{leg_id}/fares/{fare_a['id']}/choose", headers=headers)
    client.post(f"/legs/{leg_id}/fares/{fare_b['id']}/choose", headers=headers)

    fares_res = client.get(f"/legs/{leg_id}/fares", headers=headers)
    fares = {f["id"]: f for f in fares_res.json()}
    assert fares[fare_a["id"]]["is_chosen"] is False
    assert fares[fare_b["id"]]["is_chosen"] is True


def test_member_cannot_mark_chosen(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    alice_headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    bob_headers = _auth_headers(BOB_EMAIL, monkeypatch)
    data = _create_fare(client, alice_headers)
    fare = data["fare"]
    assert isinstance(fare, dict)
    leg_id = data["leg_id"]
    trip_id = data["trip_id"]
    client.post(
        f"/trips/{trip_id}/members",
        json={"email": BOB_EMAIL, "role": "member"},
        headers=alice_headers,
    )
    res = client.post(f"/legs/{leg_id}/fares/{fare['id']}/choose", headers=bob_headers)
    assert res.status_code == 403
