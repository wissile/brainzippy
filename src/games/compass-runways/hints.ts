import type { Exercise } from "../../engine/types";
import type { ExerciseState } from "../../engine/session";
import {
  type Kind, type Scenario, answerFor, bestEnd, airportEnds, decode, degId, hdgId, pointOf, reciprocal, runwayHeading, runwayNumber, rwId,
  offCompass, sockPoints, turnHeading, type Dir,
} from "./logic";

/**
 * Helper (Gloop, who can stretch into any angle) and praise lines — pure, unit-tested.
 * Round-start lines explain the idea of the item; first-miss lines are diagnosed from the miss (the misconception it
 * most likely shows) and teach the strategy without giving the answer. The second miss is modelled on the board.
 */
export const EXPLAIN: Record<Kind, string> = {
  strength: "cr.help.strength",
  from4: "cr.help.from",
  from8: "cr.help.from",
  fromDeg: "cr.help.fromDeg",
  card: "cr.help.paint",
  ten: "cr.help.paint",
  round: "cr.help.round",
  opp: "cr.help.opp",
  rotate: "cr.help.rotate",
  quarter: "cr.help.turn",
  turn: "cr.help.turn",
  wrap: "cr.help.wrap",
  two: "cr.help.land",
  four: "cr.help.land",
  xwind: "cr.help.xwind",
  twind: "cr.help.tower",
  tline: "cr.help.tower",
  tjoin: "cr.help.tower",
  tcomp: "cr.help.xwind",
};

export function explainFor(ex: Pick<Exercise, "params">): string {
  const s = decode(ex);
  if (s.kind === "wrap" && s.dir === -1) return "cr.help.wrapLeft";
  return EXPLAIN[s.kind];
}

const asNum = (v: unknown): number | null => (typeof v === "number" ? v : null);
const asStr = (v: unknown): string => (typeof v === "string" ? v : "");

/** First-miss line, diagnosed from what the child entered or chose. */
export function hintFor(st: Pick<ExerciseState, "exercise" | "lastAnswer">): string {
  const s: Scenario = decode(st.exercise);
  const v = st.lastAnswer;
  switch (s.kind) {
    case "strength":
      return "cr.help.strength";
    case "from4":
    case "from8":
      return asStr(v) === pointOf(sockPoints(s.w)) ? "cr.hint.toWind" : "cr.hint.mouth";
    case "fromDeg":
      return asStr(v) === degId(sockPoints(s.w)) ? "cr.hint.toWind" : "cr.hint.ticks";
    case "card":
    case "ten":
    case "round": {
      const n = asNum(v);
      const right = runwayNumber(s.h);
      if (n === reciprocal(right)) return "cr.hint.recip";
      // one off (36 and 01 are neighbours): rounded the wrong way, or cut off instead of rounding
      if (s.kind === "round" && n !== null && [1, 35].includes(Math.abs(n - right))) return "cr.hint.roundCheck";
      return s.kind === "round" ? "cr.help.round" : "cr.help.paint";
    }
    case "opp":
      return asNum(v) === runwayNumber(s.h) ? "cr.hint.oppSame" : "cr.help.opp";
    case "rotate": {
      const h = asNum(v);
      if (h === runwayHeading(reciprocal(s.n))) return "cr.hint.flip";
      if (h === s.n) return "cr.hint.addZero";
      return "cr.help.rotate";
    }
    case "quarter":
    case "turn":
    case "wrap": {
      const n = asNum(v);
      // off the compass (above 360 or below 1): the turn was worked out but not wrapped round north
      if (n !== null && offCompass(n)) {
        if (n === s.h + s.dir * s.d) return n > 360 ? "cr.hint.over360" : "cr.hint.under0";
        return n > 360 ? "cr.help.wrap" : "cr.help.wrapLeft";
      }
      if (n === turnHeading(s.h, (-s.dir) as Dir, s.d)) return "cr.hint.turnWay";
      if (s.kind === "wrap") return s.dir === 1 ? "cr.help.wrap" : "cr.help.wrapLeft";
      return "cr.help.turn";
    }
    case "two":
    case "four":
    case "twind": {
      const best = bestEnd(airportEnds(s), s.w);
      return asStr(v) === rwId(reciprocal(best)) ? "cr.hint.tail" : "cr.hint.side";
    }
    case "xwind":
    case "tcomp": {
      const right = answerFor(s);
      const pick = asStr(v);
      if (right === "cross") return "cr.hint.across";
      if ((right === "head" && pick === "tail") || (right === "tail" && pick === "head")) return "cr.hint.frontBack";
      return "cr.hint.along";
    }
    case "tline": {
      const pick = asStr(v);
      if (pick === hdgId(runwayHeading(reciprocal(s.n)))) return "cr.hint.lineRecip";
      return "cr.hint.addZero";
    }
    case "tjoin": {
      const wrong = runwayNumber(turnHeading(s.h, (-s.dir) as Dir, s.d));
      return asStr(v) === rwId(wrong) || asStr(v) === rwId(reciprocal(wrong)) ? "cr.hint.turnWay" : "cr.hint.steps";
    }
  }
}

/** Praise the process the item needed (never ability). */
export function praiseFor(ex: Pick<Exercise, "params">): string[] {
  const s = decode(ex);
  switch (s.kind) {
    case "strength":
      return ["cr.praise.strength"];
    case "from4":
    case "from8":
      return ["cr.praise.from", "cr.praise.from2"];
    case "fromDeg":
      return ["cr.praise.fromDeg"];
    case "card":
    case "ten":
      return ["cr.praise.paint"];
    case "round":
      return ["cr.praise.round"];
    case "opp":
      return ["cr.praise.opp"];
    case "rotate":
      return ["cr.praise.rotate"];
    case "quarter":
    case "turn":
      return [s.dir === 1 ? "cr.praise.turnRight" : "cr.praise.turnLeft"];
    case "wrap":
      return ["cr.praise.wrap"];
    case "two":
    case "four":
      return ["cr.praise.land", "cr.praise.land2"];
    case "xwind":
    case "tcomp":
      return ["cr.praise.xwind"];
    case "twind":
      return ["cr.praise.twind"];
    case "tline":
      return ["cr.praise.tline"];
    case "tjoin":
      return ["cr.praise.tjoin"];
  }
}
