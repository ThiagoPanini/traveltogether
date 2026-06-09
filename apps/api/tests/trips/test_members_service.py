"""Testes de domínio para gestão de membros — sem Postgres real."""

from collections.abc import Iterator

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.identity.models import User
from traveltogether.trips.members_service import (
    LastOrganizerError,
    MemberAlreadyExists,
    add_member_by_email,
    promote_or_demote_member,
    remove_member_from_trip,
    resolve_pending_memberships,
)
from traveltogether.trips.models import MembershipRole
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
    user = User(email="alice@example.com")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture(name="bob")
def bob_fixture(session: Session) -> User:
    user = User(email="bob@example.com")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


# ── add_member_by_email ─────────────────────────────────────────────────────


def test_add_member_creates_membership_when_user_exists(
    session: Session, alice: User, bob: User
) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")

    result = add_member_by_email(session, trip.id, bob.email)

    assert result.pending is False
    assert result.membership is not None
    assert result.membership.user_id == bob.id
    assert result.membership.role == MembershipRole.member


def test_add_member_creates_pending_when_user_does_not_exist(session: Session, alice: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")

    result = add_member_by_email(session, trip.id, "unknown@example.com")

    assert result.pending is True
    assert result.membership is None
    assert result.pending_membership is not None
    assert result.pending_membership.email == "unknown@example.com"


def test_add_member_raises_if_already_member(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    add_member_by_email(session, trip.id, bob.email)

    with pytest.raises(MemberAlreadyExists):
        add_member_by_email(session, trip.id, bob.email)


# ── resolve_pending_memberships ─────────────────────────────────────────────


def test_resolve_pending_converts_pending_to_membership(session: Session, alice: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    add_member_by_email(session, trip.id, "new@example.com")

    new_user = User(email="new@example.com")
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    resolved = resolve_pending_memberships(session, new_user)

    assert len(resolved) == 1
    assert resolved[0].user_id == new_user.id
    assert resolved[0].trip_id == trip.id


def test_resolve_pending_returns_empty_when_no_pending(session: Session, alice: User) -> None:
    resolved = resolve_pending_memberships(session, alice)
    assert resolved == []


# ── promote_or_demote_member ─────────────────────────────────────────────────


def test_promote_member_to_organizer(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    result = add_member_by_email(session, trip.id, bob.email)
    assert result.membership is not None

    updated = promote_or_demote_member(session, result.membership, MembershipRole.organizer)

    assert updated.role == MembershipRole.organizer


def test_demote_organizer_to_member(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    result = add_member_by_email(session, trip.id, bob.email)
    assert result.membership is not None
    promoted = promote_or_demote_member(session, result.membership, MembershipRole.organizer)

    demoted = promote_or_demote_member(session, promoted, MembershipRole.member)

    assert demoted.role == MembershipRole.member


def test_demote_last_organizer_raises(session: Session, alice: User) -> None:
    _, alice_membership = create_trip(session, alice.id, "Trip", "", "SP")

    with pytest.raises(LastOrganizerError):
        promote_or_demote_member(session, alice_membership, MembershipRole.member)


# ── remove_member_from_trip ──────────────────────────────────────────────────


def test_remove_member_deletes_membership(session: Session, alice: User, bob: User) -> None:
    from traveltogether.trips.models import Membership

    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    result = add_member_by_email(session, trip.id, bob.email)
    assert result.membership is not None
    membership_id = result.membership.id

    remove_member_from_trip(session, result.membership)

    assert session.get(Membership, membership_id) is None


def test_remove_last_organizer_raises(session: Session, alice: User) -> None:
    _, alice_membership = create_trip(session, alice.id, "Trip", "", "SP")

    with pytest.raises(LastOrganizerError):
        remove_member_from_trip(session, alice_membership)
