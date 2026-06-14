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
    existing_user: User | None = None


def _count_organizers(session: Session, trip_id: uuid.UUID) -> int:
    return len(
        session.exec(
            select(Membership)
            .where(Membership.trip_id == trip_id)
            .where(Membership.role == MembershipRole.organizer)
        ).all()
    )


def send_invite_email_async(
    *,
    to_email: str,
    trip_name: str,
    inviter_name: str | None = None,
    invite_url: str = "",
) -> None:
    """Envia convite por e-mail. No-op se RESEND_API_KEY ausente."""
    from traveltogether.platform.email_service import send_invite_email  # noqa: PLC0415

    send_invite_email(
        to_email=to_email,
        trip_name=trip_name,
        inviter_name=inviter_name or "Organizador",
        invite_url=invite_url,
    )


def add_member_by_email(
    session: Session,
    trip_id: uuid.UUID,
    email: str,
    *,
    inviter_name: str | None = None,
    trip_name: str | None = None,
) -> AddMemberResult:
    """Adiciona membro por e-mail. Cria PendingMembership + envia convite se usuário não existe."""
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
        return AddMemberResult(pending=False, membership=membership, existing_user=existing_user)

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

    send_invite_email_async(
        to_email=normalized,
        trip_name=trip_name or "",
        inviter_name=inviter_name,
    )

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


def get_network_suggestions(
    session: Session,
    user: User,
    trip_id: uuid.UUID,
    q: str,
    limit: int = 10,
) -> list[User]:
    """Autocomplete: usuários da rede do organizador (Viagens compartilhadas) não nesta trip."""
    # All trip_ids where user is a member
    user_trip_ids = session.exec(
        select(Membership.trip_id).where(Membership.user_id == user.id)
    ).all()

    if not user_trip_ids:
        return []

    # All user_ids in those trips (excludes self)
    network_user_ids = session.exec(
        select(Membership.user_id)
        .where(Membership.trip_id.in_(user_trip_ids))  # type: ignore[attr-defined]
        .where(Membership.user_id != user.id)
    ).all()

    if not network_user_ids:
        return []

    # Exclude users already in target trip
    already_member_ids = session.exec(
        select(Membership.user_id).where(Membership.trip_id == trip_id)
    ).all()

    candidate_ids = [uid for uid in set(network_user_ids) if uid not in set(already_member_ids)]

    if not candidate_ids:
        return []

    stmt = select(User).where(User.id.in_(candidate_ids))  # type: ignore[attr-defined]

    q_lower = q.strip().lower()
    if q_lower:
        stmt = stmt.where(
            (User.email.contains(q_lower))  # type: ignore[union-attr]
            | (User.display_name.contains(q_lower))  # type: ignore[union-attr]
        )

    stmt = stmt.limit(limit)
    return list(session.exec(stmt).all())
