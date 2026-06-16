-- ============================================================
-- World Cup 2026 — Group Stage Fixtures Seed (CORRECTED)
-- All times in UTC. Run AFTER schema.sql.
-- Confirmed kickoff times from CBS Sports / official schedule.
-- ET → UTC: 12pm=16:00, 1pm=17:00, 3pm=19:00, 4pm=20:00,
--            6pm=22:00, 7pm=23:00, 9pm=01:00+1d, 10pm=02:00+1d,
--            12am=04:00
-- Results included for completed matches (Jun 11–13).
-- Jun 14 Group E/F results: leave null — enter via admin view.
-- ============================================================

insert into public.matches
  (team_home, team_away, kickoff_time, stage, group_label, home_score, away_score, winner)
values

-- ============================================================
-- GROUP A: Mexico, South Korea, Czechia, South Africa
-- ============================================================
-- R1 (Jun 11) — COMPLETED
('Mexico',        'South Africa', '2026-06-11T19:00:00Z', 'group', 'A',  2, 0, 'home'),
('South Korea',   'Czechia',      '2026-06-11T22:00:00Z', 'group', 'A',  2, 1, 'home'),
-- R2 (Jun 18)
('Czechia',       'South Africa', '2026-06-18T16:00:00Z', 'group', 'A',  null, null, null),
('Mexico',        'South Korea',  '2026-06-19T01:00:00Z', 'group', 'A',  null, null, null),
-- R3 (Jun 24) — simultaneous
('Czechia',       'Mexico',       '2026-06-25T01:00:00Z', 'group', 'A',  null, null, null),
('South Africa',  'South Korea',  '2026-06-25T01:00:00Z', 'group', 'A',  null, null, null),

-- ============================================================
-- GROUP B: Canada, Bosnia & Herzegovina, Qatar, Switzerland
-- ============================================================
-- R1 (Jun 12–13) — COMPLETED
('Canada',               'Bosnia & Herzegovina', '2026-06-12T19:00:00Z', 'group', 'B',  1, 1, 'draw'),
('Qatar',                'Switzerland',          '2026-06-13T01:00:00Z', 'group', 'B',  1, 1, 'draw'),
-- R2 (Jun 18)
('Switzerland',          'Bosnia & Herzegovina', '2026-06-18T19:00:00Z', 'group', 'B',  null, null, null),
('Canada',               'Qatar',                '2026-06-18T22:00:00Z', 'group', 'B',  null, null, null),
-- R3 (Jun 24) — simultaneous
('Switzerland',          'Canada',               '2026-06-24T19:00:00Z', 'group', 'B',  null, null, null),
('Bosnia & Herzegovina', 'Qatar',                '2026-06-24T19:00:00Z', 'group', 'B',  null, null, null),

-- ============================================================
-- GROUP C: Brazil, Morocco, Scotland, Haiti
-- ============================================================
-- R1 (Jun 13) — COMPLETED
('Brazil',    'Morocco',  '2026-06-13T22:00:00Z', 'group', 'C',  1, 1, 'draw'),
('Scotland',  'Haiti',    '2026-06-14T01:00:00Z', 'group', 'C',  1, 0, 'home'),
-- R2 (Jun 19)
('Scotland',  'Morocco',  '2026-06-19T22:00:00Z', 'group', 'C',  null, null, null),
('Brazil',    'Haiti',    '2026-06-20T01:00:00Z', 'group', 'C',  null, null, null),
-- R3 (Jun 24) — simultaneous
('Scotland',  'Brazil',   '2026-06-24T22:00:00Z', 'group', 'C',  null, null, null),
('Morocco',   'Haiti',    '2026-06-24T22:00:00Z', 'group', 'C',  null, null, null),

