import type { AnswerOption, Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";
import {
  KINDS, QUAD_KINDS, TRIANGLE_KINDS, encodePiece, encodeShape, fillingSubsets, partition,
  type OutlineType, type PieceKind, type ShapeKind, type ShapeName, type ShapeSpec,
} from "./shapes";

/**
 * Gloop's Shape Squish — procedural exercises. PURE: same (level, rng, index) → same exercise.
 * Level ladder (docs/curriculum/maths.md §3 item 2; full rationale in docs/worlds/shape-squish.md):
 *
 *   L1 gate  2 gates, circle vs square, upright                      math.shape.name
 *   L2 gate  3 gates: circle, square, triangle, upright, sizes vary   math.shape.name
 *   L3 gate  3–4 gates, every gate turned / stretched / resized;     math.shape.name
 *            Gloop shows the shape upright, so matching needs "a turned square is still a square"; one near-miss
 *   L4 find  find every triangle (or square) among 6                 math.shape.name
 *   L5 sort  sort 5–6 shapes into "3 sides" / "4 sides" jars         math.shape.attributes
 *   L6 fill  which two triangles make a square?                      math.shape.compose
 *   L7 fill  fill a hexagon outline (2–4 pieces + distractors)       math.shape.compose
 *   L8 two   fill two outlines, each a different way                 math.shape.compose
 *
 * Shape names used in prompts stay inside the five names the voice lines cover.
 */
export const SS_AGES = [4, 6] as const;
export const SKILL_NAME = "math.shape.name";
export const SKILL_ATTR = "math.shape.attributes";
export const SKILL_COMPOSE = "math.shape.compose";

export type Mode = "gate" | "find" | "sort" | "fill" | "two";
export const MODES: readonly Mode[] = ["gate", "find", "sort", "fill", "two"];

export const SS_LEVELS = [
  { mode: "gate", gates: 2, turned: false },
  { mode: "gate", gates: 3, turned: false },
  { mode: "gate", gates: 4, turned: true },
  { mode: "find", shapes: 6 },
  { mode: "sort", shapes: 6 },
  { mode: "fill", outline: "square" },
  { mode: "fill", outline: "hexagon" },
  { mode: "two" },
] as const;
export const SS_MAX_LEVEL = SS_LEVELS.length - 1;

/** Kind order used to encode Gloop's own shape in exercise params (numbers only). */
export const KIND_LIST = Object.keys(KINDS) as ShapeKind[];
const LETTERS = "abcdefghij";

/** Gloop's squished shape in its familiar, upright form. */
const CANONICAL: Record<ShapeName, ShapeSpec> = {
  circle: { kind: "circle", rot: 0, stretch: 100, size: 92, color: 0 },
  square: { kind: "square", rot: 0, stretch: 100, size: 88, color: 0 },
  triangle: { kind: "tri-eq", rot: 0, stretch: 100, size: 96, color: 0 },
  rectangle: { kind: "rect", rot: 0, stretch: 170, size: 96, color: 0 },
  hexagon: { kind: "hexagon", rot: 0, stretch: 100, size: 92, color: 0 },
};
/** A plausible near-miss for each name (looks close, but a defining attribute differs). */
const NEAR_MISS: Record<ShapeName, readonly ShapeKind[]> = {
  circle: ["oval"],
  square: ["rect", "rhombus"],
  triangle: ["trapezoid", "kite"],
  rectangle: ["parallelogram", "trapezoid"],
  hexagon: ["pentagon"],
};

const NAMED_KINDS: Record<ShapeName, readonly ShapeKind[]> = {
  circle: ["circle"],
  square: ["square"],
  triangle: TRIANGLE_KINDS,
  rectangle: ["rect"],
  hexagon: ["hexagon"],
};

/** One shape of `kind`; `turned` rotates/stretches it (never into something else: rectangles stay ≥ 1.5 : 1). */
function shape(kind: ShapeKind, rng: Rng, opts: { turned: boolean; size: number; color: number }): ShapeSpec {
  const k = KINDS[kind];
  let rot = 0;
  if (opts.turned && k.sides > 0) rot = kind === "square" ? rng.int(20, 70) : kind === "hexagon" ? rng.int(12, 48) : rng.pick([1, -1]) * rng.int(18, 160);
  if (opts.turned && kind === "oval") rot = rng.int(-40, 40);
  const stretch = kind === "rect" ? rng.int(150, 230) : k.stretchable && opts.turned ? rng.int(72, 145) : 100;
  return { kind, rot, stretch, size: opts.size, color: opts.color };
}

const opt = (i: number, spec: ShapeSpec): AnswerOption => ({ id: LETTERS[i]!, art: encodeShape(spec) });

// ---------------------------------------------------------------- gate (choice)

function gate(level: number, rng: Rng, index: number): Omit<Exercise, "difficulty"> {
  const p = SS_LEVELS[level] as Extract<(typeof SS_LEVELS)[number], { mode: "gate" }>;
  const colors = rng.shuffle([0, 1, 2, 3, 4, 5]);
  let names: ShapeName[];
  let target: ShapeName;
  const specs: ShapeSpec[] = [];
  if (!p.turned) {
    names = p.gates === 2 ? ["circle", "square"] : ["circle", "square", "triangle"];
    target = names[index % names.length]!;
    if (rng.chance(0.5) && p.gates === 2) target = target === "circle" ? "square" : "circle";
    names.forEach((n, i) => {
      const kind = n === "triangle" ? rng.pick(["tri-eq", "tri-right"] as const) : CANONICAL[n].kind;
      specs.push(shape(kind, rng, { turned: false, size: p.gates === 2 ? rng.int(84, 100) : rng.int(68, 100), color: colors[i]! }));
    });
  } else {
    target = rng.pick(["circle", "square", "triangle", "rectangle", "hexagon"] as const);
    const count = index % 2 === 0 ? 3 : 4;
    const others = rng
      .shuffle(["circle", "square", "triangle", "rectangle", "hexagon"].filter((n) => n !== target && !(target === "rectangle" && n === "square")) as ShapeName[])
      .slice(0, count - 2);
    const sizes = rng.shuffle([62, 74, 86, 98]);
    specs.push(shape(rng.pick(NAMED_KINDS[target]), rng, { turned: true, size: sizes[0]!, color: colors[0]! }));
    specs.push(shape(rng.pick(NEAR_MISS[target]), rng, { turned: true, size: sizes[1]!, color: colors[1]! }));
    others.forEach((n, i) => specs.push(shape(rng.pick(NAMED_KINDS[n]), rng, { turned: true, size: sizes[i + 2]!, color: colors[i + 2]! })));
    names = [];
  }
  const order = rng.shuffle(specs.map((_, i) => i));
  const options = order.map((k, i) => opt(i, specs[k]!));
  const correct = LETTERS[order.indexOf(p.turned ? 0 : names.indexOf(target))]!;
  const correctSpec = specs[p.turned ? 0 : names.indexOf(target)]!;
  const gloop = p.turned ? CANONICAL[target] : { ...correctSpec, size: 92 };
  return {
    id: `ss-gate-${target}-l${level}n${index}`,
    skillId: SKILL_NAME,
    objective: p.turned ? `Recognise a ${target} that is turned, stretched or a different size` : `Find the ${target} among ${p.gates} shapes`,
    ages: SS_AGES,
    interaction: "choose",
    answer: { kind: "choice", correct, options },
    objectKind: `shape-${target}`,
    seed: rng.int(1, 999_999),
    params: { mode: 0, gk: KIND_LIST.indexOf(gloop.kind), gr: gloop.rot, gs: gloop.stretch },
    prompt: { line: "ss.prompt.gate", vars: { shape: target }, text: `Gloop is a ${target}! Find the ${target} gate.` },
    a11yDescription: `Gloop has squished into a ${target}. ${options.length} garden gates have holes of different shapes${p.turned ? ", turned and stretched" : ""}. Drag Gloop to the ${target} gate, or tap the gate.`,
  };
}

// ---------------------------------------------------------------- find (set)

function find(level: number, rng: Rng, index: number): Omit<Exercise, "difficulty"> {
  const target: ShapeName = index % 3 === 2 ? "square" : "triangle";
  const k = rng.int(2, 3);
  const colors = rng.shuffle([0, 1, 2, 3, 4, 5]);
  const sizes = rng.shuffle([62, 68, 76, 84, 92, 100]);
  const targets: ShapeSpec[] =
    target === "triangle"
      ? rng.shuffle(TRIANGLE_KINDS).slice(0, k).map((kind, i) => shape(kind, rng, { turned: true, size: sizes[i]!, color: colors[i]! }))
      : Array.from({ length: k }, (_, i) => shape("square", rng, { turned: i > 0, size: sizes[i]!, color: colors[i]! }));
  const near = target === "triangle" ? rng.pick(["trapezoid", "pentagon", "kite"] as const) : rng.pick(["rect", "rhombus"] as const);
  const pool = (target === "triangle"
    ? ["square", "rect", "hexagon", "circle", "pentagon", "trapezoid", "rhombus", "kite", "oval"]
    : ["rect", "rhombus", "trapezoid", "tri-eq", "tri-right", "hexagon", "circle", "kite", "parallelogram"]) as ShapeKind[];
  const fillers = [near, ...rng.shuffle(pool.filter((x) => x !== near))].slice(0, 6 - k);
  const others = fillers.map((kind, i) => shape(kind, rng, { turned: true, size: sizes[k + i]!, color: colors[k + i]! }));
  const all = [...targets, ...others];
  const order = rng.shuffle(all.map((_, i) => i));
  const options = order.map((src, i) => opt(i, all[src]!));
  const correct = order.map((src, i) => (src < k ? LETTERS[i]! : null)).filter((x): x is string => x !== null);
  return {
    id: `ss-find-${target}-l${level}n${index}`,
    skillId: SKILL_NAME,
    objective: `Find every ${target} among 6 shapes, whatever its size or turn`,
    ages: SS_AGES,
    interaction: "choose",
    answer: { kind: "set", correct, options },
    objectKind: `shape-${target}`,
    seed: rng.int(1, 999_999),
    params: { mode: 1 },
    prompt: { line: "ss.prompt.find", vars: { shape: target }, text: `Find every ${target}!` },
    a11yDescription: `6 jelly shapes of different sizes, some turned. Put every ${target} in the jelly jar, then press Squish.`,
  };
}

// ---------------------------------------------------------------- sort (match)

function sort(level: number, rng: Rng, index: number): Omit<Exercise, "difficulty"> {
  const n = index % 2 === 0 ? 5 : 6;
  const threes = rng.int(2, n - 2);
  // three colours shared across both jars, so colour can never be the sorting rule
  const palette = rng.shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3);
  const sizes = rng.shuffle([62, 68, 76, 84, 92, 100]);
  const kinds = [
    ...rng.shuffle(TRIANGLE_KINDS).slice(0, threes),
    ...rng.shuffle(QUAD_KINDS).slice(0, n - threes),
  ];
  const specs = kinds.map((kind, i) => shape(kind, rng, { turned: rng.chance(0.75), size: sizes[i]!, color: palette[i % 3]! }));
  const order = rng.shuffle(specs.map((_, i) => i));
  const items = order.map((src, i) => opt(i, specs[src]!));
  const pairs = Object.fromEntries(items.map((it, i) => [it.id, KINDS[specs[order[i]!]!.kind].sides === 3 ? "t3" : "t4"]));
  return {
    id: `ss-sort-${threes}-${n - threes}-l${level}n${index}`,
    skillId: SKILL_ATTR,
    objective: `Sort ${n} shapes by how many sides they have (3 or 4)`,
    ages: SS_AGES,
    interaction: "choose",
    answer: { kind: "match", pairs, items, targets: [{ id: "t3", text: "3 sides" }, { id: "t4", text: "4 sides" }] },
    objectKind: "jar",
    seed: rng.int(1, 999_999),
    params: { mode: 2 },
    prompt: { line: "ss.prompt.sort", text: "Sort the shapes by their sides!" },
    a11yDescription: `${n} jelly shapes in different colours, sizes and turns, and two jars: one for shapes with 3 sides, one for shapes with 4 sides.`,
  };
}

