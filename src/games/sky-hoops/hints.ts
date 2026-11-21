import type { Exercise } from "../../engine/types";
import type { ExerciseState } from "../../engine/session";
import { type Axis, CTL_AXIS, type Ctl, HOOP_CTL, decode, isPedal } from "./logic";

/**
 * Helper (Bobbo, Zephy's keen passenger who reads her manual) and praise lines — pure, unit-tested.
 * Round-start lines explain the idea of the level; first-miss lines are diagnosed from the miss (which
 * misconception it most likely shows) and name the concept, not just the answer (docs/curriculum/pilot.md §4.5–4.6).
 */
export const EXPLAIN_BY_LEVEL = [
  "sh.help.pitch", "sh.help.pitch", "sh.help.roll", "sh.help.stick", "sh.help.axes",
  "sh.help.parts", "sh.help.yaw", "sh.help.turn", "sh.help.forces", "sh.help.course",
] as const;

const AXIS_HELP: Record<Axis, string> = { pitch: "sh.help.pitch", roll: "sh.help.roll", yaw: "sh.help.yaw" };

export const explainFor = (ex: Pick<Exercise, "params">): string => {
  const s = decode(ex);
  if (s.mode === "force" && s.t === "up") return "sh.help.lift";
  return EXPLAIN_BY_LEVEL[Math.min(EXPLAIN_BY_LEVEL.length - 1, s.level)] ?? "sh.help.pitch";
};

/** First-miss line, diagnosed from what the child chose. */
export function hintFor(st: Pick<ExerciseState, "exercise" | "lastAnswer" | "check">): string {
  const s = decode(st.exercise);
  const v = st.lastAnswer;
  const pick = typeof v === "string" ? v : "";
  switch (s.mode) {
    case "hoop":
      return AXIS_HELP[CTL_AXIS[HOOP_CTL[s.hoop]]];
    case "name":
      return (s.axis === "roll" && pick === "yaw") || (s.axis === "yaw" && pick === "roll") ? "sh.hint.rollYaw" : "sh.help.axes";
    case "part":
      return `sh.hint.${CTL_AXIS[s.ctl] === "pitch" ? "elevator" : CTL_AXIS[s.ctl] === "roll" ? "ailerons" : "rudder"}`;
    case "line":
      return pick === "left" || pick === "right" ? "sh.hint.stickTips" : "sh.help.yaw";
    case "turn":
      return isPedal(pick as Ctl) ? "sh.hint.boat" : "sh.help.turn";
    case "force":
      switch (s.t) {
        case "level":
          return pick === "thrustWins" ? "sh.hint.steady" : "sh.hint.liftEq";
        case "faster":
          return "sh.hint.faster";
        case "slower":
          return "sh.hint.slower";
        case "down":
          return pick === "drag" ? "sh.hint.dragBack" : pick === "lift" ? "sh.hint.liftUp" : "sh.help.forces";
        case "up":
          return pick === "thrust" ? "sh.hint.engine" : "sh.help.lift";
      }
      return "sh.help.forces";
    case "course": {
      const parts = st.check?.parts ?? {};
      const k = [0, 1, 2].find((i) => parts[String(i)] === false);
      return k === undefined ? "sh.help.course" : AXIS_HELP[CTL_AXIS[HOOP_CTL[s.course[k]!]]];
    }
  }
}

/** Praise the process the item needed. */
export function praiseFor(ex: Pick<Exercise, "params">): string[] {
  const s = decode(ex);
  switch (s.mode) {
    case "hoop":
      return s.hoop === "above" ? ["sh.praise.up"] : s.hoop === "below" ? ["sh.praise.down"] : ["sh.praise.roll"];
    case "name":
      return [`sh.praise.is.${s.axis}`];
    case "part":
      return [`sh.praise.part.${CTL_AXIS[s.ctl] === "pitch" ? "elevator" : CTL_AXIS[s.ctl] === "roll" ? "ailerons" : "rudder"}`];
    case "line":
      return ["sh.praise.yaw"];
    case "turn":
      return ["sh.praise.turn"];
    case "force":
      return s.t === "down" || s.t === "up" ? ["sh.praise.forces"] : ["sh.praise.arrows", "sh.praise.forces"];
    case "course":
      return ["sh.praise.course"];
  }
}
