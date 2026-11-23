import { describe, expect, it } from "vitest";
import {
  PATH_RULES,
  type AgeRange,
  type PathDef,
  type PathProgress,
  type PathsState,
  ageReach,
  choosePath,
  classifyRound,
  currentStopIndex,
  emptyPathsState,
  firstTryChance,
  freshProgress,
  parsePathsState,
  placementAge,
  recordPathRound,
  skipTarget,
  startPath,
  startWorldIndex,
  struggleBelow,
} from "../../src/engine/pathProgress";
import type { Exercise } from "../../src/engine/types";

/** Synthetic path (ages chosen to exercise every rule). w-c hands off at level 6 of 8. */
const PATH: PathDef = {
  id: "sky",
  worlds: [
    { id: "w-a", ages: [3, 5], maxLevel: 7, skills: ["s.a"] },
    { id: "w-b", ages: [5, 7], maxLevel: 3, skills: ["s.b"] },
    { id: "w-c", ages: [7, 9], maxLevel: 8, handoff: 6, skills: ["s.c1", "s.c2"] },
    { id: "w-d", ages: [12, 14], maxLevel: 5, skills: ["s.d"] },
  ],
};
const OTHER: PathDef = { id: "words", worlds: [{ id: "x-a", ages: [3, 6], maxLevel: 4 }, { id: "x-b", ages: [6, 10], maxLevel: 4 }] };
const DAY = "2026-11-23";
const B68: AgeRange = [6, 8];

/** A round of `n` items, `first` solved first try (at difficulty `d`), each miss showing `hints` hints. */
const round = (first: number, n = 8, o: { d?: number; chance?: number; hints?: number } = {}) =>
  Array.from({ length: n }, (_, i) => ({ firstTry: i < first, hintsShown: i < first ? 0 : (o.hints ?? 1), difficulty: o.d ?? 99, chance: o.chance ?? 0 }));
const EASY = round(8);
const OK = round(5);
const PRACTISE = round(3);
const HARD = round(2);

function on(world: string, p: Partial<PathProgress> = {}, s: Partial<PathsState> = {}): PathsState {
  return { v: 1, cur: s.cur === undefined ? "sky" : s.cur, by: { sky: { ...freshProgress(world), n: 5, ...p }, ...(s.by ?? {}) }, run: s.run ?? null, offered: s.offered ?? null };
}
interface Play { results?: ReturnType<typeof round>; levels?: Record<string, number>; band?: AgeRange; day?: string; path?: PathDef; mastered?: string[] }
const play = (state: PathsState, world: string, level: number, o: Play = {}) =>
  recordPathRound(state, { path: o.path ?? PATH, day: o.day ?? DAY, band: o.band ?? B68, round: { world, level, results: o.results ?? OK }, levels: { [world]: level, ...(o.levels ?? {}) }, mastered: o.mastered });

