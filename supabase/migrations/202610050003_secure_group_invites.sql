-- Friend groups are private. Creation and joining happen atomically through
-- two narrow RPCs; callers can no longer list all invite codes or add a
-- membership by guessing a group ID.

begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- This helper runs as the database owner to read membership without an RLS
-- recursion loop. It only returns rows for the current authenticated user.
create or replace function private.my_group_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select gm.group_id
  from public.group_members as gm
  where gm.user_id = (select auth.uid());
$$;

revoke all on function private.my_group_ids() from public, anon;
grant execute on function private.my_group_ids() to authenticated;

drop policy if exists groups_select on public.groups;
drop policy if exists groups_insert on public.groups;
drop policy if exists groups_update on public.groups;
drop policy if exists groups_delete on public.groups;
drop policy if exists group_members_select on public.group_members;
drop policy if exists group_members_insert on public.group_members;
drop policy if exists group_members_delete on public.group_members;

create policy groups_select on public.groups
  for select to authenticated
  using (id in (select private.my_group_ids()));

create policy group_members_select on public.group_members
  for select to authenticated
  using (group_id in (select private.my_group_ids()));

create policy group_members_delete on public.group_members
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- No browser may create, edit, or delete a group row directly. Users can
-- still leave a group by deleting their own membership.
revoke all on table public.groups from anon, authenticated;
grant select on table public.groups to authenticated;
revoke all on table public.group_members from anon, authenticated;
grant select, delete on table public.group_members to authenticated;

-- The private function does both inserts in one transaction. A code collision
-- retries without leaving a half-created group behind.
create or replace function private.create_pickem_group(
  p_name text,
  p_display_name text
)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group public.groups%rowtype;
  v_name text := pg_catalog.btrim(p_name);
  v_display_name text := coalesce(nullif(pg_catalog.btrim(p_display_name), ''), 'Player');
  v_code text;
  v_attempt integer;
begin
  if v_user_id is null then
    raise exception 'Sign in to create a group' using errcode = '42501';
  end if;
  if v_name is null or v_name = '' or pg_catalog.length(v_name) > 80 then
    raise exception 'Group name must be 1 to 80 characters' using errcode = '22023';
  end if;
  if pg_catalog.length(v_display_name) > 40 then
    raise exception 'Display name must be 40 characters or fewer' using errcode = '22023';
  end if;

  for v_attempt in 1..10 loop
    v_code := pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 6));
    insert into public.groups (name, invite_code, created_by)
    values (v_name, v_code, v_user_id)
    on conflict (invite_code) do nothing
    returning * into v_group;
    exit when v_group.id is not null;
  end loop;

  if v_group.id is null then
    raise exception 'Could not generate a unique invite code' using errcode = '23505';
  end if;

  insert into public.group_members (group_id, user_id, display_name)
  values (v_group.id, v_user_id, v_display_name);
  return v_group;
end;
$$;

create or replace function private.join_pickem_group(
  p_invite_code text,
  p_display_name text
)
returns public.groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_group public.groups%rowtype;
  v_code text := pg_catalog.upper(pg_catalog.btrim(p_invite_code));
  v_display_name text := coalesce(nullif(pg_catalog.btrim(p_display_name), ''), 'Player');
begin
  if v_user_id is null then
    raise exception 'Sign in to join a group' using errcode = '42501';
  end if;
  if v_code is null or pg_catalog.length(v_code) <> 6 then
    raise exception 'Invalid invite code' using errcode = '22023';
  end if;
  if pg_catalog.length(v_display_name) > 40 then
    raise exception 'Display name must be 40 characters or fewer' using errcode = '22023';
  end if;

  select * into v_group
  from public.groups
  where invite_code = v_code;
  if v_group.id is null then
    raise exception 'Invalid invite code' using errcode = '22023';
  end if;

  insert into public.group_members (group_id, user_id, display_name)
  values (v_group.id, v_user_id, v_display_name)
  on conflict (group_id, user_id) do nothing;
  return v_group;
end;
$$;

revoke all on function private.create_pickem_group(text, text) from public, anon;
revoke all on function private.join_pickem_group(text, text) from public, anon;
grant execute on function private.create_pickem_group(text, text) to authenticated;
grant execute on function private.join_pickem_group(text, text) to authenticated;

-- Supabase exposes public RPCs. These invoker wrappers call the private
-- definer functions, which validate the user and hold the necessary write
-- privileges. The privileged functions themselves stay outside the API.
create or replace function public.create_pickem_group(
  p_name text,
  p_display_name text
)
returns public.groups
language sql
security invoker
set search_path = ''
as $$
  select private.create_pickem_group(p_name, p_display_name);
$$;

create or replace function public.join_pickem_group(
  p_invite_code text,
  p_display_name text
)
returns public.groups
language sql
security invoker
set search_path = ''
as $$
  select private.join_pickem_group(p_invite_code, p_display_name);
$$;

revoke all on function public.create_pickem_group(text, text) from public, anon;
revoke all on function public.join_pickem_group(text, text) from public, anon;
grant execute on function public.create_pickem_group(text, text) to authenticated;
grant execute on function public.join_pickem_group(text, text) to authenticated;

-- Replace policy references to the old public definer helper, then remove it
-- from the API-exposed schema.
drop policy if exists picks_select on public.picks;
drop policy if exists picks_insert on public.picks;
drop policy if exists picks_update on public.picks;

create policy picks_select on public.picks
  for select to authenticated
  using (
    group_id in (select private.my_group_ids())
    and (
      user_id = (select auth.uid())
      or now() >= (select kickoff_time from public.matches where id = match_id)
    )
  );

create policy picks_insert on public.picks
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and group_id in (select private.my_group_ids())
    and now() < (select kickoff_time from public.matches where id = match_id)
  );

create policy picks_update on public.picks
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and now() < (select kickoff_time from public.matches where id = match_id)
  )
  with check (
    user_id = (select auth.uid())
    and group_id in (select private.my_group_ids())
    and now() < (select kickoff_time from public.matches where id = match_id)
  );

drop function if exists public.get_my_group_ids();

commit;
