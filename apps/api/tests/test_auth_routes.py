"""Rotas de sessão: GET /auth/me e POST /auth/logout (ADR-0011).

A API admite via Bearer (o token opaco repassado pelo BFF). `/auth/me` descreve
quem é + perfil + se falta onboarding; `/auth/logout` revoga a sessão corrente.
"""

from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from travelmanager.db import get_db
from travelmanager.main import app
from travelmanager.models import Profile, User
from travelmanager.sessions import create_session


@pytest.fixture
def client(db_session: Session) -> Iterator[TestClient]:
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_me_sem_credencial_da_401(client: TestClient) -> None:
    assert client.get("/auth/me").status_code == 401


def test_me_com_token_invalido_da_401(client: TestClient) -> None:
    assert client.get("/auth/me", headers=_auth("token-invalido")).status_code == 401


def test_me_devolve_user_e_needs_onboarding(
    client: TestClient, db_session: Session, user: User
) -> None:
    _, token = create_session(db_session, user)
    resp = client.get("/auth/me", headers=_auth(token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["email"] == user.email
    assert body["needs_onboarding"] is True  # sem perfil onboarded
    assert "is_active" not in body["user"]


def test_me_com_perfil_onboarded_nao_precisa_onboarding(
    client: TestClient, db_session: Session, user: User
) -> None:
    db_session.add(Profile(user_id=user.id, display_name="Ana", onboarded_at=datetime.now(UTC)))
    db_session.flush()
    _, token = create_session(db_session, user)
    body = client.get("/auth/me", headers=_auth(token)).json()
    assert body["needs_onboarding"] is False
    assert body["profile"]["display_name"] == "Ana"


def test_logout_revoga_a_sessao_corrente(
    client: TestClient, db_session: Session, user: User
) -> None:
    _, token = create_session(db_session, user)
    assert client.post("/auth/logout", headers=_auth(token)).status_code == 204
    # token revogado não valida mais
    assert client.get("/auth/me", headers=_auth(token)).status_code == 401


def test_usuario_inativo_e_kill_switch(client: TestClient, db_session: Session, user: User) -> None:
    _, token = create_session(db_session, user)
    user.is_active = False
    db_session.flush()
    assert client.get("/auth/me", headers=_auth(token)).status_code == 401
