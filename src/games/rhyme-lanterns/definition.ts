import type { Exercise, GameDefinition } from "../../engine/types";
import { NO, RHYME_AGES, RHYME_MAX_LEVEL, RHYME_SKILL, YES, generateRhymeLanterns } from "./generator";

/**
 * Hoot's Rhyme Lanterns — DATA only. Exercises are generated per round (./generator.ts); the guided tutorial is authored.
 * Skill (src/content/packs/english-rhyme-lanterns): english.phon.rhyme — tell whether two spoken words rhyme,
 * pick a rhyming word, spot the word that does not rhyme, and build a chain of rhymes. No reading needed:
 * every picture is spoken. Pedagogy: docs/worlds/rhyme-lanterns.md.
 */
export const rhymeTutorial: Exercise = {
  id: "rl-yesno-cat-hat-tutorial",
  skillId: RHYME_SKILL,
  objective: "Hear that cat and hat rhyme",
  ages: RHYME_AGES,
  difficulty: 1,
  interaction: "choose",
  answer: { kind: "choice", correct: "yes", options: [YES, NO] },
  objectKind: "cat",
  seed: 7,
  tutorial: true,
  params: { mode: 0 },
  prompt: { line: "rl.ask.yesno", vars: { a: "cat", b: "hat" }, text: "Do cat and hat rhyme?" },
  a11yDescription: "Hoot's lantern shows a cat. The next lantern shows a hat. Do cat and hat rhyme? Choose yes or no.",
};

export const rhymeLanterns: GameDefinition = {
  id: "rhyme-lanterns",
  title: "Hoot's Rhyme Lanterns",
  mascot: "hoot",
  ages: RHYME_AGES,
  skillIds: [RHYME_SKILL],
  learningObjective: "Hear when two spoken words rhyme (sound the same at the end), pick a rhyming word, spot a word that does not rhyme, and build a chain of rhymes.",
  progression: { roundLength: 8, maxLevel: RHYME_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [rhymeTutorial],
  generate: generateRhymeLanterns,
  achievement: { id: "lantern-keeper", title: "Lantern Keeper" },
};
