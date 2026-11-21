import type { AnswerOption, Exercise, ExerciseGenerator } from "../../engine/types";
import {
  AXIS_NAME, type Axis, CTL_LABEL, CTL_TEXT, type Ctl, DIAGRAM_TEXT, type Diagram, FORCE_NAME, type HoopPos, HOOP_CTL, HOOPS,
  PART_NAME, type Scenario, type Side, STICKS, TEMPLATE_OPTIONS, type Template, AXIS_PART, CTL_AXIS, correctFor, demoCtl, encode,
} from "./logic";
import type { ForceId, PartId } from "./flight";

/**
 * Zephy's Sky Hoops — seeded generator (pure: same level + rng + index → same exercise).
 * Spec: docs/curriculum/pilot.md §4.4. Pedagogy and level table: docs/worlds/sky-hoops.md.
 *
 * Bands of 8 are played in index order, so each level has a fixed pattern (like the other worlds): it covers
 * both directions of every axis at that level and never asks for the same right input three times in a row.
 * The rng varies what the pattern doesn't fix (which way a demo moves, option order, the course).
 *
 * Level (0-based) → item
 *   0  hoop above / below; the stick arrows are labelled "nose up / nose down"       choice back | fwd
 *   1  hoop above / below; labels fade to "pull / push"                               choice back | fwd
 *   2  tipped hoop on a curving ribbon, left / right                                  choice left | right
 *   3  above, below, tipped left, tipped right                                        choice 4 stick moves
 *   4  watch a move: pitch, roll or yaw? (roll/yaw in 6 of 8)                         choice pitch | roll | yaw
 *   5  watch a control move: which part moved? (stick moves in 6 of 8)                choice elevator | ailerons | rudder
 *   6  nose points off the runway line: swing it straight                             choice pedals | stick left/right
 *   7  next hoop far to one side: what does Zephy do FIRST to turn?                   choice tip wings | pedal only | pull back
 *   8  four forces (5 templates; never about climbing)                                choice of 3 pictures / 4 arrows
 *   9  a course of 3 hoops: plan three stick moves, then fly                          sequence of 3 (exact order)
 */
export const SH_AGES = [6, 9] as const;
export const SKILL = {
  axes: "pilot.controls.axes",
  turn: "pilot.controls.turn",
  forces: "pilot.flight.four-forces",
} as const;

const A: HoopPos = "above", B: HoopPos = "below", L: HoopPos = "left", R: HoopPos = "right";
const l: Side = "left", r: Side = "right";

export interface LevelSpec {
  label: string;
  skill: string;
}
export const LEVELS: readonly LevelSpec[] = [
  { label: "Hoop above or below (stick labelled nose up / nose down)", skill: SKILL.axes },
  { label: "Hoop above or below (labels fade)", skill: SKILL.axes },
  { label: "Tipped hoop: roll left or right", skill: SKILL.axes },
  { label: "Any of four hoops: pitch or roll", skill: SKILL.axes },
  { label: "Name the movement: pitch, roll or yaw", skill: SKILL.axes },
  { label: "Which part moved: elevator, ailerons or rudder", skill: SKILL.axes },
  { label: "Swing the nose to the runway line (rudder pedals)", skill: SKILL.axes },
  { label: "To turn, first tip the wings", skill: SKILL.turn },
  { label: "Four forces: lift, weight, thrust, drag", skill: SKILL.forces },
  { label: "Plan a course of three hoops", skill: SKILL.turn },
];
export const SH_MAX_LEVEL = LEVELS.length - 1;

