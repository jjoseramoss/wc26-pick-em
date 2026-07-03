-- ============================================================
-- Fix: score_picks trigger now re-fires whenever winner OR
-- either score column changes — not just on first-time winner set.
-- Run this once in Supabase SQL Editor to patch the trigger.
-- ============================================================

CREATE OR REPLACE FUNCTION public.score_picks()
RETURNS trigger AS $$
BEGIN
  -- Fire when winner is set, OR when scores are corrected on an already-decided match
  IF (new.winner IS NOT NULL) AND (
    old.winner IS NULL
    OR old.winner <> new.winner
    OR old.home_score IS DISTINCT FROM new.home_score
    OR old.away_score IS DISTINCT FROM new.away_score
  ) THEN
    UPDATE public.picks p
    SET points = CASE
      WHEN p.home_score_pred = new.home_score
       AND p.away_score_pred = new.away_score THEN 3
      WHEN (
        (p.home_score_pred > p.away_score_pred AND new.winner = 'home') OR
        (p.home_score_pred < p.away_score_pred AND new.winner = 'away') OR
        (p.home_score_pred = p.away_score_pred AND new.winner = 'draw')
      ) THEN 1
      ELSE 0
    END
    WHERE p.match_id = new.id;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
