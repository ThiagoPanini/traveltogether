"""Use-case RevokeSession com fakes dos Ports (ADR-0005): o motor do logout.

Revogar é escrita de segurança (kill-switch); o teste prova que o efeito foi
**pedido para persistir**, não só mutado em memória.
"""

from datetime import timedelta

from tests.identity.conftest import FakeSessionRepository, FixedClock
from travelmanager.identity.application.use_cases import RevokeSession
from travelmanager.identity.domain.models import AuthSession


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
