import type { Exercise, ExerciseGenerator, GeneratorBand } from "../../engine/types";
import { createRng, hashSeed, type Rng } from "../../engine/rng";
import {
  type Kind, type Line, type LineKind, MODE_OF, type Scenario, answerFor, blank, encode, frac, lineText, perimeter, storyText,
} from "./logic";

/**
 * Bobbo's Bakery — seeded generator (pure: same level + rng + index (+ band) → same exercise).
 * Level table, misconceptions and accuracy notes: docs/worlds/bakery.md. Spec roots: docs/curriculum/maths.md §3
 * (Puff's Array Garden, Gloop's Room Builder, Bar-Model Bakery), merged into one bakery with five inner games.
 *
 * A band is 8 items: 7 from the inner games unlocked so far (the level's new idea first, the rest as review, in an
 * order rotated by the band seed) and the Festival Order Sheet, a `closer` (engine R5a) that always ends the round.
 * Each level adds at most three new ideas. Time is never a parameter.
 */
export const BK_AGES = [9, 11] as const;
export const SKILL = {
  arrays: "math.mult.arrays",
  missing: "math.div.missing-factor",
  area: "math.geom.area-perimeter",
  of: "math.frac.of-amount",
  equiv: "math.frac.equivalent",
  compare: "math.frac.compare",
  bar: "math.solve.bar-model",
} as const;
export const KIND_SKILL: Record<Kind, string> = {
  count: SKILL.arrays, build: SKILL.arrays, fact: SKILL.arrays, missing: SKILL.missing,
  area: SKILL.area, perim: SKILL.area, make: SKILL.area, lshape: SKILL.area,
  of: SKILL.of, equiv: SKILL.equiv, cmp: SKILL.compare,
  pw: SKILL.bar, cmpb: SKILL.bar, mulb: SKILL.bar, timesb: SKILL.bar, fracb: SKILL.bar, order: SKILL.bar,
};

export interface LevelSpec {
  label: string;
  /** The new ideas this level introduces (≤ 3). */
  fresh: readonly Kind[];
  /** Slot pattern for index % 8; slot 7 is always the order sheet (closer). */
  slots: readonly Kind[];
}
export const LEVELS: readonly LevelSpec[] = [
  { label: "Tray Arrays: count a tray in rows, build r rows of c, ×2 ×5 ×10", fresh: ["count", "build", "fact"], slots: ["count", "build", "fact", "count", "build", "fact", "count", "order"] },
  { label: "Missing factor (division as equal rows) · ×3 and ×4 facts", fresh: ["missing"], slots: ["missing", "fact", "build", "missing", "count", "fact", "missing", "order"] },
  { label: "Tray Builder: area by tiles, perimeter by the edge · ×6 to ×9 facts", fresh: ["area", "perim"], slots: ["area", "perim", "fact", "area", "missing", "perim", "area", "order"] },
  { label: "Build a tray to an area · area and perimeter from side lengths only · facts to 12 × 12", fresh: ["make"], slots: ["make", "area", "perim", "fact", "make", "missing", "perim", "order"] },
  { label: "Batch Fractions: fraction of an amount (groups drawn) · compare (same numerator or denominator)", fresh: ["of", "cmp"], slots: ["of", "cmp", "of", "area", "cmp", "fact", "of", "order"] },
  { label: "Equivalent fractions on a cake · L-shaped trays · fraction of an amount without groups", fresh: ["equiv", "lshape"], slots: ["equiv", "lshape", "of", "equiv", "cmp", "lshape", "missing", "order"] },
  { label: "Bar-Model Orders: part–whole two-step · comparison (more than), then altogether", fresh: ["pw", "cmpb"], slots: ["pw", "cmpb", "pw", "equiv", "cmpb", "lshape", "of", "order"] },
  { label: "Bar models: equal trays plus extra · times as many · fraction of a bar · covered cakes", fresh: ["mulb", "timesb", "fracb"], slots: ["mulb", "timesb", "fracb", "pw", "mulb", "cmp", "make", "order"] },
  { label: "Festival rush: every inner game mixed, hardest settings", fresh: [], slots: ["timesb", "lshape", "fracb", "equiv", "fact", "cmpb", "missing", "order"] },
];
export const BK_MAX_LEVEL = LEVELS.length - 1;
export const BAND = 8;

