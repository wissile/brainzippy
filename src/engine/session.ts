import { feedbackFor } from "./feedback";
import { firstTryChance } from "./pathProgress";
import type { AnswerKey, AnswerValue, Exercise, ExerciseResult, Feedback, HintAction, ValidationResult } from "./types";
import { answerKeys, correctKeys, correctValue, isSubmittable, nudgeKey, targetOf, validateAnswer, validateSet } from "./validation";

/**
 * Per-exercise state machine. Pure reducer: (state, event) -> state. No timers, no DOM, no audio.
 * The GameRunner turns `feedback` into sound/animation and dispatches FEEDBACK_DONE when presentation ends.
 *
 *   counting ──(all objects tapped)──▶ answering            (tap-count only)
 *   answering ──SUBMIT/SUBMIT_SET──▶ feedback ──FEEDBACK_DONE──▶ answering (wrong) | solved (correct)
 */
export type ExercisePhase = "counting" | "answering" | "feedback" | "solved";

/** 0 = no miss yet · 1 = nudged (after the first miss) · 2 = modelled answer showing. */
export type HintStage = 0 | 1 | 2;

export interface ExerciseState {
  exercise: Exercise;
  phase: ExercisePhase;
  attempts: number;
  /** tap-count: object indices in the order the child tapped them. */
  tapped: number[];
  /** make-set: object indices currently in the basket. */
  basket: number[];
  /** Where the feedback ladder is; boards render their own nudge/model from this. */
  hintStage: HintStage;
  /** Choices / option ids / piece ids greyed out by hints (cannot be submitted). */
  eliminated: AnswerKey[];
  /** The correct answer to show once the ladder reaches the modelled answer (hintStage 2); else null. */
  model: AnswerValue | null;
  /** The last submitted value (null before the first submission and for make-set). */
  lastAnswer: AnswerValue | null;
  /** Validation of the last submission, incl. per-part correctness for multi-part answers. */
  check: ValidationResult | null;
  /** Hints active on the board (accumulate during the exercise). */
  activeHints: HintAction[];
  hintsShown: number;
  /** Last feedback produced; `seq` lets renderers react exactly once per submission. */
  feedback: (Feedback & { seq: number; correct: boolean }) | null;
}

export type ExerciseEvent =
  | { type: "TAP_OBJECT"; index: number }
  /** Submit an answer of any kind (number, option id, ordered ids, selected ids, item→target map, measured value). */
  | { type: "SUBMIT"; value: AnswerValue }
  /** @deprecated Same as SUBMIT with a number. Kept so older boards keep working. */
  | { type: "CHOOSE"; value: number }
  | { type: "ADD_TO_BASKET"; index: number }
  | { type: "REMOVE_FROM_BASKET"; index: number }
  | { type: "SUBMIT_SET" }
  | { type: "FEEDBACK_DONE" };

export function initExercise(exercise: Exercise): ExerciseState {
  return {
    exercise,
    phase: exercise.interaction === "tap-count" ? "counting" : "answering",
    attempts: 0,
    tapped: [],
    basket: [],
    hintStage: 0,
    eliminated: [],
    model: null,
    lastAnswer: null,
    check: null,
    activeHints: [],
    hintsShown: 0,
    feedback: null,
  };
}

function objectCount(ex: Exercise): number {
  const target = targetOf(ex);
  return ex.interaction === "make-set" ? (ex.poolSize ?? target) : target;
}

/** Does the submission use anything a hint has greyed out? */
function usesEliminated(value: AnswerValue, eliminated: readonly AnswerKey[]): boolean {
  if (eliminated.length === 0) return false;
  if (typeof value === "number" || typeof value === "string") return eliminated.includes(value);
  if (Array.isArray(value)) return value.some((v: string) => eliminated.includes(v));
  return false;
}

