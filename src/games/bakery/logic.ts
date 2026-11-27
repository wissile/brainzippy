import type { Exercise } from "../../engine/types";

/**
 * Bobbo's Bakery — pure maths for the five inner games (no React, no DOM). Unit-tested in tests/unit/bakery.test.ts.
 * World doc (levels, misconceptions, accuracy notes): docs/worlds/bakery.md.
 *
 *  Tray Arrays       count an array · build "r rows of c" · multiplication facts to 12 × 12 · missing factor (division)
 *  Tray Builder      area (tiles) · perimeter (ribbon round the edge) · build a tray to an area · L-shaped trays
 *  Batch Fractions   fraction of an amount · equivalent fractions on a cake · compare two fractions
 *  Bar-Model Orders  two-step word problems drawn as bars (part–whole, comparison, equal parts, times as many, fraction)
 *  Festival Order    the round's finale (engine R5a closer): an order sheet whose lines use the games above
 *
 * Conventions: "r rows of c" = r rows with c in each row (r × c). Lengths on the tray grid are in squares (units),
 * area in square tiles. Every item is a whole-number answer except "compare" (a choice).
 */

export const MODES = ["tray", "grid", "frac", "bar", "order"] as const;
export type Mode = (typeof MODES)[number];
export const KINDS = [
  "count", "build", "fact", "missing", //               Tray Arrays
  "area", "perim", "make", "lshape", //                  Tray Builder
  "of", "equiv", "cmp", //                               Batch Fractions
  "pw", "cmpb", "mulb", "timesb", "fracb", //            Bar-Model Orders
  "order", //                                            Festival Order Sheet (closer)
] as const;
export type Kind = (typeof KINDS)[number];
export const MODE_OF: Record<Kind, Mode> = {
  count: "tray", build: "tray", fact: "tray", missing: "tray",
  area: "grid", perim: "grid", make: "grid", lshape: "grid",
  of: "frac", equiv: "frac", cmp: "frac",
  pw: "bar", cmpb: "bar", mulb: "bar", timesb: "bar", fracb: "bar",
  order: "order",
};
export const GAME_NAME: Record<Mode, string> = {
  tray: "Tray Arrays", grid: "Tray Builder", frac: "Batch Fractions", bar: "Bar-Model Orders", order: "Festival Order Sheet",
};

/** Baked goods used in word problems (plural, on-screen only; spoken prompts stay generic). */
export const GOODS = ["cookies", "muffins", "buns", "tarts", "cupcakes", "pies"] as const;

/** One line of the festival order sheet. */
export type LineKind = 1 | 2 | 3 | 4 | 5;
/** 1 tray: a rows of b · 2 boxes: a boxes of b · 3 brownies: an a by b slab cut into squares · 4 frac: a/b of c · 5 bags: a bags of b, plus c */
export interface Line { k: LineKind; a: number; b: number; c: number }

/**
 * One item, as numbers (exercise params hold numbers only). Field meaning by kind:
 *  count/build/fact  a rows, b in each row
 *  missing           a the known factor, b the unknown; v 0 = rows known (find how many in each row), 1 = row size known (find rows)
 *  area/perim        a width, b height (squares); v 1 = tiles drawn
 *  make              a width (fixed), b the height to build (area = a × b)
 *  lshape            a outer width, b outer height, c notch width, d notch height (notch cut from the top-right corner)
 *  of                a/b of c; v 1 = equal groups drawn
 *  equiv             a/b shown; c = slices on the second cake
 *  cmp               a/b (left) vs c/d (right); v 1 = cakes drawn (0 = covered until the first miss)
 *  pw                a baked, b sold in the morning, c in the afternoon
 *  cmpb              v 0: a Puff, b more (Bobbo = a + b) · v 1: a Bobbo, b more than Puff (Puff = a − b)
 *  mulb              a in each tray, b trays, c extra
 *  timesb            a Puff, b times as many (Bobbo = a × b); v 0 altogether, 1 how many more
 *  fracb             a/b of c have cinnamon; how many are plain
 *  e                 goods index (bar models)
 */
