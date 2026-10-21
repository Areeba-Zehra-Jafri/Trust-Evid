import pytest
from ai_analysis import validate


def payload():
    return {
        "summary": "Observed metadata signals require review",
        "anomalies": [],
        "uncertainty": "The supplied checks are limited.",
        "alternative_explanations": ["Export or re-encoding"],
        "next_steps": ["Have an examiner review the original"],
        "review_priority": "medium",
    }


def test_validate_accepts_json_text_and_preserves_citations():
    result = validate('{"summary":"s","anomalies":[],"uncertainty":"u",'
                      '"alternative_explanations":[],"next_steps":[],'
                      '"review_priority":"low"}', set())
    assert result["summary"] == "s"


def test_validate_rejects_unknown_priority():
    value = payload()
    value["review_priority"] = "urgent"
    with pytest.raises(ValueError, match="priority"):
        validate(value, set())


def test_validate_rejects_long_anomaly_description():
    value = payload()
    value["anomalies"] = [{"description": "x" * 2001, "finding_ids": ["f1"]}]
    with pytest.raises(ValueError, match="too long"):
        validate(value, {"f1"})
