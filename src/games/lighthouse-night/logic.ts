/**
 * Lighthouse Night — pure content logic (no React, no DOM). Unit-tested in tests/unit/lighthouse-night.test.ts.
 *
 * Hoot keeps the lighthouse on a stormy night and guides ships home with maths. Four inner games and a finale:
 *   beam    Beam Angles: angles on a line / around a point, angle types, vertically opposite, triangles,
 *           parallel lines (corresponding, alternate, co-interior), three-figure bearings and back bearings.
 *   ladder  Ladder & Tower: Pythagoras (hypotenuse, a shorter side, rounding to 1 d.p., the converse).
 *   chart   Chart Scale: a FICTIONAL sea chart (not for navigation), map ↔ real distance, scale as 1 : n, sharing in a ratio.
 *   grid    Ship Paths: coordinates, gradient, y-intercept, y = mx + c, where two paths cross, parallel paths.
 *   home    Last Ship Home: the round's finale (engine R5a closer), a two-step problem built from the games unlocked so far.
 *
 * Every mistake function below returns the typical wrong answers for an item, each tagged with the misconception it
 * shows; hints.ts turns the tag into Ripple's first-miss line. Keypads let every one of these values be typed.
 */

// ------------------------------------------------------------------------------------------------ games and modes
export type Game = "beam" | "ladder" | "chart" | "grid" | "home";
export const GAMES: readonly Game[] = ["beam", "ladder", "chart", "grid", "home"];
export type Mode =
  | "line" | "point" | "kind" | "vert" | "tri" | "par" | "reason" | "bread" | "bback" // beam
  | "hyp" | "leg" | "round" | "conv" // ladder
  | "real" | "map" | "share" | "ratio" // chart
  | "plot" | "grad" | "icpt" | "eqn" | "meet" | "para" // grid
  | "home";
export const MODES: readonly Mode[] = [
  "line", "point", "kind", "vert", "tri", "par", "reason", "bread", "bback",
  "hyp", "leg", "round", "conv",
  "real", "map", "share", "ratio",
  "plot", "grad", "icpt", "eqn", "meet", "para",
  "home",
];
export const GAME_OF: Record<Mode, Game> = {
  line: "beam", point: "beam", kind: "beam", vert: "beam", tri: "beam", par: "beam", reason: "beam", bread: "beam", bback: "beam",
  hyp: "ladder", leg: "ladder", round: "ladder", conv: "ladder",
  real: "chart", map: "chart", share: "chart", ratio: "chart",
  plot: "grid", grad: "grid", icpt: "grid", eqn: "grid", meet: "grid", para: "grid",
  home: "home",
};
export const GAME_TITLE: Record<Game, string> = { beam: "Beam Angles", ladder: "Ladder & Tower", chart: "Chart Scale", grid: "Ship Paths", home: "Last Ship Home" };

/** Finale kinds (params.f): which inner game's picture and maths the last ship needs. */
export type Finale = "fline" | "ftri" | "fback" | "fchart" | "fcourse";
export const FINALES: readonly Finale[] = ["fline", "ftri", "fback", "fchart", "fcourse"];

type Params = { params?: Readonly<Record<string, number>> };
export const modeOf = (ex: Params): Mode => MODES[ex.params?.m ?? 0] ?? "line";
export const gameOf = (ex: Params): Game => GAME_OF[modeOf(ex)];
export const finaleOf = (ex: Params): Finale => FINALES[ex.params?.f ?? 0] ?? "fline";
export const p = (ex: Params, k: string, d = 0): number => ex.params?.[k] ?? d;
/** The diagram an item draws: finales borrow an inner game's board. */
export function boardOf(ex: Params): Mode {
  const mode = modeOf(ex);
  if (mode !== "home") return mode;
  return ({ fline: "line", ftri: "tri", fback: "bback", fchart: "real", fcourse: "eqn" } as const)[finaleOf(ex)];
}

