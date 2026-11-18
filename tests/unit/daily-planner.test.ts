import { describe, expect, it } from "vitest";
import { emptyDailyLog } from "../../src/engine/progressSchema";
import { seedForDay } from "../../src/engine/rng";
import { MAX_PER_WORLD, type PlanInput, type PlannerSkill, type PlannerWorld, litStops, newCap, planDay, registryFingerprint, reviewSlots, roundSeed } from "../../src/daily/planner";
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

  it("new child: only worlds whose prerequisites are met; at most one brand-new world under 8", () => {
    const plan = planDay(base());
    expect(new Set(ids(plan))).toEqual(new Set(["count", "rhyme"])); // hops/race locked, essay out of age window
    expect(plan.filter((s) => s.kind === "new")).toHaveLength(1);
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
