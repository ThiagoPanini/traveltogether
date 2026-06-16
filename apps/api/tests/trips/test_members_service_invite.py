"""Testes para add_member_by_email com preview de convite e get_network_suggestions."""

from collections.abc import Iterator
from unittest.mock import patch

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.identity.models import User
from traveltogether.trips.members_service import (
    accept_invitation,
    add_member_by_email,
    get_network_suggestions,
)
from traveltogether.trips.models import InvitationStatus, Membership
from traveltogether.trips.service import create_trip


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


@pytest.fixture(name="alice")
def alice_fixture(session: Session) -> User:
    user = User(email="alice@example.com", display_name="Alice", avatar_url="https://cdn/a.jpg")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="bob")
def bob_fixture(session: Session) -> User:
    user = User(email="bob@example.com", display_name="Bob", avatar_url=None)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="carol")
def carol_fixture(session: Session) -> User:
    user = User(email="carol@example.com", display_name="Carol Campos", avatar_url=None)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _join(session: Session, trip_id: object, user: User) -> Membership:
    """Convida + aceita: membership ativa para montar a rede (ADR-0015)."""
    result = add_member_by_email(session, trip_id, user.email)  # type: ignore[arg-type]
    return accept_invitation(session, result.invitation, user)


# ── add_member: existing user preview ───────────────────────────────────────


def test_add_member_existing_user_returns_preview(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")

    result = add_member_by_email(session, trip.id, bob.email)

    # Convite pendente, mas com preview de quem já tem conta (ADR-0015).
    assert result.invitation.status == InvitationStatus.pending
    assert result.existing_user is not None
    assert result.existing_user.email == bob.email
    assert result.existing_user.display_name == "Bob"


def test_add_member_pending_has_no_preview(session: Session, alice: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")

    with patch("traveltogether.trips.members_service.send_invite_email_async", return_value=None):
        result = add_member_by_email(session, trip.id, "unknown@example.com")

    assert result.invitation.status == InvitationStatus.pending
    assert result.existing_user is None


def test_add_member_unknown_sends_invite_email(session: Session, alice: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip Incrível", "", "SP")

    with patch("traveltogether.trips.members_service.send_invite_email_async") as mock_send:
        add_member_by_email(
            session,
            trip.id,
            "unknown@example.com",
            inviter_name=alice.display_name,
            trip_name="Trip Incrível",
        )

    mock_send.assert_called_once()
    call_kwargs = mock_send.call_args
    assert call_kwargs[1]["to_email"] == "unknown@example.com"
    assert "Trip Incrível" in call_kwargs[1]["trip_name"]


def test_add_member_existing_does_not_send_email(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")

    with patch("traveltogether.trips.members_service.send_invite_email_async") as mock_send:
        add_member_by_email(session, trip.id, bob.email)

    mock_send.assert_not_called()


# ── get_network_suggestions ──────────────────────────────────────────────────


def test_network_suggestions_returns_shared_trip_members(
    session: Session, alice: User, bob: User, carol: User
) -> None:
    # alice e bob em trip1
    trip1, _ = create_trip(session, alice.id, "Trip1", "", "SP")
    _join(session, trip1.id, bob)

    # carol em trip separada (sem alice)
    _, _ = create_trip(session, carol.id, "Trip2", "", "RJ")

    # nova trip onde alice vai convidar
    invite_trip, _ = create_trip(session, alice.id, "Nova", "", "MG")

    suggestions = get_network_suggestions(session, alice, invite_trip.id, q="")

    emails = [u.email for u in suggestions]
    assert bob.email in emails
    assert carol.email not in emails


def test_network_suggestions_filters_by_query(
    session: Session, alice: User, bob: User, carol: User
) -> None:
    trip1, _ = create_trip(session, alice.id, "Trip1", "", "SP")
    _join(session, trip1.id, bob)
    _join(session, trip1.id, carol)

    invite_trip, _ = create_trip(session, alice.id, "Nova", "", "MG")

    suggestions = get_network_suggestions(session, alice, invite_trip.id, q="carol")

    emails = [u.email for u in suggestions]
    assert carol.email in emails
    assert bob.email not in emails


def test_network_suggestions_excludes_current_members(
    session: Session, alice: User, bob: User
) -> None:
    trip1, _ = create_trip(session, alice.id, "Trip1", "", "SP")
    _join(session, trip1.id, bob)

    # invite_trip onde bob já é membro
    invite_trip, _ = create_trip(session, alice.id, "Nova", "", "MG")
    _join(session, invite_trip.id, bob)

    suggestions = get_network_suggestions(session, alice, invite_trip.id, q="")

    emails = [u.email for u in suggestions]
    assert bob.email not in emails


def test_network_suggestions_excludes_self(session: Session, alice: User) -> None:
    _, _ = create_trip(session, alice.id, "Trip1", "", "SP")
    invite_trip, _ = create_trip(session, alice.id, "Nova", "", "MG")

    suggestions = get_network_suggestions(session, alice, invite_trip.id, q="")

    emails = [u.email for u in suggestions]
    assert alice.email not in emails
