# CONTEXT.md
Last updated: Phase 4 · AI handling, packaging, and tests (stabilization pass)

## Done
- Batch 1-2 applied: dashboard authentication redirects preserve thrown auth Responses; cases GET/POST preserve unexpected errors; evidence intake uses the static browser Supabase client; evidence listing and upload handlers use the documented auth wrapper and verified MIME/byte limits.
- Optional Gemini processing is explicitly opt-in and additive to deterministic findings.
- Provider and validation failures are represented as incomplete AI processing when persistence succeeds; deterministic output remains authoritative.
- AI provider responses and inline image inputs now have explicit bounded byte budgets before parsing/transmission.
- Structured AI output is bounded, citation-checked (including citation types), and screened for unsafe authenticity claims.
- Docker copies the worker runtime import graph and limits.json.
- Focused worker tests cover authentication, exact intake payloads, limits, hashing, AI validation/failure, and packaging contracts.

## In progress
- Remaining Batch 1 route wrappers (finalize, process, AI, chain, notes, review, report) are not yet applied.
- Test execution and Docker startup were not run because no command runner is available in this workspace.
- Phase 4 AI persistence stores JSONB-compatible provider raw response separately from validated parsed output and records validated priority.
- Atomic claim, stale recovery, retry semantics, and custody RPC compatibility remain blocked by unverified deployed database contracts.
- AI persistence now avoids unsupported evidence_id upsert and carries owner_user_id; deployed column/RLS behavior remains unverified.

## Next
1. Run `cd worker && pytest` in CI.
2. Run a container startup/health smoke check with required Render secrets.
3. Verify deployed AI schema and add an approved atomic claim/retry contract before claiming lifecycle readiness.

## Decisions
- AI never replaces deterministic findings and never makes authenticity or admissibility claims.
- No frontend, package, migration, or live database changes were made.
- Caller hashes, paths, URLs, tokens, and metadata are not trusted.
