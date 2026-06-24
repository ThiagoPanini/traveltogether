"""Caracterização HTTP de `/auth/me` e `/auth/logout` (ADR-0011; refactor ADR-0013).

Trava o comportamento observável de create/resolve/revoke de sessão visto pela
**borda HTTP** — a superfície invariante ao refactor hexagonal. Estes testes
passam **antes e depois** do move; só o seam de minting (em `conftest`) segue o
código. São testes de **caracterização**: travam o que existe, não desejam o novo.
"""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from travelmanager.identity.domain.models import Profile, User


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


class TestAuthMe:
    def test_sem_credencial_retorna_401(self, client: TestClient) -> None:
        # given: requisição sem header Authorization
        # when:
        resp = client.get("/auth/me")
        # then:
        assert resp.status_code == 401

    def test_token_invalido_retorna_401(self, client: TestClient) -> None:
        # given: bearer que não corresponde a nenhuma sessão
        # when:
        resp = client.get("/auth/me", headers=_auth("token-invalido"))
        # then:
        assert resp.status_code == 401

    def test_sessao_valida_retorna_user_e_needs_onboarding(
        self, client: TestClient, user: User, mint_session: Callable[..., str]
    ) -> None:
        # given: sessão viva para usuário sem perfil
        token = mint_session(user)
        # when:
        resp = client.get("/auth/me", headers=_auth(token))
        # then:
        assert resp.status_code == 200
        body = resp.json()
        assert body["user"]["email"] == user.email
        assert body["needs_onboarding"] is True

    def test_nao_vaza_is_active(
        self, client: TestClient, user: User, mint_session: Callable[..., str]
    ) -> None:
        # given: sessão viva
        token = mint_session(user)
        # when:
        body = client.get("/auth/me", headers=_auth(token)).json()
        # then: kill-switch interno nunca viaja no contrato
        assert "is_active" not in body["user"]

    def test_perfil_onboarded_dispensa_onboarding(
        self,
        client: TestClient,
        db_session: Session,
        user: User,
        mint_session: Callable[..., str],
    ) -> None:
        # given: perfil com onboarded_at preenchido
        db_session.add(Profile(user_id=user.id, display_name="Ana", onboarded_at=datetime.now(UTC)))
        db_session.flush()
        token = mint_session(user)
        # when:
        body = client.get("/auth/me", headers=_auth(token)).json()
        # then:
        assert body["needs_onboarding"] is False
        assert body["profile"]["display_name"] == "Ana"

    def test_sessao_expirada_retorna_401(
        self, client: TestClient, user: User, mint_session: Callable[..., str]
    ) -> None:
        # given: sessão já expirada no minting
        token = mint_session(user, ttl=timedelta(seconds=-1))
        # when:
        resp = client.get("/auth/me", headers=_auth(token))
        # then:
        assert resp.status_code == 401

    def test_usuario_inativo_retorna_401(
        self,
        client: TestClient,
        db_session: Session,
        user: User,
        mint_session: Callable[..., str],
    ) -> None:
        # given: kill-switch acionado depois de criada a sessão
        token = mint_session(user)
        user.is_active = False
        db_session.flush()
        # when:
        resp = client.get("/auth/me", headers=_auth(token))
        # then:
        assert resp.status_code == 401


class TestAuthLogout:
    def test_logout_revoga_sessao_corrente(
        self, client: TestClient, user: User, mint_session: Callable[..., str]
    ) -> None:
        # given: sessão viva
        token = mint_session(user)
        # when: logout revoga a sessão corrente
        logout = client.post("/auth/logout", headers=_auth(token))
        # then: 204 e o token deixa de validar
        assert logout.status_code == 204
        assert client.get("/auth/me", headers=_auth(token)).status_code == 401

    def test_logout_sem_credencial_retorna_401(self, client: TestClient) -> None:
        # given: requisição sem credencial
        # when:
        resp = client.post("/auth/logout")
        # then:
        assert resp.status_code == 401
