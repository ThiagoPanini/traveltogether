"""Primitivas de sessão opaca (ADR-0011): criar -> validar -> revogar.

O token só existe em claro no retorno de `create_session`; o banco guarda
apenas o HMAC. Sessão expirada ou revogada não valida.
"""

from datetime import timedelta

from sqlalchemy.orm import Session

from travelmanager.models import AuthSession, User
from travelmanager.sessions import (
    create_session,
    hash_session_token,
    resolve_session,
    revoke_session,
)


def test_create_persiste_so_o_hash(db_session: Session, user: User) -> None:
    session, token = create_session(db_session, user)
    assert token  # token em claro devolvido uma vez
    assert session.token_hash != token  # nunca o token cru
    assert session.token_hash == hash_session_token(token)


def test_resolve_devolve_a_sessao_do_token_valido(db_session: Session, user: User) -> None:
    _, token = create_session(db_session, user)
    resolved = resolve_session(db_session, token)
    assert resolved is not None
    assert resolved.user_id == user.id


def test_resolve_marca_last_used(db_session: Session, user: User) -> None:
    _, token = create_session(db_session, user)
    resolved = resolve_session(db_session, token)
    assert resolved is not None
    assert resolved.last_used_at is not None


def test_token_errado_nao_valida(db_session: Session, user: User) -> None:
    create_session(db_session, user)
    assert resolve_session(db_session, "token-que-nao-existe") is None


def test_sessao_expirada_nao_valida(db_session: Session, user: User) -> None:
    _, token = create_session(db_session, user, ttl=timedelta(seconds=-1))
    assert resolve_session(db_session, token) is None


def test_sessao_revogada_nao_valida(db_session: Session, user: User) -> None:
    session, token = create_session(db_session, user)
    revoke_session(db_session, session)
    assert resolve_session(db_session, token) is None


def test_revoke_marca_revoked_at(db_session: Session, user: User) -> None:
    session, _ = create_session(db_session, user)
    assert isinstance(session, AuthSession)
    revoke_session(db_session, session)
    assert session.revoked_at is not None
