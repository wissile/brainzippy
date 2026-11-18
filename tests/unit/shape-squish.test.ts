import { describe, expect, it } from "vitest";
import { VOICE_LINES, renderLine } from "../../src/audio/voiceLines";
import { buildRound, generateBand } from "../../src/engine/round";
import { createRng } from "../../src/engine/rng";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import type { Exercise } from "../../src/engine/types";
import { lintExercise, validateAnswer } from "../../src/engine/validation";
import { alongSayFor, alongStepsFor, gridFor } from "../../src/games/shape-squish/Board";
import { shapeSquish, shapeTutorial } from "../../src/games/shape-squish/definition";
import { SS_LEVELS, SS_MAX_LEVEL, generateShapeSquish, gloopSpec, modeOf, modelGroups, outlineCount, outlineOf } from "../../src/games/shape-squish/generator";
import {
  KINDS, OUTLINE_INFO, PIECES, classify, cornerAngles, fillingSubsets, fits, isFull, nameOf, packOutline, parsePiece, parseShape, partition,
  piecePoints, sameWay, shapePoints, sideLengths, sidesOf, type PieceKind,
} from "../../src/games/shape-squish/shapes";

const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 3);
const all: Exercise[] = [];
for (const seed of SEEDS) for (let level = 0; level <= SS_MAX_LEVEL; level++) all.push(...generateBand(shapeSquish, level, seed, shapeSquish.progression.roundLength));
const byMode = (m: string) => all.filter((e) => modeOf(e) === m);
const area = (pts: readonly (readonly [number, number])[]) => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]!; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const shapeOfArt = (art?: string) => parseShape(art ?? "")!;
const kindOfPiece = (ex: Exercise) => (id: string) => {
  const o = ex.answer.kind === "set" ? ex.answer.options.find((x) => x.id === id) : undefined;
  return parsePiece(o!.art!)!.kind;
};

describe("Shape Squish: generator and levels", () => {
  it("8 levels (maxLevel 7) and one authored tutorial at difficulty 1", () => {
    expect(SS_LEVELS).toHaveLength(8);
    expect(shapeSquish.progression.maxLevel).toBe(7);
    expect(shapeSquish.exercises.filter((e) => e.tutorial)).toEqual([shapeTutorial]);
    expect(shapeTutorial.difficulty).toBe(1);
    expect(lintExercise(shapeTutorial)).toEqual([]);
  });

  it("every generated exercise (8 levels × 50 seeds × 8) lints, uses a declared skill, and difficulty = level + 1", () => {
    const problems: string[] = [];
    for (const ex of all) {
      problems.push(...lintExercise(ex));
      if (!shapeSquish.skillIds.includes(ex.skillId)) problems.push(`${ex.id}: undeclared skill`);
      const level = Number(/-l(\d+)n\d+$/.exec(ex.id)![1]);
      if (ex.difficulty !== level + 1) problems.push(`${ex.id}: difficulty`);
      if (modeOf(ex) !== SS_LEVELS[level]!.mode) problems.push(`${ex.id}: wrong mode for level`);
    }
    for (const seed of SEEDS.slice(0, 10)) for (let level = 0; level <= SS_MAX_LEVEL; level++) for (const ex of buildRound(shapeSquish, { level, seed }).exercises) problems.push(...lintExercise(ex));
    expect(problems).toEqual([]);
  });

  it("is deterministic: same (level, seed) → same round; the generator is pure", () => {
    for (let level = 0; level <= SS_MAX_LEVEL; level++) {
      expect(buildRound(shapeSquish, { level, seed: 9 })).toEqual(buildRound(shapeSquish, { level, seed: 9 }));
      expect(buildRound(shapeSquish, { level, seed: 9 }).exercises).not.toEqual(buildRound(shapeSquish, { level, seed: 10 }).exercises);
      for (let i = 0; i < 8; i++) expect(generateShapeSquish(level, createRng(42), i)).toEqual(generateShapeSquish(level, createRng(42), i));
    }
  });

  it("prompts use catalogued lines whose vary lists cover every value, and the caption matches the text", () => {
    for (const ex of [shapeTutorial, ...all]) {
      const line = VOICE_LINES[ex.prompt!.line];
      expect(line, ex.id).toBeDefined();
      for (const [k, values] of Object.entries(line!.vary ?? {})) expect(values, `${ex.id} ${k}`).toContain(ex.prompt!.vars![k]);
      expect(renderLine(ex.prompt!.line, ex.prompt!.vars as Record<string, string>)).toBe(ex.prompt!.text);
    }
  });
});

