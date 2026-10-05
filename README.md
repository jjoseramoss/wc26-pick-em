# ⚽ Pick'em 26

A scoreline prediction app for the 2026 FIFA World Cup. Compete with friends and family — pick the exact score of every match, earn points, and climb the leaderboard.

**Live:** [https://wc26-pick-em.vercel.app/](https://wc26-pick-em.vercel.app)

---

Deploy the database migrations and frontend together; the updated group flows require the database functions in this repository.

## What it does

- **Pick every match** — predict the exact scoreline before kickoff. Picks lock automatically when the match starts.
- **Earn points** — 3 pts for the exact score, 1 pt for the correct result, 0 for a miss.
- **Private groups** — create a group, share a 6-character invite code with your crew, and compete on a leaderboard.
- **Group leaderboard** — points are recalculated when a result is entered or corrected; refresh the dashboard to see changes made by other people.
- **Mobile-first** — designed to be used on your phone during match day.

## Tech stack

| Layer        | Tech                                  |
| ------------ | ------------------------------------- |
| Frontend     | React, TypeScript, Tailwind CSS       |
| Backend / DB | Supabase (PostgreSQL, Auth) |
| Deployment   | Vercel                                |

No custom backend server — Supabase handles auth and the database. The app currently fetches data on page load and after local pick changes; live subscriptions are a future improvement.

## Features

- Email auth with Supabase (sign up / sign in)
- Create a private group → database-generated 6-char invite code and automatic creator membership
- Join a group via a database-verified invite code
- Pick submission with scoreline inputs, locked at kickoff
- Points calculated by a PostgreSQL trigger when a trusted process sets or corrects the result
- Group leaderboard with point totals — shows all members even at 0 pts
- Browser users cannot edit match results or award themselves points
- "How to Play" modal so anyone can jump in without explanation

## Scoring

| Prediction                             | Points |
| -------------------------------------- | ------ |
| Exact scoreline (e.g. 2-1, result 2-1) | 3 pts  |
| Correct result / draw, wrong score     | 1 pt   |
| Wrong result                           | 0 pts  |

## Database schema

```
groups          — id, name, invite_code, created_by
group_members   — group_id, user_id, display_name
matches         — id, team_home, team_away, kickoff_time, stage, home_score, away_score, winner
picks           — id, user_id, match_id, group_id, home_score_pred, away_score_pred, points
```

Points are computed by a database trigger when a result is set or corrected. Predictions score the stored scoreline; a match tied after extra time is a draw for pick scoring even if one team advances on penalties. A result importer is planned but not built yet.

## Data access

The browser uses the Supabase publishable key. PostgreSQL grants and row-level security decide what that browser can read or change. Group creation and joining use database functions so the invite code is checked on the server and the creator's membership is inserted in the same transaction.

The SQL in `supabase/migrations/` is the reproducible database history. Apply it to a local or development Supabase project before applying it to the hosted project. A hosted migration must be coordinated with the frontend deployment because the app now calls group RPCs and updates only predicted score columns.

## Running locally

```bash
git clone https://github.com/your-username/world-cup-pickems
cd world-cup-pickems
npm install
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

For Codespaces, start the app with:

```bash
npm run dev:host
```

## Testing

Scoring logic is unit tested with Vitest:

```bash
npm test
```

Covers exact scoreline, correct result, wrong result, draws, and edge cases like 0-0 and high-scoring games.

Database policy and scoring-flow tests are in `supabase/tests/`. With the Supabase CLI and Docker installed, use:

```bash
supabase start
supabase test db
```

The [test workflow](.github/workflows/test.yml) runs both frontend and database tests on pushes and pull requests. It does not deploy the database.

## Deployment

Deployed on Vercel via GitHub integration — every push to `main` triggers a production deploy.

---

Built for the 2026 World Cup. USA · Canada · Mexico.
