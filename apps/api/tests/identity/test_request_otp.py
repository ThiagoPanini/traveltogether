"""Use-case RequestOtp com fakes dos Ports (ADR-0005): gera, persiste hash, envia.

O código cru só existe no envio; o banco guarda o HMAC. `then` afirma orquestração
(persistência + transporte) e o endurecimento anti-spam da #194: cooldown e tetos
por e-mail/IP/global checados **antes** de gerar — estourar levanta `RateLimited` sem
emitir código.
"""

from datetime import timedelta

import pytest

from tests.identity.conftest import (
    FakeCodeGenerator,
    FakeEmailSender,
    FakeOtpRepository,
    FakeRateLimiter,
    FixedClock,
)
from travelmanager.identity.application.use_cases import (
    OTP_EMAIL_CAP,
    OTP_GLOBAL_CAP,
    OTP_IP_CAP,
    OTP_TTL,
    SCOPE_OTP_EMAIL,
    SCOPE_OTP_GLOBAL,
    SCOPE_OTP_IP,
    RequestOtp,
)
from travelmanager.identity.domain.rules import hash_otp_code
from travelmanager.shared.errors import RateLimited

_EMAIL = "viajante@example.com"


def _build_request(
    otps: FakeOtpRepository,
    clock: FixedClock,
    codes: FakeCodeGenerator,
    email_sender: FakeEmailSender,
    rate_limiter: FakeRateLimiter,
) -> RequestOtp:
    return RequestOtp(otps, clock, codes, email_sender, rate_limiter, pepper="otp-pepper")


class TestRequestOtp:
    def test_persiste_so_o_hash_e_envia_o_codigo_cru(
        self,
        otps: FakeOtpRepository,
        clock: FixedClock,
        codes: FakeCodeGenerator,
        email_sender: FakeEmailSender,
        rate_limiter: FakeRateLimiter,
    ) -> None:
        # given: gerador de código previsível e pepper de teste
        request = _build_request(otps, clock, codes, email_sender, rate_limiter)
        # when:
        request(_EMAIL)
        # then: banco só com o hash; transporte recebeu o código cru
        otp = otps.saved[0]
        assert otp.code_hash == hash_otp_code(codes.generate(), "otp-pepper")
        assert otp.code_hash != codes.generate()
        assert email_sender.sent == [(_EMAIL, codes.generate())]

    def test_expira_em_dez_minutos(
        self,
        otps: FakeOtpRepository,
        clock: FixedClock,
        codes: FakeCodeGenerator,
        email_sender: FakeEmailSender,
        rate_limiter: FakeRateLimiter,
    ) -> None:
        # given:
        request = _build_request(otps, clock, codes, email_sender, rate_limiter)
        # when:
        request(_EMAIL)
        # then: TTL de 10 minutos a partir do relógio
        assert OTP_TTL == timedelta(minutes=10)
        assert otps.saved[0].expires_at == clock.now() + OTP_TTL

    def test_normaliza_o_email(
        self,
        otps: FakeOtpRepository,
        clock: FixedClock,
        codes: FakeCodeGenerator,
        email_sender: FakeEmailSender,
        rate_limiter: FakeRateLimiter,
    ) -> None:
        # given: e-mail com caixa-alta e espaços
        request = _build_request(otps, clock, codes, email_sender, rate_limiter)
        # when:
        request("  Viajante@Example.COM ")
        # then: persistido e enviado na forma canônica
        assert otps.saved[0].email == _EMAIL
        assert email_sender.sent[0][0] == _EMAIL


class TestRequestOtpRateLimit:
    def test_reenvio_dentro_do_cooldown_e_barrado(
        self,
        otps: FakeOtpRepository,
        clock: FixedClock,
        codes: FakeCodeGenerator,
        email_sender: FakeEmailSender,
        rate_limiter: FakeRateLimiter,
    ) -> None:
        # given: um primeiro pedido já atendido
        request = _build_request(otps, clock, codes, email_sender, rate_limiter)
        request(_EMAIL)
        # when/then: reenvio imediato (mesmo relógio, dentro do cooldown) é barrado e
        # não gera novo código nem dispara o transporte
        with pytest.raises(RateLimited):
            request(_EMAIL)
        assert len(otps.saved) == 1
        assert len(email_sender.sent) == 1

    def test_teto_por_email_estourado_barra(
        self,
        otps: FakeOtpRepository,
        clock: FixedClock,
        codes: FakeCodeGenerator,
        email_sender: FakeEmailSender,
        rate_limiter: FakeRateLimiter,
    ) -> None:
        # given: janela por e-mail já no teto
        rate_limiter.force[(SCOPE_OTP_EMAIL, _EMAIL)] = OTP_EMAIL_CAP
        request = _build_request(otps, clock, codes, email_sender, rate_limiter)
        # when/then:
        with pytest.raises(RateLimited):
            request(_EMAIL)
        assert otps.saved == []

    def test_teto_por_ip_estourado_barra(
        self,
        otps: FakeOtpRepository,
        clock: FixedClock,
        codes: FakeCodeGenerator,
        email_sender: FakeEmailSender,
        rate_limiter: FakeRateLimiter,
    ) -> None:
        # given: janela por IP já no teto (e-mail/global folgados)
        rate_limiter.force[(SCOPE_OTP_IP, "203.0.113.7")] = OTP_IP_CAP
        request = _build_request(otps, clock, codes, email_sender, rate_limiter)
        # when/then: mesmo um e-mail novo é barrado por vir de um IP saturado
        with pytest.raises(RateLimited):
            request(_EMAIL, ip="203.0.113.7")
        assert otps.saved == []

    def test_teto_global_estourado_barra(
        self,
        otps: FakeOtpRepository,
        clock: FixedClock,
        codes: FakeCodeGenerator,
        email_sender: FakeEmailSender,
        rate_limiter: FakeRateLimiter,
    ) -> None:
        # given: teto global (amortecedor anti-flood) estourado
        rate_limiter.force[(SCOPE_OTP_GLOBAL, "*")] = OTP_GLOBAL_CAP
        request = _build_request(otps, clock, codes, email_sender, rate_limiter)
        # when/then:
        with pytest.raises(RateLimited):
            request(_EMAIL)
        assert otps.saved == []

    def test_dentro_dos_limites_registra_evento_por_escopo(
        self,
        otps: FakeOtpRepository,
        clock: FixedClock,
        codes: FakeCodeGenerator,
        email_sender: FakeEmailSender,
        rate_limiter: FakeRateLimiter,
    ) -> None:
        # given: pedido folgado, com IP conhecido
        request = _build_request(otps, clock, codes, email_sender, rate_limiter)
        # when:
        request(_EMAIL, ip="203.0.113.7")
        # then: alimenta as três janelas (e-mail, IP, global) para os próximos pedidos
        scopes = {scope for scope, _, _ in rate_limiter.events}
        assert scopes == {SCOPE_OTP_EMAIL, SCOPE_OTP_IP, SCOPE_OTP_GLOBAL}