describe("placement (A1–A3)", () => {
  it("A1: placement age is the band's middle year", () => {
    expect([[3, 5], [6, 8], [9, 11], [12, 14]].map((b) => placementAge(b as unknown as AgeRange))).toEqual([4, 7, 10, 13]);
  });
  it("A2: nearest, then younger, then path order", () => {
    expect(PATH.worlds[startWorldIndex(PATH, 4)]!.id).toBe("w-a");
    expect(PATH.worlds[startWorldIndex(PATH, 5)]!.id).toBe("w-a"); // in w-a (3–5) and w-b (5–7): the younger
    expect(PATH.worlds[startWorldIndex(PATH, 7)]!.id).toBe("w-b");
    expect(PATH.worlds[startWorldIndex(PATH, 10)]!.id).toBe("w-c"); // none for 10: w-c is 1 year away, w-d 2
    expect(PATH.worlds[startWorldIndex(PATH, 13)]!.id).toBe("w-d");
    const gap: PathDef = { id: "g", worlds: [{ id: "hi", ages: [9, 11], maxLevel: 3 }, { id: "lo", ages: [3, 5], maxLevel: 3 }] };
    expect(gap.worlds[startWorldIndex(gap, 7)]!.id).toBe("lo"); // 2 years from both: the younger, even later in the path
    const inside: PathDef = { id: "i", worlds: [{ id: "x", ages: [5, 9], maxLevel: 3 }, { id: "y", ages: [4, 6], maxLevel: 3 }] };
    expect(inside.worlds[startWorldIndex(inside, 5)]!.id).toBe("y"); // both contain 5: the younger
    const same: PathDef = { id: "s", worlds: [{ id: "z", ages: [4, 6], maxLevel: 3 }, { id: "a", ages: [4, 6], maxLevel: 3 }] };
    expect(same.worlds[startWorldIndex(same, 5)]!.id).toBe("z"); // full tie: path order
    expect(startWorldIndex({ id: "e", worlds: [] }, 7)).toBe(-1);
  });
  it("A3: a new world always starts at level 0; a child who played further starts there with the stored level", () => {
    expect(startPath(PATH, [3, 5], {})).toEqual({ progress: freshProgress("w-a"), setLevel: 0 });
    expect(startPath(PATH, [12, 14], {})).toEqual({ progress: freshProgress("w-d"), setLevel: 0 });
    expect(startPath(PATH, [3, 5], { "w-c": 3 })).toEqual({ progress: freshProgress("w-c"), setLevel: undefined });
    expect(startPath(PATH, [12, 14], { "w-a": 1 })?.progress.w).toBe("w-d"); // earlier progress never pulls back
    expect(startPath({ id: "e", worlds: [] }, B68, {})).toBeNull();
  });
  it("A3 placement: in the first 3 rounds of a world one easy round skips ahead; later it takes 2", () => {
    const s0 = on("w-c", { n: 0 });
    const r1 = play(s0, "w-c", 0, { results: EASY, levels: { "w-c": 1 } });
    expect(r1.note).toEqual({ kind: "skip", world: "w-c", level: 2 });
    expect(r1.levels).toEqual({ "w-c": 2 });
    expect(r1.state.by.sky!.n).toBe(1);
    const late = play(on("w-c", { n: 3 }), "w-c", 2, { results: EASY, levels: { "w-c": 3 } });
    expect(late.levels).toEqual({});
    expect(late.state.by.sky!.easy).toBe(1);
  });
});

