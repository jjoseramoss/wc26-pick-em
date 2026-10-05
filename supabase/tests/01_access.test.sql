begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

select ok((select relrowsecurity from pg_class where oid = 'public.app_settings'::regclass), 'settings use RLS');
select ok(not has_table_privilege('anon', 'public.app_settings', 'UPDATE'), 'anonymous visitors cannot edit settings');
select ok(not has_table_privilege('authenticated', 'public.app_settings', 'SELECT'), 'signed-in users cannot read unused settings');
select ok(not has_table_privilege('authenticated', 'public.matches', 'UPDATE'), 'signed-in users cannot edit results');
select ok(has_table_privilege('anon', 'public.matches', 'SELECT'), 'visitors can read fixtures');
select ok(not has_table_privilege('authenticated', 'public.picks', 'DELETE'), 'signed-in users cannot delete picks');
select ok(not has_column_privilege('authenticated', 'public.picks', 'points', 'UPDATE'), 'points are server-owned');
select ok(has_column_privilege('authenticated', 'public.picks', 'home_score_pred', 'UPDATE'), 'users can edit predicted scores');
select ok(not has_column_privilege('authenticated', 'public.picks', 'group_id', 'UPDATE'), 'pick group cannot change');
select ok(not has_table_privilege('authenticated', 'public.groups', 'INSERT'), 'groups cannot be created with a direct insert');
select ok(has_function_privilege('authenticated', 'public.join_pickem_group(text,text)', 'EXECUTE'), 'signed-in users can use the join RPC');

select * from finish();
rollback;
