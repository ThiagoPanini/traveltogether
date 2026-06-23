import pytest

from travelmanager.db import normalize_database_url


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("postgresql://u:p@h:5432/db", "postgresql+psycopg://u:p@h:5432/db"),
        ("postgres://u:p@h:5432/db", "postgresql+psycopg://u:p@h:5432/db"),
        ("postgresql+psycopg://u:p@h:5432/db", "postgresql+psycopg://u:p@h:5432/db"),
        ("sqlite://", "sqlite://"),
    ],
)
def test_normalize_database_url_forca_psycopg(raw: str, expected: str) -> None:
    assert normalize_database_url(raw) == expected
