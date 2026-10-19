# 10 · Findings and review priority

Every deterministic result uses one shape, so the AI can cite it and the report can render it.

```json
{
  "id": "VID-REPEAT-001",
  "check": "repeated_segment",
  "status": "observed",
  "weight": 2,
  "value": {"frames": [4, 17], "hamming": 1, "t_seconds": [6.0, 28.0]},
  "meaning": "Two sampled frames match although the content changed in between.",
  "benign_explanations": ["Looping scene", "Repeating motion", "Variable frame rate export"]
}
```

- `status`: `observed`, `not_observed`, or `not_available` (for example, no EXIF to inspect, or ELA on a PNG). `not_available` is never rendered as a pass.
- IDs are stable per check and index. The AI must cite these.
- `weight` is set by the check: 0 informational, 1 minor, 2 notable.

## Rule-based priority (deterministic, exists even if the AI fails)
```python
def rule_priority(findings):
    score = sum(f["weight"] for f in findings if f["status"] == "observed")
    return "high" if score >= 4 else "medium" if score >= 2 else "low"
```

- Save it as `evidence.rule_priority` with the deterministic results.
- The AI's own priority is stored separately as `analysis.ai_priority` and labeled advisory. It can never lower the rule-based one. The UI shows both, labeled.
- Weights and thresholds are starting guesses, not calibrated. Document that in the README. Priority is a triage bucket, not a probability.
- ELA and GPS are weight 0 and never move priority.

Done when: no deterministic output exists outside this shape, priority is present when the AI is forced to fail, and a fixture with two weight-2 findings returns `high`.
