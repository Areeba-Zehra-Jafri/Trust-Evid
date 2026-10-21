# Trust-Evid worker

The worker accepts only `POST /process` bodies containing `evidence_id` and a
matching `X-Worker-Secret`. It retrieves evidence and originals with server-side
Supabase credentials, persists deterministic findings first, then optionally
runs additive Gemini analysis. AI output is schema- and citation-validated;
provider or validation failures produce an `incomplete` AI record and never
replace deterministic findings.

## Render configuration

Required: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`WORKER_SHARED_SECRET`. Optional: `GEMINI_API_KEY`, `AI_MODEL`, `AI_FORCE_FAIL`.

## Checks

```bash
pip install -r requirements.txt
pytest
```

The Docker image copies the complete import graph. Gemini is bounded to a
small response and image input budget; malformed, oversized, or unavailable
provider output is recorded as incomplete after deterministic persistence.
Claim/retry semantics and custody RPC compatibility still require verification
against the deployed Supabase schema.
