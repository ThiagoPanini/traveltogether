"""Testes do endpoint GET /identity/me.

Comportamentos verificados:
  1. Com JWT válido, retorna {"id": ..., "email": ...}.
  2. Sem Authorization header, retorna 401.
  3. Com token inválido/expirado, retorna 401.
  4. Usuário criado JIT na primeira chamada com JWT válido.
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
TEST_EMAIL = "alice@example.com"


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


def _auth_headers(email: str = TEST_EMAIL) -> dict[str, str]:
    token = generate_token(email, secret=TEST_SECRET)
    return {"Authorization": f"Bearer {token}"}


def test_get_me_returns_user_for_valid_token(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AUTH_SECRET", TEST_SECRET)
    response = client.get("/identity/me", headers=_auth_headers())
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == TEST_EMAIL
    assert "id" in data


def test_get_me_creates_user_jit(
    client: TestClient, session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AUTH_SECRET", TEST_SECRET)
    from sqlmodel import select

    from traveltogether.identity.models import User

    assert session.exec(select(User).where(User.email == TEST_EMAIL)).first() is None
    client.get("/identity/me", headers=_auth_headers())
    assert session.exec(select(User).where(User.email == TEST_EMAIL)).first() is not None


def test_get_me_returns_401_without_token(client: TestClient) -> None:
    response = client.get("/identity/me")
    assert response.status_code == 401


def test_get_me_returns_401_with_invalid_token(client: TestClient) -> None:
    response = client.get("/identity/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert response.status_code == 401
