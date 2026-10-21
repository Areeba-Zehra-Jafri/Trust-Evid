import pytest

import config


def test_limits_load_and_cache():
    a = config.load_limits()
    assert isinstance(a, dict) and a
    assert config.load_limits() is a


def test_missing_env_raises(monkeypatch):
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    with pytest.raises(config.ConfigError):
        config.supabase_service_key()


def test_env_read(monkeypatch):
    monkeypatch.setenv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co")
    assert config.supabase_url() == "https://x.supabase.co"


def test_worker_secret_unset(monkeypatch):
    monkeypatch.delenv("WORKER_SHARED_SECRET", raising=False)
    assert config.worker_secret() is None
