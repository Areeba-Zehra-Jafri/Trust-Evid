# SKILLS.md — index

Playbooks for the coding agent, one file per skill. Open **the one file that matches your current task**, plus a paired skill only when the task actually touches that area. Don't load the rest.

Each skill has steps, code, and a "done when" check. Code is a starting point: if a library's API differs from what's shown, check its current docs and adapt.

Rules:
- If a skill conflicts with `AGENT.md`, `AGENT.md` wins. Follow it and log the conflict under "Open questions" in `CONTEXT.md`.
- If a skill file is missing or looks stale, ask instead of inventing its contents.
- Numbers (sizes, pixels, durations, frame counts) come from `worker/limits.json` via skill 19. Never hardcode them in a skill's code.

| # | File | Use when | Pairs with |
|---|---|---|---|
| 01 | `skills/01-honest-language.md` | Writing any UI text, prompt, report, or README | none |
| 02 | `skills/02-schema-rls-2fa.md` | Creating tables, `case_members`, policies, or auth checks | 03 |
| 03 | `skills/03-custody-chain.md` | Anything touching custody events | 02 |
| 04 | `skills/04-upload-flow.md` | Building `upload-url`, finalize, or retry | 02, 19 |
| 05 | `skills/05-worker-skeleton.md` | Setting up or changing the FastAPI service | 06 |
| 06 | `skills/06-intake.md` | The worker's first steps: claim, stream, hash, validate, reject | 03, 19 |
| 07 | `skills/07-metadata.md` | Extracting image or video metadata | 19 |
| 08 | `skills/08-image-checks.md` | Deterministic image signals | 10, 19 |
| 09 | `skills/09-video-checks.md` | Frame sampling and video signals | 10, 19 |
| 10 | `skills/10-findings-and-priority.md` | Emitting any finding or computing review priority | 08, 09 |
| 11 | `skills/11-ai-analysis.md` | The Gemini call and its validation | 10, 19 |
| 12 | `skills/12-integrity-verification.md` | Hash and chain verification | 03 |
| 13 | `skills/13-report.md` | JSON and PDF report | 10, 12 |
| 14 | `skills/14-tests.md` | Proving the acceptance criteria | the skill under test |
| 15 | `skills/15-render-deploy.md` | Shipping the worker | 05, 19 |
| 16 | `skills/16-git-and-code-gigs.md` | Commits and the two required gigs | 03, 11 |
| 17 | `skills/17-debug.md` | Something broke | the skill for that area |
| 18 | `skills/18-context-handoff.md` | End of every session, before pushing | none |
| 19 | `skills/19-limits.md` | Adding or enforcing any size, pixel, duration, or count limit | 04, 06, 08, 09, 11 |