/** Fixed per-level patterns (index % 8). */
export const PATTERNS = {
  pitch0: [A, B, A, A, B, B, A, B] as HoopPos[],
  pitch1: [B, A, A, B, A, B, B, A] as HoopPos[],
  roll: [L, R, R, L, R, L, L, R] as HoopPos[],
  mixed: [A, L, B, R, R, A, L, B] as HoopPos[],
  axis: ["roll", "yaw", "pitch", "yaw", "roll", "pitch", "roll", "yaw"] as Axis[],
  part: ["left", "back", "rpedal", "fwd", "right", "lpedal", "back", "left"] as Ctl[],
  nose: [r, l, l, r, l, r, r, l] as Side[],
  turn: [l, r, r, l, r, l, l, r] as Side[],
  force: ["level", "down", "faster", "up", "slower", "level", "up", "faster"] as Template[],
} as const;

export const WHERE: Record<HoopPos, string> = { above: "up high", below: "down low", left: "tipped to the left", right: "tipped to the right" };
export const MOVE_SAY: Record<Ctl, string> = {
  back: "pull the stick back",
  fwd: "push the stick forward",
  left: "move the stick left",
  right: "move the stick right",
  lpedal: "push the left pedal",
  rpedal: "push the right pedal",
};
export const TEMPLATE_PROMPT: Record<Template, { line: string; text: string }> = {
  level: { line: "sh.prompt.level", text: "Level, at a steady speed. Which picture shows the forces?" },
  faster: { line: "sh.prompt.faster", text: "Zephy wants to speed up. Which picture shows the forces?" },
  slower: { line: "sh.prompt.slower", text: "Zephy wants to slow down. Which picture shows the forces?" },
  down: { line: "sh.prompt.down", text: "Which force pulls the plane down?" },
  up: { line: "sh.prompt.up", text: "Which force holds the plane up?" },
};

const ctlOption = (c: Ctl): AnswerOption => ({ id: c, text: CTL_LABEL[c] });
const axisOption = (a: Axis): AnswerOption => ({ id: a, text: AXIS_NAME[a], say: `sh.opt.${a}` });
const partOption = (p: PartId): AnswerOption => ({ id: p, text: PART_NAME[p], say: `sh.opt.${p}` });
const forceOption = (id: string): AnswerOption =>
  id in DIAGRAM_TEXT ? { id, text: DIAGRAM_TEXT[id as Diagram], say: `sh.opt.${id}` } : { id, text: FORCE_NAME[id as ForceId], say: `sh.opt.${id}` };

type Base = Pick<Exercise, "ages" | "interaction" | "seed">;

