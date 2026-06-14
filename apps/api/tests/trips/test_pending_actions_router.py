"""Testes do endpoint GET /me/pending-actions (painel #58)."""

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
    return {"Authorization": f"Bearer {generate_token(email, secret=TEST_SECRET)}"}


def test_requires_auth(client: TestClient) -> None:
    assert client.get("/me/pending-actions").status_code == 401


def test_empty_when_no_trips(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    response = client.get("/me/pending-actions", headers=headers)
    assert response.status_code == 200
    assert response.json() == []


def test_lists_stop_without_itinerary(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = client.post(
        "/trips",
        json={"name": "Eurotrip", "description": "", "origin": "São Paulo"},
        headers=headers,
    ).json()["trip"]
    client.post(f"/trips/{trip['id']}/stops", json={"city": "Lisboa"}, headers=headers)

    actions = client.get("/me/pending-actions", headers=headers).json()
    kinds = {a["kind"] for a in actions}
    assert "stop_without_itinerary" in kinds
    stop_pend = next(a for a in actions if a["kind"] == "stop_without_itinerary")
    assert stop_pend["trip_name"] == "Eurotrip"
    assert stop_pend["label"] == "Lisboa"
