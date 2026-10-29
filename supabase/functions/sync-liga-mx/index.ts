import { withSupabase } from "npm:@supabase/server@1";
import {
  APERTURA_FIXTURE_COUNT,
  APERTURA_YEAR,
  ESPN_LIGA_MX_PROVIDER,
  isAperturaEvent,
  normalizeEspnEvent,
  type EspnEvent,
} from "../_shared/espnLigaMx.ts";

const feedUrl =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/mex.1/scoreboard?dates=2026&limit=500";
const seasonLabel = "Apertura 2026 (regular season)";

type EspnResponse = { events?: EspnEvent[] };

function chunks<T>(rows: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < rows.length; i += size) batches.push(rows.slice(i, i + size));
  return batches;
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Use POST" }, { status: 405 });
    }

    const response = await fetch(feedUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; SoccerPickem/1.0)",
      },
    });
    if (!response.ok) {
      console.error(`ESPN Liga MX: ${response.status}`);
      return Response.json({ error: "Liga MX data request failed" }, { status: 502 });
    }
    const source = await response.json() as EspnResponse;
    if (!Array.isArray(source.events) || source.events.length >= 500) {
      return Response.json({ error: "Incomplete Liga MX feed" }, { status: 502 });
    }
    const events = source.events.filter(isAperturaEvent);
    if (
      events.length !== APERTURA_FIXTURE_COUNT ||
      new Set(events.map((event) => event.id)).size !== events.length
    ) {
      return Response.json({ error: "Unexpected Liga MX fixture count" }, { status: 502 });
    }

    // Reject incomplete or unfamiliar events before writing any database rows.
    const normalized = events.map(normalizeEspnEvent);
    const teamMap = new Map<string, { name: string; logo: string | null }>();
    for (const match of normalized) {
      teamMap.set(match.homeId, { name: match.homeName, logo: match.homeLogo });
      teamMap.set(match.awayId, { name: match.awayName, logo: match.awayLogo });
    }
    if (teamMap.size !== 18) {
      return Response.json({ error: "Unexpected Liga MX team count" }, { status: 502 });
    }

    const dates = events.map((event) => event.date.slice(0, 10)).sort();
    const db = ctx.supabaseAdmin;
    const { data: competition, error: competitionError } = await db
      .from("competitions")
      .upsert({
        slug: "liga-mx",
        name: "Liga MX",
        kind: "club",
        provider_name: ESPN_LIGA_MX_PROVIDER,
        provider_competition_id: "mex.1",
      }, { onConflict: "slug" })
      .select("id")
      .single();
    if (competitionError) throw competitionError;

    const { data: season, error: seasonError } = await db
      .from("seasons")
      .upsert({
        competition_id: competition.id,
        label: seasonLabel,
        starts_on: dates[0],
        ends_on: dates[dates.length - 1],
        provider_name: ESPN_LIGA_MX_PROVIDER,
        provider_season_id: `${APERTURA_YEAR}-apertura-regular`,
      }, { onConflict: "competition_id,label" })
      .select("id")
      .single();
    if (seasonError) throw seasonError;

    const { data: phase, error: phaseError } = await db
      .from("season_phases")
      .upsert({
        season_id: season.id,
        code: "regular",
        name: "Regular season",
        format: "league",
        sort_order: 1,
      }, { onConflict: "season_id,code" })
      .select("id")
      .single();
    if (phaseError) throw phaseError;

    const teamRows = [...teamMap].map(([id, team]) => ({
      name: team.name,
      kind: "club",
      provider_name: ESPN_LIGA_MX_PROVIDER,
      provider_team_id: id,
      crest_url: team.logo,
    }));
    const { data: savedTeams, error: teamError } = await db
      .from("teams")
      .upsert(teamRows, { onConflict: "provider_name,provider_team_id" })
      .select("id,provider_team_id");
    if (teamError) throw teamError;
    const teamIds = new Map(
      (savedTeams ?? []).map((team) => [team.provider_team_id, team.id]),
    );
    if (teamIds.size !== teamMap.size) throw new Error("Not all Liga MX teams were saved");

    const { error: membershipError } = await db
      .from("season_teams")
      .upsert(
        [...teamIds.values()].map((teamId) => ({ season_id: season.id, team_id: teamId })),
        { onConflict: "season_id,team_id" },
      );
    if (membershipError) throw membershipError;

    const fixtureRows = normalized.map((match) => ({
      ...match.fixture,
      season_id: season.id,
      phase_id: phase.id,
      home_team_id: teamIds.get(match.homeId),
      away_team_id: teamIds.get(match.awayId),
    }));
    if (fixtureRows.some((row) => !row.home_team_id || !row.away_team_id)) {
      throw new Error("Liga MX fixture team is missing");
    }

    const { data: existingRows, error: existingError } = await db
      .from("matches")
      .select("provider_fixture_id,team_home,team_away,kickoff_time,status,home_score,away_score,winner,home_team_id,away_team_id,phase_id")
      .eq("season_id", season.id)
      .eq("provider_name", ESPN_LIGA_MX_PROVIDER);
    if (existingError) throw existingError;
    const existing = new Map(
      (existingRows ?? []).map((row) => [row.provider_fixture_id, row]),
    );
    const changed = fixtureRows.filter((row) => {
      const old = existing.get(row.provider_fixture_id);
      return !old || old.team_home !== row.team_home || old.team_away !== row.team_away ||
        Date.parse(old.kickoff_time) !== Date.parse(row.kickoff_time) ||
        old.status !== row.status || old.home_score !== row.home_score ||
        old.away_score !== row.away_score || old.winner !== row.winner ||
        old.home_team_id !== row.home_team_id ||
        old.away_team_id !== row.away_team_id || old.phase_id !== row.phase_id;
    });
    for (const batch of chunks(changed, 100)) {
      const { error } = await db.from("matches")
        .upsert(batch, { onConflict: "provider_name,provider_fixture_id" });
      if (error) throw error;
    }

    return Response.json({
      competition: "Liga MX",
      season: seasonLabel,
      fixtures: events.length,
      changed: changed.length,
      teams: teamIds.size,
      final: normalized.filter((match) => match.fixture.status === "final").length,
      scheduled: normalized.filter((match) => match.fixture.status === "scheduled").length,
    });
  }),
};
