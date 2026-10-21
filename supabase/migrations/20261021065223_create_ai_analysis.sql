create table if not exists public.ai_analyses (
 id uuid primary key default gen_random_uuid(),
 case_id uuid not null references public.cases(id) on delete cascade,
 evidence_id uuid not null references public.evidence(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id),
 status text not null default 'queued' check (status in ('queued','complete','incomplete')),
 ai_model text,
 prompt_version text,
 raw_response jsonb,
 parsed_result jsonb,
 ai_priority text check (ai_priority in ('low','medium','high')),
 error_message text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.ai_analyses enable row level security;
drop policy if exists ai_analysis_select_member on public.ai_analyses;
create policy ai_analysis_select_member on public.ai_analyses for select to authenticated using (is_case_member(case_id));
drop policy if exists ai_analysis_insert_member on public.ai_analyses;
create policy ai_analysis_insert_member on public.ai_analyses for insert to authenticated with check (auth.uid() = user_id and is_case_member(case_id));
drop policy if exists ai_analysis_update_owner on public.ai_analyses;
create policy ai_analysis_update_owner on public.ai_analyses for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists ai_analyses_evidence_created on public.ai_analyses(evidence_id, created_at desc);
