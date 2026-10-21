"""Grounded, conservative Gemini analysis with strict validation."""
import json, os, re
from urllib.request import Request, urlopen

MODEL = os.getenv("AI_MODEL", "gemini-3-flash-preview")
PROMPT_VERSION = "ai-grounded-v1"
BANNED = re.compile(r"\b(deepfake[sd]?|forged|forgery|fabricated)\b|\b(is|are|was|appears? to be|confirmed|proven|verified|certified)\s+(as\s+)?(authentic|genuine|fake|tampered|manipulated)\b", re.I)

class AIError(Exception): pass
class AIProviderError(AIError): pass

def validate(raw, ids):
    result = json.loads(raw) if isinstance(raw, str) else raw
    for key in ("summary", "anomalies", "uncertainty", "alternative_explanations", "next_steps", "review_priority"):
        if key not in result: raise ValueError("missing field: " + key)
    if result["review_priority"] not in ("low", "medium", "high"): raise ValueError("invalid priority")
    for anomaly in result["anomalies"]:
        cited = anomaly.get("finding_ids")
        if not isinstance(cited, list) or not cited or not set(cited) <= ids: raise ValueError("unknown or empty finding citation")
    if BANNED.search(json.dumps(result)): raise ValueError("authenticity claim rejected")
    return result

def call_gemini(images, findings):
    key = os.getenv("GEMINI_API_KEY")
    if not key: raise AIProviderError("GEMINI_API_KEY is not configured")
    prompt = """You provide cautious forensic triage only. Use ONLY supplied findings and images. Never state a check was run unless it is in findings. Cite finding IDs for every anomaly. Never use words authentic, genuine, fake, deepfake, forged, fabricated, tampered, or manipulated. State uncertainty and alternatives. Priority is triage, not probability. Return JSON only with summary, anomalies (description, finding_ids, location), uncertainty, alternative_explanations, next_steps, review_priority (low|medium|high).\nFINDINGS:\n""" + json.dumps(findings)
    parts = [{"text": prompt}]
    for image in images[:5]:
        if image.get("data_base64") and image.get("mime_type", "").startswith("image/"):
            parts.append({"inline_data": {"mime_type": image["mime_type"], "data": image["data_base64"]}})
    body = json.dumps({"contents":[{"parts":parts}], "generationConfig":{"responseMimeType":"application/json"}}).encode()
    req = Request(f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={key}", data=body, headers={"Content-Type":"application/json"})
    try:
        with urlopen(req, timeout=45) as response: payload=json.loads(response.read())
        return payload["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as exc: raise AIProviderError(type(exc).__name__) from exc

def analyze(images, findings):
    if os.getenv("AI_FORCE_FAIL") == "1": raise AIError("forced failure")
    ids={str(f["id"]) for f in findings}
    for attempt in (1,2):
        try: raw=call_gemini(images, findings); return validate(raw, ids), raw
        except AIProviderError: raise
        except (ValueError, json.JSONDecodeError) as exc:
            if attempt == 2: raise AIError("invalid output after retry") from exc
