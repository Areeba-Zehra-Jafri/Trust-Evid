# 11 · AI analysis

Input: up to `ai_max_images` selected frames or downscaled images plus the findings list. No originals, and nothing from `strip_identifying` (skill 07).

## Schema
```python
import re
from typing import Literal
from pydantic import BaseModel, Field

class Anomaly(BaseModel):
    description: str
    finding_ids: list[str] = Field(min_length=1)     # every anomaly must cite something
    location: str | None = None                      # e.g. "frame 12 (about 22 s)"

class AIReport(BaseModel):
    summary: str
    anomalies: list[Anomaly]
    uncertainty: str
    alternative_explanations: list[str]
    next_steps: list[str]
    review_priority: Literal["low", "medium", "high"]
```

## Validation
```python
BANNED = re.compile(
    r"\b(deepfake[sd]?|forged|forgery|fabricated)\b"
    r"|\b(is|are|was|appears?\s+to\s+be|confirmed|proven|verified|certified)\s+(as\s+)?"
    r"(authentic|genuine|fake|tampered|manipulated)\b", re.I)

def validate(raw: str, ids: set[str]) -> AIReport:
    report = AIReport.model_validate_json(raw)        # raises ValidationError (a ValueError)
    cited = {i for a in report.anomalies for i in a.finding_ids}
    if not cited <= ids:
        raise ValueError("cites unknown finding")
    if BANNED.search(report.model_dump_json()):
        raise ValueError("makes an authenticity claim")
    return report
```
The banned-claim screen is conservative. It will occasionally trip on harmless phrasing, which just costs one retry. It complements the prompt, it doesn't replace it.

## Call policy: one call, plus at most one retry on invalid output
```python
class AIError(Exception): ...
class AIProviderError(AIError): ...

def analyze(frames, findings):
    if os.getenv("AI_FORCE_FAIL") == "1":
        raise AIError("forced failure")
    ids = {f["id"] for f in findings}
    for attempt in (1, 2):
        try:
            raw = call_gemini(frames, findings, timeout=L["ai_timeout_s"])   # JSON mode + schema; check current SDK docs
        except Exception as e:                       # timeout, 429, 5xx: do NOT retry
            raise AIProviderError(type(e).__name__) from e
        try:
            return validate(raw, ids), raw
        except ValueError:
            if attempt == 2:
                raise AIError("invalid output after retry")
```
- **Provider errors** (timeout, 429, 5xx, unsupported file): no retry, since credits and rate limits are tight.
- **Invalid output** (bad JSON, unknown finding ID, banned claim): one retry, then give up.
- On any `AIError`: set `ai_status='incomplete'`, keep deterministic results and rule priority, append an `analysis` event noting the AI was incomplete. Never substitute text.

## Prompt (must say)
Use only the supplied findings and images. Never state a check was run unless it's in the findings. Cite finding IDs. Never say authentic, genuine, fake or deepfake. State uncertainty and alternative explanations. Priority is triage, not probability.

## Store
`ai_model`, `prompt_version`, raw response, parsed result, `ai_priority`. Keep the model id in one config constant.

Done when: a real call is saved, `AI_FORCE_FAIL=1` produces `incomplete` with findings and priority intact, a response citing a nonexistent ID is retried once then rejected, an anomaly with empty `finding_ids` is rejected, and a response containing "the file is authentic" is rejected.
