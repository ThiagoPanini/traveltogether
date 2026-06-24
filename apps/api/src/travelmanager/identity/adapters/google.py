"""Adapter outbound: verificação do `id_token` do Google via JWKS (ADR-0004/0005).

A prova criptográfica vive aqui, não no domínio: PyJWT confere a assinatura RS256
contra a chave pública certa (casada por `kid`), mais `aud` (= `GOOGLE_CLIENT_ID`),
`iss` e `exp`. Sucesso vira `GoogleClaims`; qualquer falha vira `None` (o use-case
traduz em `Unauthorized`). A fonte do JWKS é injetada (`jwks_provider`) para que os
testes rodem **offline** com chaves geradas; o default busca os certs públicos do
Google. `email_verified` é repassado cru — rejeitá-lo é regra de negócio do
use-case.

Cache do JWKS e o `GOOGLE_CLIENT_ID` real entram no go-live (#196); aqui a busca é
direta a cada verificação (sem credencial configurada, o web nem expõe o botão).
"""

from __future__ import annotations

import json
import urllib.request
from collections.abc import Callable

import jwt
from jwt import PyJWK, PyJWKSet

from travelmanager.identity.domain.google import GoogleClaims

_GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
_GOOGLE_ISSUERS = ("https://accounts.google.com", "accounts.google.com")
_REQUIRED_CLAIMS = ["exp", "iss", "aud", "sub", "email"]


def fetch_google_jwks() -> dict:
    """Busca o conjunto de chaves públicas (JWKS) do Google."""
    with urllib.request.urlopen(_GOOGLE_CERTS_URL, timeout=5) as resp:  # noqa: S310 (URL fixa)
        return json.load(resp)


class GoogleIdTokenVerifier:
    """Verifica o `id_token` do Google contra um JWKS, devolvendo claims ou `None`."""

    def __init__(
        self,
        client_id: str,
        jwks_provider: Callable[[], dict] = fetch_google_jwks,
        issuers: tuple[str, ...] = _GOOGLE_ISSUERS,
    ) -> None:
        """Inicializa o verificador.

        Args:
            client_id: O `GOOGLE_CLIENT_ID` esperado em `aud`.
            jwks_provider: Fonte do JWKS (injetável para testes offline).
            issuers: Emissores `iss` aceitos (Google usa com e sem `https://`).
        """
        self._client_id = client_id
        self._jwks_provider = jwks_provider
        self._issuers = issuers

    def verify(self, id_token: str) -> GoogleClaims | None:
        """Verifica a prova e devolve os claims, ou `None` se inválida.

        Args:
            id_token: O JWT cru emitido pelo Google.

        Returns:
            Os claims verificados, ou `None` quando assinatura/`aud`/`iss`/`exp`
            falham, o `kid` é desconhecido ou o token é malformado.
        """
        try:
            signing_key = self._signing_key(id_token)
            if signing_key is None:
                return None
            claims = jwt.decode(
                id_token,
                signing_key,
                algorithms=["RS256"],
                audience=self._client_id,
                options={"require": _REQUIRED_CLAIMS},
            )
        except jwt.InvalidTokenError:
            return None
        if claims.get("iss") not in self._issuers:
            return None
        return GoogleClaims(
            subject=claims["sub"],
            email=claims["email"],
            email_verified=bool(claims.get("email_verified", False)),
        )

    def _signing_key(self, id_token: str) -> PyJWK | None:
        """Resolve a chave pública do JWKS pelo `kid` do header, ou `None`."""
        kid = jwt.get_unverified_header(id_token).get("kid")
        jwks = PyJWKSet.from_dict(self._jwks_provider())
        return next((k for k in jwks.keys if k.key_id == kid), None)
