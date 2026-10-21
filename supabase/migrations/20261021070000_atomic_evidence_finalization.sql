-- Local-only Phase 5 migration. Abort if historical intake data is ambiguous.
do $
declare
  duplicate_count bigint;
  index_is_unique boolean;
  index_is_valid boolean;
  index_is_ready boolean;
  index_table oid;
  index_definition text;
  index_owner text;
begin
  select count(*) into duplicate_count from (
    select case_id, evidence_id from public.custody_events
    where event_type = 'intake' group by case_id, evidence_id having count(*) > 1
  ) d;
  if duplicate_count > 0 then raise exception 'duplicate intake history requires read-only remediation'; end if;
  select i.indisunique, i.indisvalid, i.indisready, ix.relnamespace, pg_get_indexdef(ix.oid), pg_get_userbyid(ix.relowner)
    into index_is_unique, index_is_valid, index_is_ready, index_table, index_definition, index_owner
  from pg_class ix join pg_index i on i.indexrelid=ix.oid
  where ix.relname='custody_events_one_intake_per_evidence'
    and ix.relnamespace='public'::regnamespace;
  if index_is_unique is not null and (
    not index_is_unique or not index_is_valid or not index_is_ready
    or index_table <> 'public.custody_events'::regclass
    or index_definition not like '%(case_id, evidence_id)%WHERE (event_type = ''intake''%'
  ) then raise exception 'existing intake index definition is unsafe'; end if;
  if index_is_unique is null then
    create unique index custody_events_one_intake_per_evidence
      on public.custody_events (case_id, evidence_id) where event_type = 'intake';
  end if;
end $$;

create or replace function public.finalize_verified_evidence(
  p_case_id uuid, p_evidence_id uuid, p_sha256 text, p_byte_count bigint
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare e public.evidence; existing public.custody_events;
begin
  if p_case_id is null or p_evidence_id is null or p_sha256 is null or p_byte_count is null then raise exception 'invalid verification result'; end if;
  if auth.uid() is null or coalesce(auth.jwt() ->> 'aal','') <> 'aal2' then raise exception 'not authorized'; end if;
  if not exists (select 1 from public.case_members cm where cm.case_id=p_case_id and cm.user_id=auth.uid() and cm.role in ('investigator','uploader')) then raise exception 'not authorized'; end if;
  if p_sha256 !~ '^[0-9a-fA-F]{64}$' or p_byte_count <= 0 then raise exception 'invalid verification result'; end if;
  select * into e from public.evidence where id=p_evidence_id and case_id=p_case_id for update;
  if not found then raise exception 'evidence not found'; end if;
  if e.file_size is null or e.file_size <> p_byte_count then raise exception 'byte count does not match file size'; end if;
  if e.processing_status is null or e.processing_status not in ('awaiting_upload','uploaded','processing','ready') then
    raise exception 'evidence status does not permit finalization';
  end if;
  if e.sha256_original is not null and lower(e.sha256_original) <> lower(p_sha256) then raise exception 'conflicting hash'; end if;
  select * into existing from public.custody_events where case_id=p_case_id and evidence_id=p_evidence_id and event_type='intake' order by event_time limit 1 for update;
  if existing.id is not null then
    if existing.evidence_hash is null or lower(existing.evidence_hash) <> lower(p_sha256) then raise exception 'conflicting intake'; end if;
    if existing.details ? 'byte_count' and (existing.details->>'byte_count')::bigint <> p_byte_count then raise exception 'conflicting intake'; end if;
    if e.sha256_original is null then raise exception 'inconsistent finalized evidence'; end if;
    return jsonb_build_object('state','already_finalized','sha256',lower(p_sha256),'byte_count',p_byte_count);
  end if;
  update public.evidence set sha256_original=coalesce(sha256_original,lower(p_sha256)), processing_status=case when processing_status='awaiting_upload' then 'uploaded' else processing_status end, uploaded_at=coalesce(uploaded_at,now()), updated_at=now() where id=p_evidence_id and case_id=p_case_id;
  insert into public.custody_events(case_id,evidence_id,actor_user_id,event_type,evidence_hash,details) values(p_case_id,p_evidence_id,auth.uid(),'intake',lower(p_sha256),jsonb_build_object('method','worker_verified_bytes','byte_count',p_byte_count));
  return jsonb_build_object('state','finalized','sha256',lower(p_sha256),'byte_count',p_byte_count);
end $$;
revoke all on function public.finalize_verified_evidence(uuid,uuid,text,bigint) from public, anon;
grant execute on function public.finalize_verified_evidence(uuid,uuid,text,bigint) to authenticated;
