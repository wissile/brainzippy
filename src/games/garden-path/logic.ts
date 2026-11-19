import type { AnswerOption, Exercise } from "../../engine/types";

/**
 * Toggle's Garden Path — pure program/grid logic (no React, no DOM). Used by the generator, the board and tests.
 *
 * A puzzle is a garden grid (start, goal, rocks, berries to visit in order) plus a program strip of `slots`
 * top-level spaces. A program is a list of blocks: absolute moves (up/right/down/left) and, from level 6,
 * `repeat n [body]` with a body of 1–2 moves. Empty spaces are holes and simply do nothing.
 *
 * Correctness is decided by SIMULATION (docs/curriculum/computer-science.md §4.3): a program passes iff, after
 * running every block, Toggle stands on the goal, every berry was visited in order, and no move bumped into a
 * rock or the fence. Any such program passes — there is no single canonical answer. The engine's `sequence`
 * answer holds the checkpoints of a successful run (start → berry → goal); the board submits the checkpoints
 * the child's run actually reached, so a failed run is always a strict prefix (never "correct", never ignored).
 */

export type Dir = "up" | "right" | "down" | "left";
export const DIRS: readonly Dir[] = ["up", "right", "down", "left"];
const DIR_CODE: Record<Dir, number> = { up: 1, right: 2, down: 3, left: 4 };
const CODE_DIR: readonly (Dir | null)[] = [null, "up", "right", "down", "left"];
export const DELTA: Record<Dir, readonly [number, number]> = { up: [-1, 0], right: [0, 1], down: [1, 0], left: [0, -1] };
export const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
export const perpendicular = (d: Dir): readonly Dir[] => (d === "up" || d === "down" ? ["left", "right"] : ["up", "down"]);

export interface MoveBlock { t: "move"; d: Dir }
export interface RepeatBlock { t: "repeat"; n: number; body: readonly (Dir | null)[] }
export type Block = MoveBlock | RepeatBlock;
export type Slot = Block | null;
export type Program = readonly Slot[];

export const REPEAT_MIN = 2;
export const REPEAT_MAX = 5;

/**
 * build       reach the goal (levels 0–3)
 * via         visit the berry first, then go home (level 4, decomposition)
 * debug       one block of the given program is wrong (level 5)
 * repeat      a straight run that only fits with a repeat card (level 6)
 * stairs      a staircase: one repeat with a two-move body (level 7)
 * debug-loop  the given repeat card has a wrong count or a wrong body move (level 8)
 */
export type Mode = "build" | "via" | "debug" | "repeat" | "stairs" | "debug-loop";
export const MODES: readonly Mode[] = ["build", "via", "debug", "repeat", "stairs", "debug-loop"];
export const isDebugMode = (m: Mode) => m === "debug" || m === "debug-loop";

export interface Puzzle {
  cols: number;
  rows: number;
  start: number;
  goal: number;
  rocks: readonly number[];
  /** Visited in this order before the goal. */
  berries: readonly number[];
  /** Top-level program spaces (the block budget). */
  slots: number;
  palette: readonly Dir[];
  repeat: boolean;
  /** Spaces inside a repeat card's body. */
  bodySlots: number;
  mode: Mode;
  /** The intended (minimal) solution. */
  solution: Program;
  /** Debug levels: the buggy program already in the strip (length = slots). */
  given: Program | null;
  /** Debug levels: where the bug is. */
  bug: { top: number; body: number; kind: "dir" | "count" } | null;
}

// ---------------------------------------------------------------- cells

