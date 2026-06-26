"""Registro dos modelos de identidade no metadata (autoridade de identidade, ADR-0004).

Garante que as tabelas da Fase 2 nascem no mesmo `Base.metadata` (em `shared/db.py`)
que o `alembic/env.py` consome para autogerar migrations — incluindo `rate_events`,
o suporte do rate-limit DB-backed (#194).
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import UniqueConstraint

import travelmanager.identity.domain.models  # noqa: F401 — registra as tabelas em Base.metadata
from travelmanager.identity.domain.models import OtpCode
from travelmanager.shared.db import Base

_NOW = datetime(2026, 6, 24, 12, 0, tzinfo=UTC)


class TestOtpCodeIsRedeemableAt:
    def test_codigo_vivo_e_resgatavel(self) -> None:
        # given: expira no futuro, não consumido
        otp = OtpCode(code_hash="h", expires_at=_NOW + timedelta(minutes=5))
        # when/then:
        assert otp.is_redeemable_at(_NOW) is True

    def test_codigo_expirado_nao_e_resgatavel(self) -> None:
        # given: já expirado
        otp = OtpCode(code_hash="h", expires_at=_NOW - timedelta(seconds=1))
        # when/then:
        assert otp.is_redeemable_at(_NOW) is False

    def test_codigo_consumido_nao_e_resgatavel(self) -> None:
        # given: consumido, ainda que não expirado
        otp = OtpCode(code_hash="h", expires_at=_NOW + timedelta(minutes=5), consumed_at=_NOW)
        # when/then:
        assert otp.is_redeemable_at(_NOW) is False

    def test_expires_at_naive_e_normalizado(self) -> None:
        # given: expires_at sem timezone (como o SQLite devolve)
        otp = OtpCode(code_hash="h", expires_at=datetime(2026, 6, 25, 12, 0))
        # when/then: normaliza para UTC-aware antes de comparar
        assert otp.is_redeemable_at(_NOW) is True


def test_metadata_registra_as_tabelas_do_contexto() -> None:
    # given/when/then: as tabelas do contexto estão no metadata (global, multi-contexto)
    assert {
        "users",
        "profiles",
        "sessions",
        "otp_codes",
        "auth_identities",
        "rate_events",
    } <= set(Base.metadata.tables)


def test_users_tem_email_unico() -> None:
    # given/when/then:
    email = Base.metadata.tables["users"].columns["email"]
    assert email.unique is True


def test_auth_identities_tem_unique_provider_subject() -> None:
    # given:
    table = Base.metadata.tables["auth_identities"]
    # when:
    combos = {
        tuple(sorted(col.name for col in constraint.columns))
        for constraint in table.constraints
        if isinstance(constraint, UniqueConstraint)
    }
    # then:
    assert ("provider", "subject") in combos