export type Mistake<W extends string> = { value: number; why: W };
/** Keep the first mistake for each value, drop any that equal the right answer. */
function uniq<W extends string>(right: number, xs: Mistake<W>[]): Mistake<W>[] {
  const seen = new Set<number>([round2(right)]);
  const out: Mistake<W>[] = [];
  for (const x of xs) {
    const v = round2(x.value);
    if (!Number.isFinite(v) || seen.has(v)) continue;
    seen.add(v);
    out.push({ value: v, why: x.why });
  }
  return out;
}
/** Angle and length mistakes are only typical (and typable on the keypad) when positive. */
const positive = <W extends string>(xs: Mistake<W>[]) => xs.filter((x) => x.value > 0);
/** "a 12 m ladder" / "an 8 m ladder" / "an 11 m ladder". */
export const article = (n: number) => (/^8/.test(String(n)) || /^(11|18)(\D|$)/.test(String(n)) ? "an" : "a");
export const round1 = (x: number) => Math.round(x * 10) / 10;
export const round2 = (x: number) => Math.round(x * 100) / 100;
export const mod360 = (x: number) => ((x % 360) + 360) % 360;

// ------------------------------------------------------------------------------------------------ beam: angle facts
/** Angles on a straight line: `parts` lie side by side along the harbour wall; index `u` is unknown. */
export const lineAnswer = (parts: readonly number[], u: number) => 180 - parts.reduce((s, x, i) => (i === u ? s : s + x), 0);
export type LineWhy = "line360" | "same" | "complement" | "addOnly";
export function lineMistakes(parts: readonly number[], u: number): Mistake<LineWhy>[] {
  const known = parts.filter((_, i) => i !== u);
  const sum = known.reduce((s, x) => s + x, 0);
  const right = lineAnswer(parts, u);
  return positive(uniq(right, [
    { value: 360 - sum, why: "line360" },
    ...(known.length === 1 ? [{ value: known[0]!, why: "same" as const }] : []),
    ...(known.length === 1 && known[0]! < 90 ? [{ value: 90 - known[0]!, why: "complement" as const }] : []),
    ...(known.length > 1 ? [{ value: sum, why: "addOnly" as const }] : []),
  ]));
}

/** Angles around a point add up to 360°. */
export const pointAnswer = (parts: readonly number[], u: number) => 360 - parts.reduce((s, x, i) => (i === u ? s : s + x), 0);
export type PointWhy = "point180" | "addOnly";
export function pointMistakes(parts: readonly number[], u: number): Mistake<PointWhy>[] {
  const sum = parts.reduce((s, x, i) => (i === u ? s : s + x), 0);
  return positive(uniq(pointAnswer(parts, u), [
    { value: 180 - sum, why: "point180" },
    { value: sum, why: "addOnly" },
  ]));
}

/** Angle types (the beam's sweep). */
export type AngleKind = "acute" | "right" | "obtuse" | "reflex";
export const ANGLE_KINDS: readonly AngleKind[] = ["acute", "right", "obtuse", "reflex"];
export function kindOf(a: number): AngleKind {
  if (a < 90) return "acute";
  if (a === 90) return "right";
  if (a < 180) return "obtuse";
  return "reflex";
}
export const KIND_TEXT: Record<AngleKind, string> = {
  acute: "Acute: less than 90°",
  right: "Right angle: exactly 90°",
  obtuse: "Obtuse: between 90° and 180°",
  reflex: "Reflex: between 180° and 360°",
};

/** Two straight beams cross at the lamp: opposite angles are equal; neighbours add to 180°. */
export const vertAnswer = (a: number, askOpp: boolean) => (askOpp ? a : 180 - a);
export type VertWhy = "opp180" | "adjEqual" | "vert360" | "oppEqual";
export function vertMistakes(a: number, askOpp: boolean): Mistake<VertWhy>[] {
  return positive(uniq(vertAnswer(a, askOpp), askOpp
    ? [{ value: 180 - a, why: "opp180" }, { value: 360 - a, why: "oppEqual" }]
    : [{ value: a, why: "adjEqual" }, { value: 360 - a, why: "vert360" }]));
}

/** Triangle angles add up to 180°; isosceles: the two base angles are equal. */
export type TriWhy = "tri360" | "isoHalf" | "isoDouble" | "addOnly";
export function triMistakes(angles: readonly [number, number, number], u: number, iso: boolean, isoGiven: "apex" | "base"): Mistake<TriWhy>[] {
  const right = angles[u]!;
  if (iso) {
    if (isoGiven === "apex") {
      const apex = 180 - 2 * right;
      return positive(uniq(right, [{ value: 180 - apex, why: "isoHalf" }, { value: 360 - apex, why: "tri360" }]));
    }
    const base = (180 - right) / 2;
    return positive(uniq(right, [{ value: 180 - base, why: "isoDouble" }, { value: 360 - 2 * base, why: "tri360" }]));
  }
  const sum = angles.reduce((s, x, i) => (i === u ? s : s + x), 0);
  return positive(uniq(right, [{ value: 360 - sum, why: "tri360" }, { value: sum, why: "addOnly" }]));
}

