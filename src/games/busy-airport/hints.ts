import type { ExerciseState } from "../../engine/session";
import type { Exercise } from "../../engine/types";
import { modeOf, ruleOf, signalsOf } from "./generator";

/**
 * What Hoot (the helper in the control tower) and Ziggy say, chosen per inner game. Pure: no React, no audio.
 *  - explainFor: the concept, at round start (the first exercise of the round)
 *  - hintFor:    the strategy, after a first miss; diagnoses the miss where it can (too many / too few, which signal)
 *  - praiseFor:  process praise for the inner game that was just solved
 *  - alongSteps / alongSay: the worked example shown on the board after a second miss
 */
export function explainFor(ex: Exercise): string {
  switch (modeOf(ex)) {
    case "bags":
      return `ba.help.bags.${ruleOf(ex)}`;
    case "count":
      return "ba.help.count";
    case "make":
      return "ba.help.make";
    case "lights":
      return "ba.help.lights";
    case "signal":
      return signalsOf(ex).length === 2 ? "ba.help.signal2" : "ba.help.signal";
  }
}

export function hintFor(s: ExerciseState): string {
  const ex = s.exercise;
  switch (modeOf(ex)) {
    case "bags":
      return `ba.hint.bags.${ruleOf(ex)}`;
    case "count":
      return "ba.hint.count";
    case "make":
      return s.check?.reason === "too-high" ? "ba.hint.tooMany" : "ba.hint.tooFew";
    case "lights":
      return "ba.hint.lights";
    case "signal": {
      const sig = signalsOf(ex);
      if (sig.length === 2) return "ba.hint.signal2";
      const want = sig[0]!;
      return want === "left" || want === "right" ? "ba.hint.signal.point" : `ba.hint.signal.${want}`;
    }
  }
}

export function praiseFor(ex: Exercise): string[] {
  switch (modeOf(ex)) {
    case "bags":
      return ["ba.praise.bags.1", "ba.praise.bags.2", "ba.praise.bags.3"];
    case "count":
      return ["ba.praise.count", "ba.praise.count2"];
    case "make":
      return ["ba.praise.make", "ba.praise.make2"];
    case "lights":
      return ["ba.praise.lights.1", "ba.praise.lights.2"];
    case "signal":
      return signalsOf(ex).length === 2 ? ["ba.praise.signal2"] : ["ba.praise.signal.1", "ba.praise.signal.2"];
  }
}

/** Steps of the modelled answer: each bag loaded, each passenger counted, each light placed, each signal done. */
export function alongStepsFor(ex: Exercise): number {
  const a = ex.answer;
  switch (modeOf(ex)) {
    case "bags":
      return a.kind === "match" ? a.items.length : 0;
    case "count":
    case "make":
      return a.kind === "number" ? a.value : 0;
    case "lights":
      return a.kind === "sequence" ? a.order.length : 1;
    case "signal":
      return signalsOf(ex).length;
  }
}

/** Numbers spoken during the worked example: only when counting passengers. */
export function alongSayFor(ex: Exercise, i: number): number | null {
  const m = modeOf(ex);
  return m === "count" || m === "make" ? i + 1 : null;
}