/** Build the exercise for a scenario (used by the generator and the authored tutorial). */
export function hoopsExercise(s: Scenario, opts: { id: string; seed: number; rngOrder?: <T>(xs: T[]) => T[]; tutorial?: boolean; scaffold?: boolean }): Omit<Exercise, "difficulty"> {
  const base: Base = { ages: SH_AGES, interaction: "choose", seed: opts.seed };
  const shuffle = opts.rngOrder ?? (<T,>(xs: T[]) => xs);
  const params = { ...encode(s), ...(opts.scaffold ? { scaffold: 1 } : {}) };
  const skillId = LEVELS[Math.min(SH_MAX_LEVEL, s.level)]!.skill;
  const common = { ...base, id: opts.id, skillId, params, ...(opts.tutorial ? { tutorial: true } : {}) };
  switch (s.mode) {
    case "hoop": {
      const ctl = HOOP_CTL[s.hoop];
      const pitch = s.hoop === "above" || s.hoop === "below";
      const opts4: Ctl[] = s.level >= 3 ? [...STICKS] : pitch ? ["back", "fwd"] : ["left", "right"];
      return {
        ...common,
        objectKind: "hoop",
        objective: `Move the stick to ${pitch ? "pitch the nose" : "roll the wings"} ${WHERE[s.hoop]} through the hoop`,
        answer: { kind: "choice", correct: ctl, options: opts4.map(ctlOption) },
        prompt: opts.tutorial
          ? { line: "sh.prompt.tutorial", text: "The hoop is up high. Pull the stick back to lift the nose!" }
          : { line: "sh.prompt.hoop", vars: { where: WHERE[s.hoop] }, text: `The hoop is ${WHERE[s.hoop]}. Fly through it!` },
        a11yDescription: `Zephy's red plane flies toward a hoop. The hoop is ${s.hoop === "above" ? "above the plane" : s.hoop === "below" ? "below the plane" : `to the ${s.hoop}, tipped to the ${s.hoop}`}. Use the stick: arrow keys or the stick buttons.`,
      };
    }
    case "name": {
      const ctl = demoCtl(s.axis, s.dir);
      return {
        ...common,
        objectKind: "axes",
        objective: `Name the movement: ${s.axis}`,
        answer: { kind: "choice", correct: s.axis, options: (["pitch", "roll", "yaw"] as Axis[]).map(axisOption) },
        prompt: { line: "sh.prompt.name", text: "Watch the plane. How did it move?" },
        a11yDescription: `The plane moves in place: ${s.axis === "pitch" ? `its nose tips ${s.dir > 0 ? "up" : "down"}` : s.axis === "roll" ? `its ${s.dir > 0 ? "right" : "left"} wing dips` : `its nose swings ${s.dir > 0 ? "right" : "left"}`} (Zephy's control: ${CTL_LABEL[ctl].toLowerCase()}). Choose pitch, roll or yaw. Press Watch again to see it again.`,
      };
    }
    case "part": {
      const part = AXIS_PART[CTL_AXIS[s.ctl]];
      return {
        ...common,
        objectKind: "parts",
        objective: `Name the control surface the ${s.ctl.includes("pedal") ? "pedals" : "stick"} moves: the ${part}`,
        answer: { kind: "choice", correct: part, options: (["elevator", "ailerons", "rudder"] as PartId[]).map(partOption) },
        prompt: { line: "sh.prompt.part", vars: { move: MOVE_SAY[s.ctl] }, text: `Watch Zephy ${MOVE_SAY[s.ctl]}. Which part moved?` },
        a11yDescription: `Zephy will ${MOVE_SAY[s.ctl]}. A flap on the plane moves and the plane ${CTL_AXIS[s.ctl] === "pitch" ? "pitches" : CTL_AXIS[s.ctl] === "roll" ? "rolls" : "yaws"}. Which part moved: elevator, ailerons or rudder? Press Watch again to see it again.`,
      };
    }
    case "line": {
      const right = correctFor(s) as Ctl;
      const options: Ctl[] = ["lpedal", "rpedal", "left", "right"];
      return {
        ...common,
        objectKind: "runway",
        objective: `Use the ${right === "lpedal" ? "left" : "right"} rudder pedal to yaw the nose onto the runway line`,
        answer: { kind: "choice", correct: right, options: options.map(ctlOption) },
        prompt: { line: "sh.prompt.line", vars: { side: s.nose }, text: `The nose points ${s.nose} of the runway line. Swing it straight!` },
        a11yDescription: `A runway is ahead. The plane's nose points a little to the ${s.nose} of the runway's centre line. Choose a pedal or a stick move to swing the nose straight.`,
      };
    }
    case "turn": {
      const pedal: Ctl = s.side === "left" ? "lpedal" : "rpedal";
      const options: Ctl[] = shuffle([s.side, pedal, "back"]);
      return {
        ...common,
        objectKind: "hoop",
        objective: `To turn ${s.side}, first bank (tip the wings ${s.side}) with the stick`,
        answer: { kind: "choice", correct: s.side, options: options.map((c) => ({ id: c, text: CTL_TEXT[c] })) },
        prompt: { line: "sh.prompt.turn", vars: { side: s.side }, text: `The next hoop is far to the ${s.side}. What does Zephy do first?` },
        a11yDescription: `The next hoop is far to the ${s.side}, turned sideways. Choose what Zephy does first: tip the wings with the stick, push a pedal only, or pull back.`,
      };
    }
    case "force": {
      const ids = shuffle([...TEMPLATE_OPTIONS[s.t]]);
      const pr = TEMPLATE_PROMPT[s.t];
      return {
        ...common,
        objectKind: "forces",
        objective:
          s.t === "level" ? "In steady level flight lift equals weight and thrust equals drag"
            : s.t === "faster" ? "To speed up, thrust is bigger than drag"
              : s.t === "slower" ? "To slow down, drag is bigger than thrust"
                : s.t === "down" ? "Weight pulls the plane down" : "Lift from the wings holds the plane up",
        answer: { kind: "choice", correct: TEMPLATE_OPTIONS[s.t][0]!, options: ids.map(forceOption) },
        prompt: { line: pr.line, text: pr.text },
        a11yDescription:
          s.t === "down" || s.t === "up"
            ? "Zephy's plane seen from the side with four force arrows: lift up from the wings, weight down, thrust forward from the propeller, drag back. Choose an arrow."
            : `Zephy's plane seen from the side. ${pr.text} Each picture shows lift, weight, thrust and drag arrows of different lengths: ${ids.map((i) => DIAGRAM_TEXT[i as Diagram]).join("; ")}.`,
      };
    }
    case "course": {
      const order = s.course.map((h) => HOOP_CTL[h]);
      return {
        ...common,
        objectKind: "course",
        objective: "Plan three stick moves in order to fly a course of three hoops",
        answer: { kind: "sequence", order, pieces: STICKS.map((c) => ({ id: c, text: CTL_TEXT[c] })) },
        prompt: { line: "sh.prompt.course", text: "Plan all three moves, then press Fly!" },
        a11yDescription: `Three hoops in a row: first ${WHERE[s.course[0]]}, then ${WHERE[s.course[1]]}, then ${WHERE[s.course[2]]}. Add three stick moves to the plan in order, then press Fly.`,
      };
    }
  }
}

