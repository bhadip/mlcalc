"""
MLCalc — Application Configuration
Loads all settings from environment variables with sensible defaults.
"""

from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── App ───────────────────────────────────────────────────────────
    APP_NAME: str = "MLCalc"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"
    API_PREFIX: str = "/api"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8504"

    # ─── Database ──────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://mlcalc:mlcalc@localhost:5432/mlcalc"
    DATABASE_URL_SYNC: str = "postgresql://mlcalc:mlcalc@localhost:5432/mlcalc"

    # ─── JWT ───────────────────────────────────────────────────────────
    JWT_SECRET: str = "change-me-jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ─── Google OAuth ──────────────────────────────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8504/api/auth/google/callback"

    # ─── Microsoft OAuth ───────────────────────────────────────────────
    MS_CLIENT_ID: str = ""
    MS_CLIENT_SECRET: str = ""
    MS_TENANT_ID: str = "common"
    MS_REDIRECT_URI: str = "http://localhost:8504/api/auth/microsoft/callback"

    # ─── Cloudflare Tunnel ─────────────────────────────────────────────
    CF_TUNNEL_TOKEN: str = ""
    CF_ACCESS_AUDIENCE: str = ""

    # ─── OCR ───────────────────────────────────────────────────────────
    OCR_ENGINE: str = "easyocr"  # "easyocr" | "tesseract" | "both"
    OCR_LANGUAGES: str = "en"
    OCR_GPU: bool = False
    UPLOAD_DIR: str = "uploads/screenshots"
    MAX_UPLOAD_SIZE_MB: int = 10

    # ─── Broker Defaults ───────────────────────────────────────────────
    DEFAULT_STOP_OUT_PERCENT: float = 50.0
    DEFAULT_MARGIN_CALL_PERCENT: float = 100.0
    DEFAULT_LEVERAGE: int = 100

    # ─── Rate Limiting ─────────────────────────────────────────────────
    VISITOR_CALC_LIMIT_PER_HOUR: int = 10

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def branding_path(self) -> Path:
        return Path(__file__).parent / "config" / "branding.json"


settings = Settings()
