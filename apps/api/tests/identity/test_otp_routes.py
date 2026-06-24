"""Caracterização HTTP de `/auth/otp/request` e `/auth/otp/verify` (ADR-0004/0005).

Exercita a fatia inteira pela borda HTTP (rota → use-case → repos SQLite → mint),
travando o contrato que o BFF consome. O gerador de código é sobrescrito por um
fixo para que o teste conheça o código emitido (em produção é `secrets`).
"""

from collections.abc import Iterator
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from travelmanager.identity.adapters.dependencies import (
    provide_code_generator,
    provide_rate_limiter,
)
from travelmanager.identity.domain.models import OtpCode, User
from travelmanager.main import app

_FIXED_CODE = "246813"
_EMAIL = "viajante@example.com"


class _FixedCode:
    def generate(self) -> str:
        return _FIXED_CODE


class _BlockingLimiter:
    """`RateLimiter` que finge estar sempre estourado (qualquer janela)."""

    def count_since(self, scope: str, key: str, since: datetime) -> int:
        return 1_000_000

    def record(self, scope: str, key: str, at: datetime) -> None: ...


@pytest.fixture
def fixed_code() -> Iterator[None]:
    """Sobrescreve o gerador de código por um valor previsível."""
    app.dependency_overrides[provide_code_generator] = _FixedCode
    yield
    app.dependency_overrides.pop(provide_code_generator, None)


@pytest.fixture
def rate_limited() -> Iterator[None]:
    """Força o rate-limit a barrar todo pedido."""
    app.dependency_overrides[provide_rate_limiter] = lambda: _BlockingLimiter()
    yield
    app.dependency_overrides.pop(provide_rate_limiter, None)


def _request(client: TestClient, email: str = _EMAIL) -> Response:
    return client.post("/auth/otp/request", json={"email": email})


def _verify(client: TestClient, code: str, email: str = _EMAIL) -> Response:
    return client.post("/auth/otp/verify", json={"email": email, "code": code})


class TestOtpRequest:
    def test_responde_202_sem_vazar_o_codigo(self, client: TestClient, fixed_code: None) -> None:
        # given/when: pede um código
        resp = _request(client)
        # then: aceito, e o corpo nunca carrega o código (anti-vazamento)
        assert resp.status_code == 202
        assert _FIXED_CODE not in resp.text

    def test_email_qualquer_e_aceito_anti_enumeracao(
        self, client: TestClient, fixed_code: None
    ) -> None:
        # given/when: e-mail sem conta nenhuma
        resp = _request(client, "desconhecido@example.com")
        # then: resposta idêntica (não revela existência de conta)
        assert resp.status_code == 202

    def test_resposta_identica_para_conta_existente_e_inexistente(
        self, client: TestClient, user: User, fixed_code: None
    ) -> None:
        # given: uma conta já existe (fixture `user`)
        # when: pede código para a conta existente e para uma que não existe
        existente = _request(client, user.email)
        inexistente = _request(client, "fantasma@example.com")
        # then: status e corpo idênticos — não dá pra inferir quem tem cadastro (#194)
        assert existente.status_code == inexistente.status_code == 202
        assert existente.text == inexistente.text == ""

    def test_excesso_retorna_429_sem_gerar_codigo(
        self,
        client: TestClient,
        db_session: Session,
        fixed_code: None,
        rate_limited: None,
    ) -> None:
        # given: rate-limit estourado
        # when:
        resp = _request(client)
        # then: 429 com contrato {code, detail} e nenhum código gravado (#194)
        assert resp.status_code == 429
        assert resp.json()["code"] == "rate_limited"
        assert db_session.scalar(select(func.count()).select_from(OtpCode)) == 0


class TestOtpVerify:
    def test_codigo_certo_autentica_e_devolve_sessao(
        self, client: TestClient, fixed_code: None
    ) -> None:
        # given: um código pedido
        _request(client)
        # when: verifica com o código correto
        resp = _verify(client, _FIXED_CODE)
        # then: 200 com user, token de sessão e flag de onboarding
        assert resp.status_code == 200
        body = resp.json()
        assert body["user"]["email"] == _EMAIL
        assert body["needs_onboarding"] is True
        assert body["session_token"]
        # e o token cunhado de fato resolve em /auth/me
        me = client.get("/auth/me", headers={"Authorization": f"Bearer {body['session_token']}"})
        assert me.status_code == 200
        assert me.json()["user"]["email"] == _EMAIL

    def test_codigo_errado_retorna_401(self, client: TestClient, fixed_code: None) -> None:
        # given: código pedido
        _request(client)
        # when: verifica com código errado
        resp = _verify(client, "000000")
        # then: 401 com corpo de contrato {code, detail}
        assert resp.status_code == 401
        assert resp.json()["code"] == "domain_error"

    def test_codigo_nao_reutilizavel(self, client: TestClient, fixed_code: None) -> None:
        # given: código pedido e já consumido uma vez
        _request(client)
        assert _verify(client, _FIXED_CODE).status_code == 200
        # when: tenta reusar
        resp = _verify(client, _FIXED_CODE)
        # then: consumido não autentica de novo
        assert resp.status_code == 401

    def test_sem_pedir_nao_verifica(self, client: TestClient, fixed_code: None) -> None:
        # given: nenhum código pedido
        # when:
        resp = _verify(client, _FIXED_CODE)
        # then:
        assert resp.status_code == 401
