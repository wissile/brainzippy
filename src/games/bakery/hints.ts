import type { Exercise } from "../../engine/types";
import type { ExerciseState } from "../../engine/session";
import { type Kind, compareId, decode, diagnose, modelSteps as stepsOf } from "./logic";

/**
 * Helper (Puff, Bobbo's baking partner) and praise lines — pure, unit-tested.
 * Round start: Puff explains the METHOD of the first item's inner game. First miss: a line chosen from the wrong answer
 * (the misconception it most likely shows), teaching the strategy without giving the answer. Second miss: the board
 * shows `modelSteps(ex)` one per runner step and sets the answer for the child to confirm.
 */
export const EXPLAIN: Record<Kind, string> = {
  count: "bk.help.count",
  build: "bk.help.build",
  fact: "bk.help.fact",
  missing: "bk.help.missing",
  area: "bk.help.area",
  perim: "bk.help.perim",
  make: "bk.help.make",
  lshape: "bk.help.lshape",
  of: "bk.help.of",
  equiv: "bk.help.equiv",
  cmp: "bk.help.cmp",
  pw: "bk.help.bar",
  cmpb: "bk.help.cmpb",
  mulb: "bk.help.mulb",
  timesb: "bk.help.timesb",
  fracb: "bk.help.fracb",
  order: "bk.help.order",
};

export function explainFor(ex: Pick<Exercise, "params">): string {
  return EXPLAIN[decode(ex).kind];
}

/** First-miss line, diagnosed from what the child entered or chose. Falls back to the inner game's method line. */
export function hintFor(st: Pick<ExerciseState, "exercise" | "lastAnswer">): string {
  const s = decode(st.exercise);
  const v = st.lastAnswer;
  if (s.kind === "cmp") {
    const right = compareId(s.a, s.b, s.c, s.d);
    if (right === "same") return "bk.hint.cmp.isSame";
    if (v === "same") return "bk.hint.cmp.notSame";
    // picked the wrong side
    if (s.a === s.c) return "bk.hint.cmp.bigDen";
    if (s.b === s.d) return "bk.hint.cmp.smallNum";
    return "bk.hint.cmp.half";
  }
  if (typeof v !== "number") return EXPLAIN[s.kind];
  const why = diagnose(s, v);
  return why ? `bk.hint.${why}` : EXPLAIN[s.kind];
}

/** Every first-miss line hintFor can return (voice coverage test). */
export const HINT_WHYS = [
  "added", "oneRow", "oneCol", "rowOff", "swap", "sameTotal", "rowsOff", "colsOff", "neighbour", "subtracted", "addedDiv", "multiplied",
  "offByOne", "perimeter", "addedSides", "edgeTiles", "area", "half", "edgeSquares", "threeSides", "box", "onePart", "addedNotch", "byNum",
  "noDivide", "rest", "subNum", "sameTop", "addSame", "oneStep", "sold", "addAll", "forgotMore", "moreTwice", "oneStepPuff", "whoHasMore",
  "addedGroups", "forgotExtra", "extraEach", "wrongGroups", "oneStepTimes", "addedTimes", "bobboOnly", "total", "part", "lineTray",
  "lineBoxes", "lineBrownies", "lineFrac", "lineExtra", "missedLine",
] as const;

/** Praise the process the item needed (never ability, never speed). */
export function praiseFor(ex: Pick<Exercise, "params">): string[] {
  switch (decode(ex).kind) {
    case "count": case "fact": return ["bk.praise.rows", "bk.praise.rows2"];
    case "build": return ["bk.praise.build"];
    case "missing": return ["bk.praise.missing"];
    case "area": case "make": return ["bk.praise.area"];
    case "perim": return ["bk.praise.perim"];
    case "lshape": return ["bk.praise.lshape"];
    case "of": return ["bk.praise.of"];
    case "equiv": return ["bk.praise.equiv"];
    case "cmp": return ["bk.praise.cmp"];
    case "pw": case "cmpb": case "mulb": case "timesb": case "fracb": return ["bk.praise.bar", "bk.praise.bar2"];
    case "order": return ["bk.praise.order"];
  }
}

/** Worked model steps for the exercise (the board renders them; the runner steps through them). */
export const modelSteps = (ex: Pick<Exercise, "params">): string[] => stepsOf(decode(ex));
