"""Regras puras de identidade: hash da sessão + validade da entidade (ADR-0013).

Domínio puro, sem double e sem banco: o `then` afirma só a regra.
"""

from datetime import UTC, datetime, timedelta

from travelmanager.identity.domain.models import AuthSession
from travelmanager.identity.domain.rules import hash_session_token

_NOW = datetime(2026, 6, 24, 12, 0, tzinfo=UTC)


class TestHashSessionToken:
    def test_e_deterministico_e_difere_do_token(self) -> None:
        # given: um token e um pepper
        token, pepper = "tok-cru", "pepper-x"
        # when:
        digest = hash_session_token(token, pepper)
        # then: hex estável e nunca o token cru
        assert digest == hash_session_token(token, pepper)
        assert digest != token

    def test_pepper_diferente_muda_o_hash(self) -> None:
        # given: o mesmo token sob dois peppers
        # when:
        a = hash_session_token("tok-cru", "pepper-a")
        b = hash_session_token("tok-cru", "pepper-b")
        # then:
        assert a != b


class TestAuthSessionIsValidAt:
    def test_sessao_viva_e_valida(self) -> None:
        # given: expira no futuro, não revogada
        session = AuthSession(token_hash="h", expires_at=_NOW + timedelta(days=1))
        # when/then:
        assert session.is_valid_at(_NOW) is True

    def test_sessao_expirada_nao_e_valida(self) -> None:
        # given: já expirada
        session = AuthSession(token_hash="h", expires_at=_NOW - timedelta(seconds=1))
        # when/then:
        assert session.is_valid_at(_NOW) is False

    def test_sessao_revogada_nao_e_valida(self) -> None:
        # given: revogada, ainda que não expirada
        session = AuthSession(token_hash="h", expires_at=_NOW + timedelta(days=1), revoked_at=_NOW)
        # when/then:
        assert session.is_valid_at(_NOW) is False

    def test_expires_at_naive_e_normalizado(self) -> None:
        # given: expires_at sem timezone (como o SQLite devolve)
        session = AuthSession(token_hash="h", expires_at=datetime(2026, 6, 25, 12, 0))
        # when/then: normaliza para UTC-aware antes de comparar
        assert session.is_valid_at(_NOW) is True
