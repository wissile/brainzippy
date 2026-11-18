import type { Exercise, Feedback, HintAction, ValidationResult } from "./types";
import { targetOf } from "./validation";

/**
 * Feedback rules (data-driven, deterministic). `attempt` is the 1-based number of the answer just submitted.
 * The ladder, for every answer kind (wrong answers are never punished; retries are unlimited):
 *   miss 1 → gentle retry + a nudge: grey out the wrong pick (eliminate-choice), mark which parts were right
 *            (mark-parts), or say too high / too low (direction). Counting games add their strategy hint.
 *   miss 2+ → worked/modelled answer (model-answer + count-along): the board shows `state.model`, the runner
 *            animates `alongIndex`; everything else is disabled and the child still submits it (errorless).
 *   make-set keeps its 3-step ladder: too many/too few → + slots → modelled basket.
 * Correct answers always praise the process ("you counted carefully"), never ability.
 */
const COUNT_PRAISE = ["correct.1", "correct.2", "correct.3", "correct.4"] as const;
const GENERIC_PRAISE = ["praise.1", "praise.2"] as const;

export function feedbackFor(exercise: Exercise, result: ValidationResult, attempt: number): Feedback {
  const a = exercise.answer;
  const n = targetOf(exercise);
  const vars = Number.isFinite(n) ? { n } : undefined;
  const isNumber = a.kind === "number";

  if (result.correct) {
    const list = isNumber ? COUNT_PRAISE : GENERIC_PRAISE;
    const id = list[(exercise.seed + attempt) % list.length] ?? list[0];
    return { mascot: "celebrating", sfx: "correct", voice: { id, vars }, hints: [] };
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
    voiceId = isNumber ? "hint.model" : "hint.show";
  } else if (exercise.interaction === "tap-count") {
    hints.push("eliminate-choice", "highlight-last-count");
    voiceId = "hint.lastNumber";
  } else if (exercise.interaction === "choose-count") {
    hints.push("eliminate-choice", "count-along");
    voiceId = "hint.countAlong";
  } else {
    // "choose": first miss gives strategy only (the helper explains the idea); the worked example waits for miss 2
    switch (a.kind) {
      case "number":
        hints.push(a.choices ? "eliminate-choice" : "direction");
        voiceId = "hint.countAlong";
        break;
      case "choice":
        hints.push("eliminate-choice");
        break;
      case "set":
      case "sequence":
        hints.push("mark-parts", "eliminate-choice");
        break;
      case "match":
        hints.push("mark-parts");
        break;
      case "numeric":
        hints.push("direction");
        break;
    }
  }

  return { mascot: "retry", sfx: "retry", voice: { id: voiceId, vars }, hints };
}
