from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine

from traveltogether.db import database_ready, get_engine_dep
from traveltogether.main import app


@pytest.fixture
def client() -> Iterator[TestClient]:
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_readiness_ok_when_db_reachable(client: TestClient) -> None:
    engine = create_engine("sqlite://")
    app.dependency_overrides[get_engine_dep] = lambda: engine

    response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "up"}


def test_readiness_503_when_db_unavailable(client: TestClient) -> None:
    app.dependency_overrides[get_engine_dep] = lambda: None

    response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json() == {"status": "error", "database": "down"}


def test_database_ready_true_for_live_engine() -> None:
    engine: Engine = create_engine("sqlite://")
    assert database_ready(engine) is True


def test_database_ready_false_when_engine_missing() -> None:
    assert database_ready(None) is False
