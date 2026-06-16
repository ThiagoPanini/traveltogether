"""Modelos do boundary budget (Orçamento — ADR-0016).

Donos das linhas de custo estimado `Hospedagem` (`Lodging`) e `Extra`. O
`Orçamento` em si não é entidade: é a visão agregada por moeda produzida pelo
service. Não há conversão de câmbio em lugar nenhum (invariante 15).
"""

import uuid
from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from typing import ClassVar

from sqlmodel import Field, SQLModel


class RateioBasis(StrEnum):
    """Base de rateio de uma linha de custo (CONTEXT.md → `basis`)."""

    per_person = "per_person"  # o valor já é por cabeça
    # rateado: o valor é do grupo e se divide pelo nº de Memberships.
    # Membro nomeado `prorated` (não `split`) para não sombrear `str.split` no StrEnum.
    prorated = "split"


class Lodging(SQLModel, table=True):  # type: ignore[call-arg]
    __tablename__: ClassVar[str] = "lodgings"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    trip_id: uuid.UUID = Field(foreign_key="trips.id")
    stop_id: uuid.UUID = Field(foreign_key="stops.id")
    description: str = ""
    nightly_value: Decimal
    currency: str
    basis: RateioBasis = RateioBasis.prorated
    created_by: uuid.UUID = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class Extra(SQLModel, table=True):  # type: ignore[call-arg]
    __tablename__: ClassVar[str] = "extras"  # pyright: ignore[reportIncompatibleVariableOverride]

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    trip_id: uuid.UUID = Field(foreign_key="trips.id")
    description: str = ""
    value: Decimal
    currency: str
    basis: RateioBasis = RateioBasis.prorated
    created_by: uuid.UUID = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class LodgingPublic(SQLModel):
    id: uuid.UUID
    trip_id: uuid.UUID
    stop_id: uuid.UUID
    description: str
    nightly_value: Decimal
    currency: str
    basis: RateioBasis
    created_by: uuid.UUID
    created_at: datetime


class LodgingCreate(SQLModel):
    stop_id: uuid.UUID
    description: str = ""
    nightly_value: Decimal
    currency: str
    basis: RateioBasis = RateioBasis.prorated


class LodgingUpdate(SQLModel):
    stop_id: uuid.UUID | None = None
    description: str | None = None
    nightly_value: Decimal | None = None
    currency: str | None = None
    basis: RateioBasis | None = None


class ExtraPublic(SQLModel):
    id: uuid.UUID
    trip_id: uuid.UUID
    description: str
    value: Decimal
    currency: str
    basis: RateioBasis
    created_by: uuid.UUID
    created_at: datetime


class ExtraCreate(SQLModel):
    description: str = ""
    value: Decimal
    currency: str
    basis: RateioBasis = RateioBasis.prorated


class ExtraUpdate(SQLModel):
    description: str | None = None
    value: Decimal | None = None
    currency: str | None = None
    basis: RateioBasis | None = None


class CurrencySubtotal(SQLModel):
    """Subtotal do Orçamento dentro de uma moeda (nunca cruza moedas)."""

    currency: str
    per_group: Decimal
    per_person: Decimal


class BudgetSummary(SQLModel):
    """Visão agregada do Orçamento: subtotais por moeda + nº de pessoas.

    `subtotals` vem ordenado por moeda para saída estável. `member_count` é o nº
    de `Membership`s usado no rateio (invariante 19).
    """

    member_count: int
    subtotals: list[CurrencySubtotal]
