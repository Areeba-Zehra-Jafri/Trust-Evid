# 02 · Schema, roles, RLS, 2FA

Write schema only as migrations in `/supabase/migrations`, never by clicking in the dashboard.

## Tables
Follow SPEC §10, plus:
- `case_members(case_id, user_id, role)` with role in `investigator | uploader | examiner`, primary key `(case_id, user_id)`. **Roles live here only.** There is no role column on users, and members are inserted server-side only, so nobody can self-assign a role. Case creation inserts the owner as `investigator`.
- `evidence`: `uploaded_by`, `assigned_examiner_id`, `declared_mime`, `processing_status`, `deterministic_status`, `ai_status`, `error jsonb`, `rule_priority`, `sha256_original`, `storage_key`.
  - `processing_status` check: `awaiting_upload | queued | processing | done | failed | rejected`
- `analysis`: `deterministic_findings jsonb`, `ai_result jsonb`, `ai_priority`, `ai_model`, `prompt_version`, `ai_raw text`

## Reads via RLS, writes via the server
Browsers get select-only access. Every write goes through the API or the worker with the service role.

```sql
revoke all on all tables in schema public from anon;
revoke insert, update, delete on all tables in schema public from authenticated;

alter table cases enable row level security;
create policy require_aal2 on cases as restrictive for all to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2');
create policy member_read on cases for select to authenticated
  using (exists (select 1 from case_members m
                 where m.case_id = cases.id and m.user_id = (select auth.uid())));

alter table case_members enable row level security;
create policy require_aal2 on case_members as restrictive for all to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2');
create policy own_rows on case_members for select to authenticated
  using (user_id = (select auth.uid()));   -- no reference to cases, so no recursion

alter table evidence enable row level security;
create policy require_aal2 on evidence as restrictive for all to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2');
create policy member_read on evidence for select to authenticated
  using (exists (select 1 from case_members m
                 where m.case_id = evidence.case_id and m.user_id = (select auth.uid())
                   and (m.role in ('investigator','uploader')
                        or evidence.assigned_examiner_id = (select auth.uid()))));
```

Repeat the same pair for `analysis` (join through `evidence_id`) and `custody_events` (read only, same examiner rule). Wrap `auth.uid()` and `auth.jwt()` in `(select ...)` so Postgres evaluates them once.

## Originals stay immutable
```sql
create or replace function block_hash_change() returns trigger language plpgsql as $$
begin
  if old.sha256_original is not null
     and new.sha256_original is distinct from old.sha256_original then
    raise exception 'sha256_original is immutable';
  end if;
  return new;
end $$;
create trigger evidence_hash_immutable before update on evidence
  for each row execute function block_hash_change();
```

## The service role bypasses RLS
Every API route that uses it must do this first, in one shared helper:

```ts
// lib/authz.ts (shape only)
export async function requireMember(req, caseId, roles: Role[]) {
  const user = await verifySession(req);            // validates the JWT with Supabase
  if (user.aal !== 'aal2') throw new Forbidden('2FA required');
  const m = await getMembership(caseId, user.id);   // service-role lookup in case_members
  if (!m || !roles.includes(m.role)) throw new Forbidden();
  return { user, role: m.role };
}
```
Examiners additionally need `evidence.assigned_examiner_id = user.id` on any evidence route.

Done when: a user who signed in but skipped TOTP gets nothing from the tables via the API directly, gets 403 from API routes, and cannot insert a `case_members` row for themselves.
