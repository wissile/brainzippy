import type { Exercise } from "../../engine/types";

/**
 * Brix's Budget Bridge — the bridge model, the rule checker and the solvers. Pure TypeScript (no React, no DOM,
 * no randomness): the generator, the board and the tests all use these functions.
 *
 * THE MODEL (docs/worlds/budget-bridge.md §3; spec docs/curriculum/engineering.md §4.3). Game numbers, chosen to
 * teach trade-offs, not real engineering data.
 *  - A gap of G cells (1 cell = 1 plank length) between two banks. Under each cell is solid GROUND or DEEP water.
 *  - Each cell may hold a DECK piece (wood or steel), a PILLAR (a pier one cell wide) and a TRIANGLE brace.
 *  - Supports: the two banks, and every pillar that stands on ground. A deck cell on a pillar rests on it directly.
 *    A pillar in deep water has nothing to stand on, so it holds nothing up (and breaks the "ground" rule).
 *  - A SEGMENT is a run of cells between two supports; its SPAN is the number of cells in it.
 *  - A segment is as strong as its weakest piece: wood if any cell is wood, else steel. Its span must be ≤ the
 *    material's maximum span (wood 3, steel 4). Its capacity comes from the table below; a segment is BRACED only
 *    if every cell in it has a triangle, and a braced segment carries 3 × the table value.
 *  - The LOAD TEST passes when every segment's capacity ≥ the vehicle's load. The vehicle is a single load that
 *    stands on one segment at a time (no dynamic effects, no self-weight, no wind).
 *
 * A design PASSES iff all five rules hold (the engine's `set` answer lists them): every gap cell has a deck
 * (`deck`), every span ≤ its material's max (`span`), every segment holds the vehicle (`load`), every pillar is on
 * ground (`ground`), total cost ≤ budget (`budget`). Any design meeting every rule passes; there is no canonical
 * answer. The board submits the ids of the rules the child's design meets, so a failing design is never "correct".
 */

export type Mat = "wood" | "steel";
export type Piece = Mat | "pillar" | "brace";
export type Vehicle = "scooter" | "car" | "van" | "truck" | "bus";
export type RuleId = "deck" | "span" | "load" | "ground" | "budget";

export interface Cell { deck: Mat | null; pillar: boolean; brace: boolean }
export type Design = readonly Cell[];

export const PIECES: readonly Piece[] = ["wood", "steel", "pillar", "brace"];
export const VEHICLES: readonly Vehicle[] = ["scooter", "car", "van", "truck", "bus"];
export const RULES: readonly RuleId[] = ["deck", "span", "load", "ground", "budget"];

/** Costs in game dollars (spec §4.3, with the triangle at $10 instead of $15, see docs/worlds/budget-bridge.md §4). */
export const COST: Record<Piece, number> = { wood: 10, steel: 25, pillar: 30, brace: 10 };
export const MAX_SPAN: Record<Mat, number> = { wood: 3, steel: 4 };
/** Load units a segment of span s (index) carries, unbraced. 0 = not allowed (longer than the material's max). */
export const CAPACITY: Record<Mat, readonly number[]> = { wood: [0, 4, 2, 1], steel: [0, 10, 6, 3, 2] };
export const BRACE_FACTOR = 3;
export const LOAD: Record<Vehicle, number> = { scooter: 1, car: 2, van: 4, truck: 5, bus: 8 };

export const PIECE_NAME: Record<Piece, string> = { wood: "Wood plank", steel: "Steel beam", pillar: "Pillar", brace: "Triangle brace" };
export const RULE_TEXT: Record<RuleId, string> = {
  deck: "The road covers every gap",
  span: "No span is too long for its material",
  load: "Every span holds the vehicle",
  ground: "Pillars stand on solid ground",
  budget: "It costs no more than the budget",
};

export const emptyCell = (): Cell => ({ deck: null, pillar: false, brace: false });
export const emptyDesign = (gap: number): Cell[] => Array.from({ length: gap }, emptyCell);
export const cellEq = (a: Cell, b: Cell) => a.deck === b.deck && a.pillar === b.pillar && a.brace === b.brace;
export const hasAny = (c: Cell) => !!c.deck || c.pillar || c.brace;

/** The river site of one exercise. `ground[i]` = a pillar may stand under cell i. */
export interface Site {
  gap: number;
  ground: readonly boolean[];
  vehicle: Vehicle;
  budget: number;
  pieces: readonly Piece[];
}

// ---------------------------------------------------------------- cost and segments

