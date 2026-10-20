import { describe, expect, it } from "vitest";
import {
  normalizeMatch,
  type FootballDataMatch,
} from "../../supabase/functions/_shared/footballData";

const fixture: FootballDataMatch = {
  id: 560542,
  utcDate: "2026-08-21T19:00:00Z",
  status: "FINISHED",
  matchday: 1,
  stage: "REGULAR_SEASON",
  lastUpdated: "2026-08-21T22:00:00Z",
  homeTeam: { id: 57, name: "Arsenal FC", crest: null },
  awayTeam: { id: 1076, name: "Coventry City FC", crest: null },
  score: { fullTime: { home: 2, away: 2 } },
  season: { id: 2502, startDate: "2026-08-21", endDate: "2027-05-30" },
};

describe("football-data.org match mapping", () => {
  it("keeps a finished draw as a scoreline draw for grading", () => {
    expect(normalizeMatch(fixture)).toMatchObject({
      provider_fixture_id: "560542",
      status: "final",
      home_score: 2,
      away_score: 2,
      winner: "draw",
    });
  });

  it("does not grade a postponed or awarded match from a stale provider score", () => {
    for (const status of ["POSTPONED", "AWARDED"]) {
      expect(normalizeMatch({ ...fixture, status })).toMatchObject({
        home_score: null,
        away_score: null,
        winner: null,
      });
    }
  });

  it("rejects finished fixtures with no complete score", () => {
    expect(() => normalizeMatch({
      ...fixture,
      score: { fullTime: { home: 1, away: null } },
    })).toThrow("no valid final score");
  });
});
