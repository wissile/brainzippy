// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleApi } from "../../worker/index";
import { fakeEnv } from "./helpers/d1";

const ORIGIN = "https://brainzippy.test";
const req = (path: string, init: RequestInit = {}) => new Request(`${ORIGIN}${path}`, init);

beforeEach(() => vi.spyOn(console, "log").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe("API worker: health + guest (unchanged behaviour)", () => {
  it("health", async () => {
    const res = await handleApi(req("/api/health"), fakeEnv({ APP_ENV: "test" }).env);
    expect(await res.json()).toEqual({ ok: true, env: "test" });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("creates a guest, stores and reads validated progress, deletes it", async () => {
    const { env, count } = fakeEnv();
    const created = await handleApi(req("/api/guest", { method: "POST" }), env);
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };
    const body = JSON.stringify({ v: 1, stickers: ["counting-champ"], roundsCompleted: 1, skills: {} });
    const put = await handleApi(req(`/api/guest/${id}/progress`, { method: "PUT", body, headers: { "content-type": "application/json" } }), env);
    expect(put.status).toBe(200);
    const got = await handleApi(req(`/api/guest/${id}/progress`), env);
    expect(((await got.json()) as { progress: { stickers: string[] } }).progress.stickers).toEqual(["counting-champ"]);
    await handleApi(req(`/api/guest/${id}`, { method: "DELETE" }), env);
    expect(count("guest_sessions")).toBe(0);
  });

  it("rejects invalid bodies, bad ids, wrong content type and cross-site writes", async () => {
    const { env } = fakeEnv();
    const { id } = (await (await handleApi(req("/api/guest", { method: "POST" }), env)).json()) as { id: string };
    const bad = await handleApi(req(`/api/guest/${id}/progress`, { method: "PUT", body: JSON.stringify({ v: 1, name: "x" }), headers: { "content-type": "application/json" } }), env);
    expect(bad.status).toBe(400);
    expect((await handleApi(req(`/api/guest/${id}/progress`, { method: "PUT", body: "{}" }), env)).status).toBe(400);
    expect((await handleApi(req(`/api/guest/not-a-uuid/progress`), env)).status).toBe(404);
    expect((await handleApi(req("/api/guest", { method: "POST", headers: { origin: "https://evil.example" } }), env)).status).toBe(403);
    const huge = await handleApi(req(`/api/guest/${id}/progress`, { method: "PUT", body: "x".repeat(9000), headers: { "content-type": "application/json" } }), env);
    expect(huge.status).toBe(400);
    const stream = new ReadableStream({ start(c) { for (let i = 0; i < 20; i++) c.enqueue(new TextEncoder().encode("x".repeat(1000))); c.close(); } });
    const chunked = await handleApi(new Request(`${ORIGIN}/api/guest/${id}/progress`, { method: "PUT", body: stream, headers: { "content-type": "application/json" }, duplex: "half" } as RequestInit), env);
    expect(chunked.status).toBe(400);
    expect((await handleApi(req(`/api/guest/${id}`, { method: "PUT" }), env)).status).toBe(405);
    expect((await handleApi(req("/api/nope"), env)).status).toBe(404);
  });
});

describe("legacy onboarding sign-up now creates a parent account", () => {
  it("dev link verifies once and creates a parents row; refuses outside dev without a provider", async () => {
    const { env, raw } = fakeEnv();
    const json = (b: unknown) => ({ method: "POST", body: JSON.stringify(b), headers: { "content-type": "application/json" } });
    expect((await handleApi(req("/api/parent-signup", json({ email: "p@example.com" })), env)).status).toBe(400);
    expect((await handleApi(req("/api/parent-signup", json({ email: "p@example.com", consent: true, childName: "x" })), env)).status).toBe(400);
    const res = await handleApi(req("/api/parent-signup", json({ email: " P@Example.com ", consent: true })), env);
    expect(res.status).toBe(202);
    const { devVerifyUrl } = (await res.json()) as { devVerifyUrl: string };
    const ok = await handleApi(req(new URL(devVerifyUrl).pathname + new URL(devVerifyUrl).search), env);
    expect(await ok.text()).toContain("Thank you!");
    expect(raw.prepare("SELECT email, consent_version FROM parents").all()).toEqual([expect.objectContaining({ email: "p@example.com", consent_version: "2026-11-17" })]);
    const again = await handleApi(req(new URL(devVerifyUrl).pathname + new URL(devVerifyUrl).search), env);
    expect(await again.text()).not.toContain("Thank you!");
    const after = await handleApi(req("/api/parent-signup", json({ email: "p@example.com", consent: true })), env);
    expect(await after.json()).toEqual({ ok: true, status: "verified" });
    const staging = fakeEnv({ APP_ENV: "staging" });
    expect((await handleApi(req("/api/parent-signup", json({ email: "q@example.com", consent: true })), staging.env)).status).toBe(503);
  });

  it("migration 0003 carries verified parent_signups over to parents", async () => {
    const { raw, apply } = fakeEnv({}, { upTo: "0002_parent_signups.sql" });
    raw.prepare("INSERT INTO parent_signups (id, email, status, consent_version, created_at, updated_at, verified_at) VALUES ('a', 'v@example.com', 'verified', '2026-11-17', 1, 2, 3)").run();
    raw.prepare("INSERT INTO parent_signups (id, email, status, consent_version, created_at, updated_at) VALUES ('b', 'pending@example.com', 'pending', '2026-11-17', 1, 2)").run();
    apply("0003_accounts.sql");
    expect(raw.prepare("SELECT id, email, consented_at FROM parents").all()).toEqual([{ id: "a", email: "v@example.com", consented_at: 3 }]);
    expect(raw.prepare("SELECT id FROM parent_signups").all()).toEqual([{ id: "b" }]);
  });
});

// ---------------- accounts ----------------
type Env2 = ReturnType<typeof fakeEnv>;

async function call(t: Env2, path: string, opts: { method?: string; body?: unknown; cookie?: string; origin?: string | null } = {}) {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.cookie) headers.cookie = opts.cookie;
  const method = opts.method ?? (opts.body !== undefined ? "POST" : "GET");
  if (opts.origin !== null && method !== "GET") headers.origin = opts.origin ?? ORIGIN;
  return handleApi(req(path, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) }), t.env);
}