export interface Scenario {
  kind: Kind;
  lv: number;
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  v: number;
  lines: Line[];
  tut?: boolean;
}
export const blank = (kind: Kind, lv: number): Scenario => ({ kind, lv, a: 2, b: 3, c: 0, d: 0, e: 0, v: 0, lines: [] });

export function encode(s: Scenario): Record<string, number> {
  const out: Record<string, number> = { k: KINDS.indexOf(s.kind), lv: s.lv, a: s.a, b: s.b, c: s.c, d: s.d, e: s.e, v: s.v };
  s.lines.forEach((l, i) => {
    out[`l${i + 1}k`] = l.k;
    out[`l${i + 1}a`] = l.a;
    out[`l${i + 1}b`] = l.b;
    out[`l${i + 1}c`] = l.c;
  });
  if (s.tut) out.tut = 1;
  return out;
}
export function decode(ex: Pick<Exercise, "params">): Scenario {
  const p = ex.params ?? {};
  const num = (k: string, dflt = 0) => (typeof p[k] === "number" ? p[k]! : dflt);
  const lines: Line[] = [];
  for (let i = 1; i <= 3; i++) {
    const k = num(`l${i}k`);
    if (k >= 1 && k <= 5) lines.push({ k: k as LineKind, a: num(`l${i}a`), b: num(`l${i}b`), c: num(`l${i}c`) });
  }
  return {
    kind: KINDS[num("k")] ?? "count",
    lv: num("lv"),
    a: num("a", 2), b: num("b", 3), c: num("c"), d: num("d"), e: num("e"), v: num("v"),
    lines,
    ...(p.tut === 1 ? { tut: true } : {}),
  };
}
export const modeOf = (s: Scenario): Mode => MODE_OF[s.kind];
export const kindOf = (ex: Pick<Exercise, "params">): Kind => decode(ex).kind;

// ---------------------------------------------------------------- the maths

/** Build answers are encoded as rows × 100 + columns (3 rows of 5 → 305). */
export const buildCode = (rows: number, cols: number) => rows * 100 + cols;
export const buildRows = (code: number) => Math.floor(code / 100);
export const buildCols = (code: number) => code % 100;

export const lshapeArea = (s: Pick<Scenario, "a" | "b" | "c" | "d">) => s.a * s.b - s.c * s.d;
/** The two rectangles of the L when it is split with a vertical cut where the notch starts. */
export function lshapeParts(s: Pick<Scenario, "a" | "b" | "c" | "d">): [[number, number], [number, number]] {
  return [[s.a - s.c, s.b], [s.c, s.b - s.d]];
}
export const perimeter = (w: number, h: number) => 2 * (w + h);

export function lineValue(l: Line): number {
  switch (l.k) {
    case 1: case 2: case 3: return l.a * l.b;
    case 4: return (l.c / l.b) * l.a;
    case 5: return l.a * l.b + l.c;
  }
}
export const orderTotal = (lines: readonly Line[]) => lines.reduce((t, l) => t + lineValue(l), 0);

/** Fraction comparison: "l" (left is more), "r" (right is more) or "same". */
export function compareId(a: number, b: number, c: number, d: number): "l" | "r" | "same" {
  const x = a * d, y = c * b;
  return x === y ? "same" : x > y ? "l" : "r";
}

/** The correct answer: a number (most kinds) or a choice id ("cmp"). */
export function answerFor(s: Scenario): number | string {
  switch (s.kind) {
    case "count": case "fact": return s.a * s.b;
    case "build": return buildCode(s.a, s.b);
    case "missing": return s.b;
    case "area": return s.a * s.b;
    case "perim": return perimeter(s.a, s.b);
    case "make": return s.b;
    case "lshape": return lshapeArea(s);
    case "of": return (s.c / s.b) * s.a;
    case "equiv": return (s.a * s.c) / s.b;
    case "cmp": return compareId(s.a, s.b, s.c, s.d);
    case "pw": return s.a - s.b - s.c;
    case "cmpb": return s.v === 0 ? 2 * s.a + s.b : 2 * s.a - s.b;
    case "mulb": return s.a * s.b + s.c;
    case "timesb": return s.v === 0 ? (s.b + 1) * s.a : (s.b - 1) * s.a;
    case "fracb": return s.c - (s.c / s.b) * s.a;
    case "order": return orderTotal(s.lines);
  }
}

