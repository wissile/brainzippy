import type { Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";
import {
  DIRS, type Dir, type Mode, type Program, type Puzzle, answerFor, blockWords, describeGarden, diagnose, encodePuzzle, expand,
  move, movesOf, perpendicular, remainingFn, repeat, run, shortestMoves, stepCell, walk,
} from "./logic";

/**
 * Toggle's Garden Path — solution-first puzzle generator (docs/curriculum/computer-science.md §4.4).
 * Pure: same (level, rng, index) → same puzzle. For every puzzle we
 *   1. build the intended solution program P for the level,
 *   2. pick a start so P's path stays on the grid,
 *   3. put the goal (and berry) on the path and rocks only OFF the path, chosen to block the obvious other route,
 *   4. set the block budget, then verify by simulation + BFS that P passes, that P is a shortest solution, and
 *      (debug levels) that the given program fails with its first wrong step exactly at the bug.
 * A candidate that fails any check is redrawn from the same rng stream (still deterministic).
 *
 * Level (0-based) → puzzle (docs/worlds/garden-path.md has the full table):
 *   0  strip 1×5, 1–2 moves, one arrow card (tutorial level)          spaces = moves
 *   1  strip 1×5, 1–3 moves, ← and → cards                             spaces = moves
 *   2  5×5, L-shape: 3–4 moves, one turn, 4 arrows                     spaces = moves
 *   3  5×5, 4–6 moves, 1–2 turns, 1–2 rocks block the other route      spaces = moves + 2
 *   4  5×5, berry first then home, 5–7 moves, 1–2 rocks               spaces = moves + 2   (decomposition)
 *   5  debug: 3–6 moves, one arrow replaced; fix it                    spaces = moves
 *   6  repeat n [d], n 3–5, plus ≤1 extra move; 0–2 rocks              spaces 2–3 (moves alone don't fit)
 *   7  staircase repeat n [d1 d2], n 2–4; rocks block both L routes     spaces 2, body 2
 *   8  debug loop: repeat count ±1 or one wrong body move              spaces = blocks of P
 */

/** The world spans ages 5–10 (playable from 5; the loop levels are rated 7–9 and 8–10 by the curriculum). */
export const GP_AGES = [5, 10] as const;
export const SKILL = {
  build: "cs.seq.build",
  decompose: "cs.seq.decompose",
  debug: "cs.debug.sequence",
  repeat: "cs.loop.repeat",
  loopDebug: "cs.loop.debug",
} as const;
/** Item ages follow the skill (docs/curriculum/computer-science.md §2; same ranges as the library-cs pack). */
export const SKILL_AGES: Record<string, readonly [number, number]> = {
  [SKILL.build]: [5, 7],
  [SKILL.decompose]: [6, 8],
  [SKILL.debug]: [6, 8],
  [SKILL.repeat]: [7, 9],
  [SKILL.loopDebug]: [8, 10],
};

export interface LevelSpec { label: string; mode: Mode; skill: string }
export const LEVELS: readonly LevelSpec[] = [
  { label: "strip, 1–2 moves, one arrow card", mode: "build", skill: SKILL.build },
  { label: "strip, 1–3 moves, left and right cards", mode: "build", skill: SKILL.build },
  { label: "L-shape, 3–4 moves, one turn", mode: "build", skill: SKILL.build },
  { label: "4–6 moves, 1–2 turns, rocks block the other route, 2 spare spaces", mode: "build", skill: SKILL.build },
  { label: "berry first, then home (5–7 moves)", mode: "via", skill: SKILL.decompose },
  { label: "debug: one wrong arrow in a 3–6 card program", mode: "debug", skill: SKILL.debug },
  { label: "repeat n [move] (n 3–5) plus at most one extra move", mode: "repeat", skill: SKILL.repeat },
  { label: "staircase: repeat n [move, move] (n 2–4)", mode: "stairs", skill: SKILL.repeat },
  { label: "debug loop: wrong repeat count or wrong body move", mode: "debug-loop", skill: SKILL.loopDebug },
];
export const GP_MAX_LEVEL = LEVELS.length - 1;

const GRID = { cols: 5, rows: 5 } as const;
const STRIP = { cols: 5, rows: 1 } as const;
const ALL: readonly Dir[] = DIRS;

const rep = <T,>(x: T, n: number): T[] => Array.from({ length: n }, () => x);

/** A start cell from which `moves` stay on the grid (random among all such cells), or -1. */
function pickStart(dims: { cols: number; rows: number }, moves: readonly Dir[], rng: Rng): number {
  const ok: number[] = [];
  for (let c = 0; c < dims.cols * dims.rows; c++) if (walk(dims, c, moves)) ok.push(c);
  return ok.length ? rng.pick(ok) : -1;
}

/** Monotone moves with 1 or 2 turns: a×d1, b×d2 (, c×d1). */
function monotone(rng: Rng, total: number, turns: 1 | 2): Dir[] | null {
  const d1 = rng.pick(ALL);
  const d2 = rng.pick(perpendicular(d1));
  if (turns === 1) {
    const a = rng.int(1, total - 1);
    const b = total - a;
    return a > 4 || b > 4 ? null : [...rep(d1, a), ...rep(d2, b)];
  }
  if (total < 3) return null;
  const b = rng.int(1, Math.min(4, total - 2));
  const a = rng.int(1, total - b - 1);
  const c = total - a - b;
  return a + c > 4 ? null : [...rep(d1, a), ...rep(d2, b), ...rep(d1, c)];
}

/** A monotone segment of `len` moves: straight (40 %) or with one turn. */
function segment(rng: Rng, len: number): Dir[] | null {
  return rng.chance(0.4) ? rep(rng.pick(ALL), len) : monotone(rng, len, 1);
}

/** Cells on the two L-shaped routes between start and the end of `moves` that are NOT on the path itself. */
function otherRouteCells(dims: { cols: number; rows: number }, start: number, moves: readonly Dir[], path: readonly number[]): number[][] {
  const counts = new Map<Dir, number>();
  for (const d of moves) counts.set(d, (counts.get(d) ?? 0) + 1);
  const dirs = [...counts.keys()];
  if (dirs.length !== 2) return [];
  const [a, b] = dirs as [Dir, Dir];
  const routes = [[...rep(a, counts.get(a)!), ...rep(b, counts.get(b)!)], [...rep(b, counts.get(b)!), ...rep(a, counts.get(a)!)]];
  const end = path[path.length - 1]!;
  return routes
    .map((r) => (walk(dims, start, r) ?? []).filter((c) => !path.includes(c) && c !== start && c !== end))
    .filter((cells) => cells.length > 0);
}

/** Free cells next to the path (rocks there look like they matter). */
function besidePath(dims: { cols: number; rows: number }, path: readonly number[], taken: readonly number[]): number[] {
  const out = new Set<number>();
  for (const c of path) for (const d of ALL) {
    const n = stepCell(dims, c, d);
    if (n >= 0 && !path.includes(n) && !taken.includes(n)) out.add(n);
  }
  return [...out];
}

/** Rocks: first one blocker per other L route (the corner-most cell), then random cells beside the path. */
function placeRocks(dims: { cols: number; rows: number }, start: number, moves: readonly Dir[], path: readonly number[], count: number, rng: Rng, blockRoutes = true): number[] {
  const rocks: number[] = [];
  if (blockRoutes) {
    for (const cells of otherRouteCells(dims, start, moves, path)) {
      if (rocks.length >= count) break;
      // the middle of the other route is where it "turns": the most obvious shortcut
      const c = cells[Math.floor((cells.length - 1) / 2)]!;
      if (!rocks.includes(c)) rocks.push(c);
    }
  }
  while (rocks.length < count) {
    const free = besidePath(dims, path, rocks);
    if (!free.length) break;
    rocks.push(rng.pick(free));
  }
  return rocks;
}

const base = (dims: { cols: number; rows: number }, mode: Mode): Omit<Puzzle, "start" | "goal" | "rocks" | "berries" | "slots" | "solution"> => ({
  cols: dims.cols, rows: dims.rows, palette: ALL, repeat: false, bodySlots: 1, mode, given: null, bug: null,
});

/** One candidate puzzle for a level (may be null → redraw). */
function candidate(level: number, rng: Rng, index: number): Puzzle | null {
  switch (level) {
    case 0:
    case 1: {
      const d: Dir = level === 0 ? (rng.chance(0.75) ? "right" : "left") : rng.pick(["left", "right"] as const);
      const k = level === 0 ? rng.int(1, 2) : 1 + ((index + rng.int(0, 2)) % 3);
      const moves = rep(d, k);
      const start = pickStart(STRIP, moves, rng);
      if (start < 0) return null;
      const path = walk(STRIP, start, moves)!;
      return {
        ...base(STRIP, "build"), palette: level === 0 ? [d] : ["left", "right"],
        start, goal: path[path.length - 1]!, rocks: [], berries: [], slots: k, solution: moves.map(move),
      };
    }
    case 2:
    case 3:
    case 5: {
      const total = level === 2 ? rng.int(3, 4) : level === 3 ? rng.int(4, 6) : rng.int(3, 6);
      const turns: 1 | 2 = level === 2 || total === 3 ? 1 : rng.chance(0.5) ? 1 : 2;
      const moves = monotone(rng, total, turns);
      if (!moves) return null;
      const start = pickStart(GRID, moves, rng);
      if (start < 0) return null;
      const path = walk(GRID, start, moves)!;
      const rocks = level === 2 ? [] : placeRocks(GRID, start, moves, path, rng.int(1, 2), rng);
      const pz: Puzzle = {
        ...base(GRID, level === 5 ? "debug" : "build"),
        start, goal: path[path.length - 1]!, rocks, berries: [], slots: level === 3 ? total + 2 : total, solution: moves.map(move),
      };
      return level === 5 ? withDirBug(pz, rng) : pz;
    }
    case 4: {
      const a = rng.int(2, 4);
      const b = rng.int(2, 3);
      if (a + b < 5 || a + b > 7) return null;
      const segA = segment(rng, a);
      const segB = segment(rng, b);
      if (!segA || !segB) return null;
      const moves = [...segA, ...segB];
      const start = pickStart(GRID, moves, rng);
      if (start < 0) return null;
      const path = walk(GRID, start, moves)!;
      const berry = path[a]!;
      const home = path[path.length - 1]!;
      const pathA = path.slice(0, a + 1);
      if (home === start || pathA.includes(home) || new Set(path).size !== path.length) return null;
      const [sr, sc] = [Math.floor(start / 5), start % 5];
      const [hr, hc] = [Math.floor(home / 5), home % 5];
      if (Math.abs(sr - hr) + Math.abs(sc - hc) >= a + b) return null; // the berry must be a detour (decomposition)
      const want = rng.int(1, 2);
      const rocks = otherRouteCells(GRID, start, segA, pathA).map((cells) => cells[0]!).filter((c) => !path.includes(c)).slice(0, want);
      while (rocks.length < want) {
        const free = besidePath(GRID, path, rocks);
        if (!free.length) break;
        rocks.push(rng.pick(free));
      }
      return { ...base(GRID, "via"), start, goal: home, rocks, berries: [berry], slots: a + b + 2, solution: moves.map(move) };
    }
    case 6: {
      const d = rng.pick(ALL);
      const n = rng.int(3, 5);
      const extra = rng.chance(0.5) ? rng.pick(perpendicular(d)) : null;
      const before = rng.chance(0.5);
      const solution: Program = extra ? (before ? [move(extra), repeat(n, [d])] : [repeat(n, [d]), move(extra)]) : [repeat(n, [d])];
      return loopPuzzle("repeat", solution, rng.int(0, 2), 1, rng, false);
    }
    case 7: {
      const d1 = rng.pick(ALL);
      const d2 = rng.pick(perpendicular(d1));
      const n = rng.int(2, 4);
      return loopPuzzle("stairs", [repeat(n, [d1, d2])], rng.int(2, 3), 2, rng, true);
    }
    case 8: {
      const stairs = index % 2 === 1;
      let pz: Puzzle | null;
      if (stairs) {
        const d1 = rng.pick(ALL);
        const d2 = rng.pick(perpendicular(d1));
        pz = loopPuzzle("debug-loop", [repeat(rng.int(2, 4), [d1, d2])], rng.int(1, 2), 2, rng, true);
      } else {
        const d = rng.pick(ALL);
        const n = rng.int(3, 5);
        const extra = rng.chance(0.5) ? rng.pick(perpendicular(d)) : null;
        pz = loopPuzzle("debug-loop", extra ? [repeat(n, [d]), move(extra)] : [repeat(n, [d])], rng.int(1, 2), 1, rng, false);
      }
      return pz && withLoopBug(pz, rng);
    }
  }
  return null;
}

/** Repeat-level puzzle around a given solution: start, goal, rocks; spaces = 2 (3 with an extra move) or = P. */
function loopPuzzle(mode: Mode, solution: Program, rockCount: number, bodySlots: number, rng: Rng, blockRoutes: boolean): Puzzle | null {
  const moves = movesOf(solution);
  const start = pickStart(GRID, moves, rng);
  if (start < 0) return null;
  const path = walk(GRID, start, moves)!;
  const rocks = placeRocks(GRID, start, moves, path, rockCount, rng, blockRoutes);
  // repeat/stairs: one spare space (2–3 in all), so the moves alone never fit; debug-loop: exactly P's blocks
  const slots = mode === "debug-loop" ? solution.length : solution.length + 1;
  return { ...base(GRID, mode), repeat: true, bodySlots, start, goal: path[path.length - 1]!, rocks, berries: [], slots, solution };
}

/** Moves from `cell` that don't help: they bump (rock/fence) or take Toggle further from the goal. */
function unhelpful(pz: Puzzle, cell: number, got: number, right: Dir): Dir[] {
  const remaining = remainingFn(pz);
  const now = remaining(cell, got);
  return ALL.filter((x) => {
    if (x === right) return false;
    const n = stepCell(pz, cell, x);
    return n < 0 || pz.rocks.includes(n) || remaining(n, got) > now;
  });
}

/** Level 5: replace one arrow (earlier positions more likely) with an unhelpful one. */
function withDirBug(pz: Puzzle, rng: Rng): Puzzle | null {
  const moves = movesOf(pz.solution);
  const i = Math.min(rng.int(0, moves.length - 1), rng.int(0, moves.length - 1));
  const cell = walk(pz, pz.start, moves.slice(0, i))!.at(-1)!;
  const options = unhelpful(pz, cell, 0, moves[i]!);
  if (!options.length) return null;
  const given = pz.solution.map((b, j) => (j === i ? move(rng.pick(options)) : b));
  return { ...pz, given, bug: { top: i, body: -1, kind: "dir" } };
}

/** Level 8: the repeat card's count is one off, or one body move is unhelpful on the first time round. */
function withLoopBug(pz: Puzzle, rng: Rng): Puzzle | null {
  const top = pz.solution.findIndex((b) => b?.t === "repeat");
  const r = pz.solution[top];
  if (!r || r.t !== "repeat") return null;
  if (rng.chance(0.5)) {
    const up = r.n === 2 || (r.n < 5 && rng.chance(0.5));
    const n = r.n + (up ? 1 : -1);
    if (n < 2 || n > 5) return null;
    return { ...pz, given: pz.solution.map((b, j) => (j === top ? repeat(n, r.body) : b)), bug: { top, body: -1, kind: "count" } };
  }
  const j = rng.int(0, r.body.length - 1);
  const steps = expand(pz.solution);
  const at = steps.findIndex((s) => s.top === top && s.iter === 0 && s.body === j);
  const cell = walk(pz, pz.start, steps.slice(0, at).map((s) => s.d))!.at(-1)!;
  const options = unhelpful(pz, cell, 0, r.body[j]!);
  if (!options.length) return null;
  const body = r.body.map((d, k) => (k === j ? rng.pick(options) : d));
  return { ...pz, given: pz.solution.map((b, k) => (k === top ? repeat(r.n, body) : b)), bug: { top, body: j, kind: "dir" } };
}

/** Every check from §4.4 (also asserted by the unit tests over levels × seeds). */
export function puzzleProblems(pz: Puzzle): string[] {
  const p: string[] = [];
  const res = run(pz, pz.solution);
  const path = res.cells;
  if (!res.success) p.push("intended solution fails");
  if (pz.goal === pz.start) p.push("goal = start");
  if (pz.rocks.some((r) => path.includes(r) || r === pz.goal || r === pz.start || pz.berries.includes(r))) p.push("rock on the path");
  if (new Set(pz.rocks).size !== pz.rocks.length) p.push("duplicate rocks");
  if (pz.solution.filter(Boolean).length > pz.slots) p.push("solution needs more spaces than the strip has");
  if (shortestMoves(pz) !== movesOf(pz.solution).length) p.push("intended solution is not a shortest path");
  if (pz.repeat && shortestMoves(pz) <= pz.slots && pz.mode !== "debug-loop") p.push("plain arrows fit: the level would not need a repeat card");
  if (pz.given) {
    if (pz.given.length !== pz.slots) p.push("given program must fill the strip");
    if (run(pz, pz.given).success) p.push("the bug does not break the program");
    const d = diagnose(pz, pz.given);
    if (pz.bug?.kind === "count" ? d.kind !== "repeatCount" || d.top !== pz.bug.top : !("top" in d) || d.top !== pz.bug?.top || d.kind === "repeatCount")
      p.push(`first wrong step is not the bug (${d.kind})`);
  }
  return p;
}

const PROMPTS: Record<Mode, { line: string; text: string; kind: string }> = {
  build: { line: "gp.prompt.goal", text: "Help Toggle reach the berries!", kind: "berry" },
  via: { line: "gp.prompt.via", text: "Get the berry first, then go home.", kind: "home" },
  debug: { line: "gp.prompt.debug", text: "Ooh, a bug! One card is wrong. Can you fix it?", kind: "bug" },
  repeat: { line: "gp.prompt.repeat", text: "Use a repeat card to save space.", kind: "repeat" },
  stairs: { line: "gp.prompt.stairs", text: "Find the pattern. One repeat card can do it!", kind: "repeat" },
  "debug-loop": { line: "gp.prompt.debugLoop", text: "The repeat card has a bug. Can you fix it?", kind: "bug" },
};

const OBJECTIVE: Record<Mode, string> = {
  build: "Build a sequence of arrow moves that takes Toggle to the berries",
  via: "Break the goal into parts: reach the berry first, then plan from the berry to home",
  debug: "Run the program, find the first step that goes wrong and fix it",
  repeat: "Use a repeat card to shorten a program",
  stairs: "Spot a repeating two-step pattern and write it as one repeat card",
  "debug-loop": "Fix a repeat card's count or body",
};

export function exerciseFor(pz: Puzzle, opts: { id: string; seed: number; skillId: string; tutorial?: boolean }): Omit<Exercise, "difficulty"> {
  const pr = opts.tutorial ? { line: "gp.prompt.tutorial", text: "Tap the arrow card, then press Go!", kind: "berry" } : PROMPTS[pz.mode];
  const program = pz.given ? ` The program is: ${pz.given.map(blockWords).join("; ")}.` : "";
  return {
    id: opts.id,
    skillId: opts.skillId,
    objective: OBJECTIVE[pz.mode],
    ages: SKILL_AGES[opts.skillId] ?? GP_AGES,
    interaction: "choose",
    answer: answerFor(pz),
    objectKind: pr.kind,
    seed: opts.seed,
    tutorial: opts.tutorial,
    a11yDescription: `A garden of ${pz.rows === 1 ? "5 squares in a row" : "5 by 5 squares"}. ${describeGarden(pz)} You have ${pz.slots} card ${pz.slots === 1 ? "space" : "spaces"}.${program}`,
    params: encodePuzzle(pz),
    prompt: { line: pr.line, text: pr.text },
  };
}

export const generateGardenPath: ExerciseGenerator = (level, rng, index) => {
  const lv = Math.max(0, Math.min(GP_MAX_LEVEL, level));
  let pz: Puzzle | null = null;
  for (let tries = 0; tries < 2000 && !pz; tries++) {
    const c = candidate(lv, rng, index);
    if (c && puzzleProblems(c).length === 0) pz = c;
  }
  if (!pz) throw new Error(`garden-path: no puzzle for level ${lv}`);
  return exerciseFor(pz, { id: `gp-${pz.mode}-${pz.start}-${pz.goal}-l${lv}n${index}`, seed: rng.int(1, 1_000_000), skillId: LEVELS[lv]!.skill });
};
