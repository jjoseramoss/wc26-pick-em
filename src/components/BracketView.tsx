import { useState, useMemo } from 'react'
import { supabase } from '../utils/supabase'
import type { Group } from '../context/GroupContext'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Match {
  id: string
  team_home: string
  team_away: string
  kickoff_time: string
  stage: string
  home_score: number | null
  away_score: number | null
  winner: string | null
  match_number: number | null
}

interface Pick {
  id: string
  match_id: string
  home_score_pred: number
  away_score_pred: number
  points: number | null
}

interface User {
  id: string
  email?: string
}

interface BracketViewProps {
  allMatches: Match[]
  picks: Record<string, Pick>
  onPickSaved: (matchId: string, pick: Pick) => void
  activeGroup: Group | null
  user: User | null
}

// ─────────────────────────────────────────────
// Bracket structure (FIFA match numbers)
// ─────────────────────────────────────────────

const LEFT_COLUMNS = [
  { label: 'R32', matchNums: [74, 77, 73, 75, 83, 84, 81, 82] },
  { label: 'R16', matchNums: [89, 90, 93, 94] },
  { label: 'QF',  matchNums: [97, 98] },
  { label: 'SF',  matchNums: [101] },
]

// Right side: SF closest to center → R32 on far right
const RIGHT_COLUMNS = [
  { label: 'SF',  matchNums: [102] },
  { label: 'QF',  matchNums: [99, 100] },
  { label: 'R16', matchNums: [91, 92, 95, 96] },
  { label: 'R32', matchNums: [76, 78, 79, 80, 86, 88, 85, 87] },
]

const TOTAL_HEIGHT = 800 // px — column height, all columns share this

// ─────────────────────────────────────────────
// Flags
// ─────────────────────────────────────────────

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
  return iso ? `https://flagcdn.com/w40/${iso}.png` : null
}

function isLocked(kickoff: string) {
  return new Date() >= new Date(kickoff)
}

// ─────────────────────────────────────────────
// BracketCard
// ─────────────────────────────────────────────

interface BracketCardProps {
  matchNum: number
  match: Match | undefined
  pick: Pick | undefined
  pendingPicks: Record<string, { home: string; away: string }>
  setPendingPicks: React.Dispatch<React.SetStateAction<Record<string, { home: string; away: string }>>>
  saving: string | null
  onSave: (matchId: string) => void
  hasGroup: boolean
}

