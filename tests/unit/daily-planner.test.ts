import { describe, expect, it } from "vitest";
import { emptyDailyLog } from "../../src/engine/progressSchema";
import { seedForDay } from "../../src/engine/rng";
import { MAX_PER_WORLD, type AgeRange, type PlanInput, type PlanStop, type PlannerSkill, type PlannerWorld, dayWorlds, litStops, newCap, planDay, registryFingerprint, reviewSlots, roundSeed } from "../../src/daily/planner";
import { addDays } from "../../src/daily/date";
import { isDue } from "../../src/daily/memory";
import { createRng, hashSeed } from "../../src/engine/rng";
import type { SkillMemory } from "../../src/engine/progressSchema";
import { registry } from "../../src/content/registry";

// A synthetic library: a → b → c chain (maths), plus an independent reading world and an older one.
const skills: PlannerSkill[] = [
  { id: "m.a", ages: [3, 6], prerequisites: [] },
  { id: "m.a2", ages: [4, 6], prerequisites: ["m.a"] },
  { id: "m.b", ages: [5, 7], prerequisites: ["m.a2"] },
  { id: "m.c", ages: [6, 8], prerequisites: ["m.b"] },
  { id: "r.x", ages: [4, 6], prerequisites: [] },
  { id: "r.y", ages: [9, 11], prerequisites: [] },
];
const worlds: PlannerWorld[] = [
  { id: "count", subject: "math", skills: ["m.a", "m.a2"], ages: [4, 6], maxLevel: 7 },
  { id: "hops", subject: "math", skills: ["m.b"], ages: [5, 7], maxLevel: 3 },
  { id: "race", subject: "math", skills: ["m.c"], ages: [6, 8], maxLevel: 3 },
  { id: "rhyme", subject: "ela", skills: ["r.x"], ages: [4, 6], maxLevel: 3 },
  { id: "essay", subject: "ela", skills: ["r.y"], ages: [9, 11], maxLevel: 3 },
];
const base = (over: Partial<PlanInput> = {}): PlanInput => ({ day: "2026-11-18", limit: 5, band: [3, 5], worlds, skills, levels: {}, log: emptyDailyLog(), ...over });
const ids = (p: { world: string }[]) => p.map((s) => s.world);

