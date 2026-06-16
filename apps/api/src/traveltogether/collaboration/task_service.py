"""Lógica de domínio de Tarefa (boundary collaboration, ADR-0014, invariante 18).

Zero dependências de FastAPI. Autorização e existência de âncora/Responsáveis
são checadas via service do boundary dono (trips/fares), nunca importando seus
modelos além de Membership/role para a regra de papel.

Invariante 18: só Organizador cria/atribui/edita/apaga; qualquer Responsável
(mesmo Membro) move o status da Tarefa em que está designado.
"""

import uuid
from collections.abc import Sequence
from datetime import UTC, date, datetime

from sqlmodel import Session, col, select

from traveltogether.collaboration.models import (
    Task,
    TaskAnchorType,
    TaskAssignee,
    TaskStatus,
)
from traveltogether.fares.service import fare_quote_trip_id
from traveltogether.trips.models import MembershipRole
from traveltogether.trips.service import (
    get_trip_membership,
    itinerary_item_trip_id,
    leg_trip_id,
    stop_trip_id,
)


class NotOrganizerError(Exception):
    """Só o Organizador cria/edita/apaga/atribui Tarefa (invariante 18)."""


class InvalidAssigneeError(Exception):
    """Responsável precisa ter Membership na Viagem."""


class NotAssigneeError(Exception):
    """Só um Responsável (ou Organizador) move o status da Tarefa."""


class EmptyTitleError(ValueError):
    """Título da Tarefa em branco."""


class InvalidAnchorError(Exception):
    """Âncora não existe ou não pertence à Viagem da Tarefa."""


def _require_organizer(session: Session, trip_id: uuid.UUID, user_id: uuid.UUID) -> None:
    membership = get_trip_membership(session, trip_id, user_id)
    if membership is None or membership.role != MembershipRole.organizer:
        raise NotOrganizerError("ação exige Organizador da Viagem")


def _anchor_trip_id(
    session: Session, anchor_type: TaskAnchorType, anchor_id: uuid.UUID
) -> uuid.UUID | None:
    if anchor_type == TaskAnchorType.leg:
        return leg_trip_id(session, anchor_id)
    if anchor_type == TaskAnchorType.stop:
        return stop_trip_id(session, anchor_id)
    if anchor_type == TaskAnchorType.itinerary_item:
        return itinerary_item_trip_id(session, anchor_id)
    return fare_quote_trip_id(session, anchor_id)


def _validate_anchor(
    session: Session,
    trip_id: uuid.UUID,
    anchor_type: TaskAnchorType | None,
    anchor_id: uuid.UUID | None,
) -> None:
    if anchor_type is None and anchor_id is None:
        return
    if anchor_type is None or anchor_id is None:
        raise InvalidAnchorError("âncora exige type e id juntos")
    if _anchor_trip_id(session, anchor_type, anchor_id) != trip_id:
        raise InvalidAnchorError("âncora não pertence à Viagem")


def _set_assignees(
    session: Session, task: Task, trip_id: uuid.UUID, assignee_ids: Sequence[uuid.UUID]
) -> None:
    """Substitui os Responsáveis da Tarefa; cada um precisa ter Membership."""
    for user_id in assignee_ids:
        if get_trip_membership(session, trip_id, user_id) is None:
            raise InvalidAssigneeError("Responsável precisa ser Membro da Viagem")

    existing = session.exec(select(TaskAssignee).where(TaskAssignee.task_id == task.id)).all()
    for row in existing:
        session.delete(row)
    for user_id in dict.fromkeys(assignee_ids):
        session.add(TaskAssignee(task_id=task.id, user_id=user_id))


def get_assignee_ids(session: Session, task_id: uuid.UUID) -> list[uuid.UUID]:
    """IDs dos Responsáveis de uma Tarefa."""
    return list(session.exec(select(TaskAssignee.user_id).where(TaskAssignee.task_id == task_id)))


def _notify_new_assignees(
    session: Session,
    task: Task,
    previous_ids: Sequence[uuid.UUID],
    actor_id: uuid.UUID,
) -> None:
    """Avisa quem virou Responsável agora (e não era), exceto o ator (ADR-0017)."""
    from traveltogether.notifications.models import NotificationKind  # noqa: PLC0415
    from traveltogether.notifications.service import notify  # noqa: PLC0415

    previous = set(previous_ids)
    for user_id in get_assignee_ids(session, task.id):
        if user_id in previous or user_id == actor_id:
            continue
        notify(
            session,
            recipient_id=user_id,
            kind=NotificationKind.task,
            text=f"Você foi designado para a Tarefa '{task.title}'",
            trip_id=task.trip_id,
            target_type="task",
            target_id=task.id,
        )


