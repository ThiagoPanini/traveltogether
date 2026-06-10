"""Imagem de Capa da Viagem."""

import os
import uuid
from collections.abc import Callable

from sqlmodel import Session

from traveltogether.platform.object_storage import StoredObject, upload_object
from traveltogether.trips.models import Stop, Trip

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
DEFAULT_MAX_BYTES = 5 * 1024 * 1024


class CoverImageValidationError(ValueError):
    """Arquivo de Imagem de Capa inválido."""


def _max_bytes() -> int:
    raw_value = os.getenv("COVER_IMAGE_MAX_BYTES")
    if raw_value is None:
        return DEFAULT_MAX_BYTES
    return int(raw_value)


def _looks_like_image(content: bytes, content_type: str) -> bool:
    if content_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/webp":
        return content.startswith(b"RIFF") and content[8:12] == b"WEBP"
    return False


def _validate_image(content: bytes, content_type: str) -> str:
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise CoverImageValidationError("Imagem de Capa deve ser JPEG, PNG ou WebP")
    if not content:
        raise CoverImageValidationError("Imagem de Capa não pode estar vazia")
    if len(content) > _max_bytes():
        raise CoverImageValidationError("Imagem de Capa excede o limite de tamanho")
    if not _looks_like_image(content, content_type):
        raise CoverImageValidationError("Arquivo não parece ser uma imagem válida")
    return ALLOWED_IMAGE_TYPES[content_type]


def update_trip_cover_image(
    session: Session,
    trip: Trip,
    content: bytes,
    content_type: str,
    *,
    store_object: Callable[[str, bytes, str], StoredObject] | None = None,
) -> Trip:
    extension = _validate_image(content, content_type)
    key = f"trips/{trip.id}/cover/{uuid.uuid4()}{extension}"
    uploader = store_object or upload_object
    stored = uploader(key, content, content_type)

    trip.cover_image_key = stored.key
    trip.cover_image_url = stored.url
    session.add(trip)
    session.commit()
    session.refresh(trip)
    return trip


def update_stop_cover_image(
    session: Session,
    stop: Stop,
    content: bytes,
    content_type: str,
    *,
    store_object: Callable[[str, bytes, str], StoredObject] | None = None,
) -> Stop:
    extension = _validate_image(content, content_type)
    key = f"trips/{stop.trip_id}/stops/{stop.id}/cover/{uuid.uuid4()}{extension}"
    uploader = store_object or upload_object
    stored = uploader(key, content, content_type)

    stop.cover_image_key = stored.key
    stop.cover_image_url = stored.url
    session.add(stop)
    session.commit()
    session.refresh(stop)
    return stop
