"""Contexto `trips` (ADR-0005, feature-first): a Viagem e seu esqueleto.

Reúne Viagem (`Trip`), Parada (`Stop`), Participação (`Membership`) e Convite
(`Invitation`) — o suficiente para o ciclo **criar → convidar → aceitar → ver**
(ADR-0011). O `router` inbound é re-exportado aqui para o `main` montar, no mesmo
estilo do `identity`.
"""

from travelmanager.trips.adapters.routes import router

__all__ = ["router"]
