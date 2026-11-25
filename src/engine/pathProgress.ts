import type { Exercise, ExerciseResult } from "./types";

/**
 * Learning paths (docs/PATHS.md, D-034 + the learning-design review): pure, deterministic rules that move a child
 * along one subject's trail of worlds ("Learn to fly with Zephy"). No React, DOM, registry or storage: callers pass
 * plain data in and write the returned state back. Every rule below is documented in docs/PATHS.md and unit-tested
 * in tests/unit/path-progress.test.ts.
 *
 *  A1  Placement age = the middle year of the onboarding band (3–5 → 4 …); the age guard (U3) uses the band's youngest year.
 *  A2  Start world = nearest by years to the placement age (0 = inside its range), then the younger world, then path
 *      order, then id. A child who already played a later world of this path starts there.
 *  A3  Every world starts at level 0 (its tutorial and first skills run). PLACEMENT: in a child's first 3 rounds in a
 *      world, ONE easy round already skips ahead (U1's evidence cap applies).
 *  C1  Round outcome: EASY ≥ 4 items, ≥ 85 % first try, ≤ 1 hint · OK = R0 pass (≥ 50 % first try) ·
 *      PRACTISE = below the pass mark (same level again) · STRUGGLING = first try < max(30 %, chance + 10 points),
 *      chance = mean first-try guessing chance of the round's items. Speed is never used.
 *  U1  2 easy rounds in a row (or 1 in the placement phase) → skip: target = min(level + 2, max(level + 1, D − 1)),
 *      D = highest difficulty answered right first try in the round (evidence cap: never further than shown).
 *  U2  Hand forward to the next world at the world's hand-off level Hn (pack value, default maxLevel) with ≥ 75 % first
 *      try, or when every skill of the world is mastered (daily memory).
 *  U3  Age guard: a next world starting above (band minimum + 2 for the 3–5 band, + 3 otherwise) needs clear mastery
 *      (2 easy rounds in a row).
 *  D1  2 struggling rounds in a row → one level down (never below 0). At level 0–1 of a later world, ONE warm-up stop
 *      in the previous world (at Hn − 1, never above its stored level) joins the next daily plan; the pointer stays.
 *      At level 0 of the first world → T2.
 *  D2  Damping: after stepping down from level X, no skip in that world until an OK-or-better round at level ≥ X.
 *  T1  Tired offer: from the 3rd round in a row on one path (same local day), when that round's first-try rate is
 *      ≥ 20 points below the run's first round, or the round is struggling.
 *  T2  Stuck at level 0 of the first world after D1 → offer. T3 Path complete (last world handed forward; with
 *      mastery data, only when its skills are mastered) → note + offer.
 *  O1  Offers: only for the chosen path, at most once per path per local day, never forced.
 *  S1  Switching path keeps every path's own progress; world levels stay shared with Explore and the daily trail.
 */

export const PATH_RULES = {
  /** C1: minimum items in a round for it to count as "easy". */
  minItems: 4,
  /** C1: first-try share at or above which a round is easy. */
  easyRate: 0.85,
  /** C1: hints allowed in an easy round (one slip fixed after one hint). */
  easyMaxHints: 1,
  /** C1: R0's pass mark (src/engine/progression.ts levelAfterRound). Below it the level is practised again. */
  passRate: 0.5,
  /** C1: struggling floor. */
  hardFloor: 0.3,
  /** C1: struggling = below chance + this margin (when that is above the floor). */
  hardOverChance: 0.1,
  /** A3: rounds in a new world that count as the placement phase. */
  placementRounds: 3,
  /** U1: easy rounds in a row before skipping ahead (after placement). */
  easyRounds: 2,
  /** U1: most levels a skip may reach above the round's level. */
  skip: 2,
  /** U2: first-try share at the hand-off level that hands the child forward. */
  handoffRate: 0.75,
  /** U3: years above the band's youngest age a next world may start without clear mastery (band 3–5 / others). */
  reachYoung: 2,
  reach: 3,
  /** D1: struggling rounds in a row before stepping down. */
  hardRounds: 2,
  /** T1: rounds in a row on one path before an offer may come. */
  tiredRounds: 3,
  /** T1: drop in first-try rate (vs the run's first round) that signals tiredness. */
  tiredDrop: 0.2,
} as const;

