import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { useAuth } from '../context/AuthContext'
import { useGroups } from '../context/GroupContext'
import type { Group } from '../context/GroupContext'

interface Match {
  id: string
  team_home: string
  team_away: string
  kickoff_time: string
  stage: string
  group_label: string | null
  home_score: number | null
  away_score: number | null
  winner: string | null
}

interface Pick {
  id: string
  match_id: string
  home_score_pred: number
  away_score_pred: number
  points: number | null
}

interface LeaderboardEntry {
  display_name: string
  user_id: string
  total: number
}

type Panel = null | 'create' | 'join'
type DashboardTab = 'bracket' | 'picks' | 'leaderboard'

const ADMIN_EMAIL = 'josemramos.tech@gmail.com'

const TEAM_ISO: Record<string, string> = {
  'Mexico': 'mx', 'South Africa': 'za', 'South Korea': 'kr', 'Czechia': 'cz',
  'Switzerland': 'ch', 'Canada': 'ca', 'Qatar': 'qa', 'Bosnia & Herzegovina': 'ba',
  'Brazil': 'br', 'Morocco': 'ma', 'Haiti': 'ht', 'Scotland': 'gb-sct',
  'USA': 'us', 'Turkey': 'tr', 'Australia': 'au', 'Paraguay': 'py',
  'Germany': 'de', 'Ecuador': 'ec', 'Ivory Coast': 'ci', 'Curacao': 'cw',
  'Netherlands': 'nl', 'Japan': 'jp', 'Sweden': 'se', 'Tunisia': 'tn',
  'Belgium': 'be', 'Egypt': 'eg', 'Iran': 'ir', 'New Zealand': 'nz',
  'Spain': 'es', 'Cape Verde': 'cv', 'Saudi Arabia': 'sa', 'Uruguay': 'uy',
  'France': 'fr', 'Senegal': 'sn', 'Iraq': 'iq', 'Norway': 'no',
  'Argentina': 'ar', 'Algeria': 'dz', 'Austria': 'at', 'Jordan': 'jo',
  'Portugal': 'pt', 'DR Congo': 'cd', 'Uzbekistan': 'uz', 'Colombia': 'co',
  'England': 'gb-eng', 'Croatia': 'hr', 'Ghana': 'gh', 'Panama': 'pa',
}

function flagUrl(team: string) {
  const iso = TEAM_ISO[team]
  return iso ? `https://flagcdn.com/w80/${iso}.png` : null
}

function formatKickoff(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })
}

