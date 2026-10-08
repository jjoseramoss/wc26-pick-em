-- Prepare a reusable soccer schedule while preserving every existing match,
-- pick, group, and result. Apply to the hosted project only after review.
begin;

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null check (kind in ('club', 'national_team')),
  created_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id),
  label text not null,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  unique (competition_id, label),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

-- A competition can change format between seasons. A phase describes how
-- fixtures in this particular season are organized and shown in the UI.
create table public.season_phases (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id),
  code text not null,
  name text not null,
  format text not null check (format in ('league', 'group', 'knockout')),
  sort_order int not null check (sort_order >= 0),
  unique (season_id, code),
  unique (id, season_id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('club', 'national_team')),
  created_at timestamptz not null default now(),
  unique (kind, name)
);

create table public.season_teams (
  season_id uuid not null references public.seasons(id),
  team_id uuid not null references public.teams(id),
  primary key (season_id, team_id)
);

-- Stable IDs make the backfill repeatable and easy to recognize in reviews.
insert into public.competitions (id, slug, name, kind) values
  ('26000000-0000-4000-8000-000000000001', 'fifa-world-cup', 'FIFA World Cup', 'national_team');
insert into public.seasons (id, competition_id, label, starts_on, ends_on) values
  ('26000000-0000-4000-8000-000000000026',
   '26000000-0000-4000-8000-000000000001', '2026', '2026-06-11', '2026-07-19');

insert into public.season_phases (season_id, code, name, format, sort_order) values
  ('26000000-0000-4000-8000-000000000026', 'group', 'Group stage', 'group', 1),
  ('26000000-0000-4000-8000-000000000026', 'R32', 'Round of 32', 'knockout', 2),
  ('26000000-0000-4000-8000-000000000026', 'R16', 'Round of 16', 'knockout', 3),
  ('26000000-0000-4000-8000-000000000026', 'QF', 'Quarter-finals', 'knockout', 4),
  ('26000000-0000-4000-8000-000000000026', 'SF', 'Semi-finals', 'knockout', 5),
  ('26000000-0000-4000-8000-000000000026', '3rd', 'Third-place match', 'knockout', 6),
  ('26000000-0000-4000-8000-000000000026', 'F', 'Final', 'knockout', 7);

-- Defaults keep the currently deployed browser and old SQL tests working
-- during the transition. The future create-group UI must pass a season ID.
alter table public.matches
  add column season_id uuid not null default '26000000-0000-4000-8000-000000000026'
    references public.seasons(id),
  add column phase_id uuid,
  add column home_team_id uuid references public.teams(id),
  add column away_team_id uuid references public.teams(id),
  add column status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'postponed', 'cancelled', 'final')),
  add column provider_name text,
  add column provider_fixture_id text,
  add column provider_updated_at timestamptz,
  add constraint matches_phase_same_season
    foreign key (phase_id, season_id) references public.season_phases(id, season_id),
  add constraint matches_provider_pair check (
    (provider_name is null) = (provider_fixture_id is null)
  ),
  add constraint matches_home_team_in_season
    foreign key (season_id, home_team_id)
    references public.season_teams(season_id, team_id),
  add constraint matches_away_team_in_season
    foreign key (season_id, away_team_id)
    references public.season_teams(season_id, team_id);

-- `stage` is a legacy World Cup label. New fixtures use phase_id instead.
alter table public.matches alter column stage drop not null;

create unique index matches_provider_fixture_unique
  on public.matches (provider_name, provider_fixture_id)
  where provider_name is not null;
create index matches_season_kickoff_idx
  on public.matches (season_id, kickoff_time);

alter table public.groups
  add column season_id uuid not null default '26000000-0000-4000-8000-000000000026'
    references public.seasons(id);
create index groups_season_idx on public.groups (season_id);

-- The deployed two-argument RPC still creates a World Cup group during this
-- transition. The new three-argument version lets the upcoming UI choose a
-- season. Both group and creator membership are created in one transaction.
create function private.create_pickem_group_for_season(
  p_name text, p_display_name text, p_season_id uuid
)
returns public.groups
language plpgsql security definer set search_path = '' as $$
declare
  v_group public.groups;
