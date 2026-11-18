import type { Exercise, GameDefinition } from "../../src/engine/types";

/**
 * Test fixture: the hand-authored Counting Adventure exercises from milestone 2 (before the game moved to a
 * generator). Kept as a fixed pool so progression/session rules are tested against stable, known data.
 */
const AGES = [4, 6] as const;
const ex = (e: Omit<Exercise, "ages">): Exercise => ({ ...e, ages: AGES });

export const fixtureExercises: readonly Exercise[] = [
  ex({ id: "ca-tap-3-apple", skillId: "math.count.one-to-one", objective: "Count 3 objects by touching each one", difficulty: 1, interaction: "tap-count", answer: { kind: "number", value: 3, choices: [2, 3, 4] }, objectKind: "apple", seed: 11, tutorial: true, layout: "row", a11yDescription: "Three red apples in a row." }),
  ex({ id: "ca-choose-2-cookie", skillId: "math.count.subitize", objective: "Recognise 2 at a glance", difficulty: 1, interaction: "choose-count", answer: { kind: "number", value: 2, choices: [1, 2, 3] }, objectKind: "cookie", seed: 12, layout: "scatter", a11yDescription: "Two cookies on the blanket." }),
  ex({ id: "ca-make-2-berry", skillId: "math.count.make-set", objective: "Count out 2 from a group of 5", difficulty: 1, interaction: "make-set", answer: { kind: "number", value: 2 }, poolSize: 5, objectKind: "berry", seed: 13, a11yDescription: "Five strawberries next to Bobbo's basket." }),
  ex({ id: "ca-choose-3-berry", skillId: "math.count.subitize", objective: "Recognise 3 at a glance", difficulty: 1, interaction: "choose-count", answer: { kind: "number", value: 3, choices: [2, 3, 4] }, objectKind: "berry", seed: 15, layout: "scatter", a11yDescription: "Three strawberries on the blanket." }),
  ex({ id: "ca-make-3-carrot", skillId: "math.count.make-set", objective: "Count out 3 from a group of 5", difficulty: 1, interaction: "make-set", answer: { kind: "number", value: 3 }, poolSize: 5, objectKind: "carrot", seed: 16, a11yDescription: "Five carrots next to Bobbo's basket." }),
  ex({ id: "ca-tap-3-cookie", skillId: "math.count.one-to-one", objective: "Count 3 objects by touching each one", difficulty: 1, interaction: "tap-count", answer: { kind: "number", value: 3, choices: [2, 3, 4] }, objectKind: "cookie", seed: 17, layout: "scatter", a11yDescription: "Three cookies on the blanket." }),
  ex({ id: "ca-choose-1-apple", skillId: "math.count.subitize", objective: "Recognise 1", difficulty: 1, interaction: "choose-count", answer: { kind: "number", value: 1, choices: [1, 2, 3] }, objectKind: "apple", seed: 18, layout: "scatter", a11yDescription: "One apple on the blanket." }),
  ex({ id: "ca-tap-2-carrot", skillId: "math.count.one-to-one", objective: "Count 2 objects by touching each one", difficulty: 1, interaction: "tap-count", answer: { kind: "number", value: 2, choices: [1, 2, 3] }, objectKind: "carrot", seed: 14, layout: "scatter", a11yDescription: "Two carrots on the blanket." }),
  ex({ id: "ca-tap-4-carrot", skillId: "math.count.cardinality", objective: "Count 4 and say how many", difficulty: 2, interaction: "tap-count", answer: { kind: "number", value: 4, choices: [3, 4, 5] }, objectKind: "carrot", seed: 21, layout: "scatter", a11yDescription: "Four carrots scattered on the blanket." }),
  ex({ id: "ca-choose-5-apple", skillId: "math.count.subitize", objective: "Recognise 5 at a glance", difficulty: 2, interaction: "choose-count", answer: { kind: "number", value: 5, choices: [4, 5, 6] }, objectKind: "apple", seed: 22, layout: "scatter", a11yDescription: "Five apples on the blanket." }),
  ex({ id: "ca-make-4-cookie", skillId: "math.count.make-set", objective: "Count out 4 from a group of 7", difficulty: 2, interaction: "make-set", answer: { kind: "number", value: 4 }, poolSize: 7, objectKind: "cookie", seed: 23, a11yDescription: "Seven cookies next to Bobbo's basket." }),
  ex({ id: "ca-tap-5-berry", skillId: "math.count.cardinality", objective: "Count 5 and say how many", difficulty: 2, interaction: "tap-count", answer: { kind: "number", value: 5, choices: [4, 5, 6] }, objectKind: "berry", seed: 24, layout: "scatter", a11yDescription: "Five strawberries on the blanket." }),
  ex({ id: "ca-tap-6-cookie", skillId: "math.count.cardinality", objective: "Count 6 scattered objects", difficulty: 3, interaction: "tap-count", answer: { kind: "number", value: 6, choices: [5, 6, 7] }, objectKind: "cookie", seed: 31, layout: "scatter", a11yDescription: "Six cookies scattered on the blanket." }),
  ex({ id: "ca-make-5-apple", skillId: "math.count.make-set", objective: "Count out 5 from a group of 8", difficulty: 3, interaction: "make-set", answer: { kind: "number", value: 5 }, poolSize: 8, objectKind: "apple", seed: 32, a11yDescription: "Eight apples next to Bobbo's basket." }),
  ex({ id: "ca-choose-6-carrot", skillId: "math.count.subitize", objective: "Count 6 in a ten frame", difficulty: 3, interaction: "choose-count", answer: { kind: "number", value: 6, choices: [5, 6, 7] }, objectKind: "carrot", seed: 33, layout: "ten-frame", a11yDescription: "Six carrots in a ten frame." }),
  ex({ id: "ca-tap-7-apple", skillId: "math.count.cardinality", objective: "Count 7 scattered objects", difficulty: 3, interaction: "tap-count", answer: { kind: "number", value: 7, choices: [6, 7, 8] }, objectKind: "apple", seed: 34, layout: "scatter", a11yDescription: "Seven apples scattered on the blanket." }),
  ex({ id: "ca-tap-8-berry", skillId: "math.count.cardinality", objective: "Count 8 scattered objects", difficulty: 4, interaction: "tap-count", answer: { kind: "number", value: 8, choices: [7, 8, 9] }, objectKind: "berry", seed: 41, layout: "scatter", a11yDescription: "Eight strawberries scattered on the blanket." }),
  ex({ id: "ca-make-7-carrot", skillId: "math.count.make-set", objective: "Count out 7 from a group of 10", difficulty: 4, interaction: "make-set", answer: { kind: "number", value: 7 }, poolSize: 10, objectKind: "carrot", seed: 42, a11yDescription: "Ten carrots next to Bobbo's basket." }),
  ex({ id: "ca-choose-9-cookie", skillId: "math.count.subitize", objective: "Count 9 in a ten frame", difficulty: 4, interaction: "choose-count", answer: { kind: "number", value: 9, choices: [8, 9, 10] }, objectKind: "cookie", seed: 43, layout: "ten-frame", a11yDescription: "Nine cookies in a ten frame." }),
  ex({ id: "ca-tap-10-apple", skillId: "math.count.cardinality", objective: "Count 10 scattered objects", difficulty: 4, interaction: "tap-count", answer: { kind: "number", value: 10, choices: [9, 10, 11] }, objectKind: "apple", seed: 44, layout: "scatter", a11yDescription: "Ten apples scattered on the blanket." }),
];

export const fixtureGame: GameDefinition = {
  id: "counting-fixture",
  title: "Counting fixture",
  mascot: "bobbo",
  ages: AGES,
  skillIds: ["math.count.one-to-one", "math.count.cardinality", "math.count.subitize", "math.count.make-set"],
  learningObjective: "Test fixture.",
  progression: { roundLength: 8, maxLevel: 3, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: fixtureExercises,
  achievement: { id: "counting-champ", title: "Counting Champ" },
};

export const fixture = (id: string): Exercise => {
  const e = fixtureExercises.find((x) => x.id === id);
  if (!e) throw new Error(`no fixture ${id}`);
  return e;
};