describe("Shape Squish: shapes are mathematically right", () => {
  it("drawn polygons have the attributes their names promise, in every rotation, stretch and size", () => {
    for (const ex of [...byMode("gate"), ...byMode("find"), ...byMode("sort")]) {
      const opts = ex.answer.kind === "match" ? ex.answer.items : ex.answer.kind === "choice" || ex.answer.kind === "set" ? ex.answer.options : [];
      for (const o of opts) {
        const s = shapeOfArt(o.art);
        const pts = shapePoints(s);
        const name = nameOf(s);
        if (s.kind === "circle" || s.kind === "oval") continue;
        expect(pts.length, `${ex.id} ${o.art}`).toBe(KINDS[s.kind].sides);
        // named shapes classify as themselves; unnamed ones never pass for a named square/rectangle/hexagon
        if (name && name !== "triangle") expect(classify(pts), `${ex.id} ${o.art}`).toBe(name);
        if (!name) expect(["square", "rectangle", "hexagon"], `${ex.id} ${o.art}`).not.toContain(classify(pts));
        for (const p of pts) for (const v of p) expect(v).toBeGreaterThanOrEqual(-1), expect(v).toBeLessThanOrEqual(101);
      }
    }
  });

  it("a turned square is still a square: equal sides and four right angles at any rotation", () => {
    for (let rot = 0; rot < 360; rot += 7) {
      const pts = shapePoints({ kind: "square", rot, stretch: 100, size: 80, color: 0 });
      expect(classify(pts)).toBe("square");
      expect(new Set(sideLengths(pts).map((x) => x.toFixed(3))).size).toBe(1);
      expect(cornerAngles(pts).every((a) => Math.abs(a - 90) < 0.01)).toBe(true);
    }
    // a rhombus has 4 equal sides but no square corners — never a square
    expect(classify(shapePoints({ kind: "rhombus", rot: 45, stretch: 100, size: 80, color: 0 }))).toBeNull();
  });

  it("gate levels: exactly one gate has Gloop's shape name; rectangles never compete with squares", () => {
    for (const ex of byMode("gate")) {
      if (ex.answer.kind !== "choice") throw new Error();
      const target = String(ex.prompt!.vars!.shape);
      const named = ex.answer.options.filter((o) => nameOf(shapeOfArt(o.art)) === target);
      expect(named.map((o) => o.id), ex.id).toEqual([ex.answer.correct]);
      expect(nameOf(gloopSpec(ex)), ex.id).toBe(target);
      if (target === "rectangle") expect(ex.answer.options.some((o) => shapeOfArt(o.art).kind === "square"), ex.id).toBe(false);
      const level = ex.difficulty - 1;
      if (level === 0) expect(ex.answer.options.map((o) => nameOf(shapeOfArt(o.art))).sort(), ex.id).toEqual(["circle", "square"]);
      if (level === 1) expect(ex.answer.options.map((o) => nameOf(shapeOfArt(o.art))).sort(), ex.id).toEqual(["circle", "square", "triangle"]);
      if (level <= 1) expect(ex.answer.options.every((o) => shapeOfArt(o.art).rot === 0), ex.id).toBe(true);
      if (level === 2) {
        expect(ex.answer.options.length, ex.id).toBeGreaterThanOrEqual(3);
        const correctId = ex.answer.correct;
        const gate = shapeOfArt(ex.answer.options.find((o) => o.id === correctId)!.art);
        // the right gate is turned/stretched/resized away from Gloop's upright shape (circles can only change size)
        const g = gloopSpec(ex);
        expect(gate.rot !== g.rot || gate.stretch !== g.stretch || gate.kind !== g.kind || gate.size !== g.size, ex.id).toBe(true);
        // includes a near-miss that looks close but differs in a defining attribute
        const near: Record<string, string[]> = { circle: ["oval"], square: ["rect", "rhombus"], triangle: ["trapezoid", "kite"], rectangle: ["parallelogram", "trapezoid"], hexagon: ["pentagon"] };
        expect(ex.answer.options.some((o) => near[target]!.includes(shapeOfArt(o.art).kind)), ex.id).toBe(true);
      }
    }
  });

  it("find level: the correct set is exactly the shapes with the target name (2–3 of 6)", () => {
    for (const ex of byMode("find")) {
      if (ex.answer.kind !== "set") throw new Error();
      const target = String(ex.prompt!.vars!.shape);
      expect(ex.answer.options).toHaveLength(6);
      const named = ex.answer.options.filter((o) => nameOf(shapeOfArt(o.art)) === target).map((o) => o.id).sort();
      expect([...ex.answer.correct].sort(), ex.id).toEqual(named);
      expect(named.length).toBeGreaterThanOrEqual(2);
      expect(named.length).toBeLessThanOrEqual(3);
    }
  });

  it("sort level: pairs follow the number of sides; both jars used; colour never predicts the jar", () => {
    for (const ex of byMode("sort")) {
      if (ex.answer.kind !== "match") throw new Error();
      const sides = Object.fromEntries(ex.answer.items.map((it) => [it.id, sidesOf(shapeOfArt(it.art))]));
      for (const it of ex.answer.items) expect(ex.answer.pairs[it.id], ex.id).toBe(sides[it.id] === 3 ? "t3" : "t4");
      const t3 = ex.answer.items.filter((it) => ex.answer.kind === "match" && ex.answer.pairs[it.id] === "t3");
      expect(t3.length).toBeGreaterThanOrEqual(2);
      expect(ex.answer.items.length - t3.length).toBeGreaterThanOrEqual(2);
      const colours = (ids: typeof t3) => new Set(ids.map((it) => shapeOfArt(it.art).color));
      const c3 = colours(t3);
      const c4 = colours(ex.answer.items.filter((it) => !t3.includes(it)));
      expect([...c3].some((c) => c4.has(c)), `${ex.id} colour overlap`).toBe(true);
    }
  });
});

