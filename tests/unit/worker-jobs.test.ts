// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CRON_JOBS, runScheduled } from "../../worker/jobs";
import { dailyDigest, digestChild, suggestNext } from "../../worker/jobs/digest";
import { purge } from "../../worker/jobs/purge";
import { digestEmail, magicLinkEmail } from "../../worker/lib/emailTemplates";
import { emptyChildProgress, type RoundRecord } from "../../src/account/schema";
import { fakeEnv } from "./helpers/d1";
import { readFileSync } from "node:fs";

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

const NOW = Date.parse("2026-11-17T23:00:00Z");
const r = (hoursAgo: number, gameId = "sky-balloon-race"): RoundRecord => {
  const ts = NOW - hoursAgo * 3600_000;
  return { id: `${ts}-${gameId}`, ts, day: new Date(ts).toISOString().slice(0, 10), gameId, level: 1, exercises: 8, firstTry: 5, stars: 2, seconds: 150, skills: ["math.add.within-20"] };
};

function seedParent(t: ReturnType<typeof fakeEnv>, id: string, email: string, optIn: number, history: RoundRecord[], nickname: string | null = null) {
  t.raw.prepare("INSERT INTO parents (id, email, consent_version, consented_at, created_at, digest_opt_in) VALUES (?, ?, '2026-11-17', 1, 1, ?)").run(id, email, optIn);
  const progress = { ...emptyChildProgress(), worlds: { "sky-balloon-race": { level: 1, stars: 2 } }, skills: { "math.add.within-20": { attempts: 12, firstTry: 4, completed: 8 } }, history };
  t.raw
    .prepare("INSERT INTO children (id, parent_id, monster_json, monster_name, age_band, nickname, settings_json, progress_json, created_at, updated_at) VALUES (?, ?, '{}', 'Ziggy', 'ages-6-8', ?, '{}', ?, 1, 1)")
    .run(`${id}-kid`, id, nickname, JSON.stringify(progress));
}

