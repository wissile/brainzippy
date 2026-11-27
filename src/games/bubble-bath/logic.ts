import type { ExerciseState } from "../../engine/session";
import type { AnswerValue, Exercise } from "../../engine/types";
import { SHAPES, isTipped, modeOf, paradeSlots, parseThing, parseToy, questionOf, type Shape } from "./generator";

/**
 * What Bobbo (the helper) and Gloop say, chosen per inner game, plus the diagnosis of typical wrong answers.
 * Pure: no React, no audio.
 *  - explainFor: the idea, at round start (the round's first exercise)
 *  - hintFor:    the strategy after a first miss, chosen from the wrong answer (named misconceptions below)
 *  - praiseFor:  process praise for the inner game just solved
 *  - alongSteps / alongSay: the worked example shown on the board after a second miss
 */

// ---------------------------------------------------------------- diagnosis (wrong answer → misconception)

/** Quick Look: said more (counted one twice / guessed big) or fewer (missed one) than there were. */
export type LookMiss = "over" | "under";
export const diagnoseLook = (n: number, picked: number): LookMiss => (picked > n ? "over" : "under");

/**
 * More or Fewer:
 *  same     — the tubs are equal but a tub was picked (every duck has a partner)
 *  notSame  — "same" was picked but one tub has a duck left over
 *  long     — the long-line trap: picked the spread-out row for "more" (or the bunched row for "fewer"): length ≠ number
 *  fewer    — asked "fewer", picked the tub with more (the word "fewer" is the hard part at 3–4)
 *  more     — asked "more", picked the tub with fewer
 */
export type CompareMiss = "same" | "notSame" | "long" | "fewer" | "more";
export function diagnoseCompare(ex: Pick<Exercise, "params">, picked: string): CompareMiss {
  const p = ex.params ?? {};
  const a = p.a ?? 0;
  const b = p.b ?? 0;
  if (a === b) return "same";
  if (picked === "same") return "notSame";
  const spread = p.spread ?? 0;
  const q = questionOf(ex);
  if (spread) {
    const longTub = spread === 1 ? "a" : "b";
    const lengthPick = q === "more" ? longTub : longTub === "a" ? "b" : "a";
    if (picked === lengthPick) return "long";
  }
  return q === "fewer" ? "fewer" : "more";
}

/**
 * Size Line:
 *  reverse — biggest to smallest (the order is right, the direction is not)
 *  middle  — both ends right, the middle ones swapped (compared with only one neighbour)
 *  start   — anything else: find the smallest first, then the next smallest
 */
export type SizeMiss = "reverse" | "middle" | "start";
export function diagnoseSize(order: readonly string[], submitted: readonly string[]): SizeMiss {
  const rev = [...order].reverse();
  if (submitted.length === order.length && submitted.every((id, i) => id === rev[i])) return "reverse";
  if (submitted[0] === order[0] && submitted[submitted.length - 1] === order[order.length - 1]) return "middle";
  return "start";
}

/** Shape Splash: the idea the child needs — what makes the shape (corners), or that tipped / skinny shapes still count. */
export type ShapeMiss = Shape | "tipped" | "skinny";
function shapeNeed(shape: Shape, rot: number, skinny: boolean): ShapeMiss {
  if (skinny) return "skinny";
  if (isTipped(shape, rot)) return "tipped";
  return shape;
}
/** Sort: the first toy in a wrong hole decides the hint. */
export function diagnoseSort(ex: Exercise, value: AnswerValue | null): ShapeMiss {
  const a = ex.answer;
  if (a.kind !== "match") return "circle";
  const got = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, string>) : {};
  const wrong = a.items.find((it) => got[it.id] !== undefined && got[it.id] !== a.pairs[it.id]) ?? a.items[0]!;
  const t = parseToy(wrong.art);
  return shapeNeed(t.shape, t.rot, t.skinny);
}
/** Find: what to look for in the target (its corners), or that it is still that shape when tipped or stretched. */
export function diagnoseFind(ex: Exercise): ShapeMiss {
  const a = ex.answer;
  if (a.kind !== "choice") return "circle";
  const t = parseThing(a.options.find((o) => o.id === a.correct)?.art);
  return shapeNeed(t.shape, t.rot, t.skinny);
}

/**
 * Bubble Parade:
 *  place — popped left to right along the row (reading order) instead of by the numbers
 *  skip  — a number was skipped or jumped (counting order not yet stable)
 */
