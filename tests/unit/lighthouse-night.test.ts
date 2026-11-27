import { describe, expect, it } from "vitest";
import { applyResult, initialProgression, isRoundComplete, markPlayed, selectNextExercise, startDifficultyFor } from "../../src/engine/progression";
import { buildRound, generateBand } from "../../src/engine/round";
import { createRng } from "../../src/engine/rng";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import type { Exercise } from "../../src/engine/types";
import { correctValue, lintExercise, validateAnswer } from "../../src/engine/validation";
import { getLibrary, getSkill, getWorld } from "../../src/content";
import { EXERCISE_PREFIX } from "../../src/analytics/schema";
import cast from "../../src/audio/cast.json";
import { lighthouseNight, lnTutorial } from "../../src/games/lighthouse-night/definition";
import { BAND, FINALE_SKILL, IDEAS, LEVELS, LN_MAX_LEVEL, MODE_SKILL, generateLighthouseNight, ideaOf, roundSpec } from "../../src/games/lighthouse-night/generator";
import { diagnose, explainFor, hintFor, methodFor, modelSteps, praiseFor } from "../../src/games/lighthouse-night/hints";
import {
  GAME_OF, POSITIONS, REF_BEARING, backBearing, backMistakes, bearingFrom, breadMistakes, decodePoint, encodePoint, finaleOf, fmtLine, fmtNum, gradMistakes,
  gridRange, hypMistakes, hypOf, icptMistakes, kindOf, legMistakes, lineMistakes, mapMistakes, modeOf, parMistakes, plotMistakes, pointMistakes, realMistakes,
  article, relAnswer, round1, shareMistakes, triMistakes, valueAt, vertMistakes, type Mode,
} from "../../src/games/lighthouse-night/logic";
import { lnBetween, lnIntro, lnOutro } from "../../src/games/lighthouse-night/story";
import voice from "../../src/games/lighthouse-night/voice.json";

const lines = voice.lines as Record<string, { text: string; vary?: Record<string, string[]>; speaker?: string }>;
const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 11);
const ALL: Exercise[] = [];
for (const seed of SEEDS) for (let level = 0; level <= LN_MAX_LEVEL; level++) ALL.push(...generateBand(lighthouseNight, level, seed, BAND));
const ofMode = (mode: Mode) => ALL.filter((e) => modeOf(e) === mode);
const P = (ex: Exercise, k: string) => ex.params?.[k] ?? 0;
const num = (ex: Exercise) => (ex.answer.kind === "number" || ex.answer.kind === "numeric" ? ex.answer.value : NaN);

describe("registry and definition", () => {
  it("is registered in the maths library, ages 12–14, host Hoot, with its skills", () => {
    const w = getWorld("lighthouse-night")!;
    expect(w).toBeDefined();
    expect(w.subject).toBe("math");
    expect([...w.ages]).toEqual([12, 14]);
    expect(w.characters[0]).toBe("hoot");
    expect(w.maxLevel).toBe(LN_MAX_LEVEL);
    expect(getLibrary("math")).toBeDefined();
    for (const s of lighthouseNight.skillIds) expect(getSkill(s), s).toBeDefined();
    expect(EXERCISE_PREFIX["lighthouse-night"]).toBe("ln");
  });
  it("prerequisites outside the world end by age 12, so the planner never locks it for 12–14", () => {
    for (const s of lighthouseNight.skillIds)
      for (const q of getSkill(s)!.prerequisites) {
        if (lighthouseNight.skillIds.includes(q)) continue;
        expect(getSkill(q), q).toBeDefined();
        expect(getSkill(q)!.ages[1], q).toBeLessThanOrEqual(12);
      }
  });
  it("has 6–10 levels and exactly one tutorial (difficulty 1, angles on a line, x = 50°)", () => {
    expect(LN_MAX_LEVEL + 1).toBeGreaterThanOrEqual(6);
    expect(LN_MAX_LEVEL + 1).toBeLessThanOrEqual(10);
    expect(lighthouseNight.exercises.filter((e) => e.tutorial)).toEqual([lnTutorial]);
    expect(lnTutorial.difficulty).toBe(1);
    expect(lnTutorial.answer).toEqual({ kind: "number", value: 50 });
    expect(lintExercise(lnTutorial)).toEqual([]);
  });
});

