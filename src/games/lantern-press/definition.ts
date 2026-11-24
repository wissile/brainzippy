import type { GameDefinition } from "../../engine/types";
import { LP_AGES, LP_MAX_LEVEL, SKILLS, generateLanternPress, tutorialExercise } from "./generator";

/**
 * The Lantern Press — DATA only. Exercises are generated per round (./generator.ts); the guided tutorial is authored.
 * English path, band D (ages 12–14): the learner is copy editor of Monster Island's evening paper and judges writers'
 * choices: connectives and sentence combining, misplaced modifiers, vague pronouns, redundancy, connotation,
 * figurative language (incl. verbal irony and puns), active and passive voice, claims and evidence, and whether
 * evidence is relevant and sufficient. Skills: src/content/packs/english-lantern-press. Pedagogy:
 * docs/worlds/lantern-press.md.
 */
export const lanternTutorial = tutorialExercise();

export const lanternPress: GameDefinition = {
  id: "lantern-press",
  title: "The Lantern Press",
  mascot: "sarah",
  ages: LP_AGES,
  skillIds: [SKILLS.combine, SKILLS.figurative, SKILLS.modifier, SKILLS.pronoun, SKILLS.concise, SKILLS.connotation, SKILLS.voice, SKILLS.claim, SKILLS.evaluate],
  learningObjective:
    "Judge which version of a sentence says what the writer means: combine sentences with the right connective, fix misplaced modifiers and vague pronouns, cut redundancy, choose words by connotation, interpret figurative language, choose active or passive voice for a purpose, and tell claims from evidence and judge whether evidence is relevant and sufficient.",
  progression: { roundLength: 8, maxLevel: LP_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [lanternTutorial],
  generate: generateLanternPress,
  achievement: { id: "editors-pen", title: "Editor's Pen" },
};
