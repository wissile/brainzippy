import { describe, expect, it } from "vitest";
import { applyToGuest, guestToChildProgress, mergeChildProgress, mergeHistory } from "../../src/account/merge";
import { addDays, currentStreak, roundPoints, roundStars, streakBonus, weekStart, weekSummary } from "../../src/account/points";
import { cleanDisplayName, emptyChildProgress, normaliseEmail, parseChildProgress, parseMonster, parseRoundRecord, parseSettings, type ChildProgress, type RoundRecord } from "../../src/account/schema";
import { MONSTER_PARTS, SKILL_LABELS, SKILL_WORLD, WORLD_IDS } from "../../src/account/catalog";
import { ARMS, BODIES, COLORS, EYES, MOUTHS, TOPS } from "../../src/characters/Monster";
import { cookieName, readCookie, sessionCookie } from "../../worker/lib/session";
import { hmacHex, inviteCode, normaliseInviteCode, randomToken, safeEqual, sha256Hex, TOKEN_RE, verifyHmac } from "../../worker/lib/crypto";

const rec = (day: string, o: Partial<RoundRecord> = {}): RoundRecord => {
  const ts = Date.parse(`${day}T12:00:00Z`) + (o.ts ?? 0);
  const gameId = o.gameId ?? "counting-adventure";
  return { id: `${ts}-${gameId}`, ts, day, gameId, level: 0, exercises: 8, firstTry: 8, stars: 3, seconds: 90, skills: ["math.count.cardinality"], ...o, ...(o.ts !== undefined ? { ts } : {}) };
};

const P = (o: Partial<ChildProgress>): ChildProgress => ({ ...emptyChildProgress(), ...o });

describe("merge (local-first sync)", () => {
  const a = P({
    worlds: { "counting-adventure": { level: 2, stars: 1 }, "glow-cave-hops": { level: 0, stars: 2 } },
    stickers: ["counting-champ"],
    skills: { "math.count.cardinality": { attempts: 10, firstTry: 6, completed: 8 } },
    roundsCompleted: 4,
    history: [rec("2026-11-10"), rec("2026-11-12")],
  });
  const b = P({
    worlds: { "counting-adventure": { level: 1, stars: 3 }, "sky-balloon-race": { level: 1, stars: 1 } },
    stickers: ["sky-champion", "counting-champ"],
    skills: { "math.count.cardinality": { attempts: 12, firstTry: 5, completed: 8 }, "math.add.within-20": { attempts: 8, firstTry: 8, completed: 8 } },
    roundsCompleted: 2,
    history: [rec("2026-11-12"), rec("2026-11-11", { gameId: "sky-balloon-race" })],
  });
  const c = P({ worlds: { "cookie-kitchen": { level: 3, stars: 2 } }, stickers: ["fair-sharer"], roundsCompleted: 9, history: [rec("2026-11-09", { gameId: "cookie-kitchen" })] });

  it("per-world level = max, stars = max, stickers = union, tallies = per-field max, rounds = max", () => {
    const m = mergeChildProgress(a, b);
    expect(m.worlds).toEqual({ "counting-adventure": { level: 2, stars: 3 }, "glow-cave-hops": { level: 0, stars: 2 }, "sky-balloon-race": { level: 1, stars: 1 } });
    expect(m.stickers).toEqual(["counting-champ", "sky-champion"]);
    expect(m.skills["math.count.cardinality"]).toEqual({ attempts: 12, firstTry: 6, completed: 8 });
    expect(m.roundsCompleted).toBe(4);
    expect(m.history.map((h) => h.day)).toEqual(["2026-11-10", "2026-11-11", "2026-11-12"]);
  });

  it("is commutative, associative and idempotent", () => {
    expect(mergeChildProgress(a, b)).toEqual(mergeChildProgress(b, a));
    expect(mergeChildProgress(mergeChildProgress(a, b), c)).toEqual(mergeChildProgress(a, mergeChildProgress(b, c)));
    const m = mergeChildProgress(a, b);
    expect(mergeChildProgress(m, m)).toEqual(m);
    expect(mergeChildProgress(m, a)).toEqual(m);
  });

  it("caps history to the newest records, deterministically", () => {
    const many = Array.from({ length: 30 }, (_, i) => rec(addDays("2026-10-01", i)));
    const capped = mergeHistory(many.slice(0, 20), many.slice(10), 12);
    expect(capped).toHaveLength(12);
    expect(capped[0]!.day).toBe(addDays("2026-10-01", 18));
    expect(capped.at(-1)!.day).toBe(addDays("2026-10-01", 29));
    expect(mergeHistory(many.slice(10), many.slice(0, 20), 12)).toEqual(capped);
  });

  it("guest progress converts, and merged progress folds back without lowering anything", () => {
    const guest = { v: 1 as const, stickers: ["counting-champ"], roundsCompleted: 3, skills: { "math.count.subitize": { attempts: 5, firstTry: 3, completed: 4 } }, levels: { "counting-adventure": 1 } };
    const cp = guestToChildProgress(guest, [rec("2026-11-12", { stars: 2 })]);
    expect(cp.worlds).toEqual({ "counting-adventure": { level: 1, stars: 2 } });
    expect(parseChildProgress(cp)).toEqual(cp);
    const server = P({ worlds: { "counting-adventure": { level: 3, stars: 3 }, "glow-cave-hops": { level: 2, stars: 1 } }, stickers: ["cave-explorer"], roundsCompleted: 10 });
    const back = applyToGuest(guest, mergeChildProgress(cp, server));
    expect(back.levels).toEqual({ "counting-adventure": 3, "glow-cave-hops": 2 });
    expect(back.stickers).toEqual(["cave-explorer", "counting-champ"]);
    expect(back.roundsCompleted).toBe(10);
    expect(back.skills["math.count.subitize"]).toEqual({ attempts: 5, firstTry: 3, completed: 4 });
  });
});

