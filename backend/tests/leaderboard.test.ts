import { describe, it, expect } from "vitest";
import { computeLeaderboard } from "../src/services/leaderboard.js";
import type { Player, Kill, PlayerDeath } from "../src/types.js";

const p = (id: number, name: string): Player => ({
  id,
  externalId: `ext-${id}`,
  name,
});

const k = (
  killerId: number,
  assistIds: number[] = [],
  expAwarded = 10,
  id = 0,
): Kill => ({
  id,
  matchId: 1,
  killerId,
  victimType: "zombie",
  expAwarded,
  killedAt: new Date().toISOString(),
  assistIds,
});

const d = (playerId: number, id = 0): PlayerDeath => ({
  id,
  matchId: 1,
  playerId,
  killedBy: "zombie",
  diedAt: new Date().toISOString(),
});

describe("computeLeaderboard", () => {
  it("returns an empty board when there are no players", () => {
    expect(computeLeaderboard([], [])).toEqual([]);
  });

  it("includes players with zero stats", () => {
    const rows = computeLeaderboard([p(1, "alice")], []);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      playerId: 1, name: "alice",
      kills: 0, assists: 0, deaths: 0, exp: 0, kd: 0,
    });
  });

  it("counts a single kill and awards exp to the killer", () => {
    const rows = computeLeaderboard([p(1, "alice")], [k(1)]);
    expect(rows[0]).toMatchObject({ kills: 1, exp: 10, assists: 0 });
  });

  it("counts assists but does NOT award exp to assisters", () => {
    const rows = computeLeaderboard(
      [p(1, "alice"), p(2, "bob")],
      [k(1, [2])],
    );
    const alice = rows.find(r => r.playerId === 1)!;
    const bob   = rows.find(r => r.playerId === 2)!;
    expect(alice).toMatchObject({ kills: 1, exp: 10, assists: 0 });
    expect(bob).toMatchObject({ kills: 0, exp: 0, assists: 1 });
  });

  it("counts each assister once even if listed twice", () => {
    const rows = computeLeaderboard(
      [p(1, "alice"), p(2, "bob")],
      [k(1, [2, 2, 2])],
    );
    const bob = rows.find(r => r.playerId === 2)!;
    expect(bob.assists).toBe(1);
  });

  it("ignores a self-assist", () => {
    const rows = computeLeaderboard([p(1, "alice")], [k(1, [1])]);
    expect(rows[0]).toMatchObject({ kills: 1, assists: 0 });
  });

  it("ignores unknown player ids in kills/assists/deaths", () => {
    const rows = computeLeaderboard(
      [p(1, "alice")],
      [k(999, [998])],
      [d(997)],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kills: 0, assists: 0, deaths: 0 });
  });

  it("sums exp across multiple kills", () => {
    const rows = computeLeaderboard(
      [p(1, "alice")],
      [k(1, [], 10), k(1, [], 25), k(1, [], 5)],
    );
    expect(rows[0]).toMatchObject({ kills: 3, exp: 40 });
  });

  it("computes kd as kills / max(deaths, 1)", () => {
    const rows = computeLeaderboard(
      [p(1, "alice"), p(2, "bob")],
      [k(1), k(1), k(1)],
      [d(1)],
    );
    const alice = rows.find(r => r.playerId === 1)!;
    const bob   = rows.find(r => r.playerId === 2)!;
    expect(alice.kd).toBe(3);
    expect(bob.kd).toBe(0);
  });

  it("sorts by kills desc, then assists desc, then exp desc, then name", () => {
    const players = [p(1, "alice"), p(2, "bob"), p(3, "carol"), p(4, "dave")];
    const kills: Kill[] = [
      k(1, [], 10, 1),
      k(1, [], 10, 2),
      k(2, [3], 10, 3),
      k(2, [], 10, 4),
      k(4, [3], 10, 5),
    ];
    const rows = computeLeaderboard(players, kills);
    expect(rows.map(r => r.name)).toEqual(["alice", "bob", "dave", "carol"]);
  });
});