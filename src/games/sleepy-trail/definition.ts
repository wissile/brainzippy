import type { Exercise, GameDefinition } from "../../engine/types";
import { AGES, MAX_LEVEL, SKILLS, buildExercise, generateSleepyTrail } from "./generator";

/**
 * Rumble's Sleepy Trail — DATA only. Fractions as positions on a number line (maths.md §4).
 * The authored tutorial (spec L0): find 1/2 on a 0–1 trail split into halves, with a pointing hand on the middle post.
 * Everything else comes from the seeded generator (9 levels, see generator.ts LEVELS).
 */
const tutorial: Exercise = {
  ...buildExercise({ mode: "place", M: 1, P: 2, a: 1, d: 2 }, "st-tutorial-1-2", 4242, SKILLS.unit, true),
  difficulty: 1,
};

export const sleepyTrail: GameDefinition = {
  id: "sleepy-trail",
  title: "Rumble's Sleepy Trail",
  mascot: "rumble",
  ages: AGES,
  skillIds: [SKILLS.unit, SKILLS.onLine, SKILLS.equivalent, SKILLS.compare, SKILLS.estimate],
  learningObjective: "Show a fraction as a point on the number line by counting equal jumps from zero.",
  progression: { roundLength: 8, maxLevel: MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [tutorial],
  generate: generateSleepyTrail,
  achievement: { id: "trail-marker", title: "Trail Marker" },
};
