// @vitest-environment node
/** Anonymous play statistics (D-033): schema rules, the Worker endpoints, retention and the dashboard aggregation. */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleApi } from "../../worker/index";
import { purge } from "../../worker/jobs/purge";
import { publicConfig } from "../../worker/lib/config";
import { parseBatch } from "../../worker/routes/stats";
import { answerDim, deviceClass, EVENTS, EXERCISE_PREFIX, outcomeFor, secondsBucket, validRow } from "../../src/analytics/schema";
import { registry } from "../../src/content/registry";
import { buildRound } from "../../src/engine/round";
import { limiterKey } from "../../worker/routes/stats";
import { breakdown, dailySeries, funnel, hardestExercises, perGame, skillLadder, summary, type InsightRow } from "../../src/analytics/insights";
import { fakeEnv } from "./helpers/d1";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

const O = "http://localhost";
const TOKEN = "t".repeat(40);
const content = {
  isGame: (id: string) => ["sky-balloon-race", "glow-cave-hops"].includes(id),
  skillsOf: (id: string) => (id === "sky-balloon-race" ? ["math.add.within-10"] : undefined),
};
const env = (extra: Record<string, string> = {}) => fakeEnv({ ACCOUNTS_ENABLED: "false", BILLING_ENABLED: "false", FRIENDS_ENABLED: "false", ANALYTICS_ENABLED: "true", ANALYTICS_TOKEN: TOKEN, ...extra });
type T = ReturnType<typeof env>;
const post = (t: T, body: unknown, headers: Record<string, string> = {}) =>
  handleApi(new Request(`${O}/api/play-stats`, { method: "POST", headers: { origin: O, "content-type": "text/plain;charset=UTF-8", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) }), t.env);
const insights = (t: T, auth?: string, q = "") => handleApi(new Request(`${O}/api/insights${q}`, { headers: auth ? { authorization: auth } : {} }), t.env);

