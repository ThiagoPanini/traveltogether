"""Rotas HTTP do boundary shared — referência de aeroportos (busca)."""

from typing import Annotated

from fastapi import APIRouter, Depends

from traveltogether.identity.deps import get_current_user
from traveltogether.identity.models import User
from traveltogether.shared.airports import AirportPublic, search_airports

router = APIRouter(prefix="/airports", tags=["airports"])


@router.get("/search", response_model=list[AirportPublic])
def search(
    q: str,
    _current_user: Annotated[User, Depends(get_current_user)],
    limit: int = 8,
) -> list[AirportPublic]:
    """Autocomplete cidade/IATA → aeroporto com coordenadas."""
    return search_airports(q, limit=limit)
