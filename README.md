# ⚽ Pick'em 26

A real-time scoreline prediction app for the 2026 FIFA World Cup. Compete with friends and family — pick the exact score of every match, earn points, and climb the leaderboard.

**Live:** [your-url-here.vercel.app](https://your-url-here.vercel.app)

---

## What it does

- **Pick every match** — predict the exact scoreline before kickoff. Picks lock automatically when the match starts.
- **Earn points** — 3 pts for the exact score, 1 pt for the correct result, 0 for a miss.
- **Private groups** — create a group, share a 6-character invite code with your crew, and compete on a live leaderboard.
- **Real-time updates** — leaderboard updates instantly via Supabase subscriptions as results come in.
- **Mobile-first** — designed to be used on your phone during match day.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React, TypeScript, Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL, Auth, Realtime) |
| Deployment | Vercel |

No custom backend server — Supabase handles auth, the database, and real-time subscriptions.

## Features

- Email auth with Supabase (sign up / sign in)
- Create a private group → auto-generated 6-char invite code
- Join a group via invite code
- Pick submission with scoreline inputs, locked at kickoff
- Points calculated automatically via a PostgreSQL trigger when an admin sets the result
- Group leaderboard with real-time point totals — shows all members even at 0 pts
- Admin view to enter results and add knockout-round fixtures
- "How to Play" modal so anyone can jump in without explanation

## Scoring

| Prediction | Points |
|---|---|
| Exact scoreline (e.g. 2-1, result 2-1) | 3 pts |
| Correct result / draw, wrong score | 1 pt |
| Wrong result | 0 pts |

## Database schema

```
groups          — id, name, invite_code, created_by
group_members   — group_id, user_id, display_name
matches         — id, team_home, team_away, kickoff_time, stage, home_score, away_score, winner
picks           — id, user_id, match_id, group_id, home_score_pred, away_score_pred, points
```

Points are computed by a `score_picks()` trigger that fires after a match result is updated — no application-layer scoring logic required.

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

## Deployment

Deployed on Vercel via GitHub integration — every push to `main` triggers a production deploy.

---

Built for the 2026 World Cup. USA · Canada · Mexico.
