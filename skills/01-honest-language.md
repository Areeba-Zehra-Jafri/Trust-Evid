# 01 · Honest language

The product's credibility is in its wording. Use this table for every string a user or judge might read: UI, prompts, reports, README.

| Say | Never say |
|---|---|
| "No anomalies detected by the checks run" | "Authentic", "genuine", "verified real", "clean file" |
| "Observed anomaly", "warrants further examination" | "Fake", "forged", "manipulated", "deepfake" |
| "Review priority: high" | "98% likely tampered", any probability |
| "Hash matches the value registered at intake" | "File is proven original" |
| "Reported by uploader" | "Verified source", "confirmed collection time" |
| "AI interpretation (advisory)" | "AI verified", "AI confirms" |
| "Analysis incomplete: AI service unavailable" | Any substitute or placeholder analysis |
| "File rejected: video is 74 s, the limit is 60 s" | A generic "something went wrong" for a limit hit |

Every analysis view and report ends with a limitations block: normal export, editing or re-encoding can cause the same signals; missing metadata isn't proof of manipulation; ELA is informational; the AI is advisory; priority is a triage bucket, not a probability; the result doesn't replace a qualified examiner or a forensic certificate.

Two checks, because source code isn't the only place text appears:
1. **Source:** grep the repo for `authentic|genuine|fake|deepfake|forged|tampered`. Each hit must be a deliberate, accurate use (this table, a limitation, a banned-word list).
2. **Runtime:** AI output is screened for authenticity claims before it's saved (skill 11).

Done when: both checks pass and the limitations block appears in the UI and the report.
