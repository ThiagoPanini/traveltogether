"""Adapters outbound do OTP (ADR-0005): gerador de código e transporte de e-mail.

O gerador cunha 6 dígitos numéricos (com zeros à esquerda); o transporte dev não
manda e-mail de verdade — registra o código no log, e é o que roda sem
`RESEND_API_KEY` para não travar o desenvolvimento AFK.
"""

import logging

import pytest

from travelmanager.identity.adapters.codes import SecretsCodeGenerator
from travelmanager.identity.adapters.dependencies import provide_email_sender
from travelmanager.identity.adapters.email import DevEmailSender


class TestSecretsCodeGenerator:
    def test_gera_seis_digitos_numericos(self) -> None:
        # given:
        gen = SecretsCodeGenerator()
        # when: muitas amostras
        amostras = [gen.generate() for _ in range(200)]
        # then: sempre 6 caracteres, todos dígitos
        assert all(len(c) == 6 and c.isdigit() for c in amostras)

    def test_admite_zeros_a_esquerda(self) -> None:
        # given: gerador com fonte forçada ao menor valor
        gen = SecretsCodeGenerator(_rand=lambda _: 0)
        # when:
        # then: zero vira "000000", não "0"
        assert gen.generate() == "000000"


class TestDevEmailSender:
    def test_registra_o_codigo_no_log(self, caplog: pytest.LogCaptureFixture) -> None:
        # given: transporte dev
        sender = DevEmailSender()
        # when:
        with caplog.at_level(logging.INFO, logger="travelmanager.otp"):
            sender.send_code("viajante@example.com", "246813")
        # then: código capturável no log (sem Resend)
        assert "246813" in caplog.text
        assert "viajante@example.com" in caplog.text


class TestEmailSenderSelection:
    def test_sem_resend_api_key_usa_transporte_dev(self, monkeypatch: pytest.MonkeyPatch) -> None:
        # given: ambiente sem RESEND_API_KEY
        monkeypatch.delenv("RESEND_API_KEY", raising=False)
        # when:
        sender = provide_email_sender()
        # then: app não quebra — cai no transporte dev
        assert isinstance(sender, DevEmailSender)
