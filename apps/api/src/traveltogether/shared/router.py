"""Rotas HTTP do boundary shared — referência de aeroportos e companhias."""

from typing import Annotated

from fastapi import APIRouter, Depends

from traveltogether.identity.deps import get_current_user
from traveltogether.identity.models import User
from traveltogether.shared.airlines import AirlinePublic, search_airlines
from traveltogether.shared.airports import AirportPublic, search_airports

router = APIRouter(prefix="/airports", tags=["airports"])
airlines_router = APIRouter(prefix="/airlines", tags=["airlines"])


@router.get("/search", response_model=list[AirportPublic])
def search(
    q: str,
    _current_user: Annotated[User, Depends(get_current_user)],
    limit: int = 8,
) -> list[AirportPublic]:
    """Autocomplete cidade/IATA → aeroporto com coordenadas."""
    return search_airports(q, limit=limit)


@airlines_router.get("/search", response_model=list[AirlinePublic])
def search_airline(
    q: str,
    _current_user: Annotated[User, Depends(get_current_user)],
    limit: int = 8,
) -> list[AirlinePublic]:
    """Autocomplete nome/IATA → companhia aérea com logo."""
    return search_airlines(q, limit=limit)
