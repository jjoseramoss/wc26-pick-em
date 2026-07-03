-- ============================================================
-- World Cup 2026 — Knockout Stage Data Setup
-- Run each step IN ORDER in Supabase SQL Editor.
-- ============================================================


-- ============================================================
-- STEP 1: Add match_number column
-- This is required for the bracket view to know which slot
-- each match occupies (FIFA official match numbers 73–104).
-- ============================================================

ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS match_number INT;


-- ============================================================
-- STEP 2: Stamp match numbers + confirmed R32 results
-- Safe to re-run — idempotent, won't break existing picks.
--
-- Note on penalties:
--   Germany vs Paraguay: 1-1 a.e.t. (Paraguay win 4-3 pens)
--   Netherlands vs Morocco: 1-1 a.e.t. (Morocco win 3-2 pens)
--   Scores stored as 90+ET score; winner field records who advanced.
-- ============================================================

-- Match 73: South Africa 0-1 Canada
UPDATE public.matches SET match_number = 73, home_score = 0, away_score = 1, winner = 'away'
WHERE team_home = 'South Africa' AND team_away = 'Canada' AND stage = 'R32';

-- Match 74: Germany 1-1 Paraguay (Paraguay win 4-3 pens)
UPDATE public.matches SET match_number = 74, home_score = 1, away_score = 1, winner = 'away'
WHERE team_home = 'Germany' AND team_away = 'Paraguay' AND stage = 'R32';

-- Match 75: Netherlands 1-1 Morocco (Morocco win 3-2 pens)
UPDATE public.matches SET match_number = 75, home_score = 1, away_score = 1, winner = 'away'
WHERE team_home = 'Netherlands' AND team_away = 'Morocco' AND stage = 'R32';

-- Match 76: Brazil 2-1 Japan
UPDATE public.matches SET match_number = 76, home_score = 2, away_score = 1, winner = 'home'
WHERE team_home = 'Brazil' AND team_away = 'Japan' AND stage = 'R32';

-- Match 77: France 3-0 Sweden
UPDATE public.matches SET match_number = 77, home_score = 3, away_score = 0, winner = 'home'
WHERE team_home = 'France' AND team_away = 'Sweden' AND stage = 'R32';

-- Match 78: Ivory Coast 1-2 Norway
UPDATE public.matches SET match_number = 78, home_score = 1, away_score = 2, winner = 'away'
WHERE team_home = 'Ivory Coast' AND team_away = 'Norway' AND stage = 'R32';

-- Match 79: Mexico 2-0 Ecuador
UPDATE public.matches SET match_number = 79, home_score = 2, away_score = 0, winner = 'home'
WHERE team_home = 'Mexico' AND team_away = 'Ecuador' AND stage = 'R32';

-- Match 80: England 2-1 DR Congo
UPDATE public.matches SET match_number = 80, home_score = 2, away_score = 1, winner = 'home'
WHERE team_home = 'England' AND team_away = 'DR Congo' AND stage = 'R32';

-- Match 81: USA 2-0 Bosnia & Herzegovina
UPDATE public.matches SET match_number = 81, home_score = 2, away_score = 0, winner = 'home'
WHERE team_home = 'USA' AND team_away = 'Bosnia & Herzegovina' AND stage = 'R32';

-- Match 82: Belgium 3-2 Senegal (a.e.t.)
UPDATE public.matches SET match_number = 82, home_score = 3, away_score = 2, winner = 'home'
WHERE team_home = 'Belgium' AND team_away = 'Senegal' AND stage = 'R32';

-- Match 83: Portugal 2-1 Croatia
UPDATE public.matches SET match_number = 83, home_score = 2, away_score = 1, winner = 'home'
WHERE team_home = 'Portugal' AND team_away = 'Croatia' AND stage = 'R32';

-- Match 84: Spain 3-0 Austria
UPDATE public.matches SET match_number = 84, home_score = 3, away_score = 0, winner = 'home'
WHERE team_home = 'Spain' AND team_away = 'Austria' AND stage = 'R32';

-- Match 85: Switzerland 2-0 Algeria
UPDATE public.matches SET match_number = 85, home_score = 2, away_score = 0, winner = 'home'
WHERE team_home = 'Switzerland' AND team_away = 'Algeria' AND stage = 'R32';

-- Match 86: Argentina vs Cape Verde — result TBD (Jul 3)
UPDATE public.matches SET match_number = 86
WHERE team_home = 'Argentina' AND team_away = 'Cape Verde' AND stage = 'R32';

-- Match 87: Colombia vs Ghana — result TBD (Jul 3)
UPDATE public.matches SET match_number = 87
WHERE team_home = 'Colombia' AND team_away = 'Ghana' AND stage = 'R32';

-- Match 88: Australia vs Egypt — result TBD (Jul 3)
UPDATE public.matches SET match_number = 88
WHERE team_home = 'Australia' AND team_away = 'Egypt' AND stage = 'R32';


-- ============================================================
-- STEP 3: Insert confirmed R16 matches (6 of 8 known)
-- Matches 95 & 96 teams still TBD — insert after Jul 3 results.
-- All times UTC (EDT +4h).
-- Edinburgh BST (+1h) preview:
--   Match 90: Sat Jul 4 18:00 BST
--   Match 89: Sat Jul 4 22:00 BST
--   Match 91: Sun Jul 5 21:00 BST
--   Match 92: Mon Jul 6 01:00 BST
--   Match 93: Mon Jul 6 20:00 BST
--   Match 94: Tue Jul 7 01:00 BST
-- ============================================================

INSERT INTO public.matches
  (team_home, team_away, kickoff_time, stage, group_label, home_score, away_score, winner, match_number)
VALUES
  -- Saturday July 4
  ('Canada',   'Morocco',  '2026-07-04T17:00:00Z', 'R16', null, null, null, null, 90),
  ('Paraguay', 'France',   '2026-07-04T21:00:00Z', 'R16', null, null, null, null, 89),

  -- Sunday July 5
  ('Brazil',   'Norway',   '2026-07-05T20:00:00Z', 'R16', null, null, null, null, 91),
  ('Mexico',   'England',  '2026-07-06T00:00:00Z', 'R16', null, null, null, null, 92),

  -- Monday July 6
  ('Portugal', 'Spain',    '2026-07-06T19:00:00Z', 'R16', null, null, null, null, 93),
  ('USA',      'Belgium',  '2026-07-07T00:00:00Z', 'R16', null, null, null, null, 94);


-- ============================================================
-- STEP 4: Run AFTER Jul 3 R32 results are confirmed.
-- Replace TBD with actual team names based on who won:
--   Match 86 winner → home team for Match 95
--   Match 88 winner → away team for Match 95
--   Match 87 winner → away team for Match 96
-- ============================================================

-- Match 95: Winner 86 vs Winner 88 — Tue Jul 7, 12pm ET (16:00 UTC)
-- INSERT INTO public.matches
--   (team_home, team_away, kickoff_time, stage, group_label, home_score, away_score, winner, match_number)
-- VALUES
--   ('TBD_M86', 'TBD_M88', '2026-07-07T16:00:00Z', 'R16', null, null, null, null, 95);

-- Match 96: Switzerland vs Winner 87 — Tue Jul 7, 4pm ET (20:00 UTC)
-- INSERT INTO public.matches
--   (team_home, team_away, kickoff_time, stage, group_label, home_score, away_score, winner, match_number)
-- VALUES
--   ('Switzerland', 'TBD_M87', '2026-07-07T20:00:00Z', 'R16', null, null, null, null, 96);