export function cellCost(c: Cell): number {
  return (c.deck ? COST[c.deck] : 0) + (c.pillar ? COST.pillar : 0) + (c.brace ? COST.brace : 0);
}
export const costOf = (d: Design): number => d.reduce((s, c) => s + cellCost(c), 0);

/** Capacity of a segment: table value (× 3 when braced); 0 when the span is longer than the material allows. */
export function capacity(mat: Mat, span: number, braced: boolean): number {
  const base = CAPACITY[mat][span] ?? 0;
  return braced ? base * BRACE_FACTOR : base;
}

export interface Segment {
  /** First and last cell (inclusive). */
  start: number;
  end: number;
  span: number;
  /** Weakest material in it; null if a cell has no deck. */
  mat: Mat | null;
  braced: boolean;
  /** Some cells have a triangle but not all (they don't count). */
  partialBrace: boolean;
  capacity: number;
  tooLong: boolean;
  tooWeak: boolean;
  /** Load ÷ capacity (∞ when capacity is 0): drives the sag in the load test. */
  ratio: number;
}

/** A pillar holds the deck up only when it stands on ground. */
export const supports = (site: Pick<Site, "ground">, d: Design, i: number): boolean => !!d[i]?.pillar && !!site.ground[i];

export function segmentsOf(site: Pick<Site, "ground" | "vehicle">, d: Design): Segment[] {
  const out: Segment[] = [];
  const load = LOAD[site.vehicle];
  let i = 0;
  while (i < d.length) {
    if (supports(site, d, i)) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < d.length && !supports(site, d, j + 1)) j++;
    const cells = d.slice(i, j + 1);
    const span = j - i + 1;
    const holes = cells.some((c) => !c.deck);
    const mat: Mat | null = holes ? null : cells.some((c) => c.deck === "wood") ? "wood" : "steel";
    const braces = cells.filter((c) => c.brace).length;
    const braced = braces === span;
    const tooLong = mat !== null && span > MAX_SPAN[mat];
    const cap = mat && !tooLong ? capacity(mat, span, braced) : 0;
    out.push({
      start: i, end: j, span, mat, braced, partialBrace: braces > 0 && !braced, capacity: cap, tooLong,
      tooWeak: cap < load, ratio: cap > 0 ? load / cap : Infinity,
    });
    i = j + 1;
  }
  return out;
}

// ---------------------------------------------------------------- the rule checker (the grader)

export interface Grade {
  rules: Record<RuleId, boolean>;
  passed: RuleId[];
  pass: boolean;
  cost: number;
  segments: Segment[];
  /** Cells without a deck. */
  holes: number[];
  /** Cells with a pillar in deep water. */
  deepPillars: number[];
}

export function grade(site: Site, d: Design): Grade {
  const segments = segmentsOf(site, d);
  const holes = d.flatMap((c, i) => (c.deck ? [] : [i]));
  const deepPillars = d.flatMap((c, i) => (c.pillar && !site.ground[i] ? [i] : []));
  const cost = costOf(d);
  const rules: Record<RuleId, boolean> = {
    deck: d.length === site.gap && holes.length === 0,
    span: segments.every((s) => !s.tooLong),
    load: segments.every((s) => s.mat !== null && !s.tooLong && !s.tooWeak),
    ground: deepPillars.length === 0,
    budget: cost <= site.budget,
  };
  const passed = RULES.filter((r) => rules[r]);
  return { rules, passed, pass: passed.length === RULES.length, cost, segments, holes, deepPillars };
}

// ---------------------------------------------------------------- diagnosis (which first-miss line)

export type Diagnosis = "ground" | "brace" | "span" | "budget" | "improve" | "ok";

/**
 * The misconception behind a miss (spec §4.5), most basic first: a pillar in deep water; triangles that cover
 * only part of a weak span; a span that bends; over budget. At the improve level, changing parts that were never
 * weak is "failure means start over" and gets its own line.
 */
export function diagnose(site: Site, d: Design, improve?: { given: Design; weak: readonly [number, number] }): Diagnosis {
  const g = grade(site, d);
  if (g.pass) return "ok";
  if (improve && d.some((c, i) => (i < improve.weak[0] || i > improve.weak[1]) && !cellEq(c, improve.given[i]!))) return "improve";
  if (!g.rules.ground) return "ground";
  const weak = g.segments.filter((s) => s.tooLong || s.tooWeak);
  if (weak.some((s) => s.partialBrace)) return "brace";
  if (weak.length) return "span";
  return "budget";
}