describe("Shape Squish: composing", () => {
  it("pieces packed around an outline tile it exactly (areas add up, every piece keeps its own shape)", () => {
    const fills: [keyof typeof OUTLINE_INFO, PieceKind[]][] = [
      ["square", ["c-half", "c-half"]], ["square", ["c-half", "c-qtri", "c-qtri"]], ["square", ["c-rect", "c-sq", "c-sq"]], ["square", ["c-sq", "c-rect", "c-sq"]],
      ["hexagon", ["c-trap", "c-trap"]], ["hexagon", ["c-rh", "c-tri", "c-rh", "c-tri"]], ["hexagon", ["c-tri", "c-trap", "c-tri", "c-tri"]], ["hexagon", ["c-rh", "c-trap", "c-tri"]],
    ];
    for (const [outline, kinds] of fills) {
      expect(isFull(outline, kinds), kinds.join()).toBe(true);
      const packed = packOutline(kinds);
      const outlineArea = outline === "square" ? 10000 : (3 * Math.sqrt(3) / 2) * 3600;
      expect(packed.reduce((s, p) => s + area(p.points), 0)).toBeCloseTo(outlineArea, 3);
      for (const p of packed) {
        expect(area(p.points), p.kind).toBeCloseTo(area(PIECES[p.kind].points), 3);
        expect(p.points.length, p.kind).toBe(PIECES[p.kind].sides);
      }
    }
  });

  it("fits(): same family only, never past full", () => {
    expect(fits("square", [], "c-half")).toBe(true);
    expect(fits("square", ["c-half"], "c-rect")).toBe(false);
    expect(fits("square", ["c-half", "c-half"], "c-qtri")).toBe(false);
    expect(fits("square", [], "c-tri")).toBe(false);
    expect(fits("hexagon", ["c-trap", "c-rh"], "c-rh")).toBe(false);
    expect(fits("hexagon", ["c-trap", "c-rh"], "c-tri")).toBe(true);
  });

  it("every compose exercise has exactly ONE set of pieces that fills its outline(s)", () => {
    for (const ex of [...byMode("fill"), ...byMode("two")]) {
      if (ex.answer.kind !== "set") throw new Error();
      const kinds = ex.answer.options.map((o) => parsePiece(o.art!)!.kind);
      const subsets = fillingSubsets(outlineOf(ex), outlineCount(ex), kinds);
      const correct = ex.answer.correct.map((id) => ex.answer.kind === "set" && ex.answer.options.findIndex((o) => o.id === id)).sort();
      expect(subsets, ex.id).toEqual([correct]);
      expect(ex.answer.options.length - ex.answer.correct.length, `${ex.id} distractors`).toBeGreaterThanOrEqual(1);
      for (const o of ex.answer.options) expect(Number.isInteger(parsePiece(o.art!)!.rot / 15), o.art).toBe(true);
    }
  });

  it("level 6 is two triangles making a square; level 8 fills two outlines two different ways", () => {
    for (const ex of byMode("fill").filter((e) => outlineOf(e) === "square")) {
      expect(ex.answer.kind === "set" && ex.answer.correct.map(kindOfPiece(ex))).toEqual(["c-half", "c-half"]);
      expect(ex.prompt!.line).toBe("ss.prompt.two");
    }
    const twos = byMode("two");
    expect(twos.length).toBeGreaterThan(0);
    for (const ex of twos) {
      const groups = modelGroups(ex, kindOfPiece(ex));
      expect(groups, ex.id).toHaveLength(2);
      const k = groups.map((g) => g.map(kindOfPiece(ex)));
      expect(sameWay(k[0]!, k[1]!), ex.id).toBe(false);
      for (const g of k) expect(isFull(outlineOf(ex), g), ex.id).toBe(true);
      // the modelled order (answer.correct) is outline 1's pieces then outline 2's
      expect(groups.flat(), ex.id).toEqual(ex.answer.kind === "set" ? [...ex.answer.correct] : []);
    }
  });

  it("partition() refuses mixed families in one outline", () => {
    expect(partition("square", 1, ["c-half", "c-sq", "c-sq"])).toBeNull();
    expect(partition("square", 2, ["c-half", "c-half", "c-rect", "c-rect"])).toEqual([[0, 1], [2, 3]]);
  });

  it("piece rotation keeps the piece's shape", () => {
    for (const kind of Object.keys(PIECES) as PieceKind[]) for (const rot of [0, 45, 90, 150]) expect(area(piecePoints({ kind, rot, color: 0 }))).toBeCloseTo(area(PIECES[kind].points), 3);
  });
});