describe("classifying rounds (C1: three outcomes + easy)", () => {
  it("easy / ok / practise / struggling without guessing chance", () => {
    expect(classifyRound(round(8))).toBe("easy");
    expect(classifyRound(round(7))).toBe("easy"); // one slip fixed after one hint
    expect(classifyRound(round(7, 8, { hints: 2 }))).toBe("ok"); // the slip needed the modelled answer
    expect(classifyRound(round(4))).toBe("ok"); // R0 pass mark 50 %
    expect(classifyRound(round(3))).toBe("practise"); // 37.5 %: practise the level again
    expect(classifyRound(round(3, 10))).toBe("practise"); // exactly 30 % is not struggling
    expect(classifyRound(round(2))).toBe("struggling"); // 25 %
    expect(classifyRound(round(3, 3))).toBe("ok"); // too short to be "easy"
    expect(classifyRound([])).toBe("practise");
  });
  it("struggling is chance-aware: max(30 %, chance + 10 points)", () => {
    expect(struggleBelow(round(4, 8, { chance: 0 }))).toBe(0.3);
    expect(struggleBelow(round(4, 8, { chance: 1 / 3 }))).toBeCloseTo(0.4333, 3);
    expect(struggleBelow(round(4, 8, { chance: 0.5 }))).toBeCloseTo(0.6, 6);
    expect(classifyRound(round(4, 8, { chance: 0.5 }))).toBe("struggling"); // 50 % on two-option items is guessing
    expect(classifyRound(round(5, 8, { chance: 0.5 }))).toBe("ok");
    expect(classifyRound(round(3, 8, { chance: 1 / 3 }))).toBe("struggling"); // 37.5 % < 43 % on three options
    expect(classifyRound(round(3, 8, { chance: 0.1 }))).toBe("practise");
  });
  it("records each item's guessing chance from its answer", () => {
    const ex = (answer: Exercise["answer"], interaction: Exercise["interaction"] = "choose") => ({ answer, interaction });
    const opt = (id: string) => ({ id, label: id });
    expect(firstTryChance(ex({ kind: "number", value: 3, choices: [2, 3, 4] }, "choose-count"))).toBeCloseTo(1 / 3);
    expect(firstTryChance(ex({ kind: "number", value: 3 }, "make-set"))).toBe(0);
    expect(firstTryChance(ex({ kind: "choice", correct: "a", options: [opt("a"), opt("b")] }))).toBe(0.5);
    expect(firstTryChance(ex({ kind: "choice", correct: "a", also: ["b"], options: [opt("a"), opt("b"), opt("c"), opt("d")] }))).toBe(0.5);
    expect(firstTryChance(ex({ kind: "set", correct: ["a"], options: [opt("a"), opt("b"), opt("c")] }))).toBeCloseTo(1 / 7);
    expect(firstTryChance(ex({ kind: "sequence", order: ["a", "b", "c"], pieces: [opt("a"), opt("b"), opt("c")] }))).toBeCloseTo(1 / 6);
    expect(firstTryChance(ex({ kind: "match", pairs: { a: "x", b: "y" }, items: [opt("a"), opt("b")], targets: [opt("x"), opt("y")] }))).toBe(0.25);
    expect(firstTryChance(ex({ kind: "numeric", value: 5, tolerance: 0 }))).toBe(0);
    expect(firstTryChance(ex({ kind: "numeric", value: 5, tolerance: 0, min: 0, max: 9, step: 1 }))).toBeCloseTo(0.1);
  });
});

