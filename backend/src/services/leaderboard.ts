import type { Player, Kill, PlayerDeath, LeaderboardRow } from "../types.js";

export function computeLeaderboard(
  players: Player[],
  kills: Kill[],
  deaths: PlayerDeath[] = [],
): LeaderboardRow[] {
  const byId = new Map<number, LeaderboardRow>();

  // seed every known player so nobody is missing from the board
  for (const p of players) {
    byId.set(p.id, {
      playerId: p.id,
      name: p.name,
      kills: 0,
      assists: 0,
      deaths: 0,
      exp: 0,
      kd: 0,
    });
  }

  // tally kills + exp (killer only)
  for (const k of kills) {
    const row = byId.get(k.killerId);
    if (!row) continue; // unknown player id -> ignore
    row.kills += 1;
    row.exp += k.expAwarded;

    // assists: count each unique assister once per kill
    for (const assistId of new Set(k.assistIds)) {
      const a = byId.get(assistId);
      if (!a) continue;
      if (assistId === k.killerId) continue; // don't self-assist
      a.assists += 1;
    }
  }

  // tally deaths
  for (const d of deaths) {
    const row = byId.get(d.playerId);
    if (!row) continue;
    row.deaths += 1;
  }

  // derive kd
  for (const row of byId.values()) {
    row.kd = row.kills / Math.max(row.deaths, 1);
  }

  // sort: kills desc, then assists desc, then exp desc, then name asc
  return [...byId.values()].sort((a, b) =>
    b.kills - a.kills ||
    b.assists - a.assists ||
    b.exp - a.exp ||
    a.name.localeCompare(b.name),
  );
}