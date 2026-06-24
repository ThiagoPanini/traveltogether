"""Relógio como Port cross-contexto (ADR-0013).

O tempo é I/O não-determinístico: invertê-lo num Port deixa o use-case receber
um `Clock` e os testes injetarem um relógio fixo (`FixedClock`) em vez de
`freezegun`. O adapter default (`SystemClock`) lê o relógio do SO em UTC.
"""

from datetime import UTC, datetime
from typing import Protocol


class Clock(Protocol):
    """Fonte de tempo injetável."""

    def now(self) -> datetime:
        """Instante atual (timezone-aware)."""
        ...


class SystemClock:
    """Adapter default: o relógio do sistema em UTC."""

    def now(self) -> datetime:
        """Instante atual do SO em UTC."""
        return datetime.now(UTC)