describe("stepping up (U1 evidence cap, U2, U3)", () => {
  it("U1: the 2nd easy round in a row skips ahead to level + 2 when the round showed it", () => {
    const r1 = play(on("w-c"), "w-c", 2, { results: EASY, levels: { "w-c": 3 } });
    expect(r1.levels).toEqual({});
    expect(r1.state.by.sky!.easy).toBe(1);
    const r2 = play(r1.state, "w-c", 3, { results: EASY, levels: { "w-c": 4 } });
    expect(r2.note).toEqual({ kind: "skip", world: "w-c", level: 5 });
    expect(r2.levels).toEqual({ "w-c": 5 });
    expect(r2.state.by.sky!.easy).toBe(0);
  });
  it("U1 evidence cap: min(level + 2, max(level + 1, highest first-try difficulty − 1))", () => {
    expect(skipTarget(3, 8, round(8, 8, { d: 6 }))).toBe(5); // answered difficulty 6 = level 5
    expect(skipTarget(3, 8, round(8, 8, { d: 5 }))).toBe(4); // only one band above shown → no extra level
    expect(skipTarget(3, 8, round(8, 8, { d: 4 }))).toBe(4); // nothing above the round's level → R0's + 1
    expect(skipTarget(7, 8, round(8, 8, { d: 99 }))).toBe(8); // capped at the top
    const r = play(on("w-c", { easy: 1 }), "w-c", 3, { results: round(8, 8, { d: 5 }), levels: { "w-c": 4 } });
    expect(r.levels).toEqual({});
    expect(r.note).toBeNull();
  });
  it("U1: an OK round between easy rounds breaks the streak", () => {
    let s = play(on("w-c"), "w-c", 2, { results: EASY }).state;
    s = play(s, "w-c", 3, { results: OK }).state;
    expect(play(s, "w-c", 3, { results: EASY, levels: { "w-c": 4 } }).levels).toEqual({});
  });
  it("U2: at the hand-off level Hn with ≥ 75 % first try → the next world at level 0", () => {
    const r = play(on("w-a"), "w-a", 7, { results: round(6), band: [3, 5] });
    expect(r.state.by.sky).toEqual(freshProgress("w-b"));
    expect(r.levels).toEqual({ "w-b": 0 });
    expect(r.note).toEqual({ kind: "next-world", world: "w-b", level: 0 });
    expect(currentStopIndex(r.state, PATH)).toBe(1);
    // a pack's hand-off level comes before the top: w-c hands off at 6 of 8
    expect(play(on("w-c"), "w-c", 6, { results: round(6), band: [9, 11] }).state.by.sky!.w).toBe("w-d");
    expect(play(on("w-c"), "w-c", 5, { results: round(6), band: [9, 11] }).state.by.sky!.w).toBe("w-c");
  });
  it("U2: the next world keeps a level the child already earned there", () => {
    expect(play(on("w-a"), "w-a", 7, { results: EASY, band: [3, 5], levels: { "w-b": 2 } }).note).toEqual({ kind: "next-world", world: "w-b", level: 2 });
  });
  it("U2: below 75 % at Hn the child keeps practising", () => {
    expect(play(on("w-a"), "w-a", 7, { results: round(5), band: [3, 5] }).state.by.sky!.w).toBe("w-a");
  });
  it("U2: mastering every skill of the world hands forward at any level (mastery data)", () => {
    expect(play(on("w-c"), "w-c", 2, { results: OK, band: [9, 11], mastered: ["s.c1", "s.c2"] }).state.by.sky!.w).toBe("w-d");
    expect(play(on("w-c"), "w-c", 2, { results: OK, band: [9, 11], mastered: ["s.c1"] }).state.by.sky!.w).toBe("w-c");
  });
  it("U3: reach = band minimum + 2 for 3–5, + 3 otherwise; beyond it only clear mastery (2 easy rounds in a row)", () => {
    expect(ageReach([3, 5])).toBe(5);
    expect(ageReach([6, 8])).toBe(9);
    expect(ageReach([9, 11])).toBe(12);
    // band 3–5: w-b (starts 5) is in reach, w-c (starts 7) is not
    expect(play(on("w-b"), "w-b", 3, { results: round(6), band: [3, 5] }).state.by.sky!.w).toBe("w-b");
    const e1 = play(on("w-b"), "w-b", 3, { results: EASY, band: [3, 5] });
    expect(e1.state.by.sky!.w).toBe("w-b");
    expect(play(e1.state, "w-b", 3, { results: EASY, band: [3, 5] }).state.by.sky!.w).toBe("w-c");
    // band 6–8: w-d (starts 12) is beyond 9
    expect(play(on("w-c"), "w-c", 6, { results: round(6) }).state.by.sky!.w).toBe("w-c");
  });
  it("T3: the last world complete → note + offer; with mastery data only when its skills are mastered", () => {
    const r = play(on("w-d"), "w-d", 5, { results: EASY, band: [12, 14] });
    expect(r.note).toEqual({ kind: "path-end", world: "w-d" });
    expect(r.offer).toBe("end");
    expect(r.state.by.sky!.w).toBe("w-d");
    expect(play(on("w-d"), "w-d", 5, { results: EASY, band: [12, 14], mastered: [] }).note).toBeNull();
    expect(play(on("w-d"), "w-d", 1, { results: OK, band: [12, 14], mastered: ["s.d"] }).note).toEqual({ kind: "path-end", world: "w-d" });
  });
});

