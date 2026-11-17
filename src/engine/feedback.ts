import type { Exercise, Feedback, HintAction, ValidationResult } from "./types";

/**
 * Feedback rules (data-driven, deterministic). `attempt` is the 1-based number of the answer just submitted.
 * Ladder for wrong answers:
 *   attempt 1 → gentle retry + strategy hint (count along / cardinality / too many-too few)
 *   attempt 2+ → model the answer (errorless: the child still taps it themselves)
 *   make-set: attempt 2 → show target slots; attempt 3+ → basket set to the target and counted aloud
 * Correct answers always praise the process ("you counted carefully"), never ability.
 */
const PRAISE = ["correct.1", "correct.2", "correct.3", "correct.4"] as const;

export function feedbackFor(exercise: Exercise, result: ValidationResult, attempt: number): Feedback {
  if (result.correct) {
    const id = PRAISE[(exercise.seed + attempt) % PRAISE.length] ?? "correct.1";
    return { mascot: "celebrating", sfx: "correct", voice: { id, vars: { n: exercise.target } }, hints: [] };
  }

  const hints: HintAction[] = [];
  let voiceId = "retry.1";

  if (exercise.interaction === "make-set") {
    if (attempt >= 3) {
      // modelled answer: the basket is set to the target and counted aloud; the child still taps the check
      hints.push("show-slots", "model-answer", "count-along");
      voiceId = "hint.model";
    } else {
      if (attempt >= 2) hints.push("show-slots");
      voiceId = result.reason === "too-many" ? "hint.tooMany" : result.reason === "incomplete" ? "hint.empty" : "hint.tooFew";
    }
  } else if (attempt >= 2) {
    hints.push("model-answer", "count-along");
    voiceId = "hint.model";
  } else if (exercise.interaction === "choose") {
    // first miss: strategy only (the helper explains the idea); the full worked example waits for the second miss
    hints.push("eliminate-choice");
    voiceId = "hint.countAlong";
  } else {
    hints.push("eliminate-choice");
    if (exercise.interaction === "tap-count") {
      hints.push("highlight-last-count");
      voiceId = "hint.lastNumber";
    } else {
      hints.push("count-along");
      voiceId = "hint.countAlong";
    }
  }

  return { mascot: "retry", sfx: "retry", voice: { id: voiceId, vars: { n: exercise.target } }, hints };
}
