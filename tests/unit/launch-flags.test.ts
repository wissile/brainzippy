// @vitest-environment node
/**
 * Guest-only production launch (D-030): ACCOUNTS_ENABLED / BILLING_ENABLED / FRIENDS_ENABLED, GET /api/config,
 * disabled routes and cron jobs, the early-access entitlement and the flag-aware public site.
 */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleApi } from "../../worker/index";
import * as routeModules from "../../worker/routes";
import { allow, LIMITS, RateLimitUnavailable } from "../../worker/lib/rateLimit";
import { CRON_JOBS, runScheduled } from "../../worker/jobs";
import { accountsEnabled, billingEnabled, flagOn, friendsEnabled, publicConfig, pushEnabled } from "../../worker/lib/config";
import { getEntitlement } from "../../worker/lib/entitlements";
import { emptyChildProgress } from "../../src/account/schema";
import { canPlay, DAY_MS, parseEntitlement } from "../../src/billing/model";
import { fakeEnv } from "./helpers/d1";
import { importSite } from "./helpers/site";

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

const OFF = { ACCOUNTS_ENABLED: "false", BILLING_ENABLED: "false", FRIENDS_ENABLED: "false" };
const O = "http://localhost";
const MONSTER = { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" };

type T = ReturnType<typeof fakeEnv>;
const req = (t: T, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
  handleApi(
    new Request(`${O}${path}`, {
      method,
      headers: { ...(method === "GET" ? {} : { origin: O }), ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    t.env,
  );

/** Signs a parent up through the real API (flags on) and adds a child. */
async function signedInParent(t: T) {
  const ml = await req(t, "POST", "/api/auth/magic-link", { email: `p${Math.random()}@example.com`, consent: true, mode: "signup" });
  const { devLink } = (await ml.json()) as { devLink: string };
  const v = await handleApi(
    new Request(`${O}/api/auth/verify`, { method: "POST", headers: { origin: O, "content-type": "application/x-www-form-urlencoded" }, body: `token=${new URL(devLink).searchParams.get("token")}` }),
    t.env,
  );
  const cookie = v.headers.get("set-cookie")!.split(";")[0]!;
  const child = (await (await req(t, "POST", "/api/children", { monster: MONSTER, ageBand: "ages-3-5" }, { cookie })).json()) as { child: { id: string } };
  return { cookie, childId: child.child.id };
}

describe("flag parsing", () => {
  it("a flag is on only for the exact string \"true\"", () => {
    for (const v of [undefined, "", "false", "1", "yes", "TRUE", "True", " true", "true "]) expect(flagOn(v), String(v)).toBe(false);
    expect(flagOn("true")).toBe(true);
  });

  it("billing and friends need accounts; push needs both VAPID keys", () => {
    const env = (o: Record<string, string | undefined>) => fakeEnv({ ...OFF, ...o }).env;
    expect([accountsEnabled, billingEnabled, friendsEnabled].map((f) => f(env({})))).toEqual([false, false, false]);
    expect(billingEnabled(env({ BILLING_ENABLED: "true" }))).toBe(false);
    expect(friendsEnabled(env({ FRIENDS_ENABLED: "true" }))).toBe(false);
    expect(billingEnabled(env({ ACCOUNTS_ENABLED: "true", BILLING_ENABLED: "true" }))).toBe(true);
    expect(friendsEnabled(env({ ACCOUNTS_ENABLED: "true", FRIENDS_ENABLED: "true" }))).toBe(true);
    expect(pushEnabled(env({}))).toBe(false);
    expect(pushEnabled(env({ VAPID_PUBLIC_KEY: "  " }))).toBe(false);
    expect(pushEnabled(env({ VAPID_PUBLIC_KEY: "BPub" }))).toBe(false); // private key secret missing
    expect(pushEnabled(env({ VAPID_PRIVATE_KEY: "priv" }))).toBe(false);
    expect(pushEnabled(env({ VAPID_PUBLIC_KEY: "BPub", VAPID_PRIVATE_KEY: "priv" }))).toBe(true);
  });

  it("wrangler.jsonc: top level and production are all off, staging all on", () => {
    const cfg = JSON.parse(readFileSync(new URL("../../wrangler.jsonc", import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, "")) as {
      vars: Record<string, string>;
      env: Record<string, { vars: Record<string, string>; d1_databases: { database_name: string; database_id?: string }[] }>;
    };
    const flags = (v: Record<string, string>) => [v.ACCOUNTS_ENABLED, v.BILLING_ENABLED, v.FRIENDS_ENABLED];
    expect(flags(cfg.vars)).toEqual(["false", "false", "false"]);
    expect(flags(cfg.env.production!.vars)).toEqual(["false", "false", "false"]);
    expect(flags(cfg.env.staging!.vars)).toEqual(["true", "true", "true"]);
    expect(cfg.vars.EMAIL_FROM).toBe("BrainZippy <hello@brainzippy.com>");
    expect(cfg.env.production!.vars.VAPID_SUBJECT).toBe("mailto:hello@brainzippy.com");
    // remote databases are provisioned by `wrangler deploy` (no placeholder ids that would break a first deploy)
    for (const e of ["staging", "production"]) {
      const db = cfg.env[e]!.d1_databases[0]!;
      expect(db.database_id, e).toBeUndefined();
      expect(db.database_name).toMatch(/^brainzippy-db/);
    }
  });
});

describe("GET /api/config", () => {
  it("returns exactly four booleans, cacheable for 5 minutes, with no cookie and no personal data", async () => {
    const t = fakeEnv(OFF);
    const res = await handleApi(new Request(`${O}/api/config`, { headers: { cookie: "__Host-bz_sid=abc" } }), t.env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ accounts: false, billing: false, friends: false, push: false });
    expect(res.headers.get("cache-control")).toBe("public, max-age=300");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("reflects the flags and their dependencies", async () => {
    const body = async (o: Record<string, string>) => (await (await handleApi(new Request(`${O}/api/config`), fakeEnv({ ...OFF, ...o }).env)).json()) as Record<string, boolean>;
    expect(await body({ ACCOUNTS_ENABLED: "true", BILLING_ENABLED: "true", FRIENDS_ENABLED: "true", VAPID_PUBLIC_KEY: "BPub", VAPID_PRIVATE_KEY: "priv" })).toEqual({ accounts: true, billing: true, friends: true, push: true });
    expect(await body({ VAPID_PUBLIC_KEY: "BPub" })).toMatchObject({ push: false }); // public key alone is not enough
    expect(await body({ BILLING_ENABLED: "true", FRIENDS_ENABLED: "true" })).toEqual({ accounts: false, billing: false, friends: false, push: false });
    expect(await body({ ACCOUNTS_ENABLED: "true" })).toEqual({ accounts: true, billing: false, friends: false, push: false });
    expect(publicConfig(fakeEnv().env)).toEqual({ accounts: true, billing: true, friends: true, push: false });
  });
});

describe("disabled routes answer 404, exactly like a missing route", () => {
  const notFound = { error: "not_found" };

  it("accounts off: sign-in, legacy sign-up, me, children and sync are gone (even with a session from before)", async () => {
    const t = fakeEnv();
    const { cookie, childId } = await signedInParent(t);
    Object.assign(t.env, OFF);
    const cases: [string, string, unknown?][] = [
      ["POST", "/api/auth/magic-link", { email: "a@example.com", consent: true, mode: "signup" }],
      ["GET", "/api/auth/verify?token=" + "a".repeat(64)],
      ["POST", "/api/auth/logout", {}],
      ["POST", "/api/parent-signup", { email: "a@example.com", consent: true }],
      ["GET", "/api/me"],
      ["GET", "/api/me/export"],
      ["GET", "/api/children"],
      ["POST", "/api/children", { monster: MONSTER, ageBand: "ages-3-5" }],
      ["GET", `/api/children/${childId}/settings`],
      ["POST", `/api/children/${childId}/sync`, { progress: emptyChildProgress() }],
      ["GET", `/api/children/${childId}/friends`],
    ];
    for (const [m, p, b] of cases) {
      const res = await req(t, m, p, b, { cookie });
      expect(res.status, `${m} ${p}`).toBe(404);
      expect(await res.json()).toEqual(notFound);
    }
    expect(t.count("auth_tokens")).toBe(1); // only the sign-up from before the switch
    expect(t.count("parent_signups")).toBe(0);
    expect(t.count("children")).toBe(1);
    // guest-play endpoints that never carry personal data are unaffected
    expect((await req(t, "GET", "/api/health")).status).toBe(200);
  });

  it("billing off: status, checkout, portal, redeem and the webhook are gone; /api/me says early access", async () => {
    const t = fakeEnv({ BILLING_ENABLED: "false" });
    const { cookie } = await signedInParent(t);
    for (const p of ["/api/billing/status", "/api/billing/checkout", "/api/billing/portal", "/api/billing/redeem"]) {
      const res = await req(t, "POST", p, p.endsWith("checkout") ? { consent: true } : {}, { cookie });
      expect(res.status, p).toBe(404);
      expect(await res.json()).toEqual(notFound);
    }
    const hook = await handleApi(new Request(`${O}/api/billing/webhook`, { method: "POST", headers: { "stripe-signature": "t=1,v1=x" }, body: "{}" }), t.env);
    expect(hook.status).toBe(404);
    expect(t.count("billing_accounts")).toBe(0);
    const me = (await (await req(t, "GET", "/api/me", undefined, { cookie })).json()) as { entitlement: { status: string; source: string }; features: Record<string, boolean> };
    expect(me.entitlement).toMatchObject({ status: "free", source: "early-access", accessUntil: null });
    expect(me.features).toEqual({ friends: true, billing: false });
  });

  it("flags on: the same routes work (development / staging)", async () => {
    const t = fakeEnv();
    const { cookie } = await signedInParent(t);
    expect((await req(t, "GET", "/api/me", undefined, { cookie })).status).toBe(200);
    expect((await req(t, "POST", "/api/billing/status", {}, { cookie })).status).toBe(200);
  });
});

describe("guest-only production writes nothing to D1 (no rate_limits rows, no IP traces)", () => {
  // Exactly production: APP_ENV=production, three flags off, no secrets (no SIGNING_SECRET, no VAPID keys), real host.
  const PROD = { APP_ENV: "production", ...OFF, VAPID_PUBLIC_KEY: "", VAPID_SUBJECT: "mailto:hello@brainzippy.com" };
  const HOST = "https://brainzippy.com";
  const ID = "11111111-1111-4111-8111-111111111111";
  const TOKEN = "a".repeat(32);
  const concrete = (path: string) => path.replace(/:([a-zA-Z]+)/g, (_m, k: string) => (k === "token" || k === "code" ? TOKEN : ID));
  const ALL = Object.values(routeModules).flat();
  const TABLES = ["rate_limits", "guest_sessions", "push_subscriptions", "parents", "auth_tokens", "parent_signups", "children"];

  /** Every route of every module, with every method, as an anonymous visitor from a real IP. Records all SQL run. */
  async function hitEverything(env: Record<string, string>) {
    const t = fakeEnv(env);
    const sql: string[] = [];
    const prepare = t.env.DB.prepare.bind(t.env.DB);
    (t.env.DB as { prepare: unknown }).prepare = (q: string) => (sql.push(q), prepare(q));
    const open: string[] = [];
    for (const r of ALL) {
      for (const method of ["GET", "POST", "PUT", "DELETE"]) {
        const path = concrete(r.path);
        const res = await handleApi(
          new Request(`${HOST}${path}`, {
            method,
            headers: { "cf-connecting-ip": "203.0.113.77", ...(method === "GET" ? {} : { origin: HOST, "content-type": "application/json" }) },
            body: method === "GET" ? undefined : JSON.stringify({ id: ID, email: "a@example.com", consent: true }),
          }),
          t.env,
        );
        if (res.status !== 404 && res.status !== 405) open.push(`${method} ${r.path} ${res.status}`);
      }
    }
    return { t, sql, open: [...new Set(open)].sort() };
  }

  it("no route, with any method, writes a rate_limits row or any other row", async () => {
    const { t, sql, open } = await hitEverything(PROD);
    for (const table of TABLES) expect(t.count(table), table).toBe(0);
    expect(sql.filter((q) => /rate_limits/i.test(q))).toEqual([]);
    expect(sql.filter((q) => /^\s*(INSERT|UPDATE)/i.test(q))).toEqual([]);
    // the only routes that answer anything but 404/405: health, config, and deleting a guest row (none can exist)
    expect(open).toEqual(["DELETE /api/guest/:id 200", "GET /api/config 200", "GET /api/health 200"]);
    const stored = JSON.stringify(TABLES.map((x) => t.raw.prepare(`SELECT * FROM ${x}`).all()));
    expect(stored).not.toContain("203.0.113");
  });

  it("/api/push/* is 404 without both VAPID keys, before rate limiting", async () => {
    for (const vapid of [{}, { VAPID_PUBLIC_KEY: "BPub" }, { VAPID_PRIVATE_KEY: "priv" }]) {
      const t = fakeEnv({ ...PROD, SIGNING_SECRET: "s".repeat(40), ...vapid });
      for (const [m, p] of [["GET", "/api/push/key"], ["POST", "/api/push/subscribe"], ["POST", "/api/push/unsubscribe"]] as const) {
        const res = await handleApi(new Request(`${HOST}${p}`, { method: m, headers: { "cf-connecting-ip": "203.0.113.5", ...(m === "POST" ? { origin: HOST, "content-type": "application/json" } : {}) }, body: m === "POST" ? JSON.stringify({ id: ID }) : undefined }), t.env);
        expect(res.status, `${JSON.stringify(vapid)} ${p}`).toBe(404);
      }
      expect(t.count("rate_limits")).toBe(0);
    }
  });

  it("the digest unsubscribe link is gone with accounts off", async () => {
    const t = fakeEnv({ ...PROD, SIGNING_SECRET: "s".repeat(40) });
    expect((await handleApi(new Request(`${HOST}/api/unsubscribe?p=${ID}&s=00`), t.env)).status).toBe(404);
    expect((await handleApi(new Request(`${HOST}/api/unsubscribe?p=${ID}&s=00`, { method: "POST" }), t.env)).status).toBe(404);
  });

  it("without SIGNING_SECRET, a route that must rate-limit fails closed (503) and stores nothing", async () => {
    // guest sync switched on, or push configured, but the secret forgotten
    const guest = fakeEnv({ ...PROD, GUEST_SYNC_ENABLED: "true" });
    const g = await handleApi(new Request(`${HOST}/api/guest`, { method: "POST", headers: { "cf-connecting-ip": "203.0.113.9" } }), guest.env);
    expect(g.status).toBe(503);
    expect(await g.json()).toEqual({ error: "unavailable" });
    expect(guest.count("rate_limits")).toBe(0);
    expect(guest.count("guest_sessions")).toBe(0);

    const push = fakeEnv({ ...PROD, VAPID_PUBLIC_KEY: "BPub", VAPID_PRIVATE_KEY: "priv" });
    const p = await handleApi(new Request(`${HOST}/api/push/unsubscribe`, { method: "POST", headers: { origin: HOST, "content-type": "application/json", "cf-connecting-ip": "203.0.113.9" }, body: JSON.stringify({ id: ID }) }), push.env);
    expect(p.status).toBe(503);
    expect(push.count("rate_limits")).toBe(0);

    // the limiter itself: no unkeyed fallback on a real host; development on localhost keeps its dev key
    await expect(allow(push.env, LIMITS.pushPerIp, "203.0.113.9", new URL(HOST))).rejects.toBeInstanceOf(RateLimitUnavailable);
    expect(push.count("rate_limits")).toBe(0);
    const dev = fakeEnv();
    expect(await allow(dev.env, LIMITS.writePerParent, ID, new URL("http://localhost:5173/x"))).toBe(true);
    expect(dev.count("rate_limits")).toBe(1);
  });
});

describe("billing off: the entitlement is free (early access)", () => {
  it("for a parent long past day 15 and for any device", async () => {
    const t = fakeEnv({ BILLING_ENABLED: "false" });
    t.raw.prepare("INSERT INTO parents (id, email, consent_version, consented_at, created_at, digest_opt_in) VALUES ('p1', 'p@example.com', 'v', 1, 1, 0)").run();
    const now = Date.UTC(2027, 0, 1);
    for (const subject of [{ parentId: "p1" }, { parentId: "nobody" }, { deviceId: "11111111-1111-4111-8111-111111111111" }]) {
      const e = await getEntitlement(t.env, subject, now);
      expect(e).toEqual({ status: "free", source: "early-access", accessUntil: null, checkedAt: now });
      expect(canPlay(e, now + 400 * DAY_MS)).toBe(true);
      expect(parseEntitlement(JSON.parse(JSON.stringify(e)))).toEqual(e);
    }
    // billing on: the same parent is past the free period
    expect((await getEntitlement(fakeEnv().env, { deviceId: "x" }, now)).source).toBe("intro");
  });
});

describe("cron jobs with accounts off", () => {
  const NOW = Date.parse("2026-11-17T23:00:00Z");
  function seedDigestParent(t: T) {
    t.raw.prepare("INSERT INTO parents (id, email, consent_version, consented_at, created_at, digest_opt_in) VALUES ('11111111-1111-4111-8111-111111111111', 'yes@example.com', 'v', 1, 1, 1)").run();
    const ts = NOW - 3 * 3600_000;
    const history = [{ id: `${ts}-sky-balloon-race`, ts, day: new Date(ts).toISOString().slice(0, 10), gameId: "sky-balloon-race", level: 1, exercises: 8, firstTry: 5, stars: 2, seconds: 150, skills: ["math.add.within-20"] }];
    t.raw
      .prepare("INSERT INTO children (id, parent_id, monster_json, public_name, age_band, nickname, settings_json, progress_json, created_at, updated_at) VALUES ('c1', '11111111-1111-4111-8111-111111111111', '{}', 'Brave Zoomkin', 'ages-6-8', NULL, '{}', ?, 1, 1)")
      .run(JSON.stringify({ ...emptyChildProgress(), history }));
  }
  const digestCron = Object.entries(CRON_JOBS).find(([, jobs]) => jobs.includes("daily-digest"))![0];
  const secrets = { APP_ENV: "staging", RESEND_API_KEY: "re_test", SIGNING_SECRET: "s".repeat(40), APP_ORIGIN: "https://brainzippy.test" };

  it("the daily digest does nothing: no Resend call, no rows marked", async () => {
    const t = fakeEnv({ ...secrets, ...OFF });
    seedDigestParent(t);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "1" }] })));
    expect(await runScheduled(digestCron, t.env, NOW)).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(t.raw.prepare("SELECT digest_last_sent_at FROM parents").get()).toEqual({ digest_last_sent_at: null });
  });

  it("with accounts on, the same cron sends (control)", async () => {
    const t = fakeEnv(secrets);
    seedDigestParent(t);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "1" }] })));
    expect(await runScheduled(digestCron, t.env, NOW)).toEqual([]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("the retention purge still runs", async () => {
    const t = fakeEnv(OFF);
    const now = Date.now();
    t.raw.prepare("INSERT INTO guest_sessions (id, created_at, updated_at) VALUES ('g1', 0, 0)").run();
    expect(await runScheduled("17 3 * * *", t.env, now)).toEqual([]);
    expect(t.count("guest_sessions")).toBe(0);
  });
});

