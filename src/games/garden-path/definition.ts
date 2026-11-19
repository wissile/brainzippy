import type { Exercise, GameDefinition } from "../../engine/types";
import { GP_AGES, GP_MAX_LEVEL, SKILL, exerciseFor, generateGardenPath } from "./generator";
import { move } from "./logic";

/**
 * Toggle's Garden Path — DATA only. Puzzles are generated per round (./generator.ts); the guided tutorial is
 * authored. Spec: docs/curriculum/computer-science.md §4 ("Loopi's Garden Path"; the host is Toggle).
 * Skills (packs/library-cs):
 *   cs.seq.build        build a sequence of moves that reaches a goal          levels 0–3
 *   cs.seq.decompose    break a goal into sub-goals (berry first, then home)    level 4
 *   cs.debug.sequence   find and fix the first wrong step                       level 5
 *   cs.loop.repeat      use repeat N to shorten a program                       levels 6–7
 *   cs.loop.debug       fix a wrong repeat count or body                        level 8
 */
export const gardenTutorial: Exercise = {
  ...exerciseFor(
    {
      cols: 5, rows: 1, start: 1, goal: 2, rocks: [], berries: [], slots: 1, palette: ["right"], repeat: false, bodySlots: 1,
      mode: "build", solution: [move("right")], given: null, bug: null,
    },
    { id: "gp-tutorial-right", seed: 41, skillId: SKILL.build, tutorial: true },
  ),
  difficulty: 1,
};

export const gardenPath: GameDefinition = {
  id: "garden-path",
  title: "Toggle's Garden Path",
  mascot: "toggle",
  ages: GP_AGES,
  skillIds: [SKILL.build, SKILL.decompose, SKILL.debug, SKILL.repeat, SKILL.loopDebug],
  learningObjective:
    "Build a step-by-step program of arrow cards that gets Toggle to a goal, run it and watch each step, fix the first step that goes wrong, and use a repeat card to shorten a program.",
  progression: { roundLength: 8, maxLevel: GP_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [gardenTutorial],
  generate: generateGardenPath,
  achievement: { id: "path-finder", title: "Path Finder" },
};
