import type { AnswerOption, Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";
import {
  BASES, CALL_TEXT, CARD, CRITS, type Call, type Cover, COVERS, DEWS, FLAP_DROP, GUSTS, type GroupKind, IMSAFE_OPTION, IMSAFE_PUSH, type ImsafeWhy,
  LEGS, type Layer, type Metar, MODES, type Mode, PILOT_SCENES, PLACES, PLAN_ITEMS, PLAN_TITLE, type PlanItem, RESERVE_MIN, SKIP_STEPS, STATIONS, STEPS,
  STALL_TOLERANCE, AOA_MAX, AOA_MIN, TEMPS, TIMES, VISES, WDIRS, WING_NAMES, WSPDS, type WxFail, cardFails, ceilingOf, exactMinutes, fmtFeet, fmtHM,
  groundspeed, groupMeaning, legAnswer, metarGroups, roundMinutes,
} from "./logic";

/**
 * Ziggy's Flight Plan — seeded generator (pure: same level + rng + index (+ band) → same exercise).
 * Pedagogy, sources and the full level table: docs/worlds/flight-plan.md. Spec: docs/curriculum/pilot.md §3 (worlds 4, 6, 8, 10).
 *
 * A round is one flight plan: 7 planning items from up to four inner games, then the go/no-go briefing, which is a
 * `closer` (engine R5a) so it always ends the round. Inner games unlock across levels, and from level 3 on each level
 * adds at most three new ideas (learning review); the rest of the band is review:
 *
 *   Lv  new ideas (index 0–6)                                                          briefing factors (index 7, closer)
 *   0   tunnel: find the stall (live graph) · lift vs speed/angle · leg: 60/120 kt         route fuel · plane
 *   1   stalls at any speed · slow isn't stalled · a stall isn't the engine · any speed    route fuel · plane
 *   2   + weather: decode wind + visibility · fly/wait (vis, wind) · find (graph on hint)  + weather
 *   3   head/tailwind · stall recovery (lower the nose, then power)
 *   4   cloud group + ceiling on the card · checklist order (4 steps)
 *   5   IMSAFE · Zulu time (2 misconception tiles)                                         route · weather · pilot
 *   6   flaps · missed planning item · two-leg total
 *   7   nearest minute · temperature/dew point · two cloud layers                          all four
 *   8   "a scattered layer isn't a ceiling" · IMSAFE "push through" · pressure             all four + "Bobbo can't be late"
 *   9   gusts (decode + card) · 5 steps with a "skip it" card · mixed: rounding with wind, flaps (graph on hint)
 *
 * Distractors target named misconceptions (wind "to", km, ×100 cloud bases, local time, high/low temperatures,
 * "can't stall when fast", "a stall is the engine stopping", "pull up to recover", adding speed and distance,
 * forgetting the wind, "experienced pilots can push through", get-there-itis).
 */
export const FP_AGES = [12, 14] as const;
export const SKILL = {
  aoa: "pilot.aero.aoa",
  tsd: "pilot.nav.tsd",
  metar: "pilot.wx.metar",
  preflight: "pilot.reg.preflight",
  risk: "pilot.adm.risk",
} as const;
export const MODE_SKILL: Record<Mode, string> = {
  find: SKILL.aoa, flaps: SKILL.aoa, lift: SKILL.aoa, speed: SKILL.aoa, engine: SKILL.aoa, recover: SKILL.aoa,
  time: SKILL.tsd, decode: SKILL.metar, call: SKILL.metar, order: SKILL.preflight, missed: SKILL.preflight, imsafe: SKILL.risk, brief: SKILL.risk,
};

type Factor = "route" | "wx" | "pilot" | "plane";
export type Slot =
  | { mode: "find"; graph: boolean }
  | { mode: "flaps"; graph: boolean }
  | { mode: "lift"; v: "speed" | "angle" }
  | { mode: "speed"; v: "fast" | "slow" | "any" }
  | { mode: "engine" }
  | { mode: "recover" }
  | { mode: "time"; kind: "basic" | "mixed" | "wind" | "round" | "roundWind" | "total" }
  | { mode: "decode"; groups: GroupKind[]; distractors: number; gust?: boolean }
  | { mode: "call"; fails: WxFail[]; trap?: boolean; gust?: boolean; layers2?: boolean }
  | { mode: "order"; n: 4 | 5; skip: boolean }
  | { mode: "missed" }
  | { mode: "imsafe"; push: boolean }
  | { mode: "brief"; factors: Factor[]; pressure: boolean };

export interface LevelSpec { label: string; slots: readonly Slot[] }
const W2: GroupKind[] = ["wind", "vis"];
const W3: GroupKind[] = ["wind", "vis", "cloud"];
const W4T: GroupKind[] = ["time", "wind", "vis", "cloud"];
const W4D: GroupKind[] = ["wind", "vis", "cloud", "temp"];
const W5D: GroupKind[] = ["wind", "vis", "cloud", "cloud2", "temp"];
export const LEVELS: readonly LevelSpec[] = [
  {
    label: "Wind tunnel and leg timer: find the stall; minutes at 60 or 120 knots",
    slots: [
      { mode: "find", graph: true }, { mode: "time", kind: "basic" }, { mode: "lift", v: "speed" }, { mode: "time", kind: "basic" },
      { mode: "find", graph: true }, { mode: "time", kind: "basic" }, { mode: "lift", v: "angle" }, { mode: "brief", factors: ["route", "plane"], pressure: false },
    ],
  },
  {
    label: "Stalls happen at any speed; a stall isn't the engine; any speed on the leg timer",
    slots: [
      { mode: "find", graph: true }, { mode: "time", kind: "mixed" }, { mode: "speed", v: "fast" }, { mode: "time", kind: "mixed" },
      { mode: "engine" }, { mode: "time", kind: "basic" }, { mode: "speed", v: "slow" }, { mode: "brief", factors: ["route", "plane"], pressure: false },
    ],
  },
  {
    label: "Weather brief opens: wind and visibility groups; fly or wait",
    slots: [
      { mode: "decode", groups: W2, distractors: 1 }, { mode: "find", graph: false }, { mode: "time", kind: "mixed" }, { mode: "call", fails: ["vis", "wind"] },
      { mode: "speed", v: "any" }, { mode: "decode", groups: W2, distractors: 1 }, { mode: "time", kind: "mixed" }, { mode: "brief", factors: ["route", "wx", "plane"], pressure: false },
    ],
  },
  {
    label: "Head- and tailwinds; stall recovery",
    slots: [
      { mode: "decode", groups: W2, distractors: 1 }, { mode: "time", kind: "wind" }, { mode: "recover" }, { mode: "call", fails: ["vis", "wind"] },
      { mode: "speed", v: "any" }, { mode: "time", kind: "wind" }, { mode: "find", graph: false }, { mode: "brief", factors: ["route", "wx", "plane"], pressure: false },
    ],
  },
  {
    label: "Cloud groups and the ceiling; checklist order opens",
    slots: [
      { mode: "decode", groups: W3, distractors: 1 }, { mode: "time", kind: "wind" }, { mode: "order", n: 4, skip: false }, { mode: "call", fails: ["ceiling", "vis", "wind"] },
      { mode: "recover" }, { mode: "decode", groups: W3, distractors: 1 }, { mode: "time", kind: "mixed" }, { mode: "brief", factors: ["route", "wx", "plane"], pressure: false },
    ],
  },
  {
    label: "IMSAFE; Zulu time",
    slots: [
      { mode: "imsafe", push: false }, { mode: "decode", groups: W4T, distractors: 2 }, { mode: "time", kind: "wind" }, { mode: "order", n: 4, skip: false },
      { mode: "call", fails: ["ceiling", "vis", "wind"] }, { mode: "speed", v: "any" }, { mode: "imsafe", push: false }, { mode: "brief", factors: ["route", "wx", "pilot"], pressure: false },
    ],
  },
  {
    label: "Flaps; the missed planning item; two-leg totals",
    slots: [
      { mode: "order", n: 4, skip: false }, { mode: "decode", groups: W4T, distractors: 2 }, { mode: "time", kind: "total" }, { mode: "imsafe", push: false },
      { mode: "flaps", graph: true }, { mode: "call", fails: ["ceiling", "vis", "wind"] }, { mode: "missed" }, { mode: "brief", factors: ["route", "wx", "pilot"], pressure: false },
    ],
  },
  {
    label: "Nearest minute; temperature and dew point; two cloud layers",
    slots: [
      { mode: "decode", groups: W4D, distractors: 2 }, { mode: "time", kind: "round" }, { mode: "missed" }, { mode: "call", fails: ["ceiling", "vis", "wind"], layers2: true },
      { mode: "find", graph: false }, { mode: "decode", groups: W5D, distractors: 2 }, { mode: "time", kind: "round" }, { mode: "brief", factors: ["route", "wx", "pilot", "plane"], pressure: false },
    ],
  },
  {
    label: "Traps and pressure: a scattered layer isn't a ceiling; \"push through\"; \"Bobbo can't be late\"",
    slots: [
      { mode: "imsafe", push: true }, { mode: "time", kind: "round" }, { mode: "decode", groups: W4D, distractors: 2 }, { mode: "order", n: 4, skip: false },
      { mode: "call", fails: ["ceiling", "vis", "wind"], trap: true }, { mode: "flaps", graph: true }, { mode: "missed" }, { mode: "brief", factors: ["route", "wx", "pilot", "plane"], pressure: true },
    ],
  },
  {
    label: "Gusts; five steps and a card that skips safety; rounding with wind; everything mixed",
    slots: [
      { mode: "decode", groups: W5D, distractors: 2, gust: true }, { mode: "time", kind: "roundWind" }, { mode: "flaps", graph: false }, { mode: "imsafe", push: true },
      { mode: "call", fails: ["ceiling", "vis", "wind", "gust"], trap: true, gust: true, layers2: true }, { mode: "order", n: 5, skip: true }, { mode: "time", kind: "total" },
      { mode: "brief", factors: ["route", "wx", "pilot", "plane"], pressure: true },
    ],
  },
];
export const FP_MAX_LEVEL = LEVELS.length - 1;
export const BAND = 8;

type Item = Omit<Exercise, "difficulty">;
const m = (mode: Mode) => MODES.indexOf(mode);
const opt = (id: string, text: string): AnswerOption => ({ id, text });

// ------------------------------------------------------------------------------------------------ wind tunnel
interface WingPick { crit: number; w: number }
function pickWing(rng: Rng): WingPick {
  return { crit: rng.pick(CRITS), w: rng.int(0, WING_NAMES.length - 1) };
}

export function tunnelFind(level: number, rng: Rng, opts: { flaps: boolean; graph: boolean; id: string; seed: number; crit?: number; tutorial?: boolean }): Item {
  const wing = pickWing(rng);
  const clean = opts.crit ?? wing.crit;
  const crit = opts.flaps ? clean - FLAP_DROP : clean;
  const speed = opts.tutorial ? 100 : rng.pick([80, 100, 120]);
  const name = WING_NAMES[wing.w]!;
  return {
    id: opts.id,
    skillId: SKILL.aoa,
    // objectives are for grown-ups and the site, never shown or read to the learner; still, they never carry the answer
    objective: opts.flaps ? "Find a fictional wing's stall angle with flaps down, to within 1°" : "Find a fictional wing's critical angle of attack, to within 1°",
    ages: FP_AGES,
    interaction: "choose",
    objectKind: "tunnel",
    seed: opts.seed,
    ...(opts.tutorial ? { tutorial: true } : {}),
    answer: { kind: "numeric", value: crit, tolerance: STALL_TOLERANCE, unit: "°", min: AOA_MIN, max: AOA_MAX, step: 1 },
    params: { m: m(opts.flaps ? "flaps" : "find"), crit, clean, flaps: opts.flaps ? 1 : 0, spd: speed, aoa: 2, graph: opts.graph ? 1 : 0, w: wing.w, lv: level },
    prompt: opts.tutorial
      ? { line: "fp.prompt.tutorial", text: "Slide the angle up and watch the lift meter. Where does the wing stall?" }
      : opts.flaps
        ? { line: "fp.prompt.flaps", text: `Flaps down on the ${name.toLowerCase()}. Find its new stall angle.` }
        : { line: "fp.prompt.find", text: `Tilt the ${name.toLowerCase()} a degree at a time. At what angle does it stall?` },
    a11yDescription:
      `A wind tunnel with a fictional model wing (${name}${opts.flaps ? ", flaps down" : ""}) and smoke streams. Use the angle slider (0 to 24 degrees; arrow keys move one degree) and read the lift meter` +
      `${opts.graph ? " and the lift graph" : ""}. Lift rises with angle until the wing stalls, then drops and the smoke breaks away. Set the angle where it stalls and press Stall angle.`,
  };
}

function tunnelChoice(level: number, rng: Rng, slot: Extract<Slot, { mode: "lift" | "speed" | "engine" | "recover" }>, id: string, seed: number): Item {
  const wing = pickWing(rng);
  const name = WING_NAMES[wing.w]!;
  const base = { ages: FP_AGES, interaction: "choose" as const, objectKind: "tunnel", seed, skillId: SKILL.aoa };
  const shuffle = <T,>(xs: T[]) => rng.shuffle(xs);
  const desc = (extra: string) => `A wind tunnel with a fictional model wing (${name}) that stalls past ${wing.crit} degrees. ${extra} You can move the angle and speed sliders to test it, then choose an answer.`;
  switch (slot.mode) {
    case "lift": {
      const v = slot.v;
      return {
        ...base, id,
        objective: v === "speed" ? "At the same angle of attack, more airspeed gives more lift" : "Below the critical angle, more angle of attack gives more lift",
        answer: { kind: "choice", correct: "more", options: shuffle([opt("more", "More lift"), opt("less", "Less lift"), opt("same", "No change")]) },
        params: { m: m("lift"), crit: wing.crit, clean: wing.crit, flaps: 0, w: wing.w, v: v === "speed" ? 0 : 1, spd: v === "speed" ? 60 : 100, aoa: v === "speed" ? 6 : 2, to: v === "speed" ? 120 : 10, graph: 1, lv: level },
        prompt: v === "speed"
          ? { line: "fp.prompt.lift.speed", text: "Keep the angle at 6°. Speed the air up from 60 to 120 knots. What happens to lift?" }
          : { line: "fp.prompt.lift.angle", text: "Keep the speed at 100 knots. Tilt the wing from 2° to 10°. What happens to lift?" },
        a11yDescription: desc(v === "speed" ? "The angle is 6 degrees and the air speed starts at 60 knots." : "The air speed is 100 knots and the angle starts at 2 degrees."),
      };
    }
    case "speed": {
      const v = slot.v === "any" ? (rng.chance(0.5) ? "fast" : "slow") : slot.v;
      const fast = v === "fast";
      const aoa = fast ? wing.crit + rng.int(3, 5) : wing.crit - rng.int(6, 9);
      const spd = fast ? 120 : 50;
      const options = fast
        ? [opt("stall", "It stalls: the angle is past the critical angle"), opt("fast", "No stall: it's too fast to stall"), opt("engine", "Only if the engine stops")]
        : [opt("nostall", "No stall: the smoke stays smooth, there's just less lift"), opt("slow", "It stalls: slow always means a stall"), opt("stall", "It stalls: the angle is past the critical angle")];
      return {
        ...base, id,
        objective: fast ? "A wing can stall at high speed when the angle of attack is past the critical angle" : "Slow is not the same as stalled: below the critical angle the airflow stays smooth",
        answer: { kind: "choice", correct: fast ? "stall" : "nostall", options: shuffle(options) },
        params: { m: m("speed"), crit: wing.crit, clean: wing.crit, flaps: 0, w: wing.w, v: fast ? 0 : 1, spd, aoa, graph: 1, lv: level },
        prompt: fast
          ? { line: "fp.prompt.speed.fast", text: `Fast air, ${spd} knots, but the ${name.toLowerCase()} is at ${aoa}°. Does it stall?` }
          : { line: "fp.prompt.speed.slow", text: `Slow air, ${spd} knots, with the ${name.toLowerCase()} at ${aoa}°. Does it stall?` },
        a11yDescription: desc(`The air speed is ${spd} knots and the wing is at ${aoa} degrees.`),
      };
    }
    case "engine":
      return {
        ...base, id,
        objective: "A stall is the wing passing its critical angle of attack, not the engine stopping",
        answer: { kind: "choice", correct: "airflow", options: shuffle([opt("airflow", "The wing passes its critical angle and the smooth airflow breaks away"), opt("engine", "The engine stops"), opt("speed", "The plane runs out of speed")]) },
        params: { m: m("engine"), crit: wing.crit, clean: wing.crit, flaps: 0, w: wing.w, spd: 100, aoa: wing.crit + 3, graph: 1, lv: level },
        prompt: { line: "fp.prompt.engine", text: `This model has no engine, but it stalled past ${wing.crit}°. So what is a stall?` },
        a11yDescription: desc(`The wing is at ${wing.crit + 3} degrees and stalled: the smoke over the top has broken away.`),
      };
    case "recover": {
      const aoa = wing.crit + rng.int(3, 5);
      return {
        ...base, id,
        objective: "To recover from a stall, first lower the nose (reduce the angle of attack), then add power smoothly",
        answer: { kind: "choice", correct: "lower", options: shuffle([opt("lower", "Lower the nose: make the angle smaller"), opt("pull", "Pull the nose up even more"), opt("power", "Add power and keep the nose up")]) },
        params: { m: m("recover"), crit: wing.crit, clean: wing.crit, flaps: 0, w: wing.w, spd: 100, aoa, graph: 1, lv: level },
        prompt: { line: "fp.prompt.recover", text: `The ${name.toLowerCase()} stalled at ${aoa}°. What brings the smooth airflow back?` },
        a11yDescription: desc(`The wing is at ${aoa} degrees and stalled.`),
      };
    }
  }
}

// ------------------------------------------------------------------------------------------------ leg timer
const TAS_MIXED = [90, 100, 120, 150, 180] as const;
const TAS_WIND = [100, 110, 120, 130, 140] as const;
const WINDS = [10, 20, 30] as const;

/** Whole-minute legs: pick minutes so that distance = gs × minutes ÷ 60 is a whole number in range. */
function wholeLeg(rng: Rng, gs: number, minM: number, maxM: number, maxD: number): { d: number; mins: number } {
  const ok: number[] = [];
  for (let mins = minM; mins <= maxM; mins++) if ((gs * mins) % 60 === 0 && (gs * mins) / 60 >= 10 && (gs * mins) / 60 <= maxD) ok.push(mins);
  const mins = rng.pick(ok);
  return { d: (gs * mins) / 60, mins };
}
/** Distances whose exact time has a fractional part safely away from .0 and .5 (nearest minute is unambiguous). */
export function roundDistances(gs: number): number[] {
  const ok: number[] = [];
  for (let d = 15; d <= 100; d++) {
    const f = exactMinutes(d, gs) % 1;
    if ((f > 0.15 && f < 0.35) || (f > 0.65 && f < 0.85)) ok.push(d);
  }
  return ok;
}

function legItem(level: number, rng: Rng, kind: Extract<Slot, { mode: "time" }>["kind"], id: string, seed: number): Item {
  let [from, to] = rng.pick(LEGS) as readonly [number, number];
  let tas: number;
  let wind = 0;
  let d: number;
  let d2 = 0;
  let via = 0;
  switch (kind) {
    case "basic":
      tas = rng.pick([60, 120]);
      d = wholeLeg(rng, tas, 10, 45, 90).d;
      break;
    case "mixed":
      tas = rng.pick(TAS_MIXED);
      d = wholeLeg(rng, tas, 8, 40, 120).d;
      break;
    case "wind":
    case "total":
      tas = rng.pick(TAS_WIND);
      wind = rng.pick(WINDS) * (rng.chance(0.5) ? -1 : 1);
      d = wholeLeg(rng, groundspeed(tas, wind), 8, 40, 120).d;
      if (kind === "total") {
        // two legs that chain on the chart: from → via → to
        const i = rng.int(0, 3);
        [from, via] = LEGS[i] as readonly [number, number];
        to = LEGS[i + 1]![1];
        d2 = wholeLeg(rng, groundspeed(tas, wind), 8, 30, 100).d;
      }
      break;
    case "round":
      tas = rng.pick(TAS_MIXED.filter((s) => roundDistances(s).length > 0));
      d = rng.pick(roundDistances(tas));
      break;
    case "roundWind": {
      const combos = TAS_WIND.flatMap((t) => WINDS.flatMap((w) => [-w, w].map((sw) => [t, sw] as const))).filter(([t, sw]) => roundDistances(groundspeed(t, sw)).length > 0);
      [tas, wind] = rng.pick(combos);
      d = rng.pick(roundDistances(groundspeed(tas, wind)));
      break;
    }
  }
  const gs = groundspeed(tas, wind);
  const value = legAnswer({ d, tas, wind, d2 });
  const fromN = PLACES[from]!, toN = PLACES[to]!;
  const windText = wind === 0 ? "" : wind < 0 ? `, ${-wind} kt headwind` : `, ${wind} kt tailwind`;
  const round = kind === "round" || kind === "roundWind";
  const text =
    kind === "total"
      ? `${fromN} to ${PLACES[via]} is ${d} nm, then ${d2} nm on to ${toN}. Airspeed ${tas} kt${windText}. Total minutes?`
      : wind !== 0
        ? `${fromN} to ${toN}: ${d} nm. Airspeed ${tas} kt${windText}. How many minutes${round ? ", to the nearest minute" : ""}?`
        : `${fromN} to ${toN}: ${d} nm at ${tas} knots. How many minutes${round ? ", to the nearest minute" : ""}?`;
  return {
    id,
    skillId: SKILL.tsd,
    objective: kind === "total" ? "Add the times of two legs, each from time = distance ÷ groundspeed" : wind !== 0 ? "Find groundspeed from airspeed and a head- or tailwind, then time = distance ÷ groundspeed" : round ? "Time = distance ÷ speed, rounded to the nearest minute" : "Time = distance ÷ speed, in minutes",
    ages: FP_AGES,
    interaction: "choose",
    objectKind: "chart",
    seed,
    answer: { kind: "number", value },
    params: { m: m("time"), from, to, d, tas, wind, gs, d2, via, rnd: round ? 1 : 0, lv: level },
    prompt: { line: kind === "total" ? "fp.prompt.leg.total" : wind !== 0 ? "fp.prompt.leg.wind" : round ? "fp.prompt.leg.round" : "fp.prompt.leg", text },
    a11yDescription: `Ziggy's fictional chart (not for navigation) with the leg from ${fromN} to ${toN} marked. ${text} Type the minutes on the keypad or with the number keys, then press Done.`,
  };
}

// ------------------------------------------------------------------------------------------------ weather
function cover(c: Cover): Layer["cover"] {
  return c;
}
interface WxOpts { gust: boolean; layers2: boolean; clouds: boolean }
/** A METAR that breaks exactly the card line `fail` (or none). */
export function makeMetar(rng: Rng, fail: WxFail | null, o: WxOpts & { trap?: boolean }): Metar {
  const okW = WSPDS.filter((s) => s <= 14);
  const wspd = fail === "wind" ? rng.pick(WSPDS.filter((s) => s >= 18)) : fail === "gust" ? rng.pick([12, 14]) : rng.pick(okW);
  const calmGusts = GUSTS.filter((g) => g <= CARD.gust && g > wspd + 4);
  const gust = fail === "gust" ? rng.pick(GUSTS.filter((g) => g > CARD.gust)) : o.gust && rng.chance(0.5) && wspd >= 10 && calmGusts.length ? rng.pick(calmGusts) : 0;
  const vis = fail === "vis" ? rng.pick(VISES.filter((v) => v < 5)) : rng.pick(VISES.filter((v) => v >= 6));
  let layers: Layer[];
  if (!o.clouds) layers = [{ cover: "SKC", base: 0 }];
  else if (fail === "ceiling") {
    const low = rng.pick(BASES.filter((b) => b < 30 && (!o.layers2 || b >= 12)));
    layers = [{ cover: cover(rng.pick(["BKN", "OVC"] as const)), base: low }];
    if (o.layers2) layers.unshift({ cover: "FEW", base: rng.pick(BASES.filter((b) => b < low)) });
  } else if (o.trap) {
    // a low FEW/SCT layer (not a ceiling) under a broken layer at or above the card
    const low = rng.pick(BASES.filter((b) => b >= 12 && b < 30));
    layers = [{ cover: rng.pick(["FEW", "SCT"] as const), base: low }, { cover: "BKN", base: rng.pick(BASES.filter((b) => b >= 35)) }];
  } else {
    const first = rng.pick(["FEW", "SCT", "BKN", "OVC"] as const);
    const base = first === "BKN" || first === "OVC" ? rng.pick(BASES.filter((b) => b >= 35)) : rng.pick(BASES.filter((b) => b >= 30 && b <= 50));
    layers = [{ cover: first, base }];
    if (o.layers2) {
      const next = BASES.filter((b) => b > base);
      if (next.length) layers.push({ cover: first === "OVC" ? "OVC" : rng.pick(["BKN", "OVC"] as const), base: rng.pick(next) });
    }
  }
  if (o.layers2 && layers.length < 2) {
    const top = layers[layers.length - 1]!;
    const next = BASES.filter((b) => b > top.base);
    if (top.cover !== "SKC" && top.cover !== "OVC" && next.length) layers.push({ cover: "OVC", base: rng.pick(next) });
    else if (layers[0]!.cover !== "SKC") {
      const below = BASES.filter((b) => b < layers[0]!.base && b >= 30);
      if (below.length) layers.unshift({ cover: "FEW", base: rng.pick(below) });
    }
  }
  const ti = rng.int(0, TEMPS.length - 1);
  const t = TEMPS[ti]!;
  const dp = rng.pick(DEWS.filter((x) => x < t));
  return { st: rng.int(0, STATIONS.length - 1), time: rng.pick(TIMES), wdir: rng.pick(WDIRS), wspd, gust, vis, layers, t, dp };
}
/** Encode a METAR into params (numbers only). */
export function metarParams(x: Metar): Record<string, number> {
  const c = (i: number) => (x.layers[i] ? COVERS.indexOf(x.layers[i]!.cover) : 0);
  return { st: x.st, tm: x.time, wd: x.wdir, ws: x.wspd, wg: x.gust, vs: x.vis, c1: c(0), b1: x.layers[0]?.base ?? 0, c2: c(1), b2: x.layers[1]?.base ?? 0, t: x.t, dp: x.dp };
}
export function metarOf(params: Readonly<Record<string, number>>): Metar {
  const layers: Layer[] = [];
  const c1 = COVERS[params.c1 ?? 0], c2 = COVERS[params.c2 ?? 0];
  if (c1) layers.push({ cover: c1, base: params.b1 ?? 0 });
  if (c2) layers.push({ cover: c2, base: params.b2 ?? 0 });
  return { st: params.st ?? 0, time: params.tm ?? TIMES[0], wdir: params.wd ?? 270, wspd: params.ws ?? 10, gust: params.wg ?? 0, vis: params.vs ?? 10, layers, t: params.t ?? 18, dp: params.dp ?? 12 };
}

function decodeItem(level: number, rng: Rng, slot: Extract<Slot, { mode: "decode" }>, id: string, seed: number): Item {
  const clouds = slot.groups.includes("cloud");
  const x = makeMetar(rng, null, { gust: !!slot.gust, layers2: slot.groups.includes("cloud2"), clouds });
  if (slot.gust && !x.gust) {
    x.wspd = rng.pick([12, 14]);
    x.gust = rng.pick(GUSTS.filter((g) => g > x.wspd + 4));
  }
  const kinds = slot.groups.filter((k) => k !== "cloud2" || x.layers.length > 1);
  const groups = metarGroups(x);
  const items = kinds.map((k) => ({ id: `g-${k}`, text: groups.find((g) => g.kind === k)!.text }));
  const distract = rng.shuffle([...kinds]).slice(0, slot.distractors);
  const targets: AnswerOption[] = [];
  const pairs: Record<string, string> = {};
  for (const k of kinds) {
    const mean = groupMeaning(k, x);
    targets.push({ id: `t-${k}`, text: mean.right });
    pairs[`g-${k}`] = `t-${k}`;
    if (distract.includes(k)) targets.push({ id: `x-${k}`, text: mean.wrong });
  }
  let mask = 0;
  for (const k of kinds) mask |= 1 << ["time", "wind", "vis", "cloud", "cloud2", "temp"].indexOf(k);
  return {
    id,
    skillId: SKILL.metar,
    objective: `Decode the METAR groups: ${kinds.join(", ")}`,
    ages: FP_AGES,
    interaction: "choose",
    objectKind: "metar",
    seed,
    answer: { kind: "match", pairs, items, targets: rng.shuffle(targets) },
    params: { m: m("decode"), ...metarParams(x), mask, lv: level },
    prompt: { line: "fp.prompt.decode", text: "Match each weather group to what it means." },
    a11yDescription: `A practice weather report (made up, not real weather): ${groups.map((g) => g.text).join(" ")}. Pick a highlighted group, then the meaning that matches it. Repeat for each group, then press Check.`,
  };
}

const CALL_OPTION: Record<"fly" | WxFail, string> = {
  fly: "Fly: everything is inside the card",
  ceiling: "Wait: the cloud ceiling is too low",
  vis: "Wait: the visibility is too low",
  wind: "Wait: the wind is too strong",
  gust: "Wait: the gusts are too strong",
};
function callItem(level: number, rng: Rng, slot: Extract<Slot, { mode: "call" }>, id: string, seed: number): Item {
  const clouds = slot.fails.includes("ceiling");
  const fail: WxFail | null = slot.trap ? (rng.chance(0.6) ? null : rng.pick(slot.fails.filter((f) => f !== "ceiling"))) : rng.chance(0.3) ? null : rng.pick(slot.fails);
  const x = makeMetar(rng, fail, { gust: !!slot.gust, layers2: !!slot.layers2, clouds, trap: !!slot.trap && fail !== "ceiling" });
  const correct = fail ?? "fly";
  const ids: ("fly" | WxFail)[] = ["fly", ...slot.fails];
  const c = ceilingOf(x.layers);
  return {
    id,
    skillId: SKILL.metar,
    objective: "Compare a METAR with the practice card, line by line, and decide fly or wait",
    ages: FP_AGES,
    interaction: "choose",
    objectKind: "metar",
    seed,
    answer: { kind: "choice", correct, options: rng.shuffle(ids.map((k) => opt(k, CALL_OPTION[k]))) },
    params: { m: m("call"), ...metarParams(x), gr: slot.gust ? 1 : 0, cl: clouds ? 1 : 0, trap: slot.trap ? 1 : 0, lv: level },
    prompt: { line: "fp.prompt.call", text: "Check the weather against Ziggy's practice card. Fly or wait?" },
    a11yDescription: `A practice weather report (made up): ${metarGroups(x).map((g) => g.text).join(" ")}. Ziggy's practice card (not real legal minimums): ${clouds ? `ceiling at least ${fmtFeet(CARD.ceiling)} feet, ` : ""}visibility at least ${CARD.vis} miles, wind ${CARD.wind} knots or less${slot.gust ? `, gusts ${CARD.gust} knots or less` : ""}. The ceiling is the lowest broken or overcast layer${c === null ? "; there is none here" : ""}. Choose fly or wait.`,
  };
}

// ------------------------------------------------------------------------------------------------ checklist
function orderItem(level: number, rng: Rng, slot: Extract<Slot, { mode: "order" }>, id: string, seed: number): Item {
  const idx = rng.shuffle(STEPS.map((_, i) => i)).slice(0, slot.n).sort((a, b) => a - b);
  const order = idx.map((i) => `s${i}`);
  const pieces: AnswerOption[] = idx.map((i) => ({ id: `s${i}`, text: STEPS[i]! }));
  const skip = slot.skip ? rng.int(0, SKIP_STEPS.length - 1) : -1;
  if (skip >= 0) pieces.push({ id: `k${skip}`, text: SKIP_STEPS[skip]! });
  return {
    id,
    skillId: SKILL.preflight,
    objective: slot.skip ? "Order the pre-flight steps and leave out the step that skips safety" : `Order ${slot.n} steps from planning to take-off`,
    ages: FP_AGES,
    interaction: "choose",
    objectKind: "checklist",
    seed,
    answer: { kind: "sequence", order, pieces: rng.shuffle(pieces) },
    params: { m: m("order"), n: slot.n, skip, lv: level },
    prompt: slot.skip
      ? { line: "fp.prompt.order.skip", text: "Put the steps in order, from planning to take-off. One card doesn't belong: leave it out." }
      : { line: "fp.prompt.order", text: "Put the steps in order, from planning to take-off." },
    a11yDescription: `Step cards for Ziggy's checklist: ${pieces.map((pc) => pc.text).join("; ")}. Tap the cards in order to add them to the checklist${slot.skip ? ", leaving out the one that skips safety" : ""}, then press Check.`,
  };
}

function missedItem(level: number, rng: Rng, id: string, seed: number): Item {
  const miss = rng.pick(PLAN_ITEMS);
  const shown = PLAN_ITEMS.filter((x) => x !== miss);
  const variants = Object.fromEntries(PLAN_ITEMS.map((k) => [k, rng.int(0, 1)])) as Record<PlanItem, number>;
  // when weather is the missing item, Ziggy's note sometimes says he skipped it ("only a short hop")
  const skipped = miss === "weather" && rng.chance(0.5) ? 1 : 0;
  const others = rng.shuffle(shown.filter((x) => x !== miss)).slice(0, 3);
  const options = rng.shuffle([miss, ...others]).map((k) => opt(k, PLAN_TITLE[k]));
  return {
    id,
    skillId: SKILL.preflight,
    objective: "Spot which planning item is missing from Ziggy's notes",
    ages: FP_AGES,
    interaction: "choose",
    objectKind: "checklist",
    seed,
    answer: { kind: "choice", correct: miss, options },
    params: { m: m("missed"), miss: PLAN_ITEMS.indexOf(miss), skipped, ...Object.fromEntries(PLAN_ITEMS.map((k) => [`n_${k}`, variants[k]])), lv: level },
    prompt: { line: "fp.prompt.missed", text: "Ziggy's planning notes miss one item from the card. Which one?" },
    a11yDescription: `Ziggy's planning card lists five items. His notes cover only four of them${skipped ? ", and one note says the weather was skipped" : ""}. Read the notes and choose the item that is missing.`,
  };
}

function imsafeItem(level: number, rng: Rng, slot: Extract<Slot, { mode: "imsafe" }>, id: string, seed: number): Item {
  const sc = rng.int(0, PILOT_SCENES.length - 1);
  const why = PILOT_SCENES[sc]!.why;
  const notReady = (["Illness", "Medication", "Stress", "Fatigue", "Emotion"] as ImsafeWhy[]).filter((w) => w !== why);
  const ids: string[] = why === "ready" ? ["ready", ...rng.shuffle(notReady).slice(0, 2)] : slot.push ? [why, "push", "ready"] : [why, "ready", rng.pick(notReady)];
  const options = rng.shuffle(ids).map((k) => opt(k, k === "push" ? IMSAFE_PUSH : IMSAFE_OPTION[k as ImsafeWhy]));
  return {
    id,
    skillId: SKILL.risk,
    objective: "Use IMSAFE to decide whether the pilot is fit to fly",
    ages: FP_AGES,
    interaction: "choose",
    objectKind: "pilot",
    seed,
    answer: { kind: "choice", correct: why, options },
    params: { m: m("imsafe"), sc, push: slot.push ? 1 : 0, lv: level },
    prompt: { line: "fp.prompt.imsafe", text: "Is the pilot ready? Use the IMSAFE check." },
    a11yDescription: `Morning of the flight: ${PILOT_SCENES[sc]!.text} The IMSAFE card lists Illness, Medication, Stress, Alcohol, Fatigue and Emotion. Choose whether Ziggy is ready to fly.`,
  };
}

// ------------------------------------------------------------------------------------------------ the briefing (closer)
const TRIPS = [35, 40, 45, 50, 55, 60, 70] as const;
export const FACTOR_CALL: Record<Factor, Call> = { route: "fuel", wx: "wait", pilot: "rest", plane: "fix" };

function briefItem(level: number, rng: Rng, slot: Extract<Slot, { mode: "brief" }>, id: string, seed: number): Item {
  const fail: Factor | null = rng.chance(0.4) ? null : rng.pick(slot.factors);
  const trip = rng.pick(TRIPS);
  const fuel = fail === "route" ? trip + rng.pick([0, 5, 10, 15, 20]) : trip + RESERVE_MIN + rng.pick([15, 30, 45, 60, 90]);
  const wxFails: WxFail[] = ["ceiling", "vis", "wind"];
  const x = makeMetar(rng, fail === "wx" ? rng.pick(wxFails) : null, { gust: false, layers2: false, clouds: true });
  const readyScenes = PILOT_SCENES.map((s, i) => [s, i] as const).filter(([s]) => s.why === "ready").map(([, i]) => i);
  const unfitScenes = PILOT_SCENES.map((s, i) => [s, i] as const).filter(([s]) => s.why !== "ready").map(([, i]) => i);
  const sc = fail === "pilot" ? rng.pick(unfitScenes) : rng.pick(readyScenes);
  const planeBad = fail === "plane" ? 1 : 0;
  const pn = rng.int(0, 1);
  const correct: Call = fail ? FACTOR_CALL[fail] : "go";
  const pool: (Call | "pressure")[] = slot.factors.map((f) => FACTOR_CALL[f]).filter((c) => c !== correct);
  let distract: (Call | "pressure")[];
  if (correct === "go") distract = rng.shuffle(pool).slice(0, 2);
  else distract = [slot.pressure ? "pressure" : "go", rng.pick(pool)];
  const options = rng.shuffle([correct, ...distract]).map((k) => opt(k, CALL_TEXT[k]));
  const has = (f: Factor) => (slot.factors.includes(f) ? 1 : 0);
  const rows: string[] = [`route: trip ${fmtHM(trip)}, fuel ${fmtHM(fuel)}`];
  if (has("wx")) rows.push(`weather: ${metarGroups(x).map((g) => g.text).join(" ")}`);
  if (has("pilot")) rows.push(`pilot: ${PILOT_SCENES[sc]!.text}`);
  if (has("plane")) rows.push(planeBad ? "plane: a problem was found on the walk-around" : "plane: walk-around fine");
  return {
    id,
    skillId: SKILL.risk,
    objective: "Check every factor of the briefing and make the go, wait or no-go call",
    ages: FP_AGES,
    interaction: "choose",
    objectKind: "brief",
    seed,
    closer: true,
    answer: { kind: "choice", correct, options },
    params: {
      m: m("brief"), trip, fuel, sc, pb: planeBad, pn, fr: has("route"), fw: has("wx"), fpi: has("pilot"), fpl: has("plane"), pr: slot.pressure ? 1 : 0,
      ...metarParams(x), lv: level,
    },
    prompt: { line: "fp.prompt.brief", text: "Final briefing before take-off. What's the call, co-pilot?" },
    a11yDescription: `The go / no-go briefing board. ${rows.join(". ")}. Fuel must cover the trip plus a ${RESERVE_MIN}-minute reserve. ${slot.pressure ? "Bobbo says he can't be late for the festival. " : ""}Choose the call.`,
  };
}

// ------------------------------------------------------------------------------------------------ generator
export const generateFlightPlan: ExerciseGenerator = (level, rng, index) => {
  const lv = Math.max(0, Math.min(FP_MAX_LEVEL, level));
  const slot = LEVELS[lv]!.slots[index % BAND]!;
  const seed = rng.int(1, 999_999);
  const id = `fp-${slot.mode}-l${lv}n${index}`;
  switch (slot.mode) {
    case "find":
      return tunnelFind(lv, rng, { flaps: false, graph: slot.graph, id, seed });
    case "flaps":
      return tunnelFind(lv, rng, { flaps: true, graph: slot.graph, id, seed });
    case "lift":
    case "speed":
    case "engine":
    case "recover":
      return tunnelChoice(lv, rng, slot, id, seed);
    case "time":
      return legItem(lv, rng, slot.kind, id, seed);
    case "decode":
      return decodeItem(lv, rng, slot, id, seed);
    case "call":
      return callItem(lv, rng, slot, id, seed);
    case "order":
      return orderItem(lv, rng, slot, id, seed);
    case "missed":
      return missedItem(lv, rng, id, seed);
    case "imsafe":
      return imsafeItem(lv, rng, slot, id, seed);
    case "brief":
      return briefItem(lv, rng, slot, id, seed);
  }
};

/** Helpers shared with the board, hints and tests. */
export { cardFails, roundMinutes };
