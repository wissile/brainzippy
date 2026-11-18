import { describe, expect, it } from "vitest";
import { buildRound, generateBand } from "../../src/engine/round";
import { createRng } from "../../src/engine/rng";
import { validateAnswer, lintExercise } from "../../src/engine/validation";
import type { Exercise } from "../../src/engine/types";
import { sleepyTrail } from "../../src/games/sleepy-trail/definition";
import { fracCmp, fracEq, fracWords, postOf, reduce } from "../../src/games/sleepy-trail/fractions";
import { FINE, LEVELS, MAX_LEVEL, SLOTS, allItems, generateSleepyTrail, itemOf, kindOf, nameDistractors, toleranceFor } from "../../src/games/sleepy-trail/generator";
import { diagnose, diagnosePost, explainFor, layoutTrail, pointAt, praiseFor } from "../../src/games/sleepy-trail/logic";
import voice from "../../src/games/sleepy-trail/voice.json";

const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 3);
const band = (level: number, seed: number) => generateBand(sleepyTrail, level, seed, SLOTS);
const lines = voice.lines as Record<string, { text: string; vary?: { kind?: string[] } }>;
const objects = voice.objects as Record<string, { one: string; many: string }>;

describe("sleepy-trail fractions (integer pairs, no floats)", () => {
  it("compares by cross-multiplication and finds posts", () => {
    expect(fracEq({ a: 1, d: 2 }, { a: 4, d: 8 })).toBe(true);
    expect(fracEq({ a: 2, d: 3 }, { a: 3, d: 4 })).toBe(false);
    expect(fracCmp({ a: 3, d: 8 }, { a: 3, d: 6 })).toBe(-1);
    expect(reduce({ a: 6, d: 8 })).toEqual({ a: 3, d: 4 });
    expect(postOf({ a: 3, d: 4 }, 8)).toBe(6);
    expect(postOf({ a: 1, d: 3 }, 4)).toBeNull();
    expect(fracWords({ a: 3, d: 4 })).toBe("three fourths");
    expect(fracWords({ a: 1, d: 2 })).toBe("one half");
    expect(fracWords({ a: 5, d: 2 })).toBe("five halves");
  });
});