describe("stepping down (D1, D2, T2)", () => {
  it("D1: one struggling round changes nothing; the 2nd in a row goes one level down; practise rounds break the streak", () => {
    const r1 = play(on("w-c"), "w-c", 4, { results: HARD });
    expect(r1.cls).toBe("struggling");
    expect(r1.levels).toEqual({});
    const r2 = play(r1.state, "w-c", 4, { results: HARD });
    expect(r2.levels).toEqual({ "w-c": 3 });
    expect(r2.note).toEqual({ kind: "down", world: "w-c", level: 3, warm: null });
    expect(r2.state.by.sky).toMatchObject({ hard: 0, dn: 4 });
    let s = play(on("w-c"), "w-c", 4, { results: HARD }).state;
    s = play(s, "w-c", 4, { results: PRACTISE }).state;
    expect(play(s, "w-c", 4, { results: HARD }).levels).toEqual({});
  });
  it("D2: after a step down from X, no skip until an OK-or-better round at level ≥ X", () => {
    let s = on("w-c", { dn: 4, n: 0 }); // placement phase would allow a skip; damping blocks it
    let r = play(s, "w-c", 3, { results: EASY, levels: { "w-c": 4 } });
    expect(r.levels).toEqual({});
    expect(r.state.by.sky!.dn).toBe(4);
    s = r.state;
    r = play(s, "w-c", 4, { results: OK, levels: { "w-c": 5 } }); // back at X, OK: released (from the next round)
    expect(r.state.by.sky!.dn).toBeNull();
    r = play(on("w-c", { dn: 4, easy: 1 }), "w-c", 4, { results: EASY, levels: { "w-c": 5 } });
    expect(r.levels).toEqual({}); // the releasing round itself does not skip
    r = play(r.state, "w-c", 5, { results: EASY, levels: { "w-c": 6 } });
    expect(r.note).toEqual({ kind: "skip", world: "w-c", level: 7 });
  });
  it("D1 across worlds: at level 0–1 of a later world, ONE warm-up stop in the previous world at Hn − 1; the pointer stays", () => {
    const r = play(on("w-c", { hard: 1 }), "w-c", 1, { results: HARD, levels: { "w-b": 3 } });
    expect(r.levels).toEqual({ "w-c": 0, "w-b": 2 });
    expect(r.state.by.sky).toMatchObject({ w: "w-c", warm: "w-b" });
    expect(r.note).toEqual({ kind: "down", world: "w-c", level: 0, warm: "w-b" });
    const z = play(on("w-c", { hard: 1 }), "w-c", 0, { results: HARD, levels: { "w-b": 1 } });
    expect(z.levels).toEqual({}); // never raises the previous world above its stored level
    expect(z.state.by.sky!.warm).toBe("w-b");
    const fresh = play(on("w-d", { hard: 1 }), "w-d", 0, { results: HARD, band: [12, 14] });
    expect(fresh.levels).toEqual({ "w-c": 5 }); // never played: Hn − 1 = 5
  });
  it("D1: a round in the warm-up world pays the warm-up (any entry point)", () => {
    const r = play(on("w-c", { warm: "w-b", easy: 1 }), "w-b", 2, { results: OK });
    expect(r.state.by.sky).toMatchObject({ w: "w-c", warm: null, easy: 1 });
    expect(r.cls).toBeNull();
  });
  it("T2: at level 0 of the first world nothing moves and the host offers another path; level 1 → 0 without warm-up", () => {
    const r = play(on("w-a", { hard: 1 }), "w-a", 0, { results: HARD, band: [3, 5] });
    expect(r.levels).toEqual({});
    expect(r.note).toBeNull();
    expect(r.offer).toBe("tricky");
    const one = play(on("w-a", { hard: 1 }), "w-a", 1, { results: HARD, band: [3, 5] });
    expect(one.levels).toEqual({ "w-a": 0 });
    expect(one.state.by.sky!.warm).toBeNull();
    expect(one.offer).toBeNull();
  });
});

