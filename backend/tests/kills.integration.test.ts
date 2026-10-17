import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { pool, recordKill, getPlayers, getKills, getDeaths } from "../src/db.js";
import { computeLeaderboard } from "../src/services/leaderboard.js";

let matchId: number;
let killerId: number;
let assisterId: number;
let victimId: number;

beforeAll(async () => {
  const players = await getPlayers();
  killerId = players[0].id;
  assisterId = players[1].id;
  victimId = players[2].id;

  const m = await pool.query<{ id: number }>(
    `INSERT INTO matches (started_at) VALUES (now()) RETURNING id`,
  );
  matchId = m.rows[0].id;
});

afterAll(async () => {
  await pool.query(`DELETE FROM matches WHERE id = $1`, [matchId]);
  await pool.end();
});

describe("recordKill (integration, real Postgres)", () => {
  it("writes kill + assists + deaths and returns their ids", async () => {
    const before = await getKills();
    const beforeDeaths = await getDeaths();

    const result = await recordKill({
      matchId,
      killerId,
      victimType: "zombie",
      expAwarded: 10,
      assistIds: [assisterId],
      deaths: [{ playerId: victimId, killedBy: "zombie" }],
    });

    expect(result.killId).toBeGreaterThan(0);
    expect(result.assistIds).toEqual([assisterId]);
    expect(result.deathIds).toHaveLength(1);

    const after = await getKills();
    const killRow = after.find((k) => k.id === result.killId);
    expect(killRow).toBeDefined();
    expect(killRow!.killerId).toBe(killerId);
    expect(killRow!.victimType).toBe("zombie");
    expect(killRow!.expAwarded).toBe(10);
    expect(killRow!.assistIds).toEqual([assisterId]);

    expect((await getDeaths()).length).toBe(beforeDeaths.length + 1);
    expect(after.length).toBe(before.length + 1);
  });

  it("does not create a death when deaths omitted", async () => {
    const beforeDeaths = await getDeaths();

    const result = await recordKill({
      matchId,
      killerId,
      victimType: "goblin_archer",
      expAwarded: 25,
    });

    expect(result.deathIds).toEqual([]);
    expect((await getDeaths()).length).toBe(beforeDeaths.length);
  });

  it("ignores self-assist", async () => {
    const result = await recordKill({
      matchId,
      killerId,
      victimType: "zombie",
      expAwarded: 10,
      assistIds: [killerId],
    });
    expect(result.assistIds).toEqual([]);
  });

  it("leaderboard reflects the writes", async () => {
    const [players, kills, deaths] = await Promise.all([
      getPlayers(),
      getKills(),
      getDeaths(),
    ]);
    const board = computeLeaderboard(players, kills, deaths);
    const killerRow = board.find((r) => r.playerId === killerId)!;
    expect(killerRow.kills).toBeGreaterThanOrEqual(3);
    expect(killerRow.deaths).toBe(0);
  });
});