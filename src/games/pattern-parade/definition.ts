import type { Exercise, GameDefinition } from "../../engine/types";
import { MAX_LEVEL, PP_AGES, SKILL_GROW, SKILL_REPEAT, SKILL_TRANSLATE, generatePatternParade, tutorialParade } from "./generator";

/**
 * Puff's Pattern Parade — DATA only. Exercises are generated per round (./generator.ts); the tutorial is authored.
 * Skills (src/content/packs/math-pattern-parade):
 *   math.pattern.repeat       — continue and complete AB, AAB, ABB and ABC patterns, incl. the missing middle item
 *   math.pattern.translate    — copy a repeating pattern in another set of things (animals → instruments)
 *   math.pattern.grow-simple  — continue a growing pattern that adds one each step
 */
export const patternTutorial: Exercise = { ...tutorialParade(), difficulty: 1 };

export const patternParade: GameDefinition = {
  id: "pattern-parade",
  title: "Puff's Pattern Parade",
  mascot: "puff",
  ages: PP_AGES,
  skillIds: [SKILL_REPEAT, SKILL_TRANSLATE, SKILL_GROW],
  learningObjective: "Find the part of a pattern that repeats (or grows) and use it to say what comes next or what is missing.",
  progression: { roundLength: 8, maxLevel: MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [patternTutorial],
  generate: generatePatternParade,
  achievement: { id: "parade-star", title: "Parade Star" },
};
