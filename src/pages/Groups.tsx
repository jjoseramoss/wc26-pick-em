import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGroups } from "../context/GroupContext";
import { createGroup, joinGroup } from "../utils/groups";
import { supabase } from "../utils/supabase";
import { competitionName } from "../utils/seasons";

type Season = {
  id: string;
  label: string;
  competitions: { name: string }[];
};

export default function Groups() {
  const { user } = useAuth();
  const { groups, refresh, setActiveGroup } = useGroups();
  const navigate = useNavigate();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState("");

  const [tab, setTab] = useState<"create" | "join">("create");
  const [groupName, setGroupName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [groupError, setGroupError] = useState("");

  useEffect(() => {
    async function loadSeasons() {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("seasons")
        .select("id, label, competitions(name)")
        .lte("starts_on", today)
        .gte("ends_on", today);

      if (error) {
        setError(`Could not load seasons: ${error.message}`);
        return;
      }

      setSeasons(
        (data ?? []).sort((a, b) =>
          competitionName(a.competitions).localeCompare(competitionName(b.competitions)),
        ),
      );
    }

    loadSeasons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!seasonId) {
      setError("Choose a season before creating a group.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const group = await createGroup(
        groupName,
        displayName || user.email?.split("@")[0] || "Player",
        seasonId,
      );
      await refresh();
      setActiveGroup(group);
      navigate("/dashboard");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to create group",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      const group = await joinGroup(
        inviteCode,
        displayName || user.email?.split("@")[0] || "Player",
      );
      await refresh();
      setActiveGroup(group);
      navigate("/dashboard");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to join group");
    } finally {
      setLoading(false);
    }
  };

  async function handleLeave(groupId: string, groupName: string) {
    if (
      !user ||
      !window.confirm(
        `Leave "${groupName}"? Your picks will remain, but you'll be removed from the group.`,
      )
    )
      return;
    setGroupError("");
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", user.id);
    if (error) {
      setGroupError(error.message);
      return;
    }
    await refresh();
  }

  return (
    <AppShell>
      <div className="hero-band">
        <div>
          <span className="eyebrow">YOUR PEOPLE / YOUR SEASON</span>
          <h1 className="page-title">
            Play together<span className="accent">.</span>
          </h1>
          <p className="page-copy">
            Build a private group around a season, or use an invite code to join
            the table.
          </p>
        </div>
      </div>
      <div className="groups-grid">
        <section className="panel group-form">
          <div className="group-mode" role="tablist" aria-label="Group action">
            <button
              className={tab === "create" ? "active" : ""}
              role="tab"
              aria-selected={tab === "create"}
              onClick={() => {
                setTab("create");
                setError("");
              }}
            >
              Create a group
            </button>
            <button
              className={tab === "join" ? "active" : ""}
              role="tab"
              aria-selected={tab === "join"}
              onClick={() => {
                setTab("join");
                setError("");
              }}
            >
              Join with code
            </button>
          </div>
          <h2
            style={{
              fontSize: 30,
              letterSpacing: "-.05em",
              fontWeight: 850,
              margin: "0 0 8px",
            }}
          >
            {tab === "create" ? "Start something." : "Get in the game."}
          </h2>
          <p className="form-intro">
            {tab === "create"
              ? "Choose a season and name your group. We will give you a code to share."
              : "Enter the six character code from your friend to join their group."}
          </p>
          <form onSubmit={tab === "create" ? handleCreate : handleJoin}>
            {tab === "create" ? (
              <>
                <div className="form-field">
                  <label htmlFor="seasonId">Season</label>
                  <select
                    className="form-input"
                    id="seasonId"
                    value={seasonId}
                    required
                    onChange={(e) => setSeasonId(e.target.value)}
                  >
                    <option value="" disabled>
                      Choose a season
                    </option>
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {competitionName(season.competitions)} · {season.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="groupName">Group name</label>
                  <input
                    className="form-input"
                    id="groupName"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Sunday Football Club"
                    required
                    maxLength={80}
                  />
                </div>
              </>
            ) : (
              <div className="form-field">
                <label htmlFor="inviteCode">Invite code</label>
                <input
                  className="form-input"
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  required
                  style={{
                    textTransform: "uppercase",
                    letterSpacing: ".12em",
                    fontWeight: 800,
                  }}
                />
              </div>
            )}
            <div className="form-field">
              <label htmlFor="displayName">Your name in this group</label>
              <input
                className="form-input"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={user?.email?.split("@")[0] || "Your name"}
                maxLength={40}
              />
              <span className="form-help">
                This is how friends will see you on the leaderboard.
              </span>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button-primary"
              type="submit"
              disabled={loading}
              style={{ width: "100%" }}
            >
              {loading
                ? "Working…"
                : tab === "create"
                  ? "Create group"
                  : "Join group"}{" "}
              <span>↗</span>
            </button>
          </form>
        </section>
        <aside>
          <div className="section-heading">
            <h2>Your groups</h2>
            <span>{groups.length.toString().padStart(2, "0")} total</span>
          </div>
          {groupError && (
            <p className="form-error" role="alert">
              {groupError}
            </p>
          )}
          {groups.length ? (
            <div className="group-list">
              {groups.map((g) => (
                <div className="panel group-list-item" key={g.id}>
                  <button
                    className="hover:text-[#d5322b] hover:underline hover:underline-offset-2 transition-colors"
                    onClick={() => {
                      setActiveGroup(g);
                      navigate("/dashboard");
                    }}
                  >
                    <span className="eyebrow">YOUR GROUP</span>
                    <h3>{g.name}</h3>
                    <p>Open this group's dashboard</p>
                  </button>
                  <div className="group-list-actions">
                    <code title="Invite code">{g.invite_code}</code>
                    <button
                      className="text-button"
                      onClick={() => handleLeave(g.id, g.name)}
                    >
                      Leave group
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              No groups yet. Create one here or ask a friend for an invite code.
            </div>
          )}
          <div className="panel rail-panel dark" style={{ marginTop: 15 }}>
            <div className="rail-title">How groups work</div>
            <p className="rail-description">
              Each group follows one season. Everyone predicts the same
              fixtures, and every saved pick contributes to that group's table.
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
