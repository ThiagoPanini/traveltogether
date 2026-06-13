"""Rotas HTTP do boundary identity."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session

from traveltogether.identity.deps import get_current_user
from traveltogether.identity.models import User, UserPublic, UserUpdate
from traveltogether.identity.service import update_user_profile
from traveltogether.platform.db import get_session

router = APIRouter(prefix="/identity", tags=["identity"])


@router.get("/me", response_model=UserPublic)
def me(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    return current_user


@router.patch("/me", response_model=UserPublic)
def update_me(
    body: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[Session, Depends(get_session)],
) -> User:
    return update_user_profile(
        session,
        current_user,
        display_name=body.display_name,
        avatar_url=body.avatar_url,
    )