describe("level table: inner games, variety and new ideas", () => {
  it("every level has 8 slots and closes with Last Ship Home", () => {
    for (const l of LEVELS) {
      expect(l.slots).toHaveLength(BAND);
      expect(l.slots[BAND - 1]!.mode).toBe("home");
      expect(l.slots.slice(0, -1).some((s) => s.mode === "home")).toBe(false);
    }
  });
  it("level 0 is one inner game; no mode fills more than 3 of a level's 7 slots; later levels mix games", () => {
    expect(new Set(LEVELS[0]!.slots.slice(0, -1).map((s) => GAME_OF[s.mode]))).toEqual(new Set(["beam"]));
    LEVELS.forEach((l, lv) => {
      const counts = new Map<string, number>();
      for (const s of l.slots.slice(0, -1)) counts.set(s.mode, (counts.get(s.mode) ?? 0) + 1);
      for (const [mode, c] of counts) expect(c, `L${lv} ${mode}`).toBeLessThanOrEqual(3);
      if (lv >= 1) expect(new Set(l.slots.slice(0, -1).map((s) => GAME_OF[s.mode])).size, `L${lv}`).toBeGreaterThanOrEqual(2);
      if (lv >= 4) expect(new Set(l.slots.slice(0, -1).map((s) => GAME_OF[s.mode])).size, `L${lv}`).toBeGreaterThanOrEqual(3);
    });
  });
  it("each level adds at most three new ideas, uses each of them, and only practises ideas already introduced", () => {
    const seen = new Set<string>();
    LEVELS.forEach((l, lv) => {
      const fresh = IDEAS[lv]!;
      expect(fresh.length, `L${lv}`).toBeLessThanOrEqual(3);
      for (const i of fresh) seen.add(i);
      const used = new Set(l.slots.flatMap(ideaOf));
      for (const i of fresh) expect(used.has(i), `L${lv} uses ${i}`).toBe(true);
      for (const i of used) expect(seen.has(i), `L${lv}: ${i} introduced`).toBe(true);
    });
  });
  it("inner games unlock across levels: beam → chart → grid → ladder (Pythagoras, grade 8 / Y9, from level 3)", () => {
    const first = (g: string) => LEVELS.findIndex((l) => l.slots.some((s) => GAME_OF[s.mode] === g));
    expect(first("beam")).toBe(0);
    expect(first("chart")).toBe(1);
    expect(first("grid")).toBe(2);
    expect(first("ladder")).toBe(3);
  });
  it("½ gradients come with the negative ones (level 6 on); angle types only at level 0", () => {
    for (const ex of ALL.filter((e) => ["grad", "icpt", "eqn"].includes(modeOf(e)))) {
      if (ex.difficulty <= 6) expect(Number.isInteger(P(ex, "mm")) && P(ex, "mm") > 0, ex.id).toBe(true);
    }
    expect(LEVELS.findIndex((l) => l.slots.some((s) => s.mode === "kind"))).toBe(0);
    expect(LEVELS.slice(1).some((l) => l.slots.some((s) => s.mode === "kind"))).toBe(false);
  });
});

