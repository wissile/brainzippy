import type { Exercise } from "../../engine/types";
import {
  CAMERAS, type CameraId, type ForceId, type HoopSpec, type PartId, type Pose, REST, type Seg, type SimStart, type Track,
  cutBefore, hoopOnTrack, simulate,
} from "./flight";

/**
 * Zephy's Sky Hoops — scenario model (pure). Spec: docs/curriculum/pilot.md §4; pedagogy: docs/worlds/sky-hoops.md.
 *
 * Cause and effect (FAA-H-8083-25, "Flight Controls"):
 *   stick back    → elevator trailing edge up   → tail down, nose UP     (pitch)
 *   stick forward → elevator trailing edge down → nose DOWN              (pitch)
 *   stick left    → left aileron up, right down → left wing down, ROLL left
 *   left pedal    → rudder to the left          → nose swings LEFT       (yaw)
 *   a plane TURNS by banking (rolling) its wings; in the air the rudder alone only swings the nose (skids).
 *   ON THE GROUND (L6, the take-off roll) the pedals steer the nose wheel (and rudder), so the path follows the nose.
 */
export type Ctl = "back" | "fwd" | "left" | "right" | "lpedal" | "rpedal";
export type Stick = "back" | "fwd" | "left" | "right";
export type Axis = "pitch" | "roll" | "yaw";
export type HoopPos = "above" | "below" | "left" | "right";
export type Side = "left" | "right";
export type Template = "level" | "faster" | "slower" | "down" | "up";
export type Mode = "hoop" | "name" | "part" | "line" | "turn" | "force" | "course";
export type Diagram = "balanced" | "thrustWins" | "liftWins" | "dragWins";

export const CTLS: readonly Ctl[] = ["back", "fwd", "left", "right", "lpedal", "rpedal"];
export const STICKS: readonly Stick[] = ["back", "fwd", "left", "right"];
export const AXES: readonly Axis[] = ["pitch", "roll", "yaw"];
export const PARTS: readonly PartId[] = ["elevator", "ailerons", "rudder"];
export const HOOPS: readonly HoopPos[] = ["above", "below", "left", "right"];
export const SIDES: readonly Side[] = ["left", "right"];
export const TEMPLATES: readonly Template[] = ["level", "faster", "slower", "down", "up"];
export const MODES: readonly Mode[] = ["hoop", "name", "part", "line", "turn", "force", "course"];
export const FORCES: readonly ForceId[] = ["lift", "weight", "thrust", "drag"];

export const HOOP_CTL: Record<HoopPos, Stick> = { above: "back", below: "fwd", left: "left", right: "right" };
export const CTL_AXIS: Record<Ctl, Axis> = { back: "pitch", fwd: "pitch", left: "roll", right: "roll", lpedal: "yaw", rpedal: "yaw" };
export const AXIS_PART: Record<Axis, PartId> = { pitch: "elevator", roll: "ailerons", yaw: "rudder" };
export const isPedal = (c: Ctl) => c === "lpedal" || c === "rpedal";

