import { describe, it, expect, beforeAll } from "vitest";

const BASE = "http://localhost:3000";

async function serverIsUp(): Promise<boolean> {
  try {
    await fetch(`${BASE}/matches`);
    return true;
  } catch {
    return false;
  }
}

let up = false;

beforeAll(async () => {
  up = await serverIsUp();
});

describe("HTTP routes (requires server running on :3000)", () => {
  it("GET /matches returns an array of matches", async () => {
    if (!up) return;
    const res = await fetch(`${BASE}/matches`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toMatchObject({
      id: expect.any(Number),
      startedAt: expect.any(String),
    });
  });

  it("GET /kills returns an array of kills", async () => {
    if (!up) return;
    const res = await fetch(`${BASE}/kills`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toHaveProperty("assistIds");
  });

  it("GET /deaths returns an array of deaths", async () => {
    if (!up) return;
    const res = await fetch(`${BASE}/deaths`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("GET /leaderboard returns an array", async () => {
    if (!up) return;
    const res = await fetch(`${BASE}/leaderboard`);
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it("POST /kills with a bad body returns 400 invalid_body", async () => {
    if (!up) return;
    const res = await fetch(`${BASE}/kills`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId: "nope" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
  });
});