describe("Shape Squish: engine feedback and hints", () => {
  const ex = all.find((e) => modeOf(e) === "find")!;
  it("find: a wrong pick marks parts and greys it; the second miss models the full set", () => {
    if (ex.answer.kind !== "set") throw new Error();
    const wrong = ex.answer.options.find((o) => ex.answer.kind === "set" && !ex.answer.correct.includes(o.id))!.id;
    const first = [ex.answer.correct[0]!, wrong];
    expect(validateAnswer(ex.answer, first).correct).toBe(false);
    let s = exerciseReducer(initExercise(ex), { type: "SUBMIT", value: first });
    expect(s.check?.parts).toEqual({ [ex.answer.correct[0]!]: true, [wrong]: false });
    expect(s.eliminated).toContain(wrong);
    s = exerciseReducer(s, { type: "FEEDBACK_DONE" });
    s = exerciseReducer(s, { type: "SUBMIT", value: [ex.answer.correct[0]!] });
    expect(s.hintStage).toBe(2);
    expect(s.model).toEqual(ex.answer.correct);
    s = exerciseReducer(s, { type: "FEEDBACK_DONE" });
    s = exerciseReducer(s, { type: "SUBMIT", value: s.model! });
    expect(s.feedback?.correct).toBe(true);
  });

  it("sort: wrong jar → mark-parts; incomplete submissions are judged incomplete, not ignored", () => {
    const so = byMode("sort")[0]!;
    if (so.answer.kind !== "match") throw new Error();
    const flipped = Object.fromEntries(Object.entries(so.answer.pairs).map(([k, v], i) => [k, i === 0 ? (v === "t3" ? "t4" : "t3") : v]));
    const r = validateAnswer(so.answer, flipped);
    expect(r.correct).toBe(false);
    expect(Object.values(r.parts!).filter((x) => !x)).toHaveLength(1);
    expect(validateAnswer(so.answer, so.answer.pairs).correct).toBe(true);
  });

  it("worked-example steps: sides traced for gates, shapes counted for find, each shape's sides for sort", () => {
    expect(alongStepsFor(shapeTutorial)).toBe(1); // circle: one "round all the way" step, nothing counted
    expect(alongSayFor(shapeTutorial, 0)).toBeNull();
    const tri = byMode("gate").find((e) => e.prompt!.vars!.shape === "triangle")!;
    expect(alongStepsFor(tri)).toBe(3);
    expect([0, 1, 2].map((i) => alongSayFor(tri, i))).toEqual([1, 2, 3]);
    const so = byMode("sort")[0]!;
    if (so.answer.kind !== "match") throw new Error();
    expect(alongStepsFor(so)).toBe(so.answer.items.length);
    expect(so.answer.items.map((_, i) => alongSayFor(so, i))).toEqual(so.answer.items.map((it) => sidesOf(parseShape(it.art!)!)));
  });

  it("board grid cells never drop below the 64 px tap target", () => {
    expect(gridFor(8, 200, 100).cell).toBeGreaterThanOrEqual(64);
    expect(gridFor(6, 700, 400).cell).toBeLessThanOrEqual(150);
  });
});

describe("Shape Squish: voice", () => {
  it("lines are short, praise process, and stay under 150 variants", () => {
    const lines = Object.entries(VOICE_LINES).filter(([k]) => k.startsWith("ss."));
    expect(lines.length).toBeGreaterThan(20);
    for (const [id, line] of lines) {
      const combos = Object.values(line.vary ?? {}).reduce((a, v) => a * v.length, 1);
      expect(combos, id).toBeLessThanOrEqual(150);
      expect(line.text.split(/\s+/).length, id).toBeLessThanOrEqual(14);
      expect(line.text.toLowerCase(), id).not.toMatch(/smart|genius|clever|brilliant/);
    }
  });
});
