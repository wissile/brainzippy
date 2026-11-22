import type { Exercise, GameDefinition } from "../../engine/types";
import { TUTORIAL } from "./bank";
import { FG_AGES, FG_MAX_LEVEL, FG_ROUND, FG_SKILLS, exerciseFor, generateFeelingsGarden } from "./generator";

/**
 * Snug's Feelings Garden — DATA only. Rounds are built from the authored scenario bank (./bank.ts, ./generator.ts);
 * the guided tutorial (Puff's present) is authored here. Library: Social and emotional skills (`sel`), CASEL 5.
 * Skill practice through stories — not therapy or assessment. Pedagogy + grown-up note: docs/worlds/feelings-garden.md.
 */
export const gardenTutorial: Exercise = {
  ...exerciseFor(TUTORIAL, ["happy", "sad"], 11, "tutorial"),
  difficulty: 1,
  tutorial: true,
};

export const feelingsGarden: GameDefinition = {
  id: "feelings-garden",
  title: "Snug's Feelings Garden",
  mascot: "snug",
  ages: FG_AGES,
  skillIds: [...FG_SKILLS],
  learningObjective: "Name how a character might feel using face, body and situation clues, and choose a kind or calm action.",
  progression: { roundLength: FG_ROUND, maxLevel: FG_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [gardenTutorial],
  generate: generateFeelingsGarden,
  achievement: { id: "bloom-badge", title: "Bloom Badge" },
};
