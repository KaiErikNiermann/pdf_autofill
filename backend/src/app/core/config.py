"""Application configuration settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    app_name: str = "PDF Autofill Backend"
    version: str = "0.1.0"
    debug: bool = False

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS - Allow Chrome extension
    cors_origins: list[str] = [
        "chrome-extension://*",
        "http://localhost:*",
        "http://127.0.0.1:*",
    ]

    # API Keys (add as needed)
    api_key: str | None = None
    openai_api_key: str | None = None


settings = Settings()
