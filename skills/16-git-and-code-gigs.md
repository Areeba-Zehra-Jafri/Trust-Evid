# 16 · Git and code gigs

- Commit early and often with clear prefixes: `feat:`, `fix:`, `test:`, `docs:`, `chore:`. One logical change per commit. Don't squash.
- Public repo from the first commit. `.env.example` always current. No secrets in history.
- Run the limits sync check in CI (skill 19) and the chain tests on plain Postgres (skill 14).

## Code gig 1: custody-chain module
The SQL functions from skill 03, a small TypeScript or Python wrapper, an example, and a README explaining the hash input format and the known limits.

## Code gig 2: AI-output-validation module
The pydantic schema, grounding check, banned-claim screen, retry-once-on-invalid logic, forced-failure switch, and a README with examples.

Each gig lives in its own folder, runs standalone, has a short README with a usage example, and has at least one test. Confirm with the organizers what counts as a "code gig" and that these two match.

Done when: each gig can be cloned on its own, run, and understood from its README in under five minutes.
