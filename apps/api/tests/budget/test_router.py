"""Testes de integração do boundary budget: autorização e CRUD via HTTP.

Foco nos critérios de aceite: escrita restrita a `Organizador` (403 para
`Membro`), leitura liberada a qualquer `Membership`.
"""

import uuid
from collections.abc import Iterator
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from traveltogether.identity.auth import generate_token
from traveltogether.identity.models import User
from traveltogether.main import app
from traveltogether.platform.db import get_session
from traveltogether.trips.models import Membership, MembershipRole

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


def _create_trip(client: TestClient, headers: dict[str, str]) -> str:
    res = client.post(
        "/trips",
        json={"name": "Eurotrip", "description": "", "origin": "São Paulo"},
        headers=headers,
    )
    assert res.status_code == 201
    return res.json()["trip"]["id"]


def _join_as_member(
    client: TestClient, session: Session, trip_id: str, monkeypatch: pytest.MonkeyPatch
) -> dict[str, str]:
    """Autentica Bob (cria o User JIT) e o registra como Membro da Viagem."""
    headers = _auth_headers(BOB_EMAIL, monkeypatch)
    # GET dispara a criação JIT do usuário Bob
    client.get("/identity/me", headers=headers)
    bob = session.exec(select(User).where(User.email == BOB_EMAIL)).one()
    session.add(Membership(trip_id=uuid.UUID(trip_id), user_id=bob.id, role=MembershipRole.member))
    session.commit()
    return headers


EXTRA_PAYLOAD = {"description": "Seguro", "value": "300.00", "currency": "EUR", "basis": "split"}


def test_organizer_can_create_extra(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip_id = _create_trip(client, headers)
    res = client.post(f"/trips/{trip_id}/extras", json=EXTRA_PAYLOAD, headers=headers)
    assert res.status_code == 201
    assert res.json()["currency"] == "EUR"


def test_member_cannot_create_extra(
    client: TestClient, session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    organizer = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip_id = _create_trip(client, organizer)
    member = _join_as_member(client, session, trip_id, monkeypatch)
    res = client.post(f"/trips/{trip_id}/extras", json=EXTRA_PAYLOAD, headers=member)
    assert res.status_code == 403


def test_member_can_read_budget(
    client: TestClient, session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    organizer = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip_id = _create_trip(client, organizer)
    client.post(f"/trips/{trip_id}/extras", json=EXTRA_PAYLOAD, headers=organizer)
    member = _join_as_member(client, session, trip_id, monkeypatch)

    res = client.get(f"/trips/{trip_id}/budget", headers=member)
    assert res.status_code == 200
    body = res.json()
    assert body["member_count"] == 2
    eur = next(s for s in body["subtotals"] if s["currency"] == "EUR")
    # basis split → valor é do grupo, sem multiplicar
    assert Decimal(eur["per_group"]) == Decimal("300")


def test_non_member_cannot_read_budget(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    organizer = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip_id = _create_trip(client, organizer)
    outsider = _auth_headers(BOB_EMAIL, monkeypatch)
    res = client.get(f"/trips/{trip_id}/budget", headers=outsider)
    assert res.status_code == 403
