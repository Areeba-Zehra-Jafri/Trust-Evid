from pathlib import Path


def test_docker_copies_runtime_import_graph():
    dockerfile = Path(__file__).parents[1].joinpath("Dockerfile").read_text()
    for module in ("main.py", "config.py", "db.py", "processor.py", "hashing.py", "ai_analysis.py", "limits.json"):
        assert module in dockerfile


def test_docker_uses_wildcard_for_future_worker_modules():
    dockerfile = Path(__file__).parents[1].joinpath("Dockerfile").read_text()
    assert "COPY *.py ./" in dockerfile