begin
  if p_season_id is null or not exists (
    select 1 from public.seasons where id = p_season_id
  ) then
    raise exception 'Choose an available season' using errcode = '22023';
  end if;
  v_group := private.create_pickem_group(p_name, p_display_name);
  update public.groups set season_id = p_season_id
  where id = v_group.id returning * into v_group;
  return v_group;
end;
$$;
revoke all on function private.create_pickem_group_for_season(text,text,uuid)
  from public, anon;
grant execute on function private.create_pickem_group_for_season(text,text,uuid)
  to authenticated;

create function public.create_pickem_group(
  p_name text, p_display_name text, p_season_id uuid
)
returns public.groups
language sql security invoker set search_path = '' as $$
  select private.create_pickem_group_for_season(p_name, p_display_name, p_season_id);
$$;
revoke all on function public.create_pickem_group(text,text,uuid)
  from public, anon;
grant execute on function public.create_pickem_group(text,text,uuid)
  to authenticated;

-- Existing names remain as display snapshots. Team IDs are added without
-- touching match IDs, results, or picks. Future fixtures can use stable IDs.
insert into public.teams (name, kind)
select name, 'national_team'
from (
  select team_home as name from public.matches
  union
  select team_away as name from public.matches
) as names;
insert into public.season_teams (season_id, team_id)
select '26000000-0000-4000-8000-000000000026', id from public.teams;

update public.matches as m
set phase_id = sp.id,
    home_team_id = home.id,
    away_team_id = away.id,
    status = case when m.winner is not null then 'final' else 'scheduled' end
from public.season_phases as sp,
     public.teams as home,
     public.teams as away
where sp.season_id = m.season_id
  and sp.code = m.stage
  and home.kind = 'national_team' and home.name = m.team_home
  and away.kind = 'national_team' and away.name = m.team_away;

-- Existing scoring is based on a populated result. The new status makes it
-- explicit when an importer has confirmed the result. Old data is untouched.
create or replace function private.check_pick_season()
returns trigger language plpgsql
security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.groups as g
    join public.matches as m on m.season_id = g.season_id
    where g.id = new.group_id and m.id = new.match_id
  ) then
    raise exception 'Pick fixture must belong to the group season'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.check_pick_season() from public, anon, authenticated;
create trigger picks_same_season
  before insert or update of group_id, match_id on public.picks
  for each row execute function private.check_pick_season();

-- Prevent a later season reassignment from stranding existing picks.
create or replace function private.keep_picked_season()
returns trigger language plpgsql
set search_path = '' as $$
begin
  if new.season_id is distinct from old.season_id then
    if tg_table_name = 'groups' and exists (
      select 1 from public.picks where group_id = old.id
    ) then
      raise exception 'Cannot change the season of a group with picks'
        using errcode = '23514';
    elsif tg_table_name = 'matches' and exists (
      select 1 from public.picks where match_id = old.id
    ) then
      raise exception 'Cannot change the season of a fixture with picks'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.keep_picked_season() from public, anon, authenticated;
create trigger groups_keep_picked_season
  before update of season_id on public.groups
  for each row execute function private.keep_picked_season();
create trigger matches_keep_picked_season
  before update of season_id on public.matches
  for each row execute function private.keep_picked_season();

-- Public catalog data is readable; only trusted server code writes it.
alter table public.competitions enable row level security;
alter table public.seasons enable row level security;
alter table public.season_phases enable row level security;
alter table public.teams enable row level security;
alter table public.season_teams enable row level security;
create policy competitions_read on public.competitions for select using (true);
create policy seasons_read on public.seasons for select using (true);
create policy phases_read on public.season_phases for select using (true);
create policy teams_read on public.teams for select using (true);
create policy season_teams_read on public.season_teams for select using (true);
grant select on public.competitions, public.seasons, public.season_phases,
  public.teams, public.season_teams to anon, authenticated;
grant all on public.competitions, public.seasons, public.season_phases,
  public.teams, public.season_teams to service_role;

commit;
