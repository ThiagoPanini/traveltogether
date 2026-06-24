"""Registro dos modelos de identidade no metadata (autoridade de identidade, ADR-0011).

Garante que as 5 tabelas da Fase 2 nascem no mesmo `Base.metadata` que o
`alembic/env.py` consome para autogerar migrations.
"""

from sqlalchemy import UniqueConstraint

from travelmanager.models import Base


def test_metadata_registra_as_cinco_tabelas() -> None:
    assert set(Base.metadata.tables) == {
        "users",
        "profiles",
        "sessions",
        "otp_codes",
        "auth_identities",
    }


def test_users_tem_email_unico() -> None:
    email = Base.metadata.tables["users"].columns["email"]
    assert email.unique is True


def test_auth_identities_tem_unique_provider_subject() -> None:
    table = Base.metadata.tables["auth_identities"]
    combos = {
        tuple(sorted(col.name for col in constraint.columns))
        for constraint in table.constraints
        if isinstance(constraint, UniqueConstraint)
    }
    assert ("provider", "subject") in combos
