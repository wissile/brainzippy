import { describe, expect, it } from "vitest";
import { choicesOf, targetOf } from "../../src/engine/validation";
import { lintExercise, validateChoice } from "../../src/engine/validation";
import { initialProgression, selectNextExercise } from "../../src/engine/progression";
import { skyBalloonRace } from "../../src/games/sky-balloon-race/definition";
import { addends, countOnSay, countOnSteps, tenFrameCells, trackPos } from "../../src/games/sky-balloon-race/logic";
import voice from "../../src/games/sky-balloon-race/voice.json";

const lines = voice.lines as Record<string, { text: string; vary?: Record<string, (string | number)[]> }>;
const exercises = skyBalloonRace.exercises;
const byId = (id: string) => exercises.find((e) => e.id === id)!;

describe("Sky Balloon Race content", () => {
  it("every exercise passes lint", () => {
    expect(exercises.flatMap(lintExercise)).toEqual([]);
  });

  it("params add up to the target and the prompt shows the sum", () => {
    for (const ex of exercises) {
      const { a, b } = addends(ex);
      expect(a + b, ex.id).toBe(targetOf(ex));
      expect(a).toBeGreaterThan(0);
      expect(b).toBeGreaterThan(0);
      expect(ex.prompt?.text).toBe(`${a} + ${b} = ?`);
      expect(ex.skillId).toBe("math.add.within-20");
      expect(ex.interaction).toBe("choose");
    }
  });

  it("has enough items per difficulty and exactly one easy tutorial", () => {
    const count = (d: number) => exercises.filter((e) => e.difficulty === d).length;
    expect(count(1)).toBeGreaterThanOrEqual(8);
    for (const d of [2, 3, 4]) expect(count(d)).toBeGreaterThanOrEqual(5);
    const tutorials = exercises.filter((e) => e.tutorial);
    expect(tutorials).toHaveLength(1);
    expect(tutorials[0]!.difficulty).toBe(1);
    expect(selectNextExercise(skyBalloonRace, initialProgression(skyBalloonRace.progression))?.id).toBe(tutorials[0]!.id);
  });

  it("difficulty bands follow the curriculum ladder", () => {
    for (const ex of exercises) {
      const { big, small } = addends(ex);
      const [lo, hi] = ex.difficulty === 1 ? [2, 5] : ex.difficulty === 2 ? [6, 10] : [11, 20];
      expect(targetOf(ex), ex.id).toBeGreaterThanOrEqual(lo);
      expect(targetOf(ex), ex.id).toBeLessThanOrEqual(hi);
      if (ex.difficulty === 3) expect(big, `${ex.id} should cross ten from a single digit`).toBeLessThan(10);
      expect(small).toBeGreaterThanOrEqual(1);
    }
  });

  it("three choices: the target plus plausible near misses", () => {
    for (const ex of exercises) {
      const choices = choicesOf(ex)!;
      expect(choices).toHaveLength(3);
      expect(choices).toContain(targetOf(ex));
      for (const c of choices) {
        expect(Math.abs(c - targetOf(ex)), ex.id).toBeLessThanOrEqual(2);
        expect(c).toBeGreaterThanOrEqual(1);
        expect(c).toBeLessThanOrEqual(20);
      }
      expect(validateChoice(ex, targetOf(ex)).correct).toBe(true);
    }
    // the correct balloon is not always in the same place
    const positions = new Set(exercises.map((e) => choicesOf(e)!.indexOf(targetOf(e))));
    expect(positions.size).toBe(3);
  });

  it("ids are unique and the prompt line of every exercise is in voice.json", () => {
    const ids = exercises.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ex of exercises) expect(lines[ex.prompt!.line], ex.prompt!.line).toBeDefined();
  });
});

describe("Sky Balloon Race worked example (count on)", () => {
  it("says the bigger number, then counts on the smaller one", () => {
    const ex = byId("sb-7p6");
    expect(countOnSteps(ex)).toBe(7);
    expect(Array.from({ length: countOnSteps(ex) }, (_, i) => countOnSay(ex, i))).toEqual([7, 8, 9, 10, 11, 12, 13]);
    const flipped = byId("sb-1p3"); // smaller number first: still start with the bigger one
    expect(Array.from({ length: countOnSteps(flipped) }, (_, i) => countOnSay(flipped, i))).toEqual([3, 4]);
    for (const e of exercises) expect(countOnSay(e, countOnSteps(e) - 1)).toBe(targetOf(e));
    expect(countOnSay(ex, 99)).toBeNull();
  });

  it("ten-frame model fills the bigger group first and makes ten across frames", () => {
    const cells = tenFrameCells(byId("sb-8p5"));
    expect(cells).toHaveLength(20);
    expect(cells.filter((c) => c.kind === "big")).toHaveLength(8);
    expect(cells.filter((c) => c.kind === "small").map((c) => c.order)).toEqual([0, 1, 2, 3, 4]);
    expect(cells.slice(0, 10).every((c) => c.kind !== "empty")).toBe(true); // 8 + 2 = a full ten
    expect(tenFrameCells(byId("sb-2p1"))).toHaveLength(10);
  });

  it("race track position is clamped", () => {
    expect(trackPos(0, 8)).toBe(0);
    expect(trackPos(4, 8)).toBe(0.5);
    expect(trackPos(12, 8)).toBe(1);
  });
});

describe("Sky Balloon Race voice lines", () => {
  const targets = [...new Set(exercises.map((e) => targetOf(e)))].sort((x, y) => x - y);

  it("every id is prefixed and every line is short enough for a young listener", () => {
    for (const [id, line] of Object.entries(lines)) {
      expect(id.startsWith("sb."), id).toBe(true);
      expect(line.text.split(/\s+/).length, id).toBeLessThanOrEqual(14);
      expect(line.text.toLowerCase()).not.toMatch(/smart|genius|clever|brilliant/);
    }
  });

  it("vary lists cover every value used, and pre-rendered combos stay under budget", () => {
    for (const [id, line] of Object.entries(lines)) {
      const vars = [...line.text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
      for (const v of vars) {
        expect(line.vary?.[v], `${id} needs vary.${v}`).toBeDefined();
        if (v === "n") expect(line.vary![v]).toEqual(targets);
      }
    }
    const combos = Object.values(lines).reduce((s, l) => s + (l.vary ? Object.values(l.vary).reduce((p, v) => p * v.length, 1) : 1), 0);
    expect(combos).toBeLessThan(150);
  });
});
