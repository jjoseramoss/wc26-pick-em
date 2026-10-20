export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string;
  lastUpdated: string;
  homeTeam: { id: number; name: string; crest: string | null };
  awayTeam: { id: number; name: string; crest: string | null };
  score: { fullTime: { home: number | null; away: number | null } };
  season: { id: number; startDate: string; endDate: string };
};

export type MatchStatus =
  | "scheduled"
  | "live"
  | "postponed"
  | "cancelled"
  | "final";

export function normalizeMatch(match: FootballDataMatch) {
  if (
    !Number.isInteger(match.id) || !Number.isInteger(match.homeTeam?.id) ||
    !Number.isInteger(match.awayTeam?.id) || !match.utcDate ||
    Number.isNaN(Date.parse(match.utcDate)) ||
    !match.lastUpdated || Number.isNaN(Date.parse(match.lastUpdated)) ||
    !match.homeTeam.name || !match.awayTeam.name ||
    match.stage !== "REGULAR_SEASON"
  ) {
    throw new Error(`Fixture ${match.id} is missing league fields`);
  }

  const statuses: Record<string, MatchStatus> = {
    SCHEDULED: "scheduled",
    TIMED: "scheduled",
    IN_PLAY: "live",
    PAUSED: "live",
    EXTRA_TIME: "live",
    PENALTY_SHOOTOUT: "live",
    SUSPENDED: "postponed",
    POSTPONED: "postponed",
    CANCELLED: "cancelled",
    // An awarded game was not played. Keep it as history without grading picks.
    AWARDED: "cancelled",
    FINISHED: "final",
  };
  const status = statuses[match.status];
  if (!status) throw new Error(`Unknown status ${match.status} for ${match.id}`);

  const home = match.score?.fullTime?.home;
  const away = match.score?.fullTime?.away;
  if (
    status === "final" &&
    (!Number.isInteger(home) || !Number.isInteger(away) || home! < 0 || away! < 0)
  ) {
    throw new Error(`Finished fixture ${match.id} has no valid final score`);
  }

  return {
    provider_name: "football-data.org",
    provider_fixture_id: String(match.id),
    provider_updated_at: match.lastUpdated,
    team_home: match.homeTeam.name,
    team_away: match.awayTeam.name,
    kickoff_time: match.utcDate,
    matchday: match.matchday,
    status,
    home_score: status === "final" ? home : null,
    away_score: status === "final" ? away : null,
    winner: status === "final"
      ? home! > away! ? "home" : home! < away! ? "away" : "draw"
      : null,
  };
}