describe("offers (T1, O1) and scope", () => {
  const run = (n: number, r = 100) => ({ p: "sky", day: DAY, n, r });
  it("T1: from the 3rd round in a row, only when first try drops ≥ 20 points below the run's first round, or struggling", () => {
    let s = on("w-c");
    const offers: (string | null)[] = [];
    for (let i = 0; i < 4; i++) {
      const r = play(s, "w-c", 4, { results: EASY });
      offers.push(r.offer);
      s = r.state;
    }
    expect(offers).toEqual([null, null, null, null]); // steady play is never interrupted
    expect(s.run).toEqual({ p: "sky", day: DAY, n: 4, r: 100 });
    expect(play(on("w-c", {}, { run: run(2) }), "w-c", 4, { results: round(6) }).offer).toBe("tired"); // 75 % vs 100 %
    expect(play(on("w-c", {}, { run: run(2) }), "w-c", 4, { results: round(7) }).offer).toBeNull(); // 87.5 %: −12.5
    expect(play(on("w-c", {}, { run: run(2, 50) }), "w-c", 4, { results: HARD }).offer).toBe("tired"); // struggling
    expect(play(on("w-c", {}, { run: run(1) }), "w-c", 4, { results: HARD }).offer).toBeNull(); // only the 2nd round
  });
  it("O1: at most one offer per path per local day", () => {
    const first = play(on("w-c", {}, { run: run(2) }), "w-c", 4, { results: round(6) });
    expect(first.offer).toBe("tired");
    expect(first.state.offered).toEqual({ day: DAY, p: ["sky"] });
    expect(play(first.state, "w-c", 4, { results: HARD }).offer).toBeNull();
    const t2 = play({ ...first.state, by: { sky: { ...first.state.by.sky!, w: "w-a", hard: 1 } } }, "w-a", 0, { results: HARD, band: [3, 5] });
    expect(t2.offer).toBeNull(); // T2 shares the daily cap
    const tomorrow = play({ ...first.state, run: { ...run(2), day: "2026-11-24" } }, "w-c", 4, { results: round(6), day: "2026-11-24" });
    expect(tomorrow.offer).toBe("tired");
  });
  it("T1: a round on another path or a new day restarts the run", () => {
    let s: PathsState = on("w-c", {}, { by: { words: freshProgress("x-a") } });
    s = play(s, "w-c", 4).state;
    s = play(s, "w-c", 4).state;
    s = play(s, "x-a", 1, { path: OTHER }).state;
    expect(s.run).toMatchObject({ p: "words", n: 1 });
    expect(play(on("w-c", {}, { run: run(2) }), "w-c", 4, { results: round(4), day: "2026-11-24" }).state.run).toEqual({ p: "sky", day: "2026-11-24", n: 1, r: 50 });
  });
  it("offers are made only for the path the child chose", () => {
    expect(play(on("w-a", { hard: 1 }, { cur: "words" }), "w-a", 0, { results: HARD, band: [3, 5] }).offer).toBeNull();
    expect(play(on("w-c", {}, { cur: "words", run: run(2) }), "w-c", 4, { results: HARD }).offer).toBeNull();
  });
  it("rounds outside the path's current world never move levels or stops", () => {
    const r = play(on("w-c", { easy: 1, hard: 1 }), "w-a", 7, { results: EASY, band: [3, 5] });
    expect(r.levels).toEqual({});
    expect(r.note).toBeNull();
    expect(r.state.by.sky).toMatchObject({ w: "w-c", easy: 1, hard: 1 });
    expect(r.cls).toBeNull();
  });
  it("a path the child never started only counts the run", () => {
    const r = play(emptyPathsState(), "w-c", 4, { results: EASY });
    expect(r.state.by).toEqual({});
    expect(r.state.run).toEqual({ p: "sky", day: DAY, n: 1, r: 100 });
  });
  it("is deterministic and never mutates its input", () => {
    const s = on("w-c", { easy: 1 });
    const copy = structuredClone(s);
    expect(play(s, "w-c", 3, { results: EASY })).toEqual(play(s, "w-c", 3, { results: EASY }));
    expect(s).toEqual(copy);
  });
  it("levels never go below 0", () => {
    let s = on("w-a");
    for (let i = 0; i < 6; i++) {
      const r = play(s, "w-a", 0, { results: HARD, band: [3, 5] });
      for (const v of Object.values(r.levels)) expect(v).toBeGreaterThanOrEqual(0);
      s = r.state;
    }
  });
});

