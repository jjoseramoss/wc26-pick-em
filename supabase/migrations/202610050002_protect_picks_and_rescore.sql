-- Protect picks at the database boundary and score corrected results.
-- Existing data was checked for negative scores and incomplete final results.

begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter table public.picks
  add constraint picks_home_score_nonnegative check (home_score_pred >= 0),
  add constraint picks_away_score_nonnegative check (away_score_pred >= 0),
  add constraint picks_points_valid check (points is null or points in (0, 1, 3));

alter table public.matches
  add constraint matches_home_score_nonnegative check (home_score is null or home_score >= 0),
  add constraint matches_away_score_nonnegative check (away_score is null or away_score >= 0),
  add constraint matches_result_complete check (
    (winner is null and home_score is null and away_score is null)
    or (winner is not null and home_score is not null and away_score is not null)
  );

-- Use column privileges as well as RLS. Browser users can submit a new pick
-- or change only its predicted scores. They cannot set points or move a pick
-- to another user, group, or match. There is no browser delete operation.
revoke all on table public.picks from anon, authenticated;
grant select on table public.picks to authenticated;
grant insert (user_id, match_id, group_id, home_score_pred, away_score_pred)
  on table public.picks to authenticated;
grant update (home_score_pred, away_score_pred)
  on table public.picks to authenticated;

drop policy if exists "Group members can view picks in their group" on public.picks;
drop policy if exists picks_select on public.picks;
drop policy if exists picks_insert on public.picks;
drop policy if exists picks_update on public.picks;
drop policy if exists picks_delete on public.picks;

-- A member can see their own future picks. Other members' predictions become
-- visible only at kickoff, so users cannot copy them before the lock.
create policy picks_select on public.picks
  for select to authenticated
  using (
    group_id in (select public.get_my_group_ids())
    and (
      user_id = (select auth.uid())
      or now() >= (select kickoff_time from public.matches where id = match_id)
    )
  );

create policy picks_insert on public.picks
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and group_id in (select public.get_my_group_ids())
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
    and group_id in (select public.get_my_group_ids())
    and now() < (select kickoff_time from public.matches where id = match_id)
  );

-- The trigger runs as its owner so it can update the server-owned points
-- column. A tied score remains a draw for scoring even when a different
-- `winner` records who advanced on penalties.
create or replace function private.score_picks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.winner is distinct from old.winner
     or new.home_score is distinct from old.home_score
     or new.away_score is distinct from old.away_score then
    update public.picks as p
    set points = case
      when new.winner is null then null
      when p.home_score_pred = new.home_score
       and p.away_score_pred = new.away_score then 3
      when (p.home_score_pred > p.away_score_pred and new.home_score > new.away_score)
        or (p.home_score_pred < p.away_score_pred and new.home_score < new.away_score)
        or (p.home_score_pred = p.away_score_pred and new.home_score = new.away_score)
        then 1
      else 0
    end
    where p.match_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function private.score_picks() from public, anon, authenticated;

create or replace trigger on_match_result
  after update on public.matches
  for each row execute function private.score_picks();

drop function public.score_picks();

-- Existing points may have been awarded with `winner` rather than the stored
-- scoreline. Update only rows whose points differ, preserving `updated_at`
-- for picks that are already correct.
with scored as (
  select p.id,
    case
      when p.home_score_pred = m.home_score
       and p.away_score_pred = m.away_score then 3
      when (p.home_score_pred > p.away_score_pred and m.home_score > m.away_score)
        or (p.home_score_pred < p.away_score_pred and m.home_score < m.away_score)
        or (p.home_score_pred = p.away_score_pred and m.home_score = m.away_score)
        then 1
      else 0
    end as new_points
  from public.picks as p
  join public.matches as m on m.id = p.match_id
  where m.winner is not null
)
update public.picks as p
set points = scored.new_points
from scored
where p.id = scored.id
  and p.points is distinct from scored.new_points;

commit;
