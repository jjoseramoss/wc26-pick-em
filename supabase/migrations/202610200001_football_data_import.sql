-- Stable provider identities make schedule sync repeatable without replacing
-- match IDs (and therefore without detaching existing picks).
begin;

alter table public.competitions
  add column provider_name text,
  add column provider_competition_id text,
  add column emblem_url text,
  add constraint competitions_provider_pair check (
    (provider_name is null) = (provider_competition_id is null)
  );
create unique index competitions_provider_unique
  on public.competitions (provider_name, provider_competition_id);

alter table public.seasons
  add column provider_name text,
  add column provider_season_id text,
  add constraint seasons_provider_pair check (
    (provider_name is null) = (provider_season_id is null)
  );
create unique index seasons_provider_unique
  on public.seasons (provider_name, provider_season_id);

alter table public.teams
  add column provider_name text,
  add column provider_team_id text,
  add column crest_url text,
  add constraint teams_provider_pair check (
    (provider_name is null) = (provider_team_id is null)
  );
create unique index teams_provider_unique
  on public.teams (provider_name, provider_team_id);

alter table public.matches
  add column matchday integer check (matchday is null or matchday > 0);

-- A regular unique index allows PostgREST upsert on these columns. PostgreSQL
-- permits multiple null pairs, so the historical World Cup rows remain valid.
drop index public.matches_provider_fixture_unique;
create unique index matches_provider_fixture_unique
  on public.matches (provider_name, provider_fixture_id);

-- Browsers may pick only a scheduled fixture before its kickoff. The trusted
-- importer changes match status; browser users still cannot change results.
drop policy picks_insert on public.picks;
create policy picks_insert on public.picks
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and group_id in (select private.my_group_ids())
    and exists (
      select 1 from public.matches as m
      where m.id = match_id and m.status = 'scheduled'
        and now() < m.kickoff_time
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
        and now() < m.kickoff_time
    )
  )
  with check (
    user_id = (select auth.uid())
    and group_id in (select private.my_group_ids())
    and exists (
      select 1 from public.matches as m
      where m.id = match_id and m.status = 'scheduled'
        and now() < m.kickoff_time
    )
  );

commit;
