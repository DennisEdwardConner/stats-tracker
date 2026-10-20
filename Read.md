# Stats Tracker

PvE match stats API. Postgres via Docker, Express, TypeScript, Vitest.

## Requirements

- Docker Desktop (Postgres 16-alpine)
- Node 18+ (uses global `fetch`)

## Setup

```bash
docker compose up -d          # start Postgres
npm install