describe("generator: determinism and lint over every level × 50 seeds", () => {
  it("every item lints, has a declared skill for its mode, the right difficulty and an ln- id", () => {
    const problems: string[] = [];
    for (const seed of SEEDS)
      for (let level = 0; level <= LN_MAX_LEVEL; level++)
        for (const ex of generateBand(lighthouseNight, level, seed, BAND)) {
          problems.push(...lintExercise(ex));
          if (ex.difficulty !== level + 1) problems.push(`${ex.id}: difficulty`);
          if (!lighthouseNight.skillIds.includes(ex.skillId)) problems.push(`${ex.id}: skill ${ex.skillId}`);
          const mode = modeOf(ex);
          const want = mode === "home" ? FINALE_SKILL[finaleOf(ex)] : MODE_SKILL[mode];
          if (ex.skillId !== want) problems.push(`${ex.id}: skill for mode`);
          if (!/^ln-[a-z]+-l\d+n\d+$/.test(ex.id)) problems.push(`${ex.id}: id`);
        }
    expect(problems).toEqual([]);
  });
  it("same (level, seed) → same round; another seed → different content", () => {
    for (let level = 0; level <= LN_MAX_LEVEL; level++) {
      expect(buildRound(lighthouseNight, { level, seed: 5 })).toEqual(buildRound(lighthouseNight, { level, seed: 5 }));
      expect(buildRound(lighthouseNight, { level, seed: 5 }).exercises).not.toEqual(buildRound(lighthouseNight, { level, seed: 6 }).exercises);
    }
    expect(generateLighthouseNight(4, createRng(9), 2)).toEqual(generateLighthouseNight(4, createRng(9), 2));
  });
  it("each item is solvable: its own correct value validates and the reducer accepts it", () => {
    for (const ex of ALL) {
      const v = correctValue(ex.answer);
      expect(validateAnswer(ex.answer, v).correct, ex.id).toBe(true);
      expect(exerciseReducer(initExercise(ex), { type: "SUBMIT", value: v }).feedback?.correct, ex.id).toBe(true);
    }
  });
  it("only the finale is a closer, once per band; at every level and pace it ends the round", () => {
    for (const seed of SEEDS.slice(0, 10))
      for (let level = 0; level <= LN_MAX_LEVEL; level++) expect(generateBand(lighthouseNight, level, seed, BAND).filter((e) => e.closer).map(modeOf)).toEqual(["home"]);
    const cfg = lighthouseNight.progression;
    for (const seed of SEEDS.slice(0, 8))
      for (let level = 0; level <= LN_MAX_LEVEL; level++)
        for (const attempts of [1, 2, 3]) {
          const round = buildRound(lighthouseNight, { level, seed });
          let st = initialProgression(cfg, startDifficultyFor(level, cfg));
          const modes: string[] = [];
          while (!isRoundComplete(st, cfg)) {
            const ex = selectNextExercise(round, st, cfg)!;
            modes.push(modeOf(ex));
            st = applyResult(markPlayed(st, ex.id), { exerciseId: ex.id, skillId: ex.skillId, difficulty: ex.difficulty, attempts, firstTry: attempts === 1, hintsShown: attempts - 1 }, cfg);
          }
          expect(modes.at(-1), `seed ${seed} L${level} a${attempts}`).toBe("home");
          expect(modes.slice(0, -1).includes("home")).toBe(false);
        }
  });
  it("level 0 starts with the tutorial", () => {
    const round = buildRound(lighthouseNight, { level: 0, seed: 1 });
    expect(selectNextExercise(round, initialProgression(lighthouseNight.progression), lighthouseNight.progression)?.id).toBe("ln-tutorial-line");
  });
});

