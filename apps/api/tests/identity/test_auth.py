"""Testes unitários para identity.auth — JWT e allowlist.

Comportamentos verificados:
  1. Token gerado com email válido pode ser verificado.
  2. Token com secret errado não é verificado.
  3. Token expirado não é verificado.
  4. Email presente na allowlist é permitido.
  5. Email ausente na allowlist é bloqueado.
  6. Allowlist vazia bloqueia tudo.
"""

from traveltogether.identity.auth import (
    generate_token,
    is_allowlisted,
    parse_allowlist,
    verify_token,
)

SECRET = "public-test-auth-secret-not-for-production"


def test_round_trip_jwt() -> None:
    token = generate_token("user@example.com", secret=SECRET)
    assert verify_token(token, secret=SECRET) == "user@example.com"


def test_wrong_secret_returns_none() -> None:
    token = generate_token("user@example.com", secret=SECRET)
    assert verify_token(token, secret="public-other-test-secret-not-for-production") is None


def test_expired_token_returns_none() -> None:
    token = generate_token("user@example.com", secret=SECRET, exp_seconds=-1)
    assert verify_token(token, secret=SECRET) is None


def test_parse_allowlist_comma_separated() -> None:
    result = parse_allowlist("alice@example.com,bob@example.com")
    assert result == {"alice@example.com", "bob@example.com"}


def test_parse_allowlist_strips_whitespace() -> None:
    result = parse_allowlist("alice@example.com, bob@example.com")
    assert result == {"alice@example.com", "bob@example.com"}


def test_parse_allowlist_empty_string_returns_empty_set() -> None:
    assert parse_allowlist("") == set()


def test_is_allowlisted_returns_true_when_present() -> None:
    allowlist = {"alice@example.com", "bob@example.com"}
    assert is_allowlisted("alice@example.com", allowlist) is True


def test_is_allowlisted_returns_false_when_absent() -> None:
    allowlist = {"alice@example.com"}
    assert is_allowlisted("eve@example.com", allowlist) is False


def test_is_allowlisted_case_insensitive() -> None:
    allowlist = {"alice@example.com"}
    assert is_allowlisted("ALICE@EXAMPLE.COM", allowlist) is True
