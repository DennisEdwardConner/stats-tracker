import "dotenv/config";
import express from "express";
import { getPlayers, getMatches, getKills, getDeaths, recordKill } from "./db.js";
import { computeLeaderboard } from "./services/leaderboard.js";

const app = express();
app.use(express.json());

app.get("/leaderboard", async (_req, res) => {
  try {
    const [players, kills, deaths] = await Promise.all([
      getPlayers(),
      getKills(),
      getDeaths(),
    ]);
    res.json(computeLeaderboard(players, kills, deaths));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  }
});

app.get("/kills", async (_req, res) => {
  try {
    res.json(await getKills());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  }
});

app.get("/deaths", async (_req, res) => {
  try {
    res.json(await getDeaths());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  }
});

app.get("/matches", async (_req, res) => {
  try {
    res.json(await getMatches());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  }
});

app.post("/kills", async (req, res) => {
  const body = req.body ?? {};

  const { matchId, killerId, victimType, expAwarded } = body;
  const assistIds = body.assistIds ?? [];
  const deaths = body.deaths ?? [];

  if (
    !Number.isInteger(matchId) ||
    !Number.isInteger(killerId) ||
    typeof victimType !== "string" ||
    victimType.length === 0 ||
    !Number.isInteger(expAwarded) ||
    !Array.isArray(assistIds) ||
    !assistIds.every(Number.isInteger) ||
    !Array.isArray(deaths) ||
    !deaths.every(
      (d: unknown) =>
        d !== null &&
        typeof d === "object" &&
        Number.isInteger((d as { playerId?: unknown }).playerId) &&
        typeof (d as { killedBy?: unknown }).killedBy === "string" &&
        (d as { killedBy: string }).killedBy.length > 0,
    )
  ) {
    return res.status(400).json({ error: "invalid_body" });
  }

  try {
    const result = await recordKill({
      matchId,
      killerId,
      victimType,
      expAwarded,
      assistIds,
      deaths,
    });
    res.status(201).json(result);
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "23503") return res.status(400).json({ error: "invalid_reference" });
    if (code === "23502") return res.status(400).json({ error: "missing_field" });
    if (code === "22P02") return res.status(400).json({ error: "invalid_type" });
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  }
});

app.listen(3000, () => console.log("listening on 3000"));