describe("email templates", () => {
  it("magic link: text twin, no images, link escaped", () => {
    const m = magicLinkEmail('https://x.test/api/auth/verify?token=abc&x="<b>', true);
    expect(m.html).not.toMatch(/<img/i);
    expect(m.html).toContain("&quot;&lt;b&gt;");
    expect(m.html).toContain('lang="en"');
    expect(m.text).toContain("expires in 15 minutes");
  });

  it("digest renders without images and escapes names", () => {
    const m = digestEmail([{ label: "Zig<gy>", games: [{ world: "Sky Balloon Race", level: 1, stars: 2 }], skills: ["Adding within 20"], streak: 2, suggestion: "More practice." }], "https://x.test/parents", "https://x.test/u");
    expect(m.html).not.toMatch(/<img|background-image|url\(/i);
    expect(m.html).toContain("Zig&lt;gy&gt;");
    expect(m.text).toContain("Sky Balloon Race: level 2, 2 of 3 stars");
    expect(m.text).toContain("Unsubscribe from daily summaries: https://x.test/u");
  });
});

describe("digest job", () => {
  it("digestChild summarises the last 24 hours only; suggestion targets the weakest skill", () => {
    const p = { ...emptyChildProgress(), skills: { "math.add.within-20": { attempts: 12, firstTry: 3, completed: 8 } }, history: [r(30), r(5), r(2, "glow-cave-hops")] };
    const d = digestChild("Ziggy", p, NOW)!;
    expect(d.games.map((g) => g.world)).toEqual(["Sky Balloon Race", "Glow Cave Hops"]);
    expect(d.streak).toBe(2);
    expect(d.suggestion).toContain("Sky Balloon Race");
    expect(digestChild("Ziggy", { ...p, history: [r(30)] }, NOW)).toBeNull();
    expect(suggestNext(emptyChildProgress())).toContain("Bobbo's Breakfast");
  });

  it("sends one Resend batch to opted-in parents with plays, with one-click unsubscribe headers; marks them; no repeat", async () => {
    const t = fakeEnv({ APP_ENV: "staging", RESEND_API_KEY: "re_test", SIGNING_SECRET: "s".repeat(40), APP_ORIGIN: "https://brainzippy.test" });
    seedParent(t, "11111111-1111-4111-8111-111111111111", "yes@example.com", 1, [r(3)]);
    seedParent(t, "22222222-2222-4222-8222-222222222222", "no@example.com", 0, [r(3)]);
    seedParent(t, "33333333-3333-4333-8333-333333333333", "idle@example.com", 1, [r(40)]);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "1" }] })));
    expect(await dailyDigest(t.env, NOW)).toEqual({ considered: 2, sent: 1 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails/batch");
    const batch = JSON.parse(init!.body as string) as { to: string[]; headers: Record<string, string>; html: string; text: string }[];
    expect(batch).toHaveLength(1);
    expect(batch[0]!.to).toEqual(["yes@example.com"]);
    expect(batch[0]!.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(batch[0]!.headers["List-Unsubscribe"]).toMatch(/^<https:\/\/brainzippy\.test\/api\/unsubscribe\?p=11111111-1111-4111-8111-111111111111&s=[0-9a-f]{64}>$/);
    expect(batch[0]!.html).toContain("Ziggy");
    expect(batch[0]!.text).toContain("Streak: 1 day in a row");
    expect((init!.headers as Record<string, string>)["idempotency-key"]).toMatch(/^digest-2026-11-17-/);
    expect(await dailyDigest(t.env, NOW + 60_000)).toEqual({ considered: 0, sent: 0 });
  });

  it("refuses to send without a signing secret (every email needs a signed unsubscribe link)", async () => {
    const t = fakeEnv({ APP_ENV: "staging", RESEND_API_KEY: "re_test" });
    seedParent(t, "11111111-1111-4111-8111-111111111111", "yes@example.com", 1, [r(3)], "Sam");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await dailyDigest(t.env, NOW)).toEqual({ considered: 0, sent: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("cron dispatch and purge", () => {
  it("every cron in wrangler.jsonc maps to known jobs, and vice versa", () => {
    const cfg = readFileSync(new URL("../../wrangler.jsonc", import.meta.url), "utf8");
    const crons = JSON.parse(cfg.replace(/^\s*\/\/.*$/gm, "")).triggers.crons as string[];
    expect(crons.sort()).toEqual(Object.keys(CRON_JOBS).sort());
  });

  it("purge removes expired rows only; an unknown cron runs nothing", async () => {
    const t = fakeEnv();
    const now = Date.now();
    t.raw.prepare("INSERT INTO auth_tokens (token_hash, email, purpose, created_at, expires_at) VALUES ('old', 'a@x.co', 'signin', 0, ?), ('new', 'a@x.co', 'signin', 0, ?)").run(now - 2 * 86400_000, now + 60_000);
    t.raw.prepare("INSERT INTO rate_limits (key, window_start, count) VALUES ('a', ?, 1), ('b', ?, 1)").run(now - 3 * 86400_000, now);
    t.raw.prepare("INSERT INTO guest_sessions (id, created_at, updated_at) VALUES ('g1', 0, 0), ('g2', ?, ?)").run(now, now);
    await purge(t.env, now);
    expect(t.raw.prepare("SELECT token_hash FROM auth_tokens").all()).toEqual([{ token_hash: "new" }]);
    expect(t.raw.prepare("SELECT key FROM rate_limits").all()).toEqual([{ key: "b" }]);
    expect(t.raw.prepare("SELECT id FROM guest_sessions").all()).toEqual([{ id: "g2" }]);
    expect(await runScheduled("1 1 1 1 1", t.env, now)).toEqual([]);
    expect(await runScheduled("17 3 * * *", t.env, now)).toEqual([]);
  });
});
