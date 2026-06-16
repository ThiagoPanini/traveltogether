"""Testes de domínio para gestão de membros — sem Postgres real."""

from collections.abc import Iterator

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from traveltogether.identity.models import User
from traveltogether.trips.members_service import (
    InvitationNotForUser,
    LastOrganizerError,
    MemberAlreadyExists,
    accept_invitation,
    add_member_by_email,
    decline_invitation,
    list_pending_invitations_for_user,
    promote_or_demote_member,
    remove_member_from_trip,
)
from traveltogether.trips.models import InvitationStatus, Membership, MembershipRole
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


def _add_active_member(
    session: Session, trip_id: object, user: User, role: MembershipRole = MembershipRole.member
) -> Membership:
    """Convida + aceita: materializa uma Membership ativa (ADR-0015)."""
    result = add_member_by_email(session, trip_id, user.email)  # type: ignore[arg-type]
    membership = accept_invitation(session, result.invitation, user)
    if role != membership.role:
        membership.role = role
        session.add(membership)
        session.commit()
        session.refresh(membership)
    return membership


# ── add_member_by_email ─────────────────────────────────────────────────────


def test_add_member_creates_pending_invitation_even_when_user_exists(
    session: Session, alice: User, bob: User
) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")

    result = add_member_by_email(session, trip.id, bob.email)

    # Quem já tem conta vira preview, mas NÃO entra direto (invariante 21).
    assert result.invitation.status == InvitationStatus.pending
    assert result.invitation.email == bob.email
    assert result.existing_user is not None
    assert result.existing_user.id == bob.id
    # Bob não tem Membership: só o organizador (alice) é membro ativo.
    bob_membership = session.exec(
        select(Membership).where(Membership.trip_id == trip.id).where(Membership.user_id == bob.id)
    ).first()
    assert bob_membership is None


def test_add_member_creates_pending_when_user_does_not_exist(session: Session, alice: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")

    result = add_member_by_email(session, trip.id, "unknown@example.com")

    assert result.invitation.status == InvitationStatus.pending
    assert result.invitation.email == "unknown@example.com"
    assert result.existing_user is None


def test_add_member_raises_if_already_invited(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    add_member_by_email(session, trip.id, bob.email)

    with pytest.raises(MemberAlreadyExists):
        add_member_by_email(session, trip.id, bob.email)


def test_add_member_raises_if_already_active_member(
    session: Session, alice: User, bob: User
) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    _add_active_member(session, trip.id, bob)

    with pytest.raises(MemberAlreadyExists):
        add_member_by_email(session, trip.id, bob.email)


# ── accept_invitation ────────────────────────────────────────────────────────


def test_accept_creates_membership(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    result = add_member_by_email(session, trip.id, bob.email)

    membership = accept_invitation(session, result.invitation, bob)

    assert membership.user_id == bob.id
    assert membership.trip_id == trip.id
    assert membership.role == MembershipRole.member
    assert result.invitation.status == InvitationStatus.accepted
    assert result.invitation.responded_at is not None


def test_accept_invitee_without_account(session: Session, alice: User) -> None:
    # Convite criado para quem não tinha conta; usuário aparece (JIT) e aceita.
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    result = add_member_by_email(session, trip.id, "ghost@example.com")

    ghost = User(email="ghost@example.com")
    session.add(ghost)
    session.commit()
    session.refresh(ghost)

    membership = accept_invitation(session, result.invitation, ghost)

    assert membership.user_id == ghost.id
    assert membership.trip_id == trip.id


def test_accept_is_idempotent(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    result = add_member_by_email(session, trip.id, bob.email)

    first = accept_invitation(session, result.invitation, bob)
    second = accept_invitation(session, result.invitation, bob)

    assert first.id == second.id
    members = session.exec(
        select(Membership).where(Membership.trip_id == trip.id).where(Membership.user_id == bob.id)
    ).all()
    assert len(members) == 1


def test_accept_rejects_wrong_user(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    result = add_member_by_email(session, trip.id, "someone@example.com")

    with pytest.raises(InvitationNotForUser):
        accept_invitation(session, result.invitation, bob)


# ── decline_invitation ───────────────────────────────────────────────────────


def test_decline_discards_invitation(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    result = add_member_by_email(session, trip.id, bob.email)

    declined = decline_invitation(session, result.invitation, bob)

    assert declined.status == InvitationStatus.declined
    assert declined.responded_at is not None
    no_membership = session.exec(
        select(Membership).where(Membership.trip_id == trip.id).where(Membership.user_id == bob.id)
    ).first()
    assert no_membership is None


def test_decline_is_idempotent(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    result = add_member_by_email(session, trip.id, bob.email)

    decline_invitation(session, result.invitation, bob)
    again = decline_invitation(session, result.invitation, bob)

    assert again.status == InvitationStatus.declined


def test_decline_rejects_wrong_user(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    result = add_member_by_email(session, trip.id, "someone@example.com")

    with pytest.raises(InvitationNotForUser):
        decline_invitation(session, result.invitation, bob)


# ── list_pending_invitations_for_user ────────────────────────────────────────


def test_list_pending_invitations_for_user(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Viagem ao Chile", "", "SP")
    add_member_by_email(session, trip.id, bob.email)

    rows = list_pending_invitations_for_user(session, bob)

    assert len(rows) == 1
    invitation, trip_name = rows[0]
    assert invitation.email == bob.email
    assert trip_name == "Viagem ao Chile"


def test_list_pending_excludes_responded(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    result = add_member_by_email(session, trip.id, bob.email)
    accept_invitation(session, result.invitation, bob)

    assert list_pending_invitations_for_user(session, bob) == []


# ── promote_or_demote_member ─────────────────────────────────────────────────


def test_promote_member_to_organizer(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    membership = _add_active_member(session, trip.id, bob)

    updated = promote_or_demote_member(session, membership, MembershipRole.organizer)

    assert updated.role == MembershipRole.organizer


def test_demote_organizer_to_member(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    membership = _add_active_member(session, trip.id, bob)
    promoted = promote_or_demote_member(session, membership, MembershipRole.organizer)

    demoted = promote_or_demote_member(session, promoted, MembershipRole.member)

    assert demoted.role == MembershipRole.member


def test_demote_last_organizer_raises(session: Session, alice: User) -> None:
    _, alice_membership = create_trip(session, alice.id, "Trip", "", "SP")

    with pytest.raises(LastOrganizerError):
        promote_or_demote_member(session, alice_membership, MembershipRole.member)


# ── remove_member_from_trip ──────────────────────────────────────────────────


def test_remove_member_deletes_membership(session: Session, alice: User, bob: User) -> None:
    trip, _ = create_trip(session, alice.id, "Trip", "", "SP")
    membership = _add_active_member(session, trip.id, bob)
    membership_id = membership.id

    remove_member_from_trip(session, membership)

    assert session.get(Membership, membership_id) is None


def test_remove_last_organizer_raises(session: Session, alice: User) -> None:
    _, alice_membership = create_trip(session, alice.id, "Trip", "", "SP")

    with pytest.raises(LastOrganizerError):
        remove_member_from_trip(session, alice_membership)
