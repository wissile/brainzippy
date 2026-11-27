import type { AnswerOption, Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";
import {
  ANGLE_KINDS, type AngleKind, DIAL_STEP, FINALES, type Finale, KIND_TEXT, LADDER_CTX, type LadderCtx, MODES, type Mode, NEAR_MISSES, PLACES, POSITIONS,
  type Pos, REF_LETTER, REF_NAME, REL_TEXT, type Rel, SCALES, SHARE_CTX, SHIPS, TRIPLES, backBearing, bearingFrom, encodePoint, fmtBearing, fmtLine,
  fmtN, fmtNum, fmtPt, gridRange, hypOf, legOf, lineAnswer, pairedPos, pointAnswer, ratioN, relAnswer, round1, sayLine, shareOf, valueAt,
} from "./logic";

/**
 * Lighthouse Night — seeded generator (pure: same level + rng + index → same exercise).
 * Pedagogy and the full level table: docs/worlds/lighthouse-night.md. Spec: docs/curriculum/maths.md §3 ("Lighthouse
 * Angles"), widened to the 12–14 end of the Maths journey (angle facts, bearings, Pythagoras, scale and ratio, graphs).
 *
 * A round is one stormy night: 7 items from up to four inner games, then Last Ship Home (Bobbo's boat), an engine
 * `closer` (R5a) so it always ends the round. Level 0 is one inner game with the tutorial; every later level adds at
 * most three new ideas (unit-tested against IDEAS), the rest of the band is review, and no mode fills more than 3 of
 * the 7 slots:
 *
 *   Lv  new ideas                                                   finale
 *   0   beam: angles on a line (tutorial) · around a point · types  two equal angles on a line
 *   1   vertically opposite · triangle · chart: cm → km              exterior angle of a triangle
 *   2   parallel lanes (F, Z, C) · ladder: hypotenuse · km → cm      exterior angle of a triangle
 *   3   three-figure bearings · back bearings (dial) · plot (0–8)     back bearing (dial)
 *   4   a shorter side · gradient · y-intercept                      back bearing / chart + Pythagoras
 *   5   sharing in a ratio · "which angle fact?" · 1 d.p. lengths     back bearing / chart + Pythagoras
 *   6   y = mx + c · negative and fractional gradients · 4 quadrants  + course line through two points
 *   7   scale as 1 : n · the converse · isosceles triangles          any
 *   8   where paths cross · parallel paths · other chart scales      any (+ exterior angle)
 */
export const LN_AGES = [12, 14] as const;
export const SKILL = {
  angles: "math.geom.angles",
  bearings: "math.geom.bearings",
  pyth: "math.geom.pythagoras",
  scale: "math.solve.scale-ratio",
  graphs: "math.alg.linear-graphs",
} as const;
export const MODE_SKILL: Record<Exclude<Mode, "home">, string> = {
  line: SKILL.angles, point: SKILL.angles, kind: SKILL.angles, vert: SKILL.angles, tri: SKILL.angles, par: SKILL.angles, reason: SKILL.angles,
  bread: SKILL.bearings, bback: SKILL.bearings,
  hyp: SKILL.pyth, leg: SKILL.pyth, round: SKILL.pyth, conv: SKILL.pyth,
  real: SKILL.scale, map: SKILL.scale, share: SKILL.scale, ratio: SKILL.scale,
  plot: SKILL.graphs, grad: SKILL.graphs, icpt: SKILL.graphs, eqn: SKILL.graphs, meet: SKILL.graphs, para: SKILL.graphs,
};
export const FINALE_SKILL: Record<Finale, string> = { fline: SKILL.angles, ftri: SKILL.angles, fback: SKILL.bearings, fchart: SKILL.pyth, fcourse: SKILL.graphs };

export type Slot =
  | { mode: "line"; n: 2 | 3; right?: boolean }
  | { mode: "point"; n: 3 | 4 }
  | { mode: "kind" }
  | { mode: "vert" }
  | { mode: "tri"; iso: boolean }
  | { mode: "par"; rels: readonly Rel[] }
  | { mode: "reason" }
  | { mode: "bread" }
  | { mode: "bback" }
  | { mode: "hyp" }
  | { mode: "leg" }
  | { mode: "round" }
  | { mode: "conv" }
  | { mode: "real"; half: boolean; scales: readonly number[] }
  | { mode: "map"; scales: readonly number[] }
  | { mode: "share" }
  | { mode: "ratio" }
  | { mode: "plot"; q4: boolean }
  | { mode: "grad"; neg: boolean }
  | { mode: "icpt"; neg: boolean }
  | { mode: "eqn"; neg: boolean }
  | { mode: "meet" }
  | { mode: "para" }
  | { mode: "home"; f: readonly Finale[] };

/** The new ideas each level brings (unit-tested: at most three per level; every slot's idea is already introduced). */
export const IDEAS: readonly (readonly string[])[] = [
  ["line", "point", "kind"],
  ["vert", "tri", "real"],
  ["par", "hyp", "map"],
  ["bread", "bback", "plot"],
  ["leg", "grad", "icpt"],
  ["share", "reason", "round"],
  ["eqn", "neg", "q4"],
  ["ratio", "conv", "iso"],
  ["meet", "para", "scales"],
];
/** The idea a slot practises (for the "new ideas" test). Extensions count as their own idea. */
export function ideaOf(s: Slot): string[] {
  switch (s.mode) {
    case "tri":
      return s.iso ? ["tri", "iso"] : ["tri"];
    case "grad":
    case "icpt":
      return s.neg ? [s.mode, "neg"] : [s.mode];
    case "eqn":
      return s.neg ? ["eqn", "neg"] : ["eqn"];
    case "plot":
      return s.q4 ? ["plot", "q4"] : ["plot"];
    case "real":
    case "map":
      return s.scales.length > 1 ? [s.mode, "scales"] : [s.mode];
    case "home":
      return [];
    default:
      return [s.mode];
  }
}

const K2 = [2] as const;
export interface LevelSpec { label: string; slots: readonly Slot[] }
export const LEVELS: readonly LevelSpec[] = [
  {
    label: "Beam Angles: angles on a straight line and around a point; angle types",
    slots: [{ mode: "line", n: 2 }, { mode: "point", n: 3 }, { mode: "kind" }, { mode: "line", n: 2 }, { mode: "point", n: 3 }, { mode: "line", n: 3, right: true }, { mode: "point", n: 3 }, { mode: "home", f: ["fline"] }],
  },
  {
    label: "Vertically opposite angles; angles in a triangle; Chart Scale opens (cm to km)",
    slots: [{ mode: "vert" }, { mode: "tri", iso: false }, { mode: "real", half: false, scales: K2 }, { mode: "line", n: 3 }, { mode: "vert" }, { mode: "tri", iso: false }, { mode: "point", n: 4 }, { mode: "home", f: ["ftri"] }],
  },
  {
    label: "Parallel shipping lanes; Ladder & Tower opens (hypotenuse); km to cm",
    slots: [{ mode: "par", rels: ["corr", "alt"] }, { mode: "hyp" }, { mode: "map", scales: K2 }, { mode: "par", rels: ["coint", "alt"] }, { mode: "tri", iso: false }, { mode: "hyp" }, { mode: "real", half: true, scales: K2 }, { mode: "home", f: ["ftri"] }],
  },
  {
    label: "Three-figure bearings and back bearings; Ship Paths opens (plot a point)",
    slots: [{ mode: "bread" }, { mode: "bback" }, { mode: "plot", q4: false }, { mode: "hyp" }, { mode: "par", rels: ["corr", "alt", "coint"] }, { mode: "map", scales: K2 }, { mode: "bread" }, { mode: "home", f: ["fback"] }],
  },
  {
    label: "A shorter side; gradient and y-intercept",
    slots: [{ mode: "leg" }, { mode: "grad", neg: false }, { mode: "icpt", neg: false }, { mode: "plot", q4: false }, { mode: "bback" }, { mode: "real", half: true, scales: K2 }, { mode: "leg" }, { mode: "home", f: ["fback", "fchart"] }],
  },
  {
    label: "Sharing in a ratio; which angle fact?; lengths to 1 decimal place",
    slots: [{ mode: "share" }, { mode: "reason" }, { mode: "round" }, { mode: "icpt", neg: false }, { mode: "bread" }, { mode: "grad", neg: false }, { mode: "share" }, { mode: "home", f: ["fback", "fchart"] }],
  },
  {
    label: "y = mx + c; negative and fractional gradients; all four quadrants",
    slots: [{ mode: "eqn", neg: true }, { mode: "grad", neg: true }, { mode: "plot", q4: true }, { mode: "round" }, { mode: "reason" }, { mode: "share" }, { mode: "eqn", neg: true }, { mode: "home", f: ["fback", "fchart", "fcourse"] }],
  },
  {
    label: "Scale as a ratio 1 : n; is it a right angle? (the converse); isosceles triangles",
    slots: [{ mode: "ratio" }, { mode: "conv" }, { mode: "tri", iso: true }, { mode: "icpt", neg: true }, { mode: "bback" }, { mode: "leg" }, { mode: "conv" }, { mode: "home", f: ["fback", "fchart", "fcourse"] }],
  },
  {
    label: "Where two paths cross; parallel paths; other chart scales; everything mixed",
    slots: [{ mode: "meet" }, { mode: "para" }, { mode: "real", half: true, scales: SCALES }, { mode: "round" }, { mode: "bread" }, { mode: "tri", iso: true }, { mode: "para" }, { mode: "home", f: ["ftri", "fback", "fchart", "fcourse"] }],
  },
];
export const LN_MAX_LEVEL = LEVELS.length - 1;
export const BAND = 8;

type Item = Omit<Exercise, "difficulty">;
const m = (mode: Mode) => MODES.indexOf(mode);
const opt = (id: string, text: string): AnswerOption => ({ id, text });
const step5 = (rng: Rng, lo: number, hi: number) => rng.int(lo / 5, hi / 5) * 5;
const base = (seed: number, skillId: string, objectKind: string) => ({ ages: LN_AGES, interaction: "choose" as const, seed, skillId, objectKind });
const num = (value: number) => ({ kind: "number" as const, value });
/** Keypad answers that may be decimals (lengths, distances, gradients) use the numeric kind with a tiny tolerance. */
const dec = (value: number) => ({ kind: "numeric" as const, value, tolerance: 0.001 });

// ------------------------------------------------------------------------------------------------ beam: angle facts
export function lineItem(level: number, rng: Rng, slot: { n: 2 | 3; right?: boolean }, id: string, seed: number, tutorial = false): Item {
  let parts: number[];
  let u: number;
  if (slot.n === 2) {
    let a = step5(rng, 25, 155);
    if (a === 90) a = 95;
    parts = rng.chance(0.5) ? [a, 180 - a] : [180 - a, a];
    u = tutorial ? 1 : rng.int(0, 1);
    if (tutorial) parts = [130, 50];
  } else if (slot.right) {
    const k = step5(rng, 20, 70);
    parts = rng.shuffle([90, k, 90 - k]);
    u = rng.pick(parts.map((x, i) => (x !== 90 ? i : -1)).filter((i) => i >= 0));
  } else {
    const a = step5(rng, 30, 80);
    const b = step5(rng, 30, 80);
    parts = [a, b, 180 - a - b];
    u = rng.int(0, 2);
  }
  const known = parts.filter((_, i) => i !== u);
  return {
    ...base(seed, SKILL.angles, "beam"),
    id,
    objective: "Use the fact that angles on a straight line add up to 180°",
    ...(tutorial ? { tutorial: true } : {}),
    answer: num(lineAnswer(parts, u)),
    params: { m: m("line"), n: slot.n, p0: parts[0]!, p1: parts[1]!, p2: parts[2] ?? 0, u, lv: level },
    prompt: tutorial
      ? { line: "ln.prompt.tutorial", text: "The beam meets the straight harbour wall. Find the angle x, then press Done." }
      : { line: "ln.prompt.line", text: "The harbour wall is a straight line. Find the angle x." },
    a11yDescription: `The lighthouse beam${slot.n === 3 ? "s" : ""} meet${slot.n === 3 ? "" : "s"} a straight harbour wall at the lamp. The angles along the wall are ${known.map((k) => `${k} degrees${k === 90 ? " (a right angle)" : ""}`).join(" and ")} and x. Type x on the keypad, then press Done.`,
  };
}

function pointItem(level: number, rng: Rng, n: 3 | 4, id: string, seed: number): Item {
  let x = step5(rng, 50, n === 3 ? 200 : 140);
  if (x === 180) x = 185; // a hidden straight line would make "180 − the rest" collide with the answer
  let rest = 360 - x;
  const parts: number[] = [];
  for (let i = 0; i < n - 2; i++) {
    const left = n - 2 - i; // parts still to place after this one
    const hi = Math.min(170, rest - 40 * left);
    const v = step5(rng, 40, Math.max(40, hi));
    parts.push(v);
    rest -= v;
  }
  parts.push(rest);
  const u = rng.int(0, n - 1);
  parts.splice(u, 0, x);
  return {
    ...base(seed, SKILL.angles, "beam"),
    id,
    objective: "Use the fact that angles around a point add up to 360°",
    answer: num(pointAnswer(parts, u)),
    params: { m: m("point"), n, p0: parts[0]!, p1: parts[1]!, p2: parts[2]!, p3: parts[3] ?? 0, u, r: step5(rng, 0, 355), lv: level },
    prompt: { line: "ln.prompt.point", text: `${n} beams shine out from the lamp. Find the angle x.` },
    a11yDescription: `${n} beams meet at the lamp, all the way round. The angles between them are ${parts.filter((_, i) => i !== u).map((k) => `${k}`).join(", ")} degrees and x. Type x on the keypad, then press Done.`,
  };
}

function kindItem(level: number, rng: Rng, index: number, id: string, seed: number): Item {
  const kind: AngleKind = ANGLE_KINDS[(index + rng.int(0, 3)) % 4]!;
  const a = kind === "acute" ? step5(rng, 25, 70) : kind === "right" ? 90 : kind === "obtuse" ? step5(rng, 110, 160) : step5(rng, 210, 330);
  return {
    ...base(seed, SKILL.angles, "beam"),
    id,
    objective: "Name an angle from a drawing: acute, right, obtuse or reflex",
    answer: { kind: "choice", correct: kind, options: ANGLE_KINDS.map((k) => opt(k, KIND_TEXT[k])) },
    params: { m: m("kind"), a, r: step5(rng, 0, 355), lv: level },
    prompt: { line: "ln.prompt.kind", text: "The beam sweeps round from the dashed line. What type of angle does it sweep?" },
    a11yDescription: `The beam turns from a dashed starting line through the marked arc${kind === "right" ? ", which has a small square in the corner" : ""}. Choose acute, right, obtuse or reflex. (The arc measures ${a} degrees.)`,
  };
}

function vertItem(level: number, rng: Rng, id: string, seed: number): Item {
  let a = step5(rng, 30, 150);
  if (a === 90) a = 110;
  const askOpp = rng.chance(0.5);
  return {
    ...base(seed, SKILL.angles, "beam"),
    id,
    objective: "Use vertically opposite angles (equal) and angles on a straight line",
    answer: num(askOpp ? a : 180 - a),
    params: { m: m("vert"), a, opp: askOpp ? 1 : 0, r: step5(rng, 0, 175), lv: level },
    prompt: { line: "ln.prompt.vert", text: "Two straight beams cross at the lamp. Find the angle x." },
    a11yDescription: `Two straight beams cross at the lamp, making four angles. One is ${a} degrees; x is the angle ${askOpp ? "opposite it" : "next to it"}. Type x on the keypad, then press Done.`,
  };
}

/** Triangle angles: A (apex: the lighthouse), B (the buoy), C (the ship). */
function triAngles(rng: Rng, iso: boolean): { A: number; B: number; C: number; u: number; ig: number } {
  if (iso) {
    if (rng.chance(0.5)) {
      const apex = rng.int(3, 12) * 10;
      const b = (180 - apex) / 2;
      return { A: apex, B: b, C: b, u: 1, ig: 0 };
    }
    const b = step5(rng, 35, 75);
    return { A: 180 - 2 * b, B: b, C: b, u: 0, ig: 1 };
  }
  const A = step5(rng, 30, 100);
  const B = step5(rng, 30, 150 - A);
  return { A, B, C: 180 - A - B, u: rng.int(0, 2), ig: 0 };
}

function triItem(level: number, rng: Rng, iso: boolean, id: string, seed: number): Item {
  const t = triAngles(rng, iso);
  const angles = [t.A, t.B, t.C];
  const names = ["the lighthouse", "the buoy", "the ship"];
  const shown = iso ? [t.ig === 0 ? 0 : 1] : [0, 1, 2].filter((i) => i !== t.u);
  const known = shown.map((i) => `${angles[i]} degrees at ${names[i]}`);
  return {
    ...base(seed, SKILL.angles, "beam"),
    id,
    objective: iso ? "Use the angle sum of a triangle with equal base angles of an isosceles triangle" : "Use the fact that the angles in a triangle add up to 180°",
    answer: num(angles[t.u]!),
    params: { m: m("tri"), A: t.A, B: t.B, C: t.C, u: t.u, iso: iso ? 1 : 0, ig: t.ig, lv: level },
    prompt: iso
      ? { line: "ln.prompt.iso", text: "The beam, the buoy and the ship make an isosceles triangle: two sides are equal. Find x." }
      : { line: "ln.prompt.tri", text: "The lighthouse, the buoy and the ship make a triangle. Find the angle x." },
    a11yDescription: `A triangle joins the lighthouse, a buoy and a ship. ${known.join(" and ")}; x is at ${names[t.u]}.${iso ? " The two sides from the lighthouse are equal (marked with ticks), so the angles at the buoy and the ship are equal." : ""} Type x on the keypad, then press Done.`,
  };
}

function parGeometry(rng: Rng, rels: readonly Rel[]) {
  const rel = rng.pick(rels);
  const th = step5(rng, 40, 75);
  const fl = rng.chance(0.5) ? 1 : 0;
  const phi = fl ? 180 - th : th;
  const options: Pos[] = rel === "corr" ? [...POSITIONS] : ["BL", "BR"];
  const gp = rng.pick(options);
  const qp = pairedPos(rel, gp)!;
  return { rel, th, fl, phi, gp, qp, given: valueAt(gp, phi) };
}

function parItem(level: number, rng: Rng, rels: readonly Rel[], id: string, seed: number): Item {
  const g = parGeometry(rng, rels);
  return {
    ...base(seed, SKILL.angles, "beam"),
    id,
    objective: "Use corresponding, alternate and co-interior angles on parallel lines",
    answer: num(relAnswer(g.rel, g.given)),
    params: { m: m("par"), th: g.th, fl: g.fl, gp: POSITIONS.indexOf(g.gp), qp: POSITIONS.indexOf(g.qp), rel: ["corr", "alt", "coint"].indexOf(g.rel), lv: level },
    prompt: { line: "ln.prompt.par", text: "The two shipping lanes are parallel. The beam crosses both. Find the angle x." },
    a11yDescription: `Two parallel shipping lanes (marked with arrows) are crossed by the beam. At the top crossing one angle is ${g.given} degrees. x is at the bottom crossing (${g.rel === "corr" ? "in the same position" : g.rel === "alt" ? "on the other side of the beam, between the lanes" : "on the same side of the beam, between the lanes"}). Type x on the keypad, then press Done.`,
  };
}

function reasonItem(level: number, rng: Rng, id: string, seed: number): Item {
  const g = parGeometry(rng, ["corr", "alt", "coint"]);
  const other = relAnswer(g.rel, g.given);
  return {
    ...base(seed, SKILL.angles, "beam"),
    id,
    objective: "Name the angle fact that links two angles on parallel lines",
    answer: { kind: "choice", correct: g.rel, options: (["corr", "alt", "coint", "vert"] as const).map((r) => opt(r, REL_TEXT[r])) },
    params: { m: m("reason"), th: g.th, fl: g.fl, gp: POSITIONS.indexOf(g.gp), qp: POSITIONS.indexOf(g.qp), rel: ["corr", "alt", "coint"].indexOf(g.rel), lv: level },
    prompt: { line: "ln.prompt.reason", text: `Hoot marked ${g.given}° and ${other}°. Which angle fact links them?` },
    a11yDescription: `Two parallel shipping lanes crossed by the beam. A ${g.given} degree angle at the top crossing and a ${other} degree angle at the bottom crossing, ${g.rel === "corr" ? "in the same position" : g.rel === "alt" ? "on opposite sides of the beam, between the lanes" : "on the same side of the beam, between the lanes"}. Choose the angle fact that links them.`,
  };
}

// ------------------------------------------------------------------------------------------------ beam: bearings
function breadItem(level: number, rng: Rng, id: string, seed: number): Item {
  let ref = rng.int(0, 3);
  let side: 1 | -1 = rng.chance(0.5) ? 1 : -1;
  if (ref === 0 && side === 1) [ref, side] = rng.chance(0.5) ? [0, -1] : [2, 1];
  const d = step5(rng, 15, 75);
  const b = bearingFrom(ref, side, d);
  const towards = REF_NAME[(ref + (side === 1 ? 1 : 3)) % 4]!;
  return {
    ...base(seed, SKILL.bearings, "compass"),
    id,
    objective: "Write a three-figure bearing, measured clockwise from north",
    answer: num(b),
    params: { m: m("bread"), ref, side, d, lv: level },
    prompt: { line: "ln.prompt.bread", text: "What is the bearing of the ship from the lighthouse? Use three figures." },
    a11yDescription: `A compass around the lighthouse with north at the top. A ship is ${d} degrees from due ${REF_NAME[ref]}, turned towards ${towards} (marked ${REF_LETTER[ref]} ${d}°). Type the three-figure bearing of the ship (measured clockwise from north), then press Done.`,
  };
}

export function bbackSpec(rng: Rng) {
  let b = step5(rng, 20, 340);
  if (b === 180) b = 200;
  return { b, ship: rng.int(0, SHIPS.length - 1) };
}
function bbackItem(level: number, rng: Rng, id: string, seed: number): Item {
  const s = bbackSpec(rng);
  const ship = SHIPS[s.ship]!;
  return {
    ...base(seed, SKILL.bearings, "compass"),
    id,
    objective: "Find a back bearing: the opposite direction is 180° round",
    answer: { kind: "numeric", value: backBearing(s.b), tolerance: 0, unit: "°", min: 0, max: 355, step: DIAL_STEP },
    params: { m: m("bback"), b: s.b, ship: s.ship, lv: level },
    prompt: { line: "ln.prompt.bback", text: `The ${ship} radios: "We see your lamp on a bearing of ${fmtBearing(s.b)}." Turn the beam to the ${ship}.` },
    a11yDescription: `The ${ship} is hidden in the fog. From the ship, the lighthouse is on a bearing of ${fmtBearing(s.b)}. Turn the beam (arrow keys or the turn buttons move it 5 or 30 degrees; you can also drag it round) to the bearing of the ship from the lighthouse, then press Shine.`,
  };
}

// ------------------------------------------------------------------------------------------------ ladder: Pythagoras
const CTX_SIDE: Record<LadderCtx, { thing: string; up: string; out: string }> = {
  ladder: { thing: "ladder", up: "up the tower", out: "from the foot of the tower" },
  rope: { thing: "rope", up: "up, at the gallery rail", out: "along the rocks to the jetty ring" },
  stay: { thing: "storm wire", up: "up the radio mast", out: "from the mast to its ground peg" },
  line: { thing: "line of sight", up: "up, at the lamp", out: "out to the rowing boat" },
};
function scaleTriple(rng: Rng, maxC: number) {
  const t = rng.pick(TRIPLES.filter((x) => x[2] <= maxC));
  return rng.chance(0.5) ? { up: t[0], out: t[1], c: t[2] } : { up: t[1], out: t[0], c: t[2] };
}

function hypItem(level: number, rng: Rng, id: string, seed: number): Item {
  const ctx = rng.int(0, LADDER_CTX.length - 1);
  const k = LADDER_CTX[ctx]!;
  const t = scaleTriple(rng, 29);
  const c = CTX_SIDE[k];
  return {
    ...base(seed, SKILL.pyth, "tower"),
    id,
    objective: "Find the hypotenuse of a right-angled triangle with Pythagoras' theorem",
    answer: dec(t.c),
    params: { m: m("hyp"), up: t.up, out: t.out, c: t.c, ask: 0, ctx, lv: level },
    prompt: { line: "ln.prompt.hyp", text: `The ${c.thing} goes ${t.up} m ${c.up} and ${t.out} m ${c.out}. How long is the ${c.thing}?` },
    a11yDescription: `A right-angled triangle against the lighthouse: the upright side is ${t.up} metres, the ground side is ${t.out} metres, and the ${c.thing} is the sloping side opposite the right angle. Type its length in metres, then press Done.`,
  };
}

function legItem(level: number, rng: Rng, id: string, seed: number): Item {
  const ctx = rng.int(0, LADDER_CTX.length - 1);
  const k = LADDER_CTX[ctx]!;
  const t = scaleTriple(rng, 29);
  const askUp = rng.chance(0.5);
  const c = CTX_SIDE[k];
  return {
    ...base(seed, SKILL.pyth, "tower"),
    id,
    objective: "Find a shorter side of a right-angled triangle with Pythagoras' theorem",
    answer: dec(askUp ? t.up : t.out),
    params: { m: m("leg"), up: t.up, out: t.out, c: t.c, ask: askUp ? 1 : 2, ctx, lv: level },
    prompt: askUp
      ? { line: "ln.prompt.leg", text: `A ${t.c} m ${c.thing} reaches ${t.out} m ${c.out}. How far ${c.up.split(",")[0]} does it go?` }
      : { line: "ln.prompt.leg", text: `A ${t.c} m ${c.thing} goes ${t.up} m ${c.up}. How far is it ${c.out}?` },
    a11yDescription: `A right-angled triangle against the lighthouse. The sloping side (the ${c.thing}, opposite the right angle) is ${t.c} metres; the ${askUp ? `ground side is ${t.out}` : `upright side is ${t.up}`} metres. Type the ${askUp ? "upright" : "ground"} side in metres, then press Done.`,
  };
}

/** Non-triple lengths whose value to 1 d.p. is clear (not near a rounding tie). */
export function roundSpec(rng: Rng): { up: number; out: number; c: number; ask: number; value: number } {
  for (let guard = 0; guard < 200; guard++) {
    if (rng.chance(0.5)) {
      const up = rng.int(3, 12), out = rng.int(2, 11);
      const h = hypOf(up, out);
      const f = (h * 10) % 1;
      if (Number.isInteger(h) || Math.abs(f - 0.5) < 0.08) continue;
      return { up, out, c: round1(h), ask: 0, value: round1(h) };
    }
    const c = rng.int(6, 15), out = rng.int(2, c - 2);
    const l = legOf(c, out);
    const f = (l * 10) % 1;
    if (Number.isInteger(l) || Math.abs(f - 0.5) < 0.08) continue;
    return { up: round1(l), out, c, ask: 1, value: round1(l) };
  }
  return { up: 5, out: 7, c: 8.6, ask: 0, value: 8.6 };
}
function roundItem(level: number, rng: Rng, id: string, seed: number): Item {
  const s = roundSpec(rng);
  const ctx = rng.int(0, LADDER_CTX.length - 1);
  const c = CTX_SIDE[LADDER_CTX[ctx]!];
  return {
    ...base(seed, SKILL.pyth, "tower"),
    id,
    objective: "Use Pythagoras' theorem and round a length to 1 decimal place",
    answer: dec(s.value),
    params: { m: m("round"), up: s.ask === 1 ? 0 : s.up, out: s.out, c: s.ask === 0 ? 0 : s.c, ask: s.ask === 0 ? 0 : 1, ctx, rnd: 1, lv: level },
    prompt: s.ask === 0
      ? { line: "ln.prompt.round", text: `The ${c.thing} goes ${s.up} m ${c.up} and ${s.out} m ${c.out}. How long is it, to 1 decimal place?` }
      : { line: "ln.prompt.round", text: `A ${s.c} m ${c.thing} reaches ${s.out} m ${c.out}. How far ${c.up.split(",")[0]} does it go, to 1 decimal place?` },
    a11yDescription: `A right-angled triangle against the lighthouse. ${s.ask === 0 ? `The upright side is ${s.up} metres and the ground side ${s.out} metres; find the sloping side` : `The sloping side is ${s.c} metres and the ground side ${s.out} metres; find the upright side`}, rounded to 1 decimal place. Type it with the decimal point key, then press Done.`,
  };
}

function convItem(level: number, rng: Rng, id: string, seed: number): Item {
  const right = rng.chance(0.5);
  const t = right ? rng.pick(TRIPLES.filter((x) => x[2] <= 26)) : rng.pick(NEAR_MISSES);
  const [s1, s2, s3] = t;
  const options = [
    opt("y", `Right angle: ${s1}² + ${s2}² = ${s3}²`),
    opt("n", `Not a right angle: ${s1}² + ${s2}² ≠ ${s3}²`),
    opt("add", `Right angle: ${s1} + ${s2} is more than ${s3}`),
    opt("measure", "Can't tell without measuring the angle"),
  ];
  return {
    ...base(seed, SKILL.pyth, "tower"),
    id,
    objective: "Use the converse of Pythagoras' theorem to test for a right angle",
    answer: { kind: "choice", correct: right ? "y" : "n", options: rng.shuffle(options) },
    params: { m: m("conv"), s1, s2, s3, right: right ? 1 : 0, lv: level },
    prompt: { line: "ln.prompt.conv", text: `Hoot's new lamp-room bracket has sides ${s1} cm, ${s2} cm and ${s3} cm. Is its corner a right angle?` },
    a11yDescription: `A triangular bracket with sides ${s1}, ${s2} and ${s3} centimetres. Choose the statement that is true.`,
  };
}

// ------------------------------------------------------------------------------------------------ chart: scale and ratio
function places(rng: Rng): [number, number] {
  const [a, b] = rng.shuffle(PLACES.map((_, i) => i));
  return [a!, b!];
}
function realItem(level: number, rng: Rng, slot: { half: boolean; scales: readonly number[] }, id: string, seed: number): Item {
  const k = rng.pick(slot.scales);
  const cm = slot.half && rng.chance(0.6) ? rng.int(1, 8) + 0.5 : rng.int(2, 9);
  const [from, to] = places(rng);
  return {
    ...base(seed, SKILL.scale, "chart"),
    id,
    objective: "Use a map scale to turn a chart distance into a real distance",
    answer: dec(cm * k),
    params: { m: m("real"), cm, k, from, to, tilt: rng.int(-12, 12), y0: rng.int(0, 2), lv: level },
    prompt: { line: "ln.prompt.real", text: `On the chart, ${PLACES[from]} to ${PLACES[to]} is ${fmtNum(cm)} cm. The scale is 1 cm : ${k} km. How far is it really, in km?` },
    a11yDescription: `Hoot's fictional chart (not for navigation) with a scale bar: 1 centimetre stands for ${k} kilometres. The route from ${PLACES[from]} to ${PLACES[to]} measures ${fmtNum(cm)} centimetres on the chart. Type the real distance in kilometres, then press Done.`,
  };
}
function mapItem(level: number, rng: Rng, slot: { scales: readonly number[] }, id: string, seed: number): Item {
  const k = rng.pick(slot.scales);
  const cm = rng.chance(0.5) ? rng.int(1, 8) + 0.5 : rng.int(2, 9);
  const km = cm * k;
  const [from, to] = places(rng);
  return {
    ...base(seed, SKILL.scale, "chart"),
    id,
    objective: "Use a map scale to turn a real distance into a chart distance",
    answer: dec(cm),
    params: { m: m("map"), cm, km, k, from, to, tilt: rng.int(-12, 12), y0: rng.int(0, 2), lv: level },
    prompt: { line: "ln.prompt.map", text: `${PLACES[from]} to ${PLACES[to]} is ${km} km. The scale is 1 cm : ${k} km. How many cm apart are they on the chart?` },
    a11yDescription: `Hoot's fictional chart (not for navigation) with a scale bar: 1 centimetre stands for ${k} kilometres. ${PLACES[from]} and ${PLACES[to]} are ${km} kilometres apart. Type the distance on the chart in centimetres (use the decimal point if you need it), then press Done.`,
  };
}
const RATIOS = [[1, 2], [2, 3], [3, 4], [1, 3], [3, 5], [2, 5], [4, 5], [1, 4]] as const;
function shareItem(level: number, rng: Rng, id: string, seed: number): Item {
  const [a, b] = rng.pick(RATIOS);
  const unit = rng.int(2, 9);
  const total = (a + b) * unit;
  const who = rng.int(0, 1);
  const ctx = rng.int(0, SHARE_CTX.length - 1);
  const c = SHARE_CTX[ctx]!;
  const name = who === 0 ? c.a : c.b;
  return {
    ...base(seed, SKILL.scale, "crates"),
    id,
    objective: "Share an amount in a given ratio",
    answer: dec(shareOf(total, a, b, who)),
    params: { m: m("share"), a, b, total, who, ctx, lv: level },
    prompt: { line: "ln.prompt.share", text: `Share ${total} ${c.what} between ${c.a} and ${c.b} in the ratio ${a} : ${b}. How many for ${name}?` },
    a11yDescription: `${total} ${c.what} are shared between ${c.a} and ${c.b} in the ratio ${a} to ${b}. A bar shows ${a} equal parts for ${c.a} and ${b} for ${c.b}. Type how many ${name} gets, then press Done.`,
  };
}
function ratioItem(level: number, rng: Rng, id: string, seed: number): Item {
  const k = rng.pick(SCALES);
  const n = ratioN(k);
  const options = [opt("ok", `1 : ${fmtN(n)}`), opt("m", `1 : ${fmtN(k * 1000)}`), opt("z", `1 : ${fmtN(k * 10000)}`), opt("u", `1 : ${k}`)];
  return {
    ...base(seed, SKILL.scale, "chart"),
    id,
    objective: "Write a map scale as a ratio 1 : n in the same units",
    answer: { kind: "choice", correct: "ok", options: rng.shuffle(options) },
    params: { m: m("ratio"), k, cm: 3, from: 0, to: 3, tilt: 0, y0: 1, lv: level },
    prompt: { line: "ln.prompt.ratio", text: `Hoot's chart says 1 cm : ${k} km. Write the scale as a ratio, 1 : n.` },
    a11yDescription: `Hoot's fictional chart with the scale 1 centimetre to ${k} kilometres. Choose the same scale written as a ratio with the same units on both sides.`,
  };
}

// ------------------------------------------------------------------------------------------------ grid: coordinates and lines
function plotItem(level: number, rng: Rng, q4: boolean, id: string, seed: number): Item {
  let x: number, y: number;
  do {
    if (q4) {
      x = rng.int(-5, 5);
      y = rng.int(-5, 5);
    } else {
      x = rng.int(1, 7);
      y = rng.int(1, 7);
    }
  } while (x === y || x === 0 || y === 0 || x === -y || (q4 && x > 0 && y > 0));
  return {
    ...base(seed, SKILL.graphs, "grid"),
    id,
    objective: "Plot a point from its coordinates (x, y)",
    answer: num(encodePoint(x, y)),
    params: { m: m("plot"), x, y, q4: q4 ? 1 : 0, lv: level },
    prompt: { line: "ln.prompt.plot", text: `Drop the marker buoy at ${fmtPt(x, y)}.` },
    a11yDescription: `A harbour grid with an x-axis and a y-axis${q4 ? " running from minus 6 to 6" : " from 0 to 8"}. Move the buoy to x ${x}, y ${y} with the arrow keys, the move buttons, a tap on the grid or by dragging, then press Drop buoy.`,
  };
}

const POS_M = [1, 2, 3, 0.5] as const;
const ALL_M = [1, 2, 3, 0.5, -1, -2, -3, -0.5] as const;
/** A line y = mx + c that crosses the visible grid, and two lattice points on it a whole run apart. */
export function lineSpec(rng: Rng, neg: boolean): { m: number; c: number; x1: number; y1: number; x2: number; y2: number; q4: number } {
  const q4 = neg;
  const [lo, hi] = gridRange(q4);
  for (let guard = 0; guard < 400; guard++) {
    const mm = neg ? rng.pick(ALL_M) : rng.pick(POS_M);
    const c = neg ? rng.int(-4, 4) : rng.int(1, 4);
    if (c === mm || (neg && mm > 0 && guard % 2 === 0)) continue; // keep a negative gradient in most q4 items
    const xs: number[] = [];
    for (let x = lo; x <= hi; x++) {
      const y = mm * x + c;
      if (Number.isInteger(y) && y >= lo && y <= hi) xs.push(x);
    }
    if (xs.length < 3) continue;
    const run = Math.abs(mm) === 0.5 ? 2 * rng.int(1, 2) : rng.int(1, 2);
    const starts = xs.filter((x) => xs.includes(x + run) && x !== 0 && x + run !== 0);
    if (!starts.length) continue;
    const x1 = rng.pick(starts);
    return { m: mm, c, x1, y1: mm * x1 + c, x2: x1 + run, y2: mm * (x1 + run) + c, q4: q4 ? 1 : 0 };
  }
  return { m: 2, c: 1, x1: 1, y1: 3, x2: 2, y2: 5, q4: 0 };
}
function gradItem(level: number, rng: Rng, neg: boolean, id: string, seed: number): Item {
  const s = lineSpec(rng, neg);
  const shipIx = rng.int(0, SHIPS.length - 1);
  const ship = SHIPS[shipIx]!;
  return {
    ...base(seed, SKILL.graphs, "grid"),
    id,
    objective: "Find the gradient of a straight line from two points (rise ÷ run)",
    answer: dec(s.m),
    params: { m: m("grad"), mm: s.m, c: s.c, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, q4: s.q4, ship: shipIx, lv: level },
    prompt: { line: "ln.prompt.grad", text: `The ${ship} sails a straight path through A and B. What is its gradient?` },
    a11yDescription: `A harbour grid. The ${ship}'s straight path passes through A ${fmtPt(s.x1, s.y1)} and B ${fmtPt(s.x2, s.y2)}. Type the gradient (use the minus key or the decimal point if you need them), then press Done.`,
  };
}
function icptItem(level: number, rng: Rng, neg: boolean, id: string, seed: number): Item {
  let s = lineSpec(rng, neg);
  for (let g = 0; g < 20 && s.c === 0; g++) s = lineSpec(rng, neg);
  if (s.c === 0) s = { ...s, c: 2, y1: s.m * s.x1 + 2, y2: s.m * s.x2 + 2 };
  const ship = rng.int(0, SHIPS.length - 1);
  return {
    ...base(seed, SKILL.graphs, "grid"),
    id,
    objective: "Read the y-intercept of a straight line",
    answer: dec(s.c),
    params: { m: m("icpt"), mm: s.m, c: s.c, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, q4: s.q4, ship, lv: level },
    prompt: { line: "ln.prompt.icpt", text: `Where does the ${SHIPS[ship]}'s path cross the y-axis? Type the y-intercept.` },
    a11yDescription: `A harbour grid with the ${SHIPS[ship]}'s straight path drawn across it. It passes through ${fmtPt(s.x1, s.y1)} and ${fmtPt(s.x2, s.y2)}. Type the y value where it crosses the y-axis, then press Done.`,
  };
}
/** Course-line options: the right line and lines from typical mix-ups (swapped m and c, sign, rise/run flipped). */
export function lineOptions(mm: number, c: number): AnswerOption[] {
  const cand: [string, number, number][] = [["ok", mm, c]];
  if (c !== 0 && c !== mm && ALL_M.includes(c as (typeof ALL_M)[number])) cand.push(["swap", c, mm]);
  cand.push(["sign", -mm, c]);
  if (Math.abs(mm) !== 1) cand.push(["inv", 1 / mm, c]);
  cand.push(["signc", mm, -c]);
  const out: AnswerOption[] = [];
  const seen = new Set<string>();
  for (const [id, a, b] of cand) {
    const t = fmtLine(a, b);
    if (seen.has(t) || out.length >= 4) continue;
    seen.add(t);
    out.push(opt(id, t));
  }
  if (out.length < 4) {
    const t = fmtLine(mm, c + 1);
    if (!seen.has(t)) out.push(opt("near", t));
  }
  return out;
}
function eqnItem(level: number, rng: Rng, neg: boolean, id: string, seed: number): Item {
  let s = lineSpec(rng, neg);
  for (let g = 0; g < 20 && s.c === 0; g++) s = lineSpec(rng, neg);
  const ship = rng.int(0, SHIPS.length - 1);
  return {
    ...base(seed, SKILL.graphs, "grid"),
    id,
    objective: "Choose the equation y = mx + c of a straight line from its gradient and intercept",
    answer: { kind: "choice", correct: "ok", options: rng.shuffle(lineOptions(s.m, s.c)) },
    params: { m: m("eqn"), mm: s.m, c: s.c, x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, q4: s.q4, ship, lv: level },
    prompt: { line: "ln.prompt.eqn", text: `Which equation is the ${SHIPS[ship]}'s path?` },
    a11yDescription: `A harbour grid with the ${SHIPS[ship]}'s straight path through ${fmtPt(s.x1, s.y1)} and ${fmtPt(s.x2, s.y2)}. Choose its equation.`,
  };
}
export function meetSpec(rng: Rng): { m1: number; c1: number; m2: number; c2: number; x0: number; y0: number } {
  const MS = [-2, -1, 1, 2, 3] as const;
  for (let guard = 0; guard < 400; guard++) {
    const x0 = rng.int(-4, 4), y0 = rng.int(-4, 4);
    if (x0 === y0 || x0 === 0 || y0 === 0 || x0 === -y0) continue;
    const [m1, m2] = rng.shuffle([...MS]).slice(0, 2) as [number, number];
    const c1 = y0 - m1 * x0, c2 = y0 - m2 * x0;
    if (Math.abs(c1) > 6 || Math.abs(c2) > 6 || c1 === c2) continue;
    return { m1, c1, m2, c2, x0, y0 };
  }
  return { m1: 1, c1: 1, m2: -1, c2: 5, x0: 2, y0: 3 };
}
function meetItem(level: number, rng: Rng, id: string, seed: number): Item {
  const s = meetSpec(rng);
  const [a, b] = rng.shuffle([0, 1, 2, 3, 4]).slice(0, 2) as [number, number];
  const cand: [string, number, number][] = [["ok", s.x0, s.y0], ["swap", s.y0, s.x0], ["icpt", 0, s.c1], ["sign", -s.x0, s.y0], ["icpt2", 0, s.c2]];
  const seen = new Set<string>();
  const options: AnswerOption[] = [];
  for (const [oid, x, y] of cand) {
    const t = fmtPt(x, y);
    if (seen.has(t) || options.length >= 4) continue;
    seen.add(t);
    options.push(opt(oid, t));
  }
  return {
    ...base(seed, SKILL.graphs, "grid"),
    id,
    objective: "Find where two straight-line paths cross",
    answer: { kind: "choice", correct: "ok", options: rng.shuffle(options) },
    params: { m: m("meet"), m1: s.m1, c1: s.c1, m2: s.m2, c2: s.c2, x0: s.x0, y0: s.y0, q4: 1, s1: a, s2: b, lv: level },
    prompt: { line: "ln.prompt.meet", text: `The ${SHIPS[a]} follows ${fmtLine(s.m1, s.c1)}; the ${SHIPS[b]} follows ${fmtLine(s.m2, s.c2)}. Where do their paths cross?` },
    a11yDescription: `A harbour grid with two straight paths: the ${SHIPS[a]} on ${sayLine(s.m1, s.c1)} and the ${SHIPS[b]} on ${sayLine(s.m2, s.c2)}. Choose the point where they cross.`,
  };
}
export function paraSpec(rng: Rng) {
  const mm = rng.pick([1, 2, 3, -1, -2, 0.5, -0.5] as const);
  const c = rng.pick([-3, -2, -1, 1, 2, 3, 4] as const);
  let c2 = rng.pick([-4, -3, -2, -1, 1, 2, 3, 4, 5].filter((x) => x !== c));
  if (c2 === undefined) c2 = c + 2;
  return { mm, c, c2 };
}
function paraItem(level: number, rng: Rng, id: string, seed: number): Item {
  const s = paraSpec(rng);
  const names = rng.shuffle([1, 2, 3, 4]).slice(0, 3);
  const otherM = s.mm === 2 ? 3 : 2;
  const lines: [string, number, number][] = [["par", s.mm, s.c2], ["sign", -s.mm, s.c2], ["samec", otherM, s.c]];
  const options = lines.map(([oid, a, b], i) => opt(oid, `${SHIPS[names[i]!]}: ${fmtLine(a, b)}`));
  return {
    ...base(seed, SKILL.graphs, "grid"),
    id,
    objective: "Recognise parallel lines: the same gradient, so the paths never cross",
    answer: { kind: "choice", correct: "par", options: rng.shuffle(options) },
    params: { m: m("para"), mm: s.mm, c: s.c, c2: s.c2, om: otherM, q4: 1, n0: names[0]!, n1: names[1]!, n2: names[2]!, lv: level },
    prompt: { line: "ln.prompt.para", text: `The Gull sails ${fmtLine(s.mm, s.c)}. Which ship's path will never cross the Gull's?` },
    a11yDescription: `A harbour grid with the Gull's straight path, ${sayLine(s.mm, s.c)}. Choose the ship whose path never crosses it.`,
  };
}

// ------------------------------------------------------------------------------------------------ the finale: Last Ship Home
function homeItem(level: number, rng: Rng, fs: readonly Finale[], id: string, seed: number): Item {
  const f = rng.pick(fs);
  const common = { ...base(seed, FINALE_SKILL[f], "boat"), id, closer: true as const };
  const pf = FINALES.indexOf(f);
  switch (f) {
    case "fline": {
      const a = rng.int(2, 7) * 10;
      const x = (180 - a) / 2;
      return {
        ...common,
        objective: "Two-step angle problem: angles on a straight line with two equal angles",
        answer: num(x),
        params: { m: m("home"), f: pf, n: 3, p0: x, p1: x, p2: a, u: 0, eq: 1, lv: level },
        prompt: { line: "ln.prompt.fline", text: `Bobbo's boat is the last one out. Two beams split the wall's angle: ${a}° and two equal angles x. Find x to light his way.` },
        a11yDescription: `Last ship home: Bobbo's boat. Along the straight harbour wall are three angles: ${a} degrees and two equal angles marked x. Type x on the keypad, then press Done.`,
      };
    }
    case "ftri": {
      const A = step5(rng, 35, 75);
      const e = step5(rng, A + 30, Math.min(160, A + 90));
      const B = 180 - e;
      const C = 180 - A - B;
      return {
        ...common,
        objective: "Two-step angle problem: an exterior angle, then the triangle's angle sum",
        answer: num(C),
        params: { m: m("home"), f: pf, A, B, C, u: 2, iso: 0, ig: 0, ext: e, lv: level },
        prompt: { line: "ln.prompt.ftri", text: `Bobbo's boat is the last one out. The wall carries on past the buoy, making ${e}° outside the triangle. Find the angle x at Bobbo's boat.` },
        a11yDescription: `Last ship home: a triangle joins the lighthouse, a buoy and Bobbo's boat. The angle at the lighthouse is ${A} degrees. The line through the buoy carries on, and the angle outside the triangle there is ${e} degrees. Type the angle x at Bobbo's boat, then press Done.`,
      };
    }
    case "fback": {
      const s = bbackSpec(rng);
      return {
        ...common,
        objective: "Find a back bearing and turn the beam to it",
        answer: { kind: "numeric", value: backBearing(s.b), tolerance: 0, unit: "°", min: 0, max: 355, step: DIAL_STEP },
        params: { m: m("home"), f: pf, b: s.b, ship: -1, lv: level },
        prompt: { line: "ln.prompt.fback", text: `Bobbo radios: "I can see your lamp on a bearing of ${fmtBearing(s.b)}!" Turn the beam to Bobbo's boat.` },
        a11yDescription: `Last ship home: Bobbo's boat is hidden in the fog. From the boat, the lighthouse is on a bearing of ${fmtBearing(s.b)}. Turn the beam to the bearing of the boat from the lighthouse, then press Shine.`,
      };
    }
    case "fchart": {
      const t = rng.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13]] as const);
      const k = rng.pick([2, 3] as const);
      const flip = rng.chance(0.5);
      const east = flip ? t[1] : t[0], north = flip ? t[0] : t[1];
      return {
        ...common,
        objective: "Two-step problem: Pythagoras on a chart, then the scale",
        answer: dec(t[2] * k),
        params: { m: m("home"), f: pf, east, north, cmc: t[2], k, lv: level },
        prompt: { line: "ln.prompt.fchart", text: `On the chart, Bobbo's boat is ${east} cm east and ${north} cm north of the harbour. The scale is 1 cm : ${k} km. How many km is it straight home?` },
        a11yDescription: `Last ship home: Hoot's fictional chart (not for navigation), scale 1 centimetre to ${k} kilometres. Bobbo's boat is ${east} centimetres east and ${north} centimetres north of the harbour mouth. Type the straight-line distance home in kilometres, then press Done.`,
      };
    }
    case "fcourse": {
      for (let guard = 0; guard < 200; guard++) {
        const mm = rng.pick([1, 2, 3, -1, -2] as const);
        const c = rng.int(-3, 4);
        if (c === 0 || c === mm) continue;
        const x1 = rng.int(-3, 3);
        const x2 = x1 + rng.pick([1, 2] as const);
        const y1 = mm * x1 + c, y2 = mm * x2 + c;
        if (x1 === 0 || x2 === 0 || Math.abs(y1) > 6 || Math.abs(y2) > 6) continue;
        return {
          ...common,
          objective: "Find the line y = mx + c through two points",
          answer: { kind: "choice", correct: "ok", options: rng.shuffle(lineOptions(mm, c)) },
          params: { m: m("home"), f: pf, mm, c, x1, y1, x2, y2, q4: 1, lv: level },
          prompt: { line: "ln.prompt.fcourse", text: `Bobbo's boat is at ${fmtPt(x1, y1)}. The harbour mouth is at ${fmtPt(x2, y2)}. Which straight course joins them?` },
          a11yDescription: `Last ship home: a harbour grid. Bobbo's boat is at ${fmtPt(x1, y1)} and the harbour mouth at ${fmtPt(x2, y2)}. Choose the equation of the straight line through both.`,
        };
      }
      return homeItem(level, rng, ["fback"], id, seed);
    }
  }
}

