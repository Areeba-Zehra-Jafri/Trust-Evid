import pytest
from ai_analysis import validate, AIProviderError


def base():
    return {"summary":"ok", "anomalies":[], "uncertainty":"u", "alternative_explanations":[], "next_steps":[], "review_priority":"low"}


def test_validate_requires_cited_findings():
    payload = base()
    payload["anomalies"] = [{"description":"x", "finding_ids":["missing"]}]
    with pytest.raises(ValueError): validate(payload, {"known"})


def test_validate_rejects_authenticity_claim():
    payload = base(); payload["summary"] = "authentic"
    with pytest.raises(ValueError): validate(payload, set())


def test_validate_rejects_malformed_structured_fields():
    payload = base(); payload["summary"] = 12
    with pytest.raises(ValueError): validate(payload, set())


def test_validate_rejects_non_string_next_steps():
    payload = base(); payload["next_steps"] = ["ok", 3]
    with pytest.raises(ValueError): validate(payload, set())


def test_validate_rejects_non_string_finding_ids():
    payload = base()
    payload["anomalies"] = [{"description": "x", "finding_ids": [1]}]
    with pytest.raises(ValueError, match="finding citation"):
        validate(payload, {"1"})


def test_validate_rejects_oversized_response():
    with pytest.raises(ValueError, match="too large"):
        validate("{" + "x" * 100001, set())


def test_validate_rejects_unbounded_fields():
    payload = base(); payload["summary"] = "x" * 5001
    with pytest.raises(ValueError, match="too long"):
        validate(payload, set())


def test_validate_rejects_invalid_location():
    payload = base(); payload["anomalies"] = [{"description": "x", "finding_ids": [], "location": []}]
    with pytest.raises(ValueError, match="finding citation"):
        validate(payload, set())


def test_validate_rejects_large_provider_response():
    with pytest.raises(ValueError, match="too large"):
        validate("{" + "x" * 256001, set())


def test_validate_rejects_empty_anomaly_title():
    payload = base()
    payload["anomalies"] = [{"title": "  ", "description": "signal", "finding_ids": ["known"]}]
    with pytest.raises(ValueError, match="title"):
        validate(payload, {"known"})


def test_validate_rejects_unknown_top_level_provider_shape():
    payload = base()
    payload["anomalies"] = [{"description": "signal", "finding_ids": ["known"], "location": {"frame": 1}}]
    assert validate(payload, {"known"})["anomalies"][0]["location"]["frame"] == 1
