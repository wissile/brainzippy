import { createRng } from "../../engine/rng";
import type { Exercise, GameDefinition } from "../../engine/types";
import { LN_AGES, LN_MAX_LEVEL, SKILL, generateLighthouseNight, lineItem } from "./generator";

/**
 * Lighthouse Night — DATA only. Items are generated per round (./generator.ts); the guided tutorial is authored.
 * Pedagogy, levels and accuracy notes: docs/worlds/lighthouse-night.md. The sea chart is fictional, never for navigation.
 *   math.geom.angles       Beam Angles: lines, points, types, vertically opposite, triangles, parallel lines
 *   math.geom.bearings     Beam Angles: three-figure bearings and back bearings (the beam dial)
 *   math.geom.pythagoras   Ladder & Tower: hypotenuse, a shorter side, 1 d.p., the converse
 *   math.solve.scale-ratio Chart Scale: map ↔ real distances, scale as 1 : n, sharing in a ratio
 *   math.alg.linear-graphs Ship Paths: coordinates, gradient, intercept, y = mx + c, crossing and parallel paths
 */
export const lnTutorial: Exercise = {
  ...lineItem(0, createRng(41), { n: 2 }, "ln-tutorial-line", 41, true),
  difficulty: 1,
};

export const lighthouseNight: GameDefinition = {
  id: "lighthouse-night",
  title: "Lighthouse Night",
  mascot: "hoot",
  ages: LN_AGES,
  skillIds: [SKILL.angles, SKILL.bearings, SKILL.pyth, SKILL.scale, SKILL.graphs],
  learningObjective:
    "Guide ships home on a stormy night with maths: use angle facts (straight lines, points, vertically opposite, triangles, parallel lines) and three-figure bearings, Pythagoras' theorem, map scales and ratio, and coordinates and straight-line graphs (gradient, intercept, y = mx + c), then combine two steps for the last ship.",
  progression: { roundLength: 8, maxLevel: LN_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [lnTutorial],
  generate: generateLighthouseNight,
  achievement: { id: "keepers-lamp", title: "Keeper's Lamp" },
};
