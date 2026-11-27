import { describe, expect, it } from "vitest";
import { applyResult, initialProgression, isRoundComplete, markPlayed, selectNextExercise, startDifficultyFor } from "../../src/engine/progression";
import type { ExerciseResult, ProgressionState } from "../../src/engine/types";
import { fixtureGame as game } from "./fixtures";

const cfg = game.progression;
const result = (attempts: number, id = "x"): ExerciseResult => ({ exerciseId: id, skillId: "s", difficulty: 1, attempts, firstTry: attempts === 1, hintsShown: attempts - 1 });

/** Simulate a full round where the child needs `attemptsFor(i)` attempts on the i-th exercise. */
function simulate(attemptsFor: (i: number) => number) {
  let st: ProgressionState = initialProgression(cfg);
  const seq: string[] = [];
  const diffs: number[] = [];
  while (!isRoundComplete(st, cfg)) {
    const ex = selectNextExercise(game, st);
    if (!ex) break;
    seq.push(ex.id);
    diffs.push(ex.difficulty);
    st = markPlayed(st, ex.id);
    st = applyResult(st, { ...result(attemptsFor(seq.length - 1), ex.id), difficulty: ex.difficulty }, cfg);
  }
  return { seq, diffs, st };
}

describe("progression rules", () => {
  it("R1: starts at min difficulty with the tutorial exercise", () => {
    const st = initialProgression(cfg);
    expect(st.difficulty).toBe(1);
    expect(selectNextExercise(game, st)?.id).toBe("ca-tap-3-apple");
  });

  it("R2: two first-try successes step difficulty up, capped at max", () => {
    let st = initialProgression(cfg);
    st = applyResult(st, result(1), cfg);
    expect(st.difficulty).toBe(1);
    st = applyResult(st, result(1), cfg);
    expect(st.difficulty).toBe(2);
    expect(st.streak).toBe(0);
    for (let i = 0; i < 10; i++) st = applyResult(st, result(1), cfg);
    expect(st.difficulty).toBe(4);
  });

  it("R3: needing 3+ attempts steps difficulty down, floored at min", () => {
    let st: ProgressionState = { ...initialProgression(cfg), difficulty: 3, streak: 1 };
    st = applyResult(st, result(3), cfg);
    expect(st).toMatchObject({ difficulty: 2, streak: 0 });
    st = applyResult(st, result(4), cfg);
    st = applyResult(st, result(5), cfg);
    expect(st.difficulty).toBe(1);
  });

  it("R4: a second-try success resets the streak and keeps difficulty", () => {
    let st = applyResult(initialProgression(cfg), result(1), cfg);
    st = applyResult(st, result(2), cfg);
    expect(st).toMatchObject({ difficulty: 1, streak: 0 });
  });

  it("R5: never repeats an exercise and alternates interaction types where possible", () => {
    const { seq } = simulate(() => 1);
    expect(new Set(seq).size).toBe(seq.length);
    const types = seq.map((id) => game.exercises.find((e) => e.id === id)!.interaction);
    for (let i = 1; i < types.length; i++) expect(types[i]).not.toBe(types[i - 1]);
  });

  it("R6: round ends after roundLength exercises", () => {
    const { seq, st } = simulate(() => 1);
    expect(seq).toHaveLength(cfg.roundLength);
    expect(isRoundComplete(st, cfg)).toBe(true);
  });

  it("is deterministic: an all-first-try round climbs through the levels", () => {
    const a = simulate(() => 1);
    const b = simulate(() => 1);
    expect(a.seq).toEqual(b.seq);
    expect(a.diffs).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("a struggling child stays on easy items", () => {
    const { diffs } = simulate(() => 3);
    expect(Math.max(...diffs)).toBe(1);
  });

  it("falls back to the nearest difficulty (lower first) when a level is exhausted", () => {
    const easyOnly = { ...game, exercises: game.exercises.filter((e) => e.difficulty !== 1 || e.id === "ca-tap-3-apple" || e.id === "ca-make-2-berry") };
    let st: ProgressionState = { ...initialProgression(cfg), difficulty: 1 };
    st = markPlayed(markPlayed(st, "ca-tap-3-apple"), "ca-make-2-berry");
    expect(selectNextExercise(easyOnly, st)?.difficulty).toBe(2);
    const mid: ProgressionState = { ...st, difficulty: 3, played: game.exercises.filter((e) => e.difficulty === 3).map((e) => e.id) };
    expect(selectNextExercise(game, mid)?.difficulty).toBe(2);
  });
});

describe("level-ups (R0)", () => {
  it("each completed round starts one level higher, capped at max", () => {
    expect(startDifficultyFor(0, cfg)).toBe(1);
    expect(startDifficultyFor(1, cfg)).toBe(2);
    expect(startDifficultyFor(3, cfg)).toBe(4);
    expect(startDifficultyFor(9, cfg)).toBe(4);
    expect(initialProgression(cfg, startDifficultyFor(2, cfg)).difficulty).toBe(3);
  });
  it("a struggling child still steps back down within a levelled-up round", () => {
    let st = initialProgression(cfg, 3);
    st = applyResult(st, { ...result(3), difficulty: 3 }, cfg);
    expect(st.difficulty).toBe(2);
  });
});

describe("R5a: round closers wait for the last slot", () => {
  // Each difficulty gets a closer (a finale); the fixture pool is otherwise unchanged.
  const closers = [1, 2, 3, 4].map((d) => ({ ...game.exercises.find((e) => e.difficulty === d && !e.tutorial)!, id: `finale-d${d}`, closer: true }));
  const pool = { exercises: [...game.exercises, ...closers] };
  const run = (attempts: number, withConfig = true) => {
    let st: ProgressionState = initialProgression(cfg);
    const seq: string[] = [];
    while (!isRoundComplete(st, cfg)) {
      const ex = selectNextExercise(pool, st, withConfig ? cfg : undefined);
      if (!ex) break;
      seq.push(ex.id);
      st = applyResult(markPlayed(st, ex.id), { ...result(attempts, ex.id), difficulty: ex.difficulty }, cfg);
    }
    return { seq, st };
  };

  it("a closer is never served before the last slot, and the last slot is always a closer at the current difficulty", () => {
    for (const attempts of [1, 2, 3]) {
      const { seq, st } = run(attempts);
      expect(seq).toHaveLength(cfg.roundLength);
      expect(seq.slice(0, -1).some((id) => id.startsWith("finale"))).toBe(false);
      const lastDifficulty = st.results.at(-1)!.difficulty;
      expect(seq.at(-1), `attempts ${attempts}`).toBe(`finale-d${lastDifficulty}`);
    }
  });

  it("the closer comes from the current difficulty, else the nearest (lower first)", () => {
    const st: ProgressionState = { ...initialProgression(cfg), difficulty: 3, played: ["x1"], results: Array.from({ length: 7 }, (_, i) => result(1, `r${i}`)) };
    expect(selectNextExercise(pool, st, cfg)?.id).toBe("finale-d3");
    const noD3 = { exercises: pool.exercises.filter((e) => e.id !== "finale-d3") };
    expect(selectNextExercise(noD3, st, cfg)?.id).toBe("finale-d2");
  });

  it("without config (older callers) closers are only a fallback when nothing else is left", () => {
    const { seq } = run(1, false);
    expect(seq.some((id) => id.startsWith("finale"))).toBe(false);
    const st: ProgressionState = { ...initialProgression(cfg), played: game.exercises.map((e) => e.id) };
    expect(selectNextExercise(pool, st)?.closer).toBe(true);
  });

  it("pools without closers pick exactly as before (R5 unchanged)", () => {
    for (const attempts of [1, 2, 3]) {
      let a: ProgressionState = initialProgression(cfg);
      let b: ProgressionState = initialProgression(cfg);
      while (!isRoundComplete(a, cfg)) {
        const x = selectNextExercise(game, a)!;
        const y = selectNextExercise(game, b, cfg)!;
        expect(y.id).toBe(x.id);
        a = applyResult(markPlayed(a, x.id), { ...result(attempts, x.id), difficulty: x.difficulty }, cfg);
        b = applyResult(markPlayed(b, y.id), { ...result(attempts, y.id), difficulty: y.difficulty }, cfg);
      }
    }
  });
});