describe("sleepy-trail generator", () => {
  it("has 9 generator levels (spec L1–L9) and the world's maxLevel", () => {
    expect(LEVELS.length).toBe(9);
    expect(sleepyTrail.progression.maxLevel).toBe(MAX_LEVEL);
    expect(sleepyTrail.exercises.filter((e) => e.tutorial)).toHaveLength(1);
  });

  it("every level × 50 seeds: lints, declared skill, correct maths for its mode", () => {
    const problems: string[] = [];
    for (const seed of SEEDS)
      for (let level = 0; level <= MAX_LEVEL; level++)
        for (const ex of band(level, seed)) {
          problems.push(...lintExercise(ex));
          if (!sleepyTrail.skillIds.includes(ex.skillId)) problems.push(`${ex.id}: skill`);
          if (ex.skillId !== LEVELS[level]!.skill) problems.push(`${ex.id}: level skill`);
          const it = itemOf(ex);
          if (it.a * 1 > it.M * it.d) problems.push(`${ex.id}: a/d > M`);
          const a = ex.answer;
          if (it.mode === "place") {
            if (a.kind !== "number") problems.push(`${ex.id}: kind`);
            else if (a.value * it.d !== it.a * it.P || a.choices!.length !== it.M * it.P + 1) problems.push(`${ex.id}: post maths`);
          } else if (it.mode === "name") {
            if (a.kind !== "choice" || a.options.length !== 3) problems.push(`${ex.id}: 3 cards`);
            else {
              const vals = a.options.map((o) => o.id.slice(1).split("-").map(Number) as [number, number]);
              for (const [x, y] of vals) if (`f${x}-${y}` !== a.correct && fracEq({ a: x, d: y }, it)) problems.push(`${ex.id}: distractor equals target`);
            }
          } else if (it.mode === "compare") {
            if (a.kind !== "match") problems.push(`${ex.id}: kind`);
            else {
              const b = { a: it.a2!, d: it.d2! };
              if (!(it.a === b.a || it.d === b.d) || fracEq(it, b)) problems.push(`${ex.id}: pair`);
              if (a.pairs.farther !== (fracCmp(it, b) > 0 ? "rumble" : "bobbo")) problems.push(`${ex.id}: farther`);
            }
          } else {
            if (a.kind !== "numeric") problems.push(`${ex.id}: kind`);
            else if (Math.abs(a.value - it.a / it.d) > 1e-12 || a.tolerance !== toleranceFor(it.d) || ((it.a * FINE) % it.d) !== 0) problems.push(`${ex.id}: estimate`);
            if (it.a % it.d === 0) problems.push(`${ex.id}: estimate of a whole number`);
          }
        }
    expect(problems).toEqual([]);
  });

  it("same (level, seed) → same round; the generator is pure", () => {
    for (let level = 0; level <= MAX_LEVEL; level++) {
      expect(buildRound(sleepyTrail, { level, seed: 9 })).toEqual(buildRound(sleepyTrail, { level, seed: 9 }));
      for (let i = 0; i < SLOTS; i++) expect(generateSleepyTrail(level, createRng(5), i)).toEqual(generateSleepyTrail(level, createRng(5), i));
    }
  });

  it("no repeated item in a band (level 0 has only six unit fractions: its first six slots are distinct)", () => {
    for (const seed of SEEDS)
      for (let level = 0; level <= MAX_LEVEL; level++) {
        const keys = band(level, seed).map((e) => JSON.stringify(e.params));
        const span = level === 0 ? 6 : SLOTS;
        expect(new Set(keys.slice(0, span)).size, `level ${level} seed ${seed}`).toBe(span);
      }
  });

  it("neighbouring items never share a trail split; ≤ 2 in a row with the same denominator", () => {
    for (const seed of SEEDS)
      for (let level = 0; level <= MAX_LEVEL; level++) {
        const ds = band(level, seed).map((e) => itemOf(e).P);
        for (let i = 2; i < ds.length; i++) expect(ds[i] === ds[i - 1] && ds[i] === ds[i - 2], `level ${level}`).toBe(false);
        for (let i = 1; i < ds.length; i++) expect(ds[i], `level ${level}`).not.toBe(ds[i - 1]);
      }
  });

  it("level rules: L3 ≤ 1 whole and ≤ 1 zero; L5 goes past one; L6 partition ≠ target denominator", () => {
    for (const seed of SEEDS) {
      const l3 = band(2, seed).map(itemOf);
      expect(l3.filter((x) => x.a === x.d).length).toBeLessThanOrEqual(1);
      expect(l3.filter((x) => x.a === 0).length).toBeLessThanOrEqual(1);
      const l5 = band(4, seed).map(itemOf);
      expect(l5.every((x) => x.M === 2)).toBe(true);
      expect(l5.filter((x) => x.a > x.d).length).toBeGreaterThanOrEqual(2);
      for (const x of band(5, seed).map(itemOf)) expect(x.P).not.toBe(x.d);
      expect(band(6, seed).map(itemOf).every((x) => x.mode === "compare")).toBe(true);
      expect(band(7, seed).concat(band(8, seed)).map(itemOf).every((x) => x.mode === "estimate")).toBe(true);
    }
  });

  it("name-mode distractors follow §4.4 and are never equal in value to the target", () => {
    expect(nameDistractors(3, 4).map((f) => `${f.a}/${f.d}`)).toEqual(["2/4", "4/4", "3/5"]);
    for (const d of [3, 4, 6, 8]) for (let a = 1; a < d; a++) {
      const ds = nameDistractors(a, d);
      expect(ds.length, `${a}/${d}`).toBeGreaterThanOrEqual(2);
      for (const f of ds) expect(fracEq(f, { a, d })).toBe(false);
    }
  });
});

describe("sleepy-trail answers and tolerance", () => {
  it("estimates accept ±1/12 (d ≤ 6) and ±1/16 (d = 8), on the 24ths grid", () => {
    expect(toleranceFor(4)).toBeCloseTo(1 / 12);
    expect(toleranceFor(8)).toBeCloseTo(1 / 16);
    const ans = { kind: "numeric" as const, value: 3 / 4, tolerance: 1 / 12 };
    expect(validateAnswer(ans, 16 / 24).correct).toBe(true); // 2/24 = 1/12 away
    expect(validateAnswer(ans, 15 / 24)).toEqual({ correct: false, reason: "too-low" });
    expect(validateAnswer(ans, 21 / 24)).toEqual({ correct: false, reason: "too-high" });
  });
});

describe("sleepy-trail diagnosis (§4.5)", () => {
  const ex = (level: number, pred: (e: Exercise) => boolean) => {
    for (const seed of SEEDS) {
      const e = band(level, seed).find(pred);
      if (e) return e;
    }
    throw new Error("none");
  };
  it("marked trails", () => {
    expect(diagnosePost({ a: 3, d: 4 }, 4, 2)).toBe("st.hint.jumps");
    expect(diagnosePost({ a: 3, d: 4 }, 4, 4)).toBe("st.hint.jumps"); // 4/4 is also one jump off
    expect(diagnosePost({ a: 1, d: 3 }, 3, 3)).toBe("st.hint.parts"); // read 1/3 as the whole number 1
    expect(diagnosePost({ a: 2, d: 4 }, 4, 8)).toBe("st.hint.parts"); // 2/4 → whole number 2 on a 0–2 trail
    expect(diagnosePost({ a: 1, d: 2 }, 2, 4)).toBe("st.hint.topbottom"); // 2/1 instead of 1/2 (0–2 trail in halves)
    expect(diagnosePost({ a: 1, d: 4 }, 8, 1)).toBe("st.hint.size.d4"); // equivalence: one eighth-post taken as 1/4
    expect(diagnosePost({ a: 5, d: 8 }, 8, 1)).toBe("st.hint.general.d8");
  });
  it("name, compare and estimate", () => {
    const nm = ex(3, (e) => itemOf(e).a === 3 && itemOf(e).d === 4);
    expect(diagnose(nm, "f2-4")).toBe("st.hint.jumps");
    expect(diagnose(nm, "f3-5")).toBe("st.hint.parts");
    const sameA = ex(6, (e) => itemOf(e).a === itemOf(e).a2);
    const it = itemOf(sameA);
    const wrongWho = fracCmp(it, { a: it.a2!, d: it.d2! }) > 0 ? "bobbo" : "rumble";
    const v = { rumble: `r${it.a}`, bobbo: `b${it.a2}`, farther: wrongWho };
    expect(diagnose(sameA, v, validateAnswer(sameA.answer, v))).toBe("st.hint.bigger");
    const off = { ...v, rumble: `r${it.a + 1}` };
    expect(diagnose(sameA, off, validateAnswer(sameA.answer, off))).toBe("st.hint.jumps");
    const est = ex(7, () => true);
    expect(diagnose(est, 1, validateAnswer(est.answer, 1))).toBe("st.hint.high");
    expect(diagnose(est, 0, validateAnswer(est.answer, 0))).toBe("st.hint.low");
  });
});

