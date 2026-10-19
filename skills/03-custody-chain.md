# 03 · Custody chain in Postgres

Rules: the chain is per case. Hashes cover a fixed delimiter-joined string, never client JSON. `details` is `jsonb`, and `details::text` is deterministic. Only the append function inserts. **This migration must not reference `auth.*`**, so CI can run it on plain Postgres (skill 14).

```sql
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table custody_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id),
  evidence_id uuid references evidence(id),
  actor_user_id uuid not null,
  event_type text not null check (event_type in
    ('intake','analysis','review','verification','download')),
  event_ts timestamptz not null,
  evidence_hash text,
  previous_event_hash text not null,
  event_hash text not null,
  details jsonb not null default '{}'::jsonb,
  seq bigint not null,
  unique (case_id, seq)
);

create or replace function custody_hash(
  c uuid, e uuid, a uuid, t text, ts timestamptz, eh text, d jsonb, prev text, s bigint
) returns text language sql immutable set search_path = public, extensions as $$
  select encode(digest(concat_ws('|', c, coalesce(e::text,''), a, t,
    to_char(ts at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    coalesce(eh,''), d::text, prev, s), 'sha256'), 'hex')
$$;

create or replace function append_custody_event(
  p_case uuid, p_evidence uuid, p_actor uuid, p_type text, p_hash text, p_details jsonb
) returns custody_events language plpgsql security definer
  set search_path = public, extensions as $$
declare v_prev text; v_seq bigint; v_ts timestamptz := clock_timestamp(); r custody_events;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_case::text, 0));
  select event_hash, seq into v_prev, v_seq
    from custody_events where case_id = p_case order by seq desc limit 1;
  if v_prev is null then v_prev := repeat('0', 64); v_seq := 0; end if;
  v_seq := v_seq + 1;
  insert into custody_events (case_id, evidence_id, actor_user_id, event_type, event_ts,
    evidence_hash, previous_event_hash, event_hash, details, seq)
  values (p_case, p_evidence, p_actor, p_type, v_ts, p_hash, v_prev,
    custody_hash(p_case, p_evidence, p_actor, p_type, v_ts, p_hash, p_details, v_prev, v_seq),
    p_details, v_seq)
  returning * into r;
  return r;
end $$;

create or replace function verify_custody_chain(p_case uuid)
returns table (ok boolean, broken_seq bigint, reason text)
language plpgsql set search_path = public, extensions as $$
declare r custody_events; v_prev text := repeat('0',64); v_expect bigint := 1;
begin
  for r in select * from custody_events where case_id = p_case order by seq loop
    if r.seq <> v_expect then
      return query select false, r.seq, 'sequence gap or reorder'; return; end if;
    if r.previous_event_hash <> v_prev then
      return query select false, r.seq, 'previous hash mismatch'; return; end if;
    if r.event_hash <> custody_hash(r.case_id, r.evidence_id, r.actor_user_id, r.event_type,
         r.event_ts, r.evidence_hash, r.details, r.previous_event_hash, r.seq) then
      return query select false, r.seq, 'event hash mismatch'; return; end if;
    v_prev := r.event_hash; v_expect := v_expect + 1;
  end loop;
  return query select true, null::bigint, null::text;
end $$;

create or replace function custody_chain_head(p_case uuid)
returns table (event_count bigint, head_hash text) language sql
set search_path = public as $$
  select count(*), (select event_hash from custody_events
                    where case_id = p_case order by seq desc limit 1)
  from custody_events where case_id = p_case
$$;

-- Lock it down. Verification and head run through the API with the service role,
-- so an examiner with RLS-limited visibility never sees a false "gap".
revoke all on function append_custody_event, verify_custody_chain, custody_chain_head
  from public, anon, authenticated;
grant execute on function append_custody_event, verify_custody_chain, custody_chain_head
  to service_role;
revoke insert, update, delete, truncate on custody_events
  from anon, authenticated, service_role;
```

Callers pass the actor from the verified session or the evidence row, never from request input.

The API returns `ok` or `broken` for chain verification to everyone. Only investigators also get `broken_seq` and `reason`. Never return other users' events to an examiner through this path.

Known limit, say it in the README: this resists edits and reordering by app roles. A privileged admin can rewrite everything, and deleting the last events isn't detectable without an external anchor. The report's head hash and event count let anyone who recorded them earlier spot truncation.

Done when: the SQL tamper tests in skill 14 pass on a plain Postgres container.
