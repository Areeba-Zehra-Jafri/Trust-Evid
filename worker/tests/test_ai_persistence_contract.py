from pathlib import Path


def test_ai_contract_is_additive_and_explicit():
    source = Path(__file__).parents[1].joinpath("main.py").read_text()
    assert "deterministic completion remains authoritative" in source
    assert "persist_ai(client, row, None" in source


def test_docker_includes_optional_ai_module():
    docker = Path(__file__).parents[1].joinpath("Dockerfile").read_text()
    assert "ai_analysis.py" in docker
