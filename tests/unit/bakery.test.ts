import { describe, expect, it } from "vitest";
import { buildRound, generateBand } from "../../src/engine/round";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import { lintExercise, validateAnswer } from "../../src/engine/validation";
import { createRng } from "../../src/engine/rng";
import { selectNextExercise } from "../../src/engine/progression";
import { checkRegistry, getSkill, getWorld } from "../../src/content";
import { bakery, bkTutorial } from "../../src/games/bakery/definition";
import { BAND, BK_MAX_LEVEL, KIND_SKILL, LEVELS, bandSlots, bkExercise as build, generateBakery } from "../../src/games/bakery/generator";
import { EXPLAIN, HINT_WHYS, explainFor, hintFor, modelSteps, praiseFor } from "../../src/games/bakery/hints";
import {
  KINDS, type Kind, type Scenario, answerFor, barSlots, blank, buildCode, compareId, decode, diagnose, encode, lineValue, lshapeArea,
  lshapeParts, mistakes, orderTotal, perimeter, splitFor, storyText, typeDigit,
} from "../../src/games/bakery/logic";
import { bkBetween, bkIntro, bkOutro } from "../../src/games/bakery/story";
import voice from "../../src/games/bakery/voice.json";

const lines = voice.lines as Record<string, { text: string; speaker?: string; vary?: Record<string, (string | number)[]> }>;
const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 11);
const ALL = (() => {
  const out = [];
  for (const seed of SEEDS) for (let level = 0; level <= BK_MAX_LEVEL; level++) out.push(...generateBand(bakery, level, seed, BAND));
  return out;
})();
const mk = (s: Scenario) => build(s, { id: `bk-test-${s.kind}`, seed: 1 });
const sc = (kind: Kind, f: Partial<Scenario>): Scenario => ({ ...blank(kind, 0), ...f });

describe("Bobbo's Bakery maths", () => {
  it("answers for every kind", () => {
    expect(answerFor(sc("count", { a: 3, b: 5 }))).toBe(15);
    expect(answerFor(sc("build", { a: 3, b: 5 }))).toBe(305);
    expect(answerFor(sc("fact", { a: 7, b: 8 }))).toBe(56);
    expect(answerFor(sc("missing", { a: 6, b: 7 }))).toBe(7);
    expect(answerFor(sc("area", { a: 4, b: 6 }))).toBe(24);
    expect(answerFor(sc("perim", { a: 4, b: 6 }))).toBe(20);
    expect(answerFor(sc("make", { a: 4, b: 6 }))).toBe(6);
    expect(answerFor(sc("lshape", { a: 7, b: 5, c: 3, d: 2 }))).toBe(29);
    expect(answerFor(sc("of", { a: 3, b: 4, c: 24 }))).toBe(18);
    expect(answerFor(sc("equiv", { a: 2, b: 3, c: 6 }))).toBe(4);
    expect(answerFor(sc("equiv", { a: 6, b: 8, c: 4, v: 1 }))).toBe(3);
    expect(answerFor(sc("cmp", { a: 3, b: 8, c: 3, d: 5 }))).toBe("r");
    expect(answerFor(sc("cmp", { a: 2, b: 4, c: 1, d: 2 }))).toBe("same");
    expect(answerFor(sc("pw", { a: 48, b: 15, c: 19 }))).toBe(14);
    expect(answerFor(sc("cmpb", { a: 27, b: 15, v: 0 }))).toBe(69);
    expect(answerFor(sc("cmpb", { a: 52, b: 18, v: 1 }))).toBe(86);
    expect(answerFor(sc("mulb", { a: 6, b: 4, c: 5 }))).toBe(29);
    expect(answerFor(sc("timesb", { a: 8, b: 3, v: 0 }))).toBe(32);
    expect(answerFor(sc("timesb", { a: 8, b: 3, v: 1 }))).toBe(16);
    expect(answerFor(sc("fracb", { a: 1, b: 4, c: 36 }))).toBe(27);
    const order = sc("order", { lines: [{ k: 1, a: 3, b: 4, c: 0 }, { k: 4, a: 3, b: 4, c: 16 }, { k: 5, a: 2, b: 6, c: 3 }] });
    expect(answerFor(order)).toBe(12 + 12 + 15);
  });
  it("L-shape area = the two rectangles = the box minus the notch", () => {
    for (const [a, b, c, d] of [[7, 5, 3, 2], [12, 10, 2, 8], [5, 4, 2, 2]] as const) {
      const [[w1, h1], [w2, h2]] = lshapeParts({ a, b, c, d });
      expect(w1 * h1 + w2 * h2).toBe(lshapeArea({ a, b, c, d }));
    }
  });
  it("splits facts into friendly parts for the hint", () => {
    expect(splitFor(8)).toEqual([5, 3]);
    expect(splitFor(12)).toEqual([10, 2]);
    expect(splitFor(4)).toEqual([4, 0]);
    expect(splitFor(10)).toEqual([10, 0]);
  });
  it("compares fractions by cross-multiplying", () => {
    expect(compareId(3, 4, 2, 3)).toBe("l");
    expect(compareId(1, 3, 2, 6)).toBe("same");
    expect(compareId(2, 7, 2, 5)).toBe("r");
  });
  it("keypads accept up to four digits and drop leading zeros", () => {
    expect(typeDigit("", "0")).toBe("0");
    expect(typeDigit("0", "5")).toBe("5");
    expect(typeDigit("252", "1")).toBe("2521");
    expect(typeDigit("2521", "1")).toBe("2521");
    expect(typeDigit("12", "x")).toBe("12");
  });
  it("encodes and decodes every field", () => {
    const s = sc("order", { lv: 6, a: 3, lines: [{ k: 2, a: 4, b: 5, c: 0 }, { k: 4, a: 1, b: 3, c: 12 }], tut: true });
    expect(decode({ params: encode(s) })).toEqual(s);
  });
});

