"""Contexto de identidade: sessão opaca e rotas de auth (ADR-0011/0013).

Seam público do contexto — o único `__all__` da árvore (as camadas internas ficam
sem curadoria de propósito). Exporta o router (montado em `main.py`) e os
use-cases que outros contextos/fatias reusarão (OTP, Google na #190+).
"""

from travelmanager.identity.adapters.routes import router
from travelmanager.identity.application.use_cases import (
    CreateSession,
    ResolveSession,
    RevokeSession,
)

__all__ = ["CreateSession", "ResolveSession", "RevokeSession", "router"]
