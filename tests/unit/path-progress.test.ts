import { describe, expect, it } from "vitest";
import {
  PATH_RULES,
  type PathDef,
  type PathsState,
  choosePath,
  classifyRound,
  currentStopIndex,
  emptyPathsState,
  parsePathsState,
  placementAge,
  placementLevel,
  recordPathRound,
  startPath,
  startWorldIndex,
} from "../../src/engine/pathProgress";

/** Synthetic path (ages chosen to exercise every placement rule). */
const PATH: PathDef = {
  id: "sky",
  worlds: [
    { id: "w-a", ages: [3, 5], maxLevel: 7 },
    { id: "w-b", ages: [5, 7], maxLevel: 3 },
    { id: "w-c", ages: [7, 9], maxLevel: 8 },
    { id: "w-d", ages: [12, 14], maxLevel: 5 },
  ],
};
const OTHER: PathDef = { id: "words", worlds: [{ id: "x-a", ages: [3, 6], maxLevel: 4 }, { id: "x-b", ages: [6, 10], maxLevel: 4 }] };
const DAY = "2026-11-23";

/** A round of `n` items with `first` solved first try; each miss shows `hintsPerMiss` hints. */
const round = (first: number, n = 8, hintsPerMiss = 1) =>
  Array.from({ length: n }, (_, i) => (i < first ? { firstTry: true, hintsShown: 0 } : { firstTry: false, hintsShown: hintsPerMiss }));
const EASY = round(8);
const OK = round(5);
const HARD = round(2);

function on(world: string, opts: Partial<PathsState> & { easy?: number; hard?: number } = {}): PathsState {
  return { v: 1, cur: opts.cur === undefined ? "sky" : opts.cur, by: { sky: { w: world, easy: opts.easy ?? 0, hard: opts.hard ?? 0 }, ...(opts.by ?? {}) }, run: opts.run ?? null };
}
const play = (state: PathsState, world: string, level: number, results = OK, levels: Record<string, number> = {}, age = 7, day = DAY, path = PATH) =>
  recordPathRound(state, { path, day, age, round: { world, level, results }, levels: { [world]: level, ...levels } });

describe("placement (A1–A3)", () => {
  it("A1: placement age is the band's middle year", () => {
    expect(placementAge([3, 5])).toBe(4);
    expect(placementAge([6, 8])).toBe(7);
    expect(placementAge([9, 11])).toBe(10);
    expect(placementAge([12, 14])).toBe(13);
  });
  it("A2: the first world containing the age; nearest when none; younger on a tie", () => {
    expect(PATH.worlds[startWorldIndex(PATH, 4)]!.id).toBe("w-a");
    expect(PATH.worlds[startWorldIndex(PATH, 5)]!.id).toBe("w-a"); // in w-a and w-b: first in path order
    expect(PATH.worlds[startWorldIndex(PATH, 7)]!.id).toBe("w-b");
    expect(PATH.worlds[startWorldIndex(PATH, 10)]!.id).toBe("w-c"); // no world for 10: w-c is 1 year away, w-d 2
    expect(PATH.worlds[startWorldIndex(PATH, 13)]!.id).toBe("w-d");
    const gap: PathDef = { id: "g", worlds: [{ id: "lo", ages: [3, 5], maxLevel: 3 }, { id: "hi", ages: [9, 11], maxLevel: 3 }] };
    expect(gap.worlds[startWorldIndex(gap, 7)]!.id).toBe("lo"); // 2 years from both: the younger world
    expect(startWorldIndex({ id: "e", worlds: [] }, 7)).toBe(-1);
  });
  it("A3: the start of the age's share of the levels, clamped to the world's years", () => {
    const a = PATH.worlds[0]!; // 3–5, levels 0..7
    expect([3, 4, 5].map((age) => placementLevel(a, age))).toEqual([0, 2, 5]);
    expect(placementLevel(a, 2)).toBe(0);
    expect(placementLevel(a, 9)).toBe(5); // older than the world: start of its last year's share, not the top
    const b = PATH.worlds[1]!; // 5–7, levels 0..3
    expect([5, 6, 7].map((age) => placementLevel(b, age))).toEqual([0, 1, 2]);
    expect(placementLevel({ id: "one", ages: [6, 6], maxLevel: 4 }, 6)).toBe(0);
  });
  it("A2: a child who already played further along the path starts there, keeping the stored level", () => {
    expect(startPath(PATH, 4, {})).toEqual({ progress: { w: "w-a", easy: 0, hard: 0 }, setLevel: 2 });
    expect(startPath(PATH, 4, { "w-c": 3 })).toEqual({ progress: { w: "w-c", easy: 0, hard: 0 }, setLevel: undefined });
    // progress in an EARLIER world than the age start does not pull the child back
    expect(startPath(PATH, 13, { "w-a": 1 })?.progress.w).toBe("w-d");
    expect(startPath({ id: "e", worlds: [] }, 7, {})).toBeNull();
  });
});