// ---------------------------------------------------------------- compose (set of pieces)

const SQUARE_ROT = [0, 45, 90, 135, 180, 225, 270, 315];
const HEX_ROT = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

/** Ways to fill ONE outline (L7) — each a different collection of pieces. */
const HEX_WAYS: readonly PieceKind[][] = [
  ["c-trap", "c-trap"],
  ["c-rh", "c-rh", "c-rh"],
  ["c-trap", "c-rh", "c-tri"],
  ["c-trap", "c-tri", "c-tri", "c-tri"],
  ["c-rh", "c-rh", "c-tri", "c-tri"],
];
/** Two different ways to fill TWO outlines (L8). Families never mix inside one outline. */
const TWO_WAYS: readonly { outline: OutlineType; ways: [PieceKind[], PieceKind[]] }[] = [
  { outline: "hexagon", ways: [["c-trap", "c-trap"], ["c-rh", "c-rh", "c-rh"]] },
  { outline: "hexagon", ways: [["c-trap", "c-trap"], ["c-trap", "c-rh", "c-tri"]] },
  { outline: "hexagon", ways: [["c-rh", "c-rh", "c-rh"], ["c-trap", "c-rh", "c-tri"]] },
  { outline: "square", ways: [["c-half", "c-half"], ["c-rect", "c-rect"]] },
  { outline: "square", ways: [["c-half", "c-half"], ["c-half", "c-qtri", "c-qtri"]] },
  { outline: "square", ways: [["c-rect", "c-rect"], ["c-rect", "c-sq", "c-sq"]] },
];
/** Distractors that look like they might fit (wrong shape, wrong size, or another family). */
const DISTRACT: Record<OutlineType, readonly PieceKind[]> = {
  square: ["c-tri", "c-qtri", "c-sq", "c-rect", "c-rh", "c-trap"],
  hexagon: ["c-half", "c-sq", "c-qtri", "c-rect", "c-trap", "c-rh", "c-tri"],
};

