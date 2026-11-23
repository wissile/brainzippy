import type { ExerciseResult } from "./types";

/**
 * Learning paths (docs/PATHS.md, D-034): pure, deterministic rules that move a child along one subject's trail of
 * worlds ("Learn to fly with Zephy"). No React, DOM, registry or storage: callers pass plain data in and write the
 * returned state back. Every rule and number below is documented in docs/PATHS.md and unit-tested in
 * tests/unit/path-progress.test.ts.
 *
 *  A1  Placement age = the middle year of the onboarding age band (3–5 → 4, 6–8 → 7, 9–11 → 10, 12–14 → 13).
 *  A2  Start world = the first world in path order whose ages contain the age; if none, the nearest by years
 *      (ties → the younger world). If the child already played further along this path, start there instead.
 *  A3  Start level (only for a world never played) = the start of the age's share of the world's levels:
 *      floor((maxLevel + 1) × yearIndex / years)  (yearIndex clamped to the world's years).
 *  C1  A round is EASY when it has ≥ 4 items, ≥ 85 % first try and at most 1 hint in total;
 *      STRUGGLING when < 40 % first try; otherwise OK. Speed is never used.
 *  U1  2 easy rounds in a row in the path's current world → skip ahead: level + 2 instead of R0's + 1 (capped).
 *  U2  At the world's top level, a round with ≥ 75 % first try → next world of the path (at A3's level if new).
 *  U3  A next world whose youngest age is more than 3 years above the child's age is entered only with clear
 *      mastery: the graduating round is the 2nd easy round in a row. Otherwise the child keeps practising the top.
 *  D1  2 struggling rounds in a row → one level down; at level 0 → the previous world's top level;
 *      at level 0 of the first world → stay (and T2 offers another path).
 *  T1  3 rounds in a row on the same path on the same local day → the host offers another path (then the count restarts).
 *  T2  D1 at level 0 of the first world → offer. T3 graduating from the last world → offer ("you explored it all").
 *      Offers are only ever offers; they never move the child.
 *  S1  Switching path keeps every path's own progress; world levels stay shared with Explore and the daily trail.
 */

export const PATH_RULES = {
  /** C1: minimum items in a round for it to count as evidence. */
  minItems: 4,
  /** C1: first-try share at or above which a round is easy. */
  easyRate: 0.85,
  /** C1: hints allowed in an easy round (one slip fixed after one hint). */
  easyMaxHints: 1,
  /** C1: first-try share below which a round is struggling. */
  hardRate: 0.4,
  /** U1: easy rounds in a row before skipping ahead. */
  easyRounds: 2,
  /** U1: levels gained by a skip (R0 alone gives 1). */
  skip: 2,
  /** U2: first-try share at the top level that completes a world. */
  graduateRate: 0.75,
  /** U3: how far above the child's age a world may start without clear mastery. */
  ageReach: 3,
  /** D1: struggling rounds in a row before stepping down. */
  hardRounds: 2,
  /** T1: rounds in a row on one path (same day) before the host offers another path. */
  tiredRounds: 3,
} as const;

export type AgeRange = readonly [number, number];
export interface PathWorld {
  id: string;
  ages: AgeRange;
  /** Highest 0-based level (= the game's progression.maxLevel). */
  maxLevel: number;
}
/** A path = one subject's worlds in trail order. */
export interface PathDef {
  id: string;
  worlds: readonly PathWorld[];
}
/** Per-path progress: the current stop and the two streaks. */
export interface PathProgress {
  /** Current world id. */
  w: string;
  /** Easy rounds in a row in the current world (C1/U1). */
  easy: number;
  /** Struggling rounds in a row in the current world (C1/D1). */
  hard: number;
}
/** Consecutive rounds on one path on one local day (T1). */
export interface PathRun {
  p: string;
  day: string;
  n: number;
}
export interface PathsState {
  v: 1;
  /** The path the child chose (null = none yet). */
  cur: string | null;
  /** Progress per path id (kept when switching, S1). */
  by: Record<string, PathProgress>;
  run: PathRun | null;
}
export const emptyPathsState = (): PathsState => ({ v: 1, cur: null, by: {}, run: null });

export type RoundClass = "easy" | "ok" | "struggling";
export type OfferReason = "tired" | "tricky" | "end";
export type PathNote =
  | { kind: "skip"; world: string; level: number }
  | { kind: "next-world"; world: string; level: number }
  | { kind: "down"; world: string; level: number }
  | { kind: "back-world"; world: string; level: number }
  | { kind: "path-end"; world: string };

// ---------------------------------------------------------------- placement (A1–A3)

/** A1: the middle year of an age band. */
export const placementAge = (band: AgeRange): number => Math.floor((band[0] + band[1]) / 2);