export type AgeRange = readonly [number, number];
export interface PathWorld {
  id: string;
  ages: AgeRange;
  /** Highest 0-based level (= the game's progression.maxLevel). */
  maxLevel: number;
  /** U2: hand-off level (default maxLevel). */
  handoff?: number;
  /** Exit skills (U2/T3 mastery). */
  skills?: readonly string[];
}
/** A path = one subject's worlds in trail order. */
export interface PathDef {
  id: string;
  worlds: readonly PathWorld[];
}
/** Per-path progress: the current stop, streaks and the D1/D2 memory. */
export interface PathProgress {
  /** Current world id. */
  w: string;
  /** Easy rounds in a row in the current world. */
  easy: number;
  /** Struggling rounds in a row in the current world. */
  hard: number;
  /** Rounds played in the current world since entering it (A3 placement phase). */
  n: number;
  /** D2: level stepped down from; skips are blocked until an OK-or-better round at or above it. */
  dn: number | null;
  /** D1: previous world owed one warm-up stop in the next daily plan. */
  warm: string | null;
}
/** Consecutive rounds on one path on one local day (T1). */
export interface PathRun {
  p: string;
  day: string;
  n: number;
  /** First-try rate of the run's first round, in whole percent. */
  r: number;
}
export interface PathsState {
  v: 1;
  /** The path the child chose (null = none yet). */
  cur: string | null;
  /** Progress per path id (kept when switching, S1). */
  by: Record<string, PathProgress>;
  run: PathRun | null;
  /** O1: paths that already got an offer on `day`. */
  offered: { day: string; p: string[] } | null;
  /** D-041 ocean map: where the child's boat is ("home" = Monster Island, or a path id); the app opens there. */
  at?: string | null;
  /** D-041: islands already sailed to (the first trip to each plays the full boat ride, later ones a short one). */
  seen?: string[];
}
export const emptyPathsState = (): PathsState => ({ v: 1, cur: null, by: {}, run: null, offered: null });
export const freshProgress = (w: string): PathProgress => ({ w, easy: 0, hard: 0, n: 0, dn: null, warm: null });

export type RoundClass = "easy" | "ok" | "practise" | "struggling";
export type OfferReason = "tired" | "tricky" | "end";
export type PathNote =
  | { kind: "skip"; world: string; level: number }
  | { kind: "next-world"; world: string; level: number }
  | { kind: "down"; world: string; level: number; warm: string | null }
  | { kind: "path-end"; world: string };

type ResultLike = Pick<ExerciseResult, "firstTry" | "hintsShown"> & Partial<Pick<ExerciseResult, "difficulty" | "chance">>;

// ---------------------------------------------------------------- guessing chance (C1)

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));

/** Chance that a random first answer is right (0 when the child builds or types the answer). Recorded per result. */
export function firstTryChance(ex: Pick<Exercise, "answer" | "interaction">): number {
  const a = ex.answer;
  switch (a.kind) {
    case "number":
      return ex.interaction !== "make-set" && a.choices && a.choices.length > 0 ? 1 / a.choices.length : 0;
    case "choice":
      return a.options.length ? Math.min(1, (1 + (a.also?.length ?? 0)) / a.options.length) : 0;
    case "set":
      return a.options.length ? 1 / (2 ** a.options.length - 1) : 0;
    case "sequence":
      return a.pieces.length ? 1 / factorial(a.pieces.length) : 0;
    case "match":
      return a.items.length && a.targets.length ? 1 / a.targets.length ** a.items.length : 0;
    case "numeric": {
      if (a.min === undefined || a.max === undefined || !a.step || a.max <= a.min) return 0;
      const values = Math.floor((a.max - a.min) / a.step) + 1;
      return Math.min(1, (Math.floor((2 * a.tolerance) / a.step) + 1) / values);
    }
  }
}

// ---------------------------------------------------------------- placement (A1–A3)

/** A1: the middle year of an age band. */
export const placementAge = (band: AgeRange): number => Math.floor((band[0] + band[1]) / 2);

/** Years between an age and a world's age range (0 = inside). */
const distance = (w: PathWorld, age: number): number => (age < w.ages[0] ? w.ages[0] - age : age > w.ages[1] ? age - w.ages[1] : 0);

/** A2 (by age only): index of the start world; −1 for a path without worlds. */
export function startWorldIndex(path: PathDef, age: number): number {
  let best = -1;
  path.worlds.forEach((w, i) => {
    if (best < 0) return void (best = i);
    const b = path.worlds[best]!;
    // nearer, then younger; equal → the earlier world in path order keeps it (path order is unique, so id never decides)
    if ((distance(w, age) - distance(b, age) || w.ages[0] - b.ages[0]) < 0) best = i;
  });
  return best;
}

/** A2 + A3: where a child starts a path, given every world's stored level (from any entry point). */
export function startPath(path: PathDef, band: AgeRange, levels: Readonly<Record<string, number>>): { progress: PathProgress; setLevel?: number } | null {
  let at = startWorldIndex(path, placementAge(band));
  if (at < 0) return null;
  for (let i = path.worlds.length - 1; i > at; i--) {
    if (levels[path.worlds[i]!.id] !== undefined) {
      at = i;
      break;
    }
  }
  const w = path.worlds[at]!;
  return { progress: freshProgress(w.id), setLevel: levels[w.id] === undefined ? 0 : undefined };
}