/** Button names (aria-label) — what the child DOES, not what it causes. */
export const CTL_LABEL: Record<Ctl, string> = {
  back: "Pull the stick back",
  fwd: "Push the stick forward",
  left: "Move the stick left",
  right: "Move the stick right",
  lpedal: "Push the left pedal",
  rpedal: "Push the right pedal",
};
/** Short on-screen labels. */
export const CTL_SHORT: Record<Ctl, string> = { back: "Pull back", fwd: "Push", left: "Left", right: "Right", lpedal: "Left pedal", rpedal: "Right pedal" };
/** Plan-slot and answer text (course, turn). */
export const CTL_TEXT: Record<Ctl, string> = {
  back: "Stick back: nose up",
  fwd: "Stick forward: nose down",
  left: "Stick left: tip the wings left",
  right: "Stick right: tip the wings right",
  lpedal: "Left pedal only",
  rpedal: "Right pedal only",
};
export const AXIS_TEXT: Record<Axis, string> = { pitch: "Pitch: nose up or down", roll: "Roll: the wings tip", yaw: "Yaw: the nose swings left or right" };
export const AXIS_NAME: Record<Axis, string> = { pitch: "Pitch", roll: "Roll", yaw: "Yaw" };
export const PART_NAME: Record<PartId, string> = { elevator: "Elevator", ailerons: "Ailerons", rudder: "Rudder" };
export const PART_WHERE: Record<PartId, string> = { elevator: "the flap on the back of the tail wings", ailerons: "the flaps near the wing tips", rudder: "the tall flap on the tail" };
export const FORCE_NAME: Record<ForceId, string> = { lift: "Lift", weight: "Weight", thrust: "Thrust", drag: "Drag" };
export const DIAGRAM_TEXT: Record<Diagram, string> = {
  balanced: "Lift = weight, thrust = drag",
  thrustWins: "Thrust bigger than drag",
  liftWins: "Lift bigger than weight",
  dragWins: "Drag bigger than thrust",
};
/** Arrow lengths drawn for each force diagram (relative). Lift and weight are drawn longer than thrust and drag. */
export const DIAGRAM_FORCES: Record<Diagram, Record<ForceId, number>> = {
  balanced: { lift: 1, weight: 1, thrust: 0.55, drag: 0.55 },
  thrustWins: { lift: 1, weight: 1, thrust: 0.85, drag: 0.4 },
  liftWins: { lift: 1.3, weight: 0.85, thrust: 0.55, drag: 0.55 },
  dragWins: { lift: 1, weight: 1, thrust: 0.4, drag: 0.85 },
};
/** The answer options for each forces template (correct first; the generator shuffles). */
export const TEMPLATE_OPTIONS: Record<Template, readonly string[]> = {
  level: ["balanced", "thrustWins", "liftWins"],
  faster: ["thrustWins", "dragWins", "balanced"],
  slower: ["dragWins", "thrustWins", "balanced"],
  down: ["weight", "lift", "thrust", "drag"],
  up: ["lift", "thrust", "weight", "drag"],
};
export const TEMPLATE_TEXT: Record<Template, string> = {
  level: "Zephy flies level at a steady speed. Which picture shows the forces?",
  faster: "Zephy wants to speed up. Which picture shows the forces?",
  slower: "Zephy wants to slow down. Which picture shows the forces?",
  down: "Which force pulls the plane down?",
  up: "Which force holds the plane up?",
};
export const isArrowTemplate = (t: Template) => t === "down" || t === "up";

export type Scenario =
  | { mode: "hoop"; level: number; hoop: HoopPos }
  | { mode: "name"; level: number; axis: Axis; dir: 1 | -1 }
  | { mode: "part"; level: number; ctl: Ctl }
  | { mode: "line"; level: number; nose: Side }
  | { mode: "turn"; level: number; side: Side }
  | { mode: "force"; level: number; t: Template }
  | { mode: "course"; level: number; course: [HoopPos, HoopPos, HoopPos] };

export function encode(s: Scenario): Record<string, number> {
  const base = { mode: MODES.indexOf(s.mode), level: s.level };
  switch (s.mode) {
    case "hoop":
      return { ...base, hoop: HOOPS.indexOf(s.hoop) };
    case "name":
      return { ...base, axis: AXES.indexOf(s.axis), dir: s.dir };
    case "part":
      return { ...base, ctl: CTLS.indexOf(s.ctl) };
    case "line":
      return { ...base, side: SIDES.indexOf(s.nose) };
    case "turn":
      return { ...base, side: SIDES.indexOf(s.side) };
    case "force":
      return { ...base, t: TEMPLATES.indexOf(s.t) };
    case "course":
      return { ...base, c0: HOOPS.indexOf(s.course[0]), c1: HOOPS.indexOf(s.course[1]), c2: HOOPS.indexOf(s.course[2]) };
  }
}

