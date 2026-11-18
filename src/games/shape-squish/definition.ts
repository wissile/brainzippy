import type { Exercise, GameDefinition } from "../../engine/types";
import { encodeShape } from "./shapes";
import { KIND_LIST, SKILL_ATTR, SKILL_COMPOSE, SKILL_NAME, SS_AGES, SS_MAX_LEVEL, generateShapeSquish } from "./generator";

/**
 * Gloop's Shape Squish — DATA only. Exercises are generated per round (./generator.ts); the tutorial is authored.
 * Skills (src/content/packs/math-shape-squish):
 *   math.shape.name        name circles, triangles, squares, rectangles and hexagons in any size or turn
 *   math.shape.attributes  sort shapes by their sides and corners
 *   math.shape.compose     make a larger shape from smaller ones
 */
export const shapeTutorial: Exercise = {
  id: "ss-gate-circle-tutorial",
  skillId: SKILL_NAME,
  objective: "Find the circle among 2 shapes",
  ages: SS_AGES,
  difficulty: 1,
  interaction: "choose",
  answer: {
    kind: "choice",
    correct: "b",
    options: [
      { id: "a", art: encodeShape({ kind: "square", rot: 0, stretch: 100, size: 92, color: 3 }) },
      { id: "b", art: encodeShape({ kind: "circle", rot: 0, stretch: 100, size: 96, color: 1 }) },
    ],
  },
  objectKind: "shape-circle",
  seed: 7,
  tutorial: true,
  params: { mode: 0, gk: KIND_LIST.indexOf("circle"), gr: 0, gs: 100 },
  prompt: { line: "ss.prompt.gate", vars: { shape: "circle" }, text: "Gloop is a circle! Find the circle gate." },
  a11yDescription: "Gloop has squished into a circle. Two garden gates: one hole is round, one has 4 equal sides. Drag Gloop to the circle gate, or tap the gate.",
};

export const shapeSquish: GameDefinition = {
  id: "shape-squish",
  title: "Gloop's Shape Squish",
  mascot: "gloop",
  ages: SS_AGES,
  skillIds: [SKILL_NAME, SKILL_ATTR, SKILL_COMPOSE],
  learningObjective:
    "Name circles, squares, triangles, rectangles and hexagons in any size or turn, sort shapes by their sides and corners, and put small shapes together to make bigger ones.",
  progression: { roundLength: 8, maxLevel: SS_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [shapeTutorial],
  generate: generateShapeSquish,
  achievement: { id: "shape-squisher", title: "Shape Squisher" },
};
