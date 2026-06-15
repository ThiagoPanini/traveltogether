# ruff: noqa: E501
"""Adapter de e-mail transacional — Resend (condicional por env var).

Se RESEND_API_KEY não estiver definida, loga o código em vez de enviar.
Borda HITL: a key é provisionada pelo operador (ver docs/ai-ops/005-...).
"""

import logging
import os

logger = logging.getLogger(__name__)

# Remetente. Configurável por env porque precisa bater com o domínio verificado
# no Resend — que pode divergir do FQDN de deploy (ver ai-ops 005).
_EMAIL_FROM = os.getenv("EMAIL_FROM", "traveltogether <noreply@traveltogether.paninit.com>")

_OTP_TEMPLATE = """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <style>
    body {{ font-family: 'IBM Plex Mono', monospace, sans-serif; background: #0f1a14; color: #e8e0d4; margin: 0; padding: 40px 20px; }}
    .card {{ max-width: 480px; margin: 0 auto; background: #1a2820; border: 1px solid #2d4a38; border-radius: 8px; padding: 40px; }}
    .brand {{ font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: #6b8f72; margin-bottom: 32px; }}
    h1 {{ font-size: 22px; color: #e8e0d4; margin: 0 0 12px; font-weight: 600; }}
    p {{ color: #9aab9f; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }}
    .code {{ font-size: 36px; letter-spacing: 0.3em; color: #e08040; font-family: 'IBM Plex Mono', monospace; background: #0f1a14; border: 1px solid #2d4a38; border-radius: 6px; padding: 16px 24px; text-align: center; margin: 0 0 24px; }}
    .expiry {{ font-size: 12px; color: #6b8f72; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">traveltogether</div>
    <h1>Seu código de acesso</h1>
    <p>Use o código abaixo para entrar no traveltogether. Ele expira em 10 minutos.</p>
    <div class="code">{code}</div>
    <p class="expiry">Se você não solicitou este código, ignore este e-mail.</p>
  </div>
</body>
</html>
"""

_INVITE_TEMPLATE = """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <style>
    body {{ font-family: 'IBM Plex Mono', monospace, sans-serif; background: #0f1a14; color: #e8e0d4; margin: 0; padding: 40px 20px; }}
    .card {{ max-width: 480px; margin: 0 auto; background: #1a2820; border: 1px solid #2d4a38; border-radius: 8px; padding: 40px; }}
    .brand {{ font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: #6b8f72; margin-bottom: 32px; }}
    h1 {{ font-size: 22px; color: #e8e0d4; margin: 0 0 12px; font-weight: 600; }}
    p {{ color: #9aab9f; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }}
    .btn {{ display: inline-block; background: #e08040; color: #0f1a14; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px; }}
    .trip {{ font-size: 18px; color: #e8e0d4; font-weight: 600; margin-bottom: 8px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">traveltogether</div>
    <h1>Você foi convidado para uma viagem</h1>
    <p class="trip">{trip_name}</p>
    <p>{inviter_name} convidou você para participar desta viagem. Entre para ver os detalhes.</p>
    <a class="btn" href="{invite_url}">Ver viagem</a>
  </div>
</body>
</html>
"""


def send_otp_email(to_email: str, code: str) -> None:
    """Envia e-mail com código OTP de 6 dígitos."""
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        logger.info("[email_service] OTP para %s: %s (RESEND_API_KEY ausente)", to_email, code)
        return

    import httpx  # noqa: PLC0415

    html = _OTP_TEMPLATE.format(code=code)
    response = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "from": _EMAIL_FROM,
            "to": [to_email],
            "subject": f"{code} é seu código de acesso — traveltogether",
            "html": html,
        },
        timeout=10,
    )
    response.raise_for_status()


def send_invite_email(
    to_email: str,
    trip_name: str,
    inviter_name: str,
    invite_url: str,
) -> None:
    """Envia e-mail de convite para uma Viagem."""
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        logger.info(
            "[email_service] Convite para %s — viagem '%s' (RESEND_API_KEY ausente)",
            to_email,
            trip_name,
        )
        return

    import httpx  # noqa: PLC0415

    html = _INVITE_TEMPLATE.format(
        trip_name=trip_name,
        inviter_name=inviter_name,
        invite_url=invite_url,
    )
    response = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "from": _EMAIL_FROM,
            "to": [to_email],
            "subject": f"Você foi convidado para '{trip_name}' — traveltogether",
            "html": html,
        },
        timeout=10,
    )
    response.raise_for_status()
