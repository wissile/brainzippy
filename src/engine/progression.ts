import type { Difficulty, Exercise, ExerciseResult, GameDefinition, ProgressionConfig, ProgressionState } from "./types";

/**
 * Deterministic progression rules (documented in docs/GAME_ENGINE.md §Progression):
 *  R1  A round starts at minDifficulty with the tutorial exercise if one exists.
 *  R2  First-try success increments the streak; at `stepUpAfter` the difficulty rises one level (capped) and the streak resets.
 *  R3  Needing `stepDownAtAttempts` or more attempts lowers difficulty one level (floored) and resets the streak.
 *  R4  Any other success (e.g. second try) resets the streak and keeps difficulty.
 *  R5  The next exercise is the first unplayed exercise at the current difficulty whose interaction differs
 *      from the previous one; if none, any unplayed at that difficulty; then nearest difficulty (lower first).
 *  R6  The round ends after `roundLength` exercises.
 */

export function initialProgression(config: ProgressionConfig): ProgressionState {
  return { difficulty: config.minDifficulty, streak: 0, played: [], results: [] };
}

function clampDifficulty(d: number, config: ProgressionConfig): Difficulty {
  return Math.max(config.minDifficulty, Math.min(config.maxDifficulty, d)) as Difficulty;
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

export function selectNextExercise(game: GameDefinition, state: ProgressionState): Exercise | undefined {
  const unplayed = game.exercises.filter((e) => !state.played.includes(e.id));
  if (unplayed.length === 0) return undefined;

  if (state.played.length === 0) {
    const tutorial = unplayed.find((e) => e.tutorial);
    if (tutorial) return tutorial;
  }

  const lastId = state.played[state.played.length - 1];
  const last = game.exercises.find((e) => e.id === lastId);

  const order: number[] = [state.difficulty];
  for (let delta = 1; delta <= 3; delta++) order.push(state.difficulty - delta, state.difficulty + delta);

  for (const d of order) {
    const atLevel = unplayed.filter((e) => e.difficulty === d && !e.tutorial);
    if (atLevel.length === 0) continue;
    const varied = atLevel.find((e) => !last || e.interaction !== last.interaction);
    return varied ?? atLevel[0];
  }
  return unplayed[0];
}

export function markPlayed(state: ProgressionState, exerciseId: string): ProgressionState {
  return state.played.includes(exerciseId) ? state : { ...state, played: [...state.played, exerciseId] };
}

export function summarize(results: ExerciseResult[]) {
  return {
    completed: results.length,
    firstTry: results.filter((r) => r.firstTry).length,
    hintsShown: results.reduce((n, r) => n + r.hintsShown, 0),
  };
}
