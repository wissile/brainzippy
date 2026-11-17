import type { Exercise, GameDefinition } from "../../engine/types";
import { COUNTING_AGES, COUNTING_MAX_LEVEL, generateCounting } from "./generator";

/**
 * Counting Adventure — DATA only. Exercises are generated per round (./generator.ts); the guided tutorial is authored.
 * Skills (see docs/CURRICULUM.md):
 *   math.count.one-to-one   — touch each object once while saying one number per object
 *   math.count.cardinality  — the last number said tells how many
 *   math.count.subitize     — recognise small quantities at a glance (1–5) / in structured layouts
 *   math.count.make-set     — count out a requested quantity from a larger group
 */
export const countingTutorial: Exercise = {
  id: "ca-tap-3-apple",
  skillId: "math.count.one-to-one",
  objective: "Count 3 objects by touching each one",
  ages: COUNTING_AGES,
  difficulty: 1,
  interaction: "tap-count",
  answer: { kind: "number", value: 3, choices: [2, 3, 4] },
  objectKind: "apple",
  seed: 11,
  tutorial: true,
  layout: "row",
  a11yDescription: "Three red apples in a row.",
};

export const countingAdventure: GameDefinition = {
  id: "counting-adventure",
  title: "Bobbo's Breakfast",
  mascot: "bobbo",
  ages: COUNTING_AGES,
  skillIds: ["math.count.one-to-one", "math.count.cardinality", "math.count.subitize", "math.count.make-set"],
  learningObjective: "Count up to 10 objects with one-to-one correspondence, know that the last number counted tells how many, and count out a requested amount.",
  progression: { roundLength: 8, maxLevel: COUNTING_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [countingTutorial],
  generate: generateCounting,
  achievement: { id: "counting-champ", title: "Counting Champ" },
};
