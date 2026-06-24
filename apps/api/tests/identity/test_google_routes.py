"""Caracterização HTTP de `/auth/google` (ADR-0004/0005).

Exercita a fatia inteira pela borda (rota → use-case → repos SQLite → mint), com o
verificador de `id_token` sobrescrito por um fake (a prova criptográfica real é
coberta em `test_google_verifier.py`). Trava o contrato `SessionGrant` que o BFF
consome — o mesmo de `/auth/otp/verify`.
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from httpx import Response

from travelmanager.identity.adapters.dependencies import provide_google_verifier
from travelmanager.identity.domain.google import GoogleClaims
from travelmanager.main import app

_TOKEN = "id-token-valido"
_EMAIL = "viajante@example.com"


class _FakeVerifier:
    """Reconhece só `_TOKEN` (e-mail verificado); qualquer outro token → `None`."""

    def verify(self, id_token: str) -> GoogleClaims | None:
        if id_token == _TOKEN:
            return GoogleClaims(subject="google-sub-123", email=_EMAIL, email_verified=True)
        return None


@pytest.fixture
def fake_google() -> Iterator[None]:
    """Sobrescreve o verificador do Google por um fake previsível."""
    app.dependency_overrides[provide_google_verifier] = _FakeVerifier
    yield
    app.dependency_overrides.pop(provide_google_verifier, None)


def _google(client: TestClient, id_token: str = _TOKEN) -> Response:
    return client.post("/auth/google", json={"id_token": id_token})


class TestGoogleSignIn:
    def test_token_valido_autentica_e_devolve_sessao(
        self, client: TestClient, fake_google: None
    ) -> None:
        # given/when: entra com um id_token válido
        resp = _google(client)
        # then: 200 com user, token e flag de onboarding
        assert resp.status_code == 200
        body = resp.json()
        assert body["user"]["email"] == _EMAIL
        assert body["needs_onboarding"] is True
        assert body["session_token"]
        # e o token cunhado de fato resolve em /auth/me
        me = client.get("/auth/me", headers={"Authorization": f"Bearer {body['session_token']}"})
        assert me.status_code == 200
        assert me.json()["user"]["email"] == _EMAIL

    def test_token_invalido_retorna_401(self, client: TestClient, fake_google: None) -> None:
        # given/when: id_token que o verificador recusa
        resp = _google(client, "token-forjado")
        # then: 401 com corpo de contrato {code, detail}
        assert resp.status_code == 401
        assert resp.json()["code"] == "domain_error"
