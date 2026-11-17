import { feedbackFor } from "./feedback";
import type { Exercise, ExerciseResult, Feedback, HintAction } from "./types";
import { validateChoice, validateSet } from "./validation";

/**
 * Per-exercise state machine. Pure reducer: (state, event) -> state. No timers, no DOM, no audio.
 * The GameRunner turns `feedback` into sound/animation and dispatches FEEDBACK_DONE when presentation ends.
 *
 *   counting ──(all objects tapped)──▶ answering            (tap-count only)
 *   answering ──CHOOSE/SUBMIT──▶ feedback ──FEEDBACK_DONE──▶ answering (wrong) | solved (correct)
 */
export type ExercisePhase = "counting" | "answering" | "feedback" | "solved";

export interface ExerciseState {
  exercise: Exercise;
  phase: ExercisePhase;
  attempts: number;
  /** tap-count: object indices in the order the child tapped them. */
  tapped: number[];
  /** make-set: object indices currently in the basket. */
  basket: number[];
  /** Choices disabled by hints. */
  disabledChoices: number[];
  /** Choice highlighted by the model-answer hint. */
  modelChoice: number | null;
  /** Hints active on the board (accumulate during the exercise). */
  activeHints: HintAction[];
  hintsShown: number;
  /** Last feedback produced; `seq` lets renderers react exactly once per submission. */
  feedback: (Feedback & { seq: number; correct: boolean }) | null;
  lastChoice: number | null;
}

export type ExerciseEvent =
  | { type: "TAP_OBJECT"; index: number }
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
    disabledChoices: [],
    modelChoice: null,
    activeHints: [],
    hintsShown: 0,
    feedback: null,
    lastChoice: null,
  };
}

function objectCount(ex: Exercise): number {
  return ex.interaction === "make-set" ? (ex.poolSize ?? ex.target) : ex.target;
}

function submit(state: ExerciseState, correct: boolean, fb: Feedback, choice: number | null): ExerciseState {
  const attempts = state.attempts + 1;
  const newHints = fb.hints.filter((h) => !state.activeHints.includes(h));
  let disabledChoices = state.disabledChoices;
  let modelChoice = state.modelChoice;
  if (!correct && choice !== null && fb.hints.includes("eliminate-choice") && !disabledChoices.includes(choice)) {
    disabledChoices = [...disabledChoices, choice];
  }
  let basket = state.basket;
  if (!correct && fb.hints.includes("model-answer")) {
    modelChoice = state.exercise.target;
    disabledChoices = (state.exercise.choices ?? []).filter((c) => c !== state.exercise.target);
    if (state.exercise.interaction === "make-set") {
      const target = state.exercise.target;
      basket = basket.slice(0, target);
      for (let i = 0; basket.length < target && i < objectCount(state.exercise); i++) if (!basket.includes(i)) basket = [...basket, i];
    }
  }
  return {
    ...state,
    phase: "feedback",
    attempts,
    disabledChoices,
    modelChoice,
    basket,
    activeHints: [...state.activeHints, ...newHints],
    hintsShown: state.hintsShown + (correct ? 0 : 1),
    feedback: { ...fb, seq: attempts, correct },
    lastChoice: choice,
  };
}

export function exerciseReducer(state: ExerciseState, event: ExerciseEvent): ExerciseState {
  const ex = state.exercise;
  switch (event.type) {
    case "TAP_OBJECT": {
      if (ex.interaction !== "tap-count" || state.phase !== "counting") return state;
      if (event.index < 0 || event.index >= objectCount(ex) || state.tapped.includes(event.index)) return state;
      const tapped = [...state.tapped, event.index];
      return { ...state, tapped, phase: tapped.length === ex.target ? "answering" : "counting" };
    }
    case "CHOOSE": {
      if (ex.interaction === "make-set" || state.phase !== "answering") return state;
      if (state.disabledChoices.includes(event.value)) return state;
      if (!(ex.choices ?? []).includes(event.value)) return state;
      const result = validateChoice(ex, event.value);
      return submit(state, result.correct, feedbackFor(ex, result, state.attempts + 1), event.value);
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
      const result = validateSet(ex, state.basket.length);
      return submit(state, result.correct, feedbackFor(ex, result, state.attempts + 1), null);
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
  };
}
