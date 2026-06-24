"""Adapter outbound: `SessionRepository` sobre SQLAlchemy (ADR-0005).

Satisfaz o Port `SessionRepository` **estruturalmente** (sem herdar). `save()`
colapsa criação e mutação num só método: em SQLAlchemy ambos são `add` + `flush`
— o `flush` aflora erro de constraint **dentro** do use-case (traduzível); a
durabilidade fica para o commit único em `get_db`.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from travelmanager.identity.domain.models import AuthSession


class SqlAlchemySessionRepository:
    """Repositório de sessões ligado a uma `Session` do request."""

    def __init__(self, db: Session) -> None:
        """Inicializa o repositório.

        Args:
            db: Sessão SQLAlchemy do request corrente.
        """
        self._db = db

    def get_by_token_hash(self, token_hash: str) -> AuthSession | None:
        """Busca a sessão pelo hash do token.

        Args:
            token_hash: O HMAC do token.

        Returns:
            A sessão correspondente, ou `None`.
        """
        return self._db.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash))

    def save(self, session: AuthSession) -> None:
        """Persiste a sessão: `add` + `flush` (sem commit).

        Args:
            session: A entidade a persistir.
        """
        self._db.add(session)
        self._db.flush()
