import type { Exercise, GameDefinition } from "../../engine/types";
import { LEVEL_SKILL, PB_AGES, PB_MAX_LEVEL, SKILLS, generatePaperBoat } from "./generator";
import { MODE } from "./logic";

/**
 * Paper Boat Post — DATA only. Exercises are generated per round (./generator.ts); the guided tutorial is authored.
 * English path, band B (ages 6–8): decoding and spelling from word families to short sentences.
 * Skills: src/content/packs/english-paper-boat-post. Pedagogy: docs/worlds/paper-boat-post.md.
 * Reading items never speak the printed word before the child answers (ENGLISH_PATH §6.1).
 */
export const paperBoatTutorial: Exercise = {
  id: "pb-swap-cat-hat-tutorial",
  skillId: SKILLS.onsetRime,
  objective: "Change the first letter of cat to make hat",
  ages: PB_AGES,
  difficulty: 1,
  interaction: "choose",
  answer: {
    kind: "choice",
    correct: "h",
    options: [{ id: "h", text: "h", art: "horse" }, { id: "m", text: "m", art: "moon" }],
  },
  objectKind: "cat",
  seed: 11,
  tutorial: true,
  params: { m: MODE.swap },
  prompt: { line: "pb.prompt.swap.cat", vars: { from: "cat", to: "hat" }, text: "This is a cat. Can you make hat?" },
  a11yDescription: "A boat card shows a cat, spelled c, a, t. The sail shows a gap, then a, t. Two letter tiles: h for horse and m for moon. Put the first letter of hat in the gap.",
};

export const paperBoatPost: GameDefinition = {
  id: "paper-boat-post",
  title: "Paper Boat Post",
  mascot: "sarah",
  ages: PB_AGES,
  skillIds: [...new Set([...LEVEL_SKILL, SKILLS.buildSentence])],
  learningObjective: "Read (decode) and spell regular one- and two-syllable words — word families, short-vowel words, digraphs, blends, final -e and vowel teams — and read and build short sentences with a capital letter and an end mark.",
  progression: { roundLength: 8, maxLevel: PB_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [paperBoatTutorial],
  generate: generatePaperBoat,
  achievement: { id: "river-reader", title: "River Reader" },
};
