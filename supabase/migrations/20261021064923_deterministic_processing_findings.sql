create table if not exists public.processing_findings (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id),
  processor_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  signals jsonb not null default '[]'::jsonb,
  sampled_frames jsonb not null default '[]'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.processing_findings enable row level security;
drop policy if exists processing_findings_select_member on public.processing_findings;
create policy processing_findings_select_member on public.processing_findings for select to authenticated using (is_case_member(case_id));
drop policy if exists processing_findings_insert_member on public.processing_findings;
create policy processing_findings_insert_member on public.processing_findings for insert to authenticated with check (auth.uid() = user_id and is_case_member(case_id));
alter table public.evidence add column if not exists extracted_metadata jsonb not null default '{}'::jsonb;
alter table public.evidence add column if not exists processing_started_at timestamptz;
alter table public.evidence add column if not exists processed_at timestamptz;
create index if not exists processing_findings_evidence_idx on public.processing_findings(evidence_id, created_at desc);