def create_task(
    session: Session,
    *,
    trip_id: uuid.UUID,
    created_by: uuid.UUID,
    title: str,
    description: str = "",
    due_date: date | None = None,
    anchor_type: TaskAnchorType | None = None,
    anchor_id: uuid.UUID | None = None,
    assignee_ids: Sequence[uuid.UUID] = (),
) -> Task:
    """Cria uma Tarefa; só o Organizador pode (invariante 18)."""
    _require_organizer(session, trip_id, created_by)
    if not title.strip():
        raise EmptyTitleError("título da Tarefa não pode ser vazio")
    _validate_anchor(session, trip_id, anchor_type, anchor_id)

    task = Task(
        trip_id=trip_id,
        title=title.strip(),
        description=description.strip(),
        due_date=due_date,
        anchor_type=anchor_type,
        anchor_id=anchor_id,
        created_by=created_by,
    )
    session.add(task)
    session.flush()
    _set_assignees(session, task, trip_id, assignee_ids)
    session.commit()
    session.refresh(task)
    _notify_new_assignees(session, task, previous_ids=(), actor_id=created_by)
    return task


def update_task(
    session: Session,
    task: Task,
    user_id: uuid.UUID,
    *,
    title: str | None = None,
    description: str | None = None,
    due_date: date | None = None,
    anchor_type: TaskAnchorType | None = None,
    anchor_id: uuid.UUID | None = None,
    assignee_ids: Sequence[uuid.UUID] | None = None,
) -> Task:
    """Edita a Tarefa; só o Organizador pode (invariante 18)."""
    _require_organizer(session, task.trip_id, user_id)
    if title is not None:
        if not title.strip():
            raise EmptyTitleError("título da Tarefa não pode ser vazio")
        task.title = title.strip()
    if description is not None:
        task.description = description.strip()
    if due_date is not None:
        task.due_date = due_date
    if anchor_type is not None or anchor_id is not None:
        _validate_anchor(session, task.trip_id, anchor_type, anchor_id)
        task.anchor_type = anchor_type
        task.anchor_id = anchor_id
    previous_assignees: list[uuid.UUID] = []
    if assignee_ids is not None:
        previous_assignees = get_assignee_ids(session, task.id)
        _set_assignees(session, task, task.trip_id, assignee_ids)
    task.updated_at = datetime.now(UTC)
    session.add(task)
    session.commit()
    session.refresh(task)
    if assignee_ids is not None:
        _notify_new_assignees(session, task, previous_ids=previous_assignees, actor_id=user_id)
    return task


def delete_task(session: Session, task: Task, user_id: uuid.UUID) -> None:
    """Apaga a Tarefa; só o Organizador pode (invariante 18)."""
    _require_organizer(session, task.trip_id, user_id)
    for row in session.exec(select(TaskAssignee).where(TaskAssignee.task_id == task.id)).all():
        session.delete(row)
    session.delete(task)
    session.commit()


def set_task_status(session: Session, task: Task, user_id: uuid.UUID, status: TaskStatus) -> Task:
    """Move o status; permitido a um Responsável ou ao Organizador (invariante 18)."""
    membership = get_trip_membership(session, task.trip_id, user_id)
    is_organizer = membership is not None and membership.role == MembershipRole.organizer
    is_assignee = user_id in get_assignee_ids(session, task.id)
    if not (is_organizer or is_assignee):
        raise NotAssigneeError("só um Responsável ou o Organizador move o status")

    task.status = status
    task.updated_at = datetime.now(UTC)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


def list_tasks(session: Session, trip_id: uuid.UUID) -> list[Task]:
    """Tarefas da Viagem, ordenadas por criação."""
    return list(
        session.exec(select(Task).where(Task.trip_id == trip_id).order_by(col(Task.created_at)))
    )


def list_user_tasks(session: Session, user_id: uuid.UUID) -> list[Task]:
    """Tarefas em que o usuário é Responsável (alimenta 'O que precisa de mim', #58)."""
    return list(
        session.exec(
            select(Task)
            .join(TaskAssignee, col(TaskAssignee.task_id) == col(Task.id))
            .where(TaskAssignee.user_id == user_id)
            .order_by(col(Task.created_at))
        )
    )
