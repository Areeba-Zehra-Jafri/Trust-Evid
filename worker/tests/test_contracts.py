import pytest
from fastapi.testclient import TestClient
import main

client = TestClient(main.app)


def test_missing_secret_fails_closed(monkeypatch):
    monkeypatch.delenv("WORKER_SHARED_SECRET", raising=False)
    response = client.post("/process", json={"evidence_id": "x"})
    assert response.status_code == 401


def test_wrong_secret_rejected(monkeypatch):
    monkeypatch.setenv("WORKER_SHARED_SECRET", "secret")
    response = client.post("/process", json={"evidence_id": "x"}, headers={"X-Worker-Secret": "wrong"})
    assert response.status_code == 401


def test_payload_must_be_exactly_evidence_id(monkeypatch):
    monkeypatch.setenv("WORKER_SHARED_SECRET", "secret")
    response = client.post("/process", json={"evidence_id": "x", "url": "caller-controlled"}, headers={"X-Worker-Secret": "secret"})
    assert response.status_code == 422


def test_blank_id_rejected(monkeypatch):
    monkeypatch.setenv("WORKER_SHARED_SECRET", "secret")
    response = client.post("/process", json={"evidence_id": "  "}, headers={"X-Worker-Secret": "secret"})
    assert response.status_code == 422
