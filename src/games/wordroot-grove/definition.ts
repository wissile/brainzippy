import type { Exercise, GameDefinition } from "../../engine/types";
import { SKILLS, WG_AGES, WG_MAX_LEVEL, generateWordroot } from "./generator";
import { MODE } from "./logic";

/**
 * Wordroot Grove — DATA only. Exercises are generated per round (./generator.ts); the guided tutorial is authored.
 * English path, band C (ages 9–11): word parts (prefixes, suffixes, Greek and Latin roots), word class, context clues
 * with invented words, apostrophes and commonly confused words. Skills: src/content/packs/english-wordroot-grove.
 * Pedagogy: docs/worlds/wordroot-grove.md.
 */
export const wordrootTutorial: Exercise = {
  id: "wg-meaning-unlock-tutorial",
  skillId: SKILLS.affix,
  objective: "Use the prefix un- to work out what unlock means",
  ages: WG_AGES,
  difficulty: 1,
  interaction: "choose",
  answer: {
    kind: "choice",
    correct: "open-the-lock",
    options: [
      { id: "lock-it-again", text: "lock it again" },
      { id: "open-the-lock", text: "open the lock" },
      { id: "lock-it-ahead-of-time", text: "lock it ahead of time" },
    ],
  },
  objectKind: "leaf",
  seed: 7,
  tutorial: true,
  params: { m: MODE.meaning, b: 0, k: 0 },
  prompt: { line: "wg.prompt.meaning", text: "What does this word mean?" },
  a11yDescription: "A leaf shows the word unlock: un, then lock. Three meanings: lock it again; open the lock; lock it ahead of time. Choose what the word means.",
};

export const wordrootGrove: GameDefinition = {
  id: "wordroot-grove",
  title: "Wordroot Grove",
  mascot: "sarah",
  ages: WG_AGES,
  // order matters only for the public OG card, which names the second skill (roots)
  skillIds: [SKILLS.affix, SKILLS.roots, SKILLS.wordClass, SKILLS.context, SKILLS.apostrophe, SKILLS.confused],
  learningObjective:
    "Work out what unfamiliar words mean from their parts (prefixes, suffixes, Greek and Latin roots) and from clues in the surrounding sentences; tell nouns, verbs, adjectives and adverbs apart by suffix and job; and choose apostrophes and commonly confused words in context.",
  progression: { roundLength: 8, maxLevel: WG_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [wordrootTutorial],
  generate: generateWordroot,
  achievement: { id: "root-reader", title: "Root Reader" },
};
