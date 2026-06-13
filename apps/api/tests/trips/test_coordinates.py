"""Persistência de coordenadas (lat/lon) em Origem (Trip) e Parada (Stop).

Vindas da seleção no autocomplete de aeroporto (issue #59); abrem caminho
para o mapa geográfico (issue #68).
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.identity.auth import generate_token
from traveltogether.main import app
from traveltogether.platform.db import get_session

TEST_SECRET = "public-test-auth-secret-not-for-production"


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


def _headers(monkeypatch: pytest.MonkeyPatch) -> dict[str, str]:
    monkeypatch.setenv("AUTH_SECRET", TEST_SECRET)
    return {"Authorization": f"Bearer {generate_token('alice@example.com', secret=TEST_SECRET)}"}


def test_create_trip_persists_origin_coordinates(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    r = client.post(
        "/trips",
        json={
            "name": "Europa",
            "description": "",
            "origin": "Lisboa",
            "airport_code": "LIS",
            "latitude": 38.7742,
            "longitude": -9.1342,
        },
        headers=_headers(monkeypatch),
    )
    assert r.status_code == 201
    trip = r.json()["trip"]
    assert trip["latitude"] == 38.7742
    assert trip["longitude"] == -9.1342


def test_create_stop_persists_coordinates(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _headers(monkeypatch)
    trip_id = client.post(
        "/trips",
        json={"name": "T", "description": "", "origin": "Lisboa"},
        headers=headers,
    ).json()["trip"]["id"]

    r = client.post(
        f"/trips/{trip_id}/stops",
        json={"city": "Paris", "airport_code": "CDG", "latitude": 49.0097, "longitude": 2.5479},
        headers=headers,
    )
    assert r.status_code == 201
    stop = r.json()
    assert stop["latitude"] == 49.0097
    assert stop["longitude"] == 2.5479