export const cellOf = (pz: Pick<Puzzle, "cols">, r: number, c: number) => r * pz.cols + c;
export const rc = (pz: Pick<Puzzle, "cols">, cell: number): [number, number] => [Math.floor(cell / pz.cols), cell % pz.cols];
/** The neighbour in direction d, or -1 off the grid. */
export function stepCell(pz: Pick<Puzzle, "cols" | "rows">, cell: number, d: Dir): number {
  const [r, c] = rc(pz, cell);
  const nr = r + DELTA[d][0];
  const nc = c + DELTA[d][1];
  return nr < 0 || nc < 0 || nr >= pz.rows || nc >= pz.cols ? -1 : cellOf(pz, nr, nc);
}
/** Cells visited by a list of moves from `start` (inclusive of start), or null if it leaves the grid. */
export function walk(pz: Pick<Puzzle, "cols" | "rows">, start: number, moves: readonly Dir[]): number[] | null {
  const cells = [start];
  let at = start;
  for (const d of moves) {
    at = stepCell(pz, at, d);
    if (at < 0) return null;
    cells.push(at);
  }
  return cells;
}

// ---------------------------------------------------------------- programs

export interface Step { d: Dir; top: number; /** body index inside a repeat, -1 for a plain move */ body: number; /** repeat round (0-based) */ iter: number }

/** Flatten a program into the moves it makes, in order. Holes do nothing. */
export function expand(p: Program): Step[] {
  const steps: Step[] = [];
  p.forEach((b, top) => {
    if (!b) return;
    if (b.t === "move") steps.push({ d: b.d, top, body: -1, iter: 0 });
    else for (let iter = 0; iter < b.n; iter++) b.body.forEach((d, body) => d && steps.push({ d, top, body, iter }));
  });
  return steps;
}
export const movesOf = (p: Program): Dir[] => expand(p).map((s) => s.d);
/** Top-level blocks used (holes don't count). */
export const blocksUsed = (p: Program) => p.filter(Boolean).length;
export const hasMoves = (p: Program) => expand(p).length > 0;
export const sameBlock = (a: Slot, b: Slot): boolean => {
  if (!a || !b) return a === b;
  if (a.t === "move" || b.t === "move") return a.t === b.t && (a as MoveBlock).d === (b as MoveBlock).d;
  return a.n === b.n && a.body.length === b.body.length && a.body.every((d, i) => d === b.body[i]);
};
export const move = (d: Dir): MoveBlock => ({ t: "move", d });
export const repeat = (n: number, body: readonly (Dir | null)[]): RepeatBlock => ({ t: "repeat", n, body });

// ---------------------------------------------------------------- simulation

export const berryId = (i: number) => (i === 0 ? "berry" : `berry${i + 1}`);

export interface RunResult {
  steps: Step[];
  /** Cell after each executed move; cells[0] = start. A bumping move adds nothing. */
  cells: number[];
  bump: { step: number; kind: "rock" | "edge"; target: number } | null;
  berriesGot: number;
  end: number;
  success: boolean;
  /** Checkpoints reached in order: start, berries, goal (the value the board submits). */
  checkpoints: string[];
}

export function run(pz: Puzzle, p: Program): RunResult {
  const steps = expand(p);
  const cells = [pz.start];
  let at = pz.start;
  let got = 0;
  let bump: RunResult["bump"] = null;
  for (let i = 0; i < steps.length; i++) {
    const next = stepCell(pz, at, steps[i]!.d);
    if (next < 0 || pz.rocks.includes(next)) {
      bump = { step: i, kind: next < 0 ? "edge" : "rock", target: next };
      break;
    }
    at = next;
    cells.push(at);
    if (got < pz.berries.length && at === pz.berries[got]) got++;
  }
  const success = !bump && steps.length > 0 && at === pz.goal && got === pz.berries.length;
  const checkpoints = ["start", ...pz.berries.slice(0, got).map((_, i) => berryId(i)), ...(success ? ["goal"] : [])];
  return { steps, cells, bump, berriesGot: got, end: at, success, checkpoints };
}

