import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { app } from "../src/app.js";

let server: Server;
let BASE: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        BASE = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("HTTP routes (in-process)", () => {
  it("GET /matches returns an array of matches", async () => {
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
    const res = await fetch(`${BASE}/kills`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toHaveProperty("assistIds");
  });

  it("GET /deaths returns an array of deaths", async () => {
    const res = await fetch(`${BASE}/deaths`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("GET /leaderboard returns an array", async () => {
    const res = await fetch(`${BASE}/leaderboard`);
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it("POST /kills with a bad body returns 400 invalid_body", async () => {
    const res = await fetch(`${BASE}/kills`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId: "nope" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
  });
});