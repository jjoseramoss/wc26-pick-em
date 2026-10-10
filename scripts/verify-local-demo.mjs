// Integration check through the same public API used by the React app.
// Requires `supabase start`, `scripts/load-local-demo.sh`, and .env.local.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .trim()
    .split('\n')
    .map((line) => {
      const separator = line.indexOf('=')
      return [line.slice(0, separator), line.slice(separator + 1)]
    }),
)

const url = new URL(env.VITE_SUPABASE_URL)
assert.equal(url.hostname, '127.0.0.1', 'Refusing to test against a hosted project')
assert.equal(url.port, '54321', 'Expected the local Supabase API port')

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const demoSeasonId = 'd0000000-0000-4000-8000-000000000002'
const demoMatchId = 'd0000000-0000-4000-8000-000000000006'
const worldCupSeasonId = '26000000-0000-4000-8000-000000000026'

function checked(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`)
  return result.data
}

async function main() {
  const seasons = checked(
    await supabase.from('seasons').select('id, label'),
    'Load seasons',
  )
  assert(seasons.some((season) => season.id === demoSeasonId))

  const email = `demo-${randomUUID()}@example.test`
  const password = `Demo-${randomUUID()}`
  const signup = await supabase.auth.signUp({ email, password })
  const user = checked(signup, 'Sign up').user
  assert(user, 'A local test user should be created')
  assert(signup.data.session, 'Local signup should return a session')

  const group = checked(
    await supabase.rpc('create_pickem_group', {
      p_name: `Demo friends ${randomUUID().slice(0, 8)}`,
      p_display_name: 'Demo player',
      p_season_id: demoSeasonId,
    }),
    'Create demo group',
  )
  assert.equal(group.season_id, demoSeasonId)

  const memberships = checked(
    await supabase.from('group_members').select('group_id').eq('user_id', user.id),
    'Load memberships',
  )
  assert(memberships.some((membership) => membership.group_id === group.id))

  const fixtures = checked(
    await supabase.from('matches').select('id, season_id, kickoff_time')
      .eq('season_id', group.season_id),
    'Load group fixtures',
  )
  assert.equal(fixtures.length, 1)
  assert.equal(fixtures[0].id, demoMatchId)
  assert(new Date(fixtures[0].kickoff_time) > new Date())

  const pick = checked(
    await supabase.from('picks').insert({
      user_id: user.id,
      group_id: group.id,
      match_id: demoMatchId,
      home_score_pred: 2,
      away_score_pred: 1,
    }).select('id, points').single(),
    'Save a future pick',
  )
  assert(pick.id)
  assert.equal(pick.points, null, 'No points before a final result')

  const worldCupGroup = checked(
    await supabase.rpc('create_pickem_group', {
      p_name: `Other season ${randomUUID().slice(0, 8)}`,
      p_display_name: 'Demo player',
      p_season_id: worldCupSeasonId,
    }),
    'Create a group in a different season',
  )
  const wrongSeason = await supabase.from('picks').insert({
    user_id: user.id,
    group_id: worldCupGroup.id,
    match_id: demoMatchId,
    home_score_pred: 1,
    away_score_pred: 1,
  })
  assert.equal(wrongSeason.error?.code, '23514')

  console.log('PASS: seasons, group membership, fixture filtering, pick save, and cross-season rejection')
  console.log(`Local demo season: ${demoSeasonId}`)
  console.log(`Local demo fixture: ${demoMatchId}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