function submit(state: ExerciseState, check: ValidationResult, fb: Feedback, value: AnswerValue | null): ExerciseState {
  const ex = state.exercise;
  const correct = check.correct;
  const attempts = state.attempts + 1;
  const newHints = fb.hints.filter((h) => !state.activeHints.includes(h));
  let eliminated = state.eliminated;
  let model = state.model;
  let basket = state.basket;
  if (!correct && value !== null && fb.hints.includes("eliminate-choice")) {
    const key = nudgeKey(ex.answer, value);
    if (key !== null && !eliminated.includes(key)) eliminated = [...eliminated, key];
  }
  if (!correct && fb.hints.includes("model-answer")) {
    model = correctValue(ex.answer);
    const keep = correctKeys(ex.answer);
    eliminated = answerKeys(ex.answer).filter((k) => !keep.includes(k));
    if (ex.interaction === "make-set") {
      const target = targetOf(ex);
      basket = basket.slice(0, target);
      for (let i = 0; basket.length < target && i < objectCount(ex); i++) if (!basket.includes(i)) basket = [...basket, i];
    }
  }
  const activeHints = [...state.activeHints, ...newHints];
  const misses = state.hintsShown + (correct ? 0 : 1);
  const hintStage: HintStage = activeHints.includes("model-answer") ? 2 : misses > 0 ? 1 : 0;
  return {
    ...state,
    phase: "feedback",
    attempts,
    eliminated,
    model,
    basket,
    hintStage,
    activeHints,
    hintsShown: state.hintsShown + (correct ? 0 : 1),
    feedback: { ...fb, seq: attempts, correct },
    lastAnswer: value,
    check,
  };
}

export function exerciseReducer(state: ExerciseState, event: ExerciseEvent): ExerciseState {
  const ex = state.exercise;
  switch (event.type) {
    case "TAP_OBJECT": {
      if (ex.interaction !== "tap-count" || state.phase !== "counting") return state;
      if (event.index < 0 || event.index >= objectCount(ex) || state.tapped.includes(event.index)) return state;
      const tapped = [...state.tapped, event.index];
      return { ...state, tapped, phase: tapped.length === targetOf(ex) ? "answering" : "counting" };
    }
    case "CHOOSE":
      return exerciseReducer(state, { type: "SUBMIT", value: event.value });
    case "SUBMIT": {
      if (ex.interaction === "make-set" || state.phase !== "answering") return state;
      if (!isSubmittable(ex.answer, event.value) || usesEliminated(event.value, state.eliminated)) return state;
      const check = validateAnswer(ex.answer, event.value);
      return submit(state, check, feedbackFor(ex, check, state.attempts + 1), event.value);
    }
    case "ADD_TO_BASKET": {
      if (ex.interaction !== "make-set" || state.phase !== "answering") return state;
      if (event.index < 0 || event.index >= objectCount(ex) || state.basket.includes(event.index)) return state;
      return { ...state, basket: [...state.basket, event.index] };
    }
    case "REMOVE_FROM_BASKET": {
      if (ex.interaction !== "make-set" || state.phase !== "answering") return state;
      return { ...state, basket: state.basket.filter((i) => i !== event.index) };
    }
    case "SUBMIT_SET": {
      if (ex.interaction !== "make-set" || state.phase !== "answering") return state;
      const check = validateSet(ex, state.basket.length);
      return submit(state, check, feedbackFor(ex, check, state.attempts + 1), null);
    }
    case "FEEDBACK_DONE": {
      if (state.phase !== "feedback" || !state.feedback) return state;
      return { ...state, phase: state.feedback.correct ? "solved" : "answering" };
    }
  }
}

export function toResult(state: ExerciseState): ExerciseResult {
  return {
    exerciseId: state.exercise.id,
    skillId: state.exercise.skillId,
    difficulty: state.exercise.difficulty,
    attempts: state.attempts,
    firstTry: state.attempts === 1,
    hintsShown: state.hintsShown,
    chance: firstTryChance(state.exercise),
  };
}
