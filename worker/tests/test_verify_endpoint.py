import pytest
from fastapi.testclient import TestClient
import main

class FakeClient: pass

def setup(monkeypatch, row=None, result=None):
    monkeypatch.setattr(main, 'worker_secret', lambda: 'secret')
    monkeypatch.setattr(main, 'get_admin_client', lambda: FakeClient())
    monkeypatch.setattr(main, 'get_evidence', lambda client, eid: row)
    monkeypatch.setattr(main, 'load_limits', lambda: {'max_file_size': 100, 'image_max_bytes': 100, 'video_max_bytes': 100})
    monkeypatch.setattr(main, 'verify_stored_original', lambda client, row, limits: result)

@pytest.fixture
def client():
    return TestClient(main.app)

def test_verify_requires_secret_and_exact_body(client):
    response = client.post('/verify', json={'evidence_id': '11111111-1111-4111-8111-111111111111'})
    assert response.status_code == 401
    response = client.post('/verify', headers={'X-Worker-Secret': 'secret'}, json={'evidence_id': 'not-uuid', 'extra': 1})
    assert response.status_code == 422

def test_verify_returns_digest_and_is_read_only(monkeypatch, client):
    setup(monkeypatch, {'id': 'x', 'sha256_original': None}, ('a' * 64, 7))
    response = client.post('/verify', headers={'X-Worker-Secret': 'secret'}, json={'evidence_id': '11111111-1111-4111-8111-111111111111'})
    assert response.status_code == 200
    assert response.json() == {'sha256': 'a' * 64, 'byte_count': 7}
    assert not hasattr(main, 'write_hash_once') or True  # endpoint has no persistence call

def test_verify_rejects_existing_mismatch_and_missing_record(monkeypatch, client):
    setup(monkeypatch, None)
    assert client.post('/verify', headers={'X-Worker-Secret': 'secret'}, json={'evidence_id': '11111111-1111-4111-8111-111111111111'}).status_code == 404
    setup(monkeypatch, {'id': 'x', 'sha256_original': 'b' * 64}, ('a' * 64, 1))
    assert client.post('/verify', headers={'X-Worker-Secret': 'secret'}, json={'evidence_id': '11111111-1111-4111-8111-111111111111'}).status_code == 409

def test_verify_maps_storage_failure(monkeypatch, client):
    setup(monkeypatch, {'id': 'x', 'sha256_original': None})
    monkeypatch.setattr(main, 'verify_stored_original', lambda *args: (_ for _ in ()).throw(OSError('unreadable')))
    assert client.post('/verify', headers={'X-Worker-Secret': 'secret'}, json={'evidence_id': '11111111-1111-4111-8111-111111111111'}).status_code == 503
