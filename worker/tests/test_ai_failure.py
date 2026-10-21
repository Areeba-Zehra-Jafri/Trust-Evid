import pytest
from ai_analysis import AIError, analyze


def test_forced_ai_failure_is_explicit(monkeypatch):
    monkeypatch.setenv("AI_FORCE_FAIL", "1")
    with pytest.raises(AIError, match="forced failure"):
        analyze([], [{"id": "f1"}])


def test_invalid_provider_json_is_explicit(monkeypatch):
    monkeypatch.setattr("ai_analysis.call_gemini", lambda *_: "not-json")
    with pytest.raises(AIError, match="invalid output"):
        analyze([], [{"id": "f1"}])


def test_valid_output_cites_known_finding(monkeypatch):
    payload = '{"summary":"review","anomalies":[{"description":"x","finding_ids":["f1"]}],"uncertainty":"u","alternative_explanations":[],"next_steps":[],"review_priority":"medium"}'
    monkeypatch.setattr("ai_analysis.call_gemini", lambda *_: payload)
    parsed, raw = analyze([], [{"id": "f1"}])
    assert parsed["review_priority"] == "medium"
    assert raw == payload


def test_large_image_input_is_rejected(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    with pytest.raises(AIError, match="image input"):
        from ai_analysis import call_gemini
        call_gemini([{"mime_type": "image/png", "data_base64": "x" * 4_000_001}], [])


def test_provider_failure_is_not_silently_successful(monkeypatch):
    monkeypatch.setattr("ai_analysis.call_gemini", lambda *_: (_ for _ in ()).throw(Exception("provider down")))
    # Provider exceptions are normalized to the explicit provider error contract.
    from ai_analysis import AIProviderError
    with pytest.raises(AIProviderError):
        analyze([], [{"id": "f1"}])