export function decode(ex: Pick<Exercise, "params">): Scenario {
  const p = ex.params ?? {};
  const level = p.level ?? 0;
  switch (MODES[p.mode ?? 0]) {
    case "name":
      return { mode: "name", level, axis: AXES[p.axis ?? 0]!, dir: p.dir === -1 ? -1 : 1 };
    case "part":
      return { mode: "part", level, ctl: CTLS[p.ctl ?? 0]! };
    case "line":
      return { mode: "line", level, nose: SIDES[p.side ?? 0]! };
    case "turn":
      return { mode: "turn", level, side: SIDES[p.side ?? 0]! };
    case "force":
      return { mode: "force", level, t: TEMPLATES[p.t ?? 0]! };
    case "course":
      return { mode: "course", level, course: [HOOPS[p.c0 ?? 0]!, HOOPS[p.c1 ?? 1]!, HOOPS[p.c2 ?? 2]!] };
    default:
      return { mode: "hoop", level, hoop: HOOPS[p.hoop ?? 0]! };
  }
}

/** The control (or option id) that is right for a scenario. Course: the three stick moves in order. */
export function correctFor(s: Scenario): string | string[] {
  switch (s.mode) {
    case "hoop":
      return HOOP_CTL[s.hoop];
    case "name":
      return s.axis;
    case "part":
      return AXIS_PART[CTL_AXIS[s.ctl]];
    case "line":
      return s.nose === "right" ? "lpedal" : "rpedal";
    case "turn":
      return s.side;
    case "force":
      return TEMPLATE_OPTIONS[s.t][0]!;
    case "course":
      return s.course.map((h) => HOOP_CTL[h]);
  }
}

/** The control the child acts with in a "name" demo (the move that shows that axis in that direction). */
export const demoCtl = (axis: Axis, dir: 1 | -1): Ctl =>
  axis === "pitch" ? (dir > 0 ? "back" : "fwd") : axis === "roll" ? (dir > 0 ? "right" : "left") : dir > 0 ? "rpedal" : "lpedal";

// ---------------------------------------------------------------- scenes (where things are, how the plane flies)
const HOOP_AT = 0.6;
const TURN_HOOP_AT = 0.62;
const COURSE_SEG = 0.8;
/** Where each course hoop sits inside its segment: banked mid-turn for rolls, nearly level after a climb or dive. */
const courseHoopAt = (c: Ctl) => (c === "left" || c === "right" ? 0.55 : 0.66);

const segFor = (c: Ctl, mode: Mode): Seg => {
  if (mode === "turn") return { ctl: c, dur: 1.35, amount: c === "left" || c === "right" ? 30 : isPedal(c) ? 16 : 18 };
  if (mode === "line") return { ctl: c, dur: 1, amount: isPedal(c) ? 14 : 22 };
  if (mode === "course") return { ctl: c, dur: COURSE_SEG, amount: c === "back" || c === "fwd" ? 24 : 30, rollOut: true };
  return { ctl: c, dur: 1, amount: c === "back" || c === "fwd" ? 22 : 34 };
};
const LINE_NOSE = 14 * (Math.PI / 180);

export interface Scene {
  camera: CameraId;
  hoops: HoopSpec[];
  start: SimStart;
  runway: boolean;
  /** Real time (ms) per unit of simulated time: a track lasts track.total × msPerUnit. */
  msPerUnit: number;
  /** The flight that follows a control (or a course plan). */
  track(input: Ctl | readonly Ctl[]): Track;
}

const trackCache = new Map<string, Track>();
function cached(key: string, make: () => Track): Track {
  let t = trackCache.get(key);
  if (!t) {
    if (trackCache.size > 400) trackCache.clear();
    t = make();
    trackCache.set(key, t);
  }
  return t;
}

