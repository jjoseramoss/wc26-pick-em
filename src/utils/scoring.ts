/**
 * Derives the match winner from a scoreline.
 * Mirrors the DB trigger's scoring logic exactly.
 */
export function deriveWinner(homeScore: number, awayScore: number): 'home' | 'away' | 'draw' {
  if (homeScore > awayScore) return 'home'
  if (awayScore > homeScore) return 'away'
  return 'draw'
}

/**
 * Calculates points for a single pick against the actual result.
 *
 * Rules (same as score_picks() DB trigger):
 *   - Exact scoreline             → 3 pts
 *   - Correct result (win/draw)   → 1 pt
 *   - Wrong result                → 0 pts
 */
export function calculatePoints(
  homePred: number,
  awayPred: number,
  homeActual: number,
  awayActual: number,
): 0 | 1 | 3 {
  // Exact scoreline
  if (homePred === homeActual && awayPred === awayActual) return 3

  const predictedWinner = deriveWinner(homePred, awayPred)
  const actualWinner    = deriveWinner(homeActual, awayActual)

  // Correct result direction
  if (predictedWinner === actualWinner) return 1

  return 0
}
