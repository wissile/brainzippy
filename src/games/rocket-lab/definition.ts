import type { Exercise, GameDefinition } from "../../engine/types";
import { ROCKET_AGES, ROCKET_MAX_LEVEL, SKILL, generateRocketLab, liftExercise } from "./generator";

/**
 * Dabble's Rocket Lab — DATA only. Experiments are generated per round (./generator.ts); the guided
 * tutorial is authored. Skills (docs/curriculum/science.md §2, §4):
 *   sci.force.balanced     predict lift-off from thrust vs weight; equal forces = no change in motion (3-PS2-1)
 *   sci.force.weight-mass  weight = mass × gravity strength; mass stays the same on the Moon (5-PS2-1 context)
 *   sci.force.net          net force and mass decide acceleration (MS-PS2-2)
 */
export const rocketTutorial: Exercise = {
  ...liftExercise(6, 3, { id: "rl-tutorial-liftoff", seed: 61, tutorial: true }),
  difficulty: 1,
};

export const rocketLab: GameDefinition = {
  id: "rocket-lab",
  title: "Dabble's Rocket Lab",
  mascot: "dabble",
  ages: ROCKET_AGES,
  skillIds: [SKILL.balanced, SKILL.weightMass, SKILL.net],
  learningObjective:
    "Predict whether a rocket lifts off by comparing thrust with weight, and explain how mass and gravity change that: weight = mass × gravity strength, net force = thrust − weight, and a bigger net force per kilogram means a bigger speed-up.",
  progression: { roundLength: 8, maxLevel: ROCKET_MAX_LEVEL, stepUpAfter: 3, stepDownAtAttempts: 3 },
  exercises: [rocketTutorial],
  generate: generateRocketLab,
  achievement: { id: "launch-patch", title: "Launch Patch" },
};
