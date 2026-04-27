from __future__ import annotations

import hashlib
import os
import uuid
from dataclasses import dataclass
from typing import Literal, Protocol

from fastapi import UploadFile

from app.config import get_settings


MediaCategory = Literal["profiles", "covers", "posts", "groups", "stories"]


class MediaStorage(Protocol):
    def save_upload(self, file: UploadFile, category: MediaCategory) -> str: ...


@dataclass(frozen=True)
class LocalMediaStorage:
    base_dir: str

    def save_upload(self, file: UploadFile, category: MediaCategory) -> str:
        ext = (file.filename.split(".")[-1] if file.filename and "." in file.filename else "").lower()
        filename = f"{uuid.uuid4()}{('.' + ext) if ext else ''}"
        rel_path = f"{category}/{filename}"
        abs_path = os.path.join(self.base_dir, rel_path)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)

        with open(abs_path, "wb") as buffer:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                buffer.write(chunk)

        return f"/uploads/{rel_path}"


class S3MediaStorage:
    def __init__(self) -> None:
        settings = get_settings()
        try:
            import boto3  # type: ignore
        except Exception as e:  # pragma: no cover
            raise RuntimeError("boto3 is required for S3 media storage") from e

        if not settings.s3_bucket:
            raise RuntimeError("S3_BUCKET must be set for S3 media storage")

        self._bucket = settings.s3_bucket
        self._public_base = str(settings.s3_public_base_url).rstrip("/") if settings.s3_public_base_url else None

        self._client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            region_name=settings.s3_region,
            aws_access_key_id=settings.s3_access_key_id,
            aws_secret_access_key=settings.s3_secret_access_key,
        )

    def save_upload(self, file: UploadFile, category: MediaCategory) -> str:
        ext = (file.filename.split(".")[-1] if file.filename and "." in file.filename else "").lower()
        filename = f"{uuid.uuid4()}{('.' + ext) if ext else ''}"
        key = f"{category}/{filename}"

        data = file.file.read()
        self._client.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=data,
            ContentType=file.content_type or "application/octet-stream",
        )

        if self._public_base:
            return f"{self._public_base}/{key}"
        # Fallback: path-style URL (works for MinIO behind a gateway if configured)
        endpoint = os.getenv("S3_ENDPOINT_URL", "").rstrip("/")
        return f"{endpoint}/{self._bucket}/{key}" if endpoint else f"/media/{key}"


def get_media_storage() -> MediaStorage:
    settings = get_settings()
    if settings.environment == "production":
        return S3MediaStorage()
    # backend/uploads (served by /uploads mount in development)
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    return LocalMediaStorage(uploads_dir)