describe("daily planner", () => {
  it("is deterministic: same input → same plan, regardless of world order", () => {
    const a = planDay(base());
    expect(planDay(base())).toEqual(a);
    expect(planDay(base({ worlds: [...worlds].reverse() }))).toEqual(a);
  });

  it("always makes exactly K stops (3..10) when any world exists", () => {
    for (let k = 3; k <= 10; k++) expect(planDay(base({ limit: k }))).toHaveLength(k);
    expect(planDay(base({ worlds: [] }))).toEqual([]);
    expect(planDay(base({ worlds: worlds.slice(0, 1) }))).toHaveLength(5);
  });

  it("new child: only worlds whose prerequisites are met; at most one brand-new world under 8 unless variety needs one more", () => {
    const one = planDay(base({ limit: 3, worlds: worlds.filter((w) => w.id !== "rhyme") }));
    expect(one.filter((s) => s.kind === "new")).toHaveLength(1);
    const plan = planDay(base());
    expect(new Set(ids(plan))).toEqual(new Set(["count", "rhyme"])); // hops/race locked, essay out of age window
    // 4 core slots, one familiar world: rhyme joins as a second NEW world rather than count playing 4 times (P7)
    expect(plan.filter((s) => s.kind === "new").map((s) => s.world)).toEqual(["count", "rhyme"]);
    expect(ids(plan.slice(0, 4))).toEqual(["count", "rhyme", "count", "rhyme"]);
    expect(newCap([3, 5])).toBe(1);
    expect(newCap([9, 11])).toBe(2);
  });

  it("prerequisites unlock through levels and skill evidence", () => {
    // count at its mastery level (floor(7/2) = 3) meets m.a2 → hops unlocks and becomes today's new world
    const plan = planDay(base({ band: [5, 7], levels: { count: 3, rhyme: 1 }, log: { ...emptyDailyLog(), seen: { count: "2026-11-17", rhyme: "2026-11-16" } } }));
    expect(plan.find((s) => s.kind === "new")?.world).toBe("hops");
    expect(ids(plan)).not.toContain("race"); // m.b not met yet
    const viaEvidence = planDay(base({ band: [5, 7], log: { ...emptyDailyLog(), skills: { "m.a2": { q: 3, lq: 0, b: 0, fails: 0 } } } }));
    expect(ids(viaEvidence)).toContain("hops");
  });

  it("older bands assume early skills by age and get the age-closest new world", () => {
    const plan = planDay(base({ band: [6, 8] }));
    // m.a / m.a2 end at 6 ≤ band start → assumed; hops (mid 6) is closest to 7 among unlocked unplayed worlds… race needs m.b
    expect(plan.find((s) => s.kind === "new")?.world).toBe("hops");
  });

  it("reviews: due skills fill floor(0.4K) slots (min 1), most overdue first, review comes first", () => {
    expect([3, 5, 10].map((k) => reviewSlots(9, k))).toEqual([1, 2, 4]);
    expect(reviewSlots(0, 5)).toBe(0);
    const log = {
      ...emptyDailyLog(),
      seen: { count: "2026-11-10", rhyme: "2026-11-12", hops: "2026-11-15" },
      skills: {
        "m.a": { q: 6, lq: 2, b: 2, fails: 0, due: "2026-11-17", lw: "count" },
        "r.x": { q: 6, lq: 2, b: 1, fails: 0, due: "2026-11-10", lw: "rhyme" },
        "m.b": { q: 6, lq: 2, b: 3, fails: 0, due: "2026-11-30", lw: "hops" }, // not due
      },
    };
    const plan = planDay(base({ band: [5, 7], levels: { count: 4, rhyme: 2, hops: 1 }, log }));
    const reviews = plan.filter((s) => s.kind === "review");
    expect(reviews.map((s) => s.skill)).toEqual(["r.x", "m.a"]); // 8 days overdue before 1 day overdue
    expect(plan[0]!.kind).toBe("review");
    expect(plan[0]!.world).toBe("rhyme");
  });

  it("stretch: the most recently played world that can still level up, before the pick", () => {
    const log = { ...emptyDailyLog(), seen: { count: "2026-11-17", rhyme: "2026-11-16" } };
    const plan = planDay(base({ levels: { count: 2, rhyme: 1 }, log }));
    const s = plan.filter((x) => x.kind === "stretch");
    expect(s).toHaveLength(1);
    expect(s[0]!.world).toBe("count");
    expect(planDay(base({ limit: 2, levels: { count: 2 }, log })).some((x) => x.kind === "stretch")).toBe(false);
  });

  it("last slot is the child's pick between two different worlds", () => {
    const log = { ...emptyDailyLog(), seen: { count: "2026-11-17", rhyme: "2026-11-16" } };
    const plan = planDay(base({ levels: { count: 2, rhyme: 1 }, log }));
    const last = plan.at(-1)!;
    expect(last.kind).toBe("pick");
    expect(last.options).toHaveLength(2);
    expect(new Set(last.options).size).toBe(2);
    expect(last.options![0]).not.toBe(plan.at(-2)!.world);
    expect(last.world).toBe(last.options![0]);
  });

  it("variety: no two consecutive stops in the same world when avoidable; ≤ MAX_PER_WORLD core rounds each", () => {
    const log = { ...emptyDailyLog(), seen: { count: "2026-11-17", rhyme: "2026-11-16" } };
    for (let k = 3; k <= 10; k++) {
      const plan = planDay(base({ limit: k, levels: { count: 2, rhyme: 1 }, log }));
      for (let i = 1; i < plan.length; i++) expect(plan[i]!.world === plan[i - 1]!.world && plan[i]!.kind !== "pick").toBe(false);
      if (k <= 5) for (const w of ["count", "rhyme"]) expect(plan.slice(0, -1).filter((s) => s.world === w).length).toBeLessThanOrEqual(MAX_PER_WORLD + Math.max(0, k - 5));
    }
  });

  it("works with a single world and with only out-of-band worlds", () => {
    expect(new Set(ids(planDay(base({ worlds: [worlds[0]!] }))))).toEqual(new Set(["count"]));
    const old = planDay(base({ band: [12, 14] }));
    expect(old).toHaveLength(5);
    expect(new Set(ids(old))).toEqual(new Set(["essay"]));
  });

  it("recomputes when the registry grows: a new entry-level world can appear", () => {
    const more: PlannerWorld[] = [...worlds, { id: "aaa-shapes", subject: "math", skills: ["m.a"], ages: [3, 5], maxLevel: 3 }];
    expect(registryFingerprint(more)).not.toBe(registryFingerprint(worlds));
    expect(registryFingerprint([...worlds].reverse())).toBe(registryFingerprint(worlds));
    expect(ids(planDay(base({ worlds: more })))).toContain("aaa-shapes");
  });

  it("seeds: new content every day, stable within a day, different per repeat", () => {
    expect(roundSeed("2026-11-18", "count", 0)).toBe(roundSeed("2026-11-18", "count", 0));
    expect(roundSeed("2026-11-18", "count", 0)).toBe(seedForDay("2026-11-18", "count", 0));
    expect(roundSeed("2026-11-19", "count", 0)).not.toBe(roundSeed("2026-11-18", "count", 0));
    expect(roundSeed("2026-11-18", "count", 1)).not.toBe(roundSeed("2026-11-18", "count", 0));
  });

  it("plans the real registry for every band and limit", () => {
    for (const band of [[3, 5], [6, 8], [9, 11], [12, 14]] as const)
      for (let k = 3; k <= 10; k++) {
        const plan = planDay({ day: "2026-11-18", limit: k, band, worlds: registry.worlds, skills: registry.skills, levels: {}, log: emptyDailyLog() });
        expect(plan).toHaveLength(k);
        for (const s of plan) expect(registry.worlds.some((w) => w.id === s.world)).toBe(true);
      }
  });
});

