import { describe, expect, it } from "vitest";
import { emptyDailyLog } from "../../src/engine/progressSchema";
import { seedForDay } from "../../src/engine/rng";
import { LIB_CAP, MAX_PER_WORLD, type AgeRange, type PlanInput, type PlanStop, type PlannerSkill, type PlannerWorld, dayWorlds, litStops, newCap, planDay, registryFingerprint, reviewSlots, roundSeed } from "../../src/daily/planner";
import { addDays } from "../../src/daily/date";
import { isDue } from "../../src/daily/memory";
import { createRng, hashSeed } from "../../src/engine/rng";
import type { SkillMemory } from "../../src/engine/progressSchema";
import { playableWorlds, registry } from "../../src/content/registry";

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

/**
 * P11 (library soft cap) as a checkable property. Returns a problem string or null. "Planned stops" = every stop but
 * a final pick. A library may exceed LIB_CAP only if all its planned stops are reviews, or no other library has an
 * unlocked world with room (library under LIB_CAP and world under MAX_PER_WORLD planned rounds).
 */
function libraryCapProblem(plan: readonly PlanStop[], input: PlanInput): string | null {
  const libOf = new Map(input.worlds.map((w) => [w.id, w.subject]));
  const planned = plan.at(-1)?.kind === "pick" ? plan.slice(0, -1) : plan;
  const libCount = new Map<string, number>();
  const worldCount = new Map<string, number>();
  for (const s of planned) {
    libCount.set(libOf.get(s.world)!, (libCount.get(libOf.get(s.world)!) ?? 0) + 1);
    worldCount.set(s.world, (worldCount.get(s.world) ?? 0) + 1);
  }
  const { open } = dayWorlds(input);
  for (const [lib, n] of libCount) {
    if (n <= LIB_CAP) continue;
    if (planned.filter((s) => libOf.get(s.world) === lib).every((s) => s.kind === "review")) continue;
    const alt = open.find((w) => libOf.get(w) !== lib && (libCount.get(libOf.get(w)!) ?? 0) < LIB_CAP && (worldCount.get(w) ?? 0) < MAX_PER_WORLD);
    if (alt) return `library ${lib} has ${n} stops while ${alt} (${libOf.get(alt)}) has room`;
  }
  return null;
}

