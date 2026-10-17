import pg from "pg";
import type { Player, Kill, PlayerDeath } from "./types.js";

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

export async function getKills(): Promise<Kill[]> {
  // one query for kills, one for assists, then stitch them together in JS.
  const killsQ = pool.query<{
    id: number;
    match_id: number;
    killer_id: number;
    victim_type: string;
    exp_awarded: number;
    killed_at: Date;
  }>(
    `SELECT id, match_id, killer_id, victim_type, exp_awarded, killed_at
       FROM kills
      ORDER BY id`,
  );

  const assistsQ = pool.query<{
    kill_id: number;
    player_id: number;
  }>("SELECT kill_id, player_id FROM kill_assists");

  const [killsRes, assistsRes] = await Promise.all([killsQ, assistsQ]);

  const assistsByKill = new Map<number, number[]>();
  for (const a of assistsRes.rows) {
    const list = assistsByKill.get(a.kill_id) ?? [];
    list.push(a.player_id);
    assistsByKill.set(a.kill_id, list);
  }

  return killsRes.rows.map((r) => ({
    id: r.id,
    matchId: r.match_id,
    killerId: r.killer_id,
    victimType: r.victim_type,
    expAwarded: r.exp_awarded,
    killedAt: r.killed_at.toISOString(),
    assistIds: assistsByKill.get(r.id) ?? [],
  }));
}

export async function getDeaths(): Promise<PlayerDeath[]> {
  const { rows } = await pool.query<{
    id: number;
    match_id: number;
    player_id: number;
    killed_by: string;
    died_at: Date;
  }>(
    `SELECT id, match_id, player_id, killed_by, died_at
       FROM player_deaths
      ORDER BY id`,
  );

  return rows.map((r) => ({
    id: r.id,
    matchId: r.match_id,
    playerId: r.player_id,
    killedBy: r.killed_by,
    diedAt: r.died_at.toISOString(),
  }));
}