/**
 * Build the piece tray: the correct pieces (in way order) + distractors, keeping only distractors that leave the
 * correct pieces as the ONE subset that fills the outline(s). Then shuffle the tray.
 */
function composeTray(rng: Rng, outline: OutlineType, ways: PieceKind[][], wanted: number) {
  const correct = ways.flat();
  const kinds = [...correct];
  for (const d of rng.shuffle(DISTRACT[outline])) {
    if (kinds.length - correct.length >= wanted) break;
    const trial = [...kinds, d];
    const subsets = fillingSubsets(outline, ways.length, trial);
    if (subsets.length === 1 && subsets[0]!.length === correct.length && subsets[0]!.every((i) => i < correct.length)) kinds.push(d);
  }
  const colors = rng.shuffle([0, 1, 2, 3, 4, 5]);
  const rots = (k: PieceKind) => (k === "c-trap" || k === "c-rh" || k === "c-tri" ? HEX_ROT : SQUARE_ROT);
  const specs = kinds.map((kind, i) => ({ kind, rot: rng.pick(rots(kind)), color: colors[i % colors.length]! }));
  const order = rng.shuffle(specs.map((_, i) => i));
  const options: AnswerOption[] = order.map((src, i) => ({ id: `p${i + 1}`, art: encodePiece(specs[src]!) }));
  // correct ids listed in way order (the modelled answer places them in this order, outline by outline)
  const correctIds = correct.map((_, src) => `p${order.indexOf(src) + 1}`);
  return { options, correctIds };
}

