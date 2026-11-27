import type { AnswerOption, Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";

/**
 * Gloop's Bubble Bath — procedural exercises. PURE: same (level, rng, index) → same exercise.
 * Five inner games share one bathtub; levels unlock them one by one and add at most three new ideas each.
 * Index 0–6 rotate through the level's games (the new one first); index 7 is the Bubble Parade finale (`closer`).
 * Full rationale (misconceptions, why each interaction): docs/worlds/bubble-bath.md.
 *
 *   Lv  new ideas                         Shape Splash (sort · find)        Quick Look         More or Fewer             Size Line           Parade
 *   0   Shape Splash (tutorial)           ○□ · 2 holes, 2 toys · 2 pics     —                  —                         —                   1–3 + dots
 *   1   Quick Look, triangles             ○□△ · 3 holes, 3 toys · 3 pics    1–3 line/dice 2.5s —                         —                   1–3 + dots
 *   2   More or Fewer (more)              same                              1–4               more · ≤4 · differ by ≥2   —                   1–3 + dots
 *   3   Size Line, "fewer"                same                              1–4 · 2.2 s       + fewer · ≤5                3 · outlines        1–4 + dots
 *   4   "same", tipped shapes, plain line tipped, any size · 4 toys          2–5 (5 structured) + same · differ by ≥1      3 · plain slots     1–4 + dots
 *   5   4 sponges, bubble clumps         tipped · 4 pictures                2–5 + clumps 2 s  ≤6                         4 · outlines        1–5 + dots
 *   6   long-line trap, skinny △,        + skinny triangles                 3–5 · 1.8 s       longer line has fewer      4 · plain           1–5 numerals
 *       numerals only
 *   7   closer sizes                      all                               1–5 any · 1.5 s   long-line trap ≤6          4 · close sizes     1–5 numerals
 *
 * No answer is ever timed. Quick Look shows its bubbles briefly (that is what makes it subitizing), but the child can
 * peek again as often as they like and answers whenever they are ready.
 */
export const GB_AGES = [3, 4] as const;
export const SKILL = {
  subitize: "math.count.subitize",
  compare: "math.count.compare",
  order: "math.measure.order-size",
  shape: "math.shape.name",
  oneToOne: "math.count.one-to-one",
} as const;

export type Mode = "sort" | "find" | "look" | "compare" | "size" | "parade";
export const MODES: readonly Mode[] = ["sort", "find", "look", "compare", "size", "parade"];
export type InnerGame = "shape-splash" | "quick-look" | "more-fewer" | "size-line" | "bubble-parade";
export const GAME_OF: Record<Mode, InnerGame> = {
  sort: "shape-splash",
  find: "shape-splash",
  look: "quick-look",
  compare: "more-fewer",
  size: "size-line",
  parade: "bubble-parade",
};

export const SHAPES = ["circle", "square", "triangle"] as const;
export type Shape = (typeof SHAPES)[number];
export const TOY_COLOURS = ["red", "blue", "yellow", "green"] as const;
export type ToyColour = (typeof TOY_COLOURS)[number];
export type Arrangement = "line" | "dice" | "clumps";
export const ARRANGEMENTS: readonly Arrangement[] = ["line", "dice", "clumps"];
export type Question = "more" | "fewer";
export const SIZE_KINDS = ["boat", "sponge"] as const;
export type SizeKind = (typeof SIZE_KINDS)[number];
/** Things on the bathroom wall in Shape Splash's "find" picture, and the shape each one is. */
export const WALL_THINGS = { mirror: "circle", clock: "circle", ball: "circle", window: "square", tile: "square", box: "square", flag: "triangle", shelf: "triangle" } as const;
export type WallThing = keyof typeof WALL_THINGS;
export const THINGS_OF: Record<Shape, readonly WallThing[]> = { circle: ["mirror", "clock", "ball"], square: ["window", "tile", "box"], triangle: ["flag", "shelf"] };

export const MAX_DUCKS = 6;
export const MAX_LOOK = 5;
export const BUBBLE_R = 9;

interface Level {
  games: readonly Mode[];
  sort: { shapes: 2 | 3; toys: readonly [number, number]; tipped: boolean; sizes: boolean; skinny: boolean };
  find: { shapes: 2 | 3; options: 2 | 3 | 4; tipped: boolean; skinny: boolean };
  look: { n: readonly [number, number]; arr: readonly Arrangement[]; showMs: number };
  compare: { max: number; minDiff: number; fewer: boolean; same: boolean; spread: boolean };
  size: { outline: boolean; sizes: readonly number[] };
  parade: { n: 3 | 4 | 5; dots: boolean };
}

const SORT3 = { shapes: 3, toys: [3, 3], tipped: false, sizes: false, skinny: false } as const;
const FIND3 = { shapes: 3, options: 3, tipped: false, skinny: false } as const;
const NO_LOOK = { n: [1, 3], arr: ["line", "dice"], showMs: 2500 } as const;
const NO_COMPARE = { max: 4, minDiff: 2, fewer: false, same: false, spread: false } as const;
const NO_SIZE = { outline: true, sizes: [46, 72, 100] } as const;

export const GB_LEVELS: readonly Level[] = [
  {
    games: ["sort", "find"],
    sort: { shapes: 2, toys: [2, 2], tipped: false, sizes: false, skinny: false },
    find: { shapes: 2, options: 2, tipped: false, skinny: false },
    look: NO_LOOK, compare: NO_COMPARE, size: NO_SIZE,
    parade: { n: 3, dots: true },
  },
  {
    games: ["look", "sort", "find"],
    sort: SORT3, find: FIND3, look: NO_LOOK, compare: NO_COMPARE, size: NO_SIZE,
    parade: { n: 3, dots: true },
  },
  {
    games: ["compare", "look", "sort", "find"],
    sort: SORT3, find: FIND3,
    look: { n: [1, 4], arr: ["line", "dice"], showMs: 2500 },
    compare: { max: 4, minDiff: 2, fewer: false, same: false, spread: false },
    size: NO_SIZE,
    parade: { n: 3, dots: true },
  },
  {
    games: ["size", "compare", "look", "sort", "find"],
    sort: SORT3, find: FIND3,
    look: { n: [1, 4], arr: ["line", "dice"], showMs: 2200 },
    compare: { max: 5, minDiff: 2, fewer: true, same: false, spread: false },
    size: { outline: true, sizes: [46, 72, 100] },
    parade: { n: 4, dots: true },
  },
  {
    games: ["compare", "sort", "look", "size", "find"],
    sort: { shapes: 3, toys: [4, 4], tipped: true, sizes: true, skinny: false },
    find: { shapes: 3, options: 3, tipped: true, skinny: false },
    look: { n: [2, 5], arr: ["line", "dice"], showMs: 2200 },
    compare: { max: 5, minDiff: 1, fewer: true, same: true, spread: false },
    size: { outline: false, sizes: [50, 75, 100] },
    parade: { n: 4, dots: true },
  },
  {
    games: ["size", "look", "find", "compare", "sort"],
    sort: { shapes: 3, toys: [4, 4], tipped: true, sizes: true, skinny: false },
    find: { shapes: 3, options: 4, tipped: true, skinny: false },
    look: { n: [2, 5], arr: ["dice", "clumps", "line"], showMs: 2000 },
    compare: { max: 6, minDiff: 1, fewer: true, same: true, spread: false },
    size: { outline: true, sizes: [40, 60, 80, 100] },
    parade: { n: 5, dots: true },
  },
  {
    games: ["compare", "find", "look", "size", "sort"],
    sort: { shapes: 3, toys: [4, 4], tipped: true, sizes: true, skinny: true },
    find: { shapes: 3, options: 4, tipped: true, skinny: true },
    look: { n: [3, 5], arr: ["clumps", "dice"], showMs: 1800 },
    compare: { max: 6, minDiff: 1, fewer: true, same: true, spread: true },
    size: { outline: false, sizes: [44, 63, 82, 100] },
    parade: { n: 5, dots: false },
  },
  {
    games: ["size", "look", "compare", "sort", "find"],
    sort: { shapes: 3, toys: [4, 4], tipped: true, sizes: true, skinny: true },
    find: { shapes: 3, options: 4, tipped: true, skinny: true },
    look: { n: [1, 5], arr: ["line", "dice", "clumps"], showMs: 1500 },
    compare: { max: 6, minDiff: 1, fewer: true, same: true, spread: true },
    size: { outline: false, sizes: [55, 70, 85, 100] },
    parade: { n: 5, dots: false },
  },
];
export const GB_MAX_LEVEL = GB_LEVELS.length - 1;
/** Items per round (roundLength); the last index of every band is the Bubble Parade finale. */
export const BAND = 8;

const clampLevel = (level: number) => Math.max(0, Math.min(GB_MAX_LEVEL, Math.floor(level) || 0));
type Gen = Omit<Exercise, "difficulty">;
const base = (rng: Rng) => ({ ages: GB_AGES, interaction: "choose" as const, seed: rng.int(1, 999_999) });
export const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"] as const;

// ---------------------------------------------------------------- art keys (data only; art.tsx draws them)

/** A foam bath toy: shape, colour, turn (degrees), size (% of the cell) and variant (1 = skinny triangle). */
export const toyArt = (shape: Shape, colour: ToyColour, rot: number, scale: number, skinny: boolean) => `toy~${shape}~${colour}~${rot}~${scale}~${skinny ? 1 : 0}`;
export const holeArt = (shape: Shape) => `hole~${shape}`;
export const thingArt = (thing: WallThing, rot: number, skinny: boolean) => `thing~${thing}~${rot}~${skinny ? 1 : 0}`;
export const sizeArt = (kind: SizeKind, size: number) => `size~${kind}~${size}`;
export const bubbleArt = (k: number, dots: boolean) => `bubble~${k}~${dots ? 1 : 0}`;
export interface ToyArt { shape: Shape; colour: ToyColour; rot: number; scale: number; skinny: boolean }
export function parseToy(art: string | undefined): ToyArt {
  const [, shape = "circle", colour = "red", rot = "0", scale = "100", skinny = "0"] = (art ?? "").split("~");
  return { shape: shape as Shape, colour: colour as ToyColour, rot: Number(rot), scale: Number(scale), skinny: skinny === "1" };
}
export function parseThing(art: string | undefined): { thing: WallThing; shape: Shape; rot: number; skinny: boolean } {
  const [, thing = "mirror", rot = "0", skinny = "0"] = (art ?? "").split("~");
  const t = thing as WallThing;
  return { thing: t, shape: WALL_THINGS[t] ?? "circle", rot: Number(rot), skinny: skinny === "1" };
}
export function parseSize(art: string | undefined): { kind: SizeKind; size: number } {
  const [, kind = "boat", size = "100"] = (art ?? "").split("~");
  return { kind: kind as SizeKind, size: Number(size) };
}
export const holeShape = (art: string | undefined): Shape => ((art ?? "").split("~")[1] ?? "circle") as Shape;

/** A shape is "tipped" when it is turned away from the way it usually sits (square on a corner, triangle not on its base). */
export const isTipped = (shape: Shape, rot: number) => shape !== "circle" && ((shape === "square" ? rot % 90 : rot % 360) !== 0);
/** Turns used for tipped shapes: squares on a corner, triangles upside down or on their side. */
const TURNS: Record<Shape, readonly number[]> = { circle: [0], square: [45], triangle: [90, 180, 270] };

// ---------------------------------------------------------------- Shape Splash: sort (match toy → hole)

export function sortExercise(level: number, rng: Rng, index: number, spec: Level["sort"], tutorial = false): Gen {
  const shapes = SHAPES.slice(0, spec.shapes);
  const holes = rng.shuffle([...shapes]);
  const nToys = rng.int(spec.toys[0], spec.toys[1]);
  // every hole gets a toy before any hole gets a second one
  const owners = rng.shuffle(holes.map((_, i) => i));
  while (owners.length < nToys) owners.push(rng.int(0, holes.length - 1));
  const colours = rng.shuffle([...TOY_COLOURS]);
  let tippedCount = 0;
  const toys = rng.shuffle(owners.slice(0, nToys)).map((h, i) => {
    const shape = holes[h]!;
    // from level 4 about half the square/triangle toys are tipped (at least one when there is a square or triangle)
    const canTip = spec.tipped && shape !== "circle";
    const tip = canTip && (rng.chance(0.5) || tippedCount === 0);
    if (tip) tippedCount++;
    const rot = tip ? rng.pick(TURNS[shape]) : 0;
    const skinny = spec.skinny && shape === "triangle" && rng.chance(0.6);
    const scale = spec.sizes ? rng.pick([62, 80, 100]) : 88;
    return { hole: h, art: toyArt(shape, colours[i % colours.length]!, rot, scale, skinny) };
  });
  const items: AnswerOption[] = toys.map((t, i) => ({ id: `t${i + 1}`, art: t.art }));
  const targets: AnswerOption[] = holes.map((s, i) => ({ id: `h${i + 1}`, art: holeArt(s), text: s }));
  const pairs = Object.fromEntries(toys.map((t, i) => [`t${i + 1}`, `h${t.hole + 1}`]));
  const b = base(rng);
  return {
    ...b,
    id: tutorial ? "gb-sort-tutorial" : `gb-sort-${holes.length}-${items.length}-l${level}n${index}`,
    skillId: SKILL.shape,
    objective: spec.tipped ? "Match shapes in any size or turn to the hole with the same shape" : "Match circles, squares and triangles to the hole with the same shape",
    answer: { kind: "match", pairs, items, targets },
    objectKind: "toy",
    params: { mode: MODES.indexOf("sort") },
    prompt: { line: "gb.prompt.sort", text: "Put each toy in the hole with the same shape!" },
    a11yDescription: `${items.length} foam bath toys float in the water and a toy box has ${holes.length} holes: ${holes.join(", ")}. Put each toy in the hole with the same shape, then press Ready.`,
    ...(tutorial ? { tutorial: true } : {}),
  };
}

// ---------------------------------------------------------------- Shape Splash: find (choice in a wall picture)

export function findExercise(level: number, rng: Rng, index: number, spec: Level["find"]): Gen {
  const shapes = SHAPES.slice(0, spec.shapes);
  const target = shapes[(index + rng.int(0, shapes.length - 1)) % shapes.length]!;
  const others = shapes.filter((s) => s !== target);
  // distractors: one of every other shape first, then repeats of other shapes (never a second target shape)
  const distractorShapes: Shape[] = [];
  for (let i = 0; i < spec.options - 1; i++) distractorShapes.push(i < others.length ? others[i]! : rng.pick(others));
  const used = new Set<WallThing>();
  const make = (shape: Shape, isTarget: boolean) => {
    const pool = THINGS_OF[shape].filter((t) => !used.has(t));
    const thing = rng.pick(pool.length ? pool : THINGS_OF[shape]);
    used.add(thing);
    // tipped levels: the target is tipped more often than not (the misconception is "a tipped square is a diamond")
    const tip = spec.tipped && shape !== "circle" && rng.chance(isTarget ? 0.7 : 0.4);
    const rot = tip ? rng.pick(TURNS[shape]) : 0;
    const skinny = spec.skinny && shape === "triangle" && rng.chance(0.6);
    return { shape, art: thingArt(thing, rot, skinny), isTarget };
  };
  const things = rng.shuffle([make(target, true), ...distractorShapes.map((s) => make(s, false))]);
  const options: AnswerOption[] = things.map((t, i) => ({ id: `o${i + 1}`, art: t.art }));
  const correct = options[things.findIndex((t) => t.isTarget)]!.id;
  const b = base(rng);
  return {
    ...b,
    id: `gb-find-${target}-${options.length}-l${level}n${index}`,
    skillId: SKILL.shape,
    objective: spec.tipped ? "Find a named shape in a picture, even when it is turned or stretched" : "Find a named shape in a picture",
    answer: { kind: "choice", correct, options },
    objectKind: target,
    params: { mode: MODES.indexOf("find"), sh: SHAPES.indexOf(target) },
    prompt: { line: "gb.prompt.find", vars: { shape: target }, text: `Can you find a ${target}?` },
    a11yDescription: `A picture of Gloop's bathroom wall with ${options.length} things on it. Find the one shaped like a ${target}.`,
  };
}

// ---------------------------------------------------------------- Quick Look (number: subitizing)

export interface Spot { x: number; y: number; g: number }
/** Positions of n bubbles (viewBox units) and which little group each belongs to (the first-miss hint rings them). */
export function arrange(n: number, arr: Arrangement, rng: Rng): { spots: Spot[]; w: number; h: number } {
  if (arr === "line") {
    const groups = n <= 2 ? [n] : n === 3 ? [2, 1] : n === 4 ? [2, 2] : [3, 2];
    const spots: Spot[] = [];
    let x = 14;
    groups.forEach((size, g) => {
      for (let i = 0; i < size; i++) {
        spots.push({ x, y: 18, g });
        x += 22;
      }
      x += 12; // a visible gap between little groups
    });
    return { spots, w: x - 12 - 22 + 14, h: 36 };
  }
  if (arr === "dice") {
    const P: Record<number, [number, number, number][]> = {
      1: [[33, 33, 0]],
      2: [[16, 16, 0], [50, 50, 0]],
      3: [[16, 16, 0], [33, 33, 0], [50, 50, 0]],
      4: [[16, 16, 0], [16, 50, 0], [50, 16, 1], [50, 50, 1]],
      5: [[16, 16, 0], [50, 16, 0], [16, 50, 0], [50, 50, 0], [33, 33, 1]],
    };
    const flip = rng.chance(0.5); // mirror the diagonal patterns (2 and 3) for variety
    return { spots: (P[n] ?? P[1]!).map(([x, y, g]) => ({ x: flip ? 66 - x : x, y, g })), w: 66, h: 66 };
  }
  // clumps: two tight little groups (3 + 2, 2 + 2, 2 + 1 …) placed apart, each turned at random
  const sizes = n === 1 ? [1] : n === 2 ? [1, 1] : [Math.ceil(n / 2), Math.floor(n / 2)];
  const SHAPE: Record<number, [number, number][]> = { 1: [[0, 0]], 2: [[-11, 0], [11, 0]], 3: [[-11, 7], [11, 7], [0, -12]] };
  const spots: Spot[] = [];
  sizes.forEach((size, g) => {
    const cx = sizes.length === 1 ? 50 : g === 0 ? 30 : 90;
    const cy = 38 + rng.int(-8, 8);
    const a = (rng.int(0, 7) * Math.PI) / 4;
    for (const [dx, dy] of SHAPE[size]!) spots.push({ x: Math.round(cx + dx * Math.cos(a) - dy * Math.sin(a)), y: Math.round(cy + dx * Math.sin(a) + dy * Math.cos(a)), g });
  });
  return { spots, w: sizes.length === 1 ? 100 : 120, h: 76 };
}

/** Three neighbouring numbers that include n, within 1–5 (one more and one fewer are the typical slips). */
export function lookChoices(n: number): number[] {
  const lo = Math.max(1, Math.min(n - 1, MAX_LOOK - 2));
  return [lo, lo + 1, lo + 2];
}

export function lookExercise(level: number, rng: Rng, index: number, spec: Level["look"]): Gen {
  const n = rng.int(spec.n[0], spec.n[1]);
  // a 5 is always shown with structure (dice or 3 + 2) unless the level allows clumps
  const allowed = spec.arr.filter((a) => n !== 1 || a !== "clumps");
  const arr = rng.pick(allowed);
  const { spots, w, h } = arrange(n, arr, rng);
  const params: Record<string, number> = { mode: MODES.indexOf("look"), n, arr: ARRANGEMENTS.indexOf(arr), show: spec.showMs, w, h };
  spots.forEach((s, i) => {
    params[`x${i}`] = s.x;
    params[`y${i}`] = s.y;
    params[`g${i}`] = s.g;
  });
  const b = base(rng);
  return {
    ...b,
    id: `gb-look-${n}-${arr}-l${level}n${index}`,
    skillId: SKILL.subitize,
    objective: spec.n[1] === MAX_LOOK ? "Recognise a group at a glance by seeing its little groups, and say how many" : "Recognise a small group at a glance and say how many",
    answer: { kind: "number", value: n, choices: lookChoices(n) },
    objectKind: "bubble",
    params,
    prompt: { line: "gb.prompt.look", text: "Watch the bubbles. How many did you see?" },
    a11yDescription: `${n} ${n === 1 ? "bubble pops" : "bubbles pop"} up on the water for a moment${arr === "line" ? ", in a row" : arr === "dice" ? ", like the dots on a dice" : ", in little groups"}. Choose how many you saw. Press Peek to see them again.`,
  };
}

// ---------------------------------------------------------------- More or Fewer (choice: tub a / tub b / same)

export function compareExercise(level: number, rng: Rng, index: number, spec: Level["compare"]): Gen {
  const q: Question = spec.fewer && (index + rng.int(0, 1)) % 2 === 1 ? "fewer" : "more";
  const same = spec.same && rng.chance(0.25);
  let a: number;
  let bCount: number;
  if (same) {
    a = rng.int(2, spec.max);
    bCount = a;
  } else {
    do {
      a = rng.int(1, spec.max);
      bCount = rng.int(1, spec.max);
    } while (Math.abs(a - bCount) < spec.minDiff || (spec.spread && Math.min(a, bCount) < 2)); // one duck can't make a long line
  }
  // the long-line trap: the tub with fewer ducks (or, when equal, one tub) has its ducks spread wider
  const spread = spec.spread ? (a === bCount ? rng.int(1, 2) : a < bCount ? 1 : 2) : 0;
  const correct = a === bCount ? "same" : (q === "more") === a > bCount ? "a" : "b";
  const options: AnswerOption[] = [
    { id: "a", text: "Top tub" },
    { id: "b", text: "Bottom tub" },
    ...(spec.same ? [{ id: "same", text: "Same" }] : []),
  ];
  const line = `gb.prompt.compare.${q}${spec.same ? "Same" : ""}`;
  const text = `Which tub has ${q} ducks?${spec.same ? " Or are they the same?" : ""}`;
  const b = base(rng);
  return {
    ...b,
    id: `gb-compare-${q}-${a}-${bCount}-l${level}n${index}`,
    skillId: SKILL.compare,
    objective: spec.same ? `Compare two groups by matching: ${q}, or the same` : `Compare two groups by matching and say which has ${q}`,
    answer: { kind: "choice", correct, options },
    objectKind: "duck",
    params: { mode: MODES.indexOf("compare"), a, b: bCount, q: q === "more" ? 0 : 1, same: spec.same ? 1 : 0, spread },
    prompt: { line, text },
    a11yDescription: `Two tubs of rubber ducks. The top tub has ${a} ${a === 1 ? "duck" : "ducks"}${spread === 1 ? ", spread out wide" : ""}; the bottom tub has ${bCount} ${bCount === 1 ? "duck" : "ducks"}${spread === 2 ? ", spread out wide" : ""}. Choose the tub with ${q} ducks${spec.same ? ", or Same" : ""}. Pair up draws a line from each duck to a partner.`,
  };
}

// ---------------------------------------------------------------- Size Line (sequence: smallest → biggest)

const SIZE_WORDS3 = ["small", "middle-sized", "big"] as const;
const SIZE_WORDS4 = ["tiny", "small", "big", "biggest"] as const;
export const sizeWord = (rank: number, count: number) => (count === 3 ? SIZE_WORDS3[rank] : SIZE_WORDS4[rank]) ?? "";

export function sizeExercise(level: number, rng: Rng, index: number, spec: Level["size"]): Gen {
  const kind = SIZE_KINDS[(index + rng.int(0, 1)) % SIZE_KINDS.length]!;
  const sizes = spec.sizes;
  const count = sizes.length;
  // shuffle until the row is not already in order (so there is always something to do)
  let perm = rng.shuffle(sizes.map((_, i) => i));
  for (let guard = 0; perm.every((v, i) => v === i) && guard < 8; guard++) perm = rng.shuffle(sizes.map((_, i) => i));
  if (perm.every((v, i) => v === i)) perm = [...perm.slice(1), perm[0]!];
  const pieces: AnswerOption[] = perm.map((rank, i) => ({ id: `p${i + 1}`, art: sizeArt(kind, sizes[rank]!), text: sizeWord(rank, count) }));
  const order = sizes.map((_, rank) => pieces[perm.indexOf(rank)]!.id);
  const b = base(rng);
  return {
    ...b,
    id: `gb-size-${kind}-${count}-l${level}n${index}`,
    skillId: SKILL.order,
    objective: `Put ${count} things in order of size, from smallest to biggest`,
    answer: { kind: "sequence", order, pieces },
    objectKind: kind,
    params: { mode: MODES.indexOf("size"), count, kind: SIZE_KINDS.indexOf(kind), outline: spec.outline ? 1 : 0 },
    prompt: { line: `gb.prompt.size.${kind}`, text: `Line up the ${kind}s, from smallest to biggest!` },
    a11yDescription: `${count} ${kind}s of different sizes float in the water, and the bath edge has ${count} spaces. Put the ${kind}s on the edge from smallest to biggest, then press Ready.`,
  };
}

// ---------------------------------------------------------------- Bubble Parade (finale; sequence 1 → n)

export function paradeExercise(level: number, rng: Rng, index: number, spec: Level["parade"]): Gen {
  const n = spec.n;
  // where each bubble floats in the parade row: never already in counting order left to right
  let slots = rng.shuffle(Array.from({ length: n }, (_, i) => i));
  for (let guard = 0; slots.every((v, i) => v === i) && guard < 8; guard++) slots = rng.shuffle(slots);
  if (slots.every((v, i) => v === i)) slots = [...slots.slice(1), slots[0]!];
  const pieces: AnswerOption[] = Array.from({ length: n }, (_, i) => ({ id: `b${i + 1}`, text: String(i + 1), art: bubbleArt(i + 1, spec.dots) }));
  const params: Record<string, number> = { mode: MODES.indexOf("parade"), n, dots: spec.dots ? 1 : 0 };
  slots.forEach((s, i) => {
    params[`s${i}`] = s;
    params[`j${i}`] = rng.int(0, 2);
  });
  const b = base(rng);
  return {
    ...b,
    id: `gb-parade-${n}${spec.dots ? "-dots" : ""}-l${level}n${index}`,
    skillId: SKILL.oneToOne,
    objective: `Pop each bubble once, in counting order from one to ${n}`,
    answer: { kind: "sequence", order: pieces.map((p) => p.id), pieces },
    objectKind: "bubble",
    closer: true,
    params,
    prompt: { line: "gb.prompt.parade", text: "Bubble parade! Pop them in counting order: 1, 2, 3…" },
    a11yDescription: `The bubble parade: ${n} big bubbles float across the bath, each with a number${spec.dots ? " and that many dots" : ""}. Pop them in counting order, starting with one.`,
  };
}

// ---------------------------------------------------------------- dispatcher

export const generateBubbleBath: ExerciseGenerator = (rawLevel, rng, index) => {
  const level = clampLevel(rawLevel);
  const p = GB_LEVELS[level]!;
  if (index % BAND === BAND - 1) return paradeExercise(level, rng, index, p.parade);
  const mode = p.games[(index % BAND) % p.games.length]!;
  switch (mode) {
    case "sort":
      return sortExercise(level, rng, index, p.sort);
    case "find":
      return findExercise(level, rng, index, p.find);
    case "look":
      return lookExercise(level, rng, index, p.look);
    case "compare":
      return compareExercise(level, rng, index, p.compare);
    case "size":
      return sizeExercise(level, rng, index, p.size);
    case "parade":
      return paradeExercise(level, rng, index, p.parade);
  }
};

// ---------------------------------------------------------------- helpers shared by boards, skin and tests

export const modeOf = (ex: Pick<Exercise, "params">): Mode => MODES[ex.params?.mode ?? 0] ?? "sort";
export const spotsOf = (ex: Pick<Exercise, "params">): Spot[] => {
  const p = ex.params ?? {};
  return Array.from({ length: p.n ?? 0 }, (_, i) => ({ x: p[`x${i}`] ?? 0, y: p[`y${i}`] ?? 0, g: p[`g${i}`] ?? 0 }));
};
export const questionOf = (ex: Pick<Exercise, "params">): Question => ((ex.params?.q ?? 0) === 1 ? "fewer" : "more");
/** Bubble Parade: the parade-row slot of bubble k (1-based) and its little bob offset. */
export const paradeSlots = (ex: Pick<Exercise, "params">): { k: number; slot: number; jitter: number }[] => {
  const p = ex.params ?? {};
  return Array.from({ length: p.n ?? 0 }, (_, i) => ({ k: i + 1, slot: p[`s${i}`] ?? i, jitter: p[`j${i}`] ?? 0 }));
};
