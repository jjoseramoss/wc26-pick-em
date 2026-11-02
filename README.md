# Pickem

A soccer scoreline prediction app for friends. Create a private group for a season, make picks before kickoff, and compare results on a group leaderboard. I started this for the 2026 World Cup and expanded it to ongoing club seasons while keeping the World Cup data as history.

**Live:** [https://wc26-pick-em.vercel.app/](https://wc26-pick-em.vercel.app)

## What you can do

- Create or join a private group with a six-character invite code. Each group follows one season.
- Predict match scorelines before kickoff. The database enforces the pick deadline.
- See your points and group standings after final results arrive. A corrected result recalculates affected picks.
- Use the desktop dashboard or mobile navigation, and update your account name and email.

Current automated seasons are Premier League, La Liga, Bundesliga, Serie A, and Ligue 1 **2026/27**, plus Liga MX **Apertura 2026 regular season**. Completed fixtures remain visible as history; only upcoming fixtures accept picks.

## Tech stack

| Layer | Tech |
| --- | --- |
| Frontend | React, TypeScript, Tailwind CSS |
| Data and auth | Supabase PostgreSQL and Auth |
| Background imports | Supabase Edge Functions and Cron |
| Hosting | Vercel |

There is no separate Node server. The browser uses the Supabase client; scheduled Edge Functions handle provider requests and trusted database writes.

## How results become points

```text
football-data.org / ESPN
          ↓
Supabase Cron → private Edge Function → matches table
                                      ↓ result changes
                              PostgreSQL scoring trigger
                                      ↓
                                picks.points → leaderboard
```

Cron invokes the import functions every two hours. They save fixtures, kickoff changes, statuses, and final scorelines using stable provider IDs, so an update does not create a new match or detach existing picks. The **functions do not calculate points**: an `UPDATE` to a match result runs the PostgreSQL trigger, which scores every pick for that match. The same trigger handles later result corrections. The browser cannot edit results or points.

Points are based on the stored scoreline:

| Prediction | Points |
| --- | ---: |
| Exact scoreline | 3 |
| Correct win/draw/loss, different scoreline | 1 |
| Incorrect result | 0 |

A match tied after extra time counts as a draw for pick scoring, even if one team advances on penalties. Points remain unset until a final result is saved.

## Data model

```
competitions    — id, name, kind
seasons         — id, competition_id, label
season_phases   — id, season_id, name, format
teams           — id, name
season_teams    — season_id, team_id
groups          — id, season_id, name, invite_code, created_by
group_members   — group_id, user_id, display_name
matches         — id, season_id, phase_id, team_home, team_away, kickoff_time, home_score, away_score, winner
picks           — id, user_id, match_id, group_id, home_score_pred, away_score_pred, points
```

Fixtures and results are shared across groups; a pick belongs to a specific user, match, and group. That lets two groups use the same real result while keeping their predictions and standings separate.

## Scope and limitations

- `sync-football-data` imports the five listed European leagues from football-data.org. `sync-liga-mx` imports Liga MX from ESPN's public scoreboard.
- These importers target the named **2026/27** and **Apertura 2026** seasons. Adding a future season requires updating and deploying the importer and its schedule; season rollover is not automatic yet.
- Liga MX currently includes the Apertura regular season, not playoffs. ESPN's feed is undocumented, so the importer validates the expected 153 fixtures, 18 teams, and match states before writing data. A provider change can stop that import until it is reviewed.
- Results can appear after a match ends because they depend on the provider and the next scheduled sync. The dashboard fetches data on load and after local pick changes; it does not currently push live updates to open browsers.

## Data access

The browser uses the Supabase publishable key. PostgreSQL grants and row-level security decide what that browser can read or change. Group creation and joining use database functions so the invite code is checked on the server and the creator's membership is inserted in the same transaction.

The SQL in `supabase/migrations/` is the reproducible database history. Apply it to a local or development Supabase project before applying it to the hosted project. A hosted migration must be coordinated with the frontend deployment because the app now calls group RPCs and updates only predicted score columns.

## Running locally

```bash
git clone https://github.com/jjoseramoss/wc26-pick-em.git
cd wc26-pick-em
npm ci
```

Create a `.env.local` from the example file:

```bash
cp .env.local.example .env.local
```

Then fill in your Supabase values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Start the app with `npm run dev`. For Codespaces, use:

```bash
npm run dev:host
```

### Try the local demo league

With the Supabase CLI and a Docker-compatible runtime running:

```bash
supabase start
bash scripts/load-local-demo.sh
supabase status -o env
```

If OrbStack is running but `docker` is not on your Mac's PATH, run
`export PATH="/Applications/OrbStack.app/Contents/MacOS/xbin:$PATH"` in that
terminal first.

Use the local `API_URL` and `PUBLISHABLE_KEY` from the last command as
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in your ignored
`.env.local`. Restart `npm run dev` after changing that file. Sign up locally,
open `/groups`, and create a group for **Practice 2026/27**. Its one future
fixture is **Northside FC vs Southside FC** in the Picks tab.

The demo SQL is [supabase/seed.local-demo.sql](supabase/seed.local-demo.sql).
It is loaded only through the local Docker database; it is not a migration or
hosted seed. You can verify the API flow with `node scripts/verify-local-demo.mjs`.
To return localhost to the hosted project, remove or rename `.env.local` and
restart Vite; the ignored `.env` will then be used.

## Testing

Scoring and provider normalization are unit tested with Vitest:

```bash
npm test
```

The tests cover scorelines, draws, provider statuses, and fixture mapping.

Database access, group flows, and scoring triggers are tested in `supabase/tests/`. With the Supabase CLI and a Docker-compatible runtime, use:

```bash
supabase start
supabase test db
```

The [test workflow](.github/workflows/test.yml) runs both frontend and database tests on pushes and pull requests. It does not deploy the database.

## Deployment

Vercel deploys the frontend from `main`. Database migrations, Edge Functions, their secrets, and Cron schedules are deployed separately to Supabase; a frontend deploy alone does not install the background jobs.

---

Started for the 2026 World Cup; now built for ongoing soccer seasons.