describe("schema: what may be counted", () => {
  it("accepts well-formed rows and rejects everything else", () => {
    expect(validRow(["round_done", "sky-balloon-race", "L2", "s3", 1, 95], content)).toEqual(["round_done", "sky-balloon-race", "L2", "s3", 1, 95]);
    expect(validRow(["session", "", "tablet", "", 1, 0], content)).not.toBeNull();
    expect(validRow(["age_band", "", "ages-6-8", "", 1, 0], content)).not.toBeNull();
    expect(validRow(["skill_done", "sky-balloon-race", "math.add.within-10@d2", "later", 1, 9], content)).not.toBeNull();
    expect(validRow(["wrong", "sky-balloon-race", "sb-3p4", "12", 1, 0], content)).not.toBeNull();
    const bad: unknown[] = [
      ["nope", "", "", "", 1, 0], // unknown event
      ["session", "sky-balloon-race", "tablet", "", 1, 0], // game on a non-game event
      ["round_start", "made-up-game", "L1", "", 1, 0], // unknown game
      ["session", "", "toaster", "", 1, 0], // value outside the closed list
      ["screen", "", "map", "", 1, 5], // total on an event without totals
      ["screen", "", "map", "", 0, 0], // zero count
      ["screen", "", "map", "", 501, 0], // count too large
      ["screen", "", "map", "", 1.5, 0], // not an integer
      ["wrong", "sky-balloon-race", "sb-3p4", "Sam Smith", 1, 0], // free text in a dimension
      ["wrong", "sky-balloon-race", "sb-3p4", "07700900123", 1, 0], // a long number (a phone number typed?)
      ["wrong", "sky-balloon-race", "emma-jones", "3", 1, 0], // an "exercise id" that isn't one of this game's
      ["ex_done", "sky-balloon-race", "gc-1-plus-2-to-5", "first-try", 1, 0], // another game's exercise
      ["hint", "", "sb-3p4", "helper", 1, 0], // exercise events need their game
      ["skill_done", "sky-balloon-race", "made.up.skill@d1", "first-try", 1, 0], // skill the game doesn't practise
      ["session", "", "phone", "ages-3-5", 1, 0], // device and age band are never stored together
      ["wrong", "sky-balloon-race", "sb-3p4", "sam@example.com", 1, 0], // an email can't pass as an id
      ["error", "", "app", "TypeError: cannot read 'x'", 1, 0], // error message, not just the type name
      ["screen", "", "map", ""], // wrong shape
      "screen",
    ];
    for (const b of bad) expect(validRow(b, content), JSON.stringify(b)).toBeNull();
  });

  it("no dimension can hold free text: closed lists or our own lower-case id patterns only", () => {
    const samples = ["Sam", "Hello there", "sam smith", "A", "x".repeat(100), "<script>", "naïve", "sam@example.com"];
    for (const [name, spec] of Object.entries(EVENTS)) {
      for (const k of ["k1", "k2"] as const) {
        const rule = spec[k] as { values?: readonly string[]; pattern?: RegExp };
        if (rule.values) expect(rule.values.every((v) => /^[a-z0-9.:+-]*$/.test(v)), `${name}.${k}`).toBe(true);
        // error.k2 allows an error type name (letters only, e.g. "TypeError"): never spaces, punctuation or digits
        const allowsLetterWord = name === "error" && k === "k2";
        for (const s of samples) if (!allowsLetterWord || /[^A-Za-z]/.test(s) || s.length > 40) expect(rule.values?.includes(s) ?? rule.pattern!.test(s), `${name}.${k} accepts ${s}`).toBe(false);
      }
    }
  });

  it("answers become numbers or our ids; anything typed becomes 'other'", () => {
    expect(answerDim(7)).toBe("7");
    expect(answerDim(2.5)).toBe("2.5");
    expect(answerDim(1234)).toBe("1234");
    expect(answerDim("42")).toBe("42");
    expect(answerDim("opt-red")).toBe("opt-red");
    expect(answerDim(["a", "b", "c"])).toBe("a,b,c");
    expect(answerDim({ cat: "mammal", fish: "water" })).toBe("cat>mammal,fish>water");
    for (const typed of ["Sam", "my name is sam", "ÆØÅ", ["a", "Bob"], { x: "Hi there" }, null, undefined, 1e12, 12345, 7700900123, "07700900123", "12345"]) expect(answerDim(typed), JSON.stringify(typed)).toBe("other");
  });

  it("every game is in EXERCISE_PREFIX and all its exercises start with that prefix (the Worker relies on it)", async () => {
    expect(Object.keys(EXERCISE_PREFIX).sort()).toEqual(registry.worlds.map((w) => w.id).sort());
    for (const w of registry.worlds) {
      const game = await w.loadDefinition();
      for (let level = 0; level <= w.maxLevel; level++)
        for (const seed of [1, 7, 123])
          for (const ex of buildRound(game, { level, seed }).exercises) {
            expect(ex.id.startsWith(`${EXERCISE_PREFIX[w.id]}-`), `${w.id}: ${ex.id}`).toBe(true);
            expect(ex.id.length, ex.id).toBeLessThanOrEqual(96);
          }
    }
  }, 60_000);

  it("rate-limit keys group an IPv6 home network (/64) and keep IPv4 as is", () => {
    expect(limiterKey("203.0.113.9")).toBe("203.0.113.9");
    expect(limiterKey("2001:db8:1:2:aaaa:bbbb:cccc:dddd")).toBe("2001:db8:1:2::/64");
    expect(limiterKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
  });

  it("buckets", () => {
    expect([1, 7, 15, 30, 60, 200].map(secondsBucket)).toEqual(["0-5", "5-10", "10-20", "20-40", "40-90", "90+"]);
    expect([outcomeFor(1, false), outcomeFor(2, false), outcomeFor(4, false), outcomeFor(3, true)]).toEqual(["first-try", "second-try", "later", "after-model"]);
    expect([deviceClass(390, 844, true), deviceClass(1024, 1366, true), deviceClass(1280, 800, false), deviceClass(820, 1180, true), deviceClass(1366, 768, false)]).toEqual(["phone", "tablet", "desktop", "tablet", "desktop"]);
  });
});

describe("POST /api/play-stats", () => {
  it("adds valid rows to today's counters, merges duplicates and skips bad rows one by one", async () => {
    const t = env();
    const rows = [
      ["round_done", "sky-balloon-race", "L1", "s2", 1, 100],
      ["round_done", "sky-balloon-race", "L1", "s2", 2, 50],
      ["session", "", "phone", "", 1, 0],
      ["wrong", "sky-balloon-race", "sb-3p4", "Typed Name", 1, 0],
    ];
    expect((await post(t, { rows })).status).toBe(204);
    expect((await post(t, { rows: [["round_done", "sky-balloon-race", "L1", "s2", 1, 10]] })).status).toBe(204);
    const day = new Date().toISOString().slice(0, 10);
    expect(t.raw.prepare("SELECT day, event, game, k1, k2, count, total FROM play_stats ORDER BY event").all()).toEqual([
      { day, event: "round_done", game: "sky-balloon-race", k1: "L1", k2: "s2", count: 4, total: 160 },
      { day, event: "session", game: "", k1: "phone", k2: "", count: 1, total: 0 },
    ]);
  });

  it("stores nothing that could identify a visitor: the table has no id, IP, user-agent or time column", async () => {
    const t = env();
    await post(t, { rows: [["session", "", "phone", "", 1, 0]] }, { "user-agent": "Mozilla/5.0 Test", "cf-connecting-ip": "203.0.113.9", cookie: "x=1" });
    const cols = (t.raw.prepare("PRAGMA table_info(play_stats)").all() as { name: string }[]).map((c) => c.name);
    expect(cols).toEqual(["day", "event", "game", "k1", "k2", "count", "total"]);
    const dump = JSON.stringify(t.raw.prepare("SELECT * FROM play_stats").all());
    expect(dump).not.toContain("203.0.113.9");
    expect(dump).not.toContain("Mozilla");
    // and no other table was written
    for (const table of ["guest_sessions", "rate_limits", "parents", "children", "push_subscriptions"]) expect(t.count(table), table).toBe(0);
  });

  it("rejects malformed bodies, oversized batches, other content types and other origins", async () => {
    const t = env();
    expect((await post(t, "not json")).status).toBe(400);
    expect((await post(t, { rows: [] })).status).toBe(400);
    expect((await post(t, { rows: Array.from({ length: 61 }, () => ["screen", "", "map", "", 1, 0]) })).status).toBe(400);
    expect((await post(t, { rows: [["screen", "", "map", "", 1, 0]] }, { "content-type": "application/x-www-form-urlencoded" })).status).toBe(400);
    expect((await post(t, { rows: [["screen", "", "map", "", 1, 0]] }, { origin: "https://evil.example" })).status).toBe(403);
    expect(t.count("play_stats")).toBe(0);
  });

  it("answers 404 (as if missing) when ANALYTICS_ENABLED is not exactly \"true\", and /api/config says so", async () => {
    for (const v of ["false", "", "1", "TRUE"]) {
      const t = env({ ANALYTICS_ENABLED: v });
      expect((await post(t, { rows: [["screen", "", "map", "", 1, 0]] })).status, v).toBe(404);
      expect((await insights(t, `Bearer ${TOKEN}`)).status, v).toBe(404);
      expect(publicConfig(t.env).analytics).toBe(false);
    }
    expect(publicConfig(env().env).analytics).toBe(true);
  });

  it("over the per-IP rate limit, the batch is dropped (204) and the limiter key is the IP's /64, never stored", async () => {
    const t = env({ APP_ENV: "production" }); // development on localhost is never limited
    const keys: string[] = [];
    let allow = true;
    (t.env as Env).STATS_LIMITER = { limit: async ({ key }) => (keys.push(key), { success: allow }) };
    const row = { rows: [["screen", "", "map", "", 1, 0]] };
    expect((await post(t, row, { "cf-connecting-ip": "2001:db8:1:2:3:4:5:6" })).status).toBe(204);
    allow = false;
    expect((await post(t, row, { "cf-connecting-ip": "2001:db8:1:2:9:9:9:9" })).status).toBe(204);
    expect(keys).toEqual(["2001:db8:1:2::/64", "2001:db8:1:2::/64"]);
    expect(t.raw.prepare("SELECT count FROM play_stats").all()).toEqual([{ count: 1 }]);
  });

  it("wrangler.jsonc binds the rate limiter in every environment", () => {
    const cfg = JSON.parse(readFileSync(new URL("../../wrangler.jsonc", import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, ""));
    for (const c of [cfg, cfg.env.staging, cfg.env.production]) expect(c.ratelimits?.[0]?.name).toBe("STATS_LIMITER");
  });

  it("a database failure still answers 204 (stats never matter more than play)", async () => {
    const t = env();
    t.raw.exec("DROP TABLE play_stats");
    expect((await post(t, { rows: [["screen", "", "map", "", 1, 0]] })).status).toBe(204);
  });

  it("parseBatch merges duplicate keys", () => {
    expect(parseBatch(JSON.stringify({ rows: [["screen", "", "map", "", 1, 0], ["screen", "", "map", "", 3, 0]] }))!.rows).toEqual([["screen", "", "map", "", 4, 0]]);
  });
});

describe("GET /api/insights", () => {
  it("is invisible without the exact owner key (or with a short key configured)", async () => {
    const t = env();
    expect((await insights(t)).status).toBe(404);
    expect((await insights(t, "Bearer wrong")).status).toBe(404);
    expect((await insights(t, `Bearer ${TOKEN}x`)).status).toBe(404);
    expect((await insights(env({ ANALYTICS_TOKEN: "short" }), "Bearer short")).status).toBe(404);
    expect((await insights(env({ ANALYTICS_TOKEN: "" }), "Bearer ")).status).toBe(404);
  });

  it("returns summed rows and per-day totals for the range", async () => {
    const t = env();
    const today = new Date().toISOString().slice(0, 10);
    const old = new Date(Date.now() - 40 * 86_400_000).toISOString().slice(0, 10);
    t.raw.prepare("INSERT INTO play_stats VALUES (?, 'session', '', 'phone', '', 3, 0), (?, 'session', '', 'phone', '', 5, 0), (?, 'round_done', 'sky-balloon-race', 'L0', 's3', 2, 200)").run(today, old, today);
    const res = await insights(t, `Bearer ${TOKEN}`, "?days=30");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as { rows: unknown[]; perDay: unknown[]; days: number };
    expect(body.days).toBe(30);
    expect(body.rows).toContainEqual(["session", "", "phone", "", 3, 0]);
    expect(body.perDay).toEqual([[today, "round_done", 2], [today, "session", 3]].sort((a, b) => String(a[1]).localeCompare(String(b[1]))));
    const year = (await (await insights(t, `Bearer ${TOKEN}`, "?days=400")).json()) as { rows: unknown[] };
    expect(year.rows).toContainEqual(["session", "", "phone", "", 8, 0]);
  });
});

describe("retention", () => {
  it("the daily purge deletes counters older than 400 days", async () => {
    const t = env();
    const now = Date.parse("2026-11-23T03:10:00Z");
    t.raw.prepare("INSERT INTO play_stats VALUES ('2025-10-18', 'session', '', '', '', 1, 0), ('2025-10-19', 'session', '', '', '', 1, 0)").run();
    await purge(t.env, now);
    expect(t.raw.prepare("SELECT day FROM play_stats").all()).toEqual([{ day: "2025-10-19" }]);
  });

  it("production config turns analytics on and needs no secret to collect", () => {
    const cfg = JSON.parse(readFileSync(new URL("../../wrangler.jsonc", import.meta.url), "utf8").replace(/^\s*\/\/.*$/gm, ""));
    expect(cfg.vars.ANALYTICS_ENABLED).toBe("true");
    expect(cfg.env.production.vars.ANALYTICS_ENABLED).toBe("true");
    expect(cfg.env.production.vars.ANALYTICS_TOKEN).toBeUndefined(); // the key is a secret, never a var
  });
});

describe("the privacy notice describes every counter", () => {
  it("each event in the schema has its wording in the notice (add an event → update /privacy)", () => {
    const notice = readFileSync(new URL("../../src/site/pages/privacy.tsx", import.meta.url), "utf8");
    const WORDING: Record<string, string> = {
      session: "phone, tablet or computer", age_band: "age group", setting: "whether sound and music were on", load: "start-up took",
      screen: "screen was opened", onb_step: "first-run step", daily: "daily game limit", round_start: "rounds started",
      round_done: "with stars", round_quit: "left early", level_up: "level-ups", ex_done: "each question solved",
      skill_done: "each question solved", wrong: "wrong answers given", hint: "hints shown", think: "thinking-time", error: "type of error",
    };
    expect(Object.keys(WORDING).sort()).toEqual(Object.keys(EVENTS).sort());
    for (const [event, words] of Object.entries(WORDING)) expect(notice, event).toContain(words);
  });
});

describe("dashboard aggregation", () => {
  const rows: InsightRow[] = [
    ["session", "", "phone", "", 10, 0],
    ["session", "", "tablet", "", 30, 0],
    ["onb_step", "", "intro", "", 40, 0],
    ["onb_step", "", "pop", "", 30, 0],
    ["onb_step", "", "done", "", 20, 0],
    ["round_start", "sky-balloon-race", "L0", "", 20, 0],
    ["round_done", "sky-balloon-race", "L0", "s3", 15, 15 * 120],
    ["round_quit", "sky-balloon-race", "L0", "1-2", 5, 0],
    ["ex_done", "sky-balloon-race", "sb-3p4", "first-try", 4, 40],
    ["ex_done", "sky-balloon-race", "sb-3p4", "after-model", 8, 240],
    ["ex_done", "sky-balloon-race", "sb-1p1", "first-try", 20, 60],
    ["wrong", "sky-balloon-race", "sb-3p4", "6", 9, 0],
    ["wrong", "sky-balloon-race", "sb-3p4", "8", 2, 0],
    ["hint", "sky-balloon-race", "sb-3p4", "model-answer", 8, 0],
    ["skill_done", "sky-balloon-race", "math.add.within-10@d2", "first-try", 9, 0],
    ["skill_done", "sky-balloon-race", "math.add.within-10@d2", "later", 3, 0],
    ["level_up", "sky-balloon-race", "L1", "", 6, 0],
  ];
  it("summary, funnel, games, hardest exercises, skill ladder, breakdowns", () => {
    expect(summary(rows)).toEqual({ sessions: 40, roundsStarted: 20, roundsDone: 15, roundsQuit: 5, finishRate: 75, avgRoundMin: 2, exercisesSolved: 32, firstTryRate: 75 });
    expect(funnel(rows).map((s) => [s.step, s.count, s.pct])).toEqual([["intro", 40, 100], ["pop", 30, 75], ["build", 0, 0], ["name", 0, 0], ["kid", 0, 0], ["age", 0, 0], ["done", 20, 50]]);
    const g = perGame(rows)[0]!;
    expect([g.started, g.done, g.finishRate, g.avgMin, g.levelUps, g.quitAfter]).toEqual([20, 15, 75, 2, 6, { "1-2": 5 }]);
    const hard = hardestExercises(rows);
    expect(hard[0]).toMatchObject({ id: "sb-3p4", solved: 12, firstTryRate: 33, afterModelRate: 67, avgSec: 23, hints: 8, wrong: [{ answer: "6", count: 9 }, { answer: "8", count: 2 }] });
    expect(hard[1]!.id).toBe("sb-1p1");
    expect(skillLadder(rows)).toEqual([{ game: "sky-balloon-race", skill: "math.add.within-10", difficulty: 2, solved: 12, firstTryRate: 75, avgSec: 0 }]);
    expect(breakdown(rows, "session", "k1")).toEqual([{ key: "tablet", count: 30, pct: 75 }, { key: "phone", count: 10, pct: 25 }]);
    expect(dailySeries([["2026-11-02", "session", 4]], "session", "2026-11-01", 3)).toEqual([{ day: "2026-11-01", count: 0 }, { day: "2026-11-02", count: 4 }, { day: "2026-11-03", count: 0 }]);
  });
});
