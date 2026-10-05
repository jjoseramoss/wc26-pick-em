-- Step 2, first proposed database change.
-- Prepared from a read-only inspection of the hosted project on 2026-10-05.
-- Review with the project owner before applying to Supabase.
--
-- Regular browsers still need to read matches. The external iframe has been
-- removed, so no browser role needs app_settings.
-- Result updates and settings changes must come from a trusted server-side
-- process or the Supabase SQL Editor, not a signed-in browser.

begin;

-- The current policies allow every authenticated account to insert or update
-- matches. Dropping them closes that path; removing all broad table grants
-- also closes TRUNCATE and other operations that RLS does not filter.
drop policy if exists matches_insert on public.matches;
drop policy if exists matches_update on public.matches;
revoke all on table public.matches from anon, authenticated;
grant select on table public.matches to anon, authenticated;

-- The existing app_settings table has no RLS, so browser roles currently have
-- full table access. No browser role needs to read or write settings now.
alter table public.app_settings enable row level security;
drop policy if exists app_settings_read_bracket_embed_url on public.app_settings;
revoke all on table public.app_settings from anon, authenticated;

commit;