/** Choose (or re-choose) a path. Other paths' progress is kept (S1). A stored stop that left the path is re-placed. */
export function choosePath(state: PathsState, path: PathDef, band: AgeRange, levels: Readonly<Record<string, number>>): { state: PathsState; setLevel?: { world: string; level: number } } {
  const had = state.by[path.id];
  if (had && path.worlds.some((w) => w.id === had.w)) {
    return { state: { ...state, cur: path.id }, setLevel: levels[had.w] === undefined ? { world: had.w, level: 0 } : undefined };
  }
  const start = startPath(path, band, levels);
  if (!start) return { state };
  return {
    state: { ...state, cur: path.id, by: { ...state.by, [path.id]: start.progress } },
    setLevel: start.setLevel !== undefined ? { world: start.progress.w, level: start.setLevel } : undefined,
  };
}

// ---------------------------------------------------------------- rounds

const rate = (results: readonly ResultLike[]) => (results.length ? results.filter((r) => r.firstTry).length / results.length : 0);
const EPS = 1e-9;

/** C1: the struggling threshold for a round (max of the floor and chance + margin). */
export const struggleBelow = (results: readonly ResultLike[]): number => {
  const chance = results.length ? results.reduce((s, r) => s + (r.chance ?? 0), 0) / results.length : 0;
  return Math.max(PATH_RULES.hardFloor, chance + PATH_RULES.hardOverChance);
};

/** C1: classify a completed round. */
export function classifyRound(results: readonly ResultLike[]): RoundClass {
  const n = results.length;
  if (n === 0) return "practise";
  const r = rate(results);
  const hints = results.reduce((s, x) => s + x.hintsShown, 0);
  if (r < struggleBelow(results) - EPS) return "struggling";
  if (r < PATH_RULES.passRate - EPS) return "practise";
  if (n >= PATH_RULES.minItems && r >= PATH_RULES.easyRate - EPS && hints <= PATH_RULES.easyMaxHints) return "easy";
  return "ok";
}

/** U1 evidence cap: the furthest level a skip may reach from a round at `level`. */
export function skipTarget(level: number, maxLevel: number, results: readonly ResultLike[]): number {
  const best = Math.max(0, ...results.filter((r) => r.firstTry && r.difficulty !== undefined).map((r) => r.difficulty!));
  return Math.min(maxLevel, level + PATH_RULES.skip, Math.max(level + 1, best - 1));
}

/** U3: highest youngest-age a next world may have without clear mastery. */
export const ageReach = (band: AgeRange): number => band[0] + (band[1] <= 5 ? PATH_RULES.reachYoung : PATH_RULES.reach);

