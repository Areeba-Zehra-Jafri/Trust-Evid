from pathlib import Path


def test_ai_contract_is_additive_and_explicit():
    source = Path(__file__).parents[1].joinpath("main.py").read_text()
    assert "deterministic completion remains authoritative" in source
    assert "persist_ai(client, row, None" in source


def test_docker_includes_optional_ai_module():
    docker = Path(__file__).parents[1].joinpath("Dockerfile").read_text()
    assert "ai_analysis.py" in docker


def test_ai_persistence_does_not_require_evidence_unique_constraint():
    source = Path(__file__).parents[1].joinpath("db.py").read_text()
    assert 'on_conflict="evidence_id"' not in source
    assert 'eq("evidence_id", row["id"])' in source


def test_ai_persistence_sets_worker_owner_and_json_raw_response():
    source = Path(__file__).parents[1].joinpath("db.py").read_text()
    assert '"user_id": row.get("owner_user_id")' in source
    assert "json.loads(raw_response)" in source
    assert '"text": str(raw_response)' in source
