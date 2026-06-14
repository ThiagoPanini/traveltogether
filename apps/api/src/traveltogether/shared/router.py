"""Rotas HTTP do boundary shared — referência de aeroportos e companhias."""

from typing import Annotated

from fastapi import APIRouter, Depends

from traveltogether.identity.deps import get_current_user
from traveltogether.identity.models import User
from traveltogether.shared.airlines import AirlinePublic, search_airlines
from traveltogether.shared.airports import AirportPublic, search_airports
from traveltogether.shared.places import PlacePublic, search_places

router = APIRouter(prefix="/airports", tags=["airports"])
airlines_router = APIRouter(prefix="/airlines", tags=["airlines"])
places_router = APIRouter(prefix="/places", tags=["places"])


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


@places_router.get("/search", response_model=list[PlacePublic])
def search_place(
    q: str,
    _current_user: Annotated[User, Depends(get_current_user)],
    limit: int = 8,
) -> list[PlacePublic]:
    """Autocomplete nome/cidade → lugar com endereço e link."""
    return search_places(q, limit=limit)