describe("points (deterministic, never penalises mistakes)", () => {
  it("round stars and points", () => {
    expect([roundStars(8, 0), roundStars(8, 3), roundStars(8, 4), roundStars(8, 6), roundStars(8, 7), roundStars(8, 8)]).toEqual([1, 1, 2, 2, 3, 3]);
    expect(roundPoints({ stars: 1, firstTry: 0 })).toBe(10);
    expect(roundPoints({ stars: 3, firstTry: 8 })).toBe(46);
  });

  it("mistakes never reduce points: more first tries never earn less", () => {
    for (let f = 0; f < 8; f++) expect(roundPoints({ stars: roundStars(8, f + 1), firstTry: f + 1 })).toBeGreaterThan(roundPoints({ stars: roundStars(8, f), firstTry: f }));
  });

  it("weeks start on Monday; streaks count consecutive days and survive until a day is missed", () => {
    expect(weekStart("2026-11-17")).toBe("2026-11-16"); // Tuesday → Monday
    expect(weekStart("2026-11-22")).toBe("2026-11-16"); // Sunday
    expect(weekStart("2026-11-16")).toBe("2026-11-16");
    const h = [rec("2026-11-14"), rec("2026-11-15"), rec("2026-11-16")];
    expect(currentStreak(h, "2026-11-16")).toBe(3);
    expect(currentStreak(h, "2026-11-17")).toBe(3); // today not played yet
    expect(currentStreak(h, "2026-11-18")).toBe(0);
    expect(streakBonus(0)).toBe(0);
    expect(streakBonus(10)).toBe(35);
  });

  it("weekly summary: points = rounds + one streak bonus per day; minutes and skills", () => {
    const h = [rec("2026-11-15"), rec("2026-11-16"), rec("2026-11-16", { ts: 1000, firstTry: 2, stars: 1, skills: ["math.count.subitize"] }), rec("2026-11-17")];
    const w = weekSummary(h, "2026-11-17");
    // in week: 46 + (10 + 4) + 46 = 106; bonuses: 16th streak 2 → 10, 17th streak 3 → 15
    expect(w).toEqual({ weekStart: "2026-11-16", points: 106 + 10 + 15, rounds: 3, minutes: 5, skills: ["math.count.cardinality", "math.count.subitize"], days: 2 });
    expect(weekSummary(h, "2026-11-17")).toEqual(w);
    expect(weekSummary([], "2026-11-17").points).toBe(0);
  });
});

