import type { Exercise, GameDefinition } from "../../engine/types";
import { CR_AGES, CR_MAX_LEVEL, SKILL, TUTORIAL_SCENARIO, crExercise, generateCompassRunways } from "./generator";

/**
 * Compass Rose Runways — DATA only. Items are generated per round (./generator.ts); the guided tutorial is authored.
 * Spec: docs/curriculum/pilot.md §3 world 5 (+ world 3 for the windsock). Pedagogy, levels, conventions and review
 * flags: docs/worlds/compass-runways.md. Educational only: not flight training and not for navigation. Skills
 * (packs/compass-runways):
 *   pilot.wx.wind        read a windsock; name wind by where it comes FROM; land into the wind; head- vs crosswind
 *   pilot.nav.headings   headings 1–360 and runway numbers (heading ÷ 10, ends differ by 18); turns by degrees
 */
export const crTutorial: Exercise = {
  ...crExercise(TUTORIAL_SCENARIO, { id: "cr-tutorial-east", seed: 41 }),
  difficulty: 1,
};

export const compassRunways: GameDefinition = {
  id: "compass-runways",
  title: "Compass Rose Runways",
  mascot: "ziggy",
  ages: CR_AGES,
  skillIds: [SKILL.wind, SKILL.headings],
  learningObjective:
    "Read a windsock and name the wind by where it comes from, use headings from 1 to 360 and runway numbers (heading ÷ 10, rounded; the two ends differ by 18), work out a new heading after a turn (including past 360), choose the runway end that faces into the wind, and tell a headwind from a crosswind.",
  progression: { roundLength: 8, maxLevel: CR_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [crTutorial],
  generate: generateCompassRunways,
  achievement: { id: "compass-rose-pin", title: "Compass Rose Pin" },
};
