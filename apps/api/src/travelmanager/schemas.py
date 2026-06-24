"""Schemas Pydantic v2 — o contrato que viaja na API (ADR-0012).

Separados do ORM de propósito: aqui só campos que podem sair. Nunca expõem
`token_hash`, `code_hash` nem `is_active` (kill-switch interno). A ponte
ORM->schema é `model_validate(obj, from_attributes=True)`.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProfileRead(BaseModel):
    """Perfil exposto: nome, país e cidade de origem (ADR-0006)."""

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
