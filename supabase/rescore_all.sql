-- ============================================================
-- Re-score all picks for every completed match.
-- Run this in Supabase SQL Editor any time you correct a result.
-- Safe to run multiple times — it always overwrites from scratch.
-- ============================================================

UPDATE public.picks p
SET points = CASE
  WHEN p.home_score_pred = m.home_score
   AND p.away_score_pred = m.away_score THEN 3
  WHEN (
    (p.home_score_pred > p.away_score_pred AND m.winner = 'home') OR
    (p.home_score_pred < p.away_score_pred AND m.winner = 'away') OR
    (p.home_score_pred = p.away_score_pred AND m.winner = 'draw')
  ) THEN 1
  ELSE 0
END
FROM public.matches m
WHERE p.match_id = m.id
  AND m.winner IS NOT NULL;
