"""Rotas HTTP de Tarefa (boundary collaboration, ADR-0014, invariante 18)."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, SQLModel

from traveltogether.collaboration.models import (
    Task,
    TaskCreate,
    TaskPublic,
    TaskStatus,
    TaskUpdate,
)
from traveltogether.collaboration.task_service import (
    EmptyTitleError,
    InvalidAnchorError,
    InvalidAssigneeError,
    NotAssigneeError,
    NotOrganizerError,
    create_task,
    delete_task,
    get_assignee_ids,
    list_tasks,
    list_user_tasks,
    set_task_status,
    update_task,
)
from traveltogether.identity.deps import get_current_user
from traveltogether.identity.models import User
from traveltogether.identity.service import get_users_by_ids
from traveltogether.platform.db import get_session
from traveltogether.trips.service import get_trip_membership

router = APIRouter(tags=["tasks"])


class TaskAssigneePublic(SQLModel):
    user_id: uuid.UUID
    display_name: str | None = None
    avatar_url: str | None = None


class TaskWithAssignees(TaskPublic):
    assignees: list[TaskAssigneePublic] = []


class TaskStatusUpdate(SQLModel):
    status: TaskStatus


def _require_membership(session: Session, trip_id: uuid.UUID, user_id: uuid.UUID) -> None:
    if get_trip_membership(session, trip_id, user_id) is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not a member")


def _get_task_or_404(session: Session, task_id: uuid.UUID) -> Task:
    task = session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="task not found")
    return task


def _to_enriched(session: Session, task: Task) -> TaskWithAssignees:
    ids = get_assignee_ids(session, task.id)
    users = get_users_by_ids(session, ids)
    assignees = [
        TaskAssigneePublic(
            user_id=uid,
            display_name=users[uid].display_name if uid in users else None,
            avatar_url=users[uid].avatar_url if uid in users else None,
        )
        for uid in ids
    ]
    return TaskWithAssignees(**task.model_dump(), assignee_ids=ids, assignees=assignees)


@router.post(
    "/trips/{trip_id}/tasks",
    status_code=status.HTTP_201_CREATED,
    response_model=TaskWithAssignees,
)
def post_task(
    trip_id: uuid.UUID,
    body: TaskCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> TaskWithAssignees:
    try:
        task = create_task(
            session,
            trip_id=trip_id,
            created_by=current_user.id,
            title=body.title,
            description=body.description,
            due_date=body.due_date,
            anchor_type=body.anchor_type,
            anchor_id=body.anchor_id,
            assignee_ids=body.assignee_ids,
        )
    except NotOrganizerError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="organizer required"
        ) from exc
    except EmptyTitleError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="empty title"
        ) from exc
    except (InvalidAssigneeError, InvalidAnchorError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    return _to_enriched(session, task)


@router.get("/trips/{trip_id}/tasks", response_model=list[TaskWithAssignees])
def get_tasks(
    trip_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[TaskWithAssignees]:
    _require_membership(session, trip_id, current_user.id)
    return [_to_enriched(session, task) for task in list_tasks(session, trip_id)]


@router.get("/me/tasks", response_model=list[TaskWithAssignees])
def get_my_tasks(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> list[TaskWithAssignees]:
    """Tarefas em que o usuário é Responsável — alimenta 'O que precisa de mim' (#58)."""
    return [_to_enriched(session, task) for task in list_user_tasks(session, current_user.id)]


@router.patch("/tasks/{task_id}", response_model=TaskWithAssignees)
def patch_task(
    task_id: uuid.UUID,
    body: TaskUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> TaskWithAssignees:
    task = _get_task_or_404(session, task_id)
    try:
        updated = update_task(
            session,
            task,
            current_user.id,
            title=body.title,
            description=body.description,
            due_date=body.due_date,
            anchor_type=body.anchor_type,
            anchor_id=body.anchor_id,
            assignee_ids=body.assignee_ids,
        )
    except NotOrganizerError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="organizer required"
        ) from exc
    except EmptyTitleError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="empty title"
        ) from exc
    except (InvalidAssigneeError, InvalidAnchorError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    return _to_enriched(session, updated)


@router.patch("/tasks/{task_id}/status", response_model=TaskWithAssignees)
def patch_task_status(
    task_id: uuid.UUID,
    body: TaskStatusUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> TaskWithAssignees:
    task = _get_task_or_404(session, task_id)
    try:
        updated = set_task_status(session, task, current_user.id, body.status)
    except NotAssigneeError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="assignee or organizer required"
        ) from exc
    return _to_enriched(session, updated)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task_route(
    task_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> Response:
    task = _get_task_or_404(session, task_id)
    try:
        delete_task(session, task, current_user.id)
    except NotOrganizerError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="organizer required"
        ) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