describe("sleepy-trail voice coverage", () => {
  const every: Exercise[] = [...sleepyTrail.exercises];
  for (let level = 0; level <= MAX_LEVEL; level++) for (const it of allItems(level)) every.push({ ...generateSleepyTrail(level, createRng(1), 0), objectKind: kindOf(it), params: { mode: ["place", "name", "compare", "estimate"].indexOf(it.mode), M: it.M, P: it.P, a: it.a, d: it.d, a2: it.a2 ?? 0, d2: it.d2 ?? 0 }, difficulty: level + 1 } as Exercise);
  const generated = SEEDS.flatMap((s) => Array.from({ length: MAX_LEVEL + 1 }, (_, l) => band(l, s)).flat());

  it("allItems covers everything the generator produces", () => {
    const kinds = new Set(every.map((e) => e.objectKind));
    for (const e of generated) expect(kinds.has(e.objectKind), e.id).toBe(true);
  });

  it("every kind the game can show has a phrase and a clip variant on every line that speaks it", () => {
    const missing: string[] = [];
    for (const e of [...generated, ...sleepyTrail.exercises]) {
      const k = e.objectKind;
      if (!objects[k]) missing.push(`object ${k}`);
      const prompt = e.prompt!.line;
      if (lines[prompt]?.vary && !lines[prompt]!.vary!.kind!.includes(k)) missing.push(`${prompt} ${k}`);
      for (const p of praiseFor(e)) if (!lines[p]) missing.push(p);
      else if (lines[p]!.vary && !lines[p]!.vary!.kind!.includes(k)) missing.push(`${p} ${k}`);
      if (!lines["st.hint.modelTap"]!.vary!.kind!.includes(k)) missing.push(`modelTap ${k}`);
      if (!lines[explainFor(e)]) missing.push(explainFor(e));
    }
    expect([...new Set(missing)]).toEqual([]);
  });

  it("every diagnosis line exists, lines are short and praise the process", () => {
    const ids = ["st.hint.jumps", "st.hint.parts", "st.hint.topbottom", "st.hint.bigger", "st.hint.closer", "st.hint.high", "st.hint.low", "st.hint.size.d2", "st.hint.size.d3", "st.hint.size.d4", ...[2, 3, 4, 5, 6, 8].map((d) => `st.hint.general.d${d}`)];
    for (const id of ids) expect(lines[id], id).toBeDefined();
    for (const [id, l] of Object.entries(lines)) {
      expect(l.text.toLowerCase(), id).not.toMatch(/smart|genius|clever|brilliant|quarter/);
      expect(l.text.replace(/\{\w+\}/g, "three fourths").split(/\s+/).length, id).toBeLessThanOrEqual(15);
      if (l.vary) expect(l.vary.kind!.length, id).toBeLessThan(150);
    }
  });
});

describe("sleepy-trail layout", () => {
  const boxes = [[860, 430], [360, 520], [700, 180], [900, 760]]; // approx. boards at 1280×800, 390×844, 915×412, 1024×1366
  it("posts are evenly spaced and never closer than 44 px (vertical trail on narrow screens)", () => {
    for (const [w, h] of boxes)
      for (const [M, P, lanes] of [[1, 8, 1], [2, 4, 1], [1, 8, 2], [2, 2, 1], [1, 2, 1]] as const) {
        const lay = layoutTrail(w!, h!, M, P, lanes);
        expect(lay.spacing, `${w}×${h} M${M} P${P}`).toBeGreaterThanOrEqual(44);
        expect(lay.hit).toBeGreaterThanOrEqual(44);
        const pts = Array.from({ length: M * P + 1 }, (_, k) => pointAt(lay, k / P));
        const gaps = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y));
        for (const g of gaps) expect(g).toBeCloseTo(gaps[0]!, 6);
      }
  });
});
