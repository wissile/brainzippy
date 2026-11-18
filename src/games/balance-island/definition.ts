import type { Exercise, GameDefinition } from "../../engine/types";
import { BALANCE_AGES, BALANCE_MAX_LEVEL, SKILL, exerciseFrom, generateBalance } from "./generator";

/**
 * Balance Scale Island — DATA only. Equations are generated per round (./generator.ts); the guided tutorial is
 * authored. Skills (docs/curriculum/maths.md §2):
 *   math.alg.one-step    solve x + p = q and px = q by balancing (6.EE.B.7)
 *   math.alg.two-step    solve px + q = r, including from word stories (7.EE.B.4)
 *   math.alg.both-sides  solve px + q = sx + r with the unknown on both sides (8.EE.C.7b)
 */
export const balanceTutorial: Exercise = {
  ...exerciseFrom({ l: { x: 1, n: 3 }, r: { x: 0, n: 7 } }, { id: "bi-tutorial-x-plus-3", seed: 31, tutorial: true }),
  difficulty: 1,
};

export const balanceIsland: GameDefinition = {
  id: "balance-island",
  title: "Balance Scale Island",
  mascot: "bobbo",
  ages: BALANCE_AGES,
  skillIds: [SKILL.one, SKILL.two, SKILL.both],
  learningObjective:
    "Solve linear equations by keeping both sides balanced: do the same to both sides (take away equal amounts, split into equal groups), move from one-step to two-step equations and unknowns on both sides, and write word stories as equations.",
  progression: { roundLength: 8, maxLevel: BALANCE_MAX_LEVEL, stepUpAfter: 3, stepDownAtAttempts: 3 },
  exercises: [balanceTutorial],
  generate: generateBalance,
  achievement: { id: "balance-keeper", title: "Balance Keeper" },
};