export const generateSkyHoops: ExerciseGenerator = (level, rng, index) => {
  const lv = Math.max(0, Math.min(SH_MAX_LEVEL, level));
  const i = index % 8;
  const seed = rng.int(1, 999_999);
  const sfx = `l${lv}n${index}`;
  const order = <T,>(xs: T[]) => rng.shuffle(xs);
  const make = (s: Scenario, tag: string, extra: { scaffold?: boolean } = {}) => hoopsExercise(s, { id: `sh-${s.mode}-${tag}-${sfx}`, seed, rngOrder: order, ...extra });
  switch (lv) {
    case 0:
      return make({ mode: "hoop", level: lv, hoop: PATTERNS.pitch0[i]! }, PATTERNS.pitch0[i]!, { scaffold: true });
    case 1:
      return make({ mode: "hoop", level: lv, hoop: PATTERNS.pitch1[i]! }, PATTERNS.pitch1[i]!);
    case 2:
      return make({ mode: "hoop", level: lv, hoop: PATTERNS.roll[i]! }, PATTERNS.roll[i]!);
    case 3:
      return make({ mode: "hoop", level: lv, hoop: PATTERNS.mixed[i]! }, PATTERNS.mixed[i]!);
    case 4: {
      const axis = PATTERNS.axis[i]!;
      const dir = rng.chance(0.5) ? 1 : -1;
      return make({ mode: "name", level: lv, axis, dir }, `${axis}${dir > 0 ? "p" : "m"}`);
    }
    case 5:
      return make({ mode: "part", level: lv, ctl: PATTERNS.part[i]! }, PATTERNS.part[i]!);
    case 6:
      return make({ mode: "line", level: lv, nose: PATTERNS.nose[i]! }, PATTERNS.nose[i]!);
    case 7:
      return make({ mode: "turn", level: lv, side: PATTERNS.turn[i]! }, PATTERNS.turn[i]!);
    case 8:
      return make({ mode: "force", level: lv, t: PATTERNS.force[i]! }, PATTERNS.force[i]!);
    default: {
      const course = rng.shuffle([...HOOPS]).slice(0, 3) as [HoopPos, HoopPos, HoopPos];
      return make({ mode: "course", level: lv, course }, course.map((h) => h[0]).join(""));
    }
  }
};
