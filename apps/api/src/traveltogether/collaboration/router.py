"""Rotas HTTP do boundary collaboration — Comentário (ADR-0014)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session

from traveltogether.collaboration.models import (
    Comment,
    CommentCreate,
    CommentPublic,
    CommentTargetType,
    CommentUpdate,
)
from traveltogether.collaboration.service import (
    EmptyCommentError,
    NotAuthorError,
    NotMemberError,
    create_comment,
    delete_comment,
    list_comments,
    update_comment,
)
from traveltogether.identity.deps import get_current_user
from traveltogether.identity.models import User
from traveltogether.identity.service import get_users_by_ids
from traveltogether.platform.db import get_session
from traveltogether.trips.service import get_trip_membership

router = APIRouter(tags=["collaboration"])


class CommentWithAuthor(CommentPublic):
    author_display_name: str | None = None
    author_avatar_url: str | None = None


def _require_membership(session: Session, trip_id: uuid.UUID, user_id: uuid.UUID) -> None:
    if get_trip_membership(session, trip_id, user_id) is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not a member")


def _get_comment_or_404(session: Session, comment_id: uuid.UUID) -> Comment:
    comment = session.get(Comment, comment_id)
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="comment not found")
    return comment


@router.post(
    "/trips/{trip_id}/comments",
    status_code=status.HTTP_201_CREATED,
    response_model=CommentPublic,
)
def post_comment(
    trip_id: uuid.UUID,
    body: CommentCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> CommentPublic:
    try:
        comment = create_comment(
            session,
            author_id=current_user.id,
            trip_id=trip_id,
            target_type=body.target_type,
            target_id=body.target_id,
            body=body.body,
        )
    except NotMemberError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not a member") from exc
    except EmptyCommentError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="empty comment"
        ) from exc
    return CommentPublic.model_validate(comment)


@router.get("/trips/{trip_id}/comments", response_model=list[CommentWithAuthor])
def get_comments(
    trip_id: uuid.UUID,
    target_type: CommentTargetType,
    target_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[CommentWithAuthor]:
    _require_membership(session, trip_id, current_user.id)
    comments = list_comments(session, target_type, target_id)
    authors = get_users_by_ids(session, [c.author_id for c in comments])
    return [
        CommentWithAuthor(
            **CommentPublic.model_validate(c).model_dump(),
            author_display_name=(
                author.display_name if (author := authors.get(c.author_id)) else None
            ),
            author_avatar_url=(authors[c.author_id].avatar_url if c.author_id in authors else None),
        )
        for c in comments
    ]


@router.patch("/comments/{comment_id}", response_model=CommentPublic)
def patch_comment(
    comment_id: uuid.UUID,
    body: CommentUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> CommentPublic:
    comment = _get_comment_or_404(session, comment_id)
    try:
        updated = update_comment(session, comment, current_user.id, body.body)
    except NotAuthorError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not the author") from exc
    except EmptyCommentError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="empty comment"
        ) from exc
    return CommentPublic.model_validate(updated)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment_route(
    comment_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    comment = _get_comment_or_404(session, comment_id)
    membership = get_trip_membership(session, comment.trip_id, current_user.id)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not a member")
    try:
        delete_comment(session, comment, membership.role, current_user.id)
    except NotAuthorError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="not allowed to delete"
        ) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