/**
 * Typical wrong answers for number items, each with the misconception it most likely shows (first match wins in
 * hints.ts; a value equal to the right answer is never listed). Keypads accept all of these (up to 4 digits), so a
 * child's real mistake reaches the diagnosis instead of being blocked by input limits.
 */
export interface Mistake { value: number; why: string }
export function mistakes(s: Scenario): Mistake[] {
  const out: Mistake[] = [];
  const add = (value: number, why: string) => {
    if (Number.isInteger(value) && value >= 0 && !out.some((m) => m.value === value)) out.push({ value, why });
  };
  const { a, b, c, d } = s;
  switch (s.kind) {
    case "count":
      add(a + b, "added");
      add(b, "oneRow");
      add(a, "oneCol");
      for (const x of [a * b + b, a * b - b, a * b + a, a * b - a]) add(x, "rowOff");
      break;
    case "build":
      add(buildCode(b, a), "swap");
      for (let r = 1; r <= 9; r++) for (let cc = 1; cc <= 12; cc++) if (r * cc === a * b && r !== b) add(buildCode(r, cc), "sameTotal");
      for (let r = 1; r <= 9; r++) if (r !== a) add(buildCode(r, b), "rowsOff");
      for (let cc = 1; cc <= 12; cc++) if (cc !== b) add(buildCode(a, cc), "colsOff");
      break;
    case "fact":
      add(a + b, "added");
      for (const x of [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b]) add(x, "neighbour");
      break;
    case "missing": {
      const t = a * b;
      add(t - a, "subtracted");
      add(t + a, "addedDiv");
      add(t * a, "multiplied");
      add(b + 1, "offByOne");
      add(b - 1, "offByOne");
      break;
    }
    case "area":
      add(perimeter(a, b), "perimeter");
      add(a + b, "addedSides");
      add(perimeter(a, b) - 4, "edgeTiles");
      break;
    case "perim":
      add(a * b, "area");
      add(a + b, "half");
      add(perimeter(a, b) - 4, "edgeSquares");
      add(2 * a + b, "threeSides");
      add(a + 2 * b, "threeSides");
      break;
    case "make": {
      const area = a * b;
      if (area % 2 === 0) add(area / 2 - a, "perimeter");
      add(area - a, "subtracted");
      break;
    }
    case "lshape": {
      const [[w1, h1], [w2, h2]] = lshapeParts(s);
      add(a * b, "box");
      add(w1 * h1, "onePart");
      add(w2 * h2, "onePart");
      add(perimeter(a, b), "perimeter");
      add(a * b + c * d, "addedNotch");
      break;
    }
    case "of": {
      const right = (c / b) * a;
      add(c / b, "onePart");
      if (c % a === 0) add(c / a, "byNum");
      add(c * a, "noDivide");
      add(c - right, "rest");
      add(c - a, "subNum");
      add(c - b, "subNum");
      break;
    }
    case "equiv": {
      const right = (a * c) / b;
      add(a, "sameTop");
      add(a + (c - b), "addSame");
      add(c - right, "rest");
      break;
    }
    case "pw":
      add(a - b, "oneStep");
      add(a - c, "oneStep");
      add(b + c, "sold");
      add(a + b + c, "addAll");
      break;
    case "cmpb":
      if (s.v === 0) {
        add(a + b, "oneStep");
        add(2 * a, "forgotMore");
        add(a + b + b, "moreTwice");
      } else {
        add(a - b, "oneStepPuff");
        add(2 * a + b, "whoHasMore");
        add(a + b, "whoHasMore");
        add(2 * a, "forgotMore");
      }
      break;
    case "mulb":
      add(a + b + c, "addedGroups");
      add(a * b, "forgotExtra");
      add(b * (a + c), "extraEach");
      add(a * c + b, "wrongGroups");
      break;
    case "timesb":
      if (s.v === 0) {
        add(a * b, "oneStepTimes");
        add(a + b, "addedTimes");
        add(a * b + b, "addedTimes");
      } else {
        add(a * b, "bobboOnly");
        add((b + 1) * a, "total");
        add(a * b - b, "addedTimes");
      }
      break;
    case "fracb": {
      const part = (c / b) * a;
      add(part, "part");
      add(c - a, "subNum");
      add(c - b, "subNum");
      add(c / b, "onePart");
      break;
    }
    case "order": {
      const total = orderTotal(s.lines);
      s.lines.forEach((l, i) => {
        const right = lineValue(l);
        const swapIn = (v: number) => total - right + v;
        if (l.k === 1) add(swapIn(l.a + l.b), "lineTray");
        if (l.k === 2) add(swapIn(l.a + l.b), "lineBoxes");
        if (l.k === 3) {
          add(swapIn(perimeter(l.a, l.b)), "lineBrownies");
          add(swapIn(l.a + l.b), "lineBrownies");
        }
        if (l.k === 4) {
          add(swapIn(l.c / l.b), "lineFrac");
          add(swapIn(l.c), "lineFrac");
        }
        if (l.k === 5) {
          add(swapIn(l.a * l.b), "lineExtra");
          add(swapIn(l.a + l.b + l.c), "lineBoxes");
        }
        add(total - right, i === s.lines.length - 1 ? "missedLine" : "missedLine");
      });
      break;
    }
  }
  const right = answerFor(s);
  return out.filter((m) => m.value !== right);
}

