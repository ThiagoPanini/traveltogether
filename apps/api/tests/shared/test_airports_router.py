"""Testes do endpoint GET /airports/search.

Comportamentos verificados:
  1. Busca por cidade devolve 200 com o IATA correspondente.
  2. Sem token → 401.
  3. Query em branco → 200 com lista vazia.
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


def test_search_returns_matches(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    r = client.get("/airports/search?q=lisboa", headers=_headers(monkeypatch))
    assert r.status_code == 200
    assert any(a["iata"] == "LIS" for a in r.json())


def test_search_requires_token(client: TestClient) -> None:
    assert client.get("/airports/search?q=lisboa").status_code == 401


def test_search_blank_query_returns_empty(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    r = client.get("/airports/search?q=", headers=_headers(monkeypatch))
    assert r.status_code == 200
    assert r.json() == []
