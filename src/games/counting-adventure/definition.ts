import type { Exercise, GameDefinition } from "../../engine/types";

/**
 * Counting Adventure — exercise DATA only. No rendering or logic lives here.
 * Skills (see docs/CURRICULUM.md):
 *   math.count.one-to-one   — touch each object once while saying one number per object
 *   math.count.cardinality  — the last number said tells how many
 *   math.count.subitize     — recognise small quantities at a glance (1–5) / in structured layouts
 *   math.count.make-set     — count out a requested quantity from a larger group
 */
const AGES = [4, 6] as const;

const ex = (e: Omit<Exercise, "ages">): Exercise => ({ ...e, ages: AGES });

export const countingExercises: readonly Exercise[] = [
  // Difficulty 1: quantities 1–3
  ex({ id: "ca-tap-3-apple", skillId: "math.count.one-to-one", objective: "Count 3 objects by touching each one", difficulty: 1, interaction: "tap-count", target: 3, objectKind: "apple", choices: [2, 3, 4], seed: 11, tutorial: true, layout: "row", a11yDescription: "Three red apples in a row." }),
  ex({ id: "ca-choose-2-cookie", skillId: "math.count.subitize", objective: "Recognise 2 at a glance", difficulty: 1, interaction: "choose-count", target: 2, objectKind: "cookie", choices: [1, 2, 3], seed: 12, layout: "scatter", a11yDescription: "Two cookies on the blanket." }),
  ex({ id: "ca-make-2-berry", skillId: "math.count.make-set", objective: "Count out 2 from a group of 5", difficulty: 1, interaction: "make-set", target: 2, poolSize: 5, objectKind: "berry", seed: 13, a11yDescription: "Five strawberries next to Bobbo's basket." }),
  ex({ id: "ca-choose-3-berry", skillId: "math.count.subitize", objective: "Recognise 3 at a glance", difficulty: 1, interaction: "choose-count", target: 3, objectKind: "berry", choices: [2, 3, 4], seed: 15, layout: "scatter", a11yDescription: "Three strawberries on the blanket." }),
  ex({ id: "ca-make-3-carrot", skillId: "math.count.make-set", objective: "Count out 3 from a group of 5", difficulty: 1, interaction: "make-set", target: 3, poolSize: 5, objectKind: "carrot", seed: 16, a11yDescription: "Five carrots next to Bobbo's basket." }),
  ex({ id: "ca-tap-3-cookie", skillId: "math.count.one-to-one", objective: "Count 3 objects by touching each one", difficulty: 1, interaction: "tap-count", target: 3, objectKind: "cookie", choices: [2, 3, 4], seed: 17, layout: "scatter", a11yDescription: "Three cookies on the blanket." }),
  ex({ id: "ca-choose-1-apple", skillId: "math.count.subitize", objective: "Recognise 1", difficulty: 1, interaction: "choose-count", target: 1, objectKind: "apple", choices: [1, 2, 3], seed: 18, layout: "scatter", a11yDescription: "One apple on the blanket." }),
  ex({ id: "ca-tap-2-carrot", skillId: "math.count.one-to-one", objective: "Count 2 objects by touching each one", difficulty: 1, interaction: "tap-count", target: 2, objectKind: "carrot", choices: [1, 2, 3], seed: 14, layout: "scatter", a11yDescription: "Two carrots on the blanket." }),

  // Difficulty 2: quantities 4–5
  ex({ id: "ca-tap-4-carrot", skillId: "math.count.cardinality", objective: "Count 4 and say how many", difficulty: 2, interaction: "tap-count", target: 4, objectKind: "carrot", choices: [3, 4, 5], seed: 21, layout: "scatter", a11yDescription: "Four carrots scattered on the blanket." }),
  ex({ id: "ca-choose-5-apple", skillId: "math.count.subitize", objective: "Recognise 5 at a glance", difficulty: 2, interaction: "choose-count", target: 5, objectKind: "apple", choices: [4, 5, 6], seed: 22, layout: "scatter", a11yDescription: "Five apples on the blanket." }),
  ex({ id: "ca-make-4-cookie", skillId: "math.count.make-set", objective: "Count out 4 from a group of 7", difficulty: 2, interaction: "make-set", target: 4, poolSize: 7, objectKind: "cookie", seed: 23, a11yDescription: "Seven cookies next to Bobbo's basket." }),
  ex({ id: "ca-tap-5-berry", skillId: "math.count.cardinality", objective: "Count 5 and say how many", difficulty: 2, interaction: "tap-count", target: 5, objectKind: "berry", choices: [4, 5, 6], seed: 24, layout: "scatter", a11yDescription: "Five strawberries on the blanket." }),

  // Difficulty 3: quantities 6–7
  ex({ id: "ca-tap-6-cookie", skillId: "math.count.cardinality", objective: "Count 6 scattered objects", difficulty: 3, interaction: "tap-count", target: 6, objectKind: "cookie", choices: [5, 6, 7], seed: 31, layout: "scatter", a11yDescription: "Six cookies scattered on the blanket." }),
  ex({ id: "ca-make-5-apple", skillId: "math.count.make-set", objective: "Count out 5 from a group of 8", difficulty: 3, interaction: "make-set", target: 5, poolSize: 8, objectKind: "apple", seed: 32, a11yDescription: "Eight apples next to Bobbo's basket." }),
  ex({ id: "ca-choose-6-carrot", skillId: "math.count.subitize", objective: "Count 6 in a ten frame", difficulty: 3, interaction: "choose-count", target: 6, objectKind: "carrot", choices: [5, 6, 7], seed: 33, layout: "ten-frame", a11yDescription: "Six carrots in a ten frame." }),
  ex({ id: "ca-tap-7-apple", skillId: "math.count.cardinality", objective: "Count 7 scattered objects", difficulty: 3, interaction: "tap-count", target: 7, objectKind: "apple", choices: [6, 7, 8], seed: 34, layout: "scatter", a11yDescription: "Seven apples scattered on the blanket." }),

  // Difficulty 4: quantities 8–10
  ex({ id: "ca-tap-8-berry", skillId: "math.count.cardinality", objective: "Count 8 scattered objects", difficulty: 4, interaction: "tap-count", target: 8, objectKind: "berry", choices: [7, 8, 9], seed: 41, layout: "scatter", a11yDescription: "Eight strawberries scattered on the blanket." }),
  ex({ id: "ca-make-7-carrot", skillId: "math.count.make-set", objective: "Count out 7 from a group of 10", difficulty: 4, interaction: "make-set", target: 7, poolSize: 10, objectKind: "carrot", seed: 42, a11yDescription: "Ten carrots next to Bobbo's basket." }),
  ex({ id: "ca-choose-9-cookie", skillId: "math.count.subitize", objective: "Count 9 in a ten frame", difficulty: 4, interaction: "choose-count", target: 9, objectKind: "cookie", choices: [8, 9, 10], seed: 43, layout: "ten-frame", a11yDescription: "Nine cookies in a ten frame." }),
  ex({ id: "ca-tap-10-apple", skillId: "math.count.cardinality", objective: "Count 10 scattered objects", difficulty: 4, interaction: "tap-count", target: 10, objectKind: "apple", choices: [9, 10, 11], seed: 44, layout: "scatter", a11yDescription: "Ten apples scattered on the blanket." }),
];

export const countingAdventure: GameDefinition = {
  id: "counting-adventure",
  title: "Counting Adventure",
  mascot: "bobbo",
  ages: AGES,
  skillIds: ["math.count.one-to-one", "math.count.cardinality", "math.count.subitize", "math.count.make-set"],
  learningObjective: "Count up to 10 objects with one-to-one correspondence, know that the last number counted tells how many, and count out a requested amount.",
  progression: { roundLength: 8, minDifficulty: 1, maxDifficulty: 4, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: countingExercises,
  achievement: { id: "counting-champ", title: "Counting Champ" },
};
