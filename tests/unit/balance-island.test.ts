import { describe, expect, it } from "vitest";
import { buildRound, generateBand } from "../../src/engine/round";
import { choicesOf, lintExercise, targetOf, validateAnswer } from "../../src/engine/validation";
import { initExercise, exerciseReducer } from "../../src/engine/session";
import { renderLine } from "../../src/audio/voiceLines";
import { balanceIsland, balanceTutorial } from "../../src/games/balance-island/definition";
import { BALANCE_LEVELS, BALANCE_MAX_LEVEL, SKILL } from "../../src/games/balance-island/generator";
import {
  MAX_BAGS,
  MAX_UNITS,
  MAX_X,
  answerChoices,
  both,
  change,
  diff,
  equationOptions,
  formOf,
  formatEq,
  formatSide,
  isBalanced,
  isolatedSide,
  move,
  pansOf,
  solve,
  solveSteps,
  split,
  splitFactor,
  stepNote,
  storyText,
  tiltDeg,
} from "../../src/games/balance-island/logic";
import voice from "../../src/games/balance-island/voice.json";

const lines = voice.lines as Record<string, { text: string; vary?: Record<string, (string | number)[]> }>;
const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 13);
const allGenerated = () => {
  const out = [];
  for (let level = 0; level <= BALANCE_MAX_LEVEL; level++) for (const seed of SEEDS) out.push(...generateBand(balanceIsland, level, seed, 8));
  return out;
};

/** Brute-force: every whole-number weight 0..200 that balances the pans. */
const solutionsIn = (p: ReturnType<typeof pansOf>) => Array.from({ length: 201 }, (_, x) => x).filter((x) => isBalanced(p, x));

describe("Balance Scale Island logic", () => {
  const p = { l: { x: 2, n: 3 }, r: { x: 0, n: 11 } };

  it("weighs pans, solves and tilts towards the heavier pan", () => {
    expect(solve(p)).toBe(4);
    expect(isBalanced(p, 4)).toBe(true);
    expect(diff(p, 5)).toBe(2);
    expect(tiltDeg(0)).toBe(0);
    expect(tiltDeg(2)).toBeLessThan(0); // left heavier → counter-clockwise (left pan down)
    expect(tiltDeg(-2)).toBeGreaterThan(0);
    expect(Math.abs(tiltDeg(1))).toBeGreaterThanOrEqual(3); // even 1 kg is visible
    expect(Math.abs(tiltDeg(500))).toBeLessThanOrEqual(14);
    expect(solve({ l: { x: 2, n: 1 }, r: { x: 2, n: 5 } })).toBeNull();
  });

  it("moves keep counts within the pan limits and never go negative", () => {
    expect(change(p, "r", "x", -1)).toBeNull();
    expect(change({ l: { x: MAX_BAGS, n: 0 }, r: p.r }, "l", "x", 1)).toBeNull();
    expect(change({ l: { x: 0, n: MAX_UNITS }, r: p.r }, "l", "n", 1)).toBeNull();
    expect(move(p, "l", "shelf", "n")).toEqual({ l: { x: 2, n: 2 }, r: p.r });
    expect(move(p, "shelf", "r", "x")).toEqual({ l: p.l, r: { x: 1, n: 11 } });
    expect(move(p, "l", "r", "n")).toEqual({ l: { x: 2, n: 2 }, r: { x: 0, n: 12 } });
    expect(move(p, "l", "l", "n")).toBeNull();
    expect(both(p, "x", -1)).toBeNull();
    expect(both(p, "n", -3)).toEqual({ l: { x: 2, n: 0 }, r: { x: 0, n: 8 } });
  });

  it("one-sided moves unbalance the scale; the same move on both sides keeps it level", () => {
    const one = change(p, "l", "n", -1)!;
    expect(isBalanced(one, 4)).toBe(false);
    expect(isBalanced(change(one, "r", "n", -1)!, 4)).toBe(true);
  });

  it("splits only when every count divides, and writes book-style step notes", () => {
    expect(splitFactor({ l: { x: 2, n: 0 }, r: { x: 0, n: 8 } })).toBe(2);
    expect(split({ l: { x: 2, n: 0 }, r: { x: 0, n: 8 } }, 2)).toEqual({ l: { x: 1, n: 0 }, r: { x: 0, n: 4 } });
    expect(split(p, 2)).toBeNull();
    expect(stepNote(p, both(p, "n", -3)!)).toBe("−3");
    expect(stepNote({ l: { x: 3, n: 2 }, r: { x: 1, n: 10 } }, { l: { x: 2, n: 2 }, r: { x: 0, n: 10 } })).toBe("−x");
    expect(stepNote({ l: { x: 2, n: 0 }, r: { x: 0, n: 8 } }, { l: { x: 1, n: 0 }, r: { x: 0, n: 4 } })).toBe("÷2");
  });

  it("formats equations like a textbook", () => {
    expect(formatEq(p)).toBe("2x + 3 = 11");
    expect(formatSide({ x: 1, n: 0 })).toBe("x");
    expect(formatSide({ x: 0, n: 0 })).toBe("0");
    expect(formatEq({ l: { x: 0, n: 12 }, r: { x: 1, n: 5 } })).toBe("12 = x + 5");
  });

  it("the worked solution ends with one bag alone against its weight", () => {
    const steps = solveSteps({ l: { x: 3, n: 2 }, r: { x: 1, n: 10 } });
    expect(steps.map((s) => s.op)).toEqual(["bags", "units", "split"]);
    expect(isolatedSide(steps.at(-1)!.pans)).toBe("l");
    expect(steps.at(-1)!.pans.r.n).toBe(4);
  });
});

