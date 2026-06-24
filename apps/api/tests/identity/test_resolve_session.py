"""Use-case ResolveSession com fakes dos Ports (ADR-0005).

`then` afirma o retorno E o efeito no Port (persistir `last_used_at`) — interação
de Port é comportamento observável, não acoplamento a implementação.
"""

from datetime import timedelta

from tests.identity.conftest import FakeSessionRepository, FixedClock
from travelmanager.identity.application.use_cases import ResolveSession
from travelmanager.identity.domain.models import AuthSession
from travelmanager.identity.domain.rules import hash_session_token

_PEPPER = "test-pepper"


def _seed_session(
    sessions: FakeSessionRepository, clock: FixedClock, *, raw: str = "tok", **overrides: object
) -> AuthSession:
    """Semeia uma sessão no repo a partir do token cru; `overrides` ajusta campos."""
    fields: dict[str, object] = {
        "token_hash": hash_session_token(raw, _PEPPER),
        "expires_at": clock.now() + timedelta(days=1),
    }
    fields.update(overrides)
    session = AuthSession(**fields)
    sessions.save(session)
    return session


class TestResolveSession:
    def test_token_valido_devolve_a_sessao_e_marca_uso(
        self, sessions: FakeSessionRepository, clock: FixedClock
    ) -> None:
        # given: sessão viva semeada
        session = _seed_session(sessions, clock, raw="tok")
        resolve = ResolveSession(sessions, clock, pepper=_PEPPER)
        # when:
        result = resolve("tok")
        # then: devolve a sessão E persiste o uso
        assert result is session
        assert session.last_used_at == clock.now()
        assert session in sessions.saved

    def test_token_inexistente_devolve_none(
        self, sessions: FakeSessionRepository, clock: FixedClock
    ) -> None:
        # given: repo sem a sessão do token
        resolve = ResolveSession(sessions, clock, pepper=_PEPPER)
        # when/then:
        assert resolve("nao-existe") is None

    def test_sessao_expirada_devolve_none(
        self, sessions: FakeSessionRepository, clock: FixedClock
    ) -> None:
        # given: sessão já expirada
        _seed_session(sessions, clock, raw="tok", expires_at=clock.now() - timedelta(seconds=1))
        resolve = ResolveSession(sessions, clock, pepper=_PEPPER)
        # when/then:
        assert resolve("tok") is None

    def test_sessao_revogada_devolve_none(
        self, sessions: FakeSessionRepository, clock: FixedClock
    ) -> None:
        # given: sessão revogada
        _seed_session(sessions, clock, raw="tok", revoked_at=clock.now())
        resolve = ResolveSession(sessions, clock, pepper=_PEPPER)
        # when/then:
        assert resolve("tok") is None