/**
 * Parallel shipping lanes crossed by the beam (a transversal). At each crossing the four angles are, by position:
 * TR (between the lane going right and the beam going up), TL, BL, BR. φ = the beam's direction from the lane (°).
 */
export type Pos = "TR" | "TL" | "BL" | "BR";
export const POSITIONS: readonly Pos[] = ["TR", "TL", "BL", "BR"];
export const valueAt = (pos: Pos, phi: number) => (pos === "TR" || pos === "BL" ? phi : 180 - phi);
export type Rel = "corr" | "alt" | "coint";
export const RELS: readonly Rel[] = ["corr", "alt", "coint"];
/** The position at the lower crossing paired with `pos` at the upper crossing by a relation (null if none). */
export function pairedPos(rel: Rel, pos: Pos): Pos | null {
  if (rel === "corr") return pos;
  if (rel === "alt") return pos === "BL" ? "TR" : pos === "BR" ? "TL" : null;
  return pos === "BL" ? "TL" : pos === "BR" ? "TR" : null;
}
export const relAnswer = (rel: Rel, given: number) => (rel === "coint" ? 180 - given : given);
export type ParWhy = "par180" | "cointEqual" | "par360";
export function parMistakes(rel: Rel, given: number): Mistake<ParWhy>[] {
  return positive(uniq(relAnswer(rel, given), rel === "coint"
    ? [{ value: given, why: "cointEqual" }, { value: 360 - given, why: "par360" }]
    : [{ value: 180 - given, why: "par180" }, { value: 360 - given, why: "par360" }]));
}
/** UK names with the US names in brackets (CCSS: same-side interior, vertical angles). */
export const REL_TEXT: Record<Rel | "vert", string> = {
  corr: "Corresponding angles are equal",
  alt: "Alternate angles are equal",
  coint: "Co-interior (same-side interior) angles add up to 180°",
  vert: "Vertically opposite (vertical) angles are equal",
};
/** Where an angle sits at a crossing, in words (screen readers; never names the angle fact). */
export const POS_TEXT: Record<Pos, string> = {
  TR: "above the lane, right of the beam",
  TL: "above the lane, left of the beam",
  BL: "below the lane, left of the beam",
  BR: "below the lane, right of the beam",
};

// ------------------------------------------------------------------------------------------------ beam: bearings
/** Compass points as bearings. */
export const REF_BEARING = [0, 90, 180, 270] as const;
export const REF_NAME = ["north", "east", "south", "west"] as const;
export const REF_LETTER = ["N", "E", "S", "W"] as const;
/** Bearing of a ship `d`° from compass point `ref`, turning clockwise (side 1) or anticlockwise (side −1). */
export const bearingFrom = (ref: number, side: 1 | -1, d: number) => mod360(REF_BEARING[ref]! + side * d);
export const fmtBearing = (b: number) => `${String(mod360(b)).padStart(3, "0")}°`;
export type BreadWhy = "marked" | "wrongSide" | "anticlockwise";
export function breadMistakes(ref: number, side: 1 | -1, d: number): Mistake<BreadWhy>[] {
  const right = bearingFrom(ref, side, d);
  return uniq(right, [
    { value: d, why: "marked" },
    { value: bearingFrom(ref, side === 1 ? -1 : 1, d), why: "wrongSide" },
    { value: mod360(360 - right), why: "anticlockwise" },
  ]);
}
/** Back bearing: the way back is the opposite direction, 180° round. */
export const backBearing = (b: number) => mod360(b + 180);
export type BackWhy = "same" | "mirror" | "subtract";
export function backMistakes(b: number): Mistake<BackWhy>[] {
  return uniq(backBearing(b), [
    { value: b, why: "same" },
    { value: mod360(360 - b), why: "mirror" },
    { value: mod360(180 - b), why: "subtract" },
  ]);
}
/** The beam dial turns in 5° steps. */
export const DIAL_STEP = 5;