describe("maths: every answer recomputed from the picture's numbers", () => {
  it("beam angle facts", () => {
    for (const ex of ofMode("line")) {
      const parts = [P(ex, "p0"), P(ex, "p1"), P(ex, "p2")].slice(0, P(ex, "n"));
      expect(parts.reduce((s, x) => s + x, 0), ex.id).toBe(180);
      expect(num(ex)).toBe(parts[P(ex, "u")]);
      expect(parts.every((x) => x > 0)).toBe(true);
    }
    for (const ex of ofMode("point")) {
      const parts = [P(ex, "p0"), P(ex, "p1"), P(ex, "p2"), P(ex, "p3")].slice(0, P(ex, "n"));
      expect(parts.reduce((s, x) => s + x, 0), ex.id).toBe(360);
      expect(parts.every((x) => x >= 40), ex.id).toBe(true);
      expect(num(ex)).toBe(parts[P(ex, "u")]);
    }
    for (const ex of ofMode("kind")) expect(ex.answer.kind === "choice" && ex.answer.correct).toBe(kindOf(P(ex, "a")));
    for (const ex of ofMode("vert")) expect(num(ex), ex.id).toBe(P(ex, "opp") ? P(ex, "a") : 180 - P(ex, "a"));
    for (const ex of ofMode("tri")) {
      const A = P(ex, "A"), B = P(ex, "B"), C = P(ex, "C");
      expect(A + B + C, ex.id).toBe(180);
      expect(Math.min(A, B, C)).toBeGreaterThanOrEqual(20);
      if (P(ex, "iso")) expect(B).toBe(C);
      expect(num(ex)).toBe([A, B, C][P(ex, "u")]);
      expect(Number.isInteger(num(ex))).toBe(true);
    }
    for (const ex of [...ofMode("par"), ...ofMode("reason")]) {
      const phi = P(ex, "fl") ? 180 - P(ex, "th") : P(ex, "th");
      const g = valueAt(POSITIONS[P(ex, "gp")]!, phi), x = valueAt(POSITIONS[P(ex, "qp")]!, phi);
      const rel = (["corr", "alt", "coint"] as const)[P(ex, "rel")]!;
      expect(x, ex.id).toBe(relAnswer(rel, g));
      if (modeOf(ex) === "par") expect(num(ex)).toBe(x);
      else expect(ex.answer.kind === "choice" && ex.answer.correct).toBe(rel);
    }
  });
  it("bearings: clockwise from north, three figures; back bearing = ±180°", () => {
    for (const ex of ofMode("bread")) {
      const b = num(ex);
      expect(b).toBe(bearingFrom(P(ex, "ref"), P(ex, "side") === 1 ? 1 : -1, P(ex, "d")));
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(360);
      // the marked angle really is the gap between the compass point and the ship
      const gap = Math.abs(((b - REF_BEARING[P(ex, "ref")]! + 540) % 360) - 180);
      expect(gap).toBe(P(ex, "d"));
      expect(P(ex, "ref") === 0 && P(ex, "side") === 1, "never just 'from north, clockwise'").toBe(false);
    }
    for (const ex of [...ofMode("bback"), ...ofMode("home").filter((e) => finaleOf(e) === "fback")]) {
      expect(num(ex)).toBe((P(ex, "b") + 180) % 360);
      expect(num(ex) % 5).toBe(0);
      expect(ex.answer.kind === "numeric" && ex.answer.tolerance).toBe(0);
    }
    expect(backBearing(60)).toBe(240);
    expect(backBearing(250)).toBe(70);
    expect(bearingFrom(2, 1, 40)).toBe(220);
    expect(bearingFrom(0, -1, 35)).toBe(325);
  });
  it("Pythagoras: a² + b² = c²; rounded answers to 1 d.p. away from a rounding tie; the converse", () => {
    for (const ex of ofMode("hyp")) expect(P(ex, "up") ** 2 + P(ex, "out") ** 2).toBe(num(ex) ** 2);
    for (const ex of ofMode("leg")) {
      const up = P(ex, "up"), out = P(ex, "out"), c = P(ex, "c");
      expect(up * up + out * out).toBe(c * c);
      expect(num(ex)).toBe(P(ex, "ask") === 1 ? up : out);
    }
    for (const ex of ofMode("round")) {
      const exact = P(ex, "ask") === 0 ? hypOf(P(ex, "up"), P(ex, "out")) : Math.sqrt(P(ex, "c") ** 2 - P(ex, "out") ** 2);
      expect(num(ex), ex.id).toBe(round1(exact));
      expect(Number.isInteger(exact)).toBe(false);
      expect(Math.abs(((exact * 10) % 1) - 0.5)).toBeGreaterThan(0.05);
    }
    for (const ex of ofMode("conv")) {
      const r = P(ex, "s1") ** 2 + P(ex, "s2") ** 2 === P(ex, "s3") ** 2;
      expect(ex.answer.kind === "choice" && ex.answer.correct, ex.id).toBe(r ? "y" : "n");
      expect(P(ex, "s1") + P(ex, "s2")).toBeGreaterThan(P(ex, "s3")); // a real triangle
    }
    for (let i = 0; i < 300; i++) {
      const s = roundSpec(createRng(i));
      expect(s.value).toBe(round1(s.ask === 0 ? hypOf(s.up, s.out) : Math.sqrt(s.c ** 2 - s.out ** 2)));
    }
  });
  it("scale and ratio", () => {
    for (const ex of ofMode("real")) expect(num(ex)).toBe(P(ex, "cm") * P(ex, "k"));
    for (const ex of ofMode("map")) expect(num(ex) * P(ex, "k")).toBe(P(ex, "km"));
    for (const ex of [...ofMode("real"), ...ofMode("map")]) expect(P(ex, "cm") * 36, "the route fits the chart").toBeLessThanOrEqual(342);
    for (const ex of ofMode("share")) {
      const a = P(ex, "a"), b = P(ex, "b"), t = P(ex, "total");
      expect(Number.isInteger(num(ex))).toBe(true);
      expect(num(ex)).toBe((t / (a + b)) * (P(ex, "who") === 0 ? a : b));
    }
    for (const ex of ofMode("ratio")) {
      const a = ex.answer;
      if (a.kind !== "choice") throw new Error("choice");
      expect(a.options.find((o) => o.id === a.correct)!.text).toBe(`1 : ${(P(ex, "k") * 100000).toLocaleString("en-US").replace(/,/g, " ")}`);
    }
    for (const ex of ofMode("home").filter((e) => finaleOf(e) === "fchart")) {
      expect(P(ex, "east") ** 2 + P(ex, "north") ** 2).toBe(P(ex, "cmc") ** 2);
      expect(num(ex)).toBe(P(ex, "cmc") * P(ex, "k"));
    }
  });
  it("coordinates and straight lines", () => {
    for (const ex of ofMode("plot")) {
      const [x, y] = decodePoint(num(ex));
      expect([x, y]).toEqual([P(ex, "x"), P(ex, "y")]);
      const [lo, hi] = gridRange(P(ex, "q4") === 1);
      expect(x >= lo && x <= hi && y >= lo && y <= hi).toBe(true);
      expect(x).not.toBe(y); // so a swapped point is diagnosable
    }
    for (const ex of [...ofMode("grad"), ...ofMode("icpt"), ...ofMode("eqn")]) {
      const m = P(ex, "mm"), c = P(ex, "c");
      const [lo, hi] = gridRange(P(ex, "q4") === 1);
      for (const [x, y] of [[P(ex, "x1"), P(ex, "y1")], [P(ex, "x2"), P(ex, "y2")]] as const) {
        expect(y, ex.id).toBe(m * x + c);
        expect(x >= lo && x <= hi && y >= lo && y <= hi, ex.id).toBe(true);
      }
      if (modeOf(ex) === "grad") expect(num(ex)).toBe((P(ex, "y2") - P(ex, "y1")) / (P(ex, "x2") - P(ex, "x1")));
      if (modeOf(ex) === "icpt") expect(num(ex)).toBe(c);
    }
    for (const ex of [...ofMode("eqn"), ...ofMode("home").filter((e) => finaleOf(e) === "fcourse")]) {
      const a = ex.answer;
      if (a.kind !== "choice") throw new Error("choice");
      expect(a.options.find((o) => o.id === "ok")!.text).toBe(fmtLine(P(ex, "mm"), P(ex, "c")));
      expect(a.options.length).toBeGreaterThanOrEqual(3);
      if (modeOf(ex) === "home") {
        expect(P(ex, "y1")).toBe(P(ex, "mm") * P(ex, "x1") + P(ex, "c"));
        expect(P(ex, "y2")).toBe(P(ex, "mm") * P(ex, "x2") + P(ex, "c"));
      }
    }
    for (const ex of ofMode("meet")) {
      const x0 = P(ex, "x0"), y0 = P(ex, "y0");
      expect(P(ex, "m1") * x0 + P(ex, "c1")).toBe(y0);
      expect(P(ex, "m2") * x0 + P(ex, "c2")).toBe(y0);
      expect(P(ex, "m1")).not.toBe(P(ex, "m2"));
      const a = ex.answer;
      if (a.kind !== "choice") throw new Error("choice");
      // no wrong option is on both lines
      for (const o of a.options.filter((o) => o.id !== "ok")) {
        const [x, y] = o.text!.replace(/[()]/g, "").replace(/−/g, "-").split(",").map(Number) as [number, number];
        expect(P(ex, "m1") * x + P(ex, "c1") === y && P(ex, "m2") * x + P(ex, "c2") === y, ex.id).toBe(false);
      }
    }
    for (const ex of ofMode("para")) {
      const a = ex.answer;
      if (a.kind !== "choice") throw new Error("choice");
      const m = P(ex, "mm");
      const same = a.options.filter((o) => {
        const eq = o.text!.split(": ")[1]!;
        return eq === fmtLine(m, P(ex, "c2"));
      });
      expect(same.map((o) => o.id)).toEqual(["par"]);
      expect(P(ex, "c2")).not.toBe(P(ex, "c"));
    }
  });
  it("finales: two equal angles on a line; the exterior angle", () => {
    for (const ex of ofMode("home").filter((e) => finaleOf(e) === "fline")) expect(2 * num(ex) + P(ex, "p2")).toBe(180);
    for (const ex of ofMode("home").filter((e) => finaleOf(e) === "ftri")) {
      expect(P(ex, "A") + P(ex, "B") + num(ex)).toBe(180);
      expect(P(ex, "B")).toBe(180 - P(ex, "ext"));
      expect(num(ex)).toBeGreaterThan(0);
    }
  });
  it("choice options are distinct and exactly one is right", () => {
    for (const ex of ALL) {
      const a = ex.answer;
      if (a.kind !== "choice") continue;
      expect(new Set(a.options.map((o) => o.text)).size, ex.id).toBe(a.options.length);
      expect(a.options.filter((o) => o.id === a.correct)).toHaveLength(1);
    }
  });
});