-- ============================================================
-- GROUP D: USA, Australia, Turkey, Paraguay
-- ============================================================
-- R1 (Jun 12–13) — COMPLETED
('USA',        'Paraguay', '2026-06-13T01:00:00Z', 'group', 'D',  4, 1, 'home'),
('Australia',  'Turkey',   '2026-06-14T04:00:00Z', 'group', 'D',  2, 0, 'home'),
-- R2 (Jun 19)
('USA',        'Australia','2026-06-19T19:00:00Z', 'group', 'D',  null, null, null),
('Turkey',     'Paraguay', '2026-06-20T04:00:00Z', 'group', 'D',  null, null, null),
-- R3 (Jun 25) — simultaneous
('Turkey',     'USA',      '2026-06-26T02:00:00Z', 'group', 'D',  null, null, null),
('Paraguay',   'Australia','2026-06-26T02:00:00Z', 'group', 'D',  null, null, null),

-- ============================================================
-- GROUP E: Germany, Ivory Coast, Ecuador, Curacao
-- ============================================================
-- R1 (Jun 14) — PLAYED, results TBD (enter via admin)
('Germany',      'Curacao',       '2026-06-14T17:00:00Z', 'group', 'E',  null, null, null),
('Ivory Coast',  'Ecuador',       '2026-06-14T23:00:00Z', 'group', 'E',  null, null, null),
-- R2 (Jun 20)
('Germany',      'Ivory Coast',   '2026-06-20T20:00:00Z', 'group', 'E',  null, null, null),
('Ecuador',      'Curacao',       '2026-06-21T00:00:00Z', 'group', 'E',  null, null, null),
-- R3 (Jun 25) — simultaneous
('Ecuador',      'Germany',       '2026-06-25T20:00:00Z', 'group', 'E',  null, null, null),
('Curacao',      'Ivory Coast',   '2026-06-25T20:00:00Z', 'group', 'E',  null, null, null),

-- ============================================================
-- GROUP F: Netherlands, Japan, Sweden, Tunisia
-- ============================================================
-- R1 (Jun 14–15) — PLAYED, results TBD (enter via admin)
('Netherlands',  'Japan',         '2026-06-14T20:00:00Z', 'group', 'F',  null, null, null),
('Sweden',       'Tunisia',       '2026-06-15T02:00:00Z', 'group', 'F',  null, null, null),
-- R2 (Jun 20)
('Netherlands',  'Sweden',        '2026-06-20T17:00:00Z', 'group', 'F',  null, null, null),
('Tunisia',      'Japan',         '2026-06-21T04:00:00Z', 'group', 'F',  null, null, null),
-- R3 (Jun 25) — simultaneous
('Japan',        'Sweden',        '2026-06-25T23:00:00Z', 'group', 'F',  null, null, null),
('Tunisia',      'Netherlands',   '2026-06-25T23:00:00Z', 'group', 'F',  null, null, null),

-- ============================================================
-- GROUP G: Belgium, Egypt, Iran, New Zealand
-- ============================================================
-- R1 (Jun 15–16) — TODAY / TONIGHT (no picks allowed)
('Belgium',      'Egypt',         '2026-06-15T19:00:00Z', 'group', 'G',  null, null, null),
('Iran',         'New Zealand',   '2026-06-16T01:00:00Z', 'group', 'G',  null, null, null),
-- R2 (Jun 21)
('Belgium',      'Iran',          '2026-06-21T19:00:00Z', 'group', 'G',  null, null, null),
('New Zealand',  'Egypt',         '2026-06-22T01:00:00Z', 'group', 'G',  null, null, null),
-- R3 (Jun 26–27) — simultaneous
('Egypt',        'Iran',          '2026-06-27T03:00:00Z', 'group', 'G',  null, null, null),
('New Zealand',  'Belgium',       '2026-06-27T03:00:00Z', 'group', 'G',  null, null, null),

-- ============================================================
-- GROUP H: Spain, Uruguay, Saudi Arabia, Cape Verde
-- ============================================================
-- R1 (Jun 15) — TODAY (no picks allowed)
('Spain',         'Cape Verde',   '2026-06-15T16:00:00Z', 'group', 'H',  null, null, null),
('Saudi Arabia',  'Uruguay',      '2026-06-15T22:00:00Z', 'group', 'H',  null, null, null),
-- R2 (Jun 21)
('Spain',         'Saudi Arabia', '2026-06-21T16:00:00Z', 'group', 'H',  null, null, null),
('Uruguay',       'Cape Verde',   '2026-06-21T22:00:00Z', 'group', 'H',  null, null, null),
-- R3 (Jun 26–27) — simultaneous
('Cape Verde',    'Saudi Arabia', '2026-06-27T00:00:00Z', 'group', 'H',  null, null, null),
('Uruguay',       'Spain',        '2026-06-27T00:00:00Z', 'group', 'H',  null, null, null),

