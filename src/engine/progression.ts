import type { Difficulty, Exercise, ExerciseResult, ProgressionConfig, ProgressionState } from "./types";

/**
 * Deterministic progression rules (documented in docs/GAME_ENGINE.md §Progression):
 *  R0  Levels: a game has levels 0..maxLevel; a round at level L starts at difficulty L + 1. After a round,
 *      ≥ 50 % first-try → level + 1 (capped); otherwise the child practises the same level again (D-019).
 *  R1  Level 0 starts with the tutorial exercise if one exists (later levels never include tutorials).
 *  R2  First-try success increments the streak; at `stepUpAfter` the difficulty rises one band (capped) and the streak resets.
 *  R3  Needing `stepDownAtAttempts` or more attempts lowers difficulty one band (floored at 1) and resets the streak.
 *  R4  Any other success (e.g. second try) resets the streak and keeps difficulty.
 *  R5  The next exercise is an unplayed one at the current difficulty, preferring (a) a kind different from the
 *      previous one, then (b) the kind played least so far this round, then (c) pool order; if the difficulty is
 *      exhausted, the nearest difficulty (lower first). A kind is `Exercise.variety` when set (an inner game),
 *      else the interaction + answer kind.
 *  R5a Exercises marked `closer` (a round finale) are held back until the round's last slot; there an unplayed
 *      closer is served first, nearest difficulty first. Needs `config` (roundLength); pools without closers are unaffected.
 *  R6  The round ends after `roundLength` exercises.
 */

export const maxDifficulty = (config: ProgressionConfig): Difficulty => config.maxLevel + 1;
export const clampLevel = (level: number, config: ProgressionConfig): number => Math.max(0, Math.min(config.maxLevel, Math.floor(level) || 0));

function clampDifficulty(d: number, config: ProgressionConfig): Difficulty {
  return Math.max(1, Math.min(maxDifficulty(config), d));
}

/** R0: the difficulty a round at `level` starts at (level + 1, capped). */
export function startDifficultyFor(level: number, config: ProgressionConfig): Difficulty {
  return clampDifficulty(clampLevel(level, config) + 1, config);
}

export function initialProgression(config: ProgressionConfig, startDifficulty?: number): ProgressionState {
  return { difficulty: clampDifficulty(startDifficulty ?? 1, config), streak: 0, played: [], results: [] };
}

/** R0: the level after a completed round, and whether it went up. */
export function levelAfterRound(level: number, results: readonly ExerciseResult[], config: ProgressionConfig): { level: number; leveledUp: boolean } {
  const current = clampLevel(level, config);
  const firstTries = results.filter((r) => r.firstTry).length;
  const earned = results.length > 0 && firstTries * 2 >= results.length;
  const next = earned ? Math.min(config.maxLevel, current + 1) : current;
  return { level: next, leveledUp: next > current };
}

export function applyResult(state: ProgressionState, result: ExerciseResult, config: ProgressionConfig): ProgressionState {
  let { difficulty, streak } = state;
  if (result.firstTry) {
    streak += 1;
    if (streak >= config.stepUpAfter) {
      difficulty = clampDifficulty(difficulty + 1, config);
      streak = 0;
    }
  } else if (result.attempts >= config.stepDownAtAttempts) {
    difficulty = clampDifficulty(difficulty - 1, config);
    streak = 0;
  } else {
    streak = 0;
  }
  return { ...state, difficulty, streak, results: [...state.results, result] };
}

export function isRoundComplete(state: ProgressionState, config: ProgressionConfig): boolean {
  return state.results.length >= config.roundLength;
}

const variety = (e: Exercise) => e.variety ?? `${e.interaction}:${e.answer.kind}`;

/** Pick the next exercise from a round's pool (a `Round` from `buildRound`, or any `{ exercises }`). */
export function selectNextExercise(
  pool: { readonly exercises: readonly Exercise[] },
  state: ProgressionState,
  config?: Pick<ProgressionConfig, "roundLength">,
): Exercise | undefined {
  const all = pool.exercises;
  const open = all.filter((e) => !state.played.includes(e.id));
  if (open.length === 0) return undefined;

  if (state.played.length === 0) {
    const tutorial = open.find((e) => e.tutorial);
    if (tutorial) return tutorial;
  }

  const maxD = Math.max(...all.map((e) => e.difficulty), state.difficulty);
  const order: number[] = [state.difficulty];
  for (let delta = 1; delta <= maxD; delta++) order.push(state.difficulty - delta, state.difficulty + delta);

  // R5a: closers wait for the round's last slot, where one is served first (nearest difficulty, lower first)
  if (config && state.results.length >= config.roundLength - 1) {
    for (const d of order) {
      const closer = open.find((e) => e.closer && !e.tutorial && e.difficulty === d);
      if (closer) return closer;
    }
  }
  const regular = open.filter((e) => !e.closer);
  const unplayed = regular.length ? regular : open;

  const lastId = state.played[state.played.length - 1];
  const last = all.find((e) => e.id === lastId);

  const used = new Map<string, number>();
  for (const id of state.played) {
    const e = all.find((x) => x.id === id);
    if (e) used.set(variety(e), (used.get(variety(e)) ?? 0) + 1);
  }
  for (const d of order) {
    const atLevel = unplayed.filter((e) => e.difficulty === d && !e.tutorial);
    if (atLevel.length === 0) continue;
    const varied = atLevel.filter((e) => !last || variety(e) !== variety(last));
    const pool = varied.length ? varied : atLevel;
    // stable: least-used kind wins, ties keep pool order
    return pool.reduce((best, e) => ((used.get(variety(e)) ?? 0) < (used.get(variety(best)) ?? 0) ? e : best), pool[0]!);
  }
  return unplayed[0];
}

export function markPlayed(state: ProgressionState, exerciseId: string): ProgressionState {
  return state.played.includes(exerciseId) ? state : { ...state, played: [...state.played, exerciseId] };
}

export function summarize(results: readonly ExerciseResult[]) {
  return {
    completed: results.length,
    firstTry: results.filter((r) => r.firstTry).length,
    hintsShown: results.reduce((n, r) => n + r.hintsShown, 0),
  };
}