// ---------------------------------------------------------------- solvers

const can = (site: Site, p: Piece) => site.pieces.includes(p);

/** Cheapest uniform way to build one segment of `span` cells: [cost, material, braced] or null. */
export function segmentOptions(site: Site, span: number): { mat: Mat; braced: boolean; cost: number }[] {
  const load = LOAD[site.vehicle];
  const out: { mat: Mat; braced: boolean; cost: number }[] = [];
  for (const mat of ["wood", "steel"] as const) {
    if (!can(site, mat)) continue;
    for (const braced of can(site, "brace") ? [false, true] : [false]) {
      if (span > MAX_SPAN[mat] || capacity(mat, span, braced) < load) continue;
      out.push({ mat, braced, cost: span * (COST[mat] + (braced ? COST.brace : 0)) });
    }
  }
  return out.sort((a, b) => a.cost - b.cost);
}

/** A "plan": which ground cells get pillars, and how each segment is built (uniform material, braced or not). */
export interface Plan { design: Cell[]; cost: number }

const cheapDeck = (site: Site): Mat => (can(site, "wood") ? "wood" : "steel");
const groundCells = (site: Site) => site.ground.flatMap((g, i) => (g ? [i] : []));

/** Every pillar layout the site allows (subsets of ground cells; just [] when pillars aren't available). */
function pillarLayouts(site: Site): number[][] {
  const gc = can(site, "pillar") ? groundCells(site) : [];
  const out: number[][] = [];
  for (let m = 0; m < 1 << gc.length; m++) out.push(gc.filter((_, k) => m & (1 << k)));
  return out;
}

function runsBetween(gap: number, pillars: readonly number[]): [number, number][] {
  const runs: [number, number][] = [];
  let a = 0;
  for (let i = 0; i <= gap; i++) {
    if (i === gap || pillars.includes(i)) {
      if (i > a) runs.push([a, i - 1]);
      a = i + 1;
    }
  }
  return runs;
}

/**
 * Valid plans with cost ≤ `limit` (all of them up to `max`). Non-uniform designs never need listing: a segment
 * that mixes materials is only as strong as wood and a partly braced one only as strong as unbraced, so each
 * valid design costs at least as much as a plan with the same pillars that is also valid.
 */
export function plansWithin(site: Site, limit: number, max = Infinity): Plan[] {
  const out: Plan[] = [];
  for (const pillars of pillarLayouts(site)) {
    const runs = runsBetween(site.gap, pillars);
    const opts = runs.map(([a, b]) => segmentOptions(site, b - a + 1));
    if (opts.some((o) => o.length === 0)) continue;
    const base = pillars.length * (COST.pillar + COST[cheapDeck(site)]);
    const pick = (k: number, cost: number, chosen: { mat: Mat; braced: boolean }[]) => {
      if (out.length >= max || cost > limit) return;
      if (k === runs.length) {
        const design = emptyDesign(site.gap);
        for (const p of pillars) design[p] = { deck: cheapDeck(site), pillar: true, brace: false };
        runs.forEach(([a, b], r) => {
          for (let i = a; i <= b; i++) design[i] = { deck: chosen[r]!.mat, pillar: false, brace: chosen[r]!.braced };
        });
        out.push({ design, cost });
        return;
      }
      for (const o of opts[k]!) pick(k + 1, cost + o.cost, [...chosen, o]);
    };
    pick(0, base, []);
  }
  return out;
}

/** The cheapest valid design (ties: fewest pillars, then layout order). Null when nothing works. */
export function cheapest(site: Site): Plan | null {
  let best: Plan | null = null;
  const pillars = (p: Plan) => p.design.filter((c) => c.pillar).length;
  for (const p of plansWithin(site, Infinity)) {
    if (!best || p.cost < best.cost || (p.cost === best.cost && pillars(p) < pillars(best))) best = p;
  }
  return best;
}

/** The cheapest valid design whose deck is steel on every cell (spec §4.4: at L4 it must cost more than B). */
export function cheapestAllSteel(site: Site): number {
  const steelOnly = { ...site, pieces: site.pieces.filter((p) => p !== "wood") };
  return cheapest(steelOnly)?.cost ?? Infinity;
}

/**
 * Exhaustive search over every cell setting (deck wood/steel, pillar if ground, triangle) — the spec's solver.
 * Used by the tests to prove `cheapest` right; fine for G ≤ 5 (≤ 8^5 designs).
 */
