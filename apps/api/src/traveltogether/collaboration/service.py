"""Lógica de domínio do boundary collaboration — Comentário (ADR-0014).

Zero dependências de FastAPI. Autorização e existência do alvo são checadas
chamando o service do boundary dono (ex.: trips.service.get_trip_membership),
nunca importando seus modelos.
"""

import re
import uuid
from datetime import UTC, datetime

from sqlmodel import Session, col, select

from traveltogether.collaboration.models import Comment, CommentTargetType
from traveltogether.fares.service import fare_quote_trip_id
from traveltogether.trips.models import MembershipRole
from traveltogether.trips.service import get_trip_membership, itinerary_item_trip_id

# `@email` numa menção: arroba seguida de um e-mail (que tem o seu próprio arroba).
_MENTION_RE = re.compile(r"@([\w.+-]+@[\w-]+\.[\w.-]+)")


class NotMemberError(Exception):
    """Quem não é Membro da Viagem não comenta (invariante 17)."""


class TargetNotFoundError(Exception):
    """Alvo do Comentário não existe ou não pertence à Viagem informada."""


def resolve_target_trip_id(
    session: Session, target_type: CommentTargetType, target_id: uuid.UUID
) -> uuid.UUID | None:
    """Resolve a Viagem dona do alvo polimórfico via service do boundary dono.

    - `trip`: o próprio id (mural da Viagem).
    - `itinerary_item`: via trips.service (Item → Parada → Viagem).
    - `fare_quote`: via fares.service (Pesquisa → Trajeto → Viagem).

    Retorna None se o alvo não existir. Nunca importa models cross-boundary
    (ADR-0014) — só chama services.
    """
    if target_type == CommentTargetType.trip:
        return target_id
    if target_type == CommentTargetType.itinerary_item:
        return itinerary_item_trip_id(session, target_id)
    return fare_quote_trip_id(session, target_id)


class EmptyCommentError(ValueError):
    """Corpo do Comentário em branco."""


class NotAuthorError(Exception):
    """Só o autor edita o próprio Comentário."""


def create_comment(
    session: Session,
    *,
    author_id: uuid.UUID,
    trip_id: uuid.UUID,
    target_type: CommentTargetType,
    target_id: uuid.UUID,
    body: str,
) -> Comment:
    """Cria um Comentário; qualquer Membro da Viagem pode (invariante 17)."""
    if get_trip_membership(session, trip_id, author_id) is None:
        raise NotMemberError("usuário não é Membro da Viagem")
    if not body.strip():
        raise EmptyCommentError("corpo do Comentário não pode ser vazio")

    comment = Comment(
        author_id=author_id,
        trip_id=trip_id,
        target_type=target_type,
        target_id=target_id,
        body=body.strip(),
    )
    session.add(comment)
    session.commit()
    session.refresh(comment)

    _notify_mentions(session, comment)
    return comment


def _notify_mentions(session: Session, comment: Comment) -> None:
    """Notifica `@email` mencionados que são Membros da Viagem, exceto o autor.

    Resolve cada e-mail via identity.service; só notifica quem tem Membership
    na Viagem do Comentário (ADR-0014/0017, invariante 20).
    """
    from traveltogether.identity.service import get_user_id_by_email  # noqa: PLC0415
    from traveltogether.notifications.models import NotificationKind  # noqa: PLC0415
    from traveltogether.notifications.service import notify  # noqa: PLC0415

    seen: set[uuid.UUID] = set()
    for email in _MENTION_RE.findall(comment.body):
        user_id = get_user_id_by_email(session, email)
        if user_id is None or user_id == comment.author_id or user_id in seen:
            continue
        if get_trip_membership(session, comment.trip_id, user_id) is None:
            continue
        seen.add(user_id)
        notify(
            session,
            recipient_id=user_id,
            kind=NotificationKind.mention,
            text="Você foi mencionado em um Comentário",
            trip_id=comment.trip_id,
            target_type="comment",
            target_id=comment.id,
        )


def list_comments(
    session: Session, target_type: CommentTargetType, target_id: uuid.UUID
) -> list[Comment]:
    """Lista Comentários de um alvo, ordenados por criação."""
    return list(
        session.exec(
            select(Comment)
            .where(Comment.target_type == target_type)
            .where(Comment.target_id == target_id)
            .order_by(col(Comment.created_at))
        )
    )


def list_trip_comments(session: Session, trip_id: uuid.UUID) -> list[Comment]:
    """Lista todos os Comentários da Viagem (mural + ancorados), por criação.

    Alimenta o Mural, que mostra o alvo `Viagem` junto dos ancorados a
    `Pesquisa de Passagem`/`Item de Roteiro` (estes read-only no mural).
    """
    return list(
        session.exec(
            select(Comment).where(Comment.trip_id == trip_id).order_by(col(Comment.created_at))
        )
    )


def update_comment(session: Session, comment: Comment, user_id: uuid.UUID, body: str) -> Comment:
    """Edita o corpo; só o autor pode (senão NotAuthorError)."""
    if comment.author_id != user_id:
        raise NotAuthorError("só o autor edita o próprio Comentário")
    if not body.strip():
        raise EmptyCommentError("corpo do Comentário não pode ser vazio")

    comment.body = body.strip()
    comment.updated_at = datetime.now(UTC)
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return comment


def delete_comment(
    session: Session, comment: Comment, membership_role: MembershipRole, user_id: uuid.UUID
) -> None:
    """Apaga um Comentário: o autor sempre; o Organizador, qualquer um."""
    is_author = comment.author_id == user_id
    is_organizer = membership_role == MembershipRole.organizer
    if not (is_author or is_organizer):
        raise NotAuthorError("só o autor ou um Organizador apaga o Comentário")

    session.delete(comment)
    session.commit()