describe("classifying rounds (C1)", () => {
  it("easy = ≥ 85 % first try with at most one hint; struggling = < 40 % first try", () => {
    expect(classifyRound(round(8))).toBe("easy");
    expect(classifyRound(round(7))).toBe("easy"); // one slip, fixed after one hint
    expect(classifyRound(round(7, 8, 2))).toBe("ok"); // the slip needed the modelled answer
    expect(classifyRound(round(6))).toBe("ok");
    expect(classifyRound(round(4))).toBe("ok");
    expect(classifyRound(round(3))).toBe("struggling"); // 3 of 8 = 37.5 %
    expect(classifyRound(round(0))).toBe("struggling");
  });
  it("boundaries are exact", () => {
    expect(PATH_RULES.easyRate).toBe(0.85);
    expect(PATH_RULES.hardRate).toBe(0.4);
    expect(classifyRound(round(4, 10))).toBe("ok"); // exactly 40 % is not struggling
    expect(classifyRound(round(3, 10))).toBe("struggling");
    expect(classifyRound(round(9, 10))).toBe("easy"); // 90 %, one hint
    expect(classifyRound(round(8, 10))).toBe("ok"); // 80 %
    expect(classifyRound(round(17, 20))).toBe("ok"); // 85 % but three hints
  });
  it("short rounds are never evidence of 'too easy'", () => {
    expect(classifyRound(round(3, 3))).toBe("ok");
    expect(classifyRound([])).toBe("ok");
  });
});

describe("stepping up (U1–U3)", () => {
  it("U1: one easy round is not enough; the 2nd easy round in a row skips ahead (+2 instead of +1)", () => {
    const r1 = play(on("w-c"), "w-c", 2, EASY, { "w-c": 3 }); // R0 already stored 3
    expect(r1.cls).toBe("easy");
    expect(r1.levels).toEqual({});
    expect(r1.state.by.sky).toEqual({ w: "w-c", easy: 1, hard: 0 });
    const r2 = play(r1.state, "w-c", 3, EASY, { "w-c": 4 });
    expect(r2.levels).toEqual({ "w-c": 5 });
    expect(r2.note).toEqual({ kind: "skip", world: "w-c", level: 5 });
    expect(r2.state.by.sky!.easy).toBe(0); // the streak restarts after a skip
  });
  it("U1: an OK round between easy rounds breaks the streak", () => {
    let s = play(on("w-c"), "w-c", 2, EASY).state;
    s = play(s, "w-c", 3, OK).state;
    const r = play(s, "w-c", 3, EASY, { "w-c": 4 });
    expect(r.levels).toEqual({});
    expect(r.state.by.sky!.easy).toBe(1);
  });
  it("U1: a skip never passes the top level; the streak then carries to the top", () => {
    const r = play(on("w-c", { easy: 1 }), "w-c", 7, EASY, { "w-c": 8 });
    expect(r.levels).toEqual({});
    expect(r.note).toBeNull();
    expect(r.state.by.sky!.easy).toBe(2);
  });
  it("U2: ≥ 75 % first try at the top level moves to the next world at its placement level", () => {
    const r = play(on("w-a"), "w-a", 7, round(6), {}, 4);
    expect(r.state.by.sky!.w).toBe("w-b");
    expect(r.levels).toEqual({ "w-b": 0 }); // age 4 is below w-b (5–7): its first share
    expect(r.note).toEqual({ kind: "next-world", world: "w-b", level: 0 });
    expect(currentStopIndex(r.state, PATH)).toBe(1);
  });
  it("U2: the next world keeps a level the child already earned there (from Explore or the trail)", () => {
    const r = play(on("w-a"), "w-a", 7, EASY, { "w-b": 2 }, 4);
    expect(r.levels).toEqual({});
    expect(r.note).toEqual({ kind: "next-world", world: "w-b", level: 2 });
  });
  it("U2: below 75 % at the top level the child keeps practising the top", () => {
    const r = play(on("w-a"), "w-a", 7, round(5), {}, 4);
    expect(r.state.by.sky!.w).toBe("w-a");
    expect(r.note).toBeNull();
  });
  it("U3: a world starting more than 3 years above the child's age needs clear mastery (2 easy rounds in a row)", () => {
    // age 7: w-d starts at 12 > 7 + 3
    const passed = play(on("w-c"), "w-c", 8, round(6), {}, 7);
    expect(passed.state.by.sky!.w).toBe("w-c");
    const easy1 = play(on("w-c"), "w-c", 8, EASY, {}, 7);
    expect(easy1.state.by.sky!.w).toBe("w-c");
    expect(easy1.state.by.sky!.easy).toBe(1);
    const easy2 = play(easy1.state, "w-c", 8, EASY, {}, 7);
    expect(easy2.state.by.sky!.w).toBe("w-d");
    expect(easy2.levels).toEqual({ "w-d": 0 });
    // an older child (age 10) moves on with an ordinary pass
    expect(play(on("w-c"), "w-c", 8, round(6), {}, 10).state.by.sky!.w).toBe("w-d");
  });
  it("T3: graduating from the last world stays put and offers another path", () => {
    const r = play(on("w-d"), "w-d", 5, EASY, {}, 13);
    expect(r.state.by.sky!.w).toBe("w-d");
    expect(r.note).toEqual({ kind: "path-end", world: "w-d" });
    expect(r.offer).toBe("end");
  });
});