export function bruteForceCheapest(site: Site): number {
  const choices: Cell[] = [];
  for (const deck of (["wood", "steel"] as const).filter((m) => can(site, m)))
    for (const pillar of can(site, "pillar") ? [false, true] : [false])
      for (const brace of can(site, "brace") ? [false, true] : [false]) choices.push({ deck, pillar, brace });
  let best = Infinity;
  const d: Cell[] = emptyDesign(site.gap);
  const rec = (i: number) => {
    if (i === site.gap) {
      if (grade({ ...site, budget: Infinity }, d).pass) best = Math.min(best, costOf(d));
      return;
    }
    for (const c of choices) {
      if (c.pillar && !site.ground[i]) continue;
      d[i] = c;
      rec(i + 1);
    }
  };
  rec(0);
  return best;
}

/**
 * Improve level: the cheapest way to change ONLY cells a..b of `given` so the whole bridge passes (budget aside).
 * Exhaustive over the region (a segment of ≤ 4 cells: ≤ 4,096 settings).
 */
export function cheapestFix(site: Site, given: Design, a: number, b: number): Plan | null {
  const choices: Cell[] = [];
  for (const deck of (["wood", "steel"] as const).filter((m) => can(site, m)))
    for (const pillar of can(site, "pillar") ? [false, true] : [false])
      for (const brace of can(site, "brace") ? [false, true] : [false]) choices.push({ deck, pillar, brace });
  let best: Plan | null = null;
  const d: Cell[] = given.map((c) => ({ ...c }));
  const free = { ...site, budget: Infinity };
  const rec = (i: number) => {
    if (i > b) {
      if (grade(free, d).pass) {
        const cost = costOf(d);
        if (!best || cost < best.cost) best = { design: d.map((c) => ({ ...c })), cost };
      }
      return;
    }
    for (const c of choices) {
      if (c.pillar && !site.ground[i]) continue;
      d[i] = c;
      rec(i + 1);
    }
  };
  rec(a);
  return best;
}

// ---------------------------------------------------------------- params encoding (Exercise.params is numbers only)

export type Mode = "build" | "deep" | "improve";
const MODES: readonly Mode[] = ["build", "deep", "improve"];

/** Everything the board needs, decoded from `Exercise.params`. */
export interface Puzzle extends Site {
  mode: Mode;
  /** The solver's design (cheapest, or for improve: the given bridge with its cheapest fix): the 2nd-miss ghost. */
  solution: Cell[];
  /** Improve level: the pre-built bridge and its weak segment. */
  given: Cell[] | null;
  weak: [number, number] | null;
  /** Cheapest valid cost C*. */
  best: number;
}

const cellCode = (c: Cell) => (c.deck === "wood" ? 1 : c.deck === "steel" ? 2 : 0) + (c.pillar ? 4 : 0) + (c.brace ? 8 : 0);
const codeCell = (n: number): Cell => ({ deck: (n & 3) === 1 ? "wood" : (n & 3) === 2 ? "steel" : null, pillar: !!(n & 4), brace: !!(n & 8) });

export function encodePuzzle(pz: Puzzle): Record<string, number> {
  const q: Record<string, number> = {
    gap: pz.gap,
    groundMask: pz.ground.reduce((m, g, i) => m | (g ? 1 << i : 0), 0),
    vehicle: VEHICLES.indexOf(pz.vehicle),
    load: LOAD[pz.vehicle],
    budget: pz.budget,
    amount: pz.budget,
    pieceMask: pz.pieces.reduce((m, p) => m | (1 << PIECES.indexOf(p)), 0),
    mode: MODES.indexOf(pz.mode),
    best: pz.best,
    weakA: pz.weak?.[0] ?? -1,
    weakB: pz.weak?.[1] ?? -1,
  };
  pz.solution.forEach((c, i) => (q[`sol${i}`] = cellCode(c)));
  pz.given?.forEach((c, i) => (q[`giv${i}`] = cellCode(c)));
  return q;
}

export function decodePuzzle(ex: Pick<Exercise, "params">): Puzzle {
  const q = ex.params ?? {};
  const n = (k: string) => q[k] ?? 0;
  const gap = n("gap") || 1;
  const mode = MODES[n("mode")] ?? "build";
  const weakA = q.weakA ?? -1;
  return {
    gap,
    ground: Array.from({ length: gap }, (_, i) => !!(n("groundMask") & (1 << i))),
    vehicle: VEHICLES[n("vehicle")] ?? "scooter",
    budget: n("budget"),
    pieces: PIECES.filter((_, k) => n("pieceMask") & (1 << k)),
    mode,
    best: n("best"),
    solution: Array.from({ length: gap }, (_, i) => codeCell(n(`sol${i}`))),
    given: mode === "improve" ? Array.from({ length: gap }, (_, i) => codeCell(n(`giv${i}`))) : null,
    weak: weakA >= 0 ? [weakA, q.weakB ?? weakA] : null,
  };
}