/** A deterministic per-band deck: the band's shuffled copy of `items`, read at position `pos` (wraps). */
function deal<T>(band: GeneratorBand | undefined, key: string, items: readonly T[], pos: number): T {
  const r = createRng(hashSeed(band?.seed ?? 0, "bk", key));
  const deck = r.shuffle([...items]);
  return deck[((pos % deck.length) + deck.length) % deck.length]!;
}
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
/** (w − 2)(h − 2) = 4 ⇔ area = perimeter: avoided so "area" and "perimeter" answers never coincide. */
const areaIsPerimeter = (w: number, h: number) => (w - 2) * (h - 2) === 4;

/** Fraction pairs that are equal (left, right), for compare items. */
const EQUAL_PAIRS: readonly [number, number, number, number][] = [
  [1, 2, 2, 4], [1, 2, 3, 6], [1, 2, 4, 8], [1, 3, 2, 6], [2, 3, 4, 6], [3, 4, 6, 8], [1, 4, 2, 8], [2, 5, 4, 10],
];

export function pickScenario(kind: Kind, lv: number, rng: Rng, band: GeneratorBand | undefined, k: number): Scenario {
  const s = blank(kind, lv);
  switch (kind) {
    case "count": {
      do {
        s.a = rng.int(2, lv === 0 ? 4 : 5);
        s.b = rng.int(lv === 0 ? 2 : 3, lv === 0 ? 5 : 6);
      } while (s.a === s.b);
      return s;
    }
    case "build": {
      do {
        s.a = rng.int(2, lv === 0 ? 4 : 5);
        s.b = rng.int(lv === 0 ? 2 : 3, lv === 0 ? 5 : 8);
      } while (s.a === s.b);
      return s;
    }
    case "fact": {
      const [one, other] =
        lv === 0 ? [[2, 5, 10], range(2, 6)]
          : lv === 1 ? [[3, 4], range(2, 10)]
            : lv === 2 ? [[6, 7, 8, 9], range(3, 9)]
              : lv < 8 ? [range(6, 12), range(4, 12)]
                : [range(6, 12), range(6, 12)];
      const x = deal(band, `fact-${lv}`, one, k);
      const y = rng.pick(other);
      [s.a, s.b] = rng.chance(0.5) ? [x, y] : [y, x];
      return s;
    }
    case "missing": {
      const [ka, kb] = lv <= 1 ? [[2, 5], [2, 6]] : lv === 2 ? [[3, 6], [3, 9]] : lv < 8 ? [[4, 9], [4, 12]] : [[6, 12], [6, 12]];
      do {
        s.a = rng.int(ka[0]!, ka[1]!);
        s.b = rng.int(kb[0]!, kb[1]!);
      } while (s.a === 2 && s.b === 2);
      s.v = (k + lv) % 2;
      return s;
    }
    case "area":
    case "perim": {
      const [wr, hr] = lv <= 2 ? [[3, 6], [2, 5]] : lv <= 4 ? [[4, 9], [3, 8]] : [[4, 12], [3, 10]];
      do {
        s.a = rng.int(wr[0]!, wr[1]!);
        s.b = rng.int(hr[0]!, hr[1]!);
      } while (areaIsPerimeter(s.a, s.b) || (kind === "perim" && s.b < 3));
      s.v = lv <= 2 ? 1 : 0;
      return s;
    }
    case "make": {
      const [wr, hr] = lv <= 5 ? [[3, 6], [2, 6]] : [[4, 9], [3, 10]];
      do {
        s.a = rng.int(wr[0]!, wr[1]!);
        s.b = rng.int(hr[0]!, hr[1]!);
      } while (areaIsPerimeter(s.a, s.b) || s.a === s.b);
      return s;
    }
    case "lshape": {
      const [wr, hr] = lv < 8 ? [[5, 8], [4, 7]] : [[6, 12], [5, 10]];
      s.a = rng.int(wr[0]!, wr[1]!);
      s.b = rng.int(hr[0]!, hr[1]!);
      s.c = rng.int(2, s.a - 2);
      s.d = rng.int(2, s.b - 2);
      return s;
    }
    case "of": {
      const dens = lv <= 4 ? [2, 3, 4, 5] : lv < 8 ? range(2, 8) : range(3, 10);
      s.b = deal(band, `of-${lv}`, dens, k);
      s.a = rng.int(1, s.b - 1);
      const kk = lv <= 4 ? rng.int(2, 6) : lv < 8 ? rng.int(2, 8) : rng.int(3, 8);
      s.c = s.b * kk;
      s.v = lv <= 4 ? 1 : 0;
      return s;
    }
    case "equiv": {
      const reverse = lv >= 8 && k % 2 === 1;
      const m = rng.pick([2, 3]);
      if (!reverse) {
        do s.b = rng.pick([2, 3, 4]);
        while (s.b * m > 12);
        s.c = s.b * m;
        s.a = rng.int(1, s.b - 1);
      } else {
        do s.c = rng.pick([2, 3, 4]);
        while (s.c * m > 12);
        s.b = s.c * m;
        s.a = m * rng.int(1, s.c - 1);
        s.v = 1;
      }
      return s;
    }
    case "cmp": {
      const types = lv === 4 ? ["den", "num"] : lv <= 6 ? ["den", "num", "eq"] : lv === 7 ? ["num", "eq", "den"] : ["num", "eq", "half"];
      const t = types[(k + (band?.seed ?? 0)) % types.length]!;
      if (t === "den") {
        s.b = s.d = rng.int(3, 8);
        s.a = rng.int(1, s.b - 1);
        do s.c = rng.int(1, s.b - 1);
        while (s.c === s.a);
      } else if (t === "num") {
        s.a = s.c = rng.int(1, 3);
        s.b = rng.int(s.a + 1, 10);
        do s.d = rng.int(s.a + 1, 10);
        while (s.d === s.b);
      } else if (t === "eq") {
        [s.a, s.b, s.c, s.d] = rng.pick(EQUAL_PAIRS);
        if (rng.chance(0.5)) [s.a, s.b, s.c, s.d] = [s.c, s.d, s.a, s.b];
      } else {
        // one fraction below a half, one above, with different tops and bottoms (compare both with 1/2)
        for (let g = 0; g < 50; g++) {
          s.b = rng.int(3, 10);
          s.a = rng.int(1, Math.ceil(s.b / 2) - 1);
          s.d = rng.int(3, 10);
          s.c = rng.int(Math.floor(s.d / 2) + 1, s.d - 1);
          if (s.b !== s.d && s.a !== s.c) break;
        }
        if (rng.chance(0.5)) [s.a, s.b, s.c, s.d] = [s.c, s.d, s.a, s.b];
      }
      s.v = lv <= 6 ? 1 : 0;
      return s;
    }
    case "pw": {
      const big = lv >= 8;
      for (let g = 0; g < 60; g++) {
        s.a = big ? rng.int(100, 200) : rng.int(40, 99);
        s.b = big ? rng.int(20, 70) : rng.int(10, 30);
        s.c = big ? rng.int(20, 70) : rng.int(10, 30);
        if (s.a - s.b - s.c >= (big ? 10 : 5) && s.b !== s.c) break;
      }
      if (s.a - s.b - s.c < 5) [s.a, s.b, s.c] = [80, 25, 18];
      s.e = deal(band, `goods-${lv}`, range(0, 5), k);
      return s;
    }
    case "cmpb": {
      s.v = lv >= 8 ? 1 : 0;
      if (s.v === 0) {
        s.a = rng.int(12, 40);
        s.b = rng.int(5, 20);
      } else {
        s.a = rng.int(30, 80);
        s.b = rng.int(6, Math.min(25, s.a - 8));
      }
      s.e = deal(band, `goods-${lv}`, range(0, 5), k + 2);
      return s;
    }
    case "mulb":
      s.a = rng.int(3, 9);
      s.b = rng.int(3, 6);
      s.c = rng.int(1, s.a - 1);
      s.e = deal(band, `goods-${lv}`, range(0, 5), k + 4);
      return s;
    case "timesb":
      s.a = rng.int(4, 12);
      s.b = rng.int(2, 4);
      s.v = lv >= 8 ? (k % 3 === 2 ? 0 : 1) : k % 2;
      s.e = deal(band, `goods-${lv}`, range(0, 5), k + 1);
      return s;
    case "fracb":
      s.b = rng.int(3, 6);
      s.a = rng.int(1, s.b - 1);
      s.c = s.b * rng.int(3, 8);
      s.e = deal(band, `goods-${lv}`, range(0, 5), k + 3);
      return s;
    case "order": {
      const kinds: LineKind[] =
        lv <= 1 ? [1, 2] : lv <= 3 ? [1, 3] : lv <= 5 ? [2, 4, 3] : lv <= 7 ? [5, 4, 1] : [5, 4, 3];
      s.lines = kinds.map((lk) => orderLine(lk, rng));
      return s;
    }
  }
}

