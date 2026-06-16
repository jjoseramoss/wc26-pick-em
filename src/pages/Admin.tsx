import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { useAuth } from '../context/AuthContext'
import { deriveWinner } from '../utils/scoring'

const ADMIN_EMAIL = 'josemramos.tech@gmail.com'

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

interface PendingResult {
  home: string
  away: string
}

const KNOWN_TEAMS = [
  'Mexico','South Africa','South Korea','Czechia','Switzerland','Canada','Qatar',
  'Bosnia & Herzegovina','Brazil','Morocco','Haiti','Scotland','USA','Turkey',
  'Australia','Paraguay','Germany','Ecuador','Ivory Coast','Curacao','Netherlands',
  'Japan','Sweden','Tunisia','Belgium','Egypt','Iran','New Zealand','Spain',
  'Cape Verde','Saudi Arabia','Uruguay','France','Senegal','Iraq','Norway',
  'Argentina','Algeria','Austria','Jordan','Portugal','DR Congo','Uzbekistan',
  'Colombia','England','Croatia','Ghana','Panama',
]

const FLAG: Record<string, string> = {
  'Mexico': '🇲🇽', 'South Africa': '🇿🇦',
  'South Korea': '🇰🇷', 'Czechia': '🇨🇿',
  'Switzerland': '🇨🇭', 'Canada': '🇨🇦',
  'Qatar': '🇶🇦', 'Bosnia & Herzegovina': '🇧🇦',
  'Brazil': '🇧🇷', 'Morocco': '🇲🇦',
  'Haiti': '🇭🇹', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'USA': '🇺🇸', 'Turkey': '🇹🇷',
  'Australia': '🇦🇺', 'Paraguay': '🇵🇾',
  'Germany': '🇩🇪', 'Ecuador': '🇪🇨',
  'Ivory Coast': '🇨🇮', 'Curacao': '🇨🇼',
  'Netherlands': '🇳🇱', 'Japan': '🇯🇵',
  'Sweden': '🇸🇪', 'Tunisia': '🇹🇳',
  'Belgium': '🇧🇪', 'Egypt': '🇪🇬',
  'Iran': '🇮🇷', 'New Zealand': '🇳🇿',
  'Spain': '🇪🇸', 'Cape Verde': '🇨🇻',
  'Saudi Arabia': '🇸🇦', 'Uruguay': '🇺🇾',
  'France': '🇫🇷', 'Senegal': '🇸🇳',
  'Iraq': '🇮🇶', 'Norway': '🇳🇴',
  'Argentina': '🇦🇷', 'Algeria': '🇩🇿',
  'Austria': '🇦🇹', 'Jordan': '🇯🇴',
  'Portugal': '🇵🇹', 'DR Congo': '🇨🇩',
  'Uzbekistan': '🇺🇿', 'Colombia': '🇨🇴',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Croatia': '🇭🇷', 'Ghana': '🇬🇭',
  'Panama': '🇵🇦',
}

function flag(t: string) { return FLAG[t] ?? '🏳️' }

function formatKickoff(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })
}

function winnerLabel(home: number, away: number, teamHome: string, teamAway: string): string {
  if (home > away) return teamHome
  if (away > home) return teamAway
  return 'Draw'
}

type AdminTab = 'results' | 'add'
type Filter = 'pending' | 'all'

