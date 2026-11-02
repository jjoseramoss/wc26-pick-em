import { describe, expect, it } from "vitest";
import {
  isAperturaEvent,
  normalizeEspnEvent,
  type EspnEvent,
} from "../../supabase/functions/_shared/espnLigaMx";

const fixture: EspnEvent = {
  id: "401876919",
  date: "2026-10-31T01:00Z",
  season: { year: 2026, slug: "torneo-apertura" },
  status: {
    type: { name: "STATUS_SCHEDULED", state: "pre", completed: false },
  },
  competitions: [{
    competitors: [
      { id: "15720", homeAway: "home", score: "0", team: { displayName: "Atlético de San Luis" } },
      { id: "216", homeAway: "away", score: "0", team: { displayName: "Atlas" } },
    ],
  }],
};

describe("ESPN Liga MX mapping", () => {
  it("selects only the ongoing Apertura regular-season feed", () => {
    expect(isAperturaEvent(fixture)).toBe(true);
    expect(isAperturaEvent({ ...fixture, season: { year: 2025, slug: "torneo-clausura" } })).toBe(false);
  });

  it("ignores placeholder zero scores before a game starts", () => {
    expect(normalizeEspnEvent(fixture).fixture).toMatchObject({
      provider_fixture_id: "401876919",
      status: "scheduled",
      home_score: null,
      away_score: null,
      winner: null,
    });
  });

  it("grades a finished draw by its scoreline", () => {
    const result = normalizeEspnEvent({
      ...fixture,
      status: { type: { name: "STATUS_FULL_TIME", state: "post", completed: true } },
      competitions: [{ competitors: fixture.competitions[0].competitors.map((team) => ({ ...team, score: "2" })) }],
    });
    expect(result.fixture).toMatchObject({ status: "final", home_score: 2, away_score: 2, winner: "draw" });
  });

  it("rejects unknown states and incomplete final scores", () => {
    expect(() => normalizeEspnEvent({ ...fixture, status: { type: { name: "STATUS_UNKNOWN", state: "post", completed: true } } })).toThrow("Unknown ESPN status");
    expect(() => normalizeEspnEvent({
      ...fixture,
      status: { type: { name: "STATUS_FULL_TIME", state: "post", completed: true } },
      competitions: [{ competitors: [{ ...fixture.competitions[0].competitors[0], score: "" }, fixture.competitions[0].competitors[1]] }],
    })).toThrow("no valid score");
  });
});
