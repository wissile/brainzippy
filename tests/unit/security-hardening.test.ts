// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleApi } from "../../worker/index";
import { isDev, signingSecret } from "../../worker/lib/config";
import { allow, LIMITS } from "../../worker/lib/rateLimit";
import { stripeMode } from "../../worker/lib/stripe";
import { fakeEnv } from "./helpers/d1";

beforeEach(() => vi.spyOn(console, "log").mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

const u = (s: string) => new URL(s);

describe("development mode is confined to localhost", () => {
  it("isDev needs APP_ENV=development AND a localhost / 127.0.0.1 request", () => {
    const dev = fakeEnv().env;
    const prod = fakeEnv({ APP_ENV: "production" }).env;
    expect(isDev(dev, u("http://localhost:5173/api/me"))).toBe(true);
    expect(isDev(dev, u("https://localhost/api/me"))).toBe(true);
    expect(isDev(dev, u("http://127.0.0.1:4189/api/me"))).toBe(true);
    expect(isDev(dev, u("https://brainzippy.com/api/me"))).toBe(false);
    expect(isDev(dev, u("https://brainzippy-staging.example.workers.dev/api/me"))).toBe(false);
    expect(isDev(dev, u("https://localhost.evil.example/api/me"))).toBe(false);
    expect(isDev(dev, u("http://127.0.0.1.nip.io/api/me"))).toBe(false);
    expect(isDev(dev, null)).toBe(false); // cron jobs
    expect(isDev(prod, u("http://localhost:5173/api/me"))).toBe(false);
  });

  it("no dev signing secret, fake Stripe or console email on a real host even with APP_ENV=development", async () => {
    const t = fakeEnv(); // APP_ENV=development, no secrets
    const real = u("https://brainzippy.com/api/x");
    expect(signingSecret(t.env, real)).toBeNull();
    expect(signingSecret(t.env, u("http://localhost/api/x"))).not.toBeNull();
    expect(stripeMode(t.env, real)).toBeNull();
    expect(stripeMode(t.env, u("http://localhost:5173/api/x"))).toBe("fake");
    const post = (path: string, body: unknown) =>
      handleApi(new Request(`https://brainzippy.com${path}`, { method: "POST", headers: { origin: "https://brainzippy.com", "content-type": "application/json" }, body: JSON.stringify(body) }), t.env);
    const ml = await post("/api/auth/magic-link", { email: "a@example.com", consent: true, mode: "signup" });
    expect(ml.status).toBe(503);
    expect(JSON.stringify(await ml.json())).not.toContain("devLink");
    const legacy = await post("/api/parent-signup", { email: "a@example.com", consent: true });
    expect(legacy.status).toBe(503);
    expect(console.log).not.toHaveBeenCalled();
    expect(t.count("auth_tokens")).toBe(0);
  });

  it("per-IP rate limits are not bypassed on a real host", async () => {
    const t = fakeEnv({ SIGNING_SECRET: "x".repeat(40) });
    const limit = { ...LIMITS.magicLinkPerIp, max: 2 };
    const real = u("https://brainzippy.com/api/auth/magic-link");
    const res = [];
    for (let i = 0; i < 3; i++) res.push(await allow(t.env, limit, "203.0.113.5", real));
    expect(res).toEqual([true, true, false]);
    for (let i = 0; i < 3; i++) expect(await allow(t.env, limit, "203.0.113.5", u("http://localhost:5173/x"))).toBe(true);
  });
});

describe("FRIENDS_ENABLED feature flag", () => {
  const MONSTER = { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" };
  async function parentWithChild(t: ReturnType<typeof fakeEnv>) {
    const o = "https://localhost";
    const post = (path: string, body: unknown, cookie = "") =>
      handleApi(new Request(`${o}${path}`, { method: "POST", headers: { origin: o, "content-type": "application/json", cookie }, body: JSON.stringify(body) }), t.env);
    const { devLink } = (await (await post("/api/auth/magic-link", { email: `f${Math.random()}@example.com`, consent: true, mode: "signup" })).json()) as { devLink: string };
    const v = await handleApi(new Request(`${o}/api/auth/verify`, { method: "POST", headers: { origin: o, "content-type": "application/x-www-form-urlencoded" }, body: `token=${new URL(devLink).searchParams.get("token")}` }), t.env);
    const cookie = v.headers.get("set-cookie")!.split(";")[0]!;
    const child = (await (await post("/api/children", { monster: MONSTER, ageBand: "ages-3-5" }, cookie)).json()) as { child: { id: string } };
    return { cookie, id: child.child.id, get: (p: string) => handleApi(new Request(`${o}${p}`, { headers: { cookie } }), t.env), post: (p: string, b: unknown) => post(p, b, cookie) };
  }

  it("off: friends, leaderboard and challenge APIs answer 404 and /api/me reports the flag", async () => {
    for (const flag of [undefined, "false", "1", "TRUE"]) {
      const t = fakeEnv({ FRIENDS_ENABLED: flag });
      const p = await parentWithChild(t);
      expect((await p.post(`/api/children/${p.id}/invites`, {})).status).toBe(404);
      expect((await p.get(`/api/children/${p.id}/friends`)).status).toBe(404);
      expect((await p.get(`/api/children/${p.id}/leaderboard`)).status).toBe(404);
      expect((await p.get(`/api/children/${p.id}/challenges`)).status).toBe(404);
      expect((await p.get("/api/invites/ABCDE-FGHJK")).status).toBe(404);
      expect((await p.post("/api/challenges", { childId: p.id, worldId: "counting-adventure", level: 0, seed: 1, score: 10 })).status).toBe(404);
      expect((await p.get(`/api/challenges/${"a".repeat(32)}`)).status).toBe(404);
      expect(((await (await p.get("/api/me")).json()) as { features: { friends: boolean; billing: boolean } }).features).toEqual({ friends: false, billing: true });
      expect(t.count("friend_invites") + t.count("challenges")).toBe(0);
    }
  });

  it("on: the same routes work", async () => {
    const t = fakeEnv({ FRIENDS_ENABLED: "true" });
    const p = await parentWithChild(t);
    expect((await p.post(`/api/children/${p.id}/invites`, {})).status).toBe(201);
    expect((await p.get(`/api/children/${p.id}/friends`)).status).toBe(200);
    expect(((await (await p.get("/api/me")).json()) as { features: { friends: boolean; billing: boolean } }).features).toEqual({ friends: true, billing: true });
  });
});

describe("migration 0006: typed monster names leave the server", () => {
  it("drops monster_name; existing children get their deterministic public name", async () => {
    const t = fakeEnv({}, { upTo: "0005_billing.sql" });
    t.raw.prepare("INSERT INTO parents (id, email, consent_version, consented_at, created_at, digest_opt_in) VALUES ('p1', 'p@example.com', 'v', 1, 1, 0)").run();
    t.raw
      .prepare("INSERT INTO children (id, parent_id, monster_json, monster_name, age_band, nickname, settings_json, progress_json, created_at, updated_at) VALUES ('11111111-1111-4111-8111-111111111111', 'p1', '{}', 'Samantha', 'ages-6-8', NULL, '{}', '{}', 1, 1)")
      .run();
    t.apply("0006_public_names.sql");
    const row = t.raw.prepare("SELECT * FROM children").get() as Record<string, unknown>;
    expect(Object.keys(row)).not.toContain("monster_name");
    expect(JSON.stringify(row)).not.toContain("Samantha");
    expect(row.public_name).toBeNull();
    const { childOut } = await import("../../worker/lib/children");
    const { defaultPublicName } = await import("../../src/account/publicName");
    expect(childOut(row as never).publicName).toBe(defaultPublicName("11111111-1111-4111-8111-111111111111"));
  });
});

describe("legacy sign-up and magic-link confirmation pages", () => {
  it("existing and new emails get the same reply outside development; existing accounts get a notice, not a link", async () => {
    const t = fakeEnv({ APP_ENV: "staging", RESEND_API_KEY: "re_test", SIGNING_SECRET: "s".repeat(40) });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    t.raw.prepare("INSERT INTO parents (id, email, consent_version, consented_at, created_at, digest_opt_in) VALUES ('p1', 'known@example.com', 'v', 1, 1, 0)").run();
    const post = (email: string) =>
      handleApi(new Request("https://brainzippy.test/api/parent-signup", { method: "POST", headers: { origin: "https://brainzippy.test", "content-type": "application/json" }, body: JSON.stringify({ email, consent: true }) }), t.env);
    const known = await post("known@example.com");
    const fresh = await post("new@example.com");
    expect([known.status, fresh.status]).toEqual([202, 202]);
    expect(await known.json()).toEqual(await fresh.json());
    const bodies = fetchSpy.mock.calls.map((c) => JSON.parse(c[1]!.body as string) as { to: string[]; text: string });
    expect(bodies.find((b) => b.to[0] === "known@example.com")!.text).not.toMatch(/token=/);
    expect(bodies.find((b) => b.to[0] === "new@example.com")!.text).toMatch(/parent-signup\/verify\?token=[0-9a-f]{64}/);
  });

  it("the magic-link confirmation page names the account being signed in (login CSRF)", async () => {
    const t = fakeEnv();
    const o = "https://localhost";
    const r = await handleApi(new Request(`${o}/api/auth/magic-link`, { method: "POST", headers: { origin: o, "content-type": "application/json" }, body: JSON.stringify({ email: "csrf@example.com", consent: true, mode: "signup" }) }), t.env);
    const { devLink } = (await r.json()) as { devLink: string };
    const page = await (await handleApi(new Request(devLink.replace(/^https?:\/\/[^/]+/, o)), t.env)).text();
    expect(page).toContain("You are signing in as");
    expect(page).toContain("csrf@example.com");
  });
});

describe("per-IP rate-limit keys", () => {
  it("IPv4 as is; IPv6 keyed on the /64 (all spellings of one prefix collapse); garbage passes through", async () => {
    const { ipKey, clientIp } = await import("../../worker/lib/rateLimit");
    expect(ipKey("203.0.113.9")).toBe("203.0.113.9");
    const p = "2001:0db8:0001:0002::/64";
    for (const ip of ["2001:db8:1:2::1", "2001:db8:1:2:ffff:ffff:ffff:ffff", "2001:0DB8:0001:0002:0:0:0:abcd", "[2001:db8:1:2::9]", "2001:db8:1:2::1%eth0", "2001:db8:1:2::192.0.2.1"]) expect(ipKey(ip)).toBe(p);
    expect(ipKey("2001:db8:1:3::1")).not.toBe(p);
    expect(ipKey("::1")).toBe("0000:0000:0000:0000::/64");
    expect(ipKey("::")).toBe("0000:0000:0000:0000::/64");
    expect(ipKey("fe80::")).toBe("fe80:0000:0000:0000::/64");
    for (const bad of ["1:2:3:4:5:6:7:8:9", "1::2::3", "gggg::1", "2001:db8::1::"]) expect(ipKey(bad)).toBe(bad);
    expect(clientIp(new Request("https://x.test", { headers: { "cf-connecting-ip": "2001:db8:1:2:aaaa::1" } }))).toBe(p);
    expect(clientIp(new Request("https://x.test"))).toBe("local");
  });

  it("rotating addresses inside one IPv6 /64 hits the same limit", async () => {
    const t = fakeEnv({ APP_ENV: "staging", RESEND_API_KEY: "re_test", SIGNING_SECRET: "s".repeat(40) });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const r = await handleApi(
        new Request("https://brainzippy.test/api/auth/magic-link", { method: "POST", headers: { origin: "https://brainzippy.test", "content-type": "application/json", "cf-connecting-ip": `2001:db8:77:1::${(i + 1).toString(16)}` }, body: JSON.stringify({ email: `v6-${i}@example.com`, consent: true, mode: "signup" }) }),
        t.env,
      );
      statuses.push(r.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 202)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

describe("capped body reads", () => {
  const chunked = (bytes: number, chunk = 1000) =>
    new ReadableStream<Uint8Array>({
      start(c) {
        for (let sent = 0; sent < bytes; sent += chunk) c.enqueue(new TextEncoder().encode("x".repeat(Math.min(chunk, bytes - sent))));
        c.close();
      },
    });
  const streamReq = (url: string, bytes: number, headers: Record<string, string> = {}) =>
    new Request(url, { method: "POST", body: chunked(bytes), headers: { "content-type": "application/json", ...headers }, duplex: "half" } as RequestInit);

  it("readCapped counts real bytes, ignores a lying Content-Length and stops at the cap", async () => {
    const { readCapped } = await import("../../worker/lib/http");
    expect(await readCapped(streamReq("https://x.test/", 100), 100)).toHaveLength(100);
    expect(await readCapped(streamReq("https://x.test/", 101), 100)).toBeUndefined();
    expect(await readCapped(streamReq("https://x.test/", 5000, { "content-length": "10" }), 100)).toBeUndefined();
    expect(await readCapped(new Request("https://x.test/", { method: "POST", body: "x".repeat(10), headers: { "content-length": "999999" } }), 100)).toBeUndefined();
    expect(await readCapped(new Request("https://x.test/", { method: "POST" }), 100)).toBeUndefined();
  });

  it("Stripe webhook refuses an oversized chunked body (413) before verifying anything", async () => {
    const t = fakeEnv({ STRIPE_WEBHOOK_SECRET: "whsec_x", STRIPE_SECRET_KEY: "sk_test_x" } as never);
    const { MAX_WEBHOOK_BYTES } = await import("../../worker/lib/stripeEvents");
    const res = await handleApi(streamReq("https://brainzippy.test/api/billing/webhook", MAX_WEBHOOK_BYTES + 1, { "stripe-signature": "t=1,v1=00" }), t.env);
    expect(res.status).toBe(413);
  });

  it("push subscribe refuses a chunked body over 2 KB", async () => {
    const t = fakeEnv({ VAPID_PUBLIC_KEY: "x", VAPID_PRIVATE_KEY: "y", SIGNING_SECRET: "s".repeat(40) } as never);
    const res = await handleApi(streamReq("https://brainzippy.test/api/push/subscribe", 3000, { origin: "https://brainzippy.test" }), t.env);
    expect(res.status).toBe(400);
  });
});

describe("guest endpoint (client sync off)", () => {
  it("writes answer 404 unless GUEST_SYNC_ENABLED=true; GET/DELETE still work for existing rows", async () => {
    const t = fakeEnv({ APP_ENV: "production" });
    const o = "https://brainzippy.test";
    expect((await handleApi(new Request(`${o}/api/guest`, { method: "POST" }), t.env)).status).toBe(404);
    const id = crypto.randomUUID();
    t.raw.prepare("INSERT INTO guest_sessions (id, created_at, updated_at, progress_json) VALUES (?, 1, 1, '{}')").run(id);
    const put = await handleApi(new Request(`${o}/api/guest/${id}/progress`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ v: 1, stickers: [], roundsCompleted: 0, skills: {} }) }), t.env);
    expect(put.status).toBe(404);
    expect((await handleApi(new Request(`${o}/api/guest/${id}/progress`), t.env)).status).toBe(200);
    expect((await handleApi(new Request(`${o}/api/guest/${id}`, { method: "DELETE" }), t.env)).status).toBe(200);
    expect(t.count("guest_sessions")).toBe(0);
  });

  it("when enabled, guest creation is rate-limited per IP", async () => {
    const t = fakeEnv({ APP_ENV: "production", GUEST_SYNC_ENABLED: "true", SIGNING_SECRET: "s".repeat(40) });
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) statuses.push((await handleApi(new Request("https://brainzippy.test/api/guest", { method: "POST", headers: { "cf-connecting-ip": "198.51.100.7" } }), t.env)).status);
    expect(statuses.slice(0, 20).every((s) => s === 201)).toBe(true);
    expect(statuses[20]).toBe(429);
  });
});