/** Years between an age and a world's age range (0 = inside). */
const distance = (w: PathWorld, age: number): number => (age < w.ages[0] ? w.ages[0] - age : age > w.ages[1] ? age - w.ages[1] : 0);

/** A2 (by age only): index of the start world; −1 for a path without worlds. */
export function startWorldIndex(path: PathDef, age: number): number {
  let best = -1;
  for (let i = 0; i < path.worlds.length; i++) {
    const w = path.worlds[i]!;
    if (best === -1) {
      best = i;
      continue;
    }
    const b = path.worlds[best]!;
    const dw = distance(w, age);
    const db = distance(b, age);
    // nearer wins; on a tie the younger world (lower start age), then path order
    if (dw < db || (dw === db && dw > 0 && w.ages[0] < b.ages[0])) best = i;
  }
  return best;
}

/** A3: the level a world starts at for an age (the start of that age's share of the levels). */
export function placementLevel(w: PathWorld, age: number): number {
  const years = w.ages[1] - w.ages[0] + 1;
  const yearIndex = Math.max(0, Math.min(years - 1, age - w.ages[0]));
  return Math.max(0, Math.min(w.maxLevel, Math.floor(((w.maxLevel + 1) * yearIndex) / years)));
}

export interface StartResult {
  progress: PathProgress;
  /** Level to store for the start world when it has none yet (undefined = keep the stored level). */
  setLevel?: number;
}

/** A2 + A3: where a child starts a path, given every world's stored level (from any entry point). */
export function startPath(path: PathDef, age: number, levels: Readonly<Record<string, number>>): StartResult | null {
  const byAge = startWorldIndex(path, age);
  if (byAge < 0) return null;
  let at = byAge;
  for (let i = path.worlds.length - 1; i > at; i--) {
    if (levels[path.worlds[i]!.id] !== undefined) {
      at = i;
      break;
    }
  }
  const w = path.worlds[at]!;
  return { progress: { w: w.id, easy: 0, hard: 0 }, setLevel: levels[w.id] === undefined ? placementLevel(w, age) : undefined };
}

/** Choose (or re-choose) a path. Other paths' progress is kept (S1). A stored stop that left the path is re-placed. */
export function choosePath(state: PathsState, path: PathDef, age: number, levels: Readonly<Record<string, number>>): { state: PathsState; setLevel?: { world: string; level: number } } {
  const had = state.by[path.id];
  if (had && path.worlds.some((w) => w.id === had.w)) {
    const w = path.worlds.find((x) => x.id === had.w)!;
    return { state: { ...state, cur: path.id }, setLevel: levels[w.id] === undefined ? { world: w.id, level: placementLevel(w, age) } : undefined };
  }
  const start = startPath(path, age, levels);
  if (!start) return { state };
  return {
    state: { ...state, cur: path.id, by: { ...state.by, [path.id]: start.progress } },
    setLevel: start.setLevel !== undefined ? { world: start.progress.w, level: start.setLevel } : undefined,
  };
}

// ---------------------------------------------------------------- rounds (C1, U1–U3, D1, T1–T3)

/** C1: classify a completed round. */
export function classifyRound(results: readonly Pick<ExerciseResult, "firstTry" | "hintsShown">[]): RoundClass {
  const n = results.length;
  if (n === 0) return "ok";
  const first = results.filter((r) => r.firstTry).length;
  const hints = results.reduce((s, r) => s + r.hintsShown, 0);
  if (first < PATH_RULES.hardRate * n) return "struggling";
  if (n >= PATH_RULES.minItems && first >= PATH_RULES.easyRate * n && hints <= PATH_RULES.easyMaxHints) return "easy";
  return "ok";
}

export interface PathRoundInput {
  path: PathDef;
  /** Local date (YYYY-MM-DD) of the round, for T1. */
  day: string;
  /** Placement age (A1). */
  age: number;
  round: { world: string; level: number; results: readonly Pick<ExerciseResult, "firstTry" | "hintsShown">[] };
  /** Stored world levels AFTER the game's own R0 update for this round. */
  levels: Readonly<Record<string, number>>;
}
export interface PathRoundOutcome {
  state: PathsState;
  /** World levels to store (only the changed ones). */
  levels: Record<string, number>;
  note: PathNote | null;
  offer: OfferReason | null;
  cls: RoundClass | null;
}

/**
 * Record a completed round in a world of `input.path`. Levels and stops move only when the round was played in the
 * path's current world (from any entry point: path view, daily trail or Explore); T1 counts every round of the path.
 * Offers are made only for the path the child chose (`state.cur`).
 */
