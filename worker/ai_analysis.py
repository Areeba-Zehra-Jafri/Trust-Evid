"""Optional, grounded Gemini analysis with strict, additive validation."""
import json, os, re
from urllib.request import Request, urlopen

MODEL = os.getenv("AI_MODEL", "gemini-3-flash-preview")
PROMPT_VERSION = "ai-grounded-v1"
MAX_PROVIDER_BYTES = 256_000
MAX_IMAGE_BYTES = 4_000_000
BANNED = re.compile(r"\b(deepfake[sd]?|forged|forgery|fabricated)\b|\b(is|are|was|appears? to be|confirmed|proven|verified|certified)\s+(as\s+)?(authentic|genuine|fake|tampered|manipulated)\b", re.I)
REQUIRED = ("summary", "anomalies", "uncertainty", "alternative_explanations", "next_steps", "review_priority")

class AIError(Exception): pass
class AIProviderError(AIError): pass

def validate(raw, ids):
    # Keep provider output bounded and structural before it reaches persistence.
    if isinstance(raw, str) and len(raw) > 100_000:
        raise ValueError("AI output is too large")
    result = json.loads(raw) if isinstance(raw, str) else raw
    if not isinstance(result, dict):
        raise ValueError("AI output must be an object")
    missing = [key for key in REQUIRED if key not in result]
    if missing:
        raise ValueError("missing field: " + ",".join(missing))
    for field in ("summary", "uncertainty"):
        if not isinstance(result[field], str) or not result[field].strip():
            raise ValueError(f"{field} must be a non-empty string")
        if len(result[field]) > 5000:
            raise ValueError(f"{field} is too long")
    for field in ("alternative_explanations", "next_steps"):
        if not isinstance(result[field], list) or len(result[field]) > 50:
            raise ValueError(f"{field} must be a list of at most 50 items")
        if not all(isinstance(item, str) and item.strip() for item in result[field]):
            raise ValueError(f"{field} items must be non-empty strings")
    if not isinstance(result["anomalies"], list) or len(result["anomalies"]) > 50:
        raise ValueError("anomalies must be a list of at most 50 items")
    if result["review_priority"] not in ("low", "medium", "high"):
        raise ValueError("invalid priority")
    for anomaly in result["anomalies"]:
        if not isinstance(anomaly, dict):
            raise ValueError("invalid anomaly")
        cited = anomaly.get("finding_ids")
        if (not isinstance(cited, list) or not cited
                or not all(isinstance(item, str) and item for item in cited)
                or not set(cited) <= ids):
            raise ValueError("unknown or empty finding citation")
        if not isinstance(anomaly.get("description"), str) or not anomaly["description"].strip():
            raise ValueError("anomaly description must be non-empty")
        if len(anomaly["description"]) > 2000:
            raise ValueError("anomaly description is too long")
        if "title" in anomaly and (not isinstance(anomaly["title"], str) or not anomaly["title"].strip() or len(anomaly["title"]) > 300):
            raise ValueError("anomaly title is invalid")
        location = anomaly.get("location")
        if location is not None and not isinstance(location, (str, dict)):
            raise ValueError("anomaly location must be text or an object")
    if BANNED.search(json.dumps(result)): raise ValueError("authenticity claim rejected")
    return result

def call_gemini(images, findings):
    key = os.getenv("GEMINI_API_KEY")
    if not key: raise AIProviderError("GEMINI_API_KEY is not configured")
    prompt = """You provide cautious forensic triage only. Use ONLY supplied findings and images. Never state a check was run unless it is in findings. Cite finding IDs for every anomaly. Never use words authentic, genuine, fake, deepfake, forged, fabricated, tampered, or manipulated. State uncertainty and alternatives. Priority is triage, not probability. Return JSON only with summary, anomalies (description, finding_ids, location), uncertainty, alternative_explanations, next_steps, review_priority (low|medium|high).\nFINDINGS:\n""" + json.dumps(findings)
    parts = [{"text": prompt}]
    for image in images[:5]:
        encoded = image.get("data_base64")
        if encoded and image.get("mime_type", "").startswith("image/"):
            if len(encoded) > MAX_IMAGE_BYTES:
                raise AIError("AI image input is too large")
            parts.append({"inline_data": {"mime_type": image["mime_type"], "data": encoded}})
    body = json.dumps({"contents":[{"parts":parts}], "generationConfig":{"responseMimeType":"application/json"}}).encode()
    req = Request(f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={key}", data=body, headers={"Content-Type":"application/json"})
    try:
        with urlopen(req, timeout=45) as response:
            body = response.read(MAX_PROVIDER_BYTES + 1)
            if len(body) > MAX_PROVIDER_BYTES:
                raise AIError("AI provider response is too large")
            payload=json.loads(body)
        return payload["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as exc: raise AIProviderError(type(exc).__name__) from exc

def analyze(images, findings):
    """Return validated additive interpretation; provider failures stay explicit.

    The raw response is returned separately so persistence can retain an audit
    trail without allowing unvalidated provider text into parsed_result.
    """
    if os.getenv("AI_FORCE_FAIL") == "1": raise AIError("forced failure")
    # Gemini is deliberately opt-in. A missing key is an explicit incomplete
    # result, not a worker crash or a reason to withhold deterministic findings.
    if not os.getenv("GEMINI_API_KEY"):
        raise AIProviderError("GEMINI_API_KEY is not configured")
    ids={str(f["id"]) for f in findings}
    for attempt in (1,2):
        try: raw=call_gemini(images, findings); return validate(raw, ids), raw
        except AIProviderError: raise
        except (ValueError, json.JSONDecodeError) as exc:
            if attempt == 2:
                raise AIError("invalid output after retry") from exc
    raise AIError("AI analysis did not produce a result")