// ------------------------------------------------------------------------------------------------ ladder: Pythagoras
/** Pythagorean triples (metres) for whole-number items: legs a < b, hypotenuse c. */
export const TRIPLES: readonly (readonly [number, number, number])[] = [
  [3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20], [7, 24, 25], [15, 20, 25], [10, 24, 26], [20, 21, 29],
];
export const hypOf = (a: number, b: number) => Math.sqrt(a * a + b * b);
export const legOf = (c: number, a: number) => Math.sqrt(c * c - a * a);
export type PythWhy = "added" | "noRoot" | "subtracted" | "usedHyp" | "truncate" | "wholeRound";
/** Typical wrong answers for the hypotenuse of legs a, b (exact or rounded to 1 d.p.). */
export function hypMistakes(a: number, b: number, rounded: boolean): Mistake<PythWhy>[] {
  const c = hypOf(a, b);
  const right = rounded ? round1(c) : c;
  return positive(uniq(right, [
    { value: a + b, why: "added" },
    { value: a * a + b * b, why: "noRoot" },
    { value: Math.abs(b - a), why: "subtracted" },
    ...(rounded ? [{ value: Math.floor(c * 10) / 10, why: "truncate" as const }, { value: Math.round(c), why: "wholeRound" as const }] : []),
  ]));
}
/** Typical wrong answers for a shorter side, given hypotenuse c and the other side a. */
export function legMistakes(c: number, a: number, rounded: boolean): Mistake<PythWhy>[] {
  const b = legOf(c, a);
  const right = rounded ? round1(b) : b;
  const h = hypOf(c, a);
  return positive(uniq(right, [
    { value: round1(h), why: "usedHyp" },
    { value: Math.round(h), why: "usedHyp" },
    { value: c - a, why: "subtracted" },
    { value: c + a, why: "added" },
    { value: c * c - a * a, why: "noRoot" },
    ...(rounded ? [{ value: Math.floor(b * 10) / 10, why: "truncate" as const }, { value: Math.round(b), why: "wholeRound" as const }] : []),
  ]));
}
/** Converse: is a triangle with sides s1 ≤ s2 < s3 right-angled? (s1² + s2² = s3²) */
export const isRight = (s1: number, s2: number, s3: number) => s1 * s1 + s2 * s2 === s3 * s3;
/** Near-miss triangles (not right-angled) for converse items. */
export const NEAR_MISSES: readonly (readonly [number, number, number])[] = [[6, 8, 11], [5, 12, 14], [8, 15, 16], [7, 24, 26], [9, 12, 16], [4, 5, 6], [10, 24, 25]];
export const LADDER_CTX = ["ladder", "rope", "stay", "line"] as const;
export type LadderCtx = (typeof LADDER_CTX)[number];

// ------------------------------------------------------------------------------------------------ chart: scale and ratio
/** Places on Hoot's FICTIONAL chart (made up; the chart is not to scale and not for navigation). */
export const PLACES = ["Hoot's Lighthouse", "Gull Rock", "Kelp Point", "Seal Island", "Lantern Quay", "Old Pier", "Bell Buoy"] as const;
/** Real km per chart cm (1 cm : k km). */
export const SCALES = [2, 3, 5] as const;
export const realOf = (cm: number, k: number) => cm * k;
export const mapOf = (km: number, k: number) => km / k;
export type ScaleWhy = "divided" | "multiplied" | "addsub" | "noScale";
export function realMistakes(cm: number, k: number): Mistake<ScaleWhy>[] {
  return positive(uniq(realOf(cm, k), [{ value: cm / k, why: "divided" }, { value: cm + k, why: "addsub" }, { value: cm, why: "noScale" }]));
}
export function mapMistakes(km: number, k: number): Mistake<ScaleWhy>[] {
  return positive(uniq(mapOf(km, k), [{ value: km * k, why: "multiplied" }, { value: km, why: "noScale" }, { value: km - k, why: "addsub" }]));
}
/** 1 cm : k km written as 1 : n (same units): n = k × 100 000 (1 km = 1000 m = 100 000 cm). */
export const ratioN = (k: number) => k * 100_000;
export const fmtN = (n: number) => n.toLocaleString("en-US").replace(/,/g, " ");
/** Sharing `total` in the ratio a : b; `who` 0 = the first share, 1 = the second. */
export const shareOf = (total: number, a: number, b: number, who: number) => (total / (a + b)) * (who === 0 ? a : b);
export type ShareWhy = "onePart" | "otherShare" | "equalSplit" | "divByPart";
export function shareMistakes(total: number, a: number, b: number, who: number): Mistake<ShareWhy>[] {
  const part = who === 0 ? a : b;
  return positive(uniq(shareOf(total, a, b, who), [
    { value: total / (a + b), why: "onePart" },
    { value: shareOf(total, a, b, 1 - who), why: "otherShare" },
    { value: total / 2, why: "equalSplit" },
    { value: total / part, why: "divByPart" },
  ]));
}
export const SHARE_CTX = [
  { what: "cans of lamp oil", a: "the North Light", b: "the South Light" },
  { what: "metres of rope", a: "the jetty", b: "the lifeboat" },
  { what: "spare lamp bulbs", a: "Hoot", b: "the harbour office" },
  { what: "blankets", a: "the lifeboat", b: "the harbour hut" },
] as const;