describe("stepping down (D1, T2)", () => {
  it("one struggling round changes nothing; the 2nd in a row goes one level down", () => {
    const r1 = play(on("w-c"), "w-c", 4, HARD);
    expect(r1.levels).toEqual({});
    expect(r1.state.by.sky!.hard).toBe(1);
    const r2 = play(r1.state, "w-c", 4, HARD);
    expect(r2.levels).toEqual({ "w-c": 3 });
    expect(r2.note).toEqual({ kind: "down", world: "w-c", level: 3 });
    expect(r2.state.by.sky!.hard).toBe(0);
    expect(r2.offer).toBeNull();
  });
  it("an OK round resets the struggling streak", () => {
    let s = play(on("w-c"), "w-c", 4, HARD).state;
    s = play(s, "w-c", 4, OK).state;
    expect(play(s, "w-c", 4, HARD).levels).toEqual({});
  });
  it("at level 0 → back to the previous world's top level", () => {
    const r = play(on("w-c", { hard: 1 }), "w-c", 0, HARD);
    expect(r.state.by.sky!.w).toBe("w-b");
    expect(r.levels).toEqual({ "w-b": 3 });
    expect(r.note).toEqual({ kind: "back-world", world: "w-b", level: 3 });
  });
  it("T2: at level 0 of the first world the level stays at 0 and the host offers another path", () => {
    const r = play(on("w-a", { hard: 1 }), "w-a", 0, HARD, {}, 4);
    expect(r.state.by.sky).toEqual({ w: "w-a", easy: 0, hard: 0 });
    expect(r.levels).toEqual({});
    expect(r.offer).toBe("tricky");
  });
  it("levels never go below 0", () => {
    let s = on("w-a");
    for (let i = 0; i < 6; i++) {
      const r = play(s, "w-a", 0, HARD, {}, 4);
      for (const v of Object.values(r.levels)) expect(v).toBeGreaterThanOrEqual(0);
      s = r.state;
    }
  });
});