export interface PathRoundInput {
  path: PathDef;
  /** Local date (YYYY-MM-DD) of the round. */
  day: string;
  /** The child's onboarding age band. */
  band: AgeRange;
  round: { world: string; level: number; results: readonly ResultLike[] };
  /** Stored world levels AFTER the game's own R0 update for this round. */
  levels: Readonly<Record<string, number>>;
  /** Mastered skill ids (daily memory). Omit when no mastery data exists. */
  mastered?: readonly string[];
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
 */
export function recordPathRound(state: PathsState, input: PathRoundInput): PathRoundOutcome {
  const { path, day, band, round, mastered } = input;
  const R = PATH_RULES;
  const r = rate(round.results);
  const sameRun = state.run && state.run.p === path.id && state.run.day === day;
  const run: PathRun = sameRun ? { ...state.run!, n: state.run!.n + 1 } : { p: path.id, day, n: 1, r: Math.round(r * 100) };
  const mine = state.cur === path.id;
  const levels: Record<string, number> = {};
  let note: PathNote | null = null;
  let offer: OfferReason | null = null;
  const cls = classifyRound(round.results);
  let by = state.by;

  let prog = state.by[path.id];
  // D1: the warm-up stop is owed once; any round in that world pays it
  if (prog && prog.warm === round.world) prog = { ...prog, warm: null };
  const idx = path.worlds.findIndex((w) => w.id === round.world);
  const current = !!prog && prog.w === round.world && idx >= 0;

  if (prog && current) {
    const world = path.worlds[idx]!;
    const level = Math.max(0, Math.min(world.maxLevel, Math.floor(round.level)));
    const stored = input.levels[world.id] ?? level;
    const hn = Math.max(0, Math.min(world.maxLevel, world.handoff ?? world.maxLevel));
    const placing = prog.n < R.placementRounds;
    let { easy, hard, dn, warm } = prog;
    let w = prog.w;
    let n = prog.n + 1;
    easy = cls === "easy" ? easy + 1 : 0;
    hard = cls === "struggling" ? hard + 1 : 0;
    const allMastered = !!mastered && !!world.skills?.length && world.skills.every((s) => mastered.includes(s));
    const handOff = (level >= hn && r >= R.handoffRate - EPS) || allMastered;
    const blocked = dn !== null;
    if (dn !== null && level >= dn && (cls === "ok" || cls === "easy")) dn = null; // D2 release (applies from the next round)

    if (handOff) {
      const next = path.worlds[idx + 1];
      if (!next) {
        // T3: complete only with mastered exit skills when mastery data exists
        if (!mastered || allMastered) {
          note = { kind: "path-end", world: world.id };
          if (mine) offer = "end";
        }
      } else if (next.ages[0] <= ageReach(band) || easy >= R.easyRounds) {
        w = next.id;
        easy = 0;
        hard = 0;
        n = 0;
        dn = null;
        const nl = input.levels[next.id] ?? 0;
        if (input.levels[next.id] === undefined) levels[next.id] = nl;
        note = { kind: "next-world", world: next.id, level: nl };
      }
    }
    if (!note && cls === "easy" && !blocked && (easy >= R.easyRounds || placing)) {
      const target = skipTarget(level, world.maxLevel, round.results);
      if (target > stored) {
        levels[world.id] = target;
        note = { kind: "skip", world: world.id, level: target };
        easy = 0;
      }
    } else if (!note && hard >= R.hardRounds) {
      hard = 0;
      easy = 0;
      if (level > 0) {
        levels[world.id] = level - 1;
        dn = level;
      }
      if (idx > 0 && level <= 1) {
        const prev = path.worlds[idx - 1]!;
        const ph = Math.max(0, Math.min(prev.maxLevel, prev.handoff ?? prev.maxLevel) - 1);
        const ps = input.levels[prev.id];
        const wl = ps === undefined ? ph : Math.min(ph, ps);
        if (ps !== wl) levels[prev.id] = wl;
        warm = prev.id;
      }
      if (level > 0 || warm) note = { kind: "down", world: world.id, level: Math.max(0, level - 1), warm };
      else if (mine && idx === 0) offer = "tricky";
    }
    by = { ...state.by, [path.id]: { w, easy, hard, n, dn, warm } };
  } else if (prog && prog !== state.by[path.id]) {
    by = { ...state.by, [path.id]: prog };
  }

  // T1
  if (!offer && mine && run.n >= R.tiredRounds && (cls === "struggling" || r <= run.r / 100 - R.tiredDrop + EPS)) offer = "tired";
  // O1: at most one offer per path per day
  let offered = state.offered && state.offered.day === day ? state.offered : null;
  if (offer && offered?.p.includes(path.id)) offer = null;
  if (offer) offered = { day, p: [...(offered?.p ?? []), path.id] };
  return { state: { ...state, by, run, offered }, levels, note, offer, cls: current ? cls : null };
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
 * Parse stored path state. Missing (state saved before paths existed) → empty state (the migration). Entries saved by
 * the first version (no n / dn / warm / r) get defaults. Corrupt entries are dropped one by one; an unknown version or
 * shape → empty state. Never throws.
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
      out.by[id] = {
        w: p.w,
        easy: p.easy,
        hard: p.hard,
        n: small(p.n) ? p.n : 0,
        dn: small(p.dn) ? p.dn : null,
        warm: typeof p.warm === "string" && ID.test(p.warm) ? p.warm : null,
      };
    }
  }
  const r = o.run as Record<string, unknown> | null | undefined;
  if (r && typeof r === "object" && typeof r.p === "string" && ID.test(r.p) && typeof r.day === "string" && DAY.test(r.day) && small(r.n)) {
    out.run = { p: r.p, day: r.day, n: r.n, r: small(r.r) && r.r <= 100 ? r.r : 100 };
  }
  const f = o.offered as Record<string, unknown> | null | undefined;
  if (f && typeof f === "object" && typeof f.day === "string" && DAY.test(f.day) && Array.isArray(f.p)) {
    out.offered = { day: f.day, p: (f.p as unknown[]).filter((x): x is string => typeof x === "string" && ID.test(x)).slice(0, MAX_PATHS) };
  }
  if (typeof o.at === "string" && ID.test(o.at)) out.at = o.at;
  if (Array.isArray(o.seen)) out.seen = (o.seen as unknown[]).filter((x): x is string => typeof x === "string" && ID.test(x)).slice(0, MAX_PATHS + 1);
  return out;
}
