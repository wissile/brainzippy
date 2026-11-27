import type { Exercise, GameDefinition } from "../../engine/types";
import { BK_AGES, BK_MAX_LEVEL, SKILL, TUTORIAL_SCENARIO, bkExercise, generateBakery } from "./generator";

/**
 * Bobbo's Bakery — DATA only. Items are generated per round (./generator.ts); the guided tutorial is authored.
 * Pedagogy, level table, misconceptions and accuracy notes: docs/worlds/bakery.md. Skills (packs/bakery):
 *   math.mult.arrays          Tray Arrays: count, build and multiply arrays (facts to 12 × 12)
 *   math.div.missing-factor   Tray Arrays: division as a missing factor (equal rows)
 *   math.geom.area-perimeter  Tray Builder: area, perimeter, missing side, L-shapes
 *   math.frac.of-amount       Batch Fractions: a fraction of an amount
 *   math.frac.equivalent      Batch Fractions: equivalent fractions on a cake (shared with Sleepy Trail)
 *   math.frac.compare         Batch Fractions: compare fractions (shared with Sleepy Trail)
 *   math.solve.bar-model      Bar-Model Orders and the Festival Order Sheet (closer): two-step and multi-step problems
 */
export const bkTutorial: Exercise = {
  ...bkExercise(TUTORIAL_SCENARIO, { id: "bk-tutorial-build", seed: 23 }),
  difficulty: 1,
};

export const bakery: GameDefinition = {
  id: "bakery",
  title: "Bobbo's Bakery",
  mascot: "bobbo",
  ages: BK_AGES,
  skillIds: [SKILL.arrays, SKILL.missing, SKILL.area, SKILL.of, SKILL.equiv, SKILL.compare, SKILL.bar],
  learningObjective:
    "Use arrays for multiplication facts to 12 × 12 and for division as a missing factor; find the area and perimeter of rectangles and L-shapes; find a fraction of an amount, show equivalent fractions and compare fractions; and solve two-step word problems by drawing them as bar models.",
  progression: { roundLength: 8, maxLevel: BK_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [bkTutorial],
  generate: generateBakery,
  achievement: { id: "head-baker-hat", title: "Head Baker's Hat" },
};
