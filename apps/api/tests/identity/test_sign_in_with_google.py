"""Use-case SignInWithGoogle com fakes dos Ports (ADR-0005): verifica, vincula, cunha.

A prova criptográfica do `id_token` (JWKS/`aud`/`iss`/`exp`) é concern do adapter e
fica atrás do `GoogleTokenVerifier` Port; aqui o fake já devolve claims (ou `None`).
`then` afirma a política de domínio: e-mail é a chave natural (ADR-0004), Google
atesta o e-mail verificado, e o vínculo `(google, subject)` é registrado uma vez.
Qualquer token recusado ou e-mail não-verificado **não** autentica. Vínculo de
contas com e-mail pré-existente é a fatia #195.
"""

import pytest

from tests.identity.conftest import (
    FakeGoogleVerifier,
    FakeIdentityRepository,
    FakeSessionRepository,
    FakeTokenGenerator,
    FakeUserRepository,
    FixedClock,
)
from travelmanager.identity.application.use_cases import (
    CreateSession,
    SignInWithGoogle,
)
from travelmanager.identity.domain.google import GoogleClaims
from travelmanager.shared.errors import Unauthorized

_TOKEN = "id-token-valido"


def _build_sign_in(
    verifier: FakeGoogleVerifier,
    users: FakeUserRepository,
    identities: FakeIdentityRepository,
    sessions: FakeSessionRepository,
    clock: FixedClock,
    tokens: FakeTokenGenerator,
) -> SignInWithGoogle:
    create = CreateSession(sessions, clock, tokens, pepper="sess-pepper")
    return SignInWithGoogle(verifier, users, identities, create, clock)


def _verifier(
    *,
    email: str = "viajante@example.com",
    subject: str = "google-sub-123",
    email_verified: bool = True,
    token: str = _TOKEN,
) -> FakeGoogleVerifier:
    return FakeGoogleVerifier(
        {token: GoogleClaims(subject=subject, email=email, email_verified=email_verified)}
    )


class TestSignInWithGoogleHappyPath:
    def test_token_valido_cria_usuario_vinculo_e_cunha_sessao(
        self,
        users: FakeUserRepository,
        identities: FakeIdentityRepository,
        sessions: FakeSessionRepository,
        clock: FixedClock,
        tokens: FakeTokenGenerator,
    ) -> None:
        # given: id_token válido de um usuário ainda sem conta
        sign_in = _build_sign_in(_verifier(), users, identities, sessions, clock, tokens)
        # when:
        user, token, needs_onboarding = sign_in(_TOKEN)
        # then: usuário novo, verificado pelo Google, com vínculo e sessão
        assert user.email == "viajante@example.com"
        assert user.email_verified_at == clock.now()
        assert user in users.saved
        identity = identities.get_by_provider_subject("google", "google-sub-123")
        assert identity is not None
        assert identity.user is user
        assert identity.email == "viajante@example.com"
        assert sessions.saved[0].user_id == user.id or sessions.saved[0].user is user
        assert token
        assert needs_onboarding is True

    def test_normaliza_o_email_do_google(
        self,
        users: FakeUserRepository,
        identities: FakeIdentityRepository,
        sessions: FakeSessionRepository,
        clock: FixedClock,
        tokens: FakeTokenGenerator,
    ) -> None:
        # given: Google devolve o e-mail com caixa-alta e espaços
        verifier = _verifier(email="  Viajante@Example.COM ")
        sign_in = _build_sign_in(verifier, users, identities, sessions, clock, tokens)
        # when:
        user, _, _ = sign_in(_TOKEN)
        # then: chave natural canônica
        assert user.email == "viajante@example.com"

    def test_login_repetido_reusa_vinculo_sem_duplicar(
        self,
        users: FakeUserRepository,
        identities: FakeIdentityRepository,
        sessions: FakeSessionRepository,
        clock: FixedClock,
        tokens: FakeTokenGenerator,
    ) -> None:
        # given: primeiro login já criou usuário e vínculo
        sign_in = _build_sign_in(_verifier(), users, identities, sessions, clock, tokens)
        first_user, _, _ = sign_in(_TOKEN)
        # when: o mesmo Google entra de novo
        second_user, _, _ = sign_in(_TOKEN)
        # then: mesmo usuário, um único vínculo, segunda sessão cunhada
        assert second_user is first_user
        assert len(identities.saved) == 1
        assert len(users.saved) == 1
        assert len(sessions.saved) == 2


class TestSignInWithGoogleRejeicao:
    def test_token_invalido_nao_autentica(
        self,
        users: FakeUserRepository,
        identities: FakeIdentityRepository,
        sessions: FakeSessionRepository,
        clock: FixedClock,
        tokens: FakeTokenGenerator,
    ) -> None:
        # given: o verificador não reconhece o token (assinatura/aud/exp inválidos)
        verifier = FakeGoogleVerifier({})
        sign_in = _build_sign_in(verifier, users, identities, sessions, clock, tokens)
        # when/then:
        with pytest.raises(Unauthorized):
            sign_in("token-forjado")
        assert sessions.saved == []
        assert users.saved == []
        assert identities.saved == []

    def test_email_nao_verificado_nao_autentica(
        self,
        users: FakeUserRepository,
        identities: FakeIdentityRepository,
        sessions: FakeSessionRepository,
        clock: FixedClock,
        tokens: FakeTokenGenerator,
    ) -> None:
        # given: token válido, mas Google não atesta o e-mail (anti account-takeover)
        verifier = _verifier(email_verified=False)
        sign_in = _build_sign_in(verifier, users, identities, sessions, clock, tokens)
        # when/then:
        with pytest.raises(Unauthorized):
            sign_in(_TOKEN)
        assert sessions.saved == []
        assert identities.saved == []