export function sceneOf(s: Scenario): Scene {
  const key = JSON.stringify(encode(s));
  const plain = (camera: CameraId, ms = 1200): Scene => ({ camera, hoops: [], start: {}, runway: false, msPerUnit: ms, track: () => simulate([{ ctl: null, dur: 1 }]) });
  switch (s.mode) {
    case "hoop": {
      const track = (c: Ctl | readonly Ctl[]) => {
        const ctl = (Array.isArray(c) ? c[0] : c) as Ctl;
        return cached(`h:${ctl}`, () => simulate([segFor(ctl, "hoop")]));
      };
      return { camera: "chase", hoops: [hoopOnTrack(track(HOOP_CTL[s.hoop]), HOOP_AT)], start: {}, runway: false, msPerUnit: 1250, track };
    }
    case "turn": {
      const track = (c: Ctl | readonly Ctl[]) => {
        const ctl = (Array.isArray(c) ? c[0] : c) as Ctl;
        return cached(`t:${ctl}`, () => simulate([segFor(ctl, "turn")]));
      };
      return { camera: "chase", hoops: [hoopOnTrack(track(s.side), TURN_HOOP_AT)], start: {}, runway: false, msPerUnit: 1150, track };
    }
    case "line": {
      // On the ground: the plane rolls down the runway with its nose drifting off the centre line.
      const start: SimStart = { ground: true, heading: s.nose === "right" ? LINE_NOSE : -LINE_NOSE };
      const track = (c: Ctl | readonly Ctl[]) => {
        const ctl = (Array.isArray(c) ? c[0] : c) as Ctl;
        return cached(`l:${s.nose}:${ctl}`, () => simulate([segFor(ctl, "line")], start));
      };
      return { camera: "ground", hoops: [], start, runway: true, msPerUnit: 1300, track };
    }
    case "course": {
      // The plane flies the plan up to (and including) the first wrong move, then that pass ends: the child sees
      // exactly which move missed, and a miss can never clip a later hoop.
      const right = s.course.map((h) => HOOP_CTL[h]);
      const fly = (plan: readonly Ctl[]) => cached(`c:${plan.join(",")}`, () => simulate(plan.map((x) => segFor(x, "course"))));
      const full = fly(right);
      const hoops = right.map((c, i) => hoopOnTrack(full, (i + courseHoopAt(c)) / 3));
      const track = (c: Ctl | readonly Ctl[]) => {
        const plan = (Array.isArray(c) ? c : [c]) as Ctl[];
        const k = plan.findIndex((x, i) => x !== right[i]);
        if (k < 0) return fly(plan);
        const t = fly(plan.slice(0, k + 1));
        return cutBefore(t, hoops[k]!, Math.round((k / (k + 1)) * (t.poses.length - 1)));
      };
      return { camera: "chase", hoops, start: {}, runway: false, msPerUnit: 1100, track };
    }
    case "force":
      return plain("side", 1100);
    default:
      void key;
      return plain("side34", 1200);
  }
}

// ---------------------------------------------------------------- in-place demos (name / part) and other motions
const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const hold = (f: number, a: number, b: number, c: number, d: number) => (f < c ? smooth((f - a) / (b - a)) : 1 - smooth((f - c) / (d - c)));

/** The plane answering one control in place (surfaces move first, then the plane), over f = 0..1. */
export function demoPose(ctl: Ctl, f: number): Pose {
  const k = hold(f, 0.12, 0.42, 0.68, 0.95);
  const surf = hold(f, 0.04, 0.16, 0.7, 0.82);
  const s = ctl === "back" || ctl === "right" || ctl === "rpedal" ? 1 : -1;
  switch (CTL_AXIS[ctl]) {
    case "pitch":
      return { ...REST, pitch: s * 0.32 * k, y: s * 0.35 * k, elev: s * surf };
    case "roll":
      return { ...REST, roll: s * 0.55 * k, ail: -s * surf };
    case "yaw":
      return { ...REST, yaw: s * 0.42 * k, rud: -s * surf };
  }
}

/** After a right answer away from the hoops: Zephy zooms off ahead (fades out). */
export function flyAwayPose(f: number, from: Pose = REST): Pose {
  const e = f * f;
  return { ...from, z: from.z + 16 * e, y: from.y + 0.8 * e, fade: 1 - smooth((f - 0.55) / 0.45) };
}

/** Side view: how a force picture moves the plane (net forward → speeds ahead; lift beats weight → rises). */
export function forcePose(d: Diagram, f: number): Pose {
  const F = DIAGRAM_FORCES[d];
  const e = f * f;
  return { ...REST, z: (F.thrust - F.drag) * 9 * e, y: (F.lift - F.weight) * 5 * e, pitch: 0 };
}

/** A gentle idle bob (none with reduced motion). */
export const bob = (t: number): Pose => ({ ...REST, y: Math.sin(t / 700) * 0.07, roll: Math.sin(t / 1100) * 0.015 });

export { CAMERAS };
