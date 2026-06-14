"""Testes de integração para endpoints de gestão de membros."""

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


def _headers(email: str, monkeypatch: pytest.MonkeyPatch) -> dict[str, str]:
    monkeypatch.setenv("AUTH_SECRET", TEST_SECRET)
    return {"Authorization": f"Bearer {generate_token(email, secret=TEST_SECRET)}"}


def _create_trip(client: TestClient, headers: dict[str, str]) -> str:
    payload = {"name": "T", "description": "", "origin": "SP"}
    r = client.post("/trips", json=payload, headers=headers)
    return r.json()["trip"]["id"]


# ── POST /trips/{id}/members ─────────────────────────────────────────────────


def test_add_existing_member_returns_201(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_h = _headers(ALICE_EMAIL, monkeypatch)
    bob_h = _headers(BOB_EMAIL, monkeypatch)
    # ensure bob exists (JIT on GET /identity/me)
    client.get("/identity/me", headers=bob_h)
    trip_id = _create_trip(client, alice_h)

    r = client.post(f"/trips/{trip_id}/members", json={"email": BOB_EMAIL}, headers=alice_h)

    assert r.status_code == 201
    data = r.json()
    assert data["pending"] is False
    assert data["membership"]["role"] == "member"


def test_add_unknown_email_creates_pending(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_h = _headers(ALICE_EMAIL, monkeypatch)
    trip_id = _create_trip(client, alice_h)

    r = client.post(
        f"/trips/{trip_id}/members", json={"email": "ghost@example.com"}, headers=alice_h
    )

    assert r.status_code == 201
    data = r.json()
    assert data["pending"] is True
    assert data["pending_membership"]["email"] == "ghost@example.com"


def test_add_member_returns_401_without_token(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_h = _headers(ALICE_EMAIL, monkeypatch)
    trip_id = _create_trip(client, alice_h)
    r = client.post(f"/trips/{trip_id}/members", json={"email": BOB_EMAIL})
    assert r.status_code == 401


def test_add_member_returns_403_for_non_organizer(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_h = _headers(ALICE_EMAIL, monkeypatch)
    bob_h = _headers(BOB_EMAIL, monkeypatch)
    client.get("/identity/me", headers=bob_h)
    trip_id = _create_trip(client, alice_h)
    client.post(f"/trips/{trip_id}/members", json={"email": BOB_EMAIL}, headers=alice_h)

    r = client.post(f"/trips/{trip_id}/members", json={"email": "carol@example.com"}, headers=bob_h)
    assert r.status_code == 403


# ── GET /trips/{id}/members ──────────────────────────────────────────────────


def test_list_members_returns_members(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    alice_h = _headers(ALICE_EMAIL, monkeypatch)
    bob_h = _headers(BOB_EMAIL, monkeypatch)
    client.get("/identity/me", headers=bob_h)
    trip_id = _create_trip(client, alice_h)
    client.post(f"/trips/{trip_id}/members", json={"email": BOB_EMAIL}, headers=alice_h)
    client.post(f"/trips/{trip_id}/members", json={"email": "ghost@example.com"}, headers=alice_h)

    r = client.get(f"/trips/{trip_id}/members", headers=alice_h)

    assert r.status_code == 200
    data = r.json()
    assert len(data["members"]) == 2  # alice + bob
    assert len(data["pending"]) == 1
    assert data["pending"][0]["email"] == "ghost@example.com"


def test_list_members_carries_display_name_and_avatar(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_h = _headers(ALICE_EMAIL, monkeypatch)
    bob_h = _headers(BOB_EMAIL, monkeypatch)
    client.get("/identity/me", headers=bob_h)
    client.patch(
        "/identity/me",
        headers=bob_h,
        json={"display_name": "Bob Builder", "avatar_url": "https://cdn/bob.png"},
    )
    trip_id = _create_trip(client, alice_h)
    client.post(f"/trips/{trip_id}/members", json={"email": BOB_EMAIL}, headers=alice_h)

    data = client.get(f"/trips/{trip_id}/members", headers=alice_h).json()
    bob = next(m for m in data["members"] if m["email"] == BOB_EMAIL)
    assert bob["display_name"] == "Bob Builder"
    assert bob["avatar_url"] == "https://cdn/bob.png"


# ── PATCH /trips/{id}/members/{membership_id} ────────────────────────────────


def test_promote_member_to_organizer(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    alice_h = _headers(ALICE_EMAIL, monkeypatch)
    bob_h = _headers(BOB_EMAIL, monkeypatch)
    client.get("/identity/me", headers=bob_h)
    trip_id = _create_trip(client, alice_h)
    add_r = client.post(f"/trips/{trip_id}/members", json={"email": BOB_EMAIL}, headers=alice_h)
    membership_id = add_r.json()["membership"]["id"]

    r = client.patch(
        f"/trips/{trip_id}/members/{membership_id}",
        json={"role": "organizer"},
        headers=alice_h,
    )

    assert r.status_code == 200
    assert r.json()["role"] == "organizer"


def test_demote_last_organizer_returns_409(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_h = _headers(ALICE_EMAIL, monkeypatch)
    trip_id = _create_trip(client, alice_h)
    # Get alice's membership_id via list
    list_r = client.get(f"/trips/{trip_id}/members", headers=alice_h)
    alice_membership_id = list_r.json()["members"][0]["membership"]["id"]

    r = client.patch(
        f"/trips/{trip_id}/members/{alice_membership_id}",
        json={"role": "member"},
        headers=alice_h,
    )

    assert r.status_code == 409


# ── DELETE /trips/{id}/members/{membership_id} ───────────────────────────────


def test_remove_member_returns_204(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    alice_h = _headers(ALICE_EMAIL, monkeypatch)
    bob_h = _headers(BOB_EMAIL, monkeypatch)
    client.get("/identity/me", headers=bob_h)
    trip_id = _create_trip(client, alice_h)
    add_r = client.post(f"/trips/{trip_id}/members", json={"email": BOB_EMAIL}, headers=alice_h)
    membership_id = add_r.json()["membership"]["id"]

    r = client.delete(f"/trips/{trip_id}/members/{membership_id}", headers=alice_h)

    assert r.status_code == 204


# ── pending → resolved (JIT login) ──────────────────────────────────────────


def test_pending_resolves_when_user_logs_in(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_h = _headers(ALICE_EMAIL, monkeypatch)
    trip_id = _create_trip(client, alice_h)
    # invite ghost who doesn't exist yet
    client.post(f"/trips/{trip_id}/members", json={"email": "ghost@example.com"}, headers=alice_h)

    # ghost logs in — JIT user creation should resolve the pending membership
    ghost_h = _headers("ghost@example.com", monkeypatch)
    client.get("/identity/me", headers=ghost_h)

    # ghost should now see the trip in their list
    r = client.get("/trips", headers=ghost_h)
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["trip"]["id"] == trip_id


def test_remove_last_organizer_returns_409(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_h = _headers(ALICE_EMAIL, monkeypatch)
    trip_id = _create_trip(client, alice_h)
    list_r = client.get(f"/trips/{trip_id}/members", headers=alice_h)
    alice_membership_id = list_r.json()["members"][0]["membership"]["id"]

    r = client.delete(f"/trips/{trip_id}/members/{alice_membership_id}", headers=alice_h)

    assert r.status_code == 409


# ── POST existing user returns existing_user preview ────────────────────────


def test_add_existing_member_returns_existing_user(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_h = _headers(ALICE_EMAIL, monkeypatch)
    bob_h = _headers(BOB_EMAIL, monkeypatch)
    client.get("/identity/me", headers=bob_h)
    client.patch("/identity/me", headers=bob_h, json={"display_name": "Bob Test"})
    trip_id = _create_trip(client, alice_h)

    r = client.post(f"/trips/{trip_id}/members", json={"email": BOB_EMAIL}, headers=alice_h)

    assert r.status_code == 201
    data = r.json()
    assert data["existing_user"] is not None
    assert data["existing_user"]["email"] == BOB_EMAIL
    assert data["existing_user"]["display_name"] == "Bob Test"


# ── GET /trips/{id}/members/suggestions ─────────────────────────────────────


def test_suggestions_returns_network_members(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_h = _headers(ALICE_EMAIL, monkeypatch)
    bob_h = _headers(BOB_EMAIL, monkeypatch)
    client.get("/identity/me", headers=bob_h)

    # trip1: alice + bob
    trip1_id = _create_trip(client, alice_h)
    client.post(f"/trips/{trip1_id}/members", json={"email": BOB_EMAIL}, headers=alice_h)

    # new trip to invite people into
    trip2_id = _create_trip(client, alice_h)

    r = client.get(f"/trips/{trip2_id}/members/suggestions", headers=alice_h)

    assert r.status_code == 200
    suggestions = r.json()["suggestions"]
    emails = [s["email"] for s in suggestions]
    assert BOB_EMAIL in emails


def test_suggestions_filters_by_query(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    alice_h = _headers(ALICE_EMAIL, monkeypatch)
    bob_h = _headers(BOB_EMAIL, monkeypatch)
    carol_h = _headers("carol@example.com", monkeypatch)
    client.get("/identity/me", headers=bob_h)
    client.get("/identity/me", headers=carol_h)

    trip1_id = _create_trip(client, alice_h)
    client.post(f"/trips/{trip1_id}/members", json={"email": BOB_EMAIL}, headers=alice_h)
    client.post(f"/trips/{trip1_id}/members", json={"email": "carol@example.com"}, headers=alice_h)

    trip2_id = _create_trip(client, alice_h)

    r = client.get(f"/trips/{trip2_id}/members/suggestions?q=carol", headers=alice_h)

    assert r.status_code == 200
    suggestions = r.json()["suggestions"]
    emails = [s["email"] for s in suggestions]
    assert "carol@example.com" in emails
    assert BOB_EMAIL not in emails


def test_suggestions_excludes_current_members(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    alice_h = _headers(ALICE_EMAIL, monkeypatch)
    bob_h = _headers(BOB_EMAIL, monkeypatch)
    client.get("/identity/me", headers=bob_h)

    trip1_id = _create_trip(client, alice_h)
    client.post(f"/trips/{trip1_id}/members", json={"email": BOB_EMAIL}, headers=alice_h)

    # bob already in trip2 too
    trip2_id = _create_trip(client, alice_h)
    client.post(f"/trips/{trip2_id}/members", json={"email": BOB_EMAIL}, headers=alice_h)

    r = client.get(f"/trips/{trip2_id}/members/suggestions", headers=alice_h)

    emails = [s["email"] for s in r.json()["suggestions"]]
    assert BOB_EMAIL not in emails
