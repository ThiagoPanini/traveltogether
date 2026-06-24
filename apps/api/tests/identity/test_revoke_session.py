"""Use-case RevokeSession com fakes dos Ports (ADR-0005): o motor do logout.

Revogar é escrita de segurança (kill-switch); o teste prova que o efeito foi
**pedido para persistir**, não só mutado em memória. `RevokeAllSessions` é o logout
global da #194 (ADR-0004: sessão opaca revogável por-dispositivo **e** global).
"""

import uuid
from datetime import timedelta

from tests.identity.conftest import FakeSessionRepository, FixedClock
from travelmanager.identity.application.use_cases import RevokeAllSessions, RevokeSession
from travelmanager.identity.domain.models import AuthSession, User


class TestRevokeSession:
    def test_marca_revoked_at_e_persiste(
        self, sessions: FakeSessionRepository, clock: FixedClock
    ) -> None:
        # given: sessão viva
        session = AuthSession(token_hash="h", expires_at=clock.now() + timedelta(days=1))
        revoke = RevokeSession(sessions, clock)
        # when:
        revoke(session)
        # then: carimba a revogação no instante do relógio e persiste o efeito
        assert session.revoked_at == clock.now()
        assert session in sessions.saved

    def test_revogada_deixa_de_validar(
        self, sessions: FakeSessionRepository, clock: FixedClock
    ) -> None:
        # given: sessão viva
        session = AuthSession(token_hash="h", expires_at=clock.now() + timedelta(days=1))
        assert session.is_valid_at(clock.now()) is True
        # when:
        RevokeSession(sessions, clock)(session)
        # then:
        assert session.is_valid_at(clock.now()) is False


class TestRevokeAllSessions:
    def test_revoga_todas_do_usuario_e_poupa_as_dos_outros(
        self, sessions: FakeSessionRepository, clock: FixedClock
    ) -> None:
        # given: um usuário com duas sessões vivas e outro usuário com a sua
        user = User(id=uuid.uuid4(), email="viajante@example.com")
        other = User(id=uuid.uuid4(), email="outro@example.com")
        mine = [
            AuthSession(user_id=user.id, token_hash=h, expires_at=clock.now() + timedelta(days=1))
            for h in ("h1", "h2")
        ]
        theirs = AuthSession(
            user_id=other.id, token_hash="h3", expires_at=clock.now() + timedelta(days=1)
        )
        for session in [*mine, theirs]:
            sessions.save(session)
        # when:
        revoked = RevokeAllSessions(sessions, clock)(user)
        # then: as duas do usuário caem; a do outro segue viva
        assert revoked == 2
        assert all(session.revoked_at == clock.now() for session in mine)
        assert theirs.revoked_at is None
