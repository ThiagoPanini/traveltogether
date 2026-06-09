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

    email = verify_token(credentials.credentials)
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid bearer token",
        )

    normalized_email = email.strip().lower()
    user = session.exec(select(User).where(User.email == normalized_email)).first()
    if user is not None:
        return user

    user = User(email=normalized_email)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
