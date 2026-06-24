"""Adapter GoogleIdTokenVerifier com JWKS/token mockados (ADR-0004; AFK, sem rede).

A prova é gerada localmente: uma chave RSA de teste assina o `id_token` e sua parte
pública vira o JWKS injetado no verificador — nenhum certificado real do Google. O
`then` trava a fronteira de confiança: só assinatura boa + `aud`/`iss`/`exp` certos
viram claims; tudo mais é `None`. O `email_verified` é **repassado** (a regra de
negócio que o rejeita mora no use-case, não aqui).
"""

import json

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm

from travelmanager.identity.adapters.google import GoogleIdTokenVerifier

_CLIENT_ID = "client-xyz.apps.googleusercontent.com"
_ISSUER = "https://accounts.google.com"
_KID = "test-kid"
_FAR_FUTURE = 9999999999
_PAST = 1000000000


def _keypair() -> rsa.RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _jwks(key: rsa.RSAPrivateKey, *, kid: str = _KID) -> dict:
    pub = json.loads(RSAAlgorithm.to_jwk(key.public_key()))
    pub.update(kid=kid, alg="RS256", use="sig")
    return {"keys": [pub]}


def _sign(
    key: rsa.RSAPrivateKey,
    *,
    aud: str = _CLIENT_ID,
    iss: str = _ISSUER,
    exp: int = _FAR_FUTURE,
    email: str = "viajante@example.com",
    email_verified: bool = True,
    sub: str = "google-sub-123",
    kid: str = _KID,
) -> str:
    return jwt.encode(
        {
            "sub": sub,
            "email": email,
            "email_verified": email_verified,
            "aud": aud,
            "iss": iss,
            "exp": exp,
        },
        key,
        algorithm="RS256",
        headers={"kid": kid},
    )


def _verifier(jwks: dict) -> GoogleIdTokenVerifier:
    def provider() -> dict:
        return jwks

    return GoogleIdTokenVerifier(_CLIENT_ID, provider)


class TestGoogleIdTokenVerifierAceita:
    def test_token_bem_assinado_vira_claims(self) -> None:
        # given: token assinado pela chave cujo público está no JWKS
        key = _keypair()
        verifier = _verifier(_jwks(key))
        # when:
        claims = verifier.verify(_sign(key))
        # then:
        assert claims is not None
        assert claims.subject == "google-sub-123"
        assert claims.email == "viajante@example.com"
        assert claims.email_verified is True

    def test_email_nao_verificado_e_repassado_nao_filtrado(self) -> None:
        # given: token válido mas com email_verified=false
        key = _keypair()
        verifier = _verifier(_jwks(key))
        # when:
        claims = verifier.verify(_sign(key, email_verified=False))
        # then: o adapter repassa; rejeitar é tarefa do use-case
        assert claims is not None
        assert claims.email_verified is False


class TestGoogleIdTokenVerifierRecusa:
    def test_audiencia_errada_recusa(self) -> None:
        # given: token cunhado para outro client_id
        key = _keypair()
        verifier = _verifier(_jwks(key))
        # when/then:
        assert verifier.verify(_sign(key, aud="outro-client")) is None

    def test_emissor_errado_recusa(self) -> None:
        # given: iss que não é o Google
        key = _keypair()
        verifier = _verifier(_jwks(key))
        # when/then:
        assert verifier.verify(_sign(key, iss="https://evil.example.com")) is None

    def test_expirado_recusa(self) -> None:
        # given: exp no passado
        key = _keypair()
        verifier = _verifier(_jwks(key))
        # when/then:
        assert verifier.verify(_sign(key, exp=_PAST)) is None

    def test_assinatura_de_outra_chave_recusa(self) -> None:
        # given: assinado por uma chave estranha ao JWKS publicado
        published, attacker = _keypair(), _keypair()
        verifier = _verifier(_jwks(published))
        # when/then:
        assert verifier.verify(_sign(attacker)) is None

    def test_kid_desconhecido_recusa(self) -> None:
        # given: header aponta um kid ausente do JWKS
        key = _keypair()
        verifier = _verifier(_jwks(key, kid="outro-kid"))
        # when/then:
        assert verifier.verify(_sign(key, kid=_KID)) is None

    def test_lixo_recusa(self) -> None:
        # given: nem é JWT
        key = _keypair()
        verifier = _verifier(_jwks(key))
        # when/then:
        assert verifier.verify("isto-nao-e-um-jwt") is None
