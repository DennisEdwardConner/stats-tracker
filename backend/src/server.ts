import "dotenv/config";
import express from "express";
import { getPlayers, getKills, getDeaths } from "./db.js";
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

app.listen(3000, () => console.log("listening on 3000"));