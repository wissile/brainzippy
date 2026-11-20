import type { Exercise, GameDefinition } from "../../engine/types";
import { MM_AGES, MM_MAX_LEVEL, SKILL, generateMessageMystery, messageExercise } from "./generator";
import { TUTORIAL } from "./messages";

/**
 * Fenn's Message Mystery — DATA only. Messages are authored (./messages.ts); the generator picks them per round.
 * Spec: docs/curriculum/cyber.md §4. Pedagogy, levels and sources: docs/worlds/message-mystery.md.
 * Skills (packs/library-cyber):
 *   cyber.scam.clues    spot clues that a message is a trick       levels 0–6
 *   cyber.scam.action   choose a safe action (and sort an inbox)   levels 7, 9
 *   cyber.scam.verify   check a surprising message another way     level 8
 */
export const mmTutorial: Exercise = { ...messageExercise(TUTORIAL, 0, { id: "mm-tutorial-password", seed: 7, tutorial: true }), difficulty: 1 };

export const messageMystery: GameDefinition = {
  id: "message-mystery",
  title: "Fenn's Message Mystery",
  mascot: "fenn",
  ages: MM_AGES,
  skillIds: [SKILL.clues, SKILL.action, SKILL.verify],
  learningObjective:
    "Spot clues that a message is a trick (asks for a secret, a prize too good to be true, rushing, 'don't tell', gift cards, a sender or link that doesn't match, an unexpected file) and choose a safe action: don't tap or reply, show a trusted grown-up, and check another way.",
  progression: { roundLength: 8, maxLevel: MM_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [mmTutorial],
  generate: generateMessageMystery,
  achievement: { id: "detective-badge", title: "Detective Badge" },
};