describe("diagnosis of typical wrong answers", () => {
  const cases: [Kind, Partial<Scenario>, number, string][] = [
    ["count", { a: 4, b: 5 }, 9, "added"],
    ["count", { a: 4, b: 5 }, 5, "oneRow"],
    ["count", { a: 4, b: 5 }, 25, "rowOff"],
    ["build", { a: 3, b: 5 }, 503, "swap"],
    ["build", { a: 3, b: 4 }, 206, "sameTotal"],
    ["build", { a: 3, b: 4 }, 204, "rowsOff"],
    ["build", { a: 3, b: 4 }, 305, "colsOff"],
    ["fact", { a: 7, b: 8 }, 15, "added"],
    ["fact", { a: 7, b: 8 }, 63, "neighbour"],
    ["missing", { a: 6, b: 7 }, 36, "subtracted"],
    ["missing", { a: 6, b: 7 }, 252, "multiplied"],
    ["missing", { a: 6, b: 7 }, 48, "addedDiv"],
    ["missing", { a: 6, b: 7 }, 8, "offByOne"],
    ["area", { a: 4, b: 6 }, 20, "perimeter"],
    ["area", { a: 4, b: 6 }, 10, "addedSides"],
    ["area", { a: 5, b: 7 }, 20, "edgeTiles"],
    ["perim", { a: 4, b: 6 }, 24, "area"],
    ["perim", { a: 4, b: 6 }, 10, "half"],
    ["perim", { a: 4, b: 6 }, 16, "edgeSquares"],
    ["perim", { a: 4, b: 6 }, 14, "threeSides"],
    ["make", { a: 4, b: 6 }, 8, "perimeter"],
    ["make", { a: 4, b: 6 }, 20, "subtracted"],
    ["lshape", { a: 7, b: 5, c: 3, d: 2 }, 35, "box"],
    ["lshape", { a: 7, b: 5, c: 3, d: 2 }, 20, "onePart"],
    ["lshape", { a: 7, b: 5, c: 3, d: 2 }, 24, "perimeter"],
    ["of", { a: 3, b: 4, c: 24 }, 6, "onePart"],
    ["of", { a: 3, b: 4, c: 24 }, 8, "byNum"],
    ["of", { a: 3, b: 4, c: 24 }, 72, "noDivide"],
    ["equiv", { a: 2, b: 3, c: 6 }, 2, "sameTop"],
    ["equiv", { a: 2, b: 3, c: 6 }, 5, "addSame"],
    ["pw", { a: 48, b: 15, c: 19 }, 33, "oneStep"],
    ["pw", { a: 48, b: 15, c: 19 }, 34, "sold"],
    ["pw", { a: 48, b: 15, c: 19 }, 82, "addAll"],
    ["cmpb", { a: 27, b: 15, v: 0 }, 42, "oneStep"],
    ["cmpb", { a: 27, b: 15, v: 0 }, 54, "forgotMore"],
    ["cmpb", { a: 52, b: 18, v: 1 }, 34, "oneStepPuff"],
    ["cmpb", { a: 52, b: 18, v: 1 }, 122, "whoHasMore"],
    ["mulb", { a: 6, b: 4, c: 5 }, 15, "addedGroups"],
    ["mulb", { a: 6, b: 4, c: 5 }, 24, "forgotExtra"],
    ["mulb", { a: 6, b: 4, c: 5 }, 44, "extraEach"],
    ["timesb", { a: 8, b: 3, v: 0 }, 24, "oneStepTimes"],
    ["timesb", { a: 8, b: 3, v: 0 }, 11, "addedTimes"],
    ["timesb", { a: 8, b: 3, v: 1 }, 24, "bobboOnly"],
    ["timesb", { a: 8, b: 3, v: 1 }, 32, "total"],
    ["fracb", { a: 1, b: 4, c: 36 }, 9, "part"],
    ["fracb", { a: 1, b: 4, c: 36 }, 32, "subNum"],
  ];
  for (const [kind, f, value, why] of cases) {
    it(`${kind} ${JSON.stringify(f)}: ${value} → ${why}`, () => {
      const s = sc(kind, f);
      expect(diagnose(s, value)).toBe(why);
      const ex = { ...mk(s), difficulty: 1 };
      expect(hintFor({ exercise: ex, lastAnswer: value })).toBe(`bk.hint.${why}`);
    });
  }
  it("order sheet: one line done the wrong way, or left out", () => {
    const s = sc("order", { lines: [{ k: 1, a: 3, b: 4, c: 0 }, { k: 4, a: 3, b: 4, c: 16 }, { k: 5, a: 2, b: 6, c: 3 }] });
    expect(diagnose(s, 7 + 12 + 15)).toBe("lineTray");
    expect(diagnose(s, 12 + 4 + 15)).toBe("lineFrac");
    expect(diagnose(s, 12 + 12 + 12)).toBe("lineExtra");
    expect(diagnose(s, 12 + 12)).toBe("missedLine");
  });
  it("compare: picking the bigger bottom number, fewer slices, or 'same'", () => {
    const ex = (f: Partial<Scenario>) => ({ ...mk(sc("cmp", f)), difficulty: 1 });
    expect(hintFor({ exercise: ex({ a: 3, b: 8, c: 3, d: 5 }), lastAnswer: "l" })).toBe("bk.hint.cmp.bigDen");
    expect(hintFor({ exercise: ex({ a: 2, b: 7, c: 5, d: 7 }), lastAnswer: "l" })).toBe("bk.hint.cmp.smallNum");
    expect(hintFor({ exercise: ex({ a: 2, b: 7, c: 5, d: 7 }), lastAnswer: "same" })).toBe("bk.hint.cmp.notSame");
    expect(hintFor({ exercise: ex({ a: 1, b: 2, c: 2, d: 4 }), lastAnswer: "l" })).toBe("bk.hint.cmp.isSame");
    expect(hintFor({ exercise: ex({ a: 1, b: 3, c: 4, d: 5 }), lastAnswer: "l" })).toBe("bk.hint.cmp.half");
  });
  it("an unrecognised miss falls back to the inner game's method line", () => {
    const ex = { ...mk(sc("fact", { a: 7, b: 8 })), difficulty: 1 };
    expect(hintFor({ exercise: ex, lastAnswer: 99 })).toBe("bk.help.fact");
  });
  it("no mistake value ever equals the right answer", () => {
    for (const ex of ALL) {
      const s = decode(ex);
      for (const m of mistakes(s)) expect(m.value, ex.id).not.toBe(answerFor(s));
    }
  });
});


