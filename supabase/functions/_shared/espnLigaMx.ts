export type EspnCompetitor = {
  id: string;
  homeAway: "home" | "away";
  score?: string;
  team: { displayName: string; logo?: string };
};

export type EspnEvent = {
  id: string;
  date: string;
  season: { year: number; slug: string };
  status: {
    type: { name: string; state: string; completed: boolean };
  };
  competitions: [{ competitors: EspnCompetitor[] }];
};

export const ESPN_LIGA_MX_PROVIDER = "espn";
export const APERTURA_YEAR = 2026;
export const APERTURA_SLUG = "torneo-apertura";
export const APERTURA_FIXTURE_COUNT = 153;

export function isAperturaEvent(event: EspnEvent): boolean {
  return event.season?.year === APERTURA_YEAR &&
    event.season?.slug === APERTURA_SLUG;
}

export function normalizeEspnEvent(event: EspnEvent) {
  const competitors = event.competitions?.[0]?.competitors;
  const home = competitors?.find((team) => team.homeAway === "home");
  const away = competitors?.find((team) => team.homeAway === "away");
  if (
    !/^\d+$/.test(event.id) || !event.date ||
    Number.isNaN(Date.parse(event.date)) || competitors?.length !== 2 ||
    !home || !away || !/^\d+$/.test(home.id) || !/^\d+$/.test(away.id) ||
    home.id === away.id || !home.team?.displayName || !away.team?.displayName
  ) {
    throw new Error(`Invalid ESPN fixture ${event.id}`);
  }

  const type = event.status?.type;
  let status: "scheduled" | "live" | "postponed" | "cancelled" | "final";
  if (type?.name === "STATUS_FULL_TIME" && type.completed) status = "final";
  else if (type?.name === "STATUS_SCHEDULED" && type.state === "pre") {
    status = "scheduled";
  } else if (type?.state === "in" && !type.completed) status = "live";
  else if (["STATUS_POSTPONED", "STATUS_DELAYED", "STATUS_SUSPENDED"].includes(type?.name ?? "")) {
    status = "postponed";
  } else if (["STATUS_CANCELED", "STATUS_CANCELLED"].includes(type?.name ?? "")) {
    status = "cancelled";
  } else {
    throw new Error(`Unknown ESPN status ${type?.name} for ${event.id}`);
  }

  const homeScore = status === "final" ? Number(home.score) : null;
  const awayScore = status === "final" ? Number(away.score) : null;
  if (
    status === "final" &&
    (!/^\d+$/.test(home.score ?? "") || !/^\d+$/.test(away.score ?? "") ||
      !Number.isInteger(homeScore) || !Number.isInteger(awayScore) ||
      homeScore! < 0 || awayScore! < 0)
  ) {
    throw new Error(`Finished ESPN fixture ${event.id} has no valid score`);
  }

  return {
    homeId: home.id,
    awayId: away.id,
    homeName: home.team.displayName,
    awayName: away.team.displayName,
    homeLogo: home.team.logo ?? null,
    awayLogo: away.team.logo ?? null,
    fixture: {
      provider_name: ESPN_LIGA_MX_PROVIDER,
      provider_fixture_id: event.id,
      team_home: home.team.displayName,
      team_away: away.team.displayName,
      kickoff_time: new Date(event.date).toISOString(),
      matchday: null,
      status,
      home_score: homeScore,
      away_score: awayScore,
      winner: status === "final"
        ? homeScore! > awayScore! ? "home" : homeScore! < awayScore! ? "away" : "draw"
        : null,
    },
  };
}
