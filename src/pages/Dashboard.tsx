import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { useAuth } from "../context/AuthContext";
import { useGroups } from "../context/GroupContext";
import BracketView from "../components/BracketView";
import AppShell from "../components/AppShell";
import { savePick as savePickToDatabase } from "../utils/picks";
import type { Pick } from "../utils/picks";
import { parsePredictedScore } from "../utils/scoring";

interface Match {
  id: string;
  team_home: string;
  team_away: string;
  kickoff_time: string;
  stage: string | null;
  phase_id: string | null;
  group_label: string | null;
  home_score: number | null;
  away_score: number | null;
  winner: string | null;
  match_number: number | null;
}

interface LeaderboardEntry {
  display_name: string;
  user_id: string;
  total: number;
}

type DashboardTab = "picks" | "results" | "bracket" | "leaderboard";

function formatKickoff(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function isLocked(kickoff: string) {
  return new Date() >= new Date(kickoff);
}

export default function Dashboard() {
  const { user } = useAuth();
  const {
    groups,
    activeGroup,
    setActiveGroup,
    loading: groupsLoading,
  } = useGroups();
  const navigate = useNavigate();

  const [matches, setMatches] = useState<Match[]>([]);
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [pendingPicks, setPendingPicks] = useState<
    Record<string, { home: string; away: string }>
  >({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<DashboardTab>("picks");
  const [seasonLabel, setSeasonLabel] = useState("");
  const [phaseNames, setPhaseNames] = useState<Record<string, string>>({});
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [copiedCode, setCopiedCode] = useState("");
  const [playerModal, setPlayerModal] = useState<{
    userId: string;
    displayName: string;
  } | null>(null);

  useEffect(() => {
    if (!activeGroup?.season_id) {
      setSeasonLabel("");
      setPhaseNames({});
      return;
    }
    const seasonId = activeGroup.season_id;
    let cancelled = false;
    setSeasonLabel("");
    setPhaseNames({});
    supabase
      .from("seasons")
      .select("label")
      .eq("id", seasonId)
      .single()
      .then(({ data }) => {
        if (!cancelled) setSeasonLabel(data?.label ?? "");
      });
    supabase
      .from("season_phases")
      .select("id, name")
      .eq("season_id", seasonId)
      .then(({ data }) => {
        if (!cancelled)
          setPhaseNames(
            Object.fromEntries(
              (data ?? []).map((phase) => [phase.id, phase.name]),
            ),
          );
      });
    return () => {
      cancelled = true;
    };
  }, [activeGroup?.season_id]);

  useEffect(() => {
    const seasonId = activeGroup?.season_id;
    if (!seasonId) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    setMatches([]);
    supabase
      .from("matches")
      .select("*")
      .eq("season_id", seasonId)
      .order("kickoff_time", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Could not load matches: ", error);
        setMatches(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [activeGroup?.season_id]);

  useEffect(() => {
    if (!user || !activeGroup) {
      setPicks({});
      return;
    }
    let cancelled = false;
    setPicks({});
    supabase
      .from("picks")
      .select("*")
      .eq("user_id", user.id)
      .eq("group_id", activeGroup.id)
      .then(({ data }) => {
        if (cancelled) return;
        const map: Record<string, Pick> = {};
        for (const p of data ?? []) map[p.match_id] = p;
        setPicks(map);
      });
    return () => {
      cancelled = true;
    };
  }, [user, activeGroup]);

  useEffect(() => {
    if (!activeGroup) {
      setLeaderboard([]);
      return;
    }
    let cancelled = false;
    setLeaderboard([]);
    // Fetch all members first so everyone shows even with 0 picks
    Promise.all([
      supabase
        .from("group_members")
        .select("user_id, display_name")
        .eq("group_id", activeGroup.id),
      supabase
        .from("picks")
        .select("user_id, points")
        .eq("group_id", activeGroup.id),
    ]).then(([{ data: members }, { data: pickRows }]) => {
      if (cancelled) return;
      const totals: Record<string, { display_name: string; total: number }> =
        {};
      // Seed all members at 0
      for (const m of members ?? []) {
        totals[m.user_id] = { display_name: m.display_name, total: 0 };
      }
      // Add points from picks
      for (const row of pickRows ?? []) {
        if (totals[row.user_id]) {
          totals[row.user_id].total += row.points ?? 0;
        }
      }
      const board = Object.entries(totals)
        .map(([user_id, v]) => ({ user_id, ...v }))
        .sort((a, b) => b.total - a.total);
      setLeaderboard(board);
    });
    return () => {
      cancelled = true;
    };
  }, [activeGroup, picks]);

  const savePick = async (matchId: string) => {
    if (!user || !activeGroup) return;
    const p = pendingPicks[matchId];
    if (!p) return;
    setSaving(matchId);
    setSaveError((prev) => ({ ...prev, [matchId]: "" }));
    try {
      const home = parsePredictedScore(p.home);
      const away = parsePredictedScore(p.away);
      const data = await savePickToDatabase(
        user.id,
        activeGroup.id,
        matchId,
        home,
        away,
        picks[matchId]?.id,
      );
      setPicks((prev) => ({ ...prev, [matchId]: data }));
      setPendingPicks((prev) => {
        const n = { ...prev };
        delete n[matchId];
        return n;
      });
    } catch (error) {
      setSaveError((prev) => ({
        ...prev,
        [matchId]:
          error instanceof Error ? error.message : "Could not save pick",
      }));
    } finally {
      setSaving(null);
    }
  };

  async function copyInviteCode() {
    if (!activeGroup) return;
    try {
      await navigator.clipboard.writeText(activeGroup.invite_code);
      setCopiedCode(activeGroup.invite_code);
    } catch {
      setCopiedCode("");
    }
  }

  if (groupsLoading)
    return (
      <AppShell>
        <div className="empty-state">Loading your workspace…</div>
      </AppShell>
    );

  const upcomingMatches = matches.filter((m) => !isLocked(m.kickoff_time));
  const pastMatches = matches.filter((m) => isLocked(m.kickoff_time));
  const hasBracket = matches.some((m) => m.match_number === 104);
  const visibleMatches = tab === "results" ? pastMatches : upcomingMatches;
  const matchContext = (match: Match) =>
    match.group_label
      ? `Group ${match.group_label}`
      : match.stage ||
        (match.phase_id && phaseNames[match.phase_id]) ||
        "Fixture";
  const showMatchList = tab === "picks" || tab === "results";

  const leaderboardContent = !activeGroup ? (
    <p className="rail-description">Create or join a group to see its table.</p>
  ) : leaderboard.length === 0 ? (
    <p className="rail-description">
      The table will appear when your group has players.
    </p>
  ) : (
    leaderboard.map((entry, i) => (
      <div
        className={`leader-row${entry.user_id === user?.id ? " me" : ""}`}
        key={entry.user_id}
      >
        <span className="leader-rank">{String(i + 1).padStart(2, "0")}</span>
        <button
          className="leader-name"
          onClick={() =>
            setPlayerModal({
              userId: entry.user_id,
              displayName: entry.display_name,
            })
          }
        >
          {entry.display_name}
          {entry.user_id === user?.id ? " (you)" : ""}
        </button>
        <span className="leader-points">{entry.total}</span>
      </div>
    ))
  );

  return (
    <AppShell>
      <div className="hero-band dashboard-intro">
        <div>
          <span className="eyebrow">Make your picks</span>
          <h1 className="page-title">
            {seasonLabel || "YOUR SEASON"}
            <span className="accent">.</span>
          </h1>
        </div>
        <div className="hero-actions">
          <button
            className="button-primary"
            onClick={() => navigate("/groups")}
          >
            Groups ↗
          </button>
        </div>
      </div>
      {groups.length > 0 && (
        <div className="group-switcher" aria-label="Switch group">
          {groups.map((g) => (
            <button
              className={`group-chip${activeGroup?.id === g.id ? " active" : ""}`}
              key={g.id}
              onClick={() => {
                setActiveGroup(g);
                setTab("picks");
              }}
            >
              {g.name}
            </button>
          ))}
          <button className="group-chip" onClick={() => navigate("/groups")}>
            + New group
          </button>
        </div>
      )}
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <div className="section-heading">
            <h2>{activeGroup?.name ?? "Your fixtures"}</h2>
            <button
              className="text-button"
              onClick={() => setShowHowToPlay(true)}
            >
              How to play →
            </button>
          </div>
          {activeGroup && (
            <div className="mobile-group-summary">
              <span>
                Invite friends <strong>{activeGroup.invite_code}</strong>
              </span>
              <div>
                <button onClick={copyInviteCode}>
                  {copiedCode === activeGroup.invite_code
                    ? "Copied"
                    : "Copy code"}
                </button>
                <button onClick={() => setTab("leaderboard")}>
                  View table →
                </button>
              </div>
            </div>
          )}
          <div
            className="section-tabs"
            role="tablist"
            aria-label="Dashboard view"
          >
            <button
              role="tab"
              aria-selected={tab === "picks"}
              className={tab === "picks" ? "active" : ""}
              onClick={() => setTab("picks")}
            >
              Upcoming ({upcomingMatches.length})
            </button>
            <button
              role="tab"
              aria-selected={tab === "results"}
              className={tab === "results" ? "active" : ""}
              onClick={() => setTab("results")}
            >
              Played ({pastMatches.length})
            </button>
            {hasBracket && (
              <button
                role="tab"
                aria-selected={tab === "bracket"}
                className={tab === "bracket" ? "active" : ""}
                onClick={() => setTab("bracket")}
              >
                Bracket
              </button>
            )}
            <button
              role="tab"
              aria-selected={tab === "leaderboard"}
              className={`table-tab${tab === "leaderboard" ? " active" : ""}`}
              onClick={() => setTab("leaderboard")}
            >
              Table
            </button>
          </div>
          {showMatchList &&
            (visibleMatches.length === 0 ? (
              <div className="empty-state">
                {!activeGroup
                  ? "Create or join a group to see its fixtures."
                  : matches.length === 0
                    ? "No fixtures are available for this season yet."
                    : tab === "picks"
                      ? "All fixtures have kicked off. Check the played tab for results."
                      : "No matches have kicked off yet."}
              </div>
            ) : (
              <div className="match-list">
                {visibleMatches.map((match) => {
                  const saved = picks[match.id];
                  const pending = pendingPicks[match.id];
                  const homeVal =
                    pending?.home ??
                    (saved ? String(saved.home_score_pred) : "");
                  const awayVal =
                    pending?.away ??
                    (saved ? String(saved.away_score_pred) : "");
                  const hasResult =
                    match.home_score != null && match.away_score != null;
                  return (
                    <article className="panel match-card" key={match.id}>
                      <div className="match-card-header">
                        <span>
                          {matchContext(match)} /{" "}
                          {formatKickoff(match.kickoff_time)}
                        </span>
                        <span
                          className={`match-status${saved && !pending ? " saved" : ""}`}
                        >
                          {tab === "results"
                            ? hasResult
                              ? "Final"
                              : "Awaiting result"
                            : pending
                              ? "Unsaved"
                              : saved
                                ? "Pick saved"
                                : "Make your pick"}
                        </span>
                      </div>
                      <div className="match-card-body">
                        <div>
                          <span className="team-label">Home</span>
                          <span className="team-name">{match.team_home}</span>
                        </div>
                        {tab === "picks" ? (
                          <div className="score-box">
                            <input
                              type="number"
                              min={0}
                              max={20}
                              aria-label={`${match.team_home} predicted score`}
                              value={homeVal}
                              onChange={(e) =>
                                setPendingPicks((prev) => ({
                                  ...prev,
                                  [match.id]: {
                                    home: e.target.value,
                                    away: prev[match.id]?.away ?? awayVal,
                                  },
                                }))
                              }
                              placeholder="–"
                            />
                            <span>:</span>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              aria-label={`${match.team_away} predicted score`}
                              value={awayVal}
                              onChange={(e) =>
                                setPendingPicks((prev) => ({
                                  ...prev,
                                  [match.id]: {
                                    home: prev[match.id]?.home ?? homeVal,
                                    away: e.target.value,
                                  },
                                }))
                              }
                              placeholder="–"
                            />
                          </div>
                        ) : (
                          <div className="score-box readonly">
                            {hasResult
                              ? `${match.home_score} : ${match.away_score}`
                              : "— : —"}
                          </div>
                        )}
                        <div>
                          <span className="team-label away">Away</span>
                          <div className="team-name away">
                            {match.team_away}
                          </div>
                        </div>
                      </div>
                      <div className="match-card-footer">
                        <span>
                          {saved
                            ? `Your pick: ${saved.home_score_pred} : ${saved.away_score_pred}${saved.points != null ? `  ·  ${saved.points} pts` : ""}`
                            : tab === "results"
                              ? "No pick made"
                              : "Enter your predicted score"}
                        </span>
                        {tab === "picks" && pending && (
                          <button
                            disabled={saving === match.id}
                            onClick={() => savePick(match.id)}
                          >
                            {saving === match.id ? "Saving…" : "Save pick"}
                          </button>
                        )}
                      </div>
                      {saveError[match.id] && (
                        <p
                          className="form-error"
                          role="alert"
                          style={{ margin: 0 }}
                        >
                          {saveError[match.id]}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            ))}
          {tab === "bracket" && hasBracket && (
            <div className="panel bracket-panel">
              <div className="section-heading">
                <h2>Tournament bracket</h2>
                <span>Scroll to explore →</span>
              </div>
              <BracketView
                allMatches={matches}
                picks={picks}
                onPickSaved={(matchId, pick) =>
                  setPicks((prev) => ({ ...prev, [matchId]: pick }))
                }
                activeGroup={activeGroup}
                user={user}
              />
            </div>
          )}
          {tab === "leaderboard" && (
            <div className="panel rail-panel">
              <div className="rail-title">
                Group table <span>PTS</span>
              </div>
              {leaderboardContent}
            </div>
          )}
        </div>
        <aside className="dashboard-rail">
          {activeGroup && (
            <div className="panel rail-panel dark invite-panel">
              <div className="rail-title">Invite friends</div>
              <p className="rail-description">
                Share this code for group:{" "}
                <span className="text-[#DC5856]">{activeGroup.name}</span>
              </p>
              <strong className="invite-code">{activeGroup.invite_code}</strong>
              <button
                className="button-outline"
                style={{ color: "#fff", borderColor: "#666", width: "100%" }}
                onClick={copyInviteCode}
              >
                {copiedCode === activeGroup.invite_code
                  ? "Copied"
                  : "Copy invite code ↗"}
              </button>
            </div>
          )}
          <div className="panel rail-panel table-panel">
            <div className="rail-title">
              Group table <span>PTS</span>
            </div>
            {leaderboardContent}
          </div>
        </aside>
      </div>
      {playerModal && (
        <PlayerPicksModal
          userId={playerModal.userId}
          displayName={playerModal.displayName}
          groupId={activeGroup?.id ?? ""}
          matches={matches}
          onClose={() => setPlayerModal(null)}
        />
      )}
      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}
    </AppShell>
  );
}

// ── Player Picks modal ─────────────────────────────────────────────────
interface PlayerPick {
  match_id: string;
  home_score_pred: number;
  away_score_pred: number;
  points: number | null;
}

function PlayerPicksModal({
  userId,
  displayName,
  groupId,
  matches,
  onClose,
}: {
  userId: string;
  displayName: string;
  groupId: string;
  matches: Match[];
  onClose: () => void;
}) {
  const [picks, setPicks] = useState<PlayerPick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;
    supabase
      .from("picks")
      .select("match_id, home_score_pred, away_score_pred, points")
      .eq("user_id", userId)
      .eq("group_id", groupId)
      .then(({ data }) => {
        setPicks(data ?? []);
        setLoading(false);
      });
  }, [userId, groupId]);

  const pickMap = Object.fromEntries(picks.map((p) => [p.match_id, p]));
  const played = [...matches].filter((m) => isLocked(m.kickoff_time)).reverse();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative panel w-full max-w-lg flex flex-col"
        style={{ maxHeight: "86dvh" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${displayName}'s picks`}
      >
        <div className="flex justify-between items-center gap-4 p-5 border-b border-gray-200">
          <div>
            <span className="eyebrow">PLAYER PICKS / COMPLETED FIXTURES</span>
            <h2 className="text-2xl font-black tracking-tight mt-1">
              {displayName}
            </h2>
          </div>
          <button
            className="button-outline"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto p-4 grid gap-2">
          {loading ? (
            <p className="empty-state">Loading picks…</p>
          ) : played.length === 0 ? (
            <p className="empty-state">No completed fixtures yet.</p>
          ) : (
            played.map((match) => {
              const pick = pickMap[match.id];
              const hasResult =
                match.home_score != null && match.away_score != null;
              return (
                <div className="panel match-card" key={match.id}>
                  <div className="match-card-header">
                    <span>
                      {match.group_label
                        ? `Group ${match.group_label}`
                        : match.stage || "Fixture"}{" "}
                      /{" "}
                      {new Date(match.kickoff_time).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" },
                      )}
                    </span>
                    <span>
                      {pick?.points != null ? `${pick.points} pts` : "—"}
                    </span>
                  </div>
                  <div className="match-card-body">
                    <span className="team-name">{match.team_home}</span>
                    <span className="score-box readonly">
                      {hasResult
                        ? `${match.home_score} : ${match.away_score}`
                        : "— : —"}
                    </span>
                    <span className="team-name away">{match.team_away}</span>
                  </div>
                  <div className="match-card-footer">
                    {pick
                      ? `Pick: ${pick.home_score_pred} : ${pick.away_score_pred}`
                      : "No pick"}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── How To Play modal ─────────────────────────────────────────────────
function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative bg-white rounded-sm p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-xl uppercase tracking-tight">
            How to Play
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-sm bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition font-black text-sm"
          >
            X
          </button>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-sm bg-black text-white flex items-center justify-center font-black text-sm flex-shrink-0">
              1
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-tight text-gray-900">
                Create or Join a Group
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Start a private group and share the invite code with family or
                friends.
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-sm bg-black text-white flex items-center justify-center font-black text-sm flex-shrink-0">
              2
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-tight text-gray-900">
                Pick Every Score
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Enter your predicted scoreline for each match before kickoff.
                Picks lock at kickoff.
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-sm bg-black text-white flex items-center justify-center font-black text-sm flex-shrink-0">
              3
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-tight text-gray-900">
                Earn Points
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Points are awarded automatically when the result is entered.
              </p>
            </div>
          </div>
        </div>

        {/* Scoring breakdown */}
        <div className="bg-gray-950 rounded-sm p-4">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
            Scoring
          </p>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-white">Exact Scoreline</p>
                <p className="text-xs text-gray-500">
                  e.g. predicted 2-1, result 2-1
                </p>
              </div>
              <span className="bg-red-600 text-white font-black text-sm px-3 py-1 rounded-sm">
                3 pts
              </span>
            </div>
            <div className="h-px bg-gray-800" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-white">Correct Result</p>
                <p className="text-xs text-gray-500">
                  right winner or draw, wrong score
                </p>
              </div>
              <span className="bg-gray-700 text-white font-black text-sm px-3 py-1 rounded-sm">
                1 pt
              </span>
            </div>
            <div className="h-px bg-gray-800" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-white">Wrong Result</p>
                <p className="text-xs text-gray-500">
                  incorrect winner or draw
                </p>
              </div>
              <span className="bg-gray-700 text-gray-400 font-black text-sm px-3 py-1 rounded-sm">
                0 pts
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 bg-red-600 text-white font-black text-xs py-3.5 rounded-sm uppercase tracking-widest hover:bg-red-700 transition"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
