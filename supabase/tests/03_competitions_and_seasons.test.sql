begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

select is((select name from public.competitions where slug = 'fifa-world-cup'),
  'FIFA World Cup', 'the historical competition exists');
select is((select label from public.seasons where id = '26000000-0000-4000-8000-000000000026'),
  '2026', 'the historical season exists');
select is((select count(*) from public.season_phases where season_id = '26000000-0000-4000-8000-000000000026'),
  7::bigint, 'World Cup phases cover every legacy stage');

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111113', 'season-owner@example.test');

insert into public.competitions (id, slug, name, kind) values
  ('50000000-0000-4000-8000-000000000001', 'test-league', 'Test League', 'club');
insert into public.seasons (id, competition_id, label) values
  ('50000000-0000-4000-8000-000000000002',
   '50000000-0000-4000-8000-000000000001', '2026/27');
insert into public.season_phases (id, season_id, code, name, format, sort_order) values
  ('50000000-0000-4000-8000-000000000003',
   '50000000-0000-4000-8000-000000000002', 'regular', 'Regular season', 'league', 1);
insert into public.teams (id, name, kind) values
  ('50000000-0000-4000-8000-000000000004', 'Test Home', 'club'),
  ('50000000-0000-4000-8000-000000000005', 'Test Away', 'club');
insert into public.season_teams (season_id, team_id) values
  ('50000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000004'),
  ('50000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000005');

insert into public.matches
  (id, season_id, phase_id, home_team_id, away_team_id,
   team_home, team_away, kickoff_time, provider_name, provider_fixture_id)
values
  ('50000000-0000-4000-8000-000000000006',
   '50000000-0000-4000-8000-000000000002',
   '50000000-0000-4000-8000-000000000003',
   '50000000-0000-4000-8000-000000000004',
   '50000000-0000-4000-8000-000000000005',
   'Test Home', 'Test Away', now() + interval '1 day', 'test-provider', 'fixture-1');

select is((select stage from public.matches where id = '50000000-0000-4000-8000-000000000006'),
  null::text, 'a league fixture needs no legacy World Cup stage');
select is((select format from public.season_phases where id = '50000000-0000-4000-8000-000000000003'),
  'league', 'the fixture can use a league phase');
select throws_ok(
  $$insert into public.matches (season_id, phase_id, team_home, team_away, kickoff_time)
    values ('26000000-0000-4000-8000-000000000026',
      '50000000-0000-4000-8000-000000000003', 'A', 'B', now())$$,
  '23503', null, 'a phase cannot belong to another season');
select throws_ok(
  $$insert into public.matches (season_id, home_team_id, team_home, team_away, kickoff_time)
    values ('26000000-0000-4000-8000-000000000026',
      '50000000-0000-4000-8000-000000000004', 'A', 'B', now())$$,
  '23503', null, 'a fixture team must participate in its season');
select throws_ok(
  $$insert into public.matches (season_id, team_home, team_away, kickoff_time,
      provider_name, provider_fixture_id)
    values ('50000000-0000-4000-8000-000000000002', 'A', 'B', now(),
      'test-provider', 'fixture-1')$$,
  '23505', null, 'a provider fixture cannot be imported twice');

insert into public.groups (id, name, invite_code, created_by) values
  ('50000000-0000-4000-8000-000000000007', 'Historic group', 'HIST01',
   '11111111-1111-4111-8111-111111111113');
select is((select season_id from public.groups where id = '50000000-0000-4000-8000-000000000007'),
  '26000000-0000-4000-8000-000000000026'::uuid,
  'old group creation defaults to the historical season during transition');

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111113';
select is((select season_id from public.create_pickem_group(
    'New season group', 'Owner', '50000000-0000-4000-8000-000000000002')),
  '50000000-0000-4000-8000-000000000002'::uuid,
  'the new RPC creates a group for the chosen season');
select throws_ok(
  $$select public.create_pickem_group('Bad group', 'Owner',
      '99999999-9999-4999-8999-999999999999')$$,
  '22023', null, 'the new RPC rejects an unknown season');
reset role;

insert into public.group_members (group_id, user_id, display_name) values
  ('50000000-0000-4000-8000-000000000007',
   '11111111-1111-4111-8111-111111111113', 'Owner');
select throws_ok(
  $$insert into public.picks (user_id, group_id, match_id, home_score_pred, away_score_pred)
    values ('11111111-1111-4111-8111-111111111113',
      '50000000-0000-4000-8000-000000000007',
      '50000000-0000-4000-8000-000000000006', 1, 0)$$,
  '23514', null, 'a World Cup group cannot pick a league fixture');

insert into public.picks (user_id, group_id, match_id, home_score_pred, away_score_pred)
select '11111111-1111-4111-8111-111111111113', g.id,
  '50000000-0000-4000-8000-000000000006', 1, 0
from public.groups as g where g.name = 'New season group';
select is((select count(*) from public.picks where match_id = '50000000-0000-4000-8000-000000000006'),
  1::bigint, 'a group can pick a fixture in its own season');
select throws_ok(
  $$update public.groups set season_id = '26000000-0000-4000-8000-000000000026'
    where name = 'New season group'$$,
  '23514', null, 'a group with picks cannot switch seasons');
select throws_ok(
  $$update public.matches set season_id = '26000000-0000-4000-8000-000000000026'
    where id = '50000000-0000-4000-8000-000000000006'$$,
  '23514', null, 'a fixture with picks cannot switch seasons');

select * from finish();
rollback;
