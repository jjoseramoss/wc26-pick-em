begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- Test identities and fixtures exist only inside this rolled-back transaction.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'friend@example.test');

insert into public.matches (id, team_home, team_away, kickoff_time, stage)
values ('33333333-3333-3333-3333-333333333333', 'Home', 'Away', now() + interval '1 day', 'group');

insert into public.groups (id, name, invite_code, created_by)
values ('44444444-4444-4444-4444-444444444444', 'Test Friends', 'ABC123', '11111111-1111-1111-1111-111111111111');
insert into public.group_members (group_id, user_id, display_name)
values ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Owner');

set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select throws_ok(
  $$update public.matches set home_score = 5 where id = '33333333-3333-3333-3333-333333333333'$$,
  '42501', null, 'an ordinary user cannot alter a result'
);
select throws_ok(
  $$insert into public.groups (name, invite_code, created_by) values ('Fake', 'FAKE12', '22222222-2222-2222-2222-222222222222')$$,
  '42501', null, 'a direct group insert is denied'
);
select throws_ok(
  $$insert into public.group_members (group_id, user_id, display_name) values ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Friend')$$,
  '42501', null, 'a direct membership insert is denied'
);
select is((select count(*) from public.groups), 0::bigint, 'a nonmember cannot browse invite codes');

do $$ begin perform public.join_pickem_group('ABC123', 'Friend'); end $$;
select is((select count(*) from public.groups), 1::bigint, 'joining by code makes the group visible');
do $$ begin perform public.create_pickem_group('Friend group', 'Friend'); end $$;
select is((select count(*) from public.groups), 2::bigint, 'a member can create a group through the RPC');
select is((select count(*) from public.group_members where user_id = '22222222-2222-2222-2222-222222222222'), 2::bigint, 'group creation also adds the creator as a member');
select throws_ok(
  $$select public.create_pickem_group('  ', 'Friend')$$,
  '22023', null, 'a blank group name is rejected before insertion'
);
select throws_ok(
  $$insert into public.picks (user_id, group_id, match_id, home_score_pred, away_score_pred)
    values ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 1, 1)$$,
  '42501', null, 'a member cannot submit a pick for someone else'
);

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select results_eq(
  $$insert into public.picks (user_id, group_id, match_id, home_score_pred, away_score_pred)
    values ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 1, 1)
    returning home_score_pred$$,
  array[1], 'a member can submit their own pick before kickoff'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is((select count(*) from public.picks), 0::bigint, 'another member cannot view a future pick');

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select is((select count(*) from public.picks), 1::bigint, 'the author can view their future pick');
select throws_ok(
  $$update public.picks set points = 3 where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'a user cannot award themselves points'
);
select results_eq(
  $$update public.picks set home_score_pred = 2 where user_id = '11111111-1111-1111-1111-111111111111' returning home_score_pred$$,
  array[2], 'the author can change a score before kickoff'
);
select throws_ok(
  $$delete from public.picks where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '42501', null, 'browser users cannot delete picks'
);

reset role;
update public.matches set kickoff_time = now() - interval '1 day'
where id = '33333333-3333-3333-3333-333333333333';
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select is((select count(*) from public.picks), 1::bigint, 'group picks become visible after kickoff');

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select is_empty(
  $$update public.picks set home_score_pred = 9 where user_id = '11111111-1111-1111-1111-111111111111' returning home_score_pred$$,
  'the kickoff rule blocks late edits'
);

reset role;
-- Drawn score, but Away advanced on penalties: the exact draw earns 3.
update public.picks set home_score_pred = 1
where user_id = '11111111-1111-1111-1111-111111111111';
update public.matches set home_score = 1, away_score = 1, winner = 'away'
where id = '33333333-3333-3333-3333-333333333333';
select is((select points from public.picks where match_id = '33333333-3333-3333-3333-333333333333'), 3, 'penalty winner does not change exact draw scoring');

update public.matches set home_score = 2, away_score = 2
where id = '33333333-3333-3333-3333-333333333333';
select is((select points from public.picks where match_id = '33333333-3333-3333-3333-333333333333'), 1, 'a score correction recalculates points');

update public.matches set home_score = null, away_score = null, winner = null
where id = '33333333-3333-3333-3333-333333333333';
select is((select points from public.picks where match_id = '33333333-3333-3333-3333-333333333333'), null::integer, 'clearing a result clears points');

select * from finish();
rollback;
