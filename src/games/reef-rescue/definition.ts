import type { Exercise, GameDefinition } from "../../engine/types";
import { ANIMALS } from "./facts";
import { REEF_AGES, REEF_MAX_LEVEL, SKILL, eatsExercise, generateReefRescue } from "./generator";

/**
 * Ripple's Reef Rescue — DATA only. Items are generated per round from the reviewed fact table
 * (./facts.ts, ./generator.ts); the guided tutorial is authored. Spec: docs/curriculum/nature.md §4.
 *   nature.habitat.needs   who eats what; species to the zone that meets their needs   (K-ESS3-1, context 8+)
 *   nature.web.chain       food chains from the sun; arrows = "gives energy to"        (5-LS2-1)
 *   nature.reef.coral      coral is an animal; algae partners give food and colour     (MS-LS2-2)
 *   nature.reef.bleaching  the bleaching cause chain; recovery; reading a heat chart  (MS-LS2-4, MS-ESS3-5 context)
 *   nature.reef.restore    actions that help; planting coral where it can grow        (MS-LS2-5, MS-ESS3-3)
 *   nature.web.change      removing grazers lets algae smother coral                  (MS-LS2-1, MS-LS2-4)
 */
export const reefTutorial: Exercise = {
  ...eatsExercise(ANIMALS[0]!, ["algae", "fish"], { id: "rr-tutorial-parrotfish", seed: 41, skillId: SKILL.needs, tutorial: true }),
  difficulty: 1,
};

export const reefRescue: GameDefinition = {
  id: "reef-rescue",
  title: "Ripple's Reef Rescue",
  mascot: "ripple",
  ages: REEF_AGES,
  skillIds: [SKILL.needs, SKILL.chain, SKILL.coral, SKILL.bleaching, SKILL.restore, SKILL.change],
  learningObjective:
    "Explain how a reef food chain works, what corals and other reef species need, why reefs bleach, and which actions help them recover.",
  progression: { roundLength: 8, maxLevel: REEF_MAX_LEVEL, stepUpAfter: 3, stepDownAtAttempts: 3 },
  exercises: [reefTutorial],
  generate: generateReefRescue,
  achievement: { id: "reef-guardian", title: "Reef Guardian" },
};