-- ============================================================
-- GROUP I: France, Senegal, Norway, Iraq
-- ============================================================
-- R1 (Jun 16) — TOMORROW
('France',   'Senegal',  '2026-06-16T19:00:00Z', 'group', 'I',  null, null, null),
('Iraq',     'Norway',   '2026-06-16T22:00:00Z', 'group', 'I',  null, null, null),
-- R2 (Jun 22)
('France',   'Iraq',     '2026-06-22T21:00:00Z', 'group', 'I',  null, null, null),
('Norway',   'Senegal',  '2026-06-23T00:00:00Z', 'group', 'I',  null, null, null),
-- R3 (Jun 26) — simultaneous
('Norway',   'France',   '2026-06-26T19:00:00Z', 'group', 'I',  null, null, null),
('Senegal',  'Iraq',     '2026-06-26T19:00:00Z', 'group', 'I',  null, null, null),

-- ============================================================
-- GROUP J: Argentina, Algeria, Austria, Jordan
-- ============================================================
-- R1 (Jun 16–17) — TOMORROW
('Argentina', 'Algeria', '2026-06-17T01:00:00Z', 'group', 'J',  null, null, null),
('Austria',   'Jordan',  '2026-06-17T04:00:00Z', 'group', 'J',  null, null, null),
-- R2 (Jun 22–23)
('Argentina', 'Austria', '2026-06-22T17:00:00Z', 'group', 'J',  null, null, null),
('Jordan',    'Algeria', '2026-06-23T03:00:00Z', 'group', 'J',  null, null, null),
-- R3 (Jun 27–28) — simultaneous
('Algeria',   'Austria', '2026-06-28T02:00:00Z', 'group', 'J',  null, null, null),
('Jordan',    'Argentina','2026-06-28T02:00:00Z', 'group', 'J',  null, null, null),

-- ============================================================
-- GROUP K: Portugal, DR Congo, Colombia, Uzbekistan
-- ============================================================
-- R1 (Jun 17–18)
('Portugal',    'DR Congo',   '2026-06-17T17:00:00Z', 'group', 'K',  null, null, null),
('Uzbekistan',  'Colombia',   '2026-06-18T02:00:00Z', 'group', 'K',  null, null, null),
-- R2 (Jun 23–24)
('Portugal',    'Uzbekistan', '2026-06-23T17:00:00Z', 'group', 'K',  null, null, null),
('Colombia',    'DR Congo',   '2026-06-24T02:00:00Z', 'group', 'K',  null, null, null),
-- R3 (Jun 27–28) — simultaneous
('Colombia',    'Portugal',   '2026-06-27T23:30:00Z', 'group', 'K',  null, null, null),
('DR Congo',    'Uzbekistan', '2026-06-27T23:30:00Z', 'group', 'K',  null, null, null),

-- ============================================================
-- GROUP L: England, Croatia, Ghana, Panama
-- ============================================================
-- R1 (Jun 17)
('England',  'Croatia', '2026-06-17T20:00:00Z', 'group', 'L',  null, null, null),  -- confirmed (21:00 BST)
('Ghana',    'Panama',  '2026-06-17T23:00:00Z', 'group', 'L',  null, null, null),
-- R2 (Jun 23)
('England',  'Ghana',   '2026-06-23T20:00:00Z', 'group', 'L',  null, null, null),
('Panama',   'Croatia', '2026-06-23T23:00:00Z', 'group', 'L',  null, null, null),
-- R3 (Jun 27) — simultaneous
('Panama',   'England', '2026-06-27T21:00:00Z', 'group', 'L',  null, null, null),  -- confirmed (22:00 BST)
('Croatia',  'Ghana',   '2026-06-27T21:00:00Z', 'group', 'L',  null, null, null);