function fill(level: number, rng: Rng, index: number): Omit<Exercise, "difficulty"> {
  const p = SS_LEVELS[level] as Extract<(typeof SS_LEVELS)[number], { mode: "fill" }>;
  const outline: OutlineType = p.outline;
  const ways: PieceKind[][] = outline === "square" ? [["c-half", "c-half"]] : [HEX_WAYS[(index + rng.int(0, 4)) % HEX_WAYS.length]!];
  const { options, correctIds } = composeTray(rng, outline, ways, 2);
  const two = outline === "square";
  return {
    id: `ss-fill-${outline}-${ways[0]!.length}-l${level}n${index}`,
    skillId: SKILL_COMPOSE,
    objective: two ? "Make a square from two triangles" : `Fill a hexagon outline with ${ways[0]!.length} pattern pieces`,
    ages: SS_AGES,
    interaction: "choose",
    answer: { kind: "set", correct: correctIds, options },
    objectKind: `outline-${outline}`,
    seed: rng.int(1, 999_999),
    params: { mode: 3, outline: outline === "square" ? 0 : 1, outlines: 1 },
    prompt: two
      ? { line: "ss.prompt.two", text: "Which two triangles make a square?" }
      : { line: "ss.prompt.fill", vars: { shape: outline }, text: `Fill the ${outline} gate with jelly pieces!` },
    a11yDescription: `An empty ${outline} gate and ${options.length} jelly pieces, some turned. Put pieces in the gate until it is full with no gaps, then press Squish.`,
  };
}

