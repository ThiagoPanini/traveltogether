"""Testes do endpoint POST /identity/otp/request e /identity/otp/verify."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.identity.otp_service import request_otp
from traveltogether.main import app
from traveltogether.platform.db import get_session


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


def test_otp_request_returns_200(client: TestClient) -> None:
    response = client.post("/identity/otp/request", json={"email": "alice@example.com"})
    assert response.status_code == 200
    assert response.json() == {"status": "sent"}


def test_otp_request_rate_limit_returns_429(client: TestClient, session: Session) -> None:
    for _ in range(3):
        request_otp(session, "alice@example.com", send_email=False)
    response = client.post("/identity/otp/request", json={"email": "alice@example.com"})
    assert response.status_code == 429


def test_otp_verify_valid_code_returns_true(client: TestClient, session: Session) -> None:
    code = request_otp(session, "alice@example.com", send_email=False)
    response = client.post(
        "/identity/otp/verify", json={"email": "alice@example.com", "code": code}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["email"] == "alice@example.com"


def test_otp_verify_wrong_code_returns_false(client: TestClient, session: Session) -> None:
    request_otp(session, "alice@example.com", send_email=False)
    response = client.post(
        "/identity/otp/verify", json={"email": "alice@example.com", "code": "000000"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert data["email"] is None
