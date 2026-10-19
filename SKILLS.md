# SKILLS.md — index

Playbooks for the coding agent, one file per skill. Open **only the file that matches your current task**. Each has steps, code, and a "done when" check. If a skill conflicts with `AGENT.md`, `AGENT.md` wins. Code is a starting point: if a library's API differs from what's shown, check its current docs.

| # | File | Use when |
|---|---|---|
| 01 | `skills/01-honest-language.md` | Writing any UI text, prompt, report, or README |
| 02 | `skills/02-schema-rls-2fa.md` | Creating tables, roles, policies, or auth checks |
| 03 | `skills/03-custody-chain.md` | Anything touching custody events |
| 04 | `skills/04-upload-flow.md` | Building intake, finalize, or retry |
| 05 | `skills/05-worker-skeleton.md` | Setting up or changing the FastAPI service |
| 06 | `skills/06-intake.md` | The worker's first steps: stream, hash, validate |
| 07 | `skills/07-metadata.md` | Extracting image or video metadata |
| 08 | `skills/08-image-checks.md` | Deterministic image signals |
| 09 | `skills/09-video-checks.md` | Frame sampling and video signals |
| 10 | `skills/10-findings-and-priority.md` | Emitting any finding or computing priority |
| 11 | `skills/11-ai-analysis.md` | The Gemini call and its validation |
| 12 | `skills/12-integrity-verification.md` | Hash and chain verification |
| 13 | `skills/13-report.md` | JSON and PDF report |
| 14 | `skills/14-tests.md` | Proving the acceptance criteria |
| 15 | `skills/15-render-deploy.md` | Shipping the worker |
| 16 | `skills/16-git-and-code-gigs.md` | Commits and the two required gigs |
| 17 | `skills/17-debug.md` | Something broke |
| 18 | `skills/18-context-handoff.md` | End of every session, before pushing |
| 19 | `skills/19-limits.md` | Adding or enforcing any size, pixel, duration, or count limit |
