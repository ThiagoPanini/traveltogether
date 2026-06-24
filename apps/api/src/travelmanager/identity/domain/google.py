"""Valor de domínio do Google sign-in (ADR-0004): os claims já verificados.

`GoogleClaims` é o que a API confia **depois** de checar a prova criptográfica do
`id_token` (assinatura via JWKS, `aud`, `iss`, `exp`) — essa checagem é concern de
infraestrutura e mora no adapter. O que sobe para o use-case é só o fato de
identidade: quem é (`subject`), qual e-mail e se o Google o atesta verificado. A
regra de negócio "só vincula com e-mail verificado" (anti account-takeover) é
aplicada pelo use-case sobre este valor, não pelo adapter.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class GoogleClaims:
    """Claims de identidade extraídos de um `id_token` já verificado.

    Attributes:
        subject: Identificador estável do usuário no Google (claim `sub`).
        email: E-mail associado à conta Google (como o Google o devolve).
        email_verified: Se o Google atesta que o e-mail foi verificado.
    """

    subject: str
    email: str
    email_verified: bool
