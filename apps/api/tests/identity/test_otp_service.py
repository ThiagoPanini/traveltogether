"""Testes unitários para identity.otp_service — geração e validação de OTP.

Comportamentos verificados:
  1. Código gerado tem 6 dígitos numéricos.
  2. Código válido pode ser verificado.
  3. Código expirado é rejeitado.
  4. Código já usado é rejeitado.
  5. Rate limit: mais de 3 requests por 15 min por e-mail é bloqueado.
  6. Códigos de e-mails diferentes são independentes.
"""

from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from traveltogether.identity.models import OtpCode
from traveltogether.identity.otp_service import (
    OtpRateLimitError,
    request_otp,
    verify_otp,
)


@pytest.fixture(name="session")
def session_fixture() -> Iterator[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


def test_request_otp_returns_6_digit_code(session: Session) -> None:
    code = request_otp(session, "alice@example.com", send_email=False)
    assert len(code) == 6
    assert code.isdigit()


def test_verify_otp_succeeds_with_valid_code(session: Session) -> None:
    code = request_otp(session, "alice@example.com", send_email=False)
    assert verify_otp(session, "alice@example.com", code) is True


def test_verify_otp_fails_with_wrong_code(session: Session) -> None:
    request_otp(session, "alice@example.com", send_email=False)
    assert verify_otp(session, "alice@example.com", "000000") is False


def test_verify_otp_fails_when_expired(session: Session) -> None:
    code = request_otp(session, "alice@example.com", send_email=False)
    # backdate the OTP's expiry
    from sqlmodel import select  # noqa: PLC0415

    otp: OtpCode | None = session.exec(
        select(OtpCode).where(OtpCode.email == "alice@example.com")
    ).first()
    assert otp is not None
    otp.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    session.add(otp)
    session.commit()

    assert verify_otp(session, "alice@example.com", code) is False


def test_verify_otp_fails_when_already_used(session: Session) -> None:
    code = request_otp(session, "alice@example.com", send_email=False)
    assert verify_otp(session, "alice@example.com", code) is True
    assert verify_otp(session, "alice@example.com", code) is False


def test_rate_limit_blocks_after_3_requests(session: Session) -> None:
    for _ in range(3):
        request_otp(session, "alice@example.com", send_email=False)
    with pytest.raises(OtpRateLimitError):
        request_otp(session, "alice@example.com", send_email=False)


def test_rate_limit_is_per_email(session: Session) -> None:
    for _ in range(3):
        request_otp(session, "alice@example.com", send_email=False)
    # bob is unaffected
    code = request_otp(session, "bob@example.com", send_email=False)
    assert code.isdigit()
