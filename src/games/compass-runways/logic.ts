import type { Exercise } from "../../engine/types";

/**
 * Compass Rose Runways — pure heading / runway / wind logic (no React, no DOM). Unit-tested in
 * tests/unit/compass-runways.test.ts. Conventions (docs/worlds/compass-runways.md §Conventions):
 *
 *  - Headings are whole degrees 1–360, clockwise from north. North is 360, never 000 (pilots say "three six zero").
 *  - A runway end's number is its heading ÷ 10, rounded to the nearest whole number, written with two digits:
 *    01–36. Heading 360 (and 355–004) → 36; there is no runway 00. Headings ending in exactly 5 (e.g. 235) round
 *    half up (→ 24) but the generator never asks about them: real airports avoid them and the rule is ambiguous.
 *  - The two ends of one runway differ by 18 (180°): 09/27, 18/36, 14/32.
 *  - Wind is named by where it comes FROM. A windsock streams away from the wind, so it points where the wind GOES.
 *  - Real runway numbers use MAGNETIC headings; this world says "heading" and leaves magnetic variation out.
 */

// ---------------------------------------------------------------- heading arithmetic

/** Wrap any whole-degree value to a heading 1–360 (0 → 360). */
export function norm(deg: number): number {
  const d = ((Math.round(deg) % 360) + 360) % 360;
  return d === 0 ? 360 : d;
}

export type Dir = 1 | -1; // 1 = right (clockwise), -1 = left
/** New heading after turning `deg` degrees right (dir 1) or left (dir -1). */
export function turnHeading(from: number, dir: Dir, deg: number): number {
  return norm(from + dir * deg);
}
/** Does this turn pass through north (360/0)? */
export function wraps(from: number, dir: Dir, deg: number): boolean {
  const raw = from + dir * deg;
  return dir === 1 ? raw > 360 : raw <= 0;
}

/** Smallest angle between two headings, 0–180. */
export function angleDiff(a: number, b: number): number {
  const d = Math.abs(norm(a) - norm(b)) % 360;
  return d > 180 ? 360 - d : d;
}

// ---------------------------------------------------------------- runway numbers

/** Runway number (1–36) for a landing heading: ÷ 10, rounded half up; 0 → 36. */
export function runwayNumber(heading: number): number {
  const n = Math.floor(norm(heading) / 10 + 0.5);
  return n === 0 ? 36 : n;
}
/** The number painted on the other end (differs by 18). */
export function reciprocal(n: number): number {
  return n > 18 ? n - 18 : n + 18;
}
/** Landing heading of a runway end (runway 27 → 270, runway 36 → 360). */
export const runwayHeading = (n: number): number => norm(n * 10);
/** "09", "27", "36". */
export const fmtRunway = (n: number): string => String(n).padStart(2, "0");
/** "090", "360", "005". */
export const fmtHeading = (h: number): string => String(norm(h)).padStart(3, "0");

const DIGIT = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"] as const;
/** Spoken, digit by digit, the way a tower says it: 27 → "two seven", 9 → "zero nine". */
export const sayRunway = (n: number): string => fmtRunway(n).split("").map((c) => DIGIT[Number(c)]).join(" ");
/** 240 → "two four zero", 360 → "three six zero". */
export const sayHeading = (h: number): string => fmtHeading(h).split("").map((c) => DIGIT[Number(c)]).join(" ");

/** Every runway number 1–36 and every ten-degree heading 10–360 (voice `vary` lists are built from these). */
export const ALL_RUNWAYS = Array.from({ length: 36 }, (_, i) => i + 1);
export const TEN_HEADINGS = ALL_RUNWAYS.map((n) => n * 10);

// ---------------------------------------------------------------- compass points and wind

