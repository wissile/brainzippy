import type { AnswerOption, Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";
import { FAMILY_KINDS, FAMILY_WORD, type PatternFamily, labelOf, tokenIndex, towerId } from "./tokens";

/**
 * Puff's Pattern Parade — procedural exercises (pure: same level + rng + index → same exercise).
 *
 * A parade line is a row of marchers; some positions are gaps the child fills by dragging (or tapping) marchers
 * from Puff's cart. One gap → `choice` answer (option id = marcher id). Two or more gaps → `sequence` answer
 * whose pieces are interchangeable copies of each marcher (same `text`), so any drum fits any drum gap.
 *
 * Levels (0-based; Level 1 on screen = level 0). Docs: docs/worlds/pattern-parade.md
 *   0  AB, what comes next (1 gap, 2 choices)            5  translate AB into another family (2 gaps, key given)
 *   1  AB, next two (2 gaps, + 1 distractor marcher)     6  translate AAB / ABB / ABC (3 gaps, key given)
 *   2  AAB / ABB, next one (+1 distractor)               7  growing towers +1, next one
 *   3  ABC, next one or two (+1 distractor)              8  growing towers +1, next two or the missing middle
 *   4  missing middle item in AB / AAB / ABB / ABC
 * No time pressure at any level.
 *
 * The board reads the line from `params` (numbers only): mode, len, unit, t0..t{len-1} (marcher index at each
 * position, gaps included), gap (bitmask of gap positions), and for translate s0..s{len-1} (the source row).
 */
export type Mode = "next" | "missing" | "translate" | "grow";
export const MODES: readonly Mode[] = ["next", "missing", "translate", "grow"];
export type Shape = "AB" | "AAB" | "ABB" | "ABC";
export const UNITS: Record<Shape, readonly number[]> = { AB: [0, 1], AAB: [0, 0, 1], ABB: [0, 1, 1], ABC: [0, 1, 2] };

export const SKILL_REPEAT = "math.pattern.repeat";
export const SKILL_TRANSLATE = "math.pattern.translate";
export const SKILL_GROW = "math.pattern.grow-simple";
export const PP_AGES = [4, 6] as const;

export interface Level {
  mode: Mode;
  /** Unit shapes for repeating patterns (empty for growing). */
  shapes: readonly Shape[];
  skill: string;
  summary: string;
}
export const LEVELS: readonly Level[] = [
  { mode: "next", shapes: ["AB"], skill: SKILL_REPEAT, summary: "AB: what comes next? (2 choices)" },
  { mode: "next", shapes: ["AB"], skill: SKILL_REPEAT, summary: "AB: the next two (3 marchers in the cart)" },
  { mode: "next", shapes: ["AAB", "ABB"], skill: SKILL_REPEAT, summary: "AAB / ABB: what comes next?" },
  { mode: "next", shapes: ["ABC"], skill: SKILL_REPEAT, summary: "ABC: the next one or two" },
  { mode: "missing", shapes: ["AB", "AAB", "ABB", "ABC"], skill: SKILL_REPEAT, summary: "Who is missing from the middle?" },
  { mode: "translate", shapes: ["AB"], skill: SKILL_TRANSLATE, summary: "Copy an AB pattern with another family" },
  { mode: "translate", shapes: ["AAB", "ABB", "ABC"], skill: SKILL_TRANSLATE, summary: "Copy AAB / ABB / ABC with another family" },
  { mode: "grow", shapes: [], skill: SKILL_GROW, summary: "Growing towers (+1): the next tower" },
  { mode: "grow", shapes: [], skill: SKILL_GROW, summary: "Growing towers (+1): next two, or the missing one" },
];
export const MAX_LEVEL = LEVELS.length - 1;
/** Longest parade line (keeps gaps ≥ 64 px on a 390 px phone with at most two rows). */
export const MAX_LEN = 8;

const FAMILIES: readonly PatternFamily[] = ["float", "animal", "band"];
const TRANSLATIONS: readonly [PatternFamily, PatternFamily][] = [["float", "animal"], ["animal", "band"], ["float", "band"]];

interface Built {
  mode: Mode;
  row: string[];
  gaps: number[];
  source?: string[];
  unit: number;
  /** Marchers in Puff's cart (options / piece kinds), in display order. */
  cart: string[];
}

const repeat = (kinds: readonly string[], unit: readonly number[], len: number) => Array.from({ length: len }, (_, i) => kinds[unit[i % unit.length]!]!);

/** Pick the marchers for a pattern: the unit's kinds first, then `extra` distractor kinds of the same family. */
function pickKinds(rng: Rng, family: PatternFamily, unitKinds: number, extra: number) {
  const all = rng.shuffle(FAMILY_KINDS[family]);
  return { kinds: all.slice(0, unitKinds), cart: rng.shuffle(all.slice(0, unitKinds + extra)) };
}

function buildRepeat(level: number, rng: Rng, index: number): Built {
  const p = LEVELS[level]!;
  const shape = rng.pick(p.shapes);
  const unit = UNITS[shape];
  const nKinds = new Set(unit).size;
  const family = rng.pick(FAMILIES);
  // Level 0: only the two pattern marchers in the cart. Later: one same-family distractor ("a new marcher").
  const { kinds, cart } = pickKinds(rng, family, nKinds, level === 0 ? 0 : 1);

  if (p.mode === "missing") {
    const len = unit.length === 2 ? 6 : 7;
    const at = rng.int(unit.length, len - 2); // after one whole unit, never the last marcher
    return { mode: "missing", row: repeat(kinds, unit, len), gaps: [at], unit: unit.length, cart };
  }
  // "next": at least two whole units (AB) or one unit + 2 (3-long units) before the gaps
  const gapsN = level === 1 ? 2 : level === 3 ? (index % 2 === 1 ? 2 : 1) : 1;
  const shown =
    level <= 1 ? rng.int(4, 5)
    : level === 2 ? rng.int(5, 7)
    : rng.int(5, 6);
  const len = Math.min(MAX_LEN, shown + gapsN);
  const row = repeat(kinds, unit, len);
  return { mode: "next", row, gaps: Array.from({ length: gapsN }, (_, k) => len - gapsN + k), unit: unit.length, cart };
}

function buildTranslate(level: number, rng: Rng): Built {
  const shape = rng.pick(LEVELS[level]!.shapes);
  const unit = UNITS[shape];
  const nKinds = new Set(unit).size;
  const [from, to] = rng.pick(TRANSLATIONS);
  const src = rng.shuffle(FAMILY_KINDS[from]).slice(0, nKinds);
  const { kinds, cart } = pickKinds(rng, to, nKinds, 1);
  const len = unit.length * 2;
  const row = repeat(kinds, unit, len);
  // the first unit of the band/animal row is already placed: it is the key ("duck plays drum, frog plays bell")
  return { mode: "translate", row, gaps: Array.from({ length: len - unit.length }, (_, k) => unit.length + k), source: repeat(src, unit, len), unit: unit.length, cart };
}

function buildGrow(level: number, rng: Rng, index: number): Built {
  if (level === MAX_LEVEL && index % 2 === 1) {
    // missing middle tower: s, s+1, _, s+3, s+4
    const s = rng.int(1, 3);
    const len = 5;
    const at = rng.int(1, 3);
    const v = s + at;
    return { mode: "grow", row: Array.from({ length: len }, (_, i) => towerId(s + i)), gaps: [at], unit: 1, cart: rng.shuffle([v - 1, v, v + 1]).map(towerId) };
  }
  if (level === MAX_LEVEL) {
    // next two towers: s, s+1, s+2, _, _  (cart: copy-last, the two answers, skip-one)
    const s = rng.int(1, 2);
    return { mode: "grow", row: Array.from({ length: 5 }, (_, i) => towerId(s + i)), gaps: [3, 4], unit: 1, cart: rng.shuffle([s + 2, s + 3, s + 4, s + 5]).map(towerId) };
  }
  // next tower: s, s+1, s+2, _  (cart: copy-last, +1, +2)
  const s = rng.int(1, 3);
  const last = s + 2;
  return { mode: "grow", row: Array.from({ length: 4 }, (_, i) => towerId(s + i)), gaps: [3], unit: 1, cart: rng.shuffle([last, last + 1, last + 2]).map(towerId) };
}

/** Turn a built parade into an engine exercise (answer, prompt, params, a11y text). Pure. */
export function toExercise(b: Built, level: number, index: number, seed: number, idPrefix?: string): Omit<Exercise, "difficulty"> {
  const answerKinds = b.gaps.map((g) => b.row[g]!);
  const one = b.gaps.length === 1;
  const params: Record<string, number> = { mode: MODES.indexOf(b.mode), len: b.row.length, unit: b.unit, gap: b.gaps.reduce((m, g) => m | (1 << g), 0) };
  b.row.forEach((k, i) => (params[`t${i}`] = tokenIndex(k)));
  b.source?.forEach((k, i) => (params[`s${i}`] = tokenIndex(k)));

  let answer: Exercise["answer"];
  if (one) {
    answer = { kind: "choice", correct: answerKinds[0]!, options: b.cart.map((k): AnswerOption => ({ id: k, art: k })) };
  } else {
    // interchangeable copies: enough of every marcher to fill every gap with it
    const pieces: AnswerOption[] = b.cart.flatMap((k) => b.gaps.map((_, j) => ({ id: `${k}.${j}`, art: k, text: k })));
    const used = new Map<string, number>();
    const order = answerKinds.map((k) => {
      const j = used.get(k) ?? 0;
      used.set(k, j + 1);
      return `${k}.${j}`;
    });
    answer = { kind: "sequence", order, pieces };
  }

  const family = b.mode === "translate" ? FAMILY_WORD[tokenFamilyWord(b.row[0]!)] : undefined;
  const prompt =
    b.mode === "translate" ? { line: "pp.prompt.translate", vars: { to: family! }, text: `Copy the pattern with ${family}!` }
    : b.mode === "missing" ? { line: "pp.prompt.missing", text: "Who is missing from the parade?" }
    : b.mode === "grow" ? (b.gaps.length === 2 ? { line: "pp.prompt.grow2", text: "The towers grow! What are the next two?" } : b.gaps[0] === b.row.length - 1 ? { line: "pp.prompt.grow", text: "The towers grow! What comes next?" } : { line: "pp.prompt.growMissing", text: "Which tower is missing?" })
    : one ? { line: "pp.prompt.next", text: "What comes next in the parade?" }
    : { line: "pp.prompt.next2", text: "What are the next two?" };

  const lineText = b.row.map((k, i) => (b.gaps.includes(i) ? "a gap" : labelOf(k))).join(", ");
  const a11y =
    b.mode === "translate"
      ? `Top parade: ${b.source!.map(labelOf).join(", ")}. Bottom parade copies it: ${lineText}. Fill the gaps from Puff's cart: ${b.cart.map(labelOf).join(", ")}.`
      : `Parade: ${lineText}. Fill ${one ? "the gap" : `the ${b.gaps.length} gaps`} from Puff's cart: ${b.cart.map(labelOf).join(", ")}.`;
  // every shape name starts with "A" ("an AB pattern")
  const shapeName = b.mode === "grow" ? "growing" : shapeOf(b);
  const objective =
    b.mode === "translate" ? `Copy an ${shapeName} pattern with ${family}`
    : b.mode === "missing" ? `Find the missing item in an ${shapeName} pattern`
    : b.mode === "grow" ? (one && b.gaps[0] !== b.row.length - 1 ? "Find the missing step in a growing (+1) pattern" : `Continue a growing (+1) pattern by ${b.gaps.length}`)
    : `Continue an ${shapeName} pattern by ${b.gaps.length}`;
  const skill = LEVELS[level]!.skill;
  return {
    id: `${idPrefix ?? `pp-${b.mode}`}-${answerKinds.join("-")}-l${level}n${index}`,
    skillId: skill,
    objective,
    ages: PP_AGES,
    interaction: "choose",
    answer,
    objectKind: "parade",
    seed,
    params,
    prompt,
    a11yDescription: a11y,
  };
}

function tokenFamilyWord(kind: string): PatternFamily {
  for (const f of FAMILIES) if ((FAMILY_KINDS[f] as readonly string[]).includes(kind)) return f;
  return "band";
}

/** "AB", "AAB", "ABB" or "ABC" from the first unit of the row. */
function shapeOf(b: Built): string {
  const first = b.row.slice(0, b.unit);
  const letters: string[] = [];
  const seen: string[] = [];
  for (const k of first) {
    if (!seen.includes(k)) seen.push(k);
    letters.push("ABC"[seen.indexOf(k)]!);
  }
  return letters.join("");
}

export const generatePatternParade: ExerciseGenerator = (level, rng, index) => {
  const lv = Math.max(0, Math.min(MAX_LEVEL, level));
  const mode = LEVELS[lv]!.mode;
  const b = mode === "translate" ? buildTranslate(lv, rng) : mode === "grow" ? buildGrow(lv, rng, index) : buildRepeat(lv, rng, index);
  return toExercise(b, lv, index, rng.int(1, 999_999));
};

/** Authored tutorial: star, heart, star, heart, star, _ → heart (the child must not just copy the last float). */
export function tutorialParade(): Omit<Exercise, "difficulty"> {
  const row = ["star", "heart", "star", "heart", "star", "heart"];
  const ex = toExercise({ mode: "next", row, gaps: [5], unit: 2, cart: ["star", "heart"] }, 0, 0, 7, "pp-tutorial");
  return { ...ex, id: "pp-tutorial-heart", tutorial: true, prompt: { line: "pp.prompt.tutorial", text: "What comes next in the parade?" } };
}

