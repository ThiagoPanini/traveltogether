"""Testes do endpoint GET /health.

Comportamentos verificados:
  1. Retorna {"status": "ok", "db": "ok"} quando o banco está saudável.
  2. Retorna {"status": "ok", "db": "error"} quando o banco está indisponível.
  3. (integration) Conecta ao Postgres real e retorna "db": "ok".
"""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from traveltogether.main import app

client = TestClient(app)


def test_health_returns_ok_when_db_is_healthy() -> None:
    with patch("traveltogether.main.check_db", return_value="ok"):
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": "ok"}


def test_health_returns_db_error_when_db_unreachable() -> None:
    with patch("traveltogether.main.check_db", return_value="error"):
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": "error"}


@pytest.mark.integration
def test_health_connects_to_real_postgres() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    data: dict[str, str] = response.json()
    assert data["status"] == "ok"
    assert data["db"] == "ok"