function BracketCard({
  matchNum, match, pick,
  pendingPicks, setPendingPicks,
  saving, onSave, hasGroup,
}: BracketCardProps) {
  // No match row in DB yet → TBD
  if (!match) {
    return (
      <div className="w-[148px] rounded-lg border border-gray-200 overflow-hidden opacity-30">
        <div className="bg-gray-700 px-2 py-0.5">
          <span className="text-[9px] text-gray-400 font-mono">M{matchNum}</span>
        </div>
        <div className="bg-white px-2 py-1.5 space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 bg-gray-200 rounded-sm flex-shrink-0" />
            <span className="text-[11px] text-gray-400">TBD</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-3 bg-gray-200 rounded-sm flex-shrink-0" />
            <span className="text-[11px] text-gray-400">TBD</span>
          </div>
        </div>
      </div>
    )
  }

  const matchId = match.id
  const locked = isLocked(match.kickoff_time)
  const hasResult = match.winner !== null
  const pending = pendingPicks[matchId]
  const homeVal = pending?.home ?? (pick ? String(pick.home_score_pred) : '')
  const awayVal = pending?.away ?? (pick ? String(pick.away_score_pred) : '')
  const isDirty = pending !== undefined
  const isSaving = saving === matchId

  function setHome(v: string) {
    setPendingPicks(prev => ({ ...prev, [matchId]: { home: v, away: prev[matchId]?.away ?? awayVal } }))
  }
  function setAway(v: string) {
    setPendingPicks(prev => ({ ...prev, [matchId]: { home: prev[matchId]?.home ?? homeVal, away: v } }))
  }

  // Points badge colour
  const ptsBadge = pick?.points != null ? (
    pick.points === 3
      ? 'bg-yellow-400 text-black'
      : pick.points === 1
      ? 'bg-green-500 text-white'
      : 'bg-gray-300 text-gray-600'
  ) : null

  return (
    <div className="w-[148px] bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-black px-2 py-0.5 flex items-center justify-between gap-1">
        <span className="text-[9px] text-gray-400 font-mono truncate">
          M{matchNum} · {match.stage}
        </span>
        {ptsBadge && (
          <span className={`text-[9px] font-black px-1 rounded flex-shrink-0 ${ptsBadge}`}>
            {pick!.points}pt
          </span>
        )}
        {pick && !hasResult && (
          <span className="text-[9px] text-green-400 font-black flex-shrink-0">✓</span>
        )}
      </div>

      {/* Body */}
      <div className="px-2 py-1.5 space-y-1">
        {/* Home row */}
        <div className="flex items-center gap-1.5">
          {flagUrl(match.team_home)
            ? <img src={flagUrl(match.team_home)!} alt="" className="w-4 h-3 object-cover rounded-sm flex-shrink-0" />
            : <div className="w-4 h-3 bg-gray-200 rounded-sm flex-shrink-0" />
          }
          <span className={`text-[11px] font-bold truncate flex-1 ${
            hasResult && match.winner !== 'home' ? 'text-gray-400' : 'text-gray-900'
          }`}>
            {match.team_home}
          </span>
          {hasResult ? (
            <span className={`text-[11px] font-black flex-shrink-0 ${
              match.winner === 'home' ? 'text-black' : 'text-gray-400'
            }`}>
              {match.home_score}
            </span>
          ) : !locked ? (
            <input
              type="number" min={0} max={20}
              value={homeVal}
              onChange={e => setHome(e.target.value)}
              placeholder="?"
              className="w-6 text-[11px] text-center bg-gray-900 text-white rounded px-0.5 py-0 flex-shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          ) : null}
        </div>

        {/* Away row */}
        <div className="flex items-center gap-1.5">
          {flagUrl(match.team_away)
            ? <img src={flagUrl(match.team_away)!} alt="" className="w-4 h-3 object-cover rounded-sm flex-shrink-0" />
            : <div className="w-4 h-3 bg-gray-200 rounded-sm flex-shrink-0" />
          }
          <span className={`text-[11px] font-bold truncate flex-1 ${
            hasResult && match.winner !== 'away' ? 'text-gray-400' : 'text-gray-900'
          }`}>
            {match.team_away}
          </span>
          {hasResult ? (
            <span className={`text-[11px] font-black flex-shrink-0 ${
              match.winner === 'away' ? 'text-black' : 'text-gray-400'
            }`}>
              {match.away_score}
            </span>
          ) : !locked ? (
            <input
              type="number" min={0} max={20}
              value={awayVal}
              onChange={e => setAway(e.target.value)}
              placeholder="?"
              className="w-6 text-[11px] text-center bg-gray-900 text-white rounded px-0.5 py-0 flex-shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          ) : null}
        </div>

        {/* Pick result line (completed match) */}
        {pick && hasResult && (
          <div className="text-[9px] text-gray-400 pt-0.5 border-t border-gray-100 truncate">
            Pick: {pick.home_score_pred}–{pick.away_score_pred}
          </div>
        )}

        {/* Save button */}
        {isDirty && !hasResult && (
          <div className="pt-0.5">
            {hasGroup ? (
              <button
                onClick={() => onSave(matchId)}
                disabled={isSaving}
                className="w-full bg-yellow-400 text-black text-[9px] font-black rounded py-1 uppercase tracking-wide disabled:opacity-50"
              >
                {isSaving ? '...' : 'Save Pick'}
              </button>
            ) : (
              <p className="text-[9px] text-gray-400 text-center">Join a group first</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// BracketColumn
// ─────────────────────────────────────────────

interface BracketColumnProps {
  label: string
  matchNums: number[]
  matchMap: Record<number, Match>
  picks: Record<string, Pick>
  pendingPicks: Record<string, { home: string; away: string }>
  setPendingPicks: React.Dispatch<React.SetStateAction<Record<string, { home: string; away: string }>>>
  saving: string | null
  onSave: (matchId: string) => void
  hasGroup: boolean
}

function BracketColumn({ label, matchNums, matchMap, picks, pendingPicks, setPendingPicks, saving, onSave, hasGroup }: BracketColumnProps) {
  const labelColor = label === 'SF' || label === 'QF'
    ? 'text-yellow-500'
    : label === 'R16'
    ? 'text-blue-400'
    : 'text-gray-400'

  return (
    <div className="flex flex-col">
      <div className={`text-center text-[9px] font-black uppercase tracking-widest mb-1 ${labelColor}`}>
        {label}
      </div>
      <div className="flex flex-col" style={{ height: TOTAL_HEIGHT }}>
        {matchNums.map(n => (
          <div key={n} className="flex-1 flex items-center justify-center">
            <BracketCard
              matchNum={n}
              match={matchMap[n]}
              pick={matchMap[n] ? picks[matchMap[n].id] : undefined}
              pendingPicks={pendingPicks}
              setPendingPicks={setPendingPicks}
              saving={saving}
              onSave={onSave}
              hasGroup={hasGroup}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// BracketView (main export)
// ─────────────────────────────────────────────

export default function BracketView({ allMatches, picks, onPickSaved, activeGroup, user }: BracketViewProps) {
  const [pendingPicks, setPendingPicks] = useState<Record<string, { home: string; away: string }>>({})
  const [saving, setSaving] = useState<string | null>(null)

  // Build match_number → match lookup
  const matchMap = useMemo(() => {
    const map: Record<number, Match> = {}
    for (const m of allMatches) {
      if (m.match_number != null) map[m.match_number] = m
    }
    return map
  }, [allMatches])

  async function onSave(matchId: string) {
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
      onPickSaved(matchId, data as Pick)
      setPendingPicks(prev => { const n = { ...prev }; delete n[matchId]; return n })
    }
    setSaving(null)
  }

  const columnProps = {
    matchMap,
    picks,
    pendingPicks,
    setPendingPicks,
    saving,
    onSave,
    hasGroup: !!activeGroup,
  }

  return (
    <div>
      {/* Mobile scroll hint (hidden once the bracket fits full width) */}
      <p className="text-center text-[11px] text-gray-300 mb-2 tracking-wide lg:hidden">
        ← swipe to see full bracket →
      </p>

      <div className="overflow-x-auto -mx-4 lg:mx-0 scrollbar-wc pb-1">
        <div className="flex gap-1.5 px-4 pb-4 min-w-max lg:justify-center lg:w-full lg:px-2">

          {/* Left half: R32 → R16 → QF → SF */}
          {LEFT_COLUMNS.map(col => (
            <BracketColumn
              key={col.label + '-left'}
              label={col.label}
              matchNums={col.matchNums}
              {...columnProps}
            />
          ))}

          {/* Center: Final + 3rd Place */}
          <div className="flex flex-col w-[148px]">
            <div className="text-center text-[9px] font-black uppercase tracking-widest mb-1 text-yellow-400">
              Final
            </div>
            <div className="flex flex-col" style={{ height: TOTAL_HEIGHT }}>
              {/* Final (M104) in top half */}
              <div className="flex-1 flex flex-col items-center justify-end pb-3">
                <BracketCard matchNum={104} match={matchMap[104]} pick={matchMap[104] ? picks[matchMap[104].id] : undefined} {...columnProps} />
              </div>
              {/* 3rd Place (M103) in bottom half */}
              <div className="flex-1 flex flex-col items-center justify-start pt-3">
                <div className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">3rd Place</div>
                <BracketCard matchNum={103} match={matchMap[103]} pick={matchMap[103] ? picks[matchMap[103].id] : undefined} {...columnProps} />
              </div>
            </div>
          </div>

          {/* Right half: SF → QF → R16 → R32 */}
          {RIGHT_COLUMNS.map(col => (
            <BracketColumn
              key={col.label + '-right'}
              label={col.label}
              matchNums={col.matchNums}
              {...columnProps}
            />
          ))}

        </div>
      </div>
    </div>
  )
}
