# 17 · Debug playbook

| Symptom | Likely cause | Fix |
|---|---|---|
| Worker restarts mid-job | Out of memory (512 MB) | Lower `frame_max_count` and `frame_width`, stream, one job at a time |
| Job times out | 0.1 CPU decoding a long or large video | Lower `video_max_seconds` / resolution in `worker/limits.json` |
| First analysis takes about a minute | Free instance was asleep | Ping `/health` on page open; show a "starting" state |
| Evidence stuck in `queued` | Worker call lost or worker restarted | Retry button (queued older than about 3 minutes) |
| File shows `rejected` | Broke a limit or wrong type | Read `evidence.error`; user uploads a different file |
| Queries return empty rows | RLS: session is `aal1`, or not a case member | Complete TOTP; check `case_members` and the restrictive `aal2` policy |
| API route works for the wrong user | Service-role route skipped `requireMember` | Add the check (skill 02) |
| Upload rejected | Bucket MIME or size limit | Check bucket config against `limits.json` |
| 413 from Vercel | File sent through an API route | Use signed upload URLs |
| Gemini 429 | Free-tier rate limit | Mark `incomplete`, show a clear error, don't loop retries |
| AI keeps ending `incomplete` | Output cites unknown IDs or trips the banned-claim screen | Check the raw response stored in `ai_raw` |
| Chain verify fails on good data | Hash input drift (timestamp format, JSON) | Use `custody_hash()` only; `details` stays `jsonb` |
| Examiner sees "broken" chain | Verification ran through RLS | Run it with the service role via the API |
| Supabase calls fail after idle days | Free project paused | Resume it in the dashboard |
| Worker 401 from Next.js | Secret mismatch | Compare `WORKER_SHARED_SECRET` on both sides |

After two failed attempts at the same problem, stop and ask. Don't burn tokens looping.