describe("schema validation", () => {
  it("emails, names, monsters, settings", () => {
    expect(normaliseEmail("  A@B.co ")).toBe("a@b.co");
    expect(normaliseEmail("a@b")).toBeNull();
    expect(normaliseEmail(`${"x".repeat(250)}@b.co`)).toBeNull();
    expect(cleanDisplayName(" Zig<script>gy ")).toBe("Zigscriptgy");
    expect(cleanDisplayName("1234")).toBeNull();
    expect(parseMonster({ body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" })).not.toBeNull();
    expect(parseMonster({ body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns", x: 1 })).toBeNull();
    expect(parseSettings({})).toEqual({ dailyLimit: 5, sound: true, music: true });
    expect(parseSettings({ dailyLimit: 3 })?.dailyLimit).toBe(3);
    expect(parseSettings({ dailyLimit: 10 })?.dailyLimit).toBe(10);
    expect(parseSettings({ dailyLimit: 0 })).toBeNull();
  });

  it("round records and child progress are strict", () => {
    const r = rec("2026-11-17");
    expect(parseRoundRecord(r)).toEqual(r);
    expect(parseRoundRecord({ ...r, firstTry: 9 })).toBeNull();
    expect(parseRoundRecord({ ...r, seconds: 5000 })).toBeNull();
    expect(parseRoundRecord({ ...r, kidName: "Sam" })).toBeNull();
    expect(parseChildProgress({ ...emptyChildProgress(), history: Array.from({ length: 201 }, () => r) })).toBeNull();
    expect(parseChildProgress({ ...emptyChildProgress(), worlds: { "x y": { level: 1, stars: 1 } } })).toBeNull();
  });

  it("catalogue mirrors the monster kit and covers every game's skills", async () => {
    expect(MONSTER_PARTS).toEqual({ body: [...BODIES], color: [...COLORS], eyes: [...EYES], mouth: [...MOUTHS], arms: [...ARMS], top: [...TOPS] });
    const defs = await Promise.all(WORLD_IDS.map((id) => import(`../../src/games/${id}/definition.ts`)));
    for (const [i, mod] of defs.entries()) {
      const def = Object.values(mod as Record<string, unknown>).find((v) => (v as { id?: string })?.id === WORLD_IDS[i]) as { skillIds: string[]; progression: { maxDifficulty: number; minDifficulty: number } };
      expect(def, WORLD_IDS[i]).toBeTruthy();
      for (const s of def.skillIds) {
        expect(SKILL_LABELS[s], s).toBeTruthy();
        expect(SKILL_WORLD[s]).toBe(WORLD_IDS[i]);
      }
    }
  });
});

describe("token, signing and session helpers", () => {
  it("random tokens are 256-bit hex and unique; hashes are stable", async () => {
    const t = randomToken();
    expect(t).toMatch(TOKEN_RE);
    expect(randomToken()).not.toBe(t);
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("HMAC verify accepts the right signature only", async () => {
    const sig = await hmacHex("k".repeat(32), "msg");
    expect(await verifyHmac("k".repeat(32), "msg", sig)).toBe(true);
    expect(await verifyHmac("k".repeat(32), "msg2", sig)).toBe(false);
    expect(await verifyHmac("j".repeat(32), "msg", sig)).toBe(false);
    expect(await verifyHmac("k".repeat(32), "msg", "zz")).toBe(false);
    expect(safeEqual("ab", "ab")).toBe(true);
    expect(safeEqual("ab", "ac")).toBe(false);
  });

  it("invite codes are unambiguous and normalise from user input", () => {
    for (let i = 0; i < 50; i++) expect(inviteCode()).toMatch(/^[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}$/);
    expect(normaliseInviteCode("abcde fghjk")).toBe("ABCDE-FGHJK");
    expect(normaliseInviteCode("23456-789ab")).toBe("23456-789AB");
    expect(normaliseInviteCode("2345-6789")).toBeNull();
    expect(normaliseInviteCode("ILO00-23456")).toBeNull();
  });

  it("session cookies: HttpOnly, SameSite=Lax, Secure + __Host- except plain-http localhost", () => {
    const prod = new URL("https://brainzippy.com/api/me");
    const local = new URL("http://localhost:4181/api/me");
    expect(cookieName(prod)).toBe("__Host-bz_sid");
    expect(sessionCookie(prod, "v", 60)).toBe("__Host-bz_sid=v; Path=/; HttpOnly; SameSite=Lax; Max-Age=60; Secure");
    expect(sessionCookie(local, "v", 60)).toBe("bz_sid=v; Path=/; HttpOnly; SameSite=Lax; Max-Age=60");
    expect(readCookie(new Request(prod, { headers: { cookie: "a=1; __Host-bz_sid=abc; b=2" } }), "__Host-bz_sid")).toBe("abc");
  });
});
