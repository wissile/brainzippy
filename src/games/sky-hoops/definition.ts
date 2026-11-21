import type { Exercise, GameDefinition } from "../../engine/types";
import { SH_AGES, SH_MAX_LEVEL, SKILL, generateSkyHoops, hoopsExercise } from "./generator";

/**
 * Zephy's Sky Hoops — DATA only. Items are generated per round (./generator.ts); the guided tutorial is authored.
 * Spec: docs/curriculum/pilot.md §4. Pedagogy, levels, sources and review notes: docs/worlds/sky-hoops.md.
 * Educational only: not flight training. Skills (packs/library-pilot):
 *   pilot.controls.axes       move the right control to pitch, roll or yaw, and name the movement   levels 0–6
 *   pilot.controls.turn       a plane turns by banking (tipping its wings)                          levels 7, 9
 *   pilot.flight.four-forces  lift, weight, thrust, drag; balanced in steady level flight            level 8
 */
export const shTutorial: Exercise = {
  ...hoopsExercise({ mode: "hoop", level: 0, hoop: "above" }, { id: "sh-tutorial-up", seed: 31, tutorial: true, scaffold: true }),
  difficulty: 1,
};

export const skyHoops: GameDefinition = {
  id: "sky-hoops",
  title: "Zephy's Sky Hoops",
  mascot: "zephy",
  ages: SH_AGES,
  skillIds: [SKILL.axes, SKILL.turn, SKILL.forces],
  learningObjective:
    "Move the right control to pitch, roll or yaw the plane and name the movement (stick back = nose up, stick left = roll left, left pedal = nose left), know that a plane turns by tipping its wings, and name the four forces: lift, weight, thrust and drag, balanced in steady level flight.",
  progression: { roundLength: 8, maxLevel: SH_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [shTutorial],
  generate: generateSkyHoops,
  achievement: { id: "sky-wings", title: "Sky Wings" },
};
