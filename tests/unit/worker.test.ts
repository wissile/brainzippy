import { describe, expect, it } from "vitest";
import { handleApi } from "../../worker/index";

/** Minimal in-memory D1 stand-in (only the calls the Worker makes). */
function fakeEnv() {
  const rows = new Map<string, { progress_json: string; updated_at: number }>();
  const parents = new Map<string, { id: string; email: string; status: string; token_hash: string | null; created_at: number; updated_at: number }>();
  const DB = {
    prepare(sql: string) {
      let args: unknown[] = [];
      const stmt = {
        bind: (...a: unknown[]) => ((args = a), stmt),
        async run() {
          if (sql.includes("parent_signups")) {
            if (sql.startsWith("INSERT")) parents.set(args[1] as string, { id: args[0] as string, email: args[1] as string, status: "pending", token_hash: args[2] as string, created_at: args[4] as number, updated_at: args[5] as number });
            if (sql.startsWith("UPDATE") && sql.includes("status = 'verified'")) for (const r of parents.values()) if (r.id === args[2]) Object.assign(r, { status: "verified", token_hash: null });
            if (sql.startsWith("UPDATE") && !sql.includes("verified")) for (const r of parents.values()) if (r.id === args[3]) Object.assign(r, { token_hash: args[0], updated_at: args[1] });
            return { meta: { changes: 1 } };
          }
          if (sql.startsWith("INSERT")) rows.set(args[0] as string, { progress_json: "{}", updated_at: args[2] as number });
          if (sql.startsWith("UPDATE")) {
            const r = rows.get(args[2] as string);
            if (!r) return { meta: { changes: 0 } };
            r.progress_json = args[0] as string;
            return { meta: { changes: 1 } };
          }
          if (sql.startsWith("DELETE")) rows.delete(args[0] as string);
          return { meta: { changes: 1 } };
        },
        async first() {
          if (sql.includes("parent_signups WHERE email")) return parents.get(args[0] as string) ?? null;
          if (sql.includes("parent_signups WHERE token_hash")) return [...parents.values()].find((r) => r.token_hash === args[0] && r.status === "pending") ?? null;
          return rows.get(args[0] as string) ?? null;
        },
      };
      return stmt;
    },
  };
  return { env: { DB, APP_ENV: "test" } as unknown as Env, rows, parents };
}

const req = (path: string, init: RequestInit = {}) => new Request(`https://brainzippy.test${path}`, init);

describe("API worker", () => {
  it("health", async () => {
    const res = await handleApi(req("/api/health"), fakeEnv().env);
    expect(await res.json()).toEqual({ ok: true, env: "test" });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("creates a guest, stores and reads validated progress, deletes it", async () => {
    const { env, rows } = fakeEnv();
    const created = await handleApi(req("/api/guest", { method: "POST" }), env);
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const body = JSON.stringify({ v: 1, stickers: ["counting-champ"], roundsCompleted: 1, skills: {} });
    const put = await handleApi(req(`/api/guest/${id}/progress`, { method: "PUT", body, headers: { "content-type": "application/json" } }), env);
    expect(put.status).toBe(200);
    const got = await handleApi(req(`/api/guest/${id}/progress`), env);
    expect(((await got.json()) as { progress: { stickers: string[] } }).progress.stickers).toEqual(["counting-champ"]);
    await handleApi(req(`/api/guest/${id}`, { method: "DELETE" }), env);
    expect(rows.size).toBe(0);
  });

  it("rejects invalid bodies, bad ids, wrong content type and cross-site writes", async () => {
    const { env } = fakeEnv();
    const { id } = (await (await handleApi(req("/api/guest", { method: "POST" }), env)).json()) as { id: string };
    const bad = await handleApi(req(`/api/guest/${id}/progress`, { method: "PUT", body: JSON.stringify({ v: 1, name: "x" }), headers: { "content-type": "application/json" } }), env);
    expect(bad.status).toBe(400);
    const noType = await handleApi(req(`/api/guest/${id}/progress`, { method: "PUT", body: "{}" }), env);
    expect(noType.status).toBe(400);
    expect((await handleApi(req(`/api/guest/not-a-uuid/progress`), env)).status).toBe(404);
    const cross = await handleApi(req("/api/guest", { method: "POST", headers: { origin: "https://evil.example" } }), env);
    expect(cross.status).toBe(403);
    const huge = await handleApi(req(`/api/guest/${id}/progress`, { method: "PUT", body: "x".repeat(9000), headers: { "content-type": "application/json" } }), env);
    expect(huge.status).toBe(400);
    // no Content-Length (streamed): still capped by real bytes
    const stream = new ReadableStream({ start(c) { for (let i = 0; i < 20; i++) c.enqueue(new TextEncoder().encode("x".repeat(1000))); c.close(); } });
    const chunked = await handleApi(new Request(`https://brainzippy.test/api/guest/${id}/progress`, { method: "PUT", body: stream, headers: { "content-type": "application/json" }, duplex: "half" } as RequestInit), env);
    expect(chunked.status).toBe(400);
  });
});

describe("parent sign-up", () => {
  const post = (env: Env, body: unknown) => handleApi(req("/api/parent-signup", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }), env);
  const dev = () => {
    const f = fakeEnv();
    (f.env as unknown as { APP_ENV: string }).APP_ENV = "development";
    return f;
  };
  it("requires explicit consent, a valid email, and nothing else (no child data accepted)", async () => {
    const { env } = dev();
    expect((await post(env, { email: "a@b.co" })).status).toBe(400);
    expect((await post(env, { email: "nope", consent: true })).status).toBe(400);
    expect((await post(env, { email: "a@b.co", consent: true, childName: "Sam" })).status).toBe(400);
  });
  it("stores only a hash of the token and verifies once", async () => {
    const { env, parents } = dev();
    const res = await post(env, { email: " Parent@Example.com ", consent: true });
    expect(res.status).toBe(202);
    const { devVerifyUrl } = (await res.json()) as { devVerifyUrl: string };
    const token = new URL(devVerifyUrl).searchParams.get("token")!;
    const row = parents.get("parent@example.com")!;
    expect(row.token_hash).not.toBe(token);
    expect(row.token_hash).toMatch(/^[0-9a-f]{64}$/);
    const ok = await handleApi(req(`/api/parent-signup/verify?token=${token}`), env);
    expect(ok.status).toBe(200);
    expect(parents.get("parent@example.com")!.status).toBe("verified");
    const again = await handleApi(req(`/api/parent-signup/verify?token=${token}`), env);
    expect(again.status).toBe(410);
  });
  it("rate-limits resends within the cooldown", async () => {
    const { env } = dev();
    await post(env, { email: "p@example.com", consent: true });
    const second = await post(env, { email: "p@example.com", consent: true });
    expect(((await second.json()) as { devVerifyUrl?: string }).devVerifyUrl).toBeUndefined();
  });
  it("refuses to collect emails outside development until an email provider is configured", async () => {
    const { env } = fakeEnv();
    expect((await post(env, { email: "p@example.com", consent: true })).status).toBe(503);
  });
});