/** The engine answer for a puzzle: every checkpoint in order. Pieces carry art keys for completeness. */
export function answerFor(pz: Puzzle): Extract<Exercise["answer"], { kind: "sequence" }> {
  const pieces: AnswerOption[] = [
    { id: "start", text: "Start", art: "start" },
    ...pz.berries.map((_, i) => ({ id: berryId(i), text: "Berry", art: "berry" })),
    { id: "goal", text: pz.berries.length ? "Home" : "Berry", art: pz.berries.length ? "home" : "berry" },
  ];
  return { kind: "sequence", order: pieces.map((x) => x.id), pieces };
}

// ---------------------------------------------------------------- distances

/** BFS distance (moves) from `from` to every cell, avoiding rocks. Infinity = unreachable. */
export function distances(pz: Puzzle, from: number): number[] {
  const n = pz.cols * pz.rows;
  const dist = Array<number>(n).fill(Infinity);
  if (pz.rocks.includes(from)) return dist;
  dist[from] = 0;
  const q = [from];
  for (let h = 0; h < q.length; h++) {
    const cur = q[h]!;
    for (const d of DIRS) {
      const nb = stepCell(pz, cur, d);
      if (nb < 0 || pz.rocks.includes(nb) || dist[nb] !== Infinity) continue;
      dist[nb] = dist[cur]! + 1;
      q.push(nb);
    }
  }
  return dist;
}

/** Moves still needed from `cell` having collected `got` berries: next berries in order, then the goal. */
export function remainingFn(pz: Puzzle): (cell: number, got: number) => number {
  const targets = [...pz.berries, pz.goal];
  const maps = targets.map((t) => distances(pz, t));
  const tail = targets.map((_, k) => {
    let s = 0;
    for (let j = k; j < targets.length - 1; j++) s += maps[j + 1]![targets[j]!]!;
    return s;
  });
  return (cell, got) => maps[got]![cell]! + tail[got]!;
}
/** The fewest moves that solve the puzzle (rocks, berry order included). */
export const shortestMoves = (pz: Puzzle) => remainingFn(pz)(pz.start, 0);

// ---------------------------------------------------------------- diagnosis (first miss)

export type Diagnosis =
  | { kind: "ok" }
  | { kind: "empty" }
  /** a move bumps a rock or the fence (not after reaching the goal) */
  | { kind: "bump"; step: number; top: number; body: number; iter: number; what: "rock" | "edge" }
  /** a move takes Toggle further from where it needs to go (wrong direction) */
  | { kind: "away"; step: number; top: number; body: number; iter: number }
  /** Toggle reached the goal and kept going (counted the start square, or one card too many) */
  | { kind: "tooFar"; step: number; top: number; body: number; iter: number }
  /** the program ran out before the goal (one card too few) */
  | { kind: "short"; top: number }
  /** Toggle went home without the berry (decomposition) */
  | { kind: "skipBerry"; step: number; top: number; body: number; iter: number }
  /** the repeat count is one off: n ± 1 would work */
  | { kind: "repeatCount"; top: number; more: boolean };

/**
 * Why a program fails, and which block to wobble: the FIRST step that goes wrong (§4.5–4.6).
 * Order: repeat count off by one → went home without the berry → first bump / move away / overshoot → too short.
 */