function orderLine(k: LineKind, rng: Rng): Line {
  switch (k) {
    case 1: return { k, a: rng.int(2, 5), b: rng.int(2, 6), c: 0 };
    case 2: return { k, a: rng.int(2, 5), b: rng.int(3, 6), c: 0 };
    case 3: return { k, a: rng.int(3, 6), b: rng.int(2, 5), c: 0 };
    case 4: {
      const b = rng.int(2, 5);
      return { k, a: rng.int(1, b - 1), b, c: b * rng.int(2, 5) };
    }
    case 5: return { k, a: rng.int(2, 4), b: rng.int(3, 8), c: rng.int(1, 5) };
  }
}

// ---------------------------------------------------------------- exercise building

const OBJECT: Record<string, string> = { tray: "tray", grid: "grid", frac: "cake", bar: "bar", order: "order" };

/** Objectives describe the skill, never the item's answer. */
const OBJECTIVE: Record<Kind, string> = {
  count: "Find how many in an array by counting in equal rows (rows × how many in each row)",
  build: "Build an array with a given number of rows and a given number in each row",
  fact: "Recall a multiplication fact, splitting the array into easier facts when needed",
  missing: "Divide by finding the missing factor of an array",
  area: "Find the area of a rectangle as rows × columns of square tiles",
  perim: "Find the perimeter of a rectangle by adding the lengths of all four sides",
  make: "Build a rectangle with a given area and width by finding the missing side",
  lshape: "Find the area of an L-shape by splitting it into two rectangles",
  of: "Find a fraction of an amount: divide into equal groups, then take some of the groups",
  equiv: "Show an equivalent fraction on a cake cut into a different number of slices",
  cmp: "Compare two fractions of the same-sized whole",
  pw: "Solve a two-step part–whole problem with a bar model",
  cmpb: "Solve a two-step comparison problem with a bar model",
  mulb: "Solve a two-step problem with equal groups and some extra, using a bar model",
  timesb: "Solve a 'times as many' problem with a bar model",
  fracb: "Find the rest after taking a fraction of an amount, using a bar model",
  order: "Work out each line of a multi-step order and add the lines together",
};

