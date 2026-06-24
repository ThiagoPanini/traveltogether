"""Use-case VerifyOtp com fakes dos Ports (ADR-0005): valida, resolve user, cunha.

Reusa o mint de sessão (`CreateSession`) — a mesma primitiva que o Google reusará
(ADR-0004). `then` afirma: código certo dentro do TTL autentica e consome; qualquer
outro caminho **não** autentica. Anti-enum/tentativas-máx é a fatia #194.
"""

from datetime import UTC, datetime, timedelta

import pytest

from tests.identity.conftest import (
    FakeOtpRepository,
    FakeSessionRepository,
    FakeTokenGenerator,
    FakeUserRepository,
    FixedClock,
)
from travelmanager.identity.application.use_cases import (
    MAX_OTP_ATTEMPTS,
    CreateSession,
    VerifyOtp,
)
from travelmanager.identity.domain.models import OtpCode, Profile, User
from travelmanager.identity.domain.rules import hash_otp_code, hash_session_token
from travelmanager.shared.errors import Unauthorized

_PEPPER = "otp-pepper"
_CODE = "654321"


def _seed_otp(
    otps: FakeOtpRepository,
    *,
    email: str = "viajante@example.com",
    code: str = _CODE,
    expires_at: datetime,
    consumed_at: datetime | None = None,
) -> None:
    otps.save(
        OtpCode(
            email=email,
            code_hash=hash_otp_code(code, _PEPPER),
            expires_at=expires_at,
            consumed_at=consumed_at,
        )
    )


def _build_verify(
    otps: FakeOtpRepository,
    users: FakeUserRepository,
    sessions: FakeSessionRepository,
    clock: FixedClock,
    tokens: FakeTokenGenerator,
) -> VerifyOtp:
    create = CreateSession(sessions, clock, tokens, pepper="sess-pepper")
    return VerifyOtp(otps, users, create, clock, pepper=_PEPPER)


class TestVerifyOtpHappyPath:
    def test_codigo_certo_cunha_sessao_e_cria_usuario(
        self,
        otps: FakeOtpRepository,
        users: FakeUserRepository,
        sessions: FakeSessionRepository,
        clock: FixedClock,
        tokens: FakeTokenGenerator,
    ) -> None:
        # given: OTP válido para um e-mail sem conta ainda
        _seed_otp(otps, expires_at=clock.now() + timedelta(minutes=5))
        verify = _build_verify(otps, users, sessions, clock, tokens)
        # when:
        user, token, needs_onboarding = verify("viajante@example.com", _CODE)
        # then: usuário criado e verificado, sessão cunhada, onboarding pendente
        assert user.email == "viajante@example.com"
        assert user.email_verified_at == clock.now()
        assert user in users.saved
        assert sessions.saved[0].token_hash == hash_session_token(token, "sess-pepper")
        assert needs_onboarding is True

    def test_consome_o_codigo(
        self,
        otps: FakeOtpRepository,
        users: FakeUserRepository,
        sessions: FakeSessionRepository,
        clock: FixedClock,
        tokens: FakeTokenGenerator,
    ) -> None:
        # given:
        _seed_otp(otps, expires_at=clock.now() + timedelta(minutes=5))
        verify = _build_verify(otps, users, sessions, clock, tokens)
        # when:
        verify("viajante@example.com", _CODE)
        # then: marcado como consumido — reuso falha (get_active não devolve)
        assert otps.saved[0].consumed_at == clock.now()
        assert otps.get_active("viajante@example.com", clock.now()) is None

    def test_usuario_existente_onboarded_dispensa_onboarding(
        self,
        otps: FakeOtpRepository,
        users: FakeUserRepository,
        sessions: FakeSessionRepository,
        clock: FixedClock,
        tokens: FakeTokenGenerator,
    ) -> None:
        # given: usuário já verificado e com perfil onboarded
        existing = User(email="viajante@example.com", email_verified_at=clock.now())
        existing.profile = Profile(display_name="Ana", onboarded_at=clock.now())
        users.save(existing)
        _seed_otp(otps, expires_at=clock.now() + timedelta(minutes=5))
        verify = _build_verify(otps, users, sessions, clock, tokens)
        # when:
        user, _, needs_onboarding = verify("viajante@example.com", _CODE)
        # then: cai no mesmo usuário; onboarding já feito
        assert user is existing
        assert needs_onboarding is False

    def test_usuario_existente_nao_verificado_passa_a_verificado(
        self,
        otps: FakeOtpRepository,
        users: FakeUserRepository,
        sessions: FakeSessionRepository,
        clock: FixedClock,
        tokens: FakeTokenGenerator,
    ) -> None:
        # given: usuário pré-existente ainda sem e-mail verificado
        existing = User(email="viajante@example.com", email_verified_at=None)
        users.save(existing)
        _seed_otp(otps, expires_at=clock.now() + timedelta(minutes=5))
        verify = _build_verify(otps, users, sessions, clock, tokens)
        # when:
        verify("viajante@example.com", _CODE)
        # then: verificação carimbada pelo OTP
        assert existing.email_verified_at == clock.now()

    def test_normaliza_o_email_ao_resolver(
        self,
        otps: FakeOtpRepository,
        users: FakeUserRepository,
        sessions: FakeSessionRepository,
        clock: FixedClock,
        tokens: FakeTokenGenerator,
    ) -> None:
        # given: OTP gravado na forma canônica
        _seed_otp(otps, expires_at=clock.now() + timedelta(minutes=5))
        verify = _build_verify(otps, users, sessions, clock, tokens)
        # when: e-mail digitado com caixa-alta
        user, _, _ = verify("  Viajante@Example.COM ", _CODE)
        # then:
        assert user.email == "viajante@example.com"


