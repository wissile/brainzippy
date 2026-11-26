import type { Exercise, GameDefinition } from "../../engine/types";
import { BA_AGES, BA_MAX_LEVEL, SKILL, bagArt, generateBusyAirport, planeArt } from "./generator";

/**
 * Ziggy's Busy Airport — DATA only. Items are generated per round (./generator.ts); the guided tutorial is authored.
 * Four inner games in one airport (Bag Drop, All Aboard, Runway Lights, Marshaller), unlocked level by level.
 * Pedagogy, level table and review notes: docs/worlds/busy-airport.md. Educational only: not flight training.
 * Skills:
 *   pilot.airport.sort       sort bags onto planes by colour, by shape, then by colour and shape      (new, packs/busy-airport)
 *   math.count.one-to-one    one tap, one passenger, one number                                       (core-math)
 *   math.count.cardinality   the last number counted tells how many                                   (core-math)
 *   math.count.make-set      count out exactly n passengers from a bigger group, and stop             (core-math)
 *   math.pattern.repeat      continue AB, AAB, ABB and ABC light patterns; find a missing light       (math-pattern-parade)
 *   pilot.airport.signals    follow marshalling signals: left, right, go ahead, stop, slow down      (new, packs/busy-airport)
 */
export const airportTutorial: Exercise = {
  id: "ba-bags-tutorial",
  skillId: SKILL.sort,
  objective: "Sort two bags onto planes by colour",
  ages: BA_AGES,
  difficulty: 1,
  interaction: "choose",
  answer: {
    kind: "match",
    pairs: { b1: "p2", b2: "p1" },
    items: [
      { id: "b1", art: bagArt("blue", "none") },
      { id: "b2", art: bagArt("red", "none") },
    ],
    targets: [
      { id: "p1", art: planeArt("red", "none") },
      { id: "p2", art: planeArt("blue", "none") },
    ],
  },
  objectKind: "bag",
  seed: 11,
  tutorial: true,
  params: { mode: 0, rule: 0 },
  prompt: { line: "ba.prompt.bags.colour", text: "Put each bag on the plane with the same colour!" },
  a11yDescription: "A blue suitcase and a red suitcase on a conveyor belt, and two planes: a red one and a blue one. Put each suitcase on the plane with the same colour, then press Ready.",
};

export const busyAirport: GameDefinition = {
  id: "busy-airport",
  title: "Ziggy's Busy Airport",
  mascot: "ziggy",
  ages: BA_AGES,
  skillIds: [SKILL.sort, SKILL.oneToOne, SKILL.cardinality, SKILL.makeSet, SKILL.pattern, SKILL.signals],
  learningObjective:
    "Sort things by one attribute and then two, count up to 10 with one number for each passenger and count out a set, continue repeating patterns, and follow simple direction signals: left, right, go ahead, stop and slow down.",
  progression: { roundLength: 8, maxLevel: BA_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [airportTutorial],
  generate: generateBusyAirport,
  achievement: { id: "ground-crew", title: "Ground Crew" },
};
