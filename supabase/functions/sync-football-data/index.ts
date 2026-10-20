import { withSupabase } from "npm:@supabase/server@1";
import { normalizeMatch, type FootballDataMatch } from "../_shared/footballData.ts";

const selected = {
  PL: { slug: "premier-league", name: "Premier League" },
  PD: { slug: "la-liga", name: "La Liga" },
  BL1: { slug: "bundesliga", name: "Bundesliga" },
  SA: { slug: "serie-a-italy", name: "Serie A" },
  FL1: { slug: "ligue-1", name: "Ligue 1" },
} as const;

const provider = "football-data.org";
const seasonYear = 2026;
const seasonLabel = "2026/27";

type Code = keyof typeof selected;
type ProviderResponse = {
  filters: { season: string | number };
  resultSet: { count: number };
  competition: { id: number; code: string; type: string; emblem: string | null };
  matches: FootballDataMatch[];
};

function chunks<T>(rows: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < rows.length; i += size) result.push(rows.slice(i, i + size));
  return result;
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json({ error: "Use POST" }, { status: 405 });
    }

    let code: string;
    try {
      ({ code } = await req.json());
    } catch {
      return Response.json({ error: "Send JSON with a competition code" }, { status: 400 });
    }
    if (typeof code !== "string" || !Object.prototype.hasOwnProperty.call(selected, code)) {
      return Response.json({ error: "Competition is not selected for import" }, { status: 400 });
    }
    const chosen = selected[code as Code];
    const token = Deno.env.get("FOOTBALL_DATA_API_KEY");
    if (!token) {
      return Response.json({ error: "Football API key is missing" }, { status: 500 });
    }

    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${code}/matches?season=${seasonYear}`,
      { headers: { "X-Auth-Token": token } },
    );
    if (!response.ok) {
      console.error(`football-data.org ${code}: ${response.status}`);
      return Response.json({ error: "Football data request failed", status: response.status }, {
        status: 502,
      });
    }

    const source = await response.json() as ProviderResponse;
    if (
      source.competition?.code !== code || source.competition.type !== "LEAGUE" ||
      Number(source.filters?.season) !== seasonYear ||
      !Array.isArray(source.matches) || source.matches.length === 0 ||
      source.resultSet?.count !== source.matches.length ||
      new Set(source.matches.map((match) => match.id)).size !== source.matches.length
    ) {
      return Response.json({ error: "Unexpected provider season or fixture count" }, {
        status: 502,
      });
    }

    const season = source.matches[0].season;
    if (
      !Number.isInteger(season?.id) ||
      season.startDate?.slice(0, 4) !== String(seasonYear) ||
      !season.endDate ||
      source.matches.some((match) => match.season?.id !== season.id)
    ) {
      return Response.json({ error: "Unexpected provider season" }, { status: 502 });
    }

    // Validate the entire feed before creating any database records.
    const normalized = source.matches.map(normalizeMatch);
    const teamMap = new Map<number, { id: number; name: string; crest: string | null }>();
    for (const match of source.matches) {
      teamMap.set(match.homeTeam.id, match.homeTeam);
      teamMap.set(match.awayTeam.id, match.awayTeam);
    }

    const db = ctx.supabaseAdmin;
    const { data: competition, error: competitionError } = await db
      .from("competitions")
      .upsert({
        slug: chosen.slug,
        name: chosen.name,
        kind: "club",
        provider_name: provider,
        provider_competition_id: String(source.competition.id),
        emblem_url: source.competition.emblem,
      }, { onConflict: "slug" })
      .select("id")
      .single();
    if (competitionError) throw competitionError;

    const { data: localSeason, error: seasonError } = await db
      .from("seasons")
      .upsert({
        competition_id: competition.id,
        label: seasonLabel,
        starts_on: season.startDate,
        ends_on: season.endDate,
        provider_name: provider,
        provider_season_id: String(season.id),
      }, { onConflict: "competition_id,label" })
      .select("id")
      .single();
    if (seasonError) throw seasonError;

    const { data: phase, error: phaseError } = await db
      .from("season_phases")
      .upsert({
        season_id: localSeason.id,
        code: "regular",
        name: "Regular season",
        format: "league",
        sort_order: 1,
      }, { onConflict: "season_id,code" })
      .select("id")
      .single();
    if (phaseError) throw phaseError;

    const teamRows = [...teamMap.values()].map((team) => ({
      name: team.name,
      kind: "club",
      provider_name: provider,
      provider_team_id: String(team.id),
      crest_url: team.crest,
    }));
    const { data: savedTeams, error: teamError } = await db
      .from("teams")
      .upsert(teamRows, { onConflict: "provider_name,provider_team_id" })
      .select("id,provider_team_id");
    if (teamError) throw teamError;
    const teamIds = new Map((savedTeams ?? []).map((team) => [team.provider_team_id, team.id]));
    if (teamIds.size !== teamMap.size) throw new Error("Not all teams were saved");

    const memberships = [...teamIds.values()].map((teamId) => ({
      season_id: localSeason.id,
      team_id: teamId,
    }));
    const { error: membershipError } = await db
      .from("season_teams")
      .upsert(memberships, { onConflict: "season_id,team_id" });
    if (membershipError) throw membershipError;

    const fixtureRows = source.matches.map((match, index) => ({
      ...normalized[index],
      season_id: localSeason.id,
      phase_id: phase.id,
      home_team_id: teamIds.get(String(match.homeTeam.id)),
      away_team_id: teamIds.get(String(match.awayTeam.id)),
    }));
    if (fixtureRows.some((row) => !row.home_team_id || !row.away_team_id)) {
      throw new Error("Provider team did not map to a saved team");
    }
    const { data: existingRows, error: existingError } = await db.from("matches")
      .select("provider_fixture_id,provider_updated_at")
      .eq("season_id", localSeason.id)
      .eq("provider_name", provider);
    if (existingError) throw existingError;
    const existingUpdates = new Map(
      (existingRows ?? []).map((row) => [
        row.provider_fixture_id,
        row.provider_updated_at ? Date.parse(row.provider_updated_at) : null,
      ]),
    );
    const changedRows = fixtureRows.filter((row) =>
      existingUpdates.get(row.provider_fixture_id) !== Date.parse(row.provider_updated_at)
    );
    for (const batch of chunks(changedRows, 100)) {
      const { error } = await db.from("matches")
        .upsert(batch, { onConflict: "provider_name,provider_fixture_id" });
      if (error) throw error;
    }

    return Response.json({
      competition: chosen.name,
      season: seasonLabel,
      fixtures: source.matches.length,
      changed: changedRows.length,
      teams: teamIds.size,
      final: normalized.filter((match) => match.status === "final").length,
      scheduled: normalized.filter((match) => match.status === "scheduled").length,
    });
  }),
};