describe("wording (content review)", () => {
  it("'which angle fact?' never shows the values (positions only)", () => {
    for (const ex of ofMode("reason")) {
      expect(ex.prompt!.text, ex.id).not.toMatch(/\d/);
      expect(ex.a11yDescription, ex.id).not.toMatch(/\d/);
    }
  });
  it("articles: an 8 m / an 11 m / an 18 m, a 12 m", () => {
    expect(article(8)).toBe("an");
    expect(article(11)).toBe("an");
    expect(article(18)).toBe("an");
    expect(article(12)).toBe("a");
    expect(article(1)).toBe("a");
    for (const ex of [...ofMode("leg"), ...ofMode("round")]) expect(ex.prompt!.text, ex.id).not.toMatch(/\bA (8|11|18)\b/);
  });
  it("1 d.p. answers that are whole numbers are written with .0 in the model", () => {
    for (const ex of ofMode("round")) {
      const v = num(ex);
      expect(modelSteps(ex).at(-1), ex.id).toContain(`${v.toFixed(1)} m`);
    }
  });
  it("US terms sit beside the UK ones: slope, y = mx + b, same-side interior, vertical angles", () => {
    const grad = ofMode("grad")[0]!, eqn = ofMode("eqn")[0]!, par = ofMode("par")[0]!, vert = ofMode("vert")[0]!;
    expect(methodFor(grad)).toMatch(/slope/);
    expect(methodFor(eqn)).toMatch(/y = mx \+ b/);
    expect(methodFor(par)).toMatch(/same-side interior/);
    expect(methodFor(vert)).toMatch(/vertical/);
    expect(lines[explainFor(grad)]!.text).toMatch(/slope/);
    expect(lines[explainFor(vert)]!.text).toMatch(/vertical angles/);
  });
});

