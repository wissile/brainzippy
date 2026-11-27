import type { Exercise, GameDefinition } from "../../engine/types";
import { createRng } from "../../engine/rng";
import { BAND, GB_AGES, GB_LEVELS, GB_MAX_LEVEL, SKILL, generateBubbleBath, sortExercise } from "./generator";

/**
 * Gloop's Bubble Bath — DATA only. Items are generated per round (./generator.ts); the guided tutorial is authored
 * (built once from a fixed seed so it is the same for every child). First stop of the Maths journey (ages 3–4).
 * Five inner games in one bathtub (Shape Splash, Quick Look, More or Fewer, Size Line, Bubble Parade finale).
 * Pedagogy, level table and review notes: docs/worlds/bubble-bath.md.
 * Skills:
 *   math.shape.name          match and find circles, squares, triangles in any size or turn         (math-shape-squish)
 *   math.count.subitize      say how many (1–5) at a glance, using little groups                     (core-math)
 *   math.count.compare       more / fewer / the same, by matching each duck with a partner           (new, packs/bubble-bath)
 *   math.measure.order-size  line up 3–4 things from smallest to biggest                            (new, packs/bubble-bath)
 *   math.count.one-to-one    finale, levels 0–3: pop each bubble once while counting, then how many  (core-math)
 *   math.count.sequence      finale, levels 4–7: find the numerals 1–5 in counting order             (new, packs/bubble-bath)
 */
const tutorialItem = sortExercise(0, createRng(20261127), 0, GB_LEVELS[0]!.sort, true);
// the tutorial always shows a circle and a square toy, one per hole, upright
export const bathTutorial: Exercise = { ...tutorialItem, difficulty: 1, seed: 11 };

export const bubbleBath: GameDefinition = {
  id: "bubble-bath",
  title: "Gloop's Bubble Bath",
  mascot: "gloop",
  ages: GB_AGES,
  skillIds: [SKILL.shape, SKILL.subitize, SKILL.compare, SKILL.order, SKILL.oneToOne, SKILL.sequence],
  learningObjective:
    "Match and find circles, squares and triangles in any size or turn, see small amounts (1–5) at a glance, compare two groups by matching (more, fewer, the same), put things in order of size, count each object once, and find the numbers one to five in counting order.",
  // stepUpAfter 3 (was 2): an all-first-try round climbs two bands at most (items 4 and 7), so at most two new inner
  // games arrive mid-round, each introduced by Bobbo (skin.helper.explainKey). 4 would keep it to one band but then a
  // round never shows the evidence the path's U1 skip rule needs (items at level + 3; tests/unit/paths.test.ts).
  progression: { roundLength: BAND, maxLevel: GB_MAX_LEVEL, stepUpAfter: 3, stepDownAtAttempts: 3 },
  exercises: [bathTutorial],
  generate: generateBubbleBath,
  achievement: { id: "bubble-buddy", title: "Bubble Buddy" },
};
