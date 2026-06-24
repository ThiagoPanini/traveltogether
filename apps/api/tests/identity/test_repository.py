"""Adapter outbound SqlAlchemySessionRepository sobre SQLite real (ADR-0013).

Costura de persistência: prova que `save` grava e `get_by_token_hash` lê de volta.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from travelmanager.identity.adapters.repository import SqlAlchemySessionRepository
from travelmanager.identity.domain.models import AuthSession, User


class TestSqlAlchemySessionRepository:
    def test_save_persiste_e_get_le_de_volta(self, db_session: Session, user: User) -> None:
        # given: uma sessão para o usuário
        repo = SqlAlchemySessionRepository(db_session)
        session = AuthSession(
            user_id=user.id,
            token_hash="hash-1",
            expires_at=datetime.now(UTC) + timedelta(days=1),
        )
        # when:
        repo.save(session)
        # then: recuperável pelo hash
        assert repo.get_by_token_hash("hash-1") is session

    def test_get_de_hash_inexistente_devolve_none(self, db_session: Session) -> None:
        # given: repo vazio
        repo = SqlAlchemySessionRepository(db_session)
        # when/then:
        assert repo.get_by_token_hash("nao-existe") is None
