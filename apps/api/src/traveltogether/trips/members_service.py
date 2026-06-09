"""Lógica de domínio para gestão de membros no boundary trips."""

import uuid
from dataclasses import dataclass

from sqlmodel import Session, select

from traveltogether.identity.models import User
from traveltogether.trips.models import Membership, MembershipRole, PendingMembership


class LastOrganizerError(Exception):
    """Operação violaria a invariante 1: toda Viagem tem ≥1 Organizador."""


class MemberAlreadyExists(Exception):
    """Email já é membro (ativo ou pendente) desta Viagem."""


@dataclass
class AddMemberResult:
    pending: bool
    membership: Membership | None = None
    pending_membership: PendingMembership | None = None


def _count_organizers(session: Session, trip_id: uuid.UUID) -> int:
    return len(
        session.exec(
            select(Membership)
            .where(Membership.trip_id == trip_id)
            .where(Membership.role == MembershipRole.organizer)
        ).all()
    )


def add_member_by_email(
    session: Session,
    trip_id: uuid.UUID,
    email: str,
) -> AddMemberResult:
    """Adiciona membro por e-mail. Cria PendingMembership se o usuário ainda não existe."""
    normalized = email.strip().lower()

    existing_user = session.exec(select(User).where(User.email == normalized)).first()

    if existing_user is not None:
        existing_membership = session.exec(
            select(Membership)
            .where(Membership.trip_id == trip_id)
            .where(Membership.user_id == existing_user.id)
        ).first()
        if existing_membership is not None:
            raise MemberAlreadyExists(f"{normalized} já é membro desta Viagem")

        membership = Membership(
            trip_id=trip_id, user_id=existing_user.id, role=MembershipRole.member
        )
        session.add(membership)
        session.commit()
        session.refresh(membership)
        return AddMemberResult(pending=False, membership=membership)

    existing_pending = session.exec(
        select(PendingMembership)
        .where(PendingMembership.trip_id == trip_id)
        .where(PendingMembership.email == normalized)
    ).first()
    if existing_pending is not None:
        raise MemberAlreadyExists(f"{normalized} já tem convite pendente nesta Viagem")

    pending = PendingMembership(trip_id=trip_id, email=normalized)
    session.add(pending)
    session.commit()
    session.refresh(pending)
    return AddMemberResult(pending=True, pending_membership=pending)


def resolve_pending_memberships(session: Session, user: User) -> list[Membership]:
    """Converte PendingMemberships do email em Memberships reais. Chamado no login JIT."""
    pending_rows = session.exec(
        select(PendingMembership).where(PendingMembership.email == user.email)
    ).all()

    created: list[Membership] = []
    for pending in pending_rows:
        membership = Membership(trip_id=pending.trip_id, user_id=user.id, role=pending.role)
        session.add(membership)
        session.delete(pending)
        created.append(membership)

    if created:
        session.commit()
        for m in created:
            session.refresh(m)

    return created


def promote_or_demote_member(
    session: Session, membership: Membership, new_role: MembershipRole
) -> Membership:
    """Altera o papel do membro. Bloqueia rebaixar o último Organizador (invariante 1)."""
    if (
        membership.role == MembershipRole.organizer
        and new_role == MembershipRole.member
        and _count_organizers(session, membership.trip_id) <= 1
    ):
        raise LastOrganizerError(
            "Não é possível rebaixar o último Organizador desta Viagem (invariante 1)"
        )

    membership.role = new_role
    session.add(membership)
    session.commit()
    session.refresh(membership)
    return membership


def remove_member_from_trip(session: Session, membership: Membership) -> None:
    """Remove membro da Viagem. Bloqueia remoção do último Organizador (invariante 1)."""
    if (
        membership.role == MembershipRole.organizer
        and _count_organizers(session, membership.trip_id) <= 1
    ):
        raise LastOrganizerError(
            "Não é possível remover o último Organizador desta Viagem (invariante 1)"
        )

    session.delete(membership)
    session.commit()


def list_trip_members(
    session: Session, trip_id: uuid.UUID
) -> tuple[list[tuple[Membership, User]], list[PendingMembership]]:
    """Retorna membros ativos (com User) e pendentes da Viagem."""
    active = session.exec(
        select(Membership, User)
        .join(User, User.id == Membership.user_id)  # type: ignore[arg-type]
        .where(Membership.trip_id == trip_id)
    ).all()

    pending = session.exec(
        select(PendingMembership).where(PendingMembership.trip_id == trip_id)
    ).all()

    return list(active), list(pending)
