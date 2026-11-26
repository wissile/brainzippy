import { createRng } from "../../engine/rng";
import type { Exercise, GameDefinition } from "../../engine/types";
import { FP_AGES, FP_MAX_LEVEL, SKILL, generateFlightPlan, tunnelFind } from "./generator";

/**
 * Ziggy's Flight Plan — DATA only. Items are generated per round (./generator.ts); the guided tutorial is authored.
 * Pedagogy, levels, sources and instructor-review flags: docs/worlds/flight-plan.md. Educational only: not flight
 * training, not FAA-approved ground training, never for navigation; chart, weather and minimums are fictional.
 *   pilot.aero.aoa       wind tunnel: lift vs angle of attack and speed, the critical angle, stall recovery
 *   pilot.nav.tsd        leg timer: time = distance ÷ groundspeed, head/tailwind, rounding, two-leg totals
 *   pilot.wx.metar       weather brief: decode simplified METAR groups; fly or wait against a practice card
 *   pilot.reg.preflight  checklist: order pre-flight steps; spot the missing planning item
 *   pilot.adm.risk       IMSAFE; the go / no-go briefing that closes every round (engine R5a `closer`)
 */
export const fpTutorial: Exercise = {
  ...tunnelFind(0, createRng(31), { flaps: false, graph: true, id: "fp-tutorial-find", seed: 31, crit: 16, tutorial: true }),
  difficulty: 1,
};

export const flightPlan: GameDefinition = {
  id: "flight-plan",
  title: "Ziggy's Flight Plan",
  mascot: "ziggy",
  ages: FP_AGES,
  skillIds: [SKILL.aoa, SKILL.tsd, SKILL.metar, SKILL.preflight, SKILL.risk],
  learningObjective:
    "Plan a (fictional) flight like a pilot: find where a model wing stalls and why a stall can happen at any speed, time each leg with time = distance ÷ groundspeed, decode simple METAR weather groups and compare them with a practice minimums card, order a pre-flight checklist and use IMSAFE, then combine it all into a go / no-go decision.",
  progression: { roundLength: 8, maxLevel: FP_MAX_LEVEL, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [fpTutorial],
  generate: generateFlightPlan,
  achievement: { id: "copilot-clipboard", title: "Co-pilot's Clipboard" },
};