describe("generator", () => {
  it("is deterministic: same level and seed → same round", () => {
    for (let level = 0; level <= BK_MAX_LEVEL; level++) {
      expect(buildRound(bakery, { level, seed: 77 })).toEqual(buildRound(bakery, { level, seed: 77 }));
      expect(generateBakery(level, createRng(5), 3)).toEqual(generateBakery(level, createRng(5), 3));
    }
  });
  it("every level × 50 seeds passes lintExercise, uses a declared skill, and has unique ids", () => {
    const ids = new Set<string>();
    for (const seed of SEEDS) {
      for (let level = 0; level <= BK_MAX_LEVEL; level++) {
        const band = generateBand(bakery, level, seed, BAND);
        for (const ex of band) {
          expect(lintExercise(ex), ex.id).toEqual([]);
          expect(getSkill(ex.skillId), ex.skillId).toBeTruthy();
          expect(bakery.skillIds).toContain(ex.skillId);
        }
        const bandIds = band.map((e) => e.id);
        expect(new Set(bandIds).size).toBe(bandIds.length);
        for (const id of bandIds) ids.add(`${seed}:${id}`);
      }
    }
    expect(lintExercise(bkTutorial)).toEqual([]);
  });
  it("content stays correct and in range at every level", () => {
    for (const ex of ALL) {
      const s = decode(ex);
      const ans = answerFor(s);
      expect(validateAnswer(ex.answer, ans as never).correct, ex.id).toBe(true);
      if (typeof ans === "number") {
        expect(Number.isInteger(ans) && ans >= 0, ex.id).toBe(true);
        expect(String(ans).length, ex.id).toBeLessThanOrEqual(4);
      }
      switch (s.kind) {
        case "count": case "build": expect(s.a).not.toBe(s.b); expect(s.a).toBeLessThanOrEqual(6); expect(s.b).toBeLessThanOrEqual(10); break;
        case "fact": expect(Math.max(s.a, s.b)).toBeLessThanOrEqual(12); expect(Math.min(s.a, s.b)).toBeGreaterThanOrEqual(2); break;
        case "missing": expect(s.a).toBeLessThanOrEqual(12); expect(s.b).toBeLessThanOrEqual(12); break;
        case "area": case "perim": case "make":
          expect(s.a * s.b, ex.id).not.toBe(perimeter(s.a, s.b)); // area never equals perimeter (keeps the diagnosis clean)
          expect(s.b).toBeLessThanOrEqual(12);
          break;
        case "lshape": expect(s.c).toBeGreaterThanOrEqual(2); expect(s.d).toBeGreaterThanOrEqual(2); expect(s.a - s.c).toBeGreaterThanOrEqual(2); expect(s.b - s.d).toBeGreaterThanOrEqual(2); break;
        case "of": expect(s.c % s.b).toBe(0); expect(s.a).toBeLessThan(s.b); break;
        case "equiv": expect((s.a * s.c) % s.b).toBe(0); expect(s.c).toBeLessThanOrEqual(12); expect(s.b).toBeLessThanOrEqual(12); expect(s.a).toBeLessThan(s.b); break;
        case "cmp": expect(s.a).toBeLessThan(s.b); expect(s.c).toBeLessThan(s.d); break;
        case "pw": expect(s.a - s.b - s.c).toBeGreaterThanOrEqual(5); break;
        case "cmpb": if (s.v === 1) expect(s.a - s.b).toBeGreaterThanOrEqual(8); break;
        case "mulb": expect(s.c).toBeLessThan(s.a); break;
        case "fracb": expect(s.c % s.b).toBe(0); break;
        case "order": expect(s.lines.length).toBeGreaterThanOrEqual(2); for (const l of s.lines) expect(Number.isInteger(lineValue(l))).toBe(true); expect(orderTotal(s.lines)).toBeLessThan(200); break;
      }
      // objective strings never contain the answer; bar models always have their tags
      if (typeof ans === "number" && ans >= 10) expect(ex.objective).not.toContain(String(ans));
      if (["pw", "cmpb", "mulb", "timesb", "fracb"].includes(s.kind)) {
        expect(barSlots(s).length).toBeGreaterThanOrEqual(2);
        expect(storyText(s).length).toBeGreaterThan(20);
      }
      expect(modelSteps(ex).length, ex.id).toBeGreaterThanOrEqual(2);
    }
  });
  it("level spec: the order sheet closes every band, ≤ 3 of a kind, ≤ 3 new ideas per level, 4–5 inner games overall", () => {
    for (const [lv, spec] of LEVELS.entries()) {
      expect(spec.slots).toHaveLength(BAND);
      expect(spec.slots[7]).toBe("order");
      expect(spec.slots.slice(0, 7)).not.toContain("order");
      expect(spec.fresh.length).toBeLessThanOrEqual(3);
      const counts = new Map<Kind, number>();
      for (const k of spec.slots) counts.set(k, (counts.get(k) ?? 0) + 1);
      for (const [k, n] of counts) expect(n, `${lv} ${k}`).toBeLessThanOrEqual(3);
      expect(new Set(spec.slots).size).toBeGreaterThanOrEqual(lv === 0 ? 4 : 5);
      for (const f of spec.fresh) expect(spec.slots).toContain(f);
      const b = bandSlots(lv, { seed: 12345 });
      expect(b[0]).toBe(spec.slots[0]);
      expect(b[7]).toBe("order");
      expect([...b].sort()).toEqual([...spec.slots].sort());
    }
    // every kind appears somewhere and level 0 uses one inner game (+ the order sheet)
    const used = new Set(LEVELS.flatMap((l) => l.slots));
    for (const k of KINDS) expect(used.has(k), k).toBe(true);
    expect(new Set(LEVELS[0]!.slots.slice(0, 7).map((k) => KIND_SKILL[k] && k))).toEqual(new Set(["count", "build", "fact"]));
  });
  it("the round ends with the order sheet (R5a closer)", () => {
    for (const seed of SEEDS.slice(0, 10)) {
      const round = buildRound(bakery, { level: 3, seed });
      const results = round.exercises.filter((e) => e.difficulty === 4 && !e.closer).slice(0, 7)
        .map((e) => ({ exerciseId: e.id, skillId: e.skillId, difficulty: e.difficulty, attempts: 2, firstTry: false, hintsShown: 1 }));
      const next = selectNextExercise(round, { difficulty: 4, streak: 0, played: results.map((r) => r.exerciseId), results }, bakery.progression);
      expect(next?.closer).toBe(true);
    }
  });
});

