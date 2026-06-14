"""Lógica de OTP: geração, envio e validação de códigos de acesso."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlmodel import Session, col, select

from traveltogether.identity.models import OtpCode

OTP_EXPIRY_MINUTES = 10
OTP_RATE_LIMIT = 3
OTP_RATE_WINDOW_MINUTES = 15


class OtpRateLimitError(Exception):
    pass


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def _count_recent_requests(session: Session, email: str) -> int:
    window_start = datetime.now(UTC) - timedelta(minutes=OTP_RATE_WINDOW_MINUTES)
    # SQLite stores datetimes without tz; strip tzinfo for comparison
    window_start_naive = window_start.replace(tzinfo=None)
    return len(
        session.exec(
            select(OtpCode).where(
                OtpCode.email == email,
                col(OtpCode.created_at) >= window_start_naive,
            )
        ).all()
    )


def request_otp(
    session: Session,
    email: str,
    *,
    send_email: bool = True,
) -> str:
    """Gera e armazena um OTP de 6 dígitos.

    Raises OtpRateLimitError se exceder OTP_RATE_LIMIT no janelo de tempo.
    Retorna o código em texto claro para envio por e-mail.
    """
    if _count_recent_requests(session, email) >= OTP_RATE_LIMIT:
        raise OtpRateLimitError(f"Rate limit exceeded for {email}")

    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = datetime.now(UTC) + timedelta(minutes=OTP_EXPIRY_MINUTES)
    expires_at_naive = expires_at.replace(tzinfo=None)

    otp = OtpCode(email=email, code_hash=_hash_code(code), expires_at=expires_at_naive)
    session.add(otp)
    session.commit()

    if send_email:
        from traveltogether.platform.email_service import send_otp_email  # noqa: PLC0415

        send_otp_email(email, code)

    return code


def verify_otp(session: Session, email: str, code: str) -> bool:
    """Valida o código OTP para o e-mail. Marca como usado se válido."""
    now_naive = datetime.now(UTC).replace(tzinfo=None)
    code_hash = _hash_code(code)

    otp = session.exec(
        select(OtpCode).where(
            OtpCode.email == email,
            OtpCode.code_hash == code_hash,
            OtpCode.used == False,  # noqa: E712
            col(OtpCode.expires_at) > now_naive,
        )
    ).first()

    if otp is None:
        return False

    otp.used = True
    session.add(otp)
    session.commit()
    return True
