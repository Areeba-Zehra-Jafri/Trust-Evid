-- Applied manually to the live database; kept for repo parity.
drop policy if exists evidence_update_owner on public.evidence;
drop policy if exists evidence_delete_owner on public.evidence;
revoke update, delete on public.evidence from authenticated, anon;