/** The design the board starts from: the pre-built bridge at the improve level, else an empty gap. */
export const initialDesign = (pz: Puzzle): Cell[] => (pz.given ? pz.given.map((c) => ({ ...c })) : emptyDesign(pz.gap));

// ---------------------------------------------------------------- editing

/** Put a piece on a cell: a deck replaces the other material; pillar and triangle toggle on and off. */
export function placePiece(d: Design, i: number, p: Piece): Cell[] {
  return d.map((c, k) => {
    if (k !== i) return c;
    if (p === "wood" || p === "steel") return { ...c, deck: c.deck === p ? null : p };
    if (p === "pillar") return { ...c, pillar: !c.pillar };
    return { ...c, brace: !c.brace };
  });
}
/** Add a piece if it's missing (never takes one away): drag-and-drop and keyboard number keys. */
export function addPiece(d: Design, i: number, p: Piece): Cell[] {
  const c = d[i];
  if (!c) return [...d];
  const has = p === "pillar" ? c.pillar : p === "brace" ? c.brace : c.deck === p;
  return has ? [...d] : placePiece(d, i, p);
}
export const clearCell = (d: Design, i: number): Cell[] => d.map((c, k) => (k === i ? emptyCell() : c));
export const cellHas = (c: Cell, p: Piece) => (p === "pillar" ? c.pillar : p === "brace" ? c.brace : c.deck === p);

/** Pieces of the solution still missing from a cell (the ghost), in build order. */
export function missingPieces(cur: Cell, want: Cell): Piece[] {
  const out: Piece[] = [];
  if (want.pillar && !cur.pillar) out.push("pillar");
  if (want.deck && cur.deck !== want.deck) out.push(want.deck);
  if (want.brace && !cur.brace) out.push("brace");
  return out;
}
/** Second miss: keep only the pieces that agree with the solution (the rest of the solution shows as a ghost). */
export function modelStart(d: Design, sol: Design): Cell[] {
  return d.map((c, i) => {
    const w = sol[i]!;
    return { deck: c.deck === w.deck ? c.deck : null, pillar: c.pillar && w.pillar, brace: c.brace && w.brace };
  });
}

// ---------------------------------------------------------------- words (a11y, captions)

export function cellWords(site: Pick<Site, "gap" | "ground">, c: Cell, i: number): string {
  const parts = [`Gap ${i + 1} of ${site.gap}`, site.ground[i] ? "solid ground below" : "deep water below"];
  if (!hasAny(c)) parts.push("empty");
  if (c.pillar) parts.push("pillar");
  if (c.deck) parts.push(`${c.deck} deck`);
  if (c.brace) parts.push("triangle brace");
  return parts.join(", ");
}
export function segmentWords(site: Pick<Site, "vehicle">, s: Segment): string {
  const where = s.span === 1 ? `Gap ${s.start + 1}` : `Gaps ${s.start + 1} to ${s.end + 1}`;
  if (s.mat === null) return `${where}: missing a deck.`;
  if (s.tooLong) return `${where}: a ${s.span}-cell ${s.mat} span is too long. ${s.mat === "wood" ? "Wood" : "Steel"} can span ${MAX_SPAN[s.mat]} at most.`;
  const verdict = s.tooWeak ? "too weak" : "OK";
  return `${where}: ${s.braced ? "braced " : ""}${s.mat}, holds ${s.capacity}; the ${site.vehicle} weighs ${LOAD[site.vehicle]}. ${verdict}.`;
}
export function siteWords(site: Site): string {
  const deep = site.ground.flatMap((g, i) => (g ? [] : [i + 1]));
  return `A river gap ${site.gap} ${site.gap === 1 ? "cell" : "cells"} wide. ${deep.length ? `Deep water under ${deep.length === 1 ? "gap" : "gaps"} ${deep.join(", ")}; pillars only fit on solid ground.` : "Solid ground under every gap."} The ${site.vehicle} weighs ${LOAD[site.vehicle]}. Budget ${site.budget} dollars.`;
}
