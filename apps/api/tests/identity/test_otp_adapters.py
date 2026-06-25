"""Adapters outbound do OTP (ADR-0005): gerador de código e transporte de e-mail.

O gerador cunha 6 dígitos numéricos (com zeros à esquerda); o transporte dev não
manda e-mail de verdade — registra o código no log, e é o que roda sem
`RESEND_API_KEY` para não travar o desenvolvimento AFK.
"""

import json
import logging
import urllib.request

import pytest

from travelmanager.identity.adapters.codes import SecretsCodeGenerator
from travelmanager.identity.adapters.dependencies import provide_email_sender
from travelmanager.identity.adapters.email import DevEmailSender, ResendEmailSender


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


class TestResendEmailSender:
    def test_envia_com_user_agent_proprio(self, monkeypatch: pytest.MonkeyPatch) -> None:
        # given: transporte Resend com a chamada de rede interceptada
        capturado: dict[str, object] = {}

        class _Resp:
            def close(self) -> None: ...

        def _fake_urlopen(req: urllib.request.Request, **kwargs: object) -> _Resp:
            capturado["req"] = req
            capturado["timeout"] = kwargs.get("timeout")
            return _Resp()

        monkeypatch.setattr(urllib.request, "urlopen", _fake_urlopen)
        sender = ResendEmailSender("re_test", "no-reply@mail.panlabs.tech")
        # when:
        sender.send_code("viajante@example.com", "246813")
        # then: User-Agent próprio — o default `Python-urllib` é barrado por
        # Cloudflare (403, error 1010) na frente da API do Resend.
        req = capturado["req"]
        assert isinstance(req, urllib.request.Request)
        user_agent = req.get_header("User-agent")
        assert user_agent is not None
        assert "python-urllib" not in user_agent.lower()

    def test_envia_payload_e_timeout(self, monkeypatch: pytest.MonkeyPatch) -> None:
        # given: transporte Resend com a chamada de rede interceptada
        capturado: dict[str, object] = {}

        class _Resp:
            def close(self) -> None: ...

        def _fake_urlopen(req: urllib.request.Request, **kwargs: object) -> _Resp:
            capturado["req"] = req
            capturado["timeout"] = kwargs.get("timeout")
            return _Resp()

        monkeypatch.setattr(urllib.request, "urlopen", _fake_urlopen)
        sender = ResendEmailSender("re_test", "no-reply@mail.panlabs.tech")
        # when:
        sender.send_code("viajante@example.com", "246813")
        # then: remetente/destinatário/código no corpo e timeout para não pendurar o request
        req = capturado["req"]
        assert isinstance(req, urllib.request.Request)
        assert isinstance(req.data, bytes)
        corpo = json.loads(req.data)
        assert corpo["from"] == "no-reply@mail.panlabs.tech"
        assert corpo["to"] == ["viajante@example.com"]
        assert "246813" in corpo["text"]
        assert isinstance(capturado["timeout"], (int, float))


class TestEmailSenderSelection:
    def test_sem_resend_api_key_usa_transporte_dev(self, monkeypatch: pytest.MonkeyPatch) -> None:
        # given: ambiente sem RESEND_API_KEY
        monkeypatch.delenv("RESEND_API_KEY", raising=False)
        # when:
        sender = provide_email_sender()
        # then: app não quebra — cai no transporte dev
        assert isinstance(sender, DevEmailSender)