describe("daily planner: variety (P7) on the real registry", () => {
  it("regression: ages 3–5, limit 10 never plays one world more than twice when enough worlds are unlocked", () => {
    // the QA case: counting + rhyme played, shape squish unlocked but unplayed
    const levels = { "counting-adventure": 1, "rhyme-lanterns": 1 };
    const log = { ...emptyDailyLog(), seen: { "counting-adventure": "2026-11-17", "rhyme-lanterns": "2026-11-16" } };
    // the QA case is about the preschool worlds; worlds that start at 6 (admitted by the ±1 age stretch) are left out
    const preschool = registry.worlds.filter((w) => w.ages[0] <= 5);
    const input: PlanInput = { day: "2026-11-18", limit: 10, band: [3, 5], worlds: preschool, skills: registry.skills, levels, log };
    const plan = planDay(input);
    expect(plan).toHaveLength(10);
    const { open } = dayWorlds(input);
    const counts = open.map((w) => roundsOf(plan, w));
    if (open.length * MAX_PER_WORLD < 10) expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1); // repeats unavoidable: spread evenly
    else for (const c of counts) expect(c).toBeLessThanOrEqual(MAX_PER_WORLD); // more preschool worlds unlocked from the start (data-driven, D-029)
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
      // (P11: a library over its cap may also hand a stop to a new world when no familiar world of another library has room)
      const libOf = (w: string) => input.worlds.find((x) => x.id === w)!.subject;
      const familiarLibFill = [...new Set(familiar.map(libOf))].reduce((t, l) => t + Math.min(LIB_CAP, MAX_PER_WORLD * familiar.filter((w) => libOf(w) === l).length), 0);
      if (news.size > newCap(input.band)) expect(familiar.length * MAX_PER_WORLD < core.length || familiar.length < 2 || familiarLibFill < core.length, ctx).toBe(true);
      // P11: ≤ LIB_CAP planned stops per library while another library has an unlocked world with room
      expect(libraryCapProblem(plan, input), ctx).toBeNull();
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

// ---------------------------------------------------------------- P11 library variety on a synthetic multi-library registry
describe("daily planner: library variety (P11)", () => {
  // 4 libraries × 4 worlds; inside each library a prerequisite chain s0 → s1 → s2 → s3 with rising ages
  const LIBS = ["cs", "ela", "math", "sci"];
  const libSkills: PlannerSkill[] = [];
  const libWorlds: PlannerWorld[] = [];
  for (const lib of LIBS)
    for (let i = 0; i < 4; i++) {
      libSkills.push({ id: `${lib}.s${i}`, ages: [4 + i, 6 + i], prerequisites: i ? [`${lib}.s${i - 1}`] : [] });
      libWorlds.push({ id: `${lib}-w${i}`, subject: lib, skills: [`${lib}.s${i}`], ages: [4 + i, 6 + i], maxLevel: 5 });
    }
  const libsOf = (plan: readonly PlanStop[], input: PlanInput) => plan.map((s) => input.worlds.find((w) => w.id === s.world)!.subject);

  const synthHistory = (seed: number, day: string, ws: readonly PlannerWorld[]): Pick<PlanInput, "levels" | "log"> => {
    const rng = createRng(seed);
    const levels: Record<string, number> = {};
    const seen: Record<string, string> = {};
    const mem: Record<string, SkillMemory> = {};
    const stage = seed % 3;
    for (const w of ws) {
      if (stage === 0 || !rng.chance(stage === 1 ? 0.3 : 0.7)) continue;
      levels[w.id] = rng.int(0, w.maxLevel);
      seen[w.id] = addDays(day, -rng.int(1, 9));
      for (const sk of w.skills) if (rng.chance(0.5)) mem[sk] = rng.chance(0.5) ? { q: 6, lq: 2, b: rng.int(1, 3), fails: 0, due: addDays(day, rng.int(-5, 5)), lw: w.id } : { q: rng.int(0, 5), lq: 0, b: 0, fails: 0 };
    }
    return { levels, log: { ...emptyDailyLog(), seen, skills: mem } };
  };

  // an unbalanced registry too: one big library and two one-world libraries (the soft cap must give way gracefully)
  const lopsided: PlannerWorld[] = [
    ...Array.from({ length: 8 }, (_, i) => ({ id: `big-${i}`, subject: "big", skills: [`big.s${i}`], ages: [5, 8] as const, maxLevel: 4 })),
    { id: "solo-a", subject: "sa", skills: ["sa.s"], ages: [5, 8], maxLevel: 4 },
    { id: "solo-b", subject: "sb", skills: ["sb.s"], ages: [5, 8], maxLevel: 4 },
  ];
  const lopsidedSkills: PlannerSkill[] = lopsided.flatMap((w) => w.skills.map((id) => ({ id, ages: [5, 8] as const, prerequisites: [] })));

  const cases: { input: PlanInput; label: string }[] = [];
  for (const [name, ws, sk] of [["four", libWorlds, libSkills], ["lopsided", lopsided, lopsidedSkills]] as const)
    for (const band of [[3, 5], [6, 8], [9, 11], [5, 5], [7, 7]] as AgeRange[])
      for (let limit = 3; limit <= 10; limit++)
        for (const day of ["2026-11-18", "2027-03-09"])
          for (let h = 0; h < 6; h++) {
            const seed = hashSeed(name, band.join("-"), limit, day, h) * 3 + h;
            cases.push({ input: { day, limit, band, worlds: ws, skills: sk, ...synthHistory(seed, day, ws) }, label: `${name} ${band} K=${limit} ${day} h${h}` });
          }

  it(`property: ≤ ${LIB_CAP} stops per library while another library has room, over ${cases.length} cases`, () => {
    for (const { input, label } of cases) {
      const plan = planDay(input);
      const ctx = `${label}: ${plan.map((s) => `${s.kind}:${s.world}`).join(" ")}`;
      expect(plan, ctx).toHaveLength(input.limit);
      expect(libraryCapProblem(plan, input), ctx).toBeNull();
      // deterministic and order-independent (D9)
      expect(planDay({ ...input, worlds: [...input.worlds].reverse(), skills: [...input.skills].reverse() }), ctx).toEqual(plan);
      // the other daily rules still hold: no back-to-back world, ≤ MAX_PER_WORLD rounds when enough worlds are open
      const { open } = dayWorlds(input);
      if (open.length >= 2) for (let i = 1; i < plan.length; i++) expect(plan[i]!.world === plan[i - 1]!.world, `${ctx} @${i}`).toBe(false);
      const avail = [...new Set([...open, ...plan.map((s) => s.world)])];
      if (avail.length * MAX_PER_WORLD >= input.limit) for (const w of avail) expect(roundsOf(plan, w), `${ctx} (${w})`).toBeLessThanOrEqual(MAX_PER_WORLD);
      if (plan[0] && plan.some((s) => s.kind === "review")) expect(plan[0].kind, ctx).toBe("review");
    }
  });

  it("the cap is soft: with only one library open, its worlds fill the whole day", () => {
    const one = libWorlds.filter((w) => w.subject === "math");
    const plan = planDay({ day: "2026-11-18", limit: 7, band: [6, 8], worlds: one, skills: libSkills, levels: {}, log: emptyDailyLog() });
    expect(plan).toHaveLength(7);
  });

  it("a fresh child's first day already mixes libraries, and the pick offers two libraries", () => {
    const input: PlanInput = { day: "2026-11-18", limit: 5, band: [6, 8], worlds: libWorlds, skills: libSkills, levels: {}, log: emptyDailyLog() };
    const plan = planDay(input);
    const libs = libsOf(plan.slice(0, -1), input);
    for (const l of new Set(libs)) expect(libs.filter((x) => x === l).length).toBeLessThanOrEqual(LIB_CAP);
    expect(new Set(libs).size).toBeGreaterThanOrEqual(2);
    const pick = plan.at(-1)!;
    expect(pick.kind).toBe("pick");
    const pl = pick.options!.map((w) => libWorlds.find((x) => x.id === w)!.subject);
    expect(new Set(pl).size).toBe(2);
  });

  it("over a simulated week the trail draws on every library, ≤ 2 stops per library each day", () => {
    for (const band of [[5, 7], [6, 8], [8, 10]] as AgeRange[])
      for (const K of [3, 5, 8]) {
        const levels: Record<string, number> = {};
        const seen: Record<string, string> = {};
        const libsThisWeek = new Set<string>();
        let day = "2026-11-16";
        for (let d = 0; d < 7; d++, day = addDays(day, 1)) {
          const input: PlanInput = { day, limit: K, band, worlds: libWorlds, skills: libSkills, levels: { ...levels }, log: { ...emptyDailyLog(), seen: { ...seen } } };
          const plan = planDay(input);
          const ctx = `${band} K=${K} day ${d}: ${plan.map((s) => s.world).join(" ")}`;
          expect(libraryCapProblem(plan, input), ctx).toBeNull();
          const planned = plan.at(-1)?.kind === "pick" ? plan.slice(0, -1) : plan;
          const libs = libsOf(planned, input);
          for (const l of new Set(libs)) expect(libs.filter((x) => x === l).length, ctx).toBeLessThanOrEqual(LIB_CAP);
          // play the day: every stop, the pick alternating between its options
          for (const s of plan) {
            const w = s.options ? s.options[d % s.options.length]! : s.world;
            levels[w] = levels[w] === undefined ? 0 : Math.min(5, levels[w]! + 1);
            seen[w] = day;
            libsThisWeek.add(libWorlds.find((x) => x.id === w)!.subject);
          }
        }
        expect([...libsThisWeek].sort(), `${band} K=${K}`).toEqual(LIBS);
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
