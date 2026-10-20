begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

insert into public.matches (id, team_home, team_away, kickoff_time)
values
  ('70000000-0000-4000-8000-000000000001', 'Past home', 'Past away', now() - interval '1 day'),
  ('70000000-0000-4000-8000-000000000002', 'Future home', 'Future away', now() + interval '1 day');

update public.matches set kickoff_time = now() + interval '2 days'
where id in (
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000002'
);

select ok(
  (select pick_deadline_at < now() from public.matches
   where id = '70000000-0000-4000-8000-000000000001'),
  'moving a past fixture to the future does not reopen picks'
);
select ok(
  (select pick_deadline_at = kickoff_time from public.matches
   where id = '70000000-0000-4000-8000-000000000002'),
  'a pre-kickoff schedule change moves the pick deadline'
);

select * from finish();
rollback;