function isLocked(kickoff: string) {
  return new Date() >= new Date(kickoff)
}

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const { groups, activeGroup, setActiveGroup, loading: groupsLoading, refresh } = useGroups()
  const navigate = useNavigate()

  const [matches, setMatches] = useState<Match[]>([])
  const [picks, setPicks] = useState<Record<string, Pick>>({})
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [pendingPicks, setPendingPicks] = useState<Record<string, { home: string; away: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [tab, setTab] = useState<DashboardTab>('picks')
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [playerModal, setPlayerModal] = useState<{ userId: string; displayName: string } | null>(null)

  const [panel, setPanel] = useState<Panel>(null)
  const [panelTab, setPanelTab] = useState<'create' | 'join'>('create')
  const [formGroupName, setFormGroupName] = useState('')
  const [formDisplayName, setFormDisplayName] = useState('')
  const [formInviteCode, setFormInviteCode] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    supabase
      .from('matches')
      .select('*')
      .order('kickoff_time', { ascending: true })
      .then(({ data }) => setMatches(data ?? []))
  }, [])

  useEffect(() => {
    if (!user || !activeGroup) return
    supabase
      .from('picks')
      .select('*')
      .eq('user_id', user.id)
      .eq('group_id', activeGroup.id)
      .then(({ data }) => {
        const map: Record<string, Pick> = {}
        for (const p of data ?? []) map[p.match_id] = p
        setPicks(map)
      })
  }, [user, activeGroup])

  useEffect(() => {
    if (!activeGroup) return
    // Fetch all members first so everyone shows even with 0 picks
    Promise.all([
      supabase
        .from('group_members')
        .select('user_id, display_name')
        .eq('group_id', activeGroup.id),
      supabase
        .from('picks')
        .select('user_id, points')
        .eq('group_id', activeGroup.id),
    ]).then(([{ data: members }, { data: pickRows }]) => {
      const totals: Record<string, { display_name: string; total: number }> = {}
      // Seed all members at 0
      for (const m of members ?? []) {
        totals[m.user_id] = { display_name: m.display_name, total: 0 }
      }
      // Add points from picks
      for (const row of pickRows ?? []) {
        if (totals[row.user_id]) {
          totals[row.user_id].total += row.points ?? 0
        }
      }
      const board = Object.entries(totals)
        .map(([user_id, v]) => ({ user_id, ...v }))
        .sort((a, b) => b.total - a.total)
      setLeaderboard(board)
    })
  }, [activeGroup, picks])

  function openPanel(mode: 'create' | 'join') {
    setPanelTab(mode)
    setFormGroupName('')
    setFormDisplayName('')
    setFormInviteCode('')
    setFormError('')
    setPanel(mode)
  }

  async function handleLeaveGroup() {
    if (!user || !activeGroup) return
    const confirmed = window.confirm(`Leave "${activeGroup.name}"? Your picks will remain but you'll be removed from the group.`)
    if (!confirmed) return
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', activeGroup.id)
      .eq('user_id', user.id)
    await refresh()
    setActiveGroup((groups.find(g => g.id !== activeGroup.id) ?? null) as Group | null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setFormLoading(true)
    setFormError('')
    const code = randomCode()
    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .insert({ name: formGroupName.trim(), invite_code: code, created_by: user.id })
      .select()
      .single()
    if (groupErr || !group) {
      setFormError(groupErr?.message ?? 'Failed to create group')
      setFormLoading(false)
      return
    }
    const { error: memberErr } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        display_name: formDisplayName.trim() || user.email!.split('@')[0],
      })
    if (memberErr) {
      setFormError(memberErr.message)
      setFormLoading(false)
      return
    }
    await refresh()
    setActiveGroup(group as Group)
    setPanel(null)
    setFormLoading(false)
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setFormLoading(true)
    setFormError('')
    const code = formInviteCode.trim().toUpperCase()
    const { data: group, error: findErr } = await supabase
      .from('groups')
      .select()
      .eq('invite_code', code)
      .single()
    if (findErr || !group) {
      setFormError('Group not found — double-check the invite code.')
      setFormLoading(false)
      return
    }
    const { data: existing } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (existing) {
      setFormError("You're already in this group.")
      setFormLoading(false)
      return
    }
    const { error: joinErr } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        display_name: formDisplayName.trim() || user.email!.split('@')[0],
      })
    if (joinErr) {
      setFormError(joinErr.message)
      setFormLoading(false)
      return
    }
    await refresh()
    setActiveGroup(group as Group)
    setPanel(null)
    setFormLoading(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const savePick = async (matchId: string) => {
    if (!user || !activeGroup) return
    const p = pendingPicks[matchId]
    if (!p) return
    const home = parseInt(p.home)
    const away = parseInt(p.away)
    if (isNaN(home) || isNaN(away)) return
    setSaving(matchId)
    const { data, error } = await supabase
      .from('picks')
      .upsert(
        { user_id: user.id, match_id: matchId, group_id: activeGroup.id, home_score_pred: home, away_score_pred: away },
        { onConflict: 'user_id,match_id,group_id' }
      )
      .select()
      .single()
    if (!error && data) {
      setPicks(prev => ({ ...prev, [matchId]: data }))
      setPendingPicks(prev => { const n = { ...prev }; delete n[matchId]; return n })
    }
    setSaving(null)
  }

  if (groupsLoading) {
    return (
      <div className="min-h-screen field-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img src="/soccer-ball.png" alt="" className="w-14 h-14 animate-bounce" />
          <p className="text-gray-500 text-sm font-medium tracking-widest uppercase">Loading...</p>
        </div>
      </div>
    )
  }

  const upcomingMatches = matches.filter(m => !isLocked(m.kickoff_time))
  const completedMatches = matches.filter(m => isLocked(m.kickoff_time))

  const tabs = [
    { id: 'bracket', label: 'Bracket' },
    { id: 'picks', label: 'Picks'},
    { id: 'leaderboard', label: 'Leaderboard'},
  ] as const

  return (
    <>
      <div className="min-h-screen field-bg">

        {/* ── Header ── */}
        <div className="bg-black text-white sticky top-0 z-10">
          <div className="px-4 py-3">
            <div className="max-w-lg mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/soccer-ball.png" alt="" className="w-6 h-6" />
                <span className="font-black text-lg tracking-tight">PICK</span>
                <span className="font-black text-lg text-yellow-400 tracking-tight">'EM 26</span>
              </div>
              <div className="flex items-center gap-4">
                {user?.email === ADMIN_EMAIL && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="text-yellow-400 text-xs font-bold uppercase tracking-widest hover:text-yellow-300 transition"
                  >
                    Admin
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  className="text-gray-400 text-xs uppercase tracking-widest hover:text-white transition"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
          {/* WC26 4-color stripe */}
          <div className="flex h-1">
            <div className="flex-1 bg-red-600" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-green-600" />
            <div className="flex-1 bg-blue-700" />
          </div>
        </div>

        {/* ── Group tabs ── */}
        <div className="bg-gray-950 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {groups.length === 0 ? (
              <>
                <span className="text-gray-500 text-xs uppercase tracking-wide flex-none">No groups yet</span>
                <button
                  onClick={() => openPanel('create')}
                  className="flex-none px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap bg-yellow-400 text-black hover:bg-yellow-300 transition"
                >
                  + Create
                </button>
                <button
                  onClick={() => openPanel('join')}
                  className="flex-none px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap border border-gray-700 text-gray-400 hover:border-gray-500 transition"
                >
                  + Join
                </button>
              </>
            ) : (
              <>
                {groups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroup(g)}
                    className={`flex-none px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap transition ${
                      activeGroup?.id === g.id
                        ? 'bg-yellow-400 text-black'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
                <button
                  onClick={() => openPanel('join')}
                  className="flex-none px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap border border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300 transition"
                >
                  + Join
                </button>
              </>
            )}
          </div>
        </div>

        {/* Invite code strip */}
        {activeGroup && (
          <div className="bg-gray-900 border-b border-gray-800 py-1.5 px-4">
            <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
              <div className="text-center flex-1">
                <span className="text-gray-500 text-xs">Invite code: </span>
                <span className="font-mono font-black text-yellow-400 text-xs tracking-[0.2em]">{activeGroup.invite_code}</span>
                <span className="text-gray-600 text-xs"> — share to invite</span>
              </div>
              <button
                onClick={handleLeaveGroup}
                className="flex-none text-xs font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition whitespace-nowrap"
              >
                Leave
              </button>
            </div>
          </div>
        )}

        {/* ── Main content ── */}
        <div className="max-w-lg mx-auto px-4 py-5">

          {/* Tab switcher */}
          <div className="flex rounded-2xl bg-black p-1 mb-5 shadow-lg">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition uppercase tracking-widest ${
                  tab === t.id
                    ? 'bg-yellow-400 text-black shadow-sm'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* -- BRACKET TAB -- */}
          {tab === 'bracket' && (
            <>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
                <p className=" font-bold  text-lg font-black rounded-xl uppercase tracking-widest">World Cup 2026 Resources</p>
                <hr />
                {/* <iframe src="https://www.espn.com/soccer/bracket" className="w-full h-96" ></iframe> */}
                <a
                  href="https://www.espn.com/soccer/scoreboard/_/league/fifa.world"
                  target="_blank"
                  rel="noreferrer"
                  className="text-yellow-400 underline pt-2 block"
                >
                  Open ESPN Scoreboard
                </a>
                <br />
                <a
                  href="https://www.espn.com/soccer/bracket"
                  target="_blank"
                  rel="noreferrer"
                  className="text-yellow-400 underline pb-2 block"
                >
                  Open ESPN Bracket
                </a>
                
              </div>
            </>
          )}

          {/* ── PICKS TAB ── */}
          {tab === 'picks' && (
            <>
              {upcomingMatches.length > 0 && (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-gray-300" />
                    <span className="text-xs font-black uppercase tracking-widest text-white">Upcoming</span>
                    <div className="h-px flex-1 bg-gray-300" />
                  </div>
                  <div className="flex flex-col gap-3 mb-6">
                    {upcomingMatches.map(match => {
                      const saved = picks[match.id]
                      const pending = pendingPicks[match.id]
                      const homeVal = pending?.home ?? (saved ? String(saved.home_score_pred) : '')
                      const awayVal = pending?.away ?? (saved ? String(saved.away_score_pred) : '')
                      const isDirty = pending !== undefined

                      return (
                        <div key={match.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                          {/* Match header strip */}
                          <div className="bg-black px-4 py-2 flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                              {match.group_label ? `Group ${match.group_label}` : match.stage}
                              {' · '}{formatKickoff(match.kickoff_time)}
                            </span>
                            {saved && !isDirty && (
                              <span className="text-xs text-green-400 font-black tracking-wide">SAVED</span>
                            )}
                          </div>

                          {/* Scoreboard row */}
                          <div className="flex items-center px-4 py-5 gap-3">
                            {/* Home team */}
                            <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                              <img src={flagUrl(match.team_home) ?? undefined} alt={match.team_home} className="w-10 h-7 object-cover rounded shadow-sm" />
                              <span className="text-xs font-black uppercase tracking-tight text-gray-900 text-center leading-tight">
                                {match.team_home}
                              </span>
                            </div>

                            {/* Score pill */}
                            <div className="flex items-center gap-0 bg-black rounded-2xl px-3 py-2 flex-shrink-0">
                              <input
                                type="number"
                                min={0} max={20}
                                value={homeVal}
                                onChange={e =>
                                  setPendingPicks(prev => ({
                                    ...prev,
                                    [match.id]: { home: e.target.value, away: prev[match.id]?.away ?? awayVal },
                                  }))
                                }
                                className="w-10 bg-transparent text-white text-2xl font-black text-center focus:outline-none"
                                placeholder="0"
                              />
                              <span className="text-gray-500 font-black text-2xl px-1">:</span>
                              <input
                                type="number"
                                min={0} max={20}
                                value={awayVal}
                                onChange={e =>
                                  setPendingPicks(prev => ({
                                    ...prev,
                                    [match.id]: { home: prev[match.id]?.home ?? homeVal, away: e.target.value },
                                  }))
                                }
                                className="w-10 bg-transparent text-white text-2xl font-black text-center focus:outline-none"
                                placeholder="0"
                              />
                            </div>

                            {/* Away team */}
                            <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                              <img src={flagUrl(match.team_away) ?? undefined} alt={match.team_away} className="w-10 h-7 object-cover rounded shadow-sm" />
                              <span className="text-xs font-black uppercase tracking-tight text-gray-900 text-center leading-tight">
                                {match.team_away}
                              </span>
                            </div>
                          </div>

                          {/* Save button */}
                          {isDirty && (
                            <div className="px-4 pb-4">
                              {activeGroup ? (
                                <button
                                  onClick={() => savePick(match.id)}
                                  disabled={saving === match.id}
                                  className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs py-3 rounded-xl uppercase tracking-widest transition disabled:opacity-50"
                                >
                                  {saving === match.id ? 'Saving...' : 'Save Pick'}
                                </button>
                              ) : (
                                <p className="text-center text-xs text-gray-400 uppercase tracking-wide">
                                  Join a group above to save picks
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {completedMatches.length > 0 && (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px flex-1 bg-gray-300" />
                    <span className="text-xs font-black uppercase tracking-widest text-white">Completed</span>
                    <div className="h-px flex-1 bg-gray-300" />
                  </div>
                  <div className="flex flex-col gap-3">
                    {completedMatches.map(match => {
                      const saved = picks[match.id]
                      const hasResult = !!match.winner
                      return (
                        <div key={match.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-200 opacity-80">
                          {/* Match header strip */}
                          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                              {match.group_label ? `Group ${match.group_label}` : match.stage}
                              {' · '}{formatKickoff(match.kickoff_time)}
                            </span>
                            {saved?.points != null && (
                              <span className={`text-xs font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${
                                saved.points === 3
                                  ? 'bg-yellow-400 text-black'
                                  : saved.points === 1
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-700 text-gray-400'
                              }`}>
                                {saved.points}pt{saved.points !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>

                          {/* Score display row */}
                          <div className="flex items-center px-4 py-4 gap-3">
                            <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                              <img src={flagUrl(match.team_home) ?? undefined} alt={match.team_home} className="w-9 h-6 object-cover rounded shadow-sm opacity-80" />
                              <span className="text-xs font-black uppercase tracking-tight text-gray-500 text-center leading-tight">
                                {match.team_home}
                              </span>
                            </div>

                            <div className="flex flex-col items-center flex-shrink-0">
                              <div className="bg-gray-800 rounded-2xl px-4 py-2 min-w-[90px] text-center">
                                {hasResult ? (
                                  <span className="text-white text-2xl font-black">
                                    {match.home_score} : {match.away_score}
                                  </span>
                                ) : (
                                  <span className="text-gray-500 text-xs font-black uppercase tracking-widest">FT</span>
                                )}
                              </div>
                              {saved && (
                                <div className="text-xs text-gray-400 mt-1.5 text-center">
                                  Your pick: <span className="font-bold">{saved.home_score_pred}:{saved.away_score_pred}</span>
                                </div>
                              )}
                              {!saved && hasResult && (
                                <div className="text-xs text-gray-400 mt-1.5">No pick</div>
                              )}
                            </div>

                            <div className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                              <img src={flagUrl(match.team_away) ?? undefined} alt={match.team_away} className="w-9 h-6 object-cover rounded shadow-sm opacity-80" />
                              <span className="text-xs font-black uppercase tracking-tight text-gray-500 text-center leading-tight">
                                {match.team_away}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {upcomingMatches.length === 0 && completedMatches.length === 0 && (
                <div className="text-center py-16 text-gray-400 text-sm">No matches loaded.</div>
              )}
            </>
          )}

          {/* ── LEADERBOARD TAB ── */}
          {tab === 'leaderboard' && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-gray-300" />
                <span className="text-xs font-black uppercase tracking-widest text-white">
                  {activeGroup ? activeGroup.name : 'Leaderboard'}
                </span>
                <div className="h-px flex-1 bg-gray-300" />
              </div>

              {!activeGroup ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                  <div className="text-4xl mb-3">🏆</div>
                  <p className="text-gray-400 text-sm">Join or create a group to see the leaderboard.</p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                  <img src="/soccer-ball.png" alt="" className="w-10 h-10 mb-3 mx-auto" />
                  <p className="text-gray-400 text-sm">No scores yet — leaderboard updates when results are entered.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  {/* Header row */}
                  <div className="bg-black px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">Player</span>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">Points</span>
                  </div>
                  {leaderboard.map((entry, i) => {
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                    const isMe = entry.user_id === user?.id
                    return (
                      <div
                        key={entry.user_id}
                        className={`flex items-center justify-between px-4 py-3.5 border-b border-gray-100 last:border-0 ${
                          isMe ? 'bg-yellow-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-center">
                            {medal ?? (
                              <span className="text-xs font-bold text-gray-400">{i + 1}</span>
                            )}
                          </span>
                          <button
                            onClick={() => setPlayerModal({ userId: entry.user_id, displayName: entry.display_name })}
                            className={`font-bold text-sm underline underline-offset-2 decoration-dotted transition ${isMe ? 'text-black hover:text-gray-600' : 'text-gray-800 hover:text-gray-500'}`}
                          >
                            {entry.display_name}
                          </button>
                          {isMe && (
                            <span className="text-xs bg-yellow-400 text-black font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide">you</span>
                          )}
                        </div>
                        <span className={`font-black text-sm ${
                          i === 0 ? 'text-yellow-500' : isMe ? 'text-black' : 'text-gray-700'
                        }`}>
                          {entry.total} pts
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Player picks modal ── */}
      {playerModal && (
        <PlayerPicksModal
          userId={playerModal.userId}
          displayName={playerModal.displayName}
          groupId={activeGroup?.id ?? ''}
          matches={matches}
          onClose={() => setPlayerModal(null)}
        />
      )}

      {/* ── How to play FAB ── */}
      <button
        onClick={() => setShowHowToPlay(true)}
        className="fixed bottom-6 right-5 z-40 w-12 h-12 rounded-full bg-[#F5C518] shadow-lg flex items-center justify-center text-black font-black text-xl hover:bg-yellow-300 active:scale-95 transition-transform"
        aria-label="How to play"
      >
        ?
      </button>

      {/* ── How to play modal ── */}
      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}

      {/* ── Group panel modal ── */}
      {panel && (
        <GroupPanel
          tab={panelTab}
          onTabChange={t => { setPanelTab(t); setFormError('') }}
          formGroupName={formGroupName}
          setFormGroupName={setFormGroupName}
          formDisplayName={formDisplayName}
          setFormDisplayName={setFormDisplayName}
          formInviteCode={formInviteCode}
          setFormInviteCode={setFormInviteCode}
          formError={formError}
          formLoading={formLoading}
          onClose={() => setPanel(null)}
          onCreate={handleCreate}
          onJoin={handleJoin}
        />
      )}
    </>
  )
}

// ── Player Picks modal ─────────────────────────────────────────────────
interface PlayerPick {
  match_id: string
  home_score_pred: number
  away_score_pred: number
  points: number | null
}

function PlayerPicksModal({
  userId, displayName, groupId, matches, onClose,
}: {
  userId: string
  displayName: string
  groupId: string
  matches: Match[]
  onClose: () => void
}) {
  const [picks, setPicks] = useState<PlayerPick[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) return
    supabase
      .from('picks')
      .select('match_id, home_score_pred, away_score_pred, points')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .then(({ data }) => {
        setPicks(data ?? [])
        setLoading(false)
      })
  }, [userId, groupId])

  const pickMap = Object.fromEntries(picks.map(p => [p.match_id, p]))
  const played = [...matches].filter(m => isLocked(m.kickoff_time)).reverse()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-gray-100 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col"
        style={{ maxHeight: '88dvh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-black rounded-t-2xl px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest leading-none">Picks for</p>
            <h2 className="font-black text-white text-base uppercase tracking-tight mt-0.5">{displayName}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-gray-700 transition font-black text-xs flex-shrink-0"
          >
            X
          </button>
        </div>

        {/* WC stripe */}
        <div className="flex h-0.5 flex-shrink-0">
          <div className="flex-1 bg-red-600" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-green-600" />
          <div className="flex-1 bg-blue-700" />
        </div>

        {/* Picks list */}
        <div className="overflow-y-auto flex-1 px-3 py-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <img src="/soccer-ball.png" alt="" className="w-8 h-8 animate-bounce" />
            </div>
          ) : played.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No completed matches yet.</p>
          ) : (
            <div className="space-y-2">
            {played.map(match => {
              const pick = pickMap[match.id]
              const hasResult = !!match.winner
              return (
                <div key={match.id} className="bg-white rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                  {/* Match header strip */}
                  <div className="bg-gray-800 px-3 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide leading-none">
                      {match.group_label ? `Grp ${match.group_label}` : match.stage}
                      {' · '}{new Date(match.kickoff_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {pick?.points != null && (
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase ${
                        pick.points === 3 ? 'bg-yellow-400 text-black'
                        : pick.points === 1 ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-gray-400'
                      }`}>
                        {pick.points}pt{pick.points !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Teams + score row */}
                  <div className="flex items-center px-3 py-2.5 gap-2">
                    {/* Home */}
                    <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <img src={flagUrl(match.team_home) ?? undefined} alt={match.team_home} className="w-7 h-5 object-cover rounded" />
                      <span className="text-[10px] font-black uppercase text-gray-700 text-center leading-tight truncate w-full text-center">
                        {match.team_home}
                      </span>
                    </div>

                    {/* Score pill */}
                    <div className="flex flex-col items-center flex-shrink-0 gap-1">
                      <div className="bg-gray-800 rounded-xl px-3 py-1 min-w-[72px] text-center">
                        {hasResult ? (
                          <span className="text-white text-base font-black">
                            {match.home_score} : {match.away_score}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">FT</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 text-center leading-none">
                        {pick
                          ? <>pick: <span className="font-bold text-gray-600">{pick.home_score_pred}:{pick.away_score_pred}</span></>
                          : <span className="italic text-gray-300">no pick</span>
                        }
                      </div>
                    </div>

                    {/* Away */}
                    <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <img src={flagUrl(match.team_away) ?? undefined} alt={match.team_away} className="w-7 h-5 object-cover rounded" />
                      <span className="text-[10px] font-black uppercase text-gray-700 text-center leading-tight truncate w-full text-center">
                        {match.team_away}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── How To Play modal ─────────────────────────────────────────────────
function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-xl uppercase tracking-tight">How to Play</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition font-black text-sm"
          >
            X
          </button>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm flex-shrink-0">1</div>
            <div>
              <p className="font-black text-sm uppercase tracking-tight text-gray-900">Create or Join a Group</p>
              <p className="text-xs text-gray-500 mt-0.5">Start a private group and share the invite code with family or friends.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm flex-shrink-0">2</div>
            <div>
              <p className="font-black text-sm uppercase tracking-tight text-gray-900">Pick Every Score</p>
              <p className="text-xs text-gray-500 mt-0.5">Enter your predicted scoreline for each match before kickoff. Picks lock at kickoff.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-black text-sm flex-shrink-0">3</div>
            <div>
              <p className="font-black text-sm uppercase tracking-tight text-gray-900">Earn Points</p>
              <p className="text-xs text-gray-500 mt-0.5">Points are awarded automatically when the result is entered.</p>
            </div>
          </div>
        </div>

        {/* Scoring breakdown */}
        <div className="bg-gray-950 rounded-2xl p-4">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Scoring</p>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-white">Exact Scoreline</p>
                <p className="text-xs text-gray-500">e.g. predicted 2-1, result 2-1</p>
              </div>
              <span className="bg-[#F5C518] text-black font-black text-sm px-3 py-1 rounded-full">3 pts</span>
            </div>
            <div className="h-px bg-gray-800" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-white">Correct Result</p>
                <p className="text-xs text-gray-500">right winner or draw, wrong score</p>
              </div>
              <span className="bg-green-600 text-white font-black text-sm px-3 py-1 rounded-full">1 pt</span>
            </div>
            <div className="h-px bg-gray-800" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-white">Wrong Result</p>
                <p className="text-xs text-gray-500">incorrect winner or draw</p>
              </div>
              <span className="bg-gray-700 text-gray-400 font-black text-sm px-3 py-1 rounded-full">0 pts</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 bg-[#F5C518] text-black font-black text-xs py-3.5 rounded-xl uppercase tracking-widest hover:bg-yellow-300 transition"
        >
          Got it
        </button>
      </div>
    </div>
  )
}

// ── Group panel (bottom sheet) ────────────────────────────────
interface GroupPanelProps {
  tab: 'create' | 'join'
  onTabChange: (t: 'create' | 'join') => void
  formGroupName: string
  setFormGroupName: (v: string) => void
  formDisplayName: string
  setFormDisplayName: (v: string) => void
  formInviteCode: string
  setFormInviteCode: (v: string) => void
  formError: string
  formLoading: boolean
  onClose: () => void
  onCreate: (e: React.FormEvent) => void
  onJoin: (e: React.FormEvent) => void
}

function GroupPanel({
  tab, onTabChange,
  formGroupName, setFormGroupName,
  formDisplayName, setFormDisplayName,
  formInviteCode, setFormInviteCode,
  formError, formLoading,
  onClose, onCreate, onJoin,
}: GroupPanelProps) {
  const inputCls = 'w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent font-medium'

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl px-5 pt-4 pb-8 max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-black text-lg uppercase tracking-tight">
            {tab === 'create' ? 'Create Group' : 'Join Group'}
          </h2>
          <div className="w-1 h-5 bg-yellow-400 rounded-full" />
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
          {(['create', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition uppercase tracking-widest ${
                tab === t ? 'bg-black text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              {t === 'create' ? 'Create' : 'Join'}
            </button>
          ))}
        </div>

        {tab === 'create' ? (
          <form onSubmit={onCreate} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Group name</label>
              <input
                type="text"
                value={formGroupName}
                onChange={e => setFormGroupName(e.target.value)}
                placeholder="Ramos Family"
                required
                autoFocus
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Your display name</label>
              <input
                type="text"
                value={formDisplayName}
                onChange={e => setFormDisplayName(e.target.value)}
                placeholder="Jose"
                className={inputCls}
              />
            </div>
            {formError && <p className="text-red-500 text-sm font-medium">{formError}</p>}
            <button
              type="submit"
              disabled={formLoading}
              className="w-full bg-black text-white font-black text-xs py-4 rounded-xl uppercase tracking-widest hover:bg-gray-900 transition disabled:opacity-50 mt-1"
            >
              {formLoading ? 'Creating...' : 'Create Group'}
            </button>
          </form>
        ) : (
          <form onSubmit={onJoin} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Invite code</label>
              <input
                type="text"
                value={formInviteCode}
                onChange={e => setFormInviteCode(e.target.value)}
                placeholder="ABC123"
                maxLength={6}
                required
                autoFocus
                className={inputCls + ' font-mono uppercase text-center text-2xl tracking-[0.3em]'}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1.5">Your display name</label>
              <input
                type="text"
                value={formDisplayName}
                onChange={e => setFormDisplayName(e.target.value)}
                placeholder="Jose"
                className={inputCls}
              />
            </div>
            {formError && <p className="text-red-500 text-sm font-medium">{formError}</p>}
            <button
              type="submit"
              disabled={formLoading}
              className="w-full bg-yellow-400 text-black font-black text-xs py-4 rounded-xl uppercase tracking-widest hover:bg-yellow-300 transition disabled:opacity-50 mt-1"
            >
              {formLoading ? 'Joining...' : 'Join Group'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