describe("Balance Scale Island generator", () => {
  it("is deterministic: same level and seed → same round", () => {
    for (let level = 0; level <= BALANCE_MAX_LEVEL; level++) {
      const a = buildRound(balanceIsland, { level, seed: 42 });
      const b = buildRound(balanceIsland, { level, seed: 42 });
      expect(a.exercises).toEqual(b.exercises);
    }
    expect(generateBand(balanceIsland, 3, 1, 8)).not.toEqual(generateBand(balanceIsland, 3, 2, 8));
  });

  it(`every level × ${SEEDS.length} seeds lints, uses a declared skill and has a unique ids`, () => {
    for (let level = 0; level <= BALANCE_MAX_LEVEL; level++) {
      for (const seed of SEEDS) {
        const band = generateBand(balanceIsland, level, seed, 8);
        expect(new Set(band.map((e) => e.id)).size).toBe(band.length);
        for (const ex of band) {
          expect(lintExercise(ex), ex.id).toEqual([]);
          expect(balanceIsland.skillIds, ex.id).toContain(ex.skillId);
          expect(ex.difficulty).toBe(level + 1);
          expect(ex.id.endsWith(`-l${level}n${band.indexOf(ex)}`)).toBe(true);
        }
      }
    }
  });

  it("every generated equation is solvable with exactly one whole-number solution in 1..12", () => {
    for (const ex of allGenerated()) {
      const pans = pansOf(ex.params);
      const x = targetOf(ex);
      expect(Number.isInteger(x), ex.id).toBe(true);
      expect(x).toBeGreaterThanOrEqual(1);
      expect(x).toBeLessThanOrEqual(MAX_X);
      expect(pans.l.x - pans.r.x, `${ex.id} needs a non-zero net number of bags (unique solution)`).not.toBe(0);
      expect(solve(pans), ex.id).toBe(x);
      expect(solutionsIn(pans), ex.id).toEqual([x]);
      for (const s of [pans.l, pans.r]) {
        expect(s.x).toBeLessThanOrEqual(MAX_BAGS);
        expect(s.n).toBeLessThanOrEqual(MAX_UNITS);
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.n).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("the model solution solves every generated equation in balanced, legal steps", () => {
    for (const ex of allGenerated()) {
      const pans = pansOf(ex.params);
      const steps = solveSteps(pans);
      expect(steps.length, ex.id).toBeGreaterThanOrEqual(1);
      for (const s of steps) expect(isBalanced(s.pans, targetOf(ex)), ex.id).toBe(true);
      const end = steps.at(-1)!.pans;
      const side = isolatedSide(end);
      expect(side, ex.id).not.toBeNull();
      expect(end[side === "l" ? "r" : "l"].n).toBe(targetOf(ex));
    }
  });

  it("levels follow the documented ladder", () => {
    for (let level = 0; level <= BALANCE_MAX_LEVEL; level++) {
      for (const seed of SEEDS.slice(0, 20)) {
        for (const ex of generateBand(balanceIsland, level, seed, 8)) {
          const pans = pansOf(ex.params);
          const f = formOf(pans);
          const spec = BALANCE_LEVELS[level]!;
          if (spec.story) {
            expect(ex.params?.story, ex.id).toBeDefined();
            expect(ex.prompt?.line).toBe("bi.prompt.story");
          } else {
            expect(f, ex.id).toBe(spec.form);
            expect(ex.params?.story).toBeUndefined();
          }
          if (level === 0) {
            expect(pans.l.x).toBe(1); // bag always on the left at level 1
            expect(Math.max(pans.l.n, pans.r.n)).toBeLessThanOrEqual(10);
          }
          if (level === 1) expect(Math.max(pans.l.n, pans.r.n)).toBeLessThanOrEqual(20);
          if (level === 2 || level === 4) expect(Math.max(pans.l.x, pans.r.x)).toBe(2);
          if (level === 3 || level === 5) expect(Math.max(pans.l.x, pans.r.x)).toBeGreaterThanOrEqual(3);
          if (level === 6) expect(Math.min(pans.l.x, pans.r.x)).toBeGreaterThanOrEqual(1);
          const skill = f === "both" ? SKILL.both : f === "two" ? SKILL.two : SKILL.one;
          expect(ex.skillId).toBe(skill);
        }
      }
    }
  });

  it("from level 2 the bag sometimes sits on the right pan", () => {
    const flipped = generateBand(balanceIsland, 1, 5, 8).concat(...SEEDS.map((s) => generateBand(balanceIsland, 1, s, 8))).filter((e) => pansOf(e.params).r.x > 0);
    expect(flipped.length).toBeGreaterThan(0);
  });
});

describe("answer choices and word stories", () => {
  it("four distinct whole-number choices, one correct, distractors from misconceptions", () => {
    for (const ex of allGenerated()) {
      const c = choicesOf(ex);
      expect(c, ex.id).toHaveLength(4);
      expect(new Set(c).size).toBe(4);
      expect(c.filter((v) => v === targetOf(ex))).toHaveLength(1);
      for (const v of c) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(1);
      }
      expect([...c].sort((a, b) => a - b)).toEqual(c);
    }
    // x + 3 = 7: "did the operation shown" gives 10
    expect(answerChoices({ l: { x: 1, n: 3 }, r: { x: 0, n: 7 } })).toContain(10);
    // 2x + 3 = 11: forgetting to split gives 8
    expect(answerChoices({ l: { x: 2, n: 3 }, r: { x: 0, n: 11 } })).toContain(8);
  });

  it("every story has 3–4 distinct equation options with exactly one correct, matching the scale", () => {
    const stories = allGenerated().filter((e) => e.params?.story !== undefined);
    expect(stories.length).toBeGreaterThan(100);
    const forms = new Set<string>();
    for (const ex of stories) {
      const pans = pansOf(ex.params);
      forms.add(formOf(pans));
      const opts = equationOptions(pans, ex.seed);
      expect(opts.length, ex.id).toBeGreaterThanOrEqual(3);
      expect(opts.length).toBeLessThanOrEqual(4);
      expect(new Set(opts.map((o) => o.text)).size).toBe(opts.length);
      const right = opts.filter((o) => o.correct);
      expect(right).toHaveLength(1);
      // the correct option is the scale's equation written bags-side first
      const flipped = pans.l.x >= pans.r.x ? pans : { l: pans.r, r: pans.l };
      expect(right[0]!.text).toBe(formatEq(flipped));
      expect(equationOptions(pans, ex.seed)).toEqual(opts);
      const text = storyText(pans, ex.params!.story!);
      for (const n of [pans.l.n, pans.r.n].filter((v) => v > 0)) expect(text, ex.id).toContain(String(n));
      expect(text).not.toMatch(/undefined|NaN/);
    }
    expect([...forms].sort()).toEqual(["add", "both", "mult", "two"]);
  });
});

describe("authored tutorial, engine flow and voice", () => {
  it("the tutorial is x + 3 = 7 at difficulty 1 and plays first on level 0 only", () => {
    expect(lintExercise(balanceTutorial)).toEqual([]);
    expect(balanceTutorial.tutorial).toBe(true);
    expect(balanceTutorial.difficulty).toBe(1);
    expect(targetOf(balanceTutorial)).toBe(4);
    expect(formatEq(pansOf(balanceTutorial.params))).toBe("x + 3 = 7");
    expect(buildRound(balanceIsland, { level: 0, seed: 1 }).exercises.some((e) => e.tutorial)).toBe(true);
    expect(buildRound(balanceIsland, { level: 1, seed: 1 }).exercises.some((e) => e.tutorial)).toBe(false);
  });

  it("validates the answer and walks the hint ladder: eliminate, then model", () => {
    const ex = balanceTutorial;
    const wrong = choicesOf(ex).find((c) => c !== 4)!;
    expect(validateAnswer(ex.answer, 4).correct).toBe(true);
    expect(validateAnswer(ex.answer, wrong).correct).toBe(false);
    let s = exerciseReducer(initExercise(ex), { type: "SUBMIT", value: wrong });
    expect(s.hintStage).toBe(1);
    expect(s.eliminated).toContain(wrong);
    s = exerciseReducer(s, { type: "FEEDBACK_DONE" });
    const wrong2 = choicesOf(ex).find((c) => c !== 4 && c !== wrong)!;
    s = exerciseReducer(s, { type: "SUBMIT", value: wrong2 });
    expect(s.hintStage).toBe(2);
    expect(s.model).toBe(4);
    s = exerciseReducer(s, { type: "FEEDBACK_DONE" });
    s = exerciseReducer(s, { type: "SUBMIT", value: 4 });
    expect(s.feedback?.correct).toBe(true);
  });

  it("voice: every line is short, praise is about process, and vary covers every possible answer", () => {
    for (const [id, l] of Object.entries(lines)) {
      expect(id.startsWith("bi.")).toBe(true);
      expect(l.text.split(/\s+/).length, id).toBeLessThanOrEqual(20);
      expect(l.text.toLowerCase()).not.toMatch(/smart|genius|clever|brilliant/);
    }
    const answers = new Set(allGenerated().map(targetOf));
    for (const id of ["bi.praise.1", "bi.praise.2", "bi.praise.3", "bi.praise.4", "bi.hint.modelTap"]) {
      for (const n of answers) expect(lines[id]!.vary!.n, `${id} n=${n}`).toContain(n);
    }
    expect(renderLine("bi.praise.2", { n: 7 })).toBe("Yes, x is 7. You undid each step carefully.");
    const prompts = new Set(allGenerated().map((e) => e.prompt!.line).concat(balanceTutorial.prompt!.line));
    for (const id of prompts) expect(lines[id], id).toBeDefined();
  });
});