/** The misconception a submitted number most likely shows ("" when it matches none). */
export function diagnose(s: Scenario, value: number): string {
  return mistakes(s).find((m) => m.value === value)?.why ?? "";
}

// ---------------------------------------------------------------- number entry

/** Keypads take up to 4 digits so typical wrong answers (e.g. 42 × 6 = 252 for 42 ÷ 6) can be checked and diagnosed. */
export const MAX_DIGITS = 4;
export function typeDigit(buf: string, k: string): string {
  if (!/^[0-9]$/.test(k)) return buf;
  if (buf.length >= MAX_DIGITS) return buf;
  return (buf + k).replace(/^0+(?=\d)/, "");
}
/** Stepper ranges per kind: [min, max]. Steppers never block a typical miss that the keypad can enter. */
export function stepRange(s: Scenario): [number, number] {
  switch (s.kind) {
    case "missing": return [1, 12];
    case "make": return [1, 12];
    case "equiv": return [0, s.c];
    default: return [0, 9999];
  }
}
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---------------------------------------------------------------- text

export const frac = (a: number, b: number) => `${a}/${b}`;
export const goods = (e: number) => GOODS[((e % GOODS.length) + GOODS.length) % GOODS.length]!;

export function lineText(l: Line): string {
  switch (l.k) {
    case 1: return `Cookies: ${l.a} rows of ${l.b}`;
    case 2: return `Pies: ${l.a} boxes of ${l.b}`;
    case 3: return `Brownies: a ${l.a} by ${l.b} slab, cut into squares`;
    case 4: return `Iced muffins: ${frac(l.a, l.b)} of a batch of ${l.c}`;
    case 5: return `Buns: ${l.a} bags of ${l.b}, plus ${l.c} more`;
  }
}

