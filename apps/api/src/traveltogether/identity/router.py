"""Rotas HTTP do boundary identity."""

from typing import Annotated

from fastapi import APIRouter, Depends

from traveltogether.identity.deps import get_current_user
from traveltogether.identity.models import User, UserPublic

router = APIRouter(prefix="/identity", tags=["identity"])


@router.get("/me", response_model=UserPublic)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user
