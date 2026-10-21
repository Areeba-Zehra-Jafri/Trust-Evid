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