/** Bar-model word problems (on screen and in the a11y description). */
export function storyText(s: Scenario): string {
  const g = goods(s.e);
  switch (s.kind) {
    case "pw": return `Bobbo baked ${s.a} ${g}. He sold ${s.b} in the morning and ${s.c} in the afternoon. How many ${g} are left?`;
    case "cmpb":
      return s.v === 0
        ? `Puff baked ${s.a} ${g}. Bobbo baked ${s.b} more than Puff. How many ${g} did they bake altogether?`
        : `Bobbo baked ${s.a} ${g}. That is ${s.b} more than Puff baked. How many ${g} did they bake altogether?`;
    case "mulb": return `Each tray holds ${s.a} ${g}. Bobbo fills ${s.b} trays and has ${s.c} extra ${g}. How many ${g} is that?`;
    case "timesb":
      return s.v === 0
        ? `Puff iced ${s.a} ${g}. Bobbo iced ${s.b} times as many. How many ${g} did they ice altogether?`
        : `Puff iced ${s.a} ${g}. Bobbo iced ${s.b} times as many. How many more ${g} did Bobbo ice than Puff?`;
    case "fracb": return `Bobbo baked ${s.c} ${g}. ${frac(s.a, s.b)} of them have cinnamon. The rest are plain. How many are plain?`;
    default: return "";
  }
}

/**
 * Bar-model labels: the slots on the bars (each named by its part of the story) and the number tags that go on them.
 * The child places every tag before typing the answer (tap a tag then a slot, drag it, or Enter on each).
 */
export interface BarSlot { id: string; name: string; tag: string }
export function barSlots(s: Scenario): BarSlot[] {
  switch (s.kind) {
    case "pw": return [{ id: "whole", name: "Baked", tag: String(s.a) }, { id: "p1", name: "Morning", tag: String(s.b) }, { id: "p2", name: "Afternoon", tag: String(s.c) }];
    case "cmpb":
      return s.v === 0
        ? [{ id: "puff", name: "Puff", tag: String(s.a) }, { id: "more", name: "More", tag: String(s.b) }]
        : [{ id: "bobbo", name: "Bobbo", tag: String(s.a) }, { id: "more", name: "More", tag: String(s.b) }];
    case "mulb": return [{ id: "one", name: "One tray", tag: String(s.a) }, { id: "trays", name: "Trays", tag: String(s.b) }, { id: "extra", name: "Extra", tag: String(s.c) }];
    case "timesb": return [{ id: "puff", name: "Puff", tag: String(s.a) }, { id: "times", name: "Times", tag: String(s.b) }];
    case "fracb": return [{ id: "whole", name: "All", tag: String(s.c) }, { id: "cin", name: "Cinnamon", tag: frac(s.a, s.b) }];
    default: return [];
  }
}

// ---------------------------------------------------------------- the worked model (second miss)