export function diagnose(pz: Puzzle, p: Program): Diagnosis {
  const res = run(pz, p);
  if (res.success) return { kind: "ok" };
  if (res.steps.length === 0) return { kind: "empty" };

  for (let top = 0; top < p.length; top++) {
    const b = p[top];
    if (!b || b.t !== "repeat" || !b.body.some(Boolean)) continue;
    for (const delta of [1, -1]) {
      const n = b.n + delta;
      if (n < 1) continue;
      const alt = p.map((x, i) => (i === top ? repeat(n, b.body) : x));
      if (run(pz, alt).success) return { kind: "repeatCount", top, more: delta > 0 };
    }
  }

  const remaining = remainingFn(pz);
  let firstWrong: Exclude<Diagnosis, { kind: "ok" | "empty" | "short" | "repeatCount" | "skipBerry" }> | null = null;
  let at = pz.start;
  let got = 0;
  let prev = remaining(at, got);
  for (let i = 0; i < res.steps.length && !firstWrong; i++) {
    const s = res.steps[i]!;
    const where = { step: i, top: s.top, body: s.body, iter: s.iter };
    if (res.bump && res.bump.step === i) {
      firstWrong = prev === 0 ? { kind: "tooFar", ...where } : { kind: "bump", ...where, what: res.bump.kind };
      break;
    }
    at = res.cells[i + 1]!;
    if (got < pz.berries.length && at === pz.berries[got]) got++;
    const now = remaining(at, got);
    if (prev === 0) firstWrong = { kind: "tooFar", ...where };
    else if (now > prev) firstWrong = { kind: "away", ...where };
    prev = now;
  }
  if (!res.bump && res.end === pz.goal && res.berriesGot < pz.berries.length) {
    const last = res.steps[res.steps.length - 1]!;
    const w = firstWrong ?? { step: res.steps.length - 1, top: last.top, body: last.body, iter: last.iter };
    return { kind: "skipBerry", step: w.step, top: w.top, body: w.body, iter: w.iter };
  }
  if (firstWrong) return firstWrong;
  const hole = p.findIndex((b) => !b);
  return { kind: "short", top: hole >= 0 ? hole : p.length - 1 };
}

// ---------------------------------------------------------------- solver (tests, generator checks)

/** Every block a child could place on this puzzle (moves from the palette; repeats with every count and body). */
export function blockChoices(pz: Puzzle): Block[] {
  const out: Block[] = pz.palette.map(move);
  if (!pz.repeat) return out;
  const bodies: Dir[][] = pz.palette.map((d) => [d]);
  if (pz.bodySlots >= 2) for (const a of pz.palette) for (const b of pz.palette) bodies.push([a, b]);
  for (let n = REPEAT_MIN; n <= REPEAT_MAX; n++) for (const body of bodies) out.push(repeat(n, body));
  return out;
}

/** The fewest top-level blocks of any passing program with at most `max` blocks, or null if none exists. */
export function minBlocks(pz: Puzzle, max = pz.slots): number | null {
  const choices = blockChoices(pz);
  // non-repeat puzzles: blocks = moves, so BFS already knows the answer
  if (!pz.repeat) {
    const m = shortestMoves(pz);
    return m <= max ? m : null;
  }
  for (let k = 1; k <= max; k++) {
    const prog: Block[] = [];
    const search = (depth: number): boolean => {
      if (depth === k) return run(pz, prog).success;
      for (const b of choices) {
        prog.push(b);
        if (search(depth + 1)) return true;
        prog.pop();
      }
      return false;
    };
    if (search(0)) return k;
  }
  return null;
}

// ---------------------------------------------------------------- params encoding (Exercise.params is numbers only)

function encodeProgram(prefix: string, p: Program, out: Record<string, number>) {
  out[`${prefix}Len`] = p.length;
  p.forEach((b, i) => {
    if (!b) out[`${prefix}${i}`] = 0;
    else if (b.t === "move") out[`${prefix}${i}`] = DIR_CODE[b.d];
    else {
      out[`${prefix}${i}`] = 5;
      out[`${prefix}${i}n`] = b.n;
      out[`${prefix}${i}bl`] = b.body.length;
      b.body.forEach((d, j) => (out[`${prefix}${i}b${j}`] = d ? DIR_CODE[d] : 0));
    }
  });
}
function decodeProgram(prefix: string, q: Readonly<Record<string, number>>): Slot[] {
  const len = q[`${prefix}Len`] ?? 0;
  return Array.from({ length: len }, (_, i) => {
    const code = q[`${prefix}${i}`] ?? 0;
    if (code === 5) {
      const bl = q[`${prefix}${i}bl`] ?? 1;
      return repeat(q[`${prefix}${i}n`] ?? REPEAT_MIN, Array.from({ length: bl }, (_, j) => CODE_DIR[q[`${prefix}${i}b${j}`] ?? 0] ?? null));
    }
    const d = CODE_DIR[code];
    return d ? move(d) : null;
  });
}

