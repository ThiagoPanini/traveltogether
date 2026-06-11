"""Testes de integração para endpoints de Roteiro (itinerary items)."""

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
        json={"name": "Viagem Test", "description": "", "origin": "SP"},
        headers=headers,
    )
    assert res.status_code == 201
    return res.json()["trip"]


def _create_stop(client: TestClient, trip_id: str, headers: dict[str, str]) -> dict[str, object]:
    res = client.post(
        f"/trips/{trip_id}/stops",
        json={"city": "Lisboa"},
        headers=headers,
    )
    assert res.status_code == 201
    return res.json()


def test_get_itinerary_returns_empty_list(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    stop = _create_stop(client, str(trip["id"]), headers)
    res = client.get(f"/trips/{trip['id']}/stops/{stop['id']}/itinerary", headers=headers)
    assert res.status_code == 200
    assert res.json() == []


def test_post_itinerary_item_creates_item(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    stop = _create_stop(client, str(trip["id"]), headers)
    res = client.post(
        f"/trips/{trip['id']}/stops/{stop['id']}/itinerary",
        json={"title": "Visitar Torre de Belém"},
        headers=headers,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Visitar Torre de Belém"
    assert data["order"] == 1


def test_post_itinerary_item_member_forbidden(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    organizer_headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, organizer_headers)
    stop = _create_stop(client, str(trip["id"]), organizer_headers)

    # invite bob as member
    member_headers = _auth_headers(BOB_EMAIL, monkeypatch)
    client.post(
        f"/trips/{trip['id']}/members",
        json={"email": BOB_EMAIL, "role": "member"},
        headers=organizer_headers,
    )
    # bob triggers JIT creation by accessing trip
    client.get(f"/trips/{trip['id']}", headers=member_headers)

    res = client.post(
        f"/trips/{trip['id']}/stops/{stop['id']}/itinerary",
        json={"title": "Tentativa membro"},
        headers=member_headers,
    )
    assert res.status_code == 403


def test_patch_itinerary_item_updates_title(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    stop = _create_stop(client, str(trip["id"]), headers)
    create_res = client.post(
        f"/trips/{trip['id']}/stops/{stop['id']}/itinerary",
        json={"title": "Original"},
        headers=headers,
    )
    item_id = create_res.json()["id"]
    res = client.patch(
        f"/trips/{trip['id']}/stops/{stop['id']}/itinerary/{item_id}",
        json={"title": "Atualizado"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["title"] == "Atualizado"


def test_delete_itinerary_item_removes_it(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    stop = _create_stop(client, str(trip["id"]), headers)
    create_res = client.post(
        f"/trips/{trip['id']}/stops/{stop['id']}/itinerary",
        json={"title": "Para deletar"},
        headers=headers,
    )
    item_id = create_res.json()["id"]
    res = client.delete(
        f"/trips/{trip['id']}/stops/{stop['id']}/itinerary/{item_id}",
        headers=headers,
    )
    assert res.status_code == 204

    list_res = client.get(f"/trips/{trip['id']}/stops/{stop['id']}/itinerary", headers=headers)
    assert list_res.json() == []


def test_post_reorder_itinerary_items(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = _auth_headers(ALICE_EMAIL, monkeypatch)
    trip = _create_trip(client, headers)
    stop = _create_stop(client, str(trip["id"]), headers)
    i1 = client.post(
        f"/trips/{trip['id']}/stops/{stop['id']}/itinerary",
        json={"title": "A"},
        headers=headers,
    ).json()
    i2 = client.post(
        f"/trips/{trip['id']}/stops/{stop['id']}/itinerary",
        json={"title": "B"},
        headers=headers,
    ).json()
    i3 = client.post(
        f"/trips/{trip['id']}/stops/{stop['id']}/itinerary",
        json={"title": "C"},
        headers=headers,
    ).json()

    res = client.post(
        f"/trips/{trip['id']}/stops/{stop['id']}/itinerary/reorder",
        json={"item_ids": [i3["id"], i1["id"], i2["id"]]},
        headers=headers,
    )
    assert res.status_code == 200
    titles = [item["title"] for item in res.json()]
    assert titles == ["C", "A", "B"]
