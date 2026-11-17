/**
 * Public engine API for game, daily-learning and content code. Pure TypeScript: no React, no DOM.
 * Import from "src/engine" rather than individual modules where convenient.
 */
export * from "./types";
export { createRng, hashSeed, seedForDay, randomSeed, type Rng } from "./rng";
export {
  validateAnswer, isSubmittable, correctValue, correctKeys, answerKeys, nudgeKey,
  targetOf, choicesOf, asNumber, validateChoice, validateSet, lintExercise,
} from "./validation";
export { feedbackFor } from "./feedback";
export { initExercise, exerciseReducer, toResult, type ExerciseState, type ExerciseEvent, type ExercisePhase, type HintStage } from "./session";
export {
  applyResult, initialProgression, isRoundComplete, selectNextExercise, markPlayed, summarize,
  startDifficultyFor, levelAfterRound, clampLevel, maxDifficulty,
} from "./progression";
export { buildRound, generateBand } from "./round";