describe("public site follows the build's billing flag", () => {
  it("production build (billing off): no /pricing page or link, early-access wording, contact email everywhere it belongs", async () => {
    const s = await importSite({ billing: false });
    const { pages, llms } = s.renderSite({ css: "", js: "/a.js", preloadFont: "/f.woff2" });
    const html = (p: string) => pages.find((x) => x.path === p)!.html;
    expect(pages.map((p) => p.path)).not.toContain("/pricing");
    for (const p of pages) {
      expect(p.html, p.path).not.toContain('href="/pricing"');
      expect(p.html, p.path).not.toMatch(/\$6\.99/);
      expect(p.html, p.path).toContain("mailto:hello@brainzippy.com"); // footer
    }
    expect(html("/faq")).toContain("free while we&#x27;re in early access");
    expect(html("/faq")).toContain("How do I contact BrainZippy?");
    expect(html("/for-teachers")).toContain("Free while we&#x27;re in early access.");
    expect(html("/about")).toContain("Contact us");
    expect(s.SITE.pricing).toBeNull();
    expect(llms).toContain("- Contact: hello@brainzippy.com");
    expect(llms).not.toContain("/pricing");
    expect(JSON.stringify(s.FAQ)).not.toMatch(/6\.99|free-access code/);
  });

  it("billing-on build: /pricing is published and teachers are told to ask for a free school code", async () => {
    const s = await importSite({ billing: true });
    const { pages, llms } = s.renderSite({ css: "", js: "/a.js", preloadFont: "/f.woff2" });
    expect(pages.map((p) => p.path)).toContain("/pricing");
    const teachers = pages.find((p) => p.path === "/for-teachers")!.html;
    expect(teachers).toContain("Ask us for a free school code");
    expect(teachers).toContain("mailto:hello@brainzippy.com");
    expect(llms).toContain("https://brainzippy.com/pricing");
    expect(llms).toMatch(/\$6\.99 per month/);
  });
});
