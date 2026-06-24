"""Schemas Pydantic v2 — o contrato que viaja na API (ADR-0005; borda do contexto).

Separados do ORM de propósito: aqui só campos que podem sair. Nunca expõem
`token_hash`, `code_hash` nem `is_active` (kill-switch interno). A ponte
ORM->schema é `model_validate(obj, from_attributes=True)`.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProfileRead(BaseModel):
    """Perfil exposto: nome, país e cidade de origem (CONTEXT inv. 6)."""

    model_config = ConfigDict(from_attributes=True)

    display_name: str | None = None
    country: str | None = None
    origin_city: str | None = None
    onboarded_at: datetime | None = None


class UserRead(BaseModel):
    """Usuário exposto: identidade e verificação, sem o kill-switch `is_active`."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    email_verified_at: datetime | None = None
    created_at: datetime


class MeRead(BaseModel):
    """Resposta de `/auth/me`: quem é + perfil + se ainda falta onboarding."""

    user: UserRead
    profile: ProfileRead | None = None
    needs_onboarding: bool


class OtpRequestIn(BaseModel):
    """Corpo de `/auth/otp/request`: o e-mail do passo 1."""

    email: str


class OtpVerifyIn(BaseModel):
    """Corpo de `/auth/otp/verify`: e-mail + código de 6 dígitos do passo 2."""

    email: str
    code: str


class GoogleVerifyIn(BaseModel):
    """Corpo de `/auth/google`: o `id_token` que o BFF obteve na dança OAuth."""

    id_token: str


class SessionGrant(BaseModel):
    """Sessão concedida: quem é + se falta onboarding + token opaco. Contrato comum a
    `/auth/otp/verify` e `/auth/google` (método de entrada é indiferente ao BFF).

    O `session_token` é o opaco recém-cunhado: viaja **server-to-server** para o BFF,
    que o guarda no cookie httpOnly do Auth.js (ADR-0004) — nunca chega ao browser.
    """

    user: UserRead
    needs_onboarding: bool
    session_token: str
