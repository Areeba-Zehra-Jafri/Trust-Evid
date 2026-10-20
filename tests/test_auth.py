import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'worker')))

from main import app

client = TestClient(app)


# Test GET /health returns 200 and correct body
def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


# Test POST /process without X-Worker-Secret header returns 401
def test_process_no_secret():
    response = client.post("/process", json={"evidence_id": "123"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or missing worker secret"


# Test POST /process with wrong X-Worker-Secret header returns 401
def test_process_wrong_secret():
    headers = {"X-Worker-Secret": "wrongsecret"}
    response = client.post("/process", json={"evidence_id": "123"}, headers=headers)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or missing worker secret"


# Test POST /process with env WORKER_SHARED_SECRET unset returns 401
def test_process_env_secret_unset(monkeypatch):
    monkeypatch.delenv("WORKER_SHARED_SECRET", raising=False)
    headers = {"X-Worker-Secret": "anysecret"}
    response = client.post("/process", json={"evidence_id": "123"}, headers=headers)
    assert response.status_code == 401
    assert response.json()["detail"] == "Worker secret not configured"


# Test POST /process with correct X-Worker-Secret header returns 202
def test_process_success(monkeypatch):
    secret = "supersecret"
    monkeypatch.setenv("WORKER_SHARED_SECRET", secret)
    headers = {"X-Worker-Secret": secret}
    response = client.post("/process", json={"evidence_id": "123"}, headers=headers)
    assert response.status_code == 202
    assert response.json() == {"accepted": True}
