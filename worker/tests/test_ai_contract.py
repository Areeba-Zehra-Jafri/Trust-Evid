import pytest
from ai_analysis import AIError, validate, analyze


def valid():
    return {"summary": "review", "anomalies": [], "uncertainty": "unknown",
            "alternative_explanations": [], "next_steps": [], "review_priority": "low"}


def test_ai_is_optional_when_provider_is_missing(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(Exception):
        analyze([], [{"id": "f1"}])


def test_ai_rejects_unknown_citations():
    data = valid()
    data["anomalies"] = [{"description": "signal", "finding_ids": ["other"]}]
    with pytest.raises(ValueError, match="citation"):
        validate(data, {"f1"})


def test_ai_output_is_bounded_and_structured():
    parsed = validate(valid(), set())
    assert parsed["review_priority"] == "low"


def test_ai_persistence_keeps_raw_and_validated_fields_separate():
    source = Path(__file__).parents[1].joinpath("db.py").read_text()
    assert '"raw_response": raw_response' in source
    assert '"parsed_result": parsed' in source
    assert '"ai_priority": parsed.get("review_priority") if parsed else None' in source