export default function Admin() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [matches, setMatches] = useState<Match[]>([])
  const [pending, setPending] = useState<Record<string, PendingResult>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<Filter>('pending')
  const [matchesLoading, setMatchesLoading] = useState(true)
  const [adminTab, setAdminTab] = useState<AdminTab>('results')

  // Add-match form state
  const [addHome, setAddHome] = useState('')
  const [addAway, setAddAway] = useState('')
  const [addKickoff, setAddKickoff] = useState('')
  const [addStage, setAddStage] = useState('R32')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')

  useEffect(() => {
    if (!authLoading && (!user || user.email !== ADMIN_EMAIL)) {
      navigate('/', { replace: true })
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return
    supabase
      .from('matches')
      .select('*')
      .order('kickoff_time', { ascending: true })
      .then(({ data }) => {
        setMatches(data ?? [])
        setMatchesLoading(false)
      })
  }, [user])

  if (authLoading || matchesLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <img src="/soccer-ball.png" alt="" className="w-12 h-12 animate-bounce" />
      </div>
    )
  }

  if (!user || user.email !== ADMIN_EMAIL) return null

  const isLocked = (kickoff: string) => new Date() >= new Date(kickoff)
  const pendingCount = matches.filter(m => isLocked(m.kickoff_time) && m.winner === null).length

  const displayedMatches = filter === 'pending'
    ? matches.filter(m => isLocked(m.kickoff_time) && m.winner === null)
    : matches

  async function submitResult(match: Match) {
    const p = pending[match.id]
    if (!p) return
    const h = parseInt(p.home)
    const a = parseInt(p.away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError(prev => ({ ...prev, [match.id]: 'Enter valid scores (0 or higher)' }))
      return
    }
    setSaving(match.id)
    setError(prev => { const n = { ...prev }; delete n[match.id]; return n })
    const winner = deriveWinner(h, a)
    const { error: err } = await supabase
      .from('matches')
      .update({ home_score: h, away_score: a, winner })
      .eq('id', match.id)
    if (err) {
      setError(prev => ({ ...prev, [match.id]: err.message }))
    } else {
      setMatches(prev => prev.map(m =>
        m.id === match.id ? { ...m, home_score: h, away_score: a, winner } : m
      ))
      setPending(prev => { const n = { ...prev }; delete n[match.id]; return n })
      setSaved(prev => ({ ...prev, [match.id]: true }))
      setTimeout(() => setSaved(prev => { const n = { ...prev }; delete n[match.id]; return n }), 3000)
    }
    setSaving(null)
  }

  async function clearResult(matchId: string) {
    setSaving(matchId)
    const { error: err } = await supabase
      .from('matches')
      .update({ home_score: null, away_score: null, winner: null })
      .eq('id', matchId)
    if (!err) {
      setMatches(prev => prev.map(m =>
        m.id === matchId ? { ...m, home_score: null, away_score: null, winner: null } : m
      ))
    }
    setSaving(null)
  }

  async function handleAddMatch(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setAddSuccess('')
    if (!addHome.trim() || !addAway.trim()) {
      setAddError('Both team names are required.')
      return
    }
    if (addHome.trim().toLowerCase() === addAway.trim().toLowerCase()) {
      setAddError('Home and away teams must be different.')
      return
    }
    if (!addKickoff) {
      setAddError('Kickoff time is required.')
      return
    }
    setAddLoading(true)
    const { data, error: err } = await supabase
      .from('matches')
      .insert({
        team_home: addHome.trim(),
        team_away: addAway.trim(),
        kickoff_time: new Date(addKickoff).toISOString(),
        stage: addStage,
        group_label: null,
      })
      .select()
      .single()
    if (err) {
      setAddError(err.message)
    } else {
      setMatches(prev => [...prev, data].sort(
        (a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
      ))
      setAddSuccess(`Added: ${addHome.trim()} vs ${addAway.trim()}`)
      setAddHome('')
      setAddAway('')
      setAddKickoff('')
      setAddStage('R32')
    }
    setAddLoading(false)
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent'

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-white transition text-sm"
            >
              &larr; Back
            </button>
            <span className="font-bold text-lg">Admin</span>
          </div>
          <span className="text-xs text-gray-500">{user.email}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
            <div className="text-2xl font-bold text-white">{matches.length}</div>
            <div className="text-xs text-gray-400 mt-0.5">Total matches</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
            <div className={`text-2xl font-bold ${pendingCount > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
              {pendingCount}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">Need results</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-3 text-center border border-gray-800">
            <div className="text-2xl font-bold text-green-400">
              {matches.filter(m => m.winner !== null).length}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">Results set</div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-gray-900 p-1 mb-5 border border-gray-800">
          <button
            onClick={() => setAdminTab('results')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
              adminTab === 'results' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Enter Results
          </button>
          <button
            onClick={() => setAdminTab('add')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
              adminTab === 'add' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            + Add Match
          </button>
        </div>

        {/* ── ADD MATCH TAB ── */}
        {adminTab === 'add' && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h2 className="font-bold text-white mb-1">Add Knockout Fixture</h2>
            <p className="text-xs text-gray-500 mb-5">Use this for R32, R16, QF, SF, and Final once the bracket is set.</p>
            <form onSubmit={handleAddMatch} className="flex flex-col gap-4">
              {/* Stage */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Stage</label>
                <select
                  value={addStage}
                  onChange={e => setAddStage(e.target.value)}
                  className={inputCls}
                >
                  <option value="R32">Round of 32 (R32)</option>
                  <option value="R16">Round of 16 (R16)</option>
                  <option value="QF">Quarter-final (QF)</option>
                  <option value="SF">Semi-final (SF)</option>
                  <option value="F">Final (F)</option>
                  <option value="3rd">Third Place</option>
                </select>
              </div>

              {/* Teams */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Home team</label>
                  <input
                    list="teams-list"
                    type="text"
                    value={addHome}
                    onChange={e => setAddHome(e.target.value)}
                    placeholder="e.g. Germany"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Away team</label>
                  <input
                    list="teams-list"
                    type="text"
                    value={addAway}
                    onChange={e => setAddAway(e.target.value)}
                    placeholder="e.g. Argentina"
                    className={inputCls}
                  />
                </div>
              </div>
              <datalist id="teams-list">
                {KNOWN_TEAMS.map(t => <option key={t} value={t} />)}
              </datalist>

              {/* Kickoff */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Kickoff (your local time)</label>
                <input
                  type="datetime-local"
                  value={addKickoff}
                  onChange={e => setAddKickoff(e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Preview */}
              {addHome && addAway && addKickoff && (
                <div className="bg-gray-800 rounded-xl p-3 text-center text-sm text-gray-300">
                  <span className="font-semibold text-white">{flag(addHome)} {addHome}</span>
                  <span className="text-gray-500 mx-2">vs</span>
                  <span className="font-semibold text-white">{addAway} {flag(addAway)}</span>
                  <div className="text-xs text-gray-500 mt-1">
                    {addStage} &middot; {formatKickoff(addKickoff)}
                  </div>
                </div>
              )}

              {addError && <p className="text-red-400 text-sm">{addError}</p>}
              {addSuccess && <p className="text-green-400 text-sm font-medium">{addSuccess}</p>}

              <button
                type="submit"
                disabled={addLoading}
                className="w-full bg-yellow-500 text-gray-900 font-bold py-3 rounded-xl hover:bg-yellow-400 transition disabled:opacity-60 text-sm"
              >
                {addLoading ? 'Adding...' : 'Add Match'}
              </button>
            </form>
          </div>
        )}

        {/* ── RESULTS TAB ── */}
        {adminTab === 'results' && (
          <>
            {/* Filter toggle */}
            <div className="flex rounded-xl bg-gray-900 p-1 mb-4 border border-gray-800">
              {(['pending', 'all'] as Filter[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${
                    filter === f ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {f === 'pending'
                    ? `Needs Result${pendingCount > 0 ? ` (${pendingCount})` : ''}`
                    : 'All Matches'}
                </button>
              ))}
            </div>

            {displayedMatches.length === 0 ? (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center text-gray-500 text-sm">
                {filter === 'pending' ? 'All played matches have results entered.' : 'No matches found.'}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {displayedMatches.map(match => {
                  const locked = isLocked(match.kickoff_time)
                  const hasResult = match.winner !== null
                  const p = pending[match.id]
                  const homeVal = p?.home ?? (hasResult ? String(match.home_score) : '')
                  const awayVal = p?.away ?? (hasResult ? String(match.away_score) : '')
                  const isDirty = p !== undefined
                  const isSaving = saving === match.id
                  const justSaved = saved[match.id]

                  return (
                    <div
                      key={match.id}
                      className={`rounded-2xl border p-4 transition ${
                        hasResult
                          ? 'bg-gray-900 border-gray-700'
                          : locked
                          ? 'bg-gray-900 border-yellow-800/60'
                          : 'bg-gray-900 border-gray-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-500">
                          {match.group_label ? `Group ${match.group_label}` : match.stage}
                          {' · '}{formatKickoff(match.kickoff_time)}
                        </span>
                        <div className="flex items-center gap-2">
                          {!locked && <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">upcoming</span>}
                          {hasResult && <span className="text-xs text-green-400 font-medium">result set</span>}
                          {locked && !hasResult && <span className="text-xs text-yellow-400 font-medium">needs result</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">
                            {flag(match.team_home)} {match.team_home}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <input
                            type="number" min={0} max={20}
                            value={homeVal}
                            disabled={!locked || isSaving}
                            onChange={e => setPending(prev => ({
                              ...prev,
                              [match.id]: { home: e.target.value, away: prev[match.id]?.away ?? awayVal },
                            }))}
                            placeholder="--"
                            className={`w-11 text-center rounded-lg py-2 text-base font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500 transition ${
                              !locked
                                ? 'bg-gray-800 border border-gray-700 text-gray-600 cursor-not-allowed'
                                : hasResult && !isDirty
                                ? 'bg-gray-800 border border-gray-600 text-white'
                                : 'bg-gray-800 border border-yellow-700 text-white'
                            }`}
                          />
                          <span className="text-gray-500 font-bold">-</span>
                          <input
                            type="number" min={0} max={20}
                            value={awayVal}
                            disabled={!locked || isSaving}
                            onChange={e => setPending(prev => ({
                              ...prev,
                              [match.id]: { home: prev[match.id]?.home ?? homeVal, away: e.target.value },
                            }))}
                            placeholder="--"
                            className={`w-11 text-center rounded-lg py-2 text-base font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500 transition ${
                              !locked
                                ? 'bg-gray-800 border border-gray-700 text-gray-600 cursor-not-allowed'
                                : hasResult && !isDirty
                                ? 'bg-gray-800 border border-gray-600 text-white'
                                : 'bg-gray-800 border border-yellow-700 text-white'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                          <div className="text-sm font-semibold text-white truncate">
                            {match.team_away} {flag(match.team_away)}
                          </div>
                        </div>
                      </div>

                      {isDirty && homeVal !== '' && awayVal !== '' && (
                        <div className="mt-2 text-xs text-gray-400 text-center">
                          Winner: <span className="text-yellow-300 font-semibold">
                            {(() => {
                              const h = parseInt(homeVal), a = parseInt(awayVal)
                              if (isNaN(h) || isNaN(a)) return '--'
                              return winnerLabel(h, a, match.team_home, match.team_away)
                            })()}
                          </span>
                        </div>
                      )}

                      {error[match.id] && (
                        <p className="mt-2 text-xs text-red-400 text-center">{error[match.id]}</p>
                      )}

                      {locked && (
                        <div className="mt-3 flex gap-2">
                          {isDirty && (
                            <button
                              onClick={() => submitResult(match)}
                              disabled={isSaving}
                              className="flex-1 bg-yellow-500 text-gray-900 text-sm font-bold py-2 rounded-xl hover:bg-yellow-400 transition disabled:opacity-60"
                            >
                              {isSaving ? 'Saving...' : justSaved ? 'Saved!' : 'Set Result'}
                            </button>
                          )}
                          {!isDirty && justSaved && (
                            <div className="flex-1 text-center text-sm text-green-400 font-semibold py-2">
                              Picks scored!
                            </div>
                          )}
                          {hasResult && !isDirty && (
                            <button
                              onClick={() => clearResult(match.id)}
                              disabled={isSaving}
                              className="px-3 py-2 text-xs text-gray-500 hover:text-red-400 transition disabled:opacity-60 rounded-xl hover:bg-gray-800"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
