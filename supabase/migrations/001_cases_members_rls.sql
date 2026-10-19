/*
-- run in Supabase SQL Editor

-- Create cases table with columns mirroring lib/types.ts Case
create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  title varchar(120) not null,
  reference_number varchar(40) not null check (reference_number ~ '^[a-zA-Z0-9\-_\/]{0,40}$'),
  description varchar(1000) not null,
  status text not null check (status in ('open','closed','archived')) default 'open',
  created_by uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger function to update updated_at on row modification
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Attach trigger to cases table
create trigger cases_update_updated_at
before update on cases
for each row
execute function update_updated_at_column();

-- Create case_members table
create table if not exists case_members (
  case_id uuid not null references cases(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('investigator','uploader','examiner')),
  created_at timestamptz not null default now(),
  primary key (case_id, user_id)
);

-- Enable row level security on cases and case_members
alter table cases enable row level security;
alter table case_members enable row level security;

-- Restrictive policy for authenticated users requiring aal2 on cases
create policy cases_restrictive_aal2 on cases
  for all
  to authenticated
  using ((select current_setting('jwt.claims.aal', true)) = 'aal2');

-- Restrictive policy for authenticated users requiring aal2 on case_members
create policy case_members_restrictive_aal2 on case_members
  for all
  to authenticated
  using ((select current_setting('jwt.claims.aal', true)) = 'aal2');

-- Permissive select policy for cases: visible only when is_case_member(id)
create policy cases_select_member on cases
  for select
  to authenticated
  using (is_case_member(id));

-- Permissive select policy for case_members: visible when user_id = auth.uid() or is_case_member(case_id)
create policy case_members_select on case_members
  for select
  to authenticated
  using (user_id = (select auth.uid()) or is_case_member(case_id));

-- No insert/update/delete policies for anon or authenticated (restrict all writes)
-- Writes only via server-side with service role key

-- Create helper function is_case_member(uuid) SECURITY DEFINER, stable, set search_path = public
create or replace function is_case_member(p_case_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
select exists(
  select 1 from case_members
  where case_id = p_case_id
  and user_id = auth.uid()
);
$$;

-- Revoke execute on is_case_member from public and anon
revoke execute on function is_case_member(uuid) from public;
revoke execute on function is_case_member(uuid) from anon;

-- Create create_case_with_owner function: inserts the case and a member row atomically
create or replace function create_case_with_owner(
  p_user uuid,
  p_title text,
  p_ref text,
  p_desc text
) returns cases
language plpgsql security definer set search_path = public as $$
declare
  v_case_id uuid;
begin
  insert into cases (title, reference_number, description, created_by)
  values (left(p_title, 120), left(p_ref, 40), left(p_desc, 1000), p_user)
  returning id into v_case_id;

  insert into case_members(case_id, user_id, role)
  values (v_case_id, p_user, 'investigator');

  return query select * from cases where id = v_case_id;
end;
$$;

-- Grant execute on create_case_with_owner only to service_role
revoke execute on function create_case_with_owner(uuid, text, text, text) from public;
grant execute on function create_case_with_owner(uuid, text, text, text) to service_role;
*/

-- run in Supabase SQL Editor
-- 001: cases, case_members, RLS (aal2 required), no hard-delete path

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  title text not null
    check (char_length(title) between 1 and 120),
  reference_number text not null
    check (char_length(reference_number) between 1 and 40
           and reference_number ~ '^[A-Za-z0-9_/-]+$'),
  description text not null
    check (char_length(description) <= 1000),
  status text not null default 'open'
    check (status in ('open','closed','archived')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_members (
  case_id uuid not null references public.cases(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('investigator','uploader','examiner')),
  created_at timestamptz not null default now(),
  primary key (case_id, user_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cases_set_updated_at on public.cases;
create trigger cases_set_updated_at
before update on public.cases
for each row execute function public.set_updated_at();

-- Helper first: policies depend on it.
create or replace function public.is_case_member(p_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.case_members
    where case_id = p_case_id
      and user_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_case_member(uuid) from public, anon;
grant execute on function public.is_case_member(uuid) to authenticated;

alter table public.cases enable row level security;
alter table public.case_members enable row level security;

-- Defense in depth: browsers can never write, regardless of policies.
revoke insert, update, delete, truncate on public.cases from anon, authenticated;
revoke insert, update, delete, truncate on public.case_members from anon, authenticated;

-- RESTRICTIVE: every access must be aal2.
drop policy if exists cases_require_aal2 on public.cases;
create policy cases_require_aal2 on public.cases
  as restrictive for all to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2');

drop policy if exists case_members_require_aal2 on public.case_members;
create policy case_members_require_aal2 on public.case_members
  as restrictive for all to authenticated
  using ((select auth.jwt()->>'aal') = 'aal2');

-- PERMISSIVE: select only.
drop policy if exists cases_select_member on public.cases;
create policy cases_select_member on public.cases
  for select to authenticated
  using (public.is_case_member(id));

drop policy if exists case_members_select on public.case_members;
create policy case_members_select on public.case_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_case_member(case_id));

-- Atomic create: case + investigator row. service_role only.
create or replace function public.create_case_with_owner(
  p_user uuid,
  p_title text,
  p_ref text,
  p_desc text
)
returns public.cases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.cases;
begin
  insert into public.cases (title, reference_number, description, created_by)
  values (p_title, p_ref, p_desc, p_user)
  returning * into v_case;

  insert into public.case_members (case_id, user_id, role)
  values (v_case.id, p_user, 'investigator');

  return v_case;
end;
$$;

revoke execute on function public.create_case_with_owner(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.create_case_with_owner(uuid, text, text, text)
  to service_role;