// ------------------------------------------------------------------------------------------------ the generator
export function itemFor(level: number, rng: Rng, slot: Slot, index: number, id: string, seed: number): Item {
  switch (slot.mode) {
    case "line": return lineItem(level, rng, slot, id, seed);
    case "point": return pointItem(level, rng, slot.n, id, seed);
    case "kind": return kindItem(level, rng, index, id, seed);
    case "vert": return vertItem(level, rng, id, seed);
    case "tri": return triItem(level, rng, slot.iso, id, seed);
    case "par": return parItem(level, rng, slot.rels, id, seed);
    case "reason": return reasonItem(level, rng, id, seed);
    case "bread": return breadItem(level, rng, id, seed);
    case "bback": return bbackItem(level, rng, id, seed);
    case "hyp": return hypItem(level, rng, id, seed);
    case "leg": return legItem(level, rng, id, seed);
    case "round": return roundItem(level, rng, id, seed);
    case "conv": return convItem(level, rng, id, seed);
    case "real": return realItem(level, rng, slot, id, seed);
    case "map": return mapItem(level, rng, slot, id, seed);
    case "share": return shareItem(level, rng, id, seed);
    case "ratio": return ratioItem(level, rng, id, seed);
    case "plot": return plotItem(level, rng, slot.q4, id, seed);
    case "grad": return gradItem(level, rng, slot.neg, id, seed);
    case "icpt": return icptItem(level, rng, slot.neg, id, seed);
    case "eqn": return eqnItem(level, rng, slot.neg, id, seed);
    case "meet": return meetItem(level, rng, id, seed);
    case "para": return paraItem(level, rng, id, seed);
    case "home": return homeItem(level, rng, slot.f, id, seed);
  }
}

export const generateLighthouseNight: ExerciseGenerator = (level, rng, index) => {
  const lv = Math.max(0, Math.min(LN_MAX_LEVEL, level));
  const slot = LEVELS[lv]!.slots[index % BAND]!;
  const seed = rng.int(1, 999_999);
  return itemFor(lv, rng, slot, index, `ln-${slot.mode}-l${lv}n${index}`, seed);
};
