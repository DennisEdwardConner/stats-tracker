CREATE TABLE players (
  id           SERIAL PRIMARY KEY,
  external_id  TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE matches (
  id          SERIAL PRIMARY KEY,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at    TIMESTAMPTZ
);

CREATE TABLE kills (
  id           SERIAL PRIMARY KEY,
  match_id     INT  NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  killer_id    INT  NOT NULL REFERENCES players(id),
  victim_type  TEXT NOT NULL,
  exp_awarded  INT  NOT NULL DEFAULT 0,
  killed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- one row per (kill, assisting player). no exp here on purpose.
CREATE TABLE kill_assists (
  kill_id    INT NOT NULL REFERENCES kills(id) ON DELETE CASCADE,
  player_id  INT NOT NULL REFERENCES players(id),
  PRIMARY KEY (kill_id, player_id)
);

-- deaths of *players* (PvE: zombies can kill you)
CREATE TABLE player_deaths (
  id          SERIAL PRIMARY KEY,
  match_id    INT  NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id   INT  NOT NULL REFERENCES players(id),
  killed_by   TEXT NOT NULL,           -- enemy type, e.g. "zombie"
  died_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kills_match    ON kills(match_id);
CREATE INDEX idx_kills_killer   ON kills(killer_id);
CREATE INDEX idx_assists_player ON kill_assists(player_id);
CREATE INDEX idx_deaths_player  ON player_deaths(player_id);