export type ParadeMiss = "place" | "skip";
export function diagnoseParade(ex: Pick<Exercise, "params">, submitted: readonly string[]): ParadeMiss {
  const byPlace = [...paradeSlots(ex)].sort((x, y) => x.slot - y.slot).map((s) => `b${s.k}`);
  return submitted.length === byPlace.length && submitted.every((id, i) => id === byPlace[i]) ? "place" : "skip";
}

// ---------------------------------------------------------------- helper lines

const hasTipped = (ex: Exercise): boolean => {
  const a = ex.answer;
  if (a.kind === "match") return a.items.some((it) => { const t = parseToy(it.art); return isTipped(t.shape, t.rot); });
  if (a.kind === "choice" && modeOf(ex) === "find") return a.options.some((o) => { const t = parseThing(o.art); return isTipped(t.shape, t.rot); });
  return false;
};

export function explainFor(ex: Exercise): string {
  switch (modeOf(ex)) {
    case "sort":
      return hasTipped(ex) ? "gb.help.tipped" : "gb.help.sort";
    case "find":
      return hasTipped(ex) ? "gb.help.tipped" : "gb.help.find";
    case "look":
      return "gb.help.look";
    case "compare":
      return (ex.params?.spread ?? 0) ? "gb.help.compare.long" : "gb.help.compare";
    case "size":
      return "gb.help.size";
    case "parade":
      return "gb.help.parade";
  }
}

export function hintFor(s: ExerciseState): string {
  const ex = s.exercise;
  const v = s.lastAnswer;
  switch (modeOf(ex)) {
    case "sort":
      return `gb.hint.shape.${diagnoseSort(ex, v)}`;
    case "find":
      return `gb.hint.shape.${diagnoseFind(ex)}`;
    case "look":
      return `gb.hint.look.${diagnoseLook(ex.answer.kind === "number" ? ex.answer.value : 0, typeof v === "number" ? v : 0)}`;
    case "compare":
      return `gb.hint.compare.${diagnoseCompare(ex, typeof v === "string" ? v : "")}`;
    case "size":
      return `gb.hint.size.${diagnoseSize(ex.answer.kind === "sequence" ? ex.answer.order : [], Array.isArray(v) ? (v as string[]) : [])}`;
    case "parade":
      return `gb.hint.parade.${diagnoseParade(ex, Array.isArray(v) ? (v as string[]) : [])}`;
  }
}

export function praiseFor(ex: Exercise): string[] {
  switch (modeOf(ex)) {
    case "sort":
      return ["gb.praise.sort.1", "gb.praise.sort.2"];
    case "find":
      return ["gb.praise.find.1", "gb.praise.find.2"];
    case "look":
      return ["gb.praise.look.1", "gb.praise.look.2"];
    case "compare":
      return ex.answer.kind === "choice" && ex.answer.correct === "same" ? ["gb.praise.compare.same"] : ["gb.praise.compare.1", "gb.praise.compare.2"];
    case "size":
      return ["gb.praise.size.1", "gb.praise.size.2"];
    case "parade":
      return ["gb.praise.parade.1", "gb.praise.parade.2"];
  }
}

/** Corners counted in the find model (a circle has none: one slow trace round instead). */
export const CORNERS: Record<Shape, number> = { circle: 0, square: 4, triangle: 3 };

/** Steps of the modelled answer: bubbles counted, duck pairs drawn, pieces placed, toys dropped, corners counted, bubbles popped. */
export function alongStepsFor(ex: Exercise): number {
  const a = ex.answer;
  switch (modeOf(ex)) {
    case "look":
      return a.kind === "number" ? a.value : 0;
    case "compare":
      return Math.max(ex.params?.a ?? 0, ex.params?.b ?? 0);
    case "size":
    case "parade":
      return a.kind === "sequence" ? a.order.length : 0;
    case "sort":
      return a.kind === "match" ? a.items.length : 0;
    case "find": {
      const shape = SHAPES[ex.params?.sh ?? 0] ?? "circle";
      return Math.max(1, CORNERS[shape]);
    }
  }
}

/** Numbers spoken during the worked example: counting bubbles, popping bubbles, counting corners. */
export function alongSayFor(ex: Exercise, i: number): number | null {
  const m = modeOf(ex);
  if (m === "look" || m === "parade") return i + 1;
  if (m === "find") return CORNERS[SHAPES[ex.params?.sh ?? 0] ?? "circle"] > 0 ? i + 1 : null;
  return null;
}