async function signIn(t: Env2, email: string): Promise<string> {
  const r = await call(t, "/api/auth/magic-link", { body: { email, consent: true, mode: "signup" } });
  expect(r.status).toBe(202);
  const { devLink } = (await r.json()) as { devLink: string };
  const token = new URL(devLink).searchParams.get("token")!;
  const v = await handleApi(req("/api/auth/verify", { method: "POST", headers: { origin: ORIGIN, "content-type": "application/x-www-form-urlencoded" }, body: `token=${token}` }), t.env);
  expect(v.status).toBe(303);
  return v.headers.get("set-cookie")!.split(";")[0]!;
}

const MONSTER = { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" };
async function addChild(t: Env2, cookie: string, monsterName = "Ziggy") {
  const r = await call(t, "/api/children", { cookie, body: { monsterName, monster: MONSTER, ageBand: "ages-3-5" } });
  expect(r.status).toBe(201);
  return ((await r.json()) as { child: { id: string } }).child.id;
}

const round = (ts: number, gameId = "counting-adventure", firstTry = 8) => ({
  id: `${ts}-${gameId}`,
  ts,
  day: new Date(ts).toISOString().slice(0, 10),
  gameId,
  level: 0,
  exercises: 8,
  firstTry,
  stars: firstTry >= 7 ? 3 : firstTry >= 4 ? 2 : 1,
  seconds: 120,
  skills: ["math.count.cardinality"],
});

describe("magic-link auth and sessions", () => {
  it("signup needs consent; GET verify never consumes; POST verify signs in once; cookie is HttpOnly/Secure/Lax", async () => {
    const t = fakeEnv();
    expect((await call(t, "/api/auth/magic-link", { body: { email: "a@example.com", mode: "signup" } })).status).toBe(400);
    expect((await call(t, "/api/auth/magic-link", { body: { email: "nope", consent: true, mode: "signup" } })).status).toBe(400);
    expect((await call(t, "/api/auth/magic-link", { body: { email: "a@example.com", consent: true, mode: "signup", name: "x" } })).status).toBe(400);
    const r = await call(t, "/api/auth/magic-link", { body: { email: "a@example.com", consent: true, mode: "signup" } });
    const { devLink } = (await r.json()) as { devLink: string };
    expect(devLink).toMatch(/\/api\/auth\/verify\?token=[0-9a-f]{64}$/);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining(devLink));
    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining("a@example.com"));
    const token = new URL(devLink).searchParams.get("token")!;
    // stored only as a hash
    expect(JSON.stringify(t.raw.prepare("SELECT * FROM auth_tokens").all())).not.toContain(token);
    const page = await handleApi(req(`/api/auth/verify?token=${token}`), t.env);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('method="post"');
    const form = { method: "POST", headers: { origin: ORIGIN, "content-type": "application/x-www-form-urlencoded" }, body: `token=${token}` };
    const v = await handleApi(req("/api/auth/verify", form), t.env);
    expect(v.status).toBe(303);
    expect(v.headers.get("location")).toBe("/parents");
    const cookie = v.headers.get("set-cookie")!;
    expect(cookie).toMatch(/^__Host-bz_sid=[0-9a-f]{64}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000; Secure$/);
    expect((await handleApi(req("/api/auth/verify", form), t.env)).status).toBe(410);
    const me = await call(t, "/api/me", { cookie: cookie.split(";")[0] });
    expect(((await me.json()) as { parent: { email: string } }).parent.email).toBe("a@example.com");
  });

  it("magic links expire after 15 minutes", async () => {
    const t = fakeEnv();
    vi.useFakeTimers({ now: new Date("2026-11-17T10:00:00Z"), toFake: ["Date"] });
    try {
      const { devLink } = (await (await call(t, "/api/auth/magic-link", { body: { email: "e@example.com", consent: true, mode: "signup" } })).json()) as { devLink: string };
      vi.setSystemTime(new Date("2026-11-17T10:15:01Z"));
      const token = new URL(devLink).searchParams.get("token")!;
      const v = await handleApi(req("/api/auth/verify", { method: "POST", headers: { origin: ORIGIN, "content-type": "application/x-www-form-urlencoded" }, body: `token=${token}` }), t.env);
      expect(v.status).toBe(410);
    } finally {
      vi.useRealTimers();
    }
  });

  it("sign-in for an unknown email reveals nothing and sends nothing", async () => {
    const t = fakeEnv({ APP_ENV: "staging", RESEND_API_KEY: "re_test" });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const r = await call(t, "/api/auth/magic-link", { body: { email: "who@example.com", mode: "signin" } });
    expect(r.status).toBe(202);
    expect(await r.json()).toEqual({ ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(t.count("auth_tokens")).toBe(0);
  });

  it("sends through Resend with the API key, never returning the link", async () => {
    const t = fakeEnv({ APP_ENV: "staging", RESEND_API_KEY: "re_test", EMAIL_FROM: "BrainZippy <hi@mail.example>" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "x" })));
    const r = await call(t, "/api/auth/magic-link", { body: { email: "s@example.com", consent: true, mode: "signup" } });
    expect(await r.json()).toEqual({ ok: true });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect((init!.headers as Record<string, string>).authorization).toBe("Bearer re_test");
    const sent = JSON.parse(init!.body as string) as { to: string[]; html: string; text: string; from: string };
    expect(sent.to).toEqual(["s@example.com"]);
    expect(sent.from).toBe("BrainZippy <hi@mail.example>");
    expect(sent.text).toMatch(/verify\?token=[0-9a-f]{64}/);
    expect(sent.html).not.toMatch(/<img/i);
  });

  it("rate-limits per email", async () => {
    const t = fakeEnv();
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await call(t, "/api/auth/magic-link", { body: { email: "r@example.com", consent: true, mode: "signup" } })).status);
    expect(statuses).toEqual([202, 202, 202, 429]);
    expect(JSON.stringify(t.raw.prepare("SELECT key FROM rate_limits").all())).not.toContain("r@example.com");
  });

  it("rate-limits magic-link requests per IP outside development", async () => {
    const t = fakeEnv({ APP_ENV: "staging", RESEND_API_KEY: "re_test" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    const statuses = [];
    for (let i = 0; i < 11; i++) {
      const r = await handleApi(req("/api/auth/magic-link", { method: "POST", headers: { origin: ORIGIN, "content-type": "application/json", "cf-connecting-ip": "203.0.113.9" }, body: JSON.stringify({ email: `u${i}@example.com`, consent: true, mode: "signup" }) }), t.env);
      statuses.push(r.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 202)).toBe(true);
    expect(statuses[10]).toBe(429);
    expect(JSON.stringify(t.raw.prepare("SELECT key FROM rate_limits").all())).not.toContain("203.0.113.9");
  });

  it("enforces Origin on cookie-authenticated writes, and logout ends the session", async () => {
    const t = fakeEnv();
    const cookie = await signIn(t, "o@example.com");
    expect((await call(t, "/api/children", { cookie, body: { monsterName: "Ziggy", monster: MONSTER, ageBand: "ages-3-5" }, origin: "https://evil.example" })).status).toBe(403);
    expect((await call(t, "/api/children", { cookie, body: { monsterName: "Ziggy", monster: MONSTER, ageBand: "ages-3-5" }, origin: null })).status).toBe(403);
    expect((await call(t, "/api/auth/logout", { cookie, method: "POST" })).headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await call(t, "/api/me", { cookie })).status).toBe(401);
    expect(t.count("sessions")).toBe(0);
  });

  it("uses a non-Secure cookie name only on plain-http localhost", async () => {
    const t = fakeEnv();
    const { devLink } = (await (await handleApi(new Request("http://localhost:4181/api/auth/magic-link", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:4181" }, body: JSON.stringify({ email: "l@example.com", consent: true, mode: "signup" }) }), t.env)).json()) as { devLink: string };
    const token = new URL(devLink).searchParams.get("token")!;
    const v = await handleApi(new Request("http://localhost:4181/api/auth/verify", { method: "POST", headers: { origin: "http://localhost:4181", "content-type": "application/x-www-form-urlencoded" }, body: `token=${token}` }), t.env);
    expect(v.headers.get("set-cookie")).toMatch(/^bz_sid=[0-9a-f]{64}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000$/);
  });
});

describe("children, settings, sync", () => {
  it("creates up to 4 children with minimal data; validates; isolates parents", async () => {
    const t = fakeEnv();
    const a = await signIn(t, "a@example.com");
    const b = await signIn(t, "b@example.com");
    expect((await call(t, "/api/children", { cookie: a, body: { monsterName: "Ziggy", monster: { ...MONSTER, color: "gold" }, ageBand: "ages-3-5" } })).status).toBe(400);
    expect((await call(t, "/api/children", { cookie: a, body: { monsterName: "Ziggy", monster: MONSTER, ageBand: "ages-3-5", kidName: "Sam" } })).status).toBe(400);
    const ids = [];
    for (let i = 0; i < 4; i++) ids.push(await addChild(t, a, `Mon${"abcd"[i]}`));
    expect((await call(t, "/api/children", { cookie: a, body: { monsterName: "Five", monster: MONSTER, ageBand: "ages-3-5" } })).status).toBe(409);
    const list = (await (await call(t, "/api/children", { cookie: a })).json()) as { children: { nickname: string | null; settings: unknown }[] };
    expect(list.children).toHaveLength(4);
    expect(list.children[0]!.nickname).toBeNull();
    expect(list.children[0]!.settings).toEqual({ dailyLimit: 5, sound: true, music: true });
    expect((await call(t, `/api/children/${ids[0]}`, { cookie: b })).status).toBe(405);
    expect((await call(t, `/api/children/${ids[0]}/settings`, { cookie: b })).status).toBe(404);
    expect((await call(t, `/api/children/${ids[0]}`, { cookie: b, method: "DELETE" })).status).toBe(404);
    // nickname is opt-in and removable
    const upd = await call(t, `/api/children/${ids[0]}`, { cookie: a, method: "PUT", body: { nickname: "Sammy" } });
    expect(((await upd.json()) as { child: { nickname: string } }).child.nickname).toBe("Sammy");
    await call(t, `/api/children/${ids[0]}`, { cookie: a, method: "PUT", body: { nickname: null } });
    expect(t.raw.prepare("SELECT nickname FROM children WHERE id = ?").get(ids[0])).toEqual({ nickname: null });
    expect((await call(t, `/api/children/${ids[1]}`, { cookie: a, method: "DELETE" })).status).toBe(200);
    expect(t.count("children")).toBe(3);
  });

  it("GET/PUT settings contract: dailyLimit 3–10, sound, music; partial updates; strict", async () => {
    const t = fakeEnv();
    const a = await signIn(t, "a@example.com");
    const id = await addChild(t, a);
    expect(await (await call(t, `/api/children/${id}/settings`, { cookie: a })).json()).toEqual({ settings: { dailyLimit: 5, sound: true, music: true } });
    const put = await call(t, `/api/children/${id}/settings`, { cookie: a, method: "PUT", body: { dailyLimit: 8, music: false } });
    expect(await put.json()).toEqual({ settings: { dailyLimit: 8, sound: true, music: false } });
    for (const bad of [{ dailyLimit: 2 }, { dailyLimit: 11 }, { dailyLimit: 5.5 }, { sound: "yes" }, { other: 1 }]) {
      expect((await call(t, `/api/children/${id}/settings`, { cookie: a, method: "PUT", body: bad })).status).toBe(400);
    }
    expect(await (await call(t, `/api/children/${id}/settings`, { cookie: a })).json()).toEqual({ settings: { dailyLimit: 8, sound: true, music: false } });
  });

  it("sync merges device progress deterministically (level/stars max, history union)", async () => {
    const t = fakeEnv();
    const a = await signIn(t, "a@example.com");
    const id = await addChild(t, a);
    const p1 = { v: 1, worlds: { "counting-adventure": { level: 2, stars: 2 } }, stickers: ["counting-champ"], skills: {}, roundsCompleted: 3, history: [round(1000)] };
    const p2 = { v: 1, worlds: { "counting-adventure": { level: 1, stars: 3 }, "glow-cave-hops": { level: 1, stars: 1 } }, stickers: ["cave-explorer"], skills: {}, roundsCompleted: 1, history: [round(2000, "glow-cave-hops"), round(1000)] };
    await call(t, `/api/children/${id}/sync`, { cookie: a, body: { progress: p1 } });
    const r = await call(t, `/api/children/${id}/sync`, { cookie: a, body: { progress: p2 } });
    const { progress } = (await r.json()) as { progress: { worlds: unknown; stickers: string[]; history: unknown[]; roundsCompleted: number } };
    expect(progress.worlds).toEqual({ "counting-adventure": { level: 2, stars: 3 }, "glow-cave-hops": { level: 1, stars: 1 } });
    expect(progress.stickers).toEqual(["cave-explorer", "counting-champ"]);
    expect(progress.history).toHaveLength(2);
    expect(progress.roundsCompleted).toBe(3);
    expect((await call(t, `/api/children/${id}/sync`, { cookie: a, body: { progress: { ...p1, name: "x" } } })).status).toBe(400);
  });
});

describe("friends, leaderboard, challenges", () => {
  async function friends() {
    const t = fakeEnv();
    const a = await signIn(t, "a@example.com");
    const b = await signIn(t, "b@example.com");
    const c = await signIn(t, "c@example.com");
    const ka = await addChild(t, a, "Ziggy");
    const kb = await addChild(t, b, "Nova");
    const kc = await addChild(t, c, "Pip");
    return { t, a, b, c, ka, kb, kc };
  }

  it("invite → accept → both parents approve → active; codes are single-use", async () => {
    const { t, a, b, ka, kb } = await friends();
    const inv = (await (await call(t, `/api/children/${ka}/invites`, { cookie: a, method: "POST" })).json()) as { code: string; link: string };
    expect(inv.code).toMatch(/^[2-9A-Z]{5}-[2-9A-Z]{5}$/);
    expect(inv.link).toContain(`/parents/invite/${inv.code}`);
    expect((await call(t, `/api/invites/${inv.code}/accept`, { cookie: a, body: { childId: ka } })).status).toBe(400); // own child
    const peek = (await (await call(t, `/api/invites/${inv.code.toLowerCase()}`, { cookie: b })).json()) as { from: Record<string, unknown> };
    expect(Object.keys(peek.from).sort()).toEqual(["monster", "monsterName"]);
    expect((await call(t, `/api/invites/${inv.code}/accept`, { cookie: b, body: { childId: kb } })).status).toBe(201);
    expect((await call(t, `/api/invites/${inv.code}/accept`, { cookie: b, body: { childId: kb } })).status).toBe(404);
    const fb = (await (await call(t, `/api/children/${kb}/friends`, { cookie: b })).json()) as { friends: { id: string; status: string }[] };
    expect(fb.friends[0]!.status).toBe("waiting-for-them");
    const fa = (await (await call(t, `/api/children/${ka}/friends`, { cookie: a })).json()) as { friends: { id: string; status: string; monsterName: string }[] };
    expect(fa.friends[0]).toMatchObject({ status: "needs-your-approval", monsterName: "Nova" });
    // not yet on the leaderboard
    let lb = (await (await call(t, `/api/children/${ka}/leaderboard`, { cookie: a })).json()) as { entries: unknown[] };
    expect(lb.entries).toHaveLength(1);
    expect((await call(t, `/api/friendships/${fa.friends[0]!.id}/approve`, { cookie: a, method: "POST" })).status).toBe(200);
    lb = (await (await call(t, `/api/children/${ka}/leaderboard`, { cookie: a })).json()) as { entries: Record<string, unknown>[] };
    expect(lb.entries).toHaveLength(2);
    for (const e of lb.entries) expect(Object.keys(e as object).sort()).toEqual(["key", "me", "monster", "monsterName", "points"]);
  });

  it("leaderboard ranks by weekly points; strangers can't approve or delete", async () => {
    const { t, a, b, c, ka, kb } = await friends();
    const { code } = (await (await call(t, `/api/children/${ka}/invites`, { cookie: a, method: "POST" })).json()) as { code: string };
    const { friendshipId } = (await (await call(t, `/api/invites/${code}/accept`, { cookie: b, body: { childId: kb } })).json()) as { friendshipId: string };
    expect((await call(t, `/api/friendships/${friendshipId}/approve`, { cookie: c, method: "POST" })).status).toBe(404);
    await call(t, `/api/friendships/${friendshipId}/approve`, { cookie: a, method: "POST" });
    const now = Date.now();
    await call(t, `/api/children/${kb}/sync`, { cookie: b, body: { progress: { v: 1, worlds: {}, stickers: [], skills: {}, roundsCompleted: 1, history: [round(now - 1000)] } } });
    const lb = (await (await call(t, `/api/children/${ka}/leaderboard`, { cookie: a })).json()) as { entries: { monsterName: string; points: number; me: boolean }[] };
    expect(lb.entries[0]).toMatchObject({ monsterName: "Nova", me: false });
    expect(lb.entries[0]!.points).toBe(10 * 3 + 2 * 8 + 5);
    expect((await call(t, `/api/friendships/${friendshipId}`, { cookie: c, method: "DELETE" })).status).toBe(404);
    expect((await call(t, `/api/friendships/${friendshipId}`, { cookie: b, method: "DELETE" })).status).toBe(200);
  });

  it("challenge link: friends only, results recorded, both sides see them", async () => {
    const { t, a, b, c, ka, kb, kc } = await friends();
    const { code } = (await (await call(t, `/api/children/${ka}/invites`, { cookie: a, method: "POST" })).json()) as { code: string };
    const { friendshipId } = (await (await call(t, `/api/invites/${code}/accept`, { cookie: b, body: { childId: kb } })).json()) as { friendshipId: string };
    const body = { childId: ka, worldId: "sky-balloon-race", level: 1, seed: 4242, score: 30 };
    expect((await call(t, "/api/challenges", { cookie: a, body: { ...body, worldId: "nowhere" } })).status).toBe(400);
    expect((await call(t, "/api/challenges", { cookie: b, body })).status).toBe(404); // not b's child
    const ch = (await (await call(t, "/api/challenges", { cookie: a, body })).json()) as { token: string; link: string };
    expect(ch.link).toContain(`/challenge/${ch.token}`);
    // pending friendship is not enough
    expect((await call(t, `/api/challenges/${ch.token}`, { cookie: b })).status).toBe(404);
    await call(t, `/api/friendships/${friendshipId}/approve`, { cookie: a, method: "POST" });
    const view = (await (await call(t, `/api/challenges/${ch.token}`, { cookie: b })).json()) as { worldId: string; seed: number; level: number; score: number; players: { id: string }[] };
    expect(view).toMatchObject({ worldId: "sky-balloon-race", seed: 4242, level: 1, score: 30 });
    expect(view.players.map((p) => p.id)).toEqual([kb]);
    expect((await call(t, `/api/challenges/${ch.token}`, { cookie: c })).status).toBe(404);
    expect((await call(t, `/api/challenges/${ch.token}/result`, { cookie: c, body: { childId: kc, score: 99 } })).status).toBe(404);
    const res = (await (await call(t, `/api/challenges/${ch.token}/result`, { cookie: b, body: { childId: kb, score: 36 } })).json()) as { beat: boolean };
    expect(res.beat).toBe(true);
    await call(t, `/api/challenges/${ch.token}/result`, { cookie: b, body: { childId: kb, score: 12 } }); // keeps the best
    const sent = (await (await call(t, `/api/children/${ka}/challenges`, { cookie: a })).json()) as { sent: { results: { monsterName: string; score: number; beat: boolean }[] }[] };
    expect(sent.sent[0]!.results).toEqual([{ monsterName: "Nova", score: 36, beat: true }]);
    const played = (await (await call(t, `/api/children/${kb}/challenges`, { cookie: b })).json()) as { played: { from: string; score: number; target: number }[] };
    expect(played.played[0]).toMatchObject({ from: "Ziggy", score: 36, target: 30 });
  });
});

describe("export, delete, unsubscribe", () => {
  it("exports the parent's data and hard-deletes the account and everything linked to it", async () => {
    const t = fakeEnv();
    const a = await signIn(t, "a@example.com");
    const b = await signIn(t, "b@example.com");
    const ka = await addChild(t, a, "Ziggy");
    const kb = await addChild(t, b, "Nova");
    const { code } = (await (await call(t, `/api/children/${ka}/invites`, { cookie: a, method: "POST" })).json()) as { code: string };
    await call(t, `/api/invites/${code}/accept`, { cookie: b, body: { childId: kb } });
    await call(t, "/api/challenges", { cookie: a, body: { childId: ka, worldId: "cookie-kitchen", level: 0, seed: 1, score: 10 } });
    await call(t, `/api/children/${ka}/invites`, { cookie: a, method: "POST" });
    const exp = await call(t, "/api/me/export", { cookie: a });
    expect(exp.headers.get("content-disposition")).toContain("attachment");
    const data = (await exp.json()) as { parent: { email: string }; children: { monsterName: string }[]; friendships: unknown[]; challengesSent: unknown[] };
    expect(data.parent.email).toBe("a@example.com");
    expect(data.children.map((c) => c.monsterName)).toEqual(["Ziggy"]);
    expect(data.friendships).toHaveLength(1);
    expect(data.challengesSent).toHaveLength(1);
    expect((await call(t, "/api/me", { cookie: a, method: "DELETE", body: {} })).status).toBe(400);
    const del = await call(t, "/api/me", { cookie: a, method: "DELETE", body: { confirm: "delete" } });
    expect(del.status).toBe(200);
    expect(del.headers.get("set-cookie")).toContain("Max-Age=0");
    for (const table of ["friendships", "challenges", "friend_invites"]) expect(t.count(table)).toBe(0);
    expect(t.raw.prepare("SELECT email FROM parents").all()).toEqual([{ email: "b@example.com" }]);
    expect(t.raw.prepare("SELECT monster_name FROM children").all()).toEqual([{ monster_name: "Nova" }]);
    expect(t.raw.prepare("SELECT COUNT(*) AS n FROM auth_tokens WHERE email = 'a@example.com'").get()).toEqual({ n: 0 });
    expect((await call(t, "/api/me", { cookie: a })).status).toBe(401);
  });

  it("digest toggle + signed one-click unsubscribe (cross-origin POST allowed, bad signature refused)", async () => {
    const t = fakeEnv();
    const a = await signIn(t, "a@example.com");
    await call(t, "/api/me", { cookie: a, method: "PUT", body: { digestOptIn: true } });
    const id = (t.raw.prepare("SELECT id FROM parents").get() as { id: string }).id;
    const { unsubscribeUrl } = await import("../../worker/routes/unsubscribe");
    const url = (await unsubscribeUrl(t.env, new URL(ORIGIN), id))!;
    const path = new URL(url).pathname + new URL(url).search;
    const tampered = path.replace(/s=([0-9a-f])/, (_m, ch: string) => `s=${ch === "0" ? "1" : "0"}`);
    expect((await handleApi(req(tampered), t.env)).status).toBe(400);
    const page = await handleApi(req(path), t.env);
    expect(await page.text()).toContain("Unsubscribe");
    expect(t.raw.prepare("SELECT digest_opt_in FROM parents").get()).toEqual({ digest_opt_in: 1 }); // GET changes nothing
    const one = await handleApi(req(path, { method: "POST", headers: { origin: "https://mail.example", "content-type": "application/x-www-form-urlencoded" }, body: "List-Unsubscribe=One-Click" }), t.env);
    expect(one.status).toBe(200);
    expect(t.raw.prepare("SELECT digest_opt_in FROM parents").get()).toEqual({ digest_opt_in: 0 });
  });
});
