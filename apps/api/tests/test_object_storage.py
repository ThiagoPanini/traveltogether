from types import TracebackType
from typing import cast
from urllib.request import Request

import pytest

from traveltogether.platform import object_storage
from traveltogether.platform.object_storage import ObjectStorageConfigError, upload_object


class _Response:
    status = 200

    def __enter__(self) -> "_Response":
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> bool:
        return False


def test_upload_object_requires_r2_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("R2_ENDPOINT_URL", raising=False)

    with pytest.raises(ObjectStorageConfigError, match="R2_ENDPOINT_URL"):
        upload_object("trips/cover.png", b"png", "image/png")


def test_upload_object_puts_to_r2_and_returns_public_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("R2_ENDPOINT_URL", "https://account.r2.cloudflarestorage.com")
    monkeypatch.setenv("R2_BUCKET", "covers")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "key")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setenv("R2_PUBLIC_BASE_URL", "https://cdn.example.com/covers")
    captured: dict[str, object] = {}

    def fake_urlopen(request: Request, timeout: int) -> _Response:
        captured["request"] = request
        captured["timeout"] = timeout
        return _Response()

    monkeypatch.setattr(object_storage, "urlopen", fake_urlopen)

    stored = upload_object("trips/trip-1/cover.png", b"png", "image/png")

    request = cast(Request, captured["request"])
    headers = {key.lower(): value for key, value in request.header_items()}
    assert (
        request.full_url == "https://account.r2.cloudflarestorage.com/covers/trips/trip-1/cover.png"
    )
    assert request.get_method() == "PUT"
    assert request.data == b"png"
    assert captured["timeout"] == 20
    assert headers["content-type"] == "image/png"
    assert headers["x-amz-content-sha256"]
    assert headers["x-amz-date"]
    assert headers["authorization"].startswith("AWS4-HMAC-SHA256 ")
    assert stored.key == "trips/trip-1/cover.png"
    assert stored.url == "https://cdn.example.com/covers/trips/trip-1/cover.png"
