create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) default auth.uid(),
  storage_path text not null unique,
  original_filename text not null,
  media_type text not null,
  file_size bigint not null,
  sha256_original text,
  source_details jsonb not null default '{}'::jsonb,
  processing_status text not null default 'awaiting_upload' check (processing_status in ('awaiting_upload','uploaded','processing','ready','rejected','failed')),
  error jsonb,
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists evidence_case_id_idx on public.evidence(case_id);
alter table public.evidence enable row level security;
create policy evidence_select_member on public.evidence for select to authenticated using (is_case_member(case_id));
create policy evidence_insert_uploader on public.evidence for insert to authenticated with check (auth.uid() = owner_user_id and is_case_member(case_id) and exists (select 1 from public.case_members cm where cm.case_id = evidence.case_id and cm.user_id = auth.uid() and cm.role in ('investigator','uploader')));
create policy evidence_update_owner on public.evidence for update to authenticated using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);
create policy evidence_delete_owner on public.evidence for delete to authenticated using (auth.uid() = owner_user_id);
create table if not exists public.custody_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) default auth.uid(),
  event_type text not null,
  event_time timestamptz not null default now(),
  evidence_hash text,
  details jsonb not null default '{}'::jsonb
);
alter table public.custody_events enable row level security;
create policy custody_select_member on public.custody_events for select to authenticated using (is_case_member(case_id));
create policy custody_insert_member on public.custody_events for insert to authenticated with check (auth.uid() = actor_user_id and is_case_member(case_id));
insert into storage.buckets (id, name, public) values ('evidence-originals','evidence-originals',false) on conflict (id) do nothing;
create policy evidence_storage_select on storage.objects for select to authenticated using (bucket_id = 'evidence-originals' and (storage.foldername(name))[1] in (select cm.case_id::text from public.case_members cm where cm.user_id = auth.uid()));
create policy evidence_storage_insert on storage.objects for insert to authenticated with check (bucket_id = 'evidence-originals' and (storage.foldername(name))[1] in (select cm.case_id::text from public.case_members cm where cm.user_id = auth.uid() and cm.role in ('investigator','uploader')));
create policy evidence_storage_delete on storage.objects for delete to authenticated using (bucket_id = 'evidence-originals' and owner_id = auth.uid()::text);
