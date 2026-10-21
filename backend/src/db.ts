import pg from "pg";
import type { Player, Match, Kill, PlayerDeath } from "./types.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function getPlayers(): Promise<Player[]> {
  const { rows } = await pool.query<{
    id: number;
    external_id: string;
    name: string;
  }>("SELECT id, external_id, name FROM players ORDER BY id");

  return rows.map((r) => ({
    id: r.id,
    externalId: r.external_id,
    name: r.name,
  }));
}

export async function getMatches(): Promise<Match[]> {
  const { rows } = await pool.query<{
    id: number;
    started_at: Date;
    ended_at: Date | null;
  }>("SELECT id, started_at, ended_at FROM matches ORDER BY id");

  return rows.map((r) => ({
    id: r.id,
    startedAt: r.started_at.toISOString(),
    endedAt: r.ended_at ? r.ended_at.toISOString() : null,
  }));
}

export type Page = { limit: number; offset: number };

type KillRow = {
  id: number;
  match_id: number;
  killer_id: number;
  victim_type: string;
  exp_awarded: number;
  killed_at: Date;
};

const KILL_COLS =
  "id, match_id, killer_id, victim_type, exp_awarded, killed_at";

async function attachAssists(rows: KillRow[]): Promise<Kill[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const { rows: assistRows } = await pool.query<{
    kill_id: number;
    player_id: number;
  }>(
    "SELECT kill_id, player_id FROM kill_assists WHERE kill_id = ANY($1)",
    [ids],
  );

  const byKill = new Map<number, number[]>();
  for (const a of assistRows) {
    const list = byKill.get(a.kill_id) ?? [];
    list.push(a.player_id);
    byKill.set(a.kill_id, list);
  }

  return rows.map((r) => ({
    id: r.id,
    matchId: r.match_id,
    killerId: r.killer_id,
    victimType: r.victim_type,
    expAwarded: r.exp_awarded,
    killedAt: r.killed_at.toISOString(),
    assistIds: byKill.get(r.id) ?? [],
  }));
}

export async function getKills(
  page: Page = { limit: 50, offset: 0 },
): Promise<Kill[]> {
  const { rows } = await pool.query<KillRow>(
    `SELECT ${KILL_COLS} FROM kills ORDER BY id LIMIT $1 OFFSET $2`,
    [page.limit, page.offset],
  );
  return attachAssists(rows);
}

export async function getAllKills(): Promise<Kill[]> {
  const { rows } = await pool.query<KillRow>(
    `SELECT ${KILL_COLS} FROM kills ORDER BY id`,
  );
  return attachAssists(rows);
}

type DeathRow = {
  id: number;
  match_id: number;
  player_id: number;
  killed_by: string;
  died_at: Date;
};

const DEATH_COLS = "id, match_id, player_id, killed_by, died_at";

function toDeath(r: DeathRow): PlayerDeath {
  return {
    id: r.id,
    matchId: r.match_id,
    playerId: r.player_id,
    killedBy: r.killed_by,
    diedAt: r.died_at.toISOString(),
  };
}

export async function getDeaths(
  page: Page = { limit: 50, offset: 0 },
): Promise<PlayerDeath[]> {
  const { rows } = await pool.query<DeathRow>(
    `SELECT ${DEATH_COLS} FROM player_deaths ORDER BY id LIMIT $1 OFFSET $2`,
    [page.limit, page.offset],
  );
  return rows.map(toDeath);
}

export async function getAllDeaths(): Promise<PlayerDeath[]> {
  const { rows } = await pool.query<DeathRow>(
    `SELECT ${DEATH_COLS} FROM player_deaths ORDER BY id`,
  );
  return rows.map(toDeath);
}

export type DeathInput = { playerId: number; killedBy: string };
export type KillInput = {
  matchId: number;
  killerId: number;
  victimType: string;
  expAwarded: number;
  assistIds?: number[];
  deaths?: DeathInput[];
};
export type KillResult = {
  killId: number;
  assistIds: number[];
  deathIds: number[];
};

export async function recordKill(input: KillInput): Promise<KillResult> {
  const {
    matchId,
    killerId,
    victimType,
    expAwarded,
    assistIds = [],
    deaths = [],
  } = input;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const killRes = await client.query<{ id: number }>(
      `INSERT INTO kills (match_id, killer_id, victim_type, exp_awarded)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [matchId, killerId, victimType, Math.abs(expAwarded)],
    );
    const killId = killRes.rows[0].id;

    // unique assister per kill (PK is (kill_id, player_id)); ignore self-assist
    const uniqueAssists = [...new Set(assistIds)].filter((id) => id !== killerId);
    const insertedAssistIds: number[] = [];
    for (const playerId of uniqueAssists) {
      const a = await client.query<{ player_id: number }>(
        `INSERT INTO kill_assists (kill_id, player_id)
         VALUES ($1, $2)
         RETURNING player_id`,
        [killId, playerId],
      );
      insertedAssistIds.push(a.rows[0].player_id);
    }

    // deaths attach to the match, not the kill
    const insertedDeathIds: number[] = [];
    for (const d of deaths) {
      const r = await client.query<{ id: number }>(
        `INSERT INTO player_deaths (match_id, player_id, killed_by)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [matchId, d.playerId, d.killedBy],
      );
      insertedDeathIds.push(r.rows[0].id);
    }

    await client.query("COMMIT");
    return { killId, assistIds: insertedAssistIds, deathIds: insertedDeathIds };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}