"""Adapter `SqlAlchemyRateLimiter` sobre SQLite (ADR-0005): conta eventos em janela.

`then` afirma o comportamento observável do limitador DB-backed (#194): `record`
grava o evento e `count_since` conta só os de `(scope, key)` dentro da janela —
ignorando os de fora, de outra chave ou de outro escopo. Instantes aware são
normalizados para UTC naive, então a contagem funciona igual no SQLite e no Postgres.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from travelmanager.identity.adapters.repository import SqlAlchemyRateLimiter

_NOW = datetime(2026, 6, 24, 12, 0, tzinfo=UTC)


class TestSqlAlchemyRateLimiter:
    def test_conta_dentro_da_janela_e_ignora_o_resto(self, db_session: Session) -> None:
        # given: três eventos do mesmo (scope, key) e ruído de outra chave/escopo
        limiter = SqlAlchemyRateLimiter(db_session)
        limiter.record("otp:email", "a@x.com", _NOW - timedelta(minutes=2))
        limiter.record("otp:email", "a@x.com", _NOW - timedelta(minutes=40))
        limiter.record("otp:email", "a@x.com", _NOW - timedelta(hours=2))  # fora de 1h
        limiter.record("otp:email", "b@x.com", _NOW)  # outra key
        limiter.record("otp:ip", "a@x.com", _NOW)  # outro scope
        # when/then: a janela de 1h conta só os dois recentes da chave
        assert limiter.count_since("otp:email", "a@x.com", _NOW - timedelta(hours=1)) == 2
        # e uma janela mais larga alcança o terceiro
        assert limiter.count_since("otp:email", "a@x.com", _NOW - timedelta(hours=3)) == 3

    def test_chave_sem_eventos_conta_zero(self, db_session: Session) -> None:
        # given: nenhum evento da chave consultada
        limiter = SqlAlchemyRateLimiter(db_session)
        # when/then:
        assert limiter.count_since("otp:email", "ninguem@x.com", _NOW - timedelta(hours=1)) == 0
