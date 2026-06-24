"""Use-case CreateSession com fakes dos Ports (ADR-0013): só o hash é persistido.

O token cru existe uma vez (no retorno); o repositório guarda a entidade com o
HMAC. `then` afirma orquestração + efeito no Port.
"""

from datetime import timedelta

from tests.identity.conftest import FakeSessionRepository, FakeTokenGenerator, FixedClock
from travelmanager.identity.application.use_cases import DEFAULT_SESSION_TTL, CreateSession
from travelmanager.identity.domain.models import User
from travelmanager.identity.domain.rules import hash_session_token


class TestCreateSession:
    def test_persiste_so_o_hash_e_devolve_o_token(
        self, sessions: FakeSessionRepository, clock: FixedClock, tokens: FakeTokenGenerator
    ) -> None:
        # given: gerador de token previsível e pepper de teste
        create = CreateSession(sessions, clock, tokens, pepper="test-pepper")
        # when:
        session, token = create(User(email="a@b.c"))
        # then: token em claro devolvido; banco só com o hash
        assert token == tokens.generate()
        assert session.token_hash == hash_session_token(token, "test-pepper")
        assert session.token_hash != token
        assert session in sessions.saved

    def test_expira_segundo_o_relogio_e_ttl(
        self, sessions: FakeSessionRepository, clock: FixedClock, tokens: FakeTokenGenerator
    ) -> None:
        # given: ttl explícito
        create = CreateSession(sessions, clock, tokens, pepper="test-pepper")
        # when:
        session, _ = create(User(email="a@b.c"), ttl=timedelta(hours=1))
        # then:
        assert session.expires_at == clock.now() + timedelta(hours=1)

    def test_ttl_default_e_30_dias(
        self, sessions: FakeSessionRepository, clock: FixedClock, tokens: FakeTokenGenerator
    ) -> None:
        # given: sem ttl
        create = CreateSession(sessions, clock, tokens, pepper="test-pepper")
        # when:
        session, _ = create(User(email="a@b.c"))
        # then:
        assert session.expires_at == clock.now() + DEFAULT_SESSION_TTL
