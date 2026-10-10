-- Local development data only. This file is NOT a migration and is not
-- included in supabase/config.toml's automatic seed configuration.
-- Run with scripts/load-local-demo.sh against the local Docker database.
begin;

insert into public.competitions (id, slug, name, kind)
values ('d0000000-0000-4000-8000-000000000001',
        'local-demo-league', 'Local Demo League', 'club')
on conflict (id) do nothing;

insert into public.seasons (id, competition_id, label, starts_on, ends_on)
values ('d0000000-0000-4000-8000-000000000002',
        'd0000000-0000-4000-8000-000000000001',
        'Practice 2026/27', '2026-10-01', '2027-06-30')
on conflict (id) do nothing;

insert into public.season_phases
  (id, season_id, code, name, format, sort_order)
values ('d0000000-0000-4000-8000-000000000003',
        'd0000000-0000-4000-8000-000000000002',
        'regular', 'Regular season', 'league', 1)
on conflict (id) do nothing;

insert into public.teams (id, name, kind) values
  ('d0000000-0000-4000-8000-000000000004', 'Northside FC', 'club'),
  ('d0000000-0000-4000-8000-000000000005', 'Southside FC', 'club')
on conflict (id) do nothing;

insert into public.season_teams (season_id, team_id) values
  ('d0000000-0000-4000-8000-000000000002',
   'd0000000-0000-4000-8000-000000000004'),
  ('d0000000-0000-4000-8000-000000000002',
   'd0000000-0000-4000-8000-000000000005')
on conflict (season_id, team_id) do nothing;

-- Seven days ahead makes this fixture pickable whenever the demo is loaded.
-- Re-running the seed refreshes only this local fixture's kickoff.
insert into public.matches
  (id, season_id, phase_id, home_team_id, away_team_id,
   team_home, team_away, kickoff_time, status)
values
  ('d0000000-0000-4000-8000-000000000006',
   'd0000000-0000-4000-8000-000000000002',
   'd0000000-0000-4000-8000-000000000003',
   'd0000000-0000-4000-8000-000000000004',
   'd0000000-0000-4000-8000-000000000005',
   'Northside FC', 'Southside FC', now() + interval '7 days', 'scheduled')
on conflict (id) do update
  set kickoff_time = excluded.kickoff_time;

commit;