export function encodePuzzle(pz: Puzzle): Record<string, number> {
  const q: Record<string, number> = {
    cols: pz.cols, rows: pz.rows, start: pz.start, goal: pz.goal, slots: pz.slots,
    pal: pz.palette.reduce((m, d) => m | (1 << (DIR_CODE[d] - 1)), 0),
    rep: pz.repeat ? 1 : 0, bodySlots: pz.bodySlots, mode: MODES.indexOf(pz.mode),
    nRocks: pz.rocks.length, nBerries: pz.berries.length,
    bugTop: pz.bug?.top ?? -1, bugBody: pz.bug?.body ?? -1, bugKind: pz.bug ? (pz.bug.kind === "dir" ? 0 : 1) : -1,
    moves: movesOf(pz.solution).length,
  };
  pz.rocks.forEach((c, i) => (q[`rock${i}`] = c));
  pz.berries.forEach((c, i) => (q[`berry${i}`] = c));
  encodeProgram("sol", pz.solution, q);
  if (pz.given) encodeProgram("giv", pz.given, q);
  return q;
}

export function decodePuzzle(ex: Pick<Exercise, "params">): Puzzle {
  const q = ex.params ?? {};
  const n = (k: string) => q[k] ?? 0;
  const pal = n("pal");
  const bugTop = q.bugTop ?? -1;
  return {
    cols: n("cols") || 5, rows: n("rows") || 5, start: n("start"), goal: n("goal"), slots: n("slots"),
    palette: DIRS.filter((d) => pal & (1 << (DIR_CODE[d] - 1))),
    repeat: n("rep") === 1, bodySlots: n("bodySlots") || 1, mode: MODES[n("mode")] ?? "build",
    rocks: Array.from({ length: n("nRocks") }, (_, i) => n(`rock${i}`)),
    berries: Array.from({ length: n("nBerries") }, (_, i) => n(`berry${i}`)),
    solution: decodeProgram("sol", q),
    given: q.givLen !== undefined ? decodeProgram("giv", q) : null,
    bug: bugTop >= 0 ? { top: bugTop, body: q.bugBody ?? -1, kind: q.bugKind === 1 ? "count" : "dir" } : null,
  };
}

// ---------------------------------------------------------------- words (a11y, captions)

export const DIR_WORD: Record<Dir, string> = { up: "up", right: "right", down: "down", left: "left" };
export function blockWords(b: Slot): string {
  if (!b) return "empty";
  if (b.t === "move") return DIR_WORD[b.d];
  const body = b.body.map((d) => (d ? DIR_WORD[d] : "empty")).join(", ");
  return `repeat ${b.n} times: ${body}`;
}
/** "row 2, square 4" (1-based, as spoken). */
export function placeWords(pz: Puzzle, cell: number): string {
  const [r, c] = rc(pz, cell);
  return pz.rows === 1 ? `square ${c + 1}` : `row ${r + 1}, square ${c + 1}`;
}
/** The text grid description (§4.10), updated after every move. */
export function describeGarden(pz: Puzzle, toggleAt: number = pz.start, berriesGot = 0): string {
  const parts = [`Toggle is on ${placeWords(pz, toggleAt)}.`];
  pz.berries.forEach((b, i) => parts.push(i < berriesGot ? `Berry eaten.` : `Berry: ${placeWords(pz, b)}.`));
  parts.push(`${pz.berries.length ? "Home" : "Berry bush"}: ${placeWords(pz, pz.goal)}.`);
  if (pz.rocks.length) parts.push(`${pz.rocks.length === 1 ? "Rock" : "Rocks"}: ${pz.rocks.map((r) => placeWords(pz, r)).join("; ")}.`);
  return parts.join(" ");
}
