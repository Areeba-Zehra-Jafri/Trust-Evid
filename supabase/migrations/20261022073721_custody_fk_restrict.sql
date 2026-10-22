-- Applied manually to the live database; kept for repo parity.
alter table public.custody_events drop constraint if exists custody_events_evidence_id_fkey;
alter table public.custody_events add constraint custody_events_evidence_id_fkey
  foreign key (evidence_id) references public.evidence(id) on delete restrict;
alter table public.custody_events drop constraint if exists custody_events_case_id_fkey;
alter table public.custody_events add constraint custody_events_case_id_fkey
  foreign key (case_id) references public.cases(id) on delete restrict;