describe("engine flow", () => {
  it("first miss → helper diagnosis, second miss → model; the model value is correct", () => {
    const ex = { ...build(sc("area", { a: 4, b: 6 }), { id: "bk-area-t", seed: 1 }), difficulty: 2 };
    let st = initExercise(ex);
    st = exerciseReducer(st, { type: "SUBMIT", value: 20 });
    expect(st.feedback?.correct).toBe(false);
    expect(hintFor(st)).toBe("bk.hint.perimeter");
    st = exerciseReducer(st, { type: "FEEDBACK_DONE" });
    st = exerciseReducer(st, { type: "SUBMIT", value: 10 });
    st = exerciseReducer(st, { type: "FEEDBACK_DONE" });
    expect(st.hintStage).toBe(2);
    expect(st.model).toBe(24);
  });
  it("build answers are submitted as rows × 100 + columns", () => {
    expect(buildCode(3, 5)).toBe(305);
    const st = exerciseReducer(initExercise(bkTutorial), { type: "SUBMIT", value: buildCode(2, 3) });
    expect(st.feedback?.correct).toBe(true);
  });
});

describe("helper, praise, story and voice", () => {
  it("every line the world can speak exists in voice.json, is short and captioned", () => {
    const used = new Set<string>(["bk.ready", "bk.back", "bk.retry", "bk.model", "bk.idle", "bk.labels"]);
    for (const k of KINDS) used.add(EXPLAIN[k]);
    for (const w of HINT_WHYS) used.add(`bk.hint.${w}`);
    for (const id of ["isSame", "notSame", "bigDen", "smallNum", "half"]) used.add(`bk.hint.cmp.${id}`);
    for (const ex of ALL) {
      used.add(explainFor(ex));
      for (const p of praiseFor(ex)) used.add(p);
      if (ex.prompt) used.add(ex.prompt.line);
      const s = decode(ex);
      for (const m of mistakes(s)) used.add(`bk.hint.${m.why}`);
    }
    if (bkTutorial.prompt) used.add(bkTutorial.prompt.line);
    for (const b of [...bkIntro, ...bkOutro]) used.add(b.line);
    for (const b of Object.values(bkBetween)) used.add(b.line);
    for (const id of used) {
      expect(lines[id], id).toBeTruthy();
      expect(lines[id]!.text.split(/\s+/).length, id).toBeLessThanOrEqual(22);
      expect(lines[id]!.vary, id).toBeUndefined();
    }
    for (const id of Object.keys(lines)) expect(id.startsWith("bk."), id).toBe(true);
  });
  it("praise is about process, never ability or speed", () => {
    for (const [id, l] of Object.entries(lines)) {
      if (!id.startsWith("bk.praise")) continue;
      expect(l.text.toLowerCase()).not.toMatch(/smart|genius|clever|brilliant|fast|quick|natural/);
    }
  });
  it("story: 4 intro beats, 3 outro beats, between lines at 2, 4, 6", () => {
    expect(bkIntro).toHaveLength(4);
    expect(bkOutro).toHaveLength(3);
    expect(Object.keys(bkBetween)).toEqual(["2", "4", "6"]);
  });
});

describe("registry", () => {
  it("the world is registered with its skills and passes the registry checks", () => {
    expect(checkRegistry()).toEqual([]);
    const w = getWorld("bakery")!;
    expect(w.ages).toEqual([9, 11]);
    expect(w.maxLevel).toBe(BK_MAX_LEVEL);
    expect([...w.skills].sort()).toEqual([...bakery.skillIds].sort());
    expect(w.characters[0]).toBe("bobbo");
  });
});