describe("diagnosed first-miss hints", () => {
  const KEYPAD_MODES: Mode[] = ["line", "point", "vert", "tri", "par", "bread", "bback", "hyp", "leg", "round", "real", "map", "share", "plot", "grad", "icpt"];
  const mistakesOf = (ex: Exercise): { value: number; why: string }[] => {
    const m = modeOf(ex);
    const parts = [P(ex, "p0"), P(ex, "p1"), P(ex, "p2"), P(ex, "p3")].slice(0, P(ex, "n"));
    const phi = P(ex, "fl") ? 180 - P(ex, "th") : P(ex, "th");
    switch (m) {
      case "line": return lineMistakes(parts, P(ex, "u"));
      case "point": return pointMistakes(parts, P(ex, "u"));
      case "vert": return vertMistakes(P(ex, "a"), P(ex, "opp") === 1);
      case "tri": return triMistakes([P(ex, "A"), P(ex, "B"), P(ex, "C")], P(ex, "u"), P(ex, "iso") === 1, P(ex, "ig") === 0 ? "apex" : "base");
      case "par": return parMistakes((["corr", "alt", "coint"] as const)[P(ex, "rel")]!, valueAt(POSITIONS[P(ex, "gp")]!, phi));
      case "bread": return breadMistakes(P(ex, "ref"), P(ex, "side") === 1 ? 1 : -1, P(ex, "d"));
      case "bback": return backMistakes(P(ex, "b"));
      case "hyp": return hypMistakes(P(ex, "up"), P(ex, "out"), false);
      case "leg": return legMistakes(P(ex, "c"), P(ex, "ask") === 1 ? P(ex, "out") : P(ex, "up"), false);
      case "round": return P(ex, "ask") === 0 ? hypMistakes(P(ex, "up"), P(ex, "out"), true) : legMistakes(P(ex, "c"), P(ex, "out"), true);
      case "real": return realMistakes(P(ex, "cm"), P(ex, "k"));
      case "map": return mapMistakes(P(ex, "km"), P(ex, "k"));
      case "share": return shareMistakes(P(ex, "total"), P(ex, "a"), P(ex, "b"), P(ex, "who"));
      case "plot": return plotMistakes(P(ex, "x"), P(ex, "y"));
      case "grad": return gradMistakes(P(ex, "mm"), P(ex, "c"), P(ex, "x2") - P(ex, "x1"));
      case "icpt": return icptMistakes(P(ex, "mm"), P(ex, "c"));
      default: return [];
    }
  };
  it("every typical wrong answer is diagnosed with a line that exists, never equals the answer, and can be entered", () => {
    for (const ex of ALL.filter((e) => KEYPAD_MODES.includes(modeOf(e)))) {
      const ms = mistakesOf(ex);
      expect(ms.length, ex.id).toBeGreaterThan(0);
      for (const mk of ms) {
        expect(mk.value, ex.id).not.toBe(num(ex));
        const v = mk.value;
        const st = exerciseReducer(initExercise(ex), { type: "SUBMIT", value: v });
        expect(st.feedback?.correct, `${ex.id} ${v}`).toBe(false);
        const line = hintFor({ exercise: ex, lastAnswer: v });
        expect(line.startsWith("ln.hint."), `${ex.id} ${mk.why} ${v} → ${line}`).toBe(true);
        expect(lines[line], line).toBeDefined();
        // typable: the board's keypad (or dial / buoy) can produce it
        const m = modeOf(ex);
        if (m === "bback") expect(v % 5 === 0 && v >= 0 && v < 360, `${ex.id} dial ${v}`).toBe(true);
        else if (m === "plot") {
          const [x, y] = decodePoint(v);
          const [lo, hi] = gridRange(P(ex, "q4") === 1);
          if (x >= lo && x <= hi && y >= lo && y <= hi) expect(encodePoint(x, y)).toBe(v);
        } else {
          const angle = GAME_OF[m] === "beam";
          const digits = String(Math.abs(v)).replace(".", "").length;
          if (angle) expect(Number.isInteger(v) && v >= 0 && digits <= 3, `${ex.id} ${mk.why} ${v}`).toBe(true);
          else {
            expect(round1(v * 100) / 100, `${ex.id} ${v} two decimals`).toBe(v);
            expect(digits, `${ex.id} ${mk.why} ${v}`).toBeLessThanOrEqual(m === "grad" || m === "icpt" ? 3 : 4);
            if (!(m === "grad" || m === "icpt")) expect(v, `${ex.id} ${mk.why}`).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });
  it("every wrong option of a choice item gets a line that exists", () => {
    for (const ex of ALL) {
      const a = ex.answer;
      if (a.kind !== "choice") continue;
      for (const o of a.options.filter((o) => o.id !== a.correct)) {
        const line = hintFor({ exercise: ex, lastAnswer: o.id });
        expect(lines[line], `${ex.id} ${o.id} → ${line}`).toBeDefined();
      }
    }
  });
  it("named misconceptions get their own hint (spot checks)", () => {
    const find = (mode: Mode) => ALL.find((e) => modeOf(e) === mode)!;
    const line = find("line");
    const known = [P(line, "p0"), P(line, "p1"), P(line, "p2")].slice(0, P(line, "n")).filter((_, i) => i !== P(line, "u"));
    expect(hintFor({ exercise: line, lastAnswer: 360 - known.reduce((s, x) => s + x, 0) })).toBe("ln.hint.ang.line360");
    const hyp = find("hyp");
    expect(hintFor({ exercise: hyp, lastAnswer: P(hyp, "up") + P(hyp, "out") })).toBe("ln.hint.pyth.added");
    expect(hintFor({ exercise: hyp, lastAnswer: P(hyp, "up") ** 2 + P(hyp, "out") ** 2 })).toBe("ln.hint.pyth.noRoot");
    const bb = find("bback");
    expect(hintFor({ exercise: bb, lastAnswer: P(bb, "b") })).toBe("ln.hint.bear.same");
    const plot = find("plot");
    expect(hintFor({ exercise: plot, lastAnswer: encodePoint(P(plot, "y"), P(plot, "x")) })).toBe("ln.hint.grid.swap");
    const share = find("share");
    expect(hintFor({ exercise: share, lastAnswer: P(share, "total") / (P(share, "a") + P(share, "b")) })).toBe("ln.hint.share.onePart");
    const real = find("real");
    expect(hintFor({ exercise: real, lastAnswer: P(real, "cm") })).toBe("ln.hint.scale.noScale");
    const leg = ALL.find((e) => modeOf(e) === "leg" && P(e, "ask") === 1)!;
    expect(hintFor({ exercise: leg, lastAnswer: round1(Math.hypot(P(leg, "c"), P(leg, "out"))) })).toBe("ln.hint.pyth.usedHyp");
    // an answer that isn't a typical mistake falls back to the method explanation
    expect(hintFor({ exercise: hyp, lastAnswer: 999 })).toBe("ln.help.hyp");
    expect(diagnose(hyp, null)).toBeNull();
  });
});

describe("explanations, praise and worked models", () => {
  it("every item explains, praises, shows a fact card and models with lines that exist", () => {
    for (const ex of [...ALL, lnTutorial]) {
      expect(lines[explainFor(ex)], `${ex.id} ${explainFor(ex)}`).toBeDefined();
      for (const l of praiseFor(ex)) expect(lines[l], l).toBeDefined();
      expect(methodFor(ex).length).toBeGreaterThan(10);
      const steps = modelSteps(ex);
      expect(steps.length, ex.id).toBeGreaterThanOrEqual(2);
      expect(steps.length).toBeLessThanOrEqual(4);
    }
  });
  it("the worked model ends at the answer (number answers name it; bearings in three figures)", () => {
    for (const ex of ALL) {
      const a = ex.answer;
      const last = modelSteps(ex).at(-1)!;
      const dial = modeOf(ex) === "bback" || (modeOf(ex) === "home" && finaleOf(ex) === "fback");
      if ((a.kind === "number" || a.kind === "numeric") && !dial && modeOf(ex) !== "plot") expect(last, ex.id).toContain(fmtNum(a.value));
      if (dial && a.kind === "numeric") expect(last, ex.id).toContain(String(a.value).padStart(3, "0"));
    }
  });
  it("objectives (grown-up text) never carry the item's answer", () => {
    for (const mode of ["line", "point", "vert", "tri", "par", "bread", "bback", "hyp", "leg", "round", "real", "map", "share", "plot", "grad", "icpt"] as Mode[]) {
      const objs = new Set(ofMode(mode).map((e) => e.objective));
      expect(objs.size, mode).toBeLessThanOrEqual(2);
      for (const o of objs) expect(/\d{2}/.test(o.replace(/180|360|1 d\.p\.|1 : n/g, "")), `${mode}: ${o}`).toBe(false);
    }
  });
});

describe("story, voice and labelling", () => {
  it("4 intro beats, 3 outro beats, between lines at 2, 4, 6 — all voiced", () => {
    expect(lnIntro.length).toBeGreaterThanOrEqual(3);
    expect(lnIntro.length).toBeLessThanOrEqual(5);
    expect(lnOutro).toHaveLength(3);
    expect(Object.keys(lnBetween)).toEqual(["2", "4", "6"]);
    for (const b of [...lnIntro, ...lnOutro, ...Object.values(lnBetween)]) expect(lines[b.line], b.line).toBeDefined();
    expect(lines["ln.story.outro2"]!.text).toMatch(/every ship is safe in harbour/i);
  });
  it("every prompt line exists; lines are prefixed ln., short, never praise ability; speakers are in the cast", () => {
    for (const ex of [...ALL, lnTutorial]) expect(lines[ex.prompt!.line], ex.prompt!.line).toBeDefined();
    const speakers = Object.keys((cast as { speakers: Record<string, unknown> }).speakers);
    for (const [id, l] of Object.entries(lines)) {
      expect(id.startsWith("ln."), id).toBe(true);
      expect(l.text.split(/\s+/).length, id).toBeLessThanOrEqual(24);
      expect(/\b(smart|genius|clever|brilliant|fast|quick)\b/i.test(l.text), id).toBe(false);
      if (l.speaker) expect(speakers, id).toContain(l.speaker);
      expect(l.vary, `${id}: no pre-rendered variants needed`).toBeUndefined();
    }
  });
  it("the chart is labelled fictional and not for navigation wherever it appears", () => {
    for (const ex of [...ofMode("real"), ...ofMode("map"), ...ofMode("ratio"), ...ofMode("home").filter((e) => finaleOf(e) === "fchart")]) expect(ex.a11yDescription, ex.id).toMatch(/fictional/i);
    for (const ex of [...ofMode("real"), ...ofMode("map")]) expect(ex.a11yDescription).toMatch(/not for navigation/);
  });
});
