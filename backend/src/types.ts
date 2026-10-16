export type Player = {
  id: number;
  externalId: string;
  name: string;
};

export type Match = {
  id: number;
  startedAt: string;
  endedAt: string | null;
};

export type Kill = {
  id: number;
  matchId: number;
  killerId: number;
  victimType: string;
  expAwarded: number;
  killedAt: string;
  assistIds: number[]; // player ids who assisted (no exp)
};

export type PlayerDeath = {
  id: number;
  matchId: number;
  playerId: number;
  killedBy: string;   // enemy type
  diedAt: string;
};

export type LeaderboardRow = {
  playerId: number;
  name: string;
  kills: number;
  assists: number;
  deaths: number;
  exp: number;
  kd: number;         // kills / max(deaths, 1)
};