class TestVerifyOtpKillSwitch:
    def test_conta_desativada_nao_loga(
        self,
        otps: FakeOtpRepository,
        users: FakeUserRepository,
        sessions: FakeSessionRepository,
        clock: FixedClock,
        tokens: FakeTokenGenerator,
    ) -> None:
        # given: conta existente com kill-switch acionado e um OTP ainda válido
        inactive = User(email="viajante@example.com", email_verified_at=clock.now())
        inactive.is_active = False
        users.save(inactive)
        _seed_otp(otps, expires_at=clock.now() + timedelta(minutes=5))
        verify = _build_verify(otps, users, sessions, clock, tokens)
        # when/then: o código está certo, mas a conta barrada não autentica (#194)
        with pytest.raises(Unauthorized):
            verify("viajante@example.com", _CODE)
        assert sessions.saved == []


class TestVerifyOtpMaxTentativas:
    def test_sexta_tentativa_erra_e_invalida_o_codigo(
        self,
        otps: FakeOtpRepository,
        users: FakeUserRepository,
        sessions: FakeSessionRepository,
        clock: FixedClock,
        tokens: FakeTokenGenerator,
    ) -> None:
        # given: um OTP válido sob brute-force
        _seed_otp(otps, expires_at=clock.now() + timedelta(minutes=5))
        verify = _build_verify(otps, users, sessions, clock, tokens)
        # when: esgota as tentativas erradas permitidas
        for _ in range(MAX_OTP_ATTEMPTS):
            with pytest.raises(Unauthorized):
                verify("viajante@example.com", "000000")
        # then: a tentativa seguinte, mesmo com o código certo, é barrada e o código
        # fica invalidado (anti brute-force, #194)
        with pytest.raises(Unauthorized):
            verify("viajante@example.com", _CODE)
        assert otps.get_active("viajante@example.com", clock.now()) is None

    def test_codigo_certo_dentro_do_limite_ainda_loga(
        self,
        otps: FakeOtpRepository,
        users: FakeUserRepository,
        sessions: FakeSessionRepository,
        clock: FixedClock,
        tokens: FakeTokenGenerator,
    ) -> None:
        # given: um OTP válido e algumas tentativas erradas (abaixo do teto)
        _seed_otp(otps, expires_at=clock.now() + timedelta(minutes=5))
        verify = _build_verify(otps, users, sessions, clock, tokens)
        for _ in range(MAX_OTP_ATTEMPTS - 1):
            with pytest.raises(Unauthorized):
                verify("viajante@example.com", "000000")
        # when: acerta antes de estourar o limite
        _, token, _ = verify("viajante@example.com", _CODE)
        # then: ainda autentica (o usuário legítimo não fica trancado fora)
        assert token


class TestVerifyOtpRejeicao:
    def test_codigo_errado_nao_autentica(
        self,
        otps: FakeOtpRepository,
        users: FakeUserRepository,
        sessions: FakeSessionRepository,
        clock: FixedClock,
        tokens: FakeTokenGenerator,
    ) -> None:
        # given: OTP válido, mas o usuário erra o código
        _seed_otp(otps, expires_at=clock.now() + timedelta(minutes=5))
        verify = _build_verify(otps, users, sessions, clock, tokens)
        # when/then:
        with pytest.raises(Unauthorized):
            verify("viajante@example.com", "000000")
        assert sessions.saved == []

    def test_codigo_expirado_nao_autentica(
        self,
        otps: FakeOtpRepository,
        users: FakeUserRepository,
        sessions: FakeSessionRepository,
        clock: FixedClock,
        tokens: FakeTokenGenerator,
    ) -> None:
        # given: OTP já expirado
        _seed_otp(otps, expires_at=clock.now() - timedelta(seconds=1))
        verify = _build_verify(otps, users, sessions, clock, tokens)
        # when/then:
        with pytest.raises(Unauthorized):
            verify("viajante@example.com", _CODE)
        assert sessions.saved == []

    def test_codigo_ja_consumido_nao_autentica(
        self,
        otps: FakeOtpRepository,
        users: FakeUserRepository,
        sessions: FakeSessionRepository,
        clock: FixedClock,
        tokens: FakeTokenGenerator,
    ) -> None:
        # given: OTP já consumido antes
        _seed_otp(
            otps,
            expires_at=clock.now() + timedelta(minutes=5),
            consumed_at=datetime(2026, 6, 24, 11, 0, tzinfo=UTC),
        )
        verify = _build_verify(otps, users, sessions, clock, tokens)
        # when/then:
        with pytest.raises(Unauthorized):
            verify("viajante@example.com", _CODE)
        assert sessions.saved == []
