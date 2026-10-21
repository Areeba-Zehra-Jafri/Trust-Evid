import os
import pytest
from fastapi.testclient import TestClient

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}

def test_process_no_header():
    response = client.post("/process", json={"evidence_id": "test"})
    assert response.status_code == 401
    assert "worker secret" in response.json().get("detail", "").lower()

def test_process_wrong_header():
    response = client.post("/process", json={"evidence_id": "test"}, headers={"X-Worker-Secret": "wrong"})
    assert response.status_code == 401
    assert "worker secret" in response.json().get("detail", "").lower()

def test_process_env_unset(monkeypatch):
    monkeypatch.delenv("WORKER_SHARED_SECRET", raising=False)
    response = client.post("/process", json={"evidence_id": "test"}, headers={"X-Worker-Secret": "any"})
    assert response.status_code == 401
    assert "worker secret" in response.json().get("detail", "").lower()

def test_process_success(monkeypatch):
    monkeypatch.setenv("WORKER_SHARED_SECRET", "correctsecret")
    headers = {"X-Worker-Secret": "correctsecret"}
    response = client.post("/process", json={"evidence_id": "test"}, headers=headers)
    assert response.status_code == 202
    assert response.json() == {"accepted": True}

def test_process_rejects_extra_fields(monkeypatch):
    monkeypatch.setenv("WORKER_SHARED_SECRET", "correctsecret")
    response = client.post("/process", json={"evidence_id": "test", "storage_path": "untrusted"}, headers={"X-Worker-Secret": "correctsecret"})
    assert response.status_code == 422
