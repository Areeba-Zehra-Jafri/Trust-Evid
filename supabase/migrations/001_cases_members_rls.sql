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

-- Grant execute on is_case_member to authenticated only
grant execute on function is_case_member(uuid) to authenticated;
