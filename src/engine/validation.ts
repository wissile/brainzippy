import type { Exercise, ValidationResult } from "./types";

/** Validate a numeric choice (tap-count after counting, or choose-count). */
export function validateChoice(exercise: Exercise, chosen: number): ValidationResult {
  if (chosen === exercise.target) return { correct: true, reason: "correct" };
  return { correct: false, reason: "wrong-number" };
}

/** Validate a make-set submission by the number of objects in the basket. */
export function validateSet(exercise: Exercise, basketCount: number): ValidationResult {
  if (basketCount === exercise.target) return { correct: true, reason: "correct" };
  if (basketCount === 0) return { correct: false, reason: "incomplete" };
  return { correct: false, reason: basketCount > exercise.target ? "too-many" : "too-few" };
}

/** Structural checks for authored exercise data. Returns a list of problems (empty = valid). */
export function lintExercise(ex: Exercise): string[] {
  const problems: string[] = [];
  if (!Number.isInteger(ex.target) || ex.target < 1 || ex.target > 20) problems.push(`${ex.id}: target out of range`);
  if (ex.ages[0] > ex.ages[1]) problems.push(`${ex.id}: ages reversed`);
  if (ex.prompt && (!ex.prompt.line || !ex.prompt.text)) problems.push(`${ex.id}: prompt needs line and text`);
  if (ex.interaction === "make-set") {
    if (!ex.poolSize || ex.poolSize <= ex.target) problems.push(`${ex.id}: poolSize must exceed target`);
  } else {
    if (!ex.choices || ex.choices.length < 2) problems.push(`${ex.id}: needs at least 2 choices`);
    else {
      if (!ex.choices.includes(ex.target)) problems.push(`${ex.id}: choices must include target`);
      if (new Set(ex.choices).size !== ex.choices.length) problems.push(`${ex.id}: duplicate choices`);
    }
  }
  if (!ex.a11yDescription.trim()) problems.push(`${ex.id}: missing a11y description`);
  return problems;
}
