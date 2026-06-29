-- ============================================================
-- World Cup 2026 — Round of 32 Fixtures
-- All times in UTC. Run in Supabase SQL Editor.
-- EDT → UTC: add 4 hours (EDT = UTC-4)
-- Edinburgh (BST = UTC+1): app auto-converts via browser timezone
-- ============================================================

insert into public.matches
  (team_home, team_away, kickoff_time, stage, group_label, home_score, away_score, winner)
values

-- Sunday, June 28
('South Africa',          'Canada',               '2026-06-28T19:00:00Z', 'R32', null, null, null, null),

-- Monday, June 29
('Brazil',                'Japan',                '2026-06-29T17:00:00Z', 'R32', null, null, null, null),
('Germany',               'Paraguay',             '2026-06-29T20:30:00Z', 'R32', null, null, null, null),
('Netherlands',           'Morocco',              '2026-06-30T01:00:00Z', 'R32', null, null, null, null),

-- Tuesday, June 30
('Ivory Coast',           'Norway',               '2026-06-30T17:00:00Z', 'R32', null, null, null, null),
('France',                'Sweden',               '2026-06-30T21:00:00Z', 'R32', null, null, null, null),
('Mexico',                'Ecuador',              '2026-07-01T01:00:00Z', 'R32', null, null, null, null),

-- Wednesday, July 1
('England',               'DR Congo',             '2026-07-01T16:00:00Z', 'R32', null, null, null, null),
('Belgium',               'Senegal',              '2026-07-01T20:00:00Z', 'R32', null, null, null, null),
('USA',                   'Bosnia & Herzegovina', '2026-07-02T00:00:00Z', 'R32', null, null, null, null),

-- Thursday, July 2
('Spain',                 'Austria',              '2026-07-02T19:00:00Z', 'R32', null, null, null, null),
('Portugal',              'Croatia',              '2026-07-02T23:00:00Z', 'R32', null, null, null, null),
('Switzerland',           'Algeria',              '2026-07-03T03:00:00Z', 'R32', null, null, null, null),

-- Friday, July 3
('Australia',             'Egypt',                '2026-07-03T18:00:00Z', 'R32', null, null, null, null),
('Argentina',             'Cape Verde',           '2026-07-03T22:00:00Z', 'R32', null, null, null, null),
('Colombia',              'Ghana',                '2026-07-04T01:30:00Z', 'R32', null, null, null, null);
