import { describe, expect, it } from "vitest";
import { handleApi } from "../../worker/index";

/** Minimal in-memory D1 stand-in (only the calls the Worker makes). */
function fakeEnv() {
  const rows = new Map<string, { progress_json: string; updated_at: number }>();
  const DB = {
    prepare(sql: string) {
      let args: unknown[] = [];
      const stmt = {
        bind: (...a: unknown[]) => ((args = a), stmt),
        async run() {
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
          return rows.get(args[0] as string) ?? null;
        },
      };
      return stmt;
    },
  };
  return { env: { DB, APP_ENV: "test" } as unknown as Env, rows };
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
