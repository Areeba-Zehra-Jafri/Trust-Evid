create or replace function public.create_case_with_owner(p_user uuid, p_title text, p_ref text, p_desc text)
returns public.cases
language plpgsql security definer set search_path = public
as $$
declare v_case public.cases;
begin
  if auth.uid() is null or auth.uid() <> p_user or (auth.jwt()->>'aal') <> 'aal2' then raise exception 'not authorized' using errcode = '42501'; end if;
  insert into public.cases (title, reference_number, description, created_by)
  values (left(p_title,120), left(p_ref,40), left(p_desc,1000), p_user) returning * into v_case;
  insert into public.case_members (case_id,user_id,role) values (v_case.id,p_user,'investigator');
  return v_case;
end; $$;
revoke execute on function public.create_case_with_owner(uuid,text,text,text) from public, anon;
grant execute on function public.create_case_with_owner(uuid,text,text,text) to authenticated;

create or replace function public.archive_case(p_case_id uuid)
returns public.cases
language plpgsql security definer set search_path = public
as $$
declare v_case public.cases;
begin
  if auth.uid() is null or (auth.jwt()->>'aal') <> 'aal2' then raise exception 'not authorized' using errcode='42501'; end if;
  if not exists (select 1 from public.case_members where case_id=p_case_id and user_id=auth.uid() and role='investigator') then raise exception 'not found' using errcode='P0002'; end if;
  update public.cases set status='archived' where id=p_case_id and status in ('open','closed') returning * into v_case;
  if v_case.id is null then
    if exists (select 1 from public.cases where id=p_case_id and status='archived') then raise exception 'already archived' using errcode='23514'; end if;
    raise exception 'invalid case' using errcode='P0002';
  end if;
  return v_case;
end; $$;
revoke execute on function public.archive_case(uuid) from public, anon;
grant execute on function public.archive_case(uuid) to authenticated;
