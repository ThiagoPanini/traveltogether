"""Testes de integração para endpoints de trajetos (legs)."""

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


def _create_trip(client: TestClient, headers: dict[str, str]) -> dict[str, object]:
    res = client.post(
        "/trips",
        json={"name": "Road Trip", "description": "", "origin": "São Paulo"},
        headers=headers,
    )
    assert res.status_code == 201
    return res.json()["trip"]


def _create_stop(
    client: TestClient, headers: dict[str, str], trip_id: object, city: str
) -> dict[str, object]:
    res = client.post(f"/trips/{trip_id}/stops", json={"city": city}, headers=headers)
    assert res.status_code == 201
    return res.json()


def test_post_leg_creates_leg_and_returns_201(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    s1 = _create_stop(client, headers, trip["id"], "Buenos Aires")
    s2 = _create_stop(client, headers, trip["id"], "Montevideo")
    res = client.post(
        f"/trips/{trip['id']}/legs",
        json={"origin_stop_id": s1["id"], "destination_stop_id": s2["id"]},
        headers=headers,
    )
    assert res.status_code == 201
    body = res.json()
    assert body["origin_stop_id"] == s1["id"]
    assert body["destination_stop_id"] == s2["id"]
    assert body["order"] == 1


def test_post_leg_with_null_home(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    s1 = _create_stop(client, headers, trip["id"], "Buenos Aires")
    res = client.post(
        f"/trips/{trip['id']}/legs",
        json={"origin_stop_id": None, "destination_stop_id": s1["id"]},
        headers=headers,
    )
    assert res.status_code == 201
    assert res.json()["origin_stop_id"] is None


def test_get_legs_returns_ordered_list(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    s1 = _create_stop(client, headers, trip["id"], "A")
    s2 = _create_stop(client, headers, trip["id"], "B")
    client.post(
        f"/trips/{trip['id']}/legs",
        json={"destination_stop_id": s1["id"]},
        headers=headers,
    )
    client.post(
        f"/trips/{trip['id']}/legs",
        json={"origin_stop_id": s1["id"], "destination_stop_id": s2["id"]},
        headers=headers,
    )
    res = client.get(f"/trips/{trip['id']}/legs", headers=headers)
    assert res.status_code == 200
    assert [leg["order"] for leg in res.json()] == [1, 2]


def test_post_leg_by_non_organizer_returns_403(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    bob_headers = _auth_headers(BOB_EMAIL, monkeypatch)
    trip = _create_trip(client, alice_headers)
    res = client.post(
        f"/trips/{trip['id']}/legs",
        json={"origin_stop_id": None, "destination_stop_id": None},
        headers=bob_headers,
    )
    assert res.status_code == 403


def test_delete_stop_returns_409_when_anchored(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    s1 = _create_stop(client, headers, trip["id"], "Lima")
    s2 = _create_stop(client, headers, trip["id"], "Quito")
    client.post(
        f"/trips/{trip['id']}/legs",
        json={"origin_stop_id": s1["id"], "destination_stop_id": s2["id"]},
        headers=headers,
    )
    res = client.delete(f"/trips/{trip['id']}/stops/{s1['id']}", headers=headers)
    assert res.status_code == 409


def test_delete_stop_succeeds_when_not_anchored(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    s1 = _create_stop(client, headers, trip["id"], "Lima")
    res = client.delete(f"/trips/{trip['id']}/stops/{s1['id']}", headers=headers)
    assert res.status_code == 204


def test_patch_leg_updates_target_date(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    s1 = _create_stop(client, headers, trip["id"], "Bogotá")
    leg_res = client.post(
        f"/trips/{trip['id']}/legs",
        json={"origin_stop_id": None, "destination_stop_id": s1["id"]},
        headers=headers,
    )
    leg_id = leg_res.json()["id"]
    res = client.patch(
        f"/trips/{trip['id']}/legs/{leg_id}",
        json={"target_date": "2025-09-01T00:00:00"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["target_date"] is not None


def test_delete_leg_returns_204(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    s1 = _create_stop(client, headers, trip["id"], "Caracas")
    leg_res = client.post(
        f"/trips/{trip['id']}/legs",
        json={"origin_stop_id": None, "destination_stop_id": s1["id"]},
        headers=headers,
    )
    leg_id = leg_res.json()["id"]
    res = client.delete(f"/trips/{trip['id']}/legs/{leg_id}", headers=headers)
    assert res.status_code == 204


def test_leg_not_found_returns_404(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    fake_id = str(uuid.uuid4())
    res = client.patch(
        f"/trips/{trip['id']}/legs/{fake_id}",
        json={"target_date": "2025-09-01T00:00:00"},
        headers=headers,
    )
    assert res.status_code == 404
