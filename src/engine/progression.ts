import type { Difficulty, Exercise, ExerciseResult, ProgressionConfig, ProgressionState } from "./types";

/**
 * Deterministic progression rules (documented in docs/GAME_ENGINE.md §Progression):
 *  R0  Levels: a game has levels 0..maxLevel; a round at level L starts at difficulty L + 1. After a round,
 *      ≥ 50 % first-try → level + 1 (capped); otherwise the child practises the same level again (D-019).
 *  R1  Level 0 starts with the tutorial exercise if one exists (later levels never include tutorials).
 *  R2  First-try success increments the streak; at `stepUpAfter` the difficulty rises one band (capped) and the streak resets.
 *  R3  Needing `stepDownAtAttempts` or more attempts lowers difficulty one band (floored at 1) and resets the streak.
 *  R4  Any other success (e.g. second try) resets the streak and keeps difficulty.
 *  R5  The next exercise is the first unplayed one at the current difficulty whose interaction/answer kind differs
 *      from the previous one; if none, any unplayed at that difficulty; then nearest difficulty (lower first).
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

const variety = (e: Exercise) => `${e.interaction}:${e.answer.kind}`;

/** Pick the next exercise from a round's pool (a `Round` from `buildRound`, or any `{ exercises }`). */
export function selectNextExercise(pool: { readonly exercises: readonly Exercise[] }, state: ProgressionState): Exercise | undefined {
  const all = pool.exercises;
  const unplayed = all.filter((e) => !state.played.includes(e.id));
  if (unplayed.length === 0) return undefined;

  if (state.played.length === 0) {
    const tutorial = unplayed.find((e) => e.tutorial);
    if (tutorial) return tutorial;
  }

  const lastId = state.played[state.played.length - 1];
  const last = all.find((e) => e.id === lastId);

  const maxD = Math.max(...all.map((e) => e.difficulty), state.difficulty);
  const order: number[] = [state.difficulty];
  for (let delta = 1; delta <= maxD; delta++) order.push(state.difficulty - delta, state.difficulty + delta);

  for (const d of order) {
    const atLevel = unplayed.filter((e) => e.difficulty === d && !e.tutorial);
    if (atLevel.length === 0) continue;
    const varied = atLevel.find((e) => !last || variety(e) !== variety(last));
    return varied ?? atLevel[0];
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
