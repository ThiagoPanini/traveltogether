"""Testes de integração para endpoints de paradas (stops)."""

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


def test_post_stop_creates_stop_and_returns_201(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    res = client.post(
        f"/trips/{trip['id']}/stops",
        json={"city": "Buenos Aires"},
        headers=headers,
    )
    assert res.status_code == 201
    body = res.json()
    assert body["city"] == "Buenos Aires"
    assert body["order"] == 1
    assert body["trip_id"] == trip["id"]


def test_post_stop_updates_derived_legs(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    first = client.post(
        f"/trips/{trip['id']}/stops",
        json={"city": "Buenos Aires"},
        headers=headers,
    ).json()
    second = client.post(
        f"/trips/{trip['id']}/stops",
        json={"city": "Montevideo"},
        headers=headers,
    ).json()

    res = client.get(f"/trips/{trip['id']}/legs", headers=headers)

    assert res.status_code == 200
    pairs = [(leg["origin_stop_id"], leg["destination_stop_id"]) for leg in res.json()]
    assert pairs == [
        (None, first["id"]),
        (first["id"], second["id"]),
        (second["id"], None),
    ]


def test_get_stops_returns_ordered_list(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    client.post(f"/trips/{trip['id']}/stops", json={"city": "A"}, headers=headers)
    client.post(f"/trips/{trip['id']}/stops", json={"city": "B"}, headers=headers)
    res = client.get(f"/trips/{trip['id']}/stops", headers=headers)
    assert res.status_code == 200
    cities = [s["city"] for s in res.json()]
    assert cities == ["A", "B"]


def test_post_stop_by_non_organizer_returns_403(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    bob_headers = _auth_headers(BOB_EMAIL, monkeypatch)
    trip = _create_trip(client, alice_headers)
    res = client.post(
        f"/trips/{trip['id']}/stops",
        json={"city": "Buenos Aires"},
        headers=bob_headers,
    )
    assert res.status_code == 403


def test_patch_stop_updates_city(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    stop_res = client.post(f"/trips/{trip['id']}/stops", json={"city": "Lima"}, headers=headers)
    stop_id = stop_res.json()["id"]
    res = client.patch(
        f"/trips/{trip['id']}/stops/{stop_id}",
        json={"city": "Cusco"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["city"] == "Cusco"


def test_delete_stop_returns_204(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    stop_res = client.post(f"/trips/{trip['id']}/stops", json={"city": "Bogotá"}, headers=headers)
    stop_id = stop_res.json()["id"]
    res = client.delete(f"/trips/{trip['id']}/stops/{stop_id}", headers=headers)
    assert res.status_code == 204


def test_delete_stop_returns_409_when_derived_leg_has_fare(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    first = client.post(f"/trips/{trip['id']}/stops", json={"city": "Lima"}, headers=headers).json()
    second = client.post(
        f"/trips/{trip['id']}/stops", json={"city": "Quito"}, headers=headers
    ).json()
    legs = client.get(f"/trips/{trip['id']}/legs", headers=headers).json()
    anchored_leg = next(
        leg
        for leg in legs
        if leg["origin_stop_id"] == first["id"] and leg["destination_stop_id"] == second["id"]
    )
    fare_res = client.post(f"/legs/{anchored_leg['id']}/fares", json=FARE_PAYLOAD, headers=headers)
    assert fare_res.status_code == 201

    res = client.delete(f"/trips/{trip['id']}/stops/{second['id']}", headers=headers)

    assert res.status_code == 409
    stops = client.get(f"/trips/{trip['id']}/stops", headers=headers).json()
    assert [stop["id"] for stop in stops] == [first["id"], second["id"]]


def test_post_stop_returns_409_when_existing_derived_leg_has_fare(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    first = client.post(f"/trips/{trip['id']}/stops", json={"city": "Lima"}, headers=headers).json()
    legs = client.get(f"/trips/{trip['id']}/legs", headers=headers).json()
    return_leg = next(leg for leg in legs if leg["origin_stop_id"] == first["id"])
    fare_res = client.post(f"/legs/{return_leg['id']}/fares", json=FARE_PAYLOAD, headers=headers)
    assert fare_res.status_code == 201

    res = client.post(f"/trips/{trip['id']}/stops", json={"city": "Quito"}, headers=headers)

    assert res.status_code == 409
    stops = client.get(f"/trips/{trip['id']}/stops", headers=headers).json()
    assert [stop["id"] for stop in stops] == [first["id"]]


def test_patch_stops_reorder(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    s1 = client.post(f"/trips/{trip['id']}/stops", json={"city": "X"}, headers=headers).json()
    s2 = client.post(f"/trips/{trip['id']}/stops", json={"city": "Y"}, headers=headers).json()
    s3 = client.post(f"/trips/{trip['id']}/stops", json={"city": "Z"}, headers=headers).json()
    res = client.patch(
        f"/trips/{trip['id']}/stops",
        json={"stop_ids": [s3["id"], s1["id"], s2["id"]]},
        headers=headers,
    )
    assert res.status_code == 200
    cities = [s["city"] for s in res.json()]
    assert cities == ["Z", "X", "Y"]


def test_patch_stops_reorder_updates_derived_legs(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    s1 = client.post(f"/trips/{trip['id']}/stops", json={"city": "X"}, headers=headers).json()
    s2 = client.post(f"/trips/{trip['id']}/stops", json={"city": "Y"}, headers=headers).json()
    s3 = client.post(f"/trips/{trip['id']}/stops", json={"city": "Z"}, headers=headers).json()

    res = client.patch(
        f"/trips/{trip['id']}/stops",
        json={"stop_ids": [s3["id"], s1["id"], s2["id"]]},
        headers=headers,
    )
    legs_res = client.get(f"/trips/{trip['id']}/legs", headers=headers)

    assert res.status_code == 200
    pairs = [(leg["origin_stop_id"], leg["destination_stop_id"]) for leg in legs_res.json()]
    assert pairs == [
        (None, s3["id"]),
        (s3["id"], s1["id"]),
        (s1["id"], s2["id"]),
        (s2["id"], None),
    ]


def test_patch_stops_reorder_returns_409_when_derived_leg_has_fare(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    s1 = client.post(f"/trips/{trip['id']}/stops", json={"city": "A"}, headers=headers).json()
    s2 = client.post(f"/trips/{trip['id']}/stops", json={"city": "B"}, headers=headers).json()
    s3 = client.post(f"/trips/{trip['id']}/stops", json={"city": "C"}, headers=headers).json()
    legs = client.get(f"/trips/{trip['id']}/legs", headers=headers).json()
    anchored_leg = next(
        leg
        for leg in legs
        if leg["origin_stop_id"] == s1["id"] and leg["destination_stop_id"] == s2["id"]
    )
    fare_res = client.post(f"/legs/{anchored_leg['id']}/fares", json=FARE_PAYLOAD, headers=headers)
    assert fare_res.status_code == 201

    res = client.patch(
        f"/trips/{trip['id']}/stops",
        json={"stop_ids": [s2["id"], s1["id"], s3["id"]]},
        headers=headers,
    )

    assert res.status_code == 409
    stops = client.get(f"/trips/{trip['id']}/stops", headers=headers).json()
    assert [stop["id"] for stop in stops] == [s1["id"], s2["id"], s3["id"]]


def test_get_stops_by_non_member_returns_403(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    bob_headers = _auth_headers(BOB_EMAIL, monkeypatch)
    trip = _create_trip(client, alice_headers)
    res = client.get(f"/trips/{trip['id']}/stops", headers=bob_headers)
    assert res.status_code == 403


def test_patch_stop_by_non_organizer_returns_403(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    bob_headers = _auth_headers(BOB_EMAIL, monkeypatch)
    trip = _create_trip(client, alice_headers)
    stop_res = client.post(
        f"/trips/{trip['id']}/stops", json={"city": "Quito"}, headers=alice_headers
    )
    stop_id = stop_res.json()["id"]
    res = client.patch(
        f"/trips/{trip['id']}/stops/{stop_id}",
        json={"city": "Guayaquil"},
        headers=bob_headers,
    )
    assert res.status_code == 403


def test_stop_not_found_returns_404(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    fake_id = str(uuid.uuid4())
    res = client.patch(
        f"/trips/{trip['id']}/stops/{fake_id}",
        json={"city": "Nowhere"},
        headers=headers,
    )
    assert res.status_code == 404