function two(level: number, rng: Rng, index: number): Omit<Exercise, "difficulty"> {
  const t = TWO_WAYS[(index + rng.int(0, TWO_WAYS.length - 1)) % TWO_WAYS.length]!;
  const ways = rng.chance(0.5) ? [t.ways[0], t.ways[1]] : [t.ways[1], t.ways[0]];
  const { options, correctIds } = composeTray(rng, t.outline, ways, 1);
  return {
    id: `ss-two-${t.outline}-${ways[0]!.length}${ways[1]!.length}-l${level}n${index}`,
    skillId: SKILL_COMPOSE,
    objective: `Fill two ${t.outline} outlines, each a different way`,
    ages: SS_AGES,
    interaction: "choose",
    answer: { kind: "set", correct: correctIds, options },
    objectKind: `outline-${t.outline}`,
    seed: rng.int(1, 999_999),
    params: { mode: 4, outline: t.outline === "square" ? 0 : 1, outlines: 2 },
    prompt: { line: "ss.prompt.twoWays", vars: { shape: t.outline }, text: `Fill both ${t.outline} gates, each a different way!` },
    a11yDescription: `Two empty ${t.outline} gates and ${options.length} jelly pieces. Fill each gate with no gaps, using different pieces in each, then press Squish.`,
  };
}

export const generateShapeSquish: ExerciseGenerator = (level, rng, index) => {
  const l = Math.max(0, Math.min(SS_MAX_LEVEL, level));
  switch (SS_LEVELS[l]!.mode) {
    case "gate":
      return gate(l, rng, index);
    case "find":
      return find(l, rng, index);
    case "sort":
      return sort(l, rng, index);
    case "fill":
      return fill(l, rng, index);
    case "two":
      return two(l, rng, index);
  }
};

// ---------------------------------------------------------------- helpers shared by board, skin and tests

export const modeOf = (ex: Pick<Exercise, "params">): Mode => MODES[ex.params?.mode ?? 0] ?? "gate";
export const outlineOf = (ex: Pick<Exercise, "params">): OutlineType => (ex.params?.outline === 1 ? "hexagon" : "square");
export const outlineCount = (ex: Pick<Exercise, "params">) => ex.params?.outlines ?? 1;
/** Gloop's squished shape for a gate exercise. */
export function gloopSpec(ex: Pick<Exercise, "params">): ShapeSpec {
  const kind = KIND_LIST[ex.params?.gk ?? 0] ?? "circle";
  return { kind, rot: ex.params?.gr ?? 0, stretch: ex.params?.gs ?? 100, size: 92, color: 0 };
}
/** Pieces of a compose exercise split into the outlines they fill (the modelled answer). */
export function modelGroups(ex: Exercise, kindOf: (id: string) => PieceKind): string[][] {
  if (ex.answer.kind !== "set") return [];
  const ids = ex.answer.correct;
  const groups = partition(outlineOf(ex), outlineCount(ex), ids.map(kindOf));
  return groups ? groups.map((g) => g.map((i) => ids[i]!)) : [[...ids]];
}