// ------------------------------------------------------------------------------------------------ grid: coordinates and lines
/** Grid ranges: first quadrant 0..8, or four quadrants −6..6. */
export const gridRange = (q4: boolean): readonly [number, number] => (q4 ? [-6, 6] : [0, 8]);
/** A plotted point travels to the board as one number (the engine's `number` answer). */
export const encodePoint = (x: number, y: number) => (x + 50) * 100 + (y + 50);
export const decodePoint = (v: number): [number, number] => [Math.floor(v / 100) - 50, (v % 100) - 50];
export type PlotWhy = "swap" | "signX" | "signY";
export function plotMistakes(x: number, y: number): Mistake<PlotWhy>[] {
  return uniq(encodePoint(x, y), [
    { value: encodePoint(y, x), why: "swap" },
    { value: encodePoint(-x, y), why: "signX" },
    { value: encodePoint(x, -y), why: "signY" },
  ]);
}
export const lineY = (m: number, c: number, x: number) => m * x + c;
export type GradWhy = "runRise" | "sign" | "riseOnly" | "intercept";
export function gradMistakes(m: number, c: number, run: number): Mistake<GradWhy>[] {
  return uniq(m, [
    ...(m !== 0 ? [{ value: round2(1 / m), why: "runRise" as const }] : []),
    { value: -m, why: "sign" },
    { value: m * run, why: "riseOnly" },
    { value: c, why: "intercept" },
  ]);
}
export type IcptWhy = "xIcpt" | "gradient" | "signC";
export function icptMistakes(m: number, c: number): Mistake<IcptWhy>[] {
  return uniq(c, [
    ...(m !== 0 ? [{ value: round2(-c / m), why: "xIcpt" as const }] : []),
    { value: m, why: "gradient" },
    { value: -c, why: "signC" },
  ]);
}
const fracText = (m: number) => {
  const s = m < 0 ? "−" : "";
  const a = Math.abs(m);
  if (a === 0.5) return `${s}½`;
  if (a === 1.5) return `${s}1½`;
  if (a === 1) return s;
  return `${s}${a}`;
};
/** "y = 2x + 1", "y = −x + 4", "y = ½x − 2", "y = 3x", "y = 4". */
export function fmtLine(m: number, c: number): string {
  const mx = m === 0 ? "" : `${fracText(m)}x`;
  if (!mx) return `y = ${c < 0 ? "−" : ""}${Math.abs(c)}`;
  if (c === 0) return `y = ${mx}`;
  return `y = ${mx} ${c < 0 ? "−" : "+"} ${Math.abs(c)}`;
}
/** Plain text for screen readers: "y equals 2 x plus 1". */
export function sayLine(m: number, c: number): string {
  const mm = m === 0 ? "" : `${m < 0 ? "minus " : ""}${Math.abs(m) === 1 ? "" : Math.abs(m) === 0.5 ? "a half " : `${Math.abs(m)} `}x`;
  const cc = c === 0 ? "" : `${mm ? (c < 0 ? " minus " : " plus ") : c < 0 ? "minus " : ""}${Math.abs(c)}`;
  return `y equals ${mm}${cc}` || "y equals 0";
}
/** Where y = m1 x + c1 meets y = m2 x + c2 (m1 ≠ m2). */
export function meetOf(m1: number, c1: number, m2: number, c2: number): [number, number] {
  const x = (c2 - c1) / (m1 - m2);
  return [x, m1 * x + c1];
}
export const SHIPS = ["Gull", "Puffin", "Tern", "Gannet", "Kittiwake"] as const;
export const fmtPt = (x: number, y: number) => `(${x < 0 ? "−" : ""}${Math.abs(x)}, ${y < 0 ? "−" : ""}${Math.abs(y)})`;
/** Numbers as the board writes them: a real minus sign, at most 2 decimals. */
export const fmtNum = (x: number) => `${x < 0 ? "−" : ""}${String(round2(Math.abs(x)))}`;
