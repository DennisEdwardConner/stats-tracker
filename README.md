# Stats Tracker

PvE match stats API. Postgres via Docker, Express, TypeScript, Vitest.

## Requirements

- Docker Desktop (Postgres 16-alpine)
- Node 18+ (uses global `fetch`)

## Setup

```bash
npm install
cp .env.example .env     # adjust if your DB creds differ
npm run db:up            # start Postgres (schema + seed auto-run on first init)
npm run dev              # API on http://localhost:3000
```

## Endpoints

- `GET /leaderboard`
- `GET /matches`
- `GET /kills` — supports `?limit=` (max 200) and `?offset=`
- `GET /deaths` — supports `?limit=` and `?offset=`
- `POST /kills` — record a kill (killer, victim type, assists, deaths, exp)

## Scripts

`npm test` · `npm run typecheck` · `npm run db:reset`