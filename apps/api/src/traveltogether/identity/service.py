"""Lógica de domínio do boundary identity — perfil do Usuário."""

import uuid

from sqlmodel import Session, col, select

from traveltogether.identity.models import User


def update_user_profile(
    session: Session,
    user: User,
    *,
    display_name: str | None = None,
    avatar_url: str | None = None,
) -> User:
    """Atualiza nome de exibição e/ou avatar do Usuário.

    Atualização parcial: ``None`` mantém o valor atual; string em branco
    limpa o campo (vira ``None``), nunca persiste string vazia.
    """
    if display_name is not None:
        user.display_name = display_name.strip() or None
    if avatar_url is not None:
        user.avatar_url = avatar_url.strip() or None

    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def get_user_id_by_email(session: Session, email: str) -> uuid.UUID | None:
    """Resolve o id do Usuário por e-mail (normalizado), ou None se não existir.

    Interface explícita para outros boundaries (ex.: collaboration resolvendo
    menções `@email`) sem importar o model User (ADR-0014).
    """
    normalized = email.strip().lower()
    user = session.exec(select(User).where(User.email == normalized)).first()
    return user.id if user is not None else None


def get_users_by_ids(session: Session, ids: list[uuid.UUID]) -> dict[uuid.UUID, User]:
    """Resolve vários Usuários por id de uma vez (evita N+1 ao exibir autoria)."""
    if not ids:
        return {}
    rows = session.exec(select(User).where(col(User.id).in_(ids))).all()
    return {user.id: user for user in rows}
