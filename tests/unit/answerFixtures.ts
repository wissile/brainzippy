import type { Answer, Exercise } from "../../src/engine/types";

/** One sample answer of every kind (synthetic test data). */
export const ANSWERS = {
  number: { kind: "number", value: 7, choices: [6, 7, 8] },
  choice: { kind: "choice", correct: "ball", options: [{ id: "cat", text: "cat", art: "cat" }, { id: "ball", text: "ball", art: "ball" }, { id: "sun", text: "sun" }] },
  sequence: { kind: "sequence", order: ["b", "o1", "o2", "k"], pieces: [{ id: "k", text: "k" }, { id: "o1", text: "o" }, { id: "b", text: "b" }, { id: "x", text: "x" }, { id: "o2", text: "o" }] },
  set: { kind: "set", correct: ["p2", "p3"], options: [{ id: "p1", text: "password" }, { id: "p2", text: "Tr33-Kite-Lamp!" }, { id: "p3", text: "blue-river-81-jump" }, { id: "p4", text: "1234" }] },
  match: { kind: "match", pairs: { cow: "farm", fish: "sea", crab: "sea" }, items: [{ id: "cow", art: "cow" }, { id: "fish", art: "fish" }, { id: "crab", art: "crab" }], targets: [{ id: "farm", text: "Farm" }, { id: "sea", text: "Sea" }] },
  numeric: { kind: "numeric", value: 120, tolerance: 5, unit: "knots", min: 0, max: 300, step: 5 },
} as const satisfies Record<Answer["kind"], Answer>;

export function exerciseWith(answer: Answer, extra: Partial<Exercise> = {}): Exercise {
  return {
    id: "x-1",
    skillId: "test.skill",
    objective: "Test objective",
    ages: [6, 8],
    difficulty: 1,
    interaction: "choose",
    answer,
    objectKind: "star",
    seed: 1,
    a11yDescription: "A test exercise.",
    ...extra,
  };
}
