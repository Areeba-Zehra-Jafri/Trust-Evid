# 14 · Tests

Prove the acceptance criteria, not coverage. Use small synthetic fixtures committed to the repo. Never real evidence.

## Chain tamper (SQL, as a privileged role)
```sql
-- edit
update custody_events set details = '{"x":1}' where case_id = :c and seq = 2;
select * from verify_custody_chain(:c);          -- expect ok=false, broken_seq=2

-- reorder (swap seq through a temporary value)
update custody_events set seq = -1 where case_id = :c and seq = 2;
update custody_events set seq = 2  where case_id = :c and seq = 3;
update custody_events set seq = 3  where case_id = :c and seq = -1;
select * from verify_custody_chain(:c);          -- expect ok=false
```
Also assert that as `authenticated` and `service_role`, `insert`, `update` and `delete` on `custody_events` all error, and that two concurrent `append_custody_event` calls on one case produce seq 1 and 2 with no fork.

**CI setup:** run these on a plain Postgres container. Create the `extensions` schema, enable `pgcrypto` there, create stub `cases` and `evidence` tables, then apply only the chain migration. It must contain no `auth.*` references.

## Access and 2FA
- **Two-account isolation:** sign in as A and B (complete TOTP in the test using a TOTP library and the enrolled secret). A creates a case and evidence. As B, via direct API calls: list, read, signed-URL request, `/verify`, retry all return nothing or 403.
- **2FA enforcement:** sign in as A without completing the factor. `select` on `cases` returns no rows, and API routes return 403.
- **No self-assigned roles:** as `authenticated`, `insert` into `case_members` errors. An uploader can't read a case they aren't a member of. An examiner sees only assigned evidence.

## Integrity
- Upload a fixture: stored hash equals `sha256sum`. An altered copy mismatches in "verify a local file".
- `update evidence set sha256_original = 'x'` after it's set errors (the trigger).
- A retry adds no second `intake` event.

## Limits (skill 19)
Oversize file, over-pixel image, over-duration video, over-resolution video, wrong type, declared/real type mismatch, and no-duration video each end `rejected` with the right `limit` code, and none gets a hash or custody event.

## Checks
- **Repeated segment fixture** (recipe):
  ```bash
  ffmpeg -f lavfi -i testsrc=d=5:s=320x240:r=10 seg.mp4
  printf "file 'seg.mp4'\nfile 'seg.mp4'\n" > list.txt
  ffmpeg -f concat -safe 0 -i list.txt -c copy looped.mp4
  ```
  `looped.mp4` must flag a repeated segment. A plain static clip must not.
- ELA on a PNG returns `not_available`. EXIF-less image yields `IMG-EXIF-MISSING`. No finding or stored metadata contains a `System:` key or temp path.
- `rule_priority` returns `high` for a fixture with two weight-2 findings.

## AI
- `AI_FORCE_FAIL=1` gives `ai_status='incomplete'`, findings and rule priority present, and the UI shows the incomplete state.
- Mocked responses: invalid JSON, unknown finding ID, empty `finding_ids`, and "the file is authentic" each retry once and then end `incomplete`. A provider timeout or 429 does **not** retry.

## Worker
`/process` without the secret returns 401. `/process` twice runs once. A file with a mismatched real type is rejected.

Done when: every row of the traceability table in `AGENT.md` has a passing test or a documented manual check.
