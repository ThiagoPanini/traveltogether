"""Rotas HTTP do boundary identity."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from traveltogether.identity.deps import get_current_user
from traveltogether.identity.models import (
    OtpRequestBody,
    OtpVerifyBody,
    OtpVerifyResponse,
    User,
    UserPublic,
    UserUpdate,
)
from traveltogether.identity.otp_service import OtpRateLimitError, request_otp, verify_otp
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


@router.post("/otp/request", status_code=status.HTTP_200_OK)
def otp_request(
    body: OtpRequestBody,
    session: Annotated[Session, Depends(get_session)],
) -> dict[str, str]:
    """Gera e envia código OTP por e-mail. Retorna 200 sempre (evita enumeração)."""
    try:
        request_otp(session, body.email.strip().lower())
    except OtpRateLimitError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="too many otp requests, try again later",
        ) from None
    return {"status": "sent"}


@router.post("/otp/verify", response_model=OtpVerifyResponse)
def otp_verify(
    body: OtpVerifyBody,
    session: Annotated[Session, Depends(get_session)],
) -> OtpVerifyResponse:
    """Valida o código OTP. Retorna {valid: true, email} se correto."""
    email = body.email.strip().lower()
    valid = verify_otp(session, email, body.code.strip())
    return OtpVerifyResponse(valid=valid, email=email if valid else None)
