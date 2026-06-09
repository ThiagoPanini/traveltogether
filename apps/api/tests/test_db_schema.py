"""Testes de bootstrap de schema do banco."""

from sqlalchemy import inspect
from sqlmodel import create_engine

from traveltogether.identity.models import User
from traveltogether.platform.db import create_db_schema


def test_create_db_schema_creates_identity_user_table() -> None:
    engine = create_engine("sqlite://")

    create_db_schema(engine)

    assert inspect(engine).has_table(User.__tablename__)