describe("switching paths (S1)", () => {
  it("keeps each path's progress and resumes it", () => {
    let { state } = choosePath(emptyPathsState(), PATH, B68, {});
    expect(state.by.sky!.w).toBe("w-b");
    state = play(state, "w-b", 3, { results: round(7) }).state; // w-c starts at 7 ≤ 6 + 3
    expect(state.by.sky!.w).toBe("w-c");
    const sw = choosePath(state, OTHER, B68, {});
    expect(sw.state.cur).toBe("words");
    expect(sw.setLevel).toEqual({ world: "x-b", level: 0 });
    const back = choosePath(sw.state, PATH, B68, { "w-c": 2 });
    expect(back.state.by.sky!.w).toBe("w-c");
    expect(back.setLevel).toBeUndefined();
    expect(back.state.by.words!.w).toBe("x-b");
  });
  it("a saved stop no longer in the path is placed again; a path without worlds cannot be chosen", () => {
    const s: PathsState = { ...emptyPathsState(), by: { sky: { ...freshProgress("gone"), easy: 1 } } };
    expect(choosePath(s, PATH, [3, 5], {}).state.by.sky).toEqual(freshProgress("w-a"));
    const e = emptyPathsState();
    expect(choosePath(e, { id: "empty", worlds: [] }, B68, {}).state).toBe(e);
  });
});

describe("stored state (migration + validation)", () => {
  it("state saved before paths existed migrates to an empty path state", () => {
    expect(parsePathsState(undefined)).toEqual(emptyPathsState());
    expect(parsePathsState({ v: 2, cur: "sky" })).toEqual(emptyPathsState());
  });
  it("state saved by the first path version gets defaults for the new fields", () => {
    const old = { v: 1, cur: "sky", by: { sky: { w: "w-c", easy: 1, hard: 0 } }, run: { p: "sky", day: DAY, n: 2 } };
    expect(parsePathsState(old)).toEqual({ v: 1, cur: "sky", by: { sky: { w: "w-c", easy: 1, hard: 0, n: 0, dn: null, warm: null } }, run: { p: "sky", day: DAY, n: 2, r: 100 }, offered: null });
  });
  it("round-trips valid state", () => {
    const s: PathsState = { v: 1, cur: "sky", by: { sky: { w: "w-c", easy: 1, hard: 0, n: 4, dn: 3, warm: "w-b" } }, run: { p: "sky", day: DAY, n: 2, r: 75 }, offered: { day: DAY, p: ["sky"] } };
    expect(parsePathsState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it("drops corrupt entries one by one, never throwing", () => {
    const s = parsePathsState({ v: 1, cur: "Bad Id!", by: { sky: { w: "w-c", easy: 1, hard: 0, dn: -2, warm: 5 }, bad: { w: 3 }, neg: { w: "a", easy: -1, hard: 0 } }, run: { p: "sky", day: "today", n: 1 }, offered: { day: DAY, p: ["ok", 3, "No!"] } });
    expect(s).toEqual({ v: 1, cur: null, by: { sky: freshProgress("w-c") && { w: "w-c", easy: 1, hard: 0, n: 0, dn: null, warm: null } }, run: null, offered: { day: DAY, p: ["ok"] } });
    expect(parsePathsState("garbage")).toEqual(emptyPathsState());
  });
  it("the documented numbers", () => {
    expect(PATH_RULES).toMatchObject({ easyRate: 0.85, passRate: 0.5, hardFloor: 0.3, hardOverChance: 0.1, placementRounds: 3, easyRounds: 2, skip: 2, handoffRate: 0.75, reachYoung: 2, reach: 3, hardRounds: 2, tiredRounds: 3, tiredDrop: 0.2 });
  });
});
