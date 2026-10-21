"""Worker configuration: limits.json and environment variables."""
import json
import os
from functools import lru_cache
from pathlib import Path

LIMITS_PATH = Path(__file__).with_name("limits.json")


class ConfigError(RuntimeError):
    """Raised when a required setting is missing."""


@lru_cache(maxsize=1)
def load_limits() -> dict:
    with LIMITS_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def get_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise ConfigError(f"Missing required environment variable: {name}")
    return value


def supabase_url() -> str:
    return get_env("NEXT_PUBLIC_SUPABASE_URL")


def supabase_service_key() -> str:
    return get_env("SUPABASE_SERVICE_ROLE_KEY")


def worker_secret() -> str | None:
    """Optional here; /process fails closed with 401 when it is unset."""
    return os.environ.get("WORKER_SHARED_SECRET") or None
