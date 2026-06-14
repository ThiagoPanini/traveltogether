"""Dependências HTTP do boundary identity."""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from traveltogether.identity.auth import verify_token
from traveltogether.identity.models import User
from traveltogether.platform.db import get_session

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    session: Annotated[Session, Depends(get_session)],
) -> User:
    """Valida o JWT do request e materializa o Usuário sob demanda."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing bearer token",
        )

    claims = verify_token(credentials.credentials)
    if claims is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid bearer token",
        )

    normalized_email = claims["email"].strip().lower()
    user = session.exec(select(User).where(User.email == normalized_email)).first()

    if user is not None:
        updated = False
        if claims["display_name"] and user.display_name is None:
            user.display_name = claims["display_name"]
            updated = True
        if claims["avatar_url"] and user.avatar_url is None:
            user.avatar_url = claims["avatar_url"]
            updated = True
        if updated:
            session.add(user)
            session.commit()
            session.refresh(user)
        return user

    user = User(
        email=normalized_email,
        display_name=claims["display_name"],
        avatar_url=claims["avatar_url"],
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # resolve pending memberships for this new user (lazy import to avoid circular deps)
    from traveltogether.trips.members_service import resolve_pending_memberships  # noqa: PLC0415

    resolve_pending_memberships(session, user)
    return user