// ---------------------------------------------------------------- P7 variety + D1–D9 over the real registry
const roundsOf = (plan: readonly PlanStop[], world: string) => plan.slice(0, -1).filter((s) => s.world === world).length + (plan.at(-1)?.world === world ? 1 : 0);

describe("daily planner: variety (P7) on the real registry", () => {
  it("regression: ages 3–5, limit 10 never plays one world more than twice when enough worlds are unlocked", () => {
    // the QA case: counting + rhyme played, shape squish unlocked but unplayed
    const levels = { "counting-adventure": 1, "rhyme-lanterns": 1 };
    const log = { ...emptyDailyLog(), seen: { "counting-adventure": "2026-11-17", "rhyme-lanterns": "2026-11-16" } };
    const input: PlanInput = { day: "2026-11-18", limit: 10, band: [3, 5], worlds: registry.worlds, skills: registry.skills, levels, log };
    const plan = planDay(input);
    expect(plan).toHaveLength(10);
    const { open } = dayWorlds(input);
    expect(open.length * MAX_PER_WORLD).toBeLessThan(10); // only 3 unlocked worlds: repeats are unavoidable…
    const counts = open.map((w) => roundsOf(plan, w));
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1); // …so they are spread evenly
    for (let i = 1; i < plan.length; i++) expect(plan[i]!.world).not.toBe(plan[i - 1]!.world);
    // once pattern parade unlocks (cardinality met) there are enough worlds: nobody plays more than twice
    const more = { ...input, levels: { ...levels, "counting-adventure": 4 } };
    expect(dayWorlds(more).open.length * MAX_PER_WORLD).toBeGreaterThanOrEqual(10);
    const plan2 = planDay(more);
    for (const w of new Set(ids(plan2))) expect(roundsOf(plan2, w)).toBeLessThanOrEqual(MAX_PER_WORLD);
    for (let i = 1; i < plan2.length; i++) expect(plan2[i]!.world).not.toBe(plan2[i - 1]!.world);
  });

  // Seeded synthetic histories: which worlds were played, their levels, and skill memory (some due for review).
  const history = (seed: number, day: string): Pick<PlanInput, "levels" | "log"> => {
    const rng = createRng(seed);
    const levels: Record<string, number> = {};
    const seen: Record<string, string> = {};
    const skills: Record<string, SkillMemory> = {};
    const stage = seed % 3; // 0 = brand new, 1 = some play, 2 = lots of play
    for (const w of registry.worlds) {
      if (stage === 0 || !rng.chance(stage === 1 ? 0.35 : 0.75)) continue;
      levels[w.id] = rng.int(0, w.maxLevel);
      seen[w.id] = addDays(day, -rng.int(1, 9));
      for (const sk of w.skills) {
        if (!rng.chance(0.5)) continue;
        const b = rng.int(0, 3);
        skills[sk] = b ? { q: 6, lq: 2, b, fails: 0, due: addDays(day, rng.int(-6, 6)), lw: w.id } : { q: rng.int(0, 5), lq: 0, b: 0, fails: 0 };
      }
    }
    return { levels, log: { ...emptyDailyLog(), seen, skills } };
  };
  const bands: AgeRange[] = [[3, 5], [6, 8], [9, 11], [12, 14], ...Array.from({ length: 12 }, (_, i) => [i + 3, i + 3] as const)];
  const days = ["2026-11-18", "2026-11-19", "2027-02-03", "2027-06-30"];
  const cases: { input: PlanInput; label: string }[] = [];
  for (const band of bands)
    for (let limit = 3; limit <= 10; limit++)
      for (const day of days)
        for (let h = 0; h < 6; h++) {
          const seed = hashSeed(band.join("-"), limit, day, h) * 3 + h;
          cases.push({ input: { day, limit, band, worlds: registry.worlds, skills: registry.skills, ...history(seed, day) }, label: `${band} K=${limit} ${day} h${h}` });
        }

  it(`property: P7, P9 and D1–D9 hold for ${cases.length} (age × limit × day × history) cases`, () => {
    for (const { input, label } of cases) {
      const plan = planDay(input);
      const K = input.limit;
      const { open, familiar } = dayWorlds(input);
      const core = plan.slice(0, -1);
      const ctx = `${label}: ${plan.map((s) => `${s.kind}:${s.world}`).join(" ")}`;
      // D2 slots: exactly K stops; D7: only unlocked worlds (a review may revisit any world the child has played)
      expect(plan, ctx).toHaveLength(K);
      const playedW = (w: string) => input.levels[w] !== undefined || input.log.seen[w] !== undefined;
      for (const s of plan) for (const w of s.options ?? [s.world]) expect(open.includes(w) || playedW(w), `${ctx} (${w})`).toBe(true);
      // D9 / D1: deterministic, independent of registry order
      expect(planDay({ ...input, worlds: [...input.worlds].reverse(), skills: [...input.skills].reverse() }), ctx).toEqual(plan);
      // D6 order: last slot is the child's pick between two different worlds, the first not the world just played
      const last = plan.at(-1)!;
      if (open.length >= 2) {
        expect(last.kind, ctx).toBe("pick");
        expect(new Set(last.options).size, ctx).toBe(2);
        expect(last.options![0], ctx).not.toBe(core.at(-1)!.world);
      }
      // D3 reviews: due skills of played worlds get min(|due worlds|, max(1, floor(0.4K))) slots, first
      const reviews = plan.filter((s) => s.kind === "review");
      expect(reviews.length, ctx).toBeLessThanOrEqual(reviewSlots(9, K));
      for (const r of reviews) expect(isDue(input.log.skills[r.skill!], input.day), ctx).toBe(true);
      if (reviews.length) expect(plan[0]!.kind, ctx).toBe("review");
      const dueWorld = Object.keys(input.log.skills).some(
        (sk) => isDue(input.log.skills[sk], input.day) && open.some((w) => registry.worlds.find((x) => x.id === w)!.skills.includes(sk) && familiar.includes(w) && playedW(w)),
      );
      if (dueWorld) expect(reviews.length, ctx).toBeGreaterThan(0);
      // D4 learning: ≤ newCap brand-new worlds, unless the familiar worlds can't fill the core at ≤2 rounds each
      const news = new Set(plan.filter((s) => s.kind === "new").map((s) => s.world));
      for (const w of news) expect(familiar, ctx).not.toContain(w);
      if (news.size > newCap(input.band)) expect(familiar.length * MAX_PER_WORLD < core.length || familiar.length < 2, ctx).toBe(true);
      // P7 / D5: ≤ MAX_PER_WORLD rounds per world (the pick's first option counts) whenever enough worlds exist…
      const avail = [...new Set([...open, ...plan.map((s) => s.world)])]; // unlocked worlds + played worlds under review
      if (avail.length * MAX_PER_WORLD >= K) for (const w of avail) expect(roundsOf(plan, w), `${ctx} (${w})`).toBeLessThanOrEqual(MAX_PER_WORLD);
      else {
        // …otherwise every unlocked world is used and repeats are spread evenly over the day (pick's first option counts)
        for (const w of open) expect(plan.some((s) => (s.options ?? [s.world]).includes(w)), `${ctx} (${w})`).toBe(true);
        const dayCounts = [...new Set(plan.map((s) => s.world))].map((w) => roundsOf(plan, w));
        expect(Math.max(...dayCounts) - Math.min(...dayCounts), ctx).toBeLessThanOrEqual(1);
      }
      // P9 / D5: no two consecutive stops in the same world when there is another world to use
      if (open.length >= 2) for (let i = 1; i < plan.length; i++) expect(plan[i]!.world === plan[i - 1]!.world, `${ctx} @${i}`).toBe(false);
    }
  });
});

describe("lit trail stops", () => {
  const stops = [{ w: "count", k: "review" as const }, { w: "rhyme", k: "new" as const }, { w: "count", k: "practice" as const }, { w: "rhyme", k: "pick" as const, o: ["rhyme", "hops"] }];
  it("a round lights the stop it started from, else the first unlit stop of its world, else the earliest", () => {
    expect(litStops(stops, [])).toEqual([false, false, false, false]);
    expect(litStops(stops, [{ w: "count", l: 0, ft: 5, n: 8, s: 2 }])).toEqual([false, false, true, false]);
    expect(litStops(stops, [{ w: "count", l: 0, ft: 5, n: 8 }])).toEqual([true, false, false, false]);
    expect(litStops(stops, [{ w: "hops", l: 0, ft: 5, n: 8 }])).toEqual([false, false, false, true]);
    expect(litStops(stops, [{ w: "essay", l: 0, ft: 5, n: 8 }])).toEqual([true, false, false, false]);
    expect(litStops(stops, Array.from({ length: 6 }, () => ({ w: "count", l: 0, ft: 1, n: 8 })))).toEqual([true, true, true, true]);
  });
});