export function bkExercise(s: Scenario, opts: { id: string; seed: number }): Omit<Exercise, "difficulty"> {
  const ans = answerFor(s);
  const base = {
    id: opts.id,
    skillId: KIND_SKILL[s.kind],
    objective: OBJECTIVE[s.kind],
    ages: BK_AGES,
    interaction: "choose" as const,
    seed: opts.seed,
    objectKind: OBJECT[MODE_OF[s.kind]]!,
    params: encode(s),
    ...(s.kind === "order" ? { closer: true } : {}),
    ...(s.tut ? { tutorial: true } : {}),
  };
  const number = { kind: "number" as const, value: ans as number };
  const { a, b, c, d } = s;
  const keys = "Type the answer on the keypad or with the number keys, then press Check.";
  switch (s.kind) {
    case "count":
      return { ...base, answer: number, prompt: { line: "bk.prompt.count", text: "How many cookies are on this tray?" },
        a11yDescription: `A baking tray of cookies in ${a} rows with ${b} cookies in each row. How many cookies? ${keys}` };
    case "build":
      return { ...base, answer: number,
        prompt: s.tut ? { line: "bk.prompt.tutorial", text: `Tap + to add rows. Fill the tray with ${a} rows of ${b} cookies.` } : { line: "bk.prompt.build", text: `Fill a tray with ${a} rows of ${b} cookies.` },
        a11yDescription: `An empty tray grid. Make ${a} rows across with ${b} cookies in each row, using the rows and in-each-row plus and minus buttons, the arrow keys (up and down for rows, left and right for cookies in each row) or by dragging the tray's corner, then press Check.` };
    case "fact":
      return { ...base, answer: number, prompt: { line: "bk.prompt.fact", text: `${a} × ${b} = ?  How many cookies on the tray?` },
        a11yDescription: `A big tray with ${a} rows of ${b} cookies: ${a} times ${b}. How many cookies? ${keys}` };
    case "missing":
      return { ...base, answer: number,
        prompt: s.v === 0
          ? { line: "bk.prompt.missing.rows", text: `${a * b} cookies in ${a} equal rows. How many in each row?` }
          : { line: "bk.prompt.missing.size", text: `${a * b} cookies, ${a} in each row. How many rows?` },
        a11yDescription: s.v === 0
          ? `A tray with ${a} rows. Share ${a * b} cookies equally into the ${a} rows. How many go in each row? Use the plus and minus buttons, drag the tray's edge, or type the number, then press Check.`
          : `A tray whose rows hold ${a} cookies each. How many rows does it take for ${a * b} cookies? Use the plus and minus buttons, drag the tray's edge, or type the number, then press Check.` };
    case "area":
      return { ...base, answer: number, prompt: { line: "bk.prompt.area", text: `How many square tiles cover this ${a} by ${b} tray?` },
        a11yDescription: `A rectangular tray ${a} squares wide and ${b} squares high${s.v ? ", with its square tiles drawn" : ""}. How many square tiles cover it? ${keys}` };
    case "perim":
      return { ...base, answer: number, prompt: { line: "bk.prompt.perim", text: `How many units of ribbon go all the way round this ${a} by ${b} tray?` },
        a11yDescription: `A rectangular tray ${a} units wide and ${b} units high${s.v ? ", drawn on a grid" : ""}. How long is a ribbon that goes once round its edge? ${keys}` };
    case "make":
      return { ...base, answer: number, prompt: { line: "bk.prompt.make", text: `Make a tray ${a} squares wide with an area of ${a * b} square tiles. How high is it?` },
        a11yDescription: `A tray ${a} squares wide on a grid. Set its height so that its area is ${a * b} square tiles, with the plus and minus buttons, by dragging its top edge, or by typing the height, then press Check.` };
    case "lshape":
      return { ...base, answer: number, prompt: { line: "bk.prompt.lshape", text: "How many square tiles cover this L-shaped tray?" },
        a11yDescription: `An L-shaped tray: a ${a} by ${b} rectangle with a ${c} by ${d} corner cut out at the top right. Its sides are ${a} along the bottom, ${b} up the left, ${a - c} along the top, ${d} down into the notch, ${c} across the notch and ${b - d} down the right. How many square tiles cover it? ${keys}` };
    case "of":
      return { ...base, answer: number, prompt: { line: "bk.prompt.of", text: `${frac(a, b)} of the ${c} muffins get icing. How many muffins is that?` },
        a11yDescription: `${c} muffins${s.v ? ` in ${b} equal groups of ${c / b}` : ""}. ${frac(a, b)} of them get icing. Tap a group to ice it if it helps. How many muffins get icing? ${keys}` };
    case "equiv":
      return { ...base, answer: number, prompt: { line: "bk.prompt.equiv", text: `${frac(a, b)} of the first cake is iced. Ice the same amount of the second cake.` },
        a11yDescription: `Two cakes the same size. The first is cut into ${b} slices and ${a} are iced. The second is cut into ${c} slices. Ice the same amount of it: tap or drag across slices, or use the plus and minus buttons or the arrow keys, then press Check.` };
    case "cmp":
      return { ...base, answer: { kind: "choice", correct: ans as string, options: [{ id: "l", text: frac(a, b) }, { id: "same", text: "The same" }, { id: "r", text: frac(c, d) }] },
        prompt: { line: "bk.prompt.cmp", text: `Which is more cake, ${frac(a, b)} or ${frac(c, d)}?` },
        a11yDescription: `Two cakes the same size${s.v ? "" : ", covered for now"}. The left one shows ${frac(a, b)}, the right one ${frac(c, d)}. Which is more cake, or are they the same?` };
    case "pw":
    case "cmpb":
    case "mulb":
    case "timesb":
    case "fracb":
      return { ...base, answer: number, prompt: { line: "bk.prompt.bar", text: "Put each number on its bar, then work out the answer." },
        a11yDescription: `Order card: ${storyText(s)} A bar model shows the story. First put each number tag on the bar it belongs to (tap the tag, then the bar). Then type the answer and press Check.` };
    case "order":
      return { ...base, answer: number, prompt: { line: "bk.prompt.order", text: "Festival order! Work out each line, then the total for the cart." },
        a11yDescription: `The festival order sheet. ${s.lines.map((l, i) => `Line ${i + 1}: ${lineText(l)}.`).join(" ")} Work out each line if it helps (tap a line, then type), then type the total number of treats for the cart and press Check.` };
  }
}

