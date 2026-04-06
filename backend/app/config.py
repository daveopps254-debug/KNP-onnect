from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import AnyUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"

    # Core
    database_url: str = Field(default="sqlite:///./knp_connect.db", alias="DATABASE_URL")
    secret_key: str | None = Field(default=None, alias="SECRET_KEY")
    cors_origins: list[str] = Field(default=["http://localhost:5173"], alias="CORS_ORIGINS")

    # Public URL for building absolute links (optional)
    public_base_url: AnyUrl | None = Field(default=None, alias="PUBLIC_BASE_URL")

    # Redis (rate limit / realtime fanout)
    redis_url: str | None = Field(default=None, alias="REDIS_URL")

    # S3 / MinIO media
    s3_endpoint_url: str | None = Field(default=None, alias="S3_ENDPOINT_URL")
    s3_region: str | None = Field(default=None, alias="S3_REGION")
    s3_bucket: str | None = Field(default=None, alias="S3_BUCKET")
    s3_access_key_id: str | None = Field(default=None, alias="S3_ACCESS_KEY_ID")
    s3_secret_access_key: str | None = Field(default=None, alias="S3_SECRET_ACCESS_KEY")
    s3_public_base_url: AnyUrl | None = Field(default=None, alias="S3_PUBLIC_BASE_URL")

    # Google OAuth
    google_client_id: str | None = Field(default=None, alias="GOOGLE_CLIENT_ID")

    # SMTP for email verification
    smtp_host: str | None = Field(default=None, alias="SMTP_HOST")
    smtp_port: int | None = Field(default=None, alias="SMTP_PORT")
    smtp_username: str | None = Field(default=None, alias="SMTP_USERNAME")
    smtp_password: str | None = Field(default=None, alias="SMTP_PASSWORD")
    smtp_from_email: str | None = Field(default=None, alias="SMTP_FROM_EMAIL")
    smtp_use_tls: bool = Field(default=True, alias="SMTP_USE_TLS")

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    def require_secret_key(self) -> str:
        if self.secret_key:
            return self.secret_key
        if self.is_production:
            raise RuntimeError("SECRET_KEY must be set in production")
        # Dev-only fallback; never rely on this in production.
        return "knp-connect-dev-secret-do-not-use-in-production"


@lru_cache
def get_settings() -> Settings:
    return Settings()

