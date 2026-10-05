import { supabase } from './supabase'

export interface Pick {
  id: string
  match_id: string
  home_score_pred: number
  away_score_pred: number
  points: number | null
}

export async function savePick(
  userId: string,
  groupId: string,
  matchId: string,
  homeScore: number,
  awayScore: number,
  existingPickId?: string,
): Promise<Pick> {
  // Existing picks update only score columns. The database also enforces this
  // with column privileges, so a caller cannot submit their own points.
  const query = existingPickId
    ? supabase
        .from('picks')
        .update({ home_score_pred: homeScore, away_score_pred: awayScore })
        .eq('id', existingPickId)
    : supabase
        .from('picks')
        .insert({
          user_id: userId,
          group_id: groupId,
          match_id: matchId,
          home_score_pred: homeScore,
          away_score_pred: awayScore,
        })

  const { data, error } = await query.select().single()
  if (error) throw error
  return data as Pick
}
