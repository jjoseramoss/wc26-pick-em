-- ============================================================
-- World Cup Pick 'em 2026 — Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- =====================
-- TABLES
-- =====================

create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  team_home     text not null,
  team_away     text not null,
  kickoff_time  timestamptz not null,
  stage         text not null check (stage in ('group', 'R32', 'R16', 'QF', 'SF', '3rd', 'F')),
  group_label   text,        -- 'A' through 'L' for group stage
  home_score    int,
  away_score    int,
  winner        text check (winner in ('home', 'away', 'draw')),
  created_at    timestamptz not null default now()
);

create table if not exists public.groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  invite_code   char(6) not null unique,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id      uuid not null references public.groups(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  display_name  text not null,
  joined_at     timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.picks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  match_id        uuid not null references public.matches(id) on delete cascade,
  group_id        uuid not null references public.groups(id) on delete cascade,
  home_score_pred int not null,
  away_score_pred int not null,
  points          int,   -- null until match result is set
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, match_id, group_id)
);

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

alter table public.matches      enable row level security;
alter table public.groups       enable row level security;
alter table public.group_members enable row level security;
alter table public.picks        enable row level security;

-- MATCHES: public read, authenticated users can insert/update (admin for MVP)
create policy "matches_select" on public.matches
  for select using (true);

create policy "matches_insert" on public.matches
  for insert with check (auth.role() = 'authenticated');

create policy "matches_update" on public.matches
  for update using (auth.role() = 'authenticated');

-- GROUPS: authenticated users can read (needed to look up by invite code), create, update own
create policy "groups_select" on public.groups
  for select using (auth.role() = 'authenticated');

create policy "groups_insert" on public.groups
  for insert with check (auth.uid() = created_by);

create policy "groups_update" on public.groups
  for update using (auth.uid() = created_by);

create policy "groups_delete" on public.groups
  for delete using (auth.uid() = created_by);

-- GROUP_MEMBERS: see members of groups you belong to, join/leave yourself
create policy "group_members_select" on public.group_members
  for select using (
    group_id in (
      select group_id from public.group_members where user_id = auth.uid()
    )
  );

create policy "group_members_insert" on public.group_members
  for insert with check (auth.uid() = user_id);

create policy "group_members_delete" on public.group_members
  for delete using (auth.uid() = user_id);

-- PICKS: CRUD own picks (locked at kickoff); see all picks in your groups
create policy "picks_select" on public.picks
  for select using (
    group_id in (
      select group_id from public.group_members where user_id = auth.uid()
    )
  );

create policy "picks_insert" on public.picks
  for insert with check (
    auth.uid() = user_id
    and group_id in (
      select group_id from public.group_members where user_id = auth.uid()
    )
    and now() < (select kickoff_time from public.matches where id = match_id)
  );

create policy "picks_update" on public.picks
  for update using (
    auth.uid() = user_id
    and now() < (select kickoff_time from public.matches where id = match_id)
  );

create policy "picks_delete" on public.picks
  for delete using (auth.uid() = user_id);

-- =====================
-- FUNCTION: auto-updated_at for picks
-- =====================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger picks_updated_at
  before update on public.picks
  for each row execute function public.set_updated_at();

-- =====================
-- FUNCTION: auto-score picks when match result is set
-- =====================

create or replace function public.score_picks()
returns trigger as $$
begin
  -- Only fire when winner is set for the first time
  if (new.winner is not null and (old.winner is null or old.winner <> new.winner)) then
    update public.picks p
    set points = case
      when p.home_score_pred = new.home_score and p.away_score_pred = new.away_score then 3
      when (
        (p.home_score_pred > p.away_score_pred  and new.winner = 'home') or
        (p.home_score_pred < p.away_score_pred  and new.winner = 'away') or
        (p.home_score_pred = p.away_score_pred  and new.winner = 'draw')
      ) then 1
      else 0
    end
    where p.match_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_match_result
  after update on public.matches
  for each row execute function public.score_picks();
