-- A provider may move kickoff after the original deadline. Once picks close,
-- a reschedule must not reopen them or hide picks already revealed to a group.
begin;

alter table public.matches add column pick_deadline_at timestamptz;
update public.matches set pick_deadline_at = kickoff_time;
alter table public.matches alter column pick_deadline_at set not null;

create function private.maintain_pick_deadline()
returns trigger language plpgsql
set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.pick_deadline_at := new.kickoff_time;
  elsif new.kickoff_time is distinct from old.kickoff_time
        and old.pick_deadline_at > now() then
    -- A pre-kickoff schedule change moves the pick deadline with the game.
    new.pick_deadline_at := new.kickoff_time;
  else
    -- After the deadline, preserve it even if kickoff is moved into the future.
    new.pick_deadline_at := old.pick_deadline_at;
  end if;
  return new;
end;
$$;
revoke all on function private.maintain_pick_deadline()
  from public, anon, authenticated;
create trigger maintain_pick_deadline
  before insert or update of kickoff_time, pick_deadline_at on public.matches
  for each row execute function private.maintain_pick_deadline();

drop policy picks_select on public.picks;
create policy picks_select on public.picks
  for select to authenticated
  using (
    group_id in (select private.my_group_ids())
    and (
      user_id = (select auth.uid())
      or now() >= (select pick_deadline_at from public.matches where id = match_id)
    )
  );

drop policy picks_insert on public.picks;
create policy picks_insert on public.picks
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and group_id in (select private.my_group_ids())
    and exists (
      select 1 from public.matches as m
      where m.id = match_id and m.status = 'scheduled'
        and now() < m.pick_deadline_at
    )
  );

drop policy picks_update on public.picks;
create policy picks_update on public.picks
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.matches as m
      where m.id = match_id and m.status = 'scheduled'
        and now() < m.pick_deadline_at
    )
  )
  with check (
    user_id = (select auth.uid())
    and group_id in (select private.my_group_ids())
    and exists (
      select 1 from public.matches as m
      where m.id = match_id and m.status = 'scheduled'
        and now() < m.pick_deadline_at
    )
  );

commit;