/** The worked steps shown with the modelled answer, one per runner step. */
export function modelSteps(s: Scenario): string[] {
  const { a, b, c, d } = s;
  switch (s.kind) {
    case "count": return [`${a} rows, ${b} in each row`, `Skip-count: ${Array.from({ length: a }, (_, i) => (i + 1) * b).join(", ")}`, `${a} × ${b} = ${a * b}`];
    case "build": return [`Rows go across: make ${a} rows`, `Put ${b} in each row`, `${a} rows of ${b} = ${a * b} cookies`];
    case "fact": {
      const [x, y] = splitFor(b);
      if (y === 0) return [`${a} rows of ${b}`, `${a} × ${b} = ${a * b}`];
      return [`Split ${b} into ${x} + ${y}`, `${a} × ${x} = ${a * x} and ${a} × ${y} = ${a * y}`, `${a * x} + ${a * y} = ${a * b}`];
    }
    case "missing":
      return s.v === 0
        ? [`${a} rows, ? in each row = ${a * b}`, `${a} × ${b} = ${a * b}`, `So ${a * b} ÷ ${a} = ${b} in each row`]
        : [`? rows of ${a} = ${a * b}`, `${b} × ${a} = ${a * b}`, `So ${a * b} ÷ ${a} = ${b} rows`];
    case "area": return [`Area counts the tiles inside`, `${b} rows of ${a} tiles`, `${a} × ${b} = ${a * b} square tiles`];
    case "perim": return [`Perimeter is the way round the edge`, `${a} + ${b} + ${a} + ${b}`, `= ${perimeter(a, b)} units of ribbon`];
    case "make": return [`Area = width × height`, `${a} × ? = ${a * b}`, `${a} × ${b} = ${a * b}, so make it ${b} high`];
    case "lshape": {
      const [[w1, h1], [w2, h2]] = lshapeParts(s);
      return [`Split the L into two rectangles`, `${w1} × ${h1} = ${w1 * h1} and ${w2} × ${h2} = ${w2 * h2}`, `${w1 * h1} + ${w2 * h2} = ${lshapeArea(s)} tiles`];
    }
    case "of": return [`Split ${c} into ${b} equal groups: ${c / b} in each`, `Take ${a} group${a === 1 ? "" : "s"}: ${a} × ${c / b}`, `${frac(a, b)} of ${c} = ${(c / b) * a}`];
    case "equiv": {
      if (c >= b) return [`Each slice is cut into ${c / b}`, `${a} × ${c / b} = ${(a * c) / b}`, `${frac(a, b)} = ${frac((a * c) / b, c)}`];
      return [`Every ${b / c} small slices make 1 big slice`, `${a} ÷ ${b / c} = ${(a * c) / b}`, `${frac(a, b)} = ${frac((a * c) / b, c)}`];
    }
    case "cmp": {
      const id = compareId(a, b, c, d);
      const word = id === "same" ? "the same" : id === "l" ? `${frac(a, b)} is more` : `${frac(c, d)} is more`;
      if (b === d) return [`Same size slices (${b} in each cake)`, `Compare how many: ${a} and ${c}`, `So ${word}`];
      if (a === c) return [`Same number of slices (${a})`, `Fewer cuts make bigger slices`, `So ${word}`];
      return [`Use the same slices: ${frac(a * d, b * d)} and ${frac(c * b, d * b)}`, `Compare ${a * d} and ${c * b}`, `So ${word}`];
    }
    case "pw": return [`Sold: ${b} + ${c} = ${b + c}`, `Left: ${a} − ${b + c} = ${a - b - c}`];
    case "cmpb":
      return s.v === 0
        ? [`Bobbo: ${a} + ${b} = ${a + b}`, `Altogether: ${a} + ${a + b} = ${2 * a + b}`]
        : [`Puff: ${a} − ${b} = ${a - b}`, `Altogether: ${a} + ${a - b} = ${2 * a - b}`];
    case "mulb": return [`${b} trays of ${a}: ${b} × ${a} = ${a * b}`, `Add the extra: ${a * b} + ${c} = ${a * b + c}`];
    case "timesb":
      return s.v === 0
        ? [`Bobbo: ${b} × ${a} = ${a * b}`, `Altogether: ${a} + ${a * b} = ${(b + 1) * a}`]
        : [`Bobbo: ${b} × ${a} = ${a * b}`, `How many more: ${a * b} − ${a} = ${(b - 1) * a}`];
    case "fracb": return [`One part: ${c} ÷ ${b} = ${c / b}`, `Cinnamon: ${a} × ${c / b} = ${(c / b) * a}`, `Plain: ${c} − ${(c / b) * a} = ${answerFor(s)}`];
    case "order": return [...s.lines.map((l) => `${lineText(l).split(":")[0]}: ${lineWorking(l)}`), `Total: ${s.lines.map(lineValue).join(" + ")} = ${orderTotal(s.lines)}`];
  }
}
export function lineWorking(l: Line): string {
  switch (l.k) {
    case 1: case 2: case 3: return `${l.a} × ${l.b} = ${l.a * l.b}`;
    case 4: return `${l.c} ÷ ${l.b} × ${l.a} = ${lineValue(l)}`;
    case 5: return `${l.a} × ${l.b} + ${l.c} = ${lineValue(l)}`;
  }
}

/** How a fact's row length is split into friendlier facts for the hint (7 × 8 → 7 × 5 + 7 × 3). [b, 0] = no split. */
export function splitFor(b: number): [number, number] {
  if (b <= 5) return [b, 0];
  if (b === 10) return [10, 0];
  if (b > 10) return [10, b - 10];
  return [5, b - 5];
}
