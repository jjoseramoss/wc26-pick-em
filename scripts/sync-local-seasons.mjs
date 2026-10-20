import { execFileSync } from 'node:child_process'

const selected = ['PL', 'PD', 'BL1', 'SA', 'FL1']
const codes = process.argv.slice(2)
const requested = codes.length ? codes : selected

if (requested.some((code) => !selected.includes(code))) {
  throw new Error(`Choose from: ${selected.join(', ')}`)
}

const status = execFileSync('supabase', ['status', '-o', 'env'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
})
const secret = status.match(/^SECRET_KEY=(.*)$/m)?.[1]?.replace(/^"|"$/g, '')
if (!secret) throw new Error('Start local Supabase before syncing seasons')

for (const [index, code] of requested.entries()) {
  const response = await fetch('http://127.0.0.1:54321/functions/v1/sync-football-data', {
    method: 'POST',
    headers: { apikey: secret, 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(`${code} sync failed (${response.status}): ${JSON.stringify(result)}`)
  }
  console.log(`${code}: ${result.fixtures} fixtures, ${result.changed} changed`)
  if (index < requested.length - 1) {
    await new Promise((resolve) => setTimeout(resolve, 6500))
  }
}
