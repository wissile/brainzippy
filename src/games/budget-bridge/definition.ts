import type { Exercise, GameDefinition } from "../../engine/types";
import { BB_AGES, BB_MAX_LEVEL, SKILL, exerciseFor, generateBudgetBridge } from "./generator";

/**
 * Brix's Budget Bridge — DATA only. Sites are generated per round (./generator.ts); the guided tutorial is
 * authored. Spec: docs/curriculum/engineering.md §4; pedagogy and model: docs/worlds/budget-bridge.md.
 * Skills (packs/library-engr):
 *   engr.struct.span-load   trade span, material, supports and cost to carry a load       levels 0–2, 5
 *   engr.struct.triangle    triangles keep their shape and make a span stronger           levels 3–4
 *   engr.design.criteria    meet criteria (holds the bus) within a constraint (budget)    level 6
 *   engr.design.iterate     use a test result to improve a design                         levels 7–8
 */
export const bridgeTutorial: Exercise = {
  ...exerciseFor(
    {
      gap: 1, ground: [true], vehicle: "scooter", budget: 20, pieces: ["wood"], mode: "build",
      solution: [{ deck: "wood", pillar: false, brace: false }], given: null, weak: null, best: 10,
    },
    { id: "bb-tutorial-plank", seed: 52, skillId: SKILL.spanLoad, tutorial: true },
  ),
  difficulty: 1,
};

export const budgetBridge: GameDefinition = {
  id: "budget-bridge",
  title: "Brix's Budget Bridge",
  mascot: "brix",
  ages: BB_AGES,
  skillIds: [SKILL.spanLoad, SKILL.triangle, SKILL.criteria, SKILL.iterate],
  learningObjective:
    "Design a bridge that carries a vehicle and stays within a budget, using pillars to shorten spans, the right material and triangle braces; load-test it, see which span sags, and improve that part.",
  progression: { roundLength: 8, maxLevel: BB_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [bridgeTutorial],
  generate: generateBudgetBridge,
  achievement: { id: "bridge-builder", title: "Bridge Builder" },
};
