"""Object storage adapter for S3-compatible buckets such as Cloudflare R2."""

import hashlib
import hmac
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen


class ObjectStorageError(Exception):
    """Base error for object storage failures."""


class ObjectStorageConfigError(ObjectStorageError):
    """Raised when required object storage environment variables are missing."""


@dataclass(frozen=True)
class StoredObject:
    key: str
    url: str


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ObjectStorageConfigError(f"{name} is required for object storage")
    return value


def _signing_key(secret_key: str, date_stamp: str) -> bytes:
    date_key = hmac.new(
        ("AWS4" + secret_key).encode(), date_stamp.encode(), hashlib.sha256
    ).digest()
    region_key = hmac.new(date_key, b"auto", hashlib.sha256).digest()
    service_key = hmac.new(region_key, b"s3", hashlib.sha256).digest()
    return hmac.new(service_key, b"aws4_request", hashlib.sha256).digest()


def _public_url(key: str) -> str:
    public_base_url = _required_env("R2_PUBLIC_BASE_URL").rstrip("/")
    return f"{public_base_url}/{quote(key, safe='/')}"


def upload_object(key: str, content: bytes, content_type: str) -> StoredObject:
    endpoint_url = _required_env("R2_ENDPOINT_URL").rstrip("/")
    bucket = _required_env("R2_BUCKET")
    access_key_id = _required_env("R2_ACCESS_KEY_ID")
    secret_access_key = _required_env("R2_SECRET_ACCESS_KEY")

    object_path = f"/{bucket}/{quote(key, safe='/')}"
    upload_url = f"{endpoint_url}{object_path}"
    parsed = urlparse(upload_url)
    host = parsed.netloc

    now = datetime.now(UTC)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")
    payload_hash = hashlib.sha256(content).hexdigest()
    canonical_headers = f"host:{host}\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{amz_date}\n"
    signed_headers = "host;x-amz-content-sha256;x-amz-date"
    canonical_request = "\n".join(
        [
            "PUT",
            parsed.path,
            "",
            canonical_headers,
            signed_headers,
            payload_hash,
        ]
    )
    credential_scope = f"{date_stamp}/auto/s3/aws4_request"
    string_to_sign = "\n".join(
        [
            "AWS4-HMAC-SHA256",
            amz_date,
            credential_scope,
            hashlib.sha256(canonical_request.encode()).hexdigest(),
        ]
    )
    signature = hmac.new(
        _signing_key(secret_access_key, date_stamp),
        string_to_sign.encode(),
        hashlib.sha256,
    ).hexdigest()
    authorization = (
        "AWS4-HMAC-SHA256 "
        f"Credential={access_key_id}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, "
        f"Signature={signature}"
    )

    request = Request(
        upload_url,
        data=content,
        method="PUT",
        headers={
            "Authorization": authorization,
            "Content-Type": content_type,
            "Content-Length": str(len(content)),
            "Host": host,
            "X-Amz-Content-Sha256": payload_hash,
            "X-Amz-Date": amz_date,
        },
    )
    try:
        with urlopen(request, timeout=20) as response:
            if response.status >= 400:
                raise ObjectStorageError(
                    f"object storage upload failed with status {response.status}"
                )
    except HTTPError as exc:
        raise ObjectStorageError(f"object storage upload failed with status {exc.code}") from exc
    except URLError as exc:
        raise ObjectStorageError("object storage upload failed") from exc

    return StoredObject(key=key, url=_public_url(key))