export const POINTS = ["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const;
export type Point = (typeof POINTS)[number];
export const POINT_HEADING: Record<Point, number> = { n: 360, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 };
export const POINT_NAME: Record<Point, string> = { n: "north", ne: "northeast", e: "east", se: "southeast", s: "south", sw: "southwest", w: "west", nw: "northwest" };
export const pointOf = (h: number): Point | undefined => POINTS.find((p) => POINT_HEADING[p] === norm(h));

/** Windsock strength: 0 limp (calm), 1 half-filled (light), 2 straight out (strong, about 15 knots or more). */
export type Strength = 0 | 1 | 2;
export const STRENGTH_ID = ["calm", "light", "strong"] as const;
export const STRENGTH_TEXT: Record<(typeof STRENGTH_ID)[number], string> = { calm: "Calm", light: "Light breeze", strong: "Strong wind" };

/** Which way the sock streams: where the wind goes (from + 180). */
export const sockPoints = (windFrom: number): number => norm(windFrom + 180);

export type WindKind = "head" | "cross" | "tail";
export const WIND_TEXT: Record<WindKind, string> = { head: "Headwind", cross: "Crosswind", tail: "Tailwind" };
/** Qualitative wind on a landing heading. Ambiguous angles (31–59°, 121–149°) are never asked; they return null. */
export function windKind(landing: number, windFrom: number): WindKind | null {
  const d = angleDiff(landing, windFrom);
  if (d <= 30) return "head";
  if (d >= 60 && d <= 120) return "cross";
  if (d >= 150) return "tail";
  return null;
}

/** The runway end (number) whose landing heading is closest to the wind's direction (land INTO the wind). */
export function bestEnd(ends: readonly number[], windFrom: number): number {
  return [...ends].sort((a, b) => angleDiff(runwayHeading(a), windFrom) - angleDiff(runwayHeading(b), windFrom))[0]!;
}
/** Angle margin between the best end and the next best (the generator keeps this ≥ 30° so one answer is clear). */
export function bestMargin(ends: readonly number[], windFrom: number): number {
  const d = ends.map((e) => angleDiff(runwayHeading(e), windFrom)).sort((a, b) => a - b);
  return (d[1] ?? 180) - d[0]!;
}
/** Both ends of each runway, given one end's number per runway. */
export const endsOf = (runways: readonly number[]): number[] => runways.flatMap((n) => [n, reciprocal(n)]);

// ---------------------------------------------------------------- scenarios (encoded in exercise params: numbers only)

export const MODES = ["sock", "paint", "turn", "wind", "tower"] as const;
export type Mode = (typeof MODES)[number];
export const KINDS = [
  "strength", "from4", "from8", "fromDeg", //           Windsock Reader
  "card", "ten", "round", "opp", "rotate", //           Runway Painter
  "quarter", "turn", "wrap", //                          Heading Turns
  "two", "four", "xwind", //                             Into the Wind
  "twind", "tline", "tjoin", "tcomp", //                 Tower Talk
] as const;
export type Kind = (typeof KINDS)[number];
export const MODE_OF: Record<Kind, Mode> = {
  strength: "sock", from4: "sock", from8: "sock", fromDeg: "sock",
  card: "paint", ten: "paint", round: "paint", opp: "paint", rotate: "paint",
  quarter: "turn", turn: "turn", wrap: "turn",
  two: "wind", four: "wind", xwind: "wind",
  twind: "tower", tline: "tower", tjoin: "tower", tcomp: "tower",
};
export const GAME_NAME: Record<Mode, string> = { sock: "Windsock Reader", paint: "Runway Painter", turn: "Heading Turns", wind: "Into the Wind", tower: "Tower Talk" };

/**
 * One item, as numbers:
 *  h   heading: the end to paint / the painted end (opp) / the dial's start (rotate) / the plane (turn, tjoin) / the landing runway (xwind, tcomp)
 *  n   runway number: the target (rotate) / the cleared runway (tline)
 *  d   turn size in degrees · dir 1 right, -1 left
 *  w   wind from (degrees) · s windsock strength 0–2
 *  a,b runway numbers (one end of each runway) for the airport layout (wind, tower); b = 0 → one runway
 *  lv  level · tut 1 = tutorial (pointing hand)
 */
export interface Scenario {
  kind: Kind;
  lv: number;
  h: number;
  n: number;
  d: number;
  dir: Dir;
  w: number;
  s: Strength;
  a: number;
  b: number;
  tut?: boolean;
}
export const blank = (kind: Kind, lv: number): Scenario => ({ kind, lv, h: 360, n: 36, d: 0, dir: 1, w: 360, s: 2, a: 9, b: 0 });

export function encode(s: Scenario): Record<string, number> {
  return { k: KINDS.indexOf(s.kind), lv: s.lv, h: s.h, n: s.n, d: s.d, dir: s.dir, w: s.w, s: s.s, a: s.a, b: s.b, ...(s.tut ? { tut: 1 } : {}) };
}
export function decode(ex: Pick<Exercise, "params">): Scenario {
  const p = ex.params ?? {};
  const num = (k: string, dflt: number) => (typeof p[k] === "number" ? p[k]! : dflt);
  return {
    kind: KINDS[num("k", 0)] ?? "strength",
    lv: num("lv", 0),
    h: num("h", 360),
    n: num("n", 36),
    d: num("d", 0),
    dir: num("dir", 1) < 0 ? -1 : 1,
    w: num("w", 360),
    s: Math.max(0, Math.min(2, num("s", 2))) as Strength,
    a: num("a", 9),
    b: num("b", 0),
    ...(p.tut === 1 ? { tut: true } : {}),
  };
}
export const modeOf = (s: Scenario): Mode => MODE_OF[s.kind];
/** Runway ends at the airport for wind/tower items. */
export const airportEnds = (s: Scenario): number[] => endsOf(s.b ? [s.a, s.b] : [s.a]);

/** Option ids. */
export const rwId = (n: number) => `rw${fmtRunway(n)}`;
export const hdgId = (h: number) => `h${fmtHeading(h)}`;
export const degId = (h: number) => `d${fmtHeading(h)}`;

/** The correct answer for a scenario: an option id (choice kinds) or a number (runway number or heading). */
export function answerFor(s: Scenario): string | number {
  switch (s.kind) {
    case "strength":
      return STRENGTH_ID[s.s];
    case "from4":
    case "from8":
      return pointOf(s.w) ?? "n";
    case "fromDeg":
      return degId(s.w);
    case "card":
    case "ten":
    case "round":
      return runwayNumber(s.h);
    case "opp":
      return reciprocal(runwayNumber(s.h));
    case "rotate":
      return runwayHeading(s.n);
    case "quarter":
    case "turn":
    case "wrap":
      return turnHeading(s.h, s.dir, s.d);
    case "two":
    case "four":
    case "twind":
      return rwId(bestEnd(airportEnds(s), s.w));
    case "xwind":
    case "tcomp":
      return windKind(s.h, s.w) ?? "cross";
    case "tline":
      return hdgId(runwayHeading(s.n));
    case "tjoin":
      return rwId(runwayNumber(turnHeading(s.h, s.dir, s.d)));
  }
}

/** Is the answer a typed/dialled number (Runway Painter, Heading Turns) rather than a choice? */
export const isNumberKind = (k: Kind): boolean => ["card", "ten", "round", "opp", "rotate", "quarter", "turn", "wrap"].includes(k);
/** Number entry flavour: a runway number 01–36, or a heading 001–360. */
export const entryOf = (k: Kind): "runway" | "heading" | null => (["card", "ten", "round", "opp"].includes(k) ? "runway" : ["rotate", "quarter", "turn", "wrap"].includes(k) ? "heading" : null);

/** Step a number-entry value with wrap-around: runway 36 → 01, heading 360 → 001 (and 0 → 360). */
export function stepValue(entry: "runway" | "heading", v: number | null, by: number): number {
  if (entry === "runway") {
    if (v === null) return by > 0 ? 1 : 36;
    return ((((v - 1 + by) % 36) + 36) % 36) + 1;
  }
  if (v === null) return by > 0 ? norm(by) : norm(360 + by);
  return norm(v + by);
}
/**
 * Typed digits → the value the board previews. Runway: up to 2 digits, 1–36. Heading: up to 3 digits with an optional
 * leading minus; "000" means north → 360. Headings are NOT limited to 1–360 here: an unwrapped turn ("420" for
 * 300 + 120, "−30" for 30 left 60) is a real, common answer, so it can be entered and checked — it is a miss, and the
 * first-miss line teaches the wrap (hints.ts). Only 1–360 can ever be correct. Returns null while the digits are not
 * a value yet ("", "-", "0", "00", "-0"): a lone 0 stays pending so typing "045" doesn't swing the dial to north first.
 */
export function typedValue(entry: "runway" | "heading", digits: string): number | null {
  if (entry === "runway") {
    if (!/^\d{1,2}$/.test(digits)) return null;
    const v = Number(digits);
    return v >= 1 && v <= 36 ? v : null;
  }
  const m = /^(-?)(\d{1,3})$/.exec(digits);
  if (!m) return null;
  const v = Number(m[2]);
  if (v === 0) return m[1] === "" && m[2]!.length === 3 ? 360 : null;
  return m[1] ? -v : v;
}
/** The value Check submits for typed digits: as `typedValue`, except a heading of all zeros ("0", "00") is north, 360. */
export function checkedValue(entry: "runway" | "heading", digits: string): number | null {
  if (entry === "heading" && /^0{1,3}$/.test(digits)) return 360;
  return typedValue(entry, digits);
}
/** Is a heading value outside 1–360 (an unwrapped turn)? */
export const offCompass = (v: number): boolean => v < 1 || v > 360;
/** A number-entry value for display: runway "09"; heading "060"; an unwrapped heading as typed ("420", "−30"). */
export function fmtEntry(entry: "runway" | "heading", v: number): string {
  if (entry === "runway") return fmtRunway(v);
  if (offCompass(v)) return v < 0 ? `−${Math.abs(v)}` : String(v);
  return fmtHeading(v);
}

/** Heading the board's dial points at for a pointer position (dx right, dy down from the rose centre), snapped. */
export function headingFromVector(dx: number, dy: number, snap: number): number {
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return norm(Math.round(deg / snap) * snap);
}

/** Screen vector for a heading on a north-up rose (y down). */
export function vec(h: number): [number, number] {
  const r = (norm(h) * Math.PI) / 180;
  return [Math.sin(r), -Math.cos(r)];
}

// ---------------------------------------------------------------- the modelled working (second miss)

const sign = (dir: Dir) => (dir === 1 ? "+" : "−");
/** The worked steps the board shows with the modelled answer (plain text, one line per step). */
export function working(s: Scenario): string[] {
  const to = sockPoints(s.w);
  switch (s.kind) {
    case "strength":
      return [["Sock hangs limp", "Sock half full, drooping", "Sock full and straight out"][s.s]!, `→ ${STRENGTH_TEXT[STRENGTH_ID[s.s]]}`];
    case "from4":
    case "from8":
      return [`Sock points ${POINT_NAME[pointOf(to) ?? "n"]}`, `Wind comes from the other side: ${POINT_NAME[pointOf(s.w) ?? "n"]}`];
    case "fromDeg":
      return [`Sock points ${fmtHeading(to)}°`, `${fmtHeading(to)} ${to > 180 ? "− 180" : "+ 180"} = ${fmtHeading(s.w)}`, `Wind from ${fmtHeading(s.w)}°`];
    case "card":
    case "ten": {
      const n = runwayNumber(s.h);
      return [`Heading ${fmtHeading(s.h)}°`, `${norm(s.h)} ÷ 10 = ${n}`, `Paint ${fmtRunway(n)}`];
    }
    case "round": {
      const n = runwayNumber(s.h);
      return [`${fmtHeading(s.h)}° is nearest ${fmtHeading(n * 10)}°`, `${n * 10} ÷ 10 = ${n}`, `Paint ${fmtRunway(n)}`];
    }
    case "opp": {
      const p = runwayNumber(s.h);
      return [`This end: ${fmtRunway(p)}`, `${p} ${p > 18 ? "− 18" : "+ 18"} = ${reciprocal(p)}`, `Paint ${fmtRunway(reciprocal(p))}`];
    }
    case "rotate":
      return [`Runway ${fmtRunway(s.n)}`, `${s.n} × 10 = ${s.n * 10}`, `Point the arrow at ${fmtHeading(s.n * 10)}°`];
    case "quarter":
    case "turn":
    case "wrap": {
      const res = turnHeading(s.h, s.dir, s.d);
      const raw = s.h + s.dir * s.d;
      if (s.dir === 1 && raw > 360) return [`${s.h} + ${s.d} = ${raw}`, `Past north: ${raw} − 360 = ${res}`, `New heading ${fmtHeading(res)}°`];
      if (s.dir === -1 && raw <= 0) return [`${s.h} + 360 = ${s.h + 360}`, `${s.h + 360} − ${s.d} = ${res}`, `New heading ${fmtHeading(res)}°`];
      return [`${s.h} ${sign(s.dir)} ${s.d} = ${raw}`, `New heading ${fmtHeading(res)}°${res === 360 ? " (north is 360)" : ""}`];
    }
    case "two":
    case "four":
    case "twind": {
      const best = bestEnd(airportEnds(s), s.w);
      return [`Wind from ${fmtHeading(s.w)}°`, `Runway ${fmtRunway(best)} faces ${fmtHeading(runwayHeading(best))}°, closest to the wind`, `Land on ${fmtRunway(best)}`];
    }
    case "xwind":
    case "tcomp": {
      const k = windKind(s.h, s.w) ?? "cross";
      return [`Runway ${fmtHeading(s.h)}°, wind ${fmtHeading(s.w)}°`, `${angleDiff(s.h, s.w)}° apart`, `→ ${WIND_TEXT[k]}`];
    }
    case "tline":
      return [`Runway ${fmtRunway(s.n)}`, `Put the zero back: ${fmtHeading(runwayHeading(s.n))}°`];
    case "tjoin": {
      const res = turnHeading(s.h, s.dir, s.d);
      return [`${s.h} ${sign(s.dir)} ${s.d} → heading ${fmtHeading(res)}°`, `${fmtHeading(res)} ÷ 10 → runway ${fmtRunway(runwayNumber(res))}`];
    }
  }
}
