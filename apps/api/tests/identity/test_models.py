"""Registro dos modelos de identidade no metadata (autoridade de identidade, ADR-0004).

Garante que as 5 tabelas da Fase 2 nascem no mesmo `Base.metadata` (em
`shared/db.py`) que o `alembic/env.py` consome para autogerar migrations.
"""

from sqlalchemy import UniqueConstraint

import travelmanager.identity.domain.models  # noqa: F401 — registra as tabelas em Base.metadata
from travelmanager.shared.db import Base


def test_metadata_registra_as_cinco_tabelas() -> None:
    # given/when/then: as 5 tabelas do contexto estão no metadata
    assert set(Base.metadata.tables) == {
        "users",
        "profiles",
        "sessions",
        "otp_codes",
        "auth_identities",
    }


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