describe("tired offers (T1) and scope", () => {
  it("T1: the 3rd round in a row on the chosen path on one day offers another path, then the count restarts", () => {
    let s = on("w-c");
    const offers: (string | null)[] = [];
    for (let i = 0; i < 6; i++) {
      const r = play(s, "w-c", 4, OK);
      offers.push(r.offer);
      s = r.state;
    }
    expect(offers).toEqual([null, null, "tired", null, null, "tired"]);
  });
  it("T1: a round on another path or a new day restarts the count", () => {
    let s: PathsState = on("w-c", { by: { words: { w: "x-a", easy: 0, hard: 0 } } });
    s = play(s, "w-c", 4).state;
    s = play(s, "w-c", 4).state;
    s = play(s, "x-a", 1, OK, {}, 4, DAY, OTHER).state;
    expect(play(s, "w-c", 4).offer).toBeNull();
    let t = on("w-c");
    t = play(t, "w-c", 4).state;
    t = play(t, "w-c", 4).state;
    expect(play(t, "w-c", 4, OK, {}, 7, "2026-11-24").offer).toBeNull();
  });
  it("offers are made only for the path the child chose", () => {
    let s = on("w-a", { cur: "words", hard: 1 });
    const r = play(s, "w-a", 0, HARD, {}, 4);
    expect(r.offer).toBeNull();
    s = on("w-c", { cur: "words" });
    for (let i = 0; i < 3; i++) s = play(s, "w-c", 4).state;
    expect(s.run?.n).toBe(3);
  });
  it("rounds in a world that is not the path's current stop never move levels or stops", () => {
    const r = play(on("w-c", { easy: 1, hard: 1 }), "w-a", 7, EASY, {}, 4);
    expect(r.levels).toEqual({});
    expect(r.note).toBeNull();
    expect(r.state.by.sky).toEqual({ w: "w-c", easy: 1, hard: 1 });
    expect(r.cls).toBeNull();
  });
  it("a path the child never started only counts the run", () => {
    const r = play(emptyPathsState(), "w-c", 4, EASY);
    expect(r.state.by).toEqual({});
    expect(r.state.run).toEqual({ p: "sky", day: DAY, n: 1 });
  });
  it("is deterministic and never mutates its input", () => {
    const s = on("w-c", { easy: 1 });
    const copy = structuredClone(s);
    expect(play(s, "w-c", 3, EASY)).toEqual(play(s, "w-c", 3, EASY));
    expect(s).toEqual(copy);
  });
});

describe("switching paths (S1)", () => {
  it("keeps each path's progress and re-uses it when the child comes back", () => {
    let { state } = choosePath(emptyPathsState(), PATH, 7, {});
    expect(state.cur).toBe("sky");
    expect(state.by.sky!.w).toBe("w-b");
    state = play(state, "w-b", 3, round(7), {}, 7).state; // graduates to w-c
    expect(state.by.sky!.w).toBe("w-c");
    const sw = choosePath(state, OTHER, 7, {});
    expect(sw.state.cur).toBe("words");
    expect(sw.state.by.sky!.w).toBe("w-c");
    expect(sw.setLevel).toEqual({ world: "x-b", level: 1 });
    const back = choosePath(sw.state, PATH, 7, { "w-c": 2 });
    expect(back.state.by.sky!.w).toBe("w-c");
    expect(back.setLevel).toBeUndefined();
    expect(back.state.by.words!.w).toBe("x-b");
  });
  it("a saved stop that is no longer in the path is placed again", () => {
    const s: PathsState = { v: 1, cur: null, by: { sky: { w: "gone", easy: 1, hard: 0 } }, run: null };
    const r = choosePath(s, PATH, 4, {});
    expect(r.state.by.sky).toEqual({ w: "w-a", easy: 0, hard: 0 });
    expect(r.setLevel).toEqual({ world: "w-a", level: 2 });
  });
  it("a path without worlds cannot be chosen", () => {
    const s = emptyPathsState();
    expect(choosePath(s, { id: "empty", worlds: [] }, 7, {}).state).toBe(s);
  });
});

describe("stored state (migration + validation)", () => {
  it("state saved before paths existed migrates to an empty path state", () => {
    expect(parsePathsState(undefined)).toEqual(emptyPathsState());
    expect(parsePathsState(null)).toEqual(emptyPathsState());
    expect(parsePathsState({ v: 2, cur: "sky" })).toEqual(emptyPathsState());
  });
  it("round-trips valid state", () => {
    const s: PathsState = { v: 1, cur: "sky", by: { sky: { w: "w-c", easy: 1, hard: 0 }, words: { w: "x-a", easy: 0, hard: 1 } }, run: { p: "sky", day: DAY, n: 2 } };
    expect(parsePathsState(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it("drops corrupt entries one by one, never throwing", () => {
    const s = parsePathsState({ v: 1, cur: "Bad Id!", by: { sky: { w: "w-c", easy: 1, hard: 0 }, bad: { w: 3 }, "x y": { w: "a", easy: 0, hard: 0 }, neg: { w: "a", easy: -1, hard: 0 } }, run: { p: "sky", day: "today", n: 1 } });
    expect(s).toEqual({ v: 1, cur: null, by: { sky: { w: "w-c", easy: 1, hard: 0 } }, run: null });
    expect(parsePathsState("garbage")).toEqual(emptyPathsState());
    expect(parsePathsState({ v: 1, by: [] })).toEqual(emptyPathsState());
  });
});