function tagOf(s: Scenario): string {
  if (s.kind === "order") return s.lines.map((l) => `${l.k}${l.a}x${l.b}`).join("-");
  return [s.a, s.b, s.c, s.d].filter((x, i) => i < 2 || x > 0).join("-") + (s.v ? `v${s.v}` : "");
}

/**
 * The band's slot order: slot 0 (the level's new idea) stays first; slots 1–6 rotate by the band seed, so a child who
 * steps up after two items meets different review games in different rounds. Slot 7, the order sheet, is a closer.
 */
export function bandSlots(lv: number, band: GeneratorBand | undefined): Kind[] {
  const slots = LEVELS[Math.max(0, Math.min(BK_MAX_LEVEL, lv))]!.slots;
  const mid = slots.slice(1, 7);
  const off = (band?.seed ?? 0) % mid.length;
  return [slots[0]!, ...mid.slice(off), ...mid.slice(0, off), slots[7]!];
}
const nth = (slots: readonly Kind[], i: number, k: Kind) => slots.slice(0, i).filter((x) => x === k).length;

export const generateBakery: ExerciseGenerator = (level, rng, index, band) => {
  const lv = Math.max(0, Math.min(BK_MAX_LEVEL, level));
  const slots = bandSlots(lv, band);
  const i = index % slots.length;
  const kind = slots[i]!;
  const k = nth(slots, i, kind) + Math.floor(index / slots.length) * slots.filter((x) => x === kind).length;
  const s = pickScenario(kind, lv, rng, band, k);
  const seed = rng.int(1, 999_999);
  return bkExercise(s, { id: `bk-${kind}-${tagOf(s)}-l${lv}n${index}`, seed });
};

/** The authored tutorial: build 2 rows of 3 (the pointing hand shows the rows + button). */
export const TUTORIAL_SCENARIO: Scenario = { ...blank("build", 0), a: 2, b: 3, tut: true };
export { perimeter };
