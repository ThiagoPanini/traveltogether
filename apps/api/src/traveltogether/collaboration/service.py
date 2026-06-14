"""Lógica de domínio do boundary collaboration — Comentário (ADR-0014).

Zero dependências de FastAPI. Autorização e existência do alvo são checadas
chamando o service do boundary dono (ex.: trips.service.get_trip_membership),
nunca importando seus modelos.
"""

import uuid
from datetime import UTC, datetime

from sqlmodel import Session, col, select

from traveltogether.collaboration.models import Comment, CommentTargetType
from traveltogether.trips.models import MembershipRole
from traveltogether.trips.service import get_trip_membership


class NotMemberError(Exception):
    """Quem não é Membro da Viagem não comenta (invariante 17)."""


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
    return comment


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