export function recordPathRound(state: PathsState, input: PathRoundInput): PathRoundOutcome {
  const { path, day, age, round } = input;
  const R = PATH_RULES;
  const runN = state.run && state.run.p === path.id && state.run.day === day ? state.run.n + 1 : 1;
  let run: PathRun = { p: path.id, day, n: runN };
  const mine = state.cur === path.id;
  const levels: Record<string, number> = {};
  let note: PathNote | null = null;
  let offer: OfferReason | null = null;
  let cls: RoundClass | null = null;
  let by = state.by;

  const prog = state.by[path.id];
  const idx = path.worlds.findIndex((w) => w.id === round.world);
  if (prog && prog.w === round.world && idx >= 0) {
    const world = path.worlds[idx]!;
    const level = Math.max(0, Math.min(world.maxLevel, Math.floor(round.level)));
    cls = classifyRound(round.results);
    let easy = cls === "easy" ? prog.easy + 1 : 0;
    let hard = cls === "struggling" ? prog.hard + 1 : 0;
    let w = prog.w;
    const n = round.results.length;
    const first = round.results.filter((r) => r.firstTry).length;
    const stored = input.levels[world.id] ?? level;

    if (level === world.maxLevel && n > 0 && first >= R.graduateRate * n) {
      // U2 / U3 / T3
      const next = path.worlds[idx + 1];
      if (!next) {
        note = { kind: "path-end", world: world.id };
        if (mine) offer = "end";
      } else if (next.ages[0] <= age + R.ageReach || easy >= R.easyRounds) {
        w = next.id;
        easy = 0;
        hard = 0;
        const nl = input.levels[next.id] ?? placementLevel(next, age);
        if (input.levels[next.id] === undefined) levels[next.id] = nl;
        note = { kind: "next-world", world: next.id, level: nl };
      }
    } else if (easy >= R.easyRounds) {
      // U1: the game already moved one level (R0); a skip makes it two
      const target = Math.min(world.maxLevel, level + R.skip);
      if (target > stored) {
        levels[world.id] = target;
        note = { kind: "skip", world: world.id, level: target };
        easy = 0;
      }
    } else if (hard >= R.hardRounds) {
      // D1 / T2
      hard = 0;
      if (level > 0) {
        levels[world.id] = level - 1;
        note = { kind: "down", world: world.id, level: level - 1 };
      } else if (idx > 0) {
        const prev = path.worlds[idx - 1]!;
        w = prev.id;
        easy = 0;
        levels[prev.id] = prev.maxLevel;
        note = { kind: "back-world", world: prev.id, level: prev.maxLevel };
      } else if (mine) {
        offer = "tricky";
      }
    }
    by = { ...state.by, [path.id]: { w, easy, hard } };
  }

  // T1
  if (!offer && mine && run.n >= R.tiredRounds) offer = "tired";
  if (offer) run = { ...run, n: 0 };
  return { state: { ...state, by, run }, levels, note, offer, cls };
}

/** Index of the path's current stop (−1 when the path hasn't been started or the stop left the path). */
export const currentStopIndex = (state: PathsState, path: PathDef): number => {
  const p = state.by[path.id];
  return p ? path.worlds.findIndex((w) => w.id === p.w) : -1;
};

// ---------------------------------------------------------------- storage validation (strict; anything odd is dropped)

const ID = /^[a-z0-9][a-z0-9.\-]{0,63}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const small = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 1000;
const MAX_PATHS = 50;

/**
 * Parse stored path state. Missing (state saved before paths existed) → empty state (the migration). Corrupt
 * entries are dropped one by one; an unknown version or shape → empty state. Never throws.
 */
export function parsePathsState(input: unknown): PathsState {
  if (!input || typeof input !== "object") return emptyPathsState();
  const o = input as Record<string, unknown>;
  if (o.v !== 1) return emptyPathsState();
  const out = emptyPathsState();
  if (typeof o.cur === "string" && ID.test(o.cur)) out.cur = o.cur;
  if (o.by && typeof o.by === "object" && !Array.isArray(o.by)) {
    for (const [id, raw] of Object.entries(o.by as Record<string, unknown>).slice(0, MAX_PATHS)) {
      const p = raw as Record<string, unknown> | null;
      if (!ID.test(id) || !p || typeof p !== "object" || typeof p.w !== "string" || !ID.test(p.w) || !small(p.easy) || !small(p.hard)) continue;
      out.by[id] = { w: p.w, easy: p.easy, hard: p.hard };
    }
  }
  const r = o.run as Record<string, unknown> | null | undefined;
  if (r && typeof r === "object" && typeof r.p === "string" && ID.test(r.p) && typeof r.day === "string" && DAY.test(r.day) && small(r.n)) out.run = { p: r.p, day: r.day, n: r.n };
  return out;
}
