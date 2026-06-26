from __future__ import annotations

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

import travelmanager.identity.domain.models  # noqa: F401 — registra as tabelas em Base.metadata
import travelmanager.trips.domain.models  # noqa: F401 — idem, para o contexto trips (ADR-0011)
from travelmanager.shared.db import Base, normalize_database_url

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# A URL real é injetada por env var; mantém o alembic.ini sem segredos. Passa pela
# mesma normalização do runtime (`shared/db`): o `DATABASE_URL` do Coolify chega como
# `postgres://…`, alias que o SQLAlchemy moderno não resolve — sem isto o
# `engine_from_config` estoura com `NoSuchModuleError: postgres` e a migration no boot
# do container falha (causa do go-live #196 travar mesmo com a CMD de migration).
database_url = os.environ.get("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", normalize_database_url(database_url))

# Fase 2: os modelos de identidade populam o metadata que o autogenerate consome.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
