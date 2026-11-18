import type { ExerciseState } from "../../engine/session";
import type { AnswerValue, Exercise } from "../../engine/types";
import { type Frac, postOf } from "./fractions";
import { type Item, itemOf } from "./generator";

/**
 * Rumble's Sleepy Trail — pure rules (no React/DOM): wrong-answer diagnosis → helper line (maths.md §4.5),
 * helper explanations and praise by mode, and trail geometry. Unit-tested.
 */

// ---------------------------------------------------------------- diagnosis

/** Denominators that have a "Each jump is one …" line. */
export const GENERAL_DS = [2, 3, 4, 5, 6, 8] as const;
const general = (d: number) => `st.hint.general.d${(GENERAL_DS as readonly number[]).includes(d) ? d : 4}`;

/**
 * Diagnose a wrong post on a marked trail. `k` = chosen post (0..M·P) on a trail with P posts per unit.
 *   equivalence: on post a     → used the posts as if they were 1/d → st.hint.size.d{d}
 *   off by one jump            → counted posts instead of jumps   → st.hint.jumps
 *   on the whole number a      → read a/d as the whole number a    → st.hint.parts
 *   on d/a                     → swapped top and bottom            → st.hint.topbottom
 *   anything else              → st.hint.general.d{d}
 */
export function diagnosePost(target: Frac, P: number, k: number): string {
  const kt = postOf(target, P);
  if (kt === null || k === kt) return general(target.d);
  // equivalence first: stopping on post a means each post was taken to be one 1/d (e.g. 1/4 → post 1 on eighths)
  if (P !== target.d && k === target.a) return `st.hint.size.d${target.d}`;
  if (Math.abs(k - kt) === 1) return "st.hint.jumps";
  if (P !== target.d) return general(target.d);
  if (target.a > 0 && k === target.a * P) return "st.hint.parts";
  if (target.a > 0 && k * target.a === target.d * P) return "st.hint.topbottom";
  return general(target.d);
}

const parseFrac = (id: string): Frac | null => {
  const m = /^f(\d+)-(\d+)$/.exec(id);
  return m ? { a: Number(m[1]), d: Number(m[2]) } : null;
};
const postNum = (id: string | undefined) => (id ? Number(id.slice(1)) : NaN);

/** First-miss helper line for any mode, from the submitted value and the engine's check. */
export function diagnose(ex: Exercise, value: AnswerValue | null, check?: ExerciseState["check"]): string {
  const it = itemOf(ex);
  const t = { a: it.a, d: it.d };
  switch (it.mode) {
    case "place":
      return typeof value === "number" ? diagnosePost(t, it.P, value) : general(it.d);
    case "name": {
      const f = typeof value === "string" ? parseFrac(value) : null;
      if (!f) return general(it.d);
      if (f.d === it.d && Math.abs(f.a - it.a) === 1) return "st.hint.jumps";
      if (f.a === it.a && f.d !== it.d) return "st.hint.parts";
      if (f.a === it.d && f.d === it.a) return "st.hint.topbottom";
      return general(it.d);
    }
    case "compare": {
      const v = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, string>) : {};
      const parts = check?.parts ?? {};
      if (parts.rumble === false) return diagnosePost(t, it.d, postNum(v.rumble));
      if (parts.bobbo === false) return diagnosePost({ a: it.a2!, d: it.d2! }, it.d2!, postNum(v.bobbo));
      // both placed right, wrong "farther": with the same top number, the bigger bottom number was picked
      return it.a === it.a2 ? "st.hint.bigger" : "st.hint.closer";
    }
    case "estimate":
      return check?.reason === "too-high" ? "st.hint.high" : "st.hint.low";
  }
}

/** Helper explanation at round start, by level (difficulty = level + 1). */
export function explainFor(ex: Exercise): string {
  const it = itemOf(ex);
  if (ex.tutorial || ex.difficulty <= 1) return "st.help.start";
  switch (it.mode) {
    case "name":
      return "st.help.top";
    case "compare":
      return "st.help.compare";
    case "estimate":
      return "st.help.estimate";
    case "place":
      if (it.P !== it.d) return "st.help.same";
      if (it.M > 1) return "st.help.beyond";
      return ex.difficulty === 2 ? "st.help.top" : "st.help.bottom";
  }
}

/** Process praise that fits what the child just did. */
export function praiseFor(ex: Exercise): string[] {
  const it = itemOf(ex);
  switch (it.mode) {
    case "name":
      return ["st.praise.6"];
    case "compare":
      return ["st.praise.5"];
    case "estimate":
      return ["st.praise.4"];
    case "place":
      return it.P !== it.d ? ["st.praise.3"] : ["st.praise.1", "st.praise.2"];
  }
}

// ---------------------------------------------------------------- geometry

export interface TrailLayout {
  vertical: boolean;
  /** px per unit along the trail */
  unit: number;
  /** px between neighbouring posts (smallest partition shown) */
  spacing: number;
  /** post hit-area diameter (≥ 44 px) */
  hit: number;
  /** critter width */
  critter: number;
  /** landmark (Mossy Rock, Big Tree…) width */
  landmark: number;
  /** trail start (t = 0) and per-lane cross-axis position */
  start: number;
  lanes: number[];
  w: number;
  h: number;
}

/** Smallest post spacing allowed before the trail turns vertical (targets are never shrunk below 44 px). */
export const MIN_SPACING = 48;

/**
 * Lay out 1–2 trails of length M with up to `posts` posts per unit in a w×h box. The trail spans ≥ 80% of the
 * long side; when posts would be closer than MIN_SPACING on a tall screen, the trail turns vertical (0 at the
 * bottom) instead of shrinking targets. Parts are always exactly equal (never compressed).
 */
export function layoutTrail(w: number, h: number, M: number, posts: number, laneCount = 1): TrailLayout {
  const n = Math.max(1, M * posts);
  const hPad = Math.max(36, Math.min(80, w * 0.07));
  const hSpacing = (w - 2 * hPad) / n;
  const vPad = Math.max(40, Math.min(70, h * 0.08));
  const vSpacing = (h - 2 * vPad) / n;
  const vertical = hSpacing < MIN_SPACING && vSpacing > hSpacing;
  const spacing = vertical ? vSpacing : hSpacing;
  const unit = spacing * posts;
  const hit = Math.round(Math.max(44, Math.min(64, spacing * 0.92)));
  const cross = vertical ? w : h;
  const laneSize = cross / laneCount;
  const critter = Math.round(Math.max(52, Math.min(vertical ? laneSize * 0.42 : laneSize * (laneCount > 1 ? 0.4 : 0.34), 130)));
  const landmark = Math.round(Math.max(40, Math.min(80, (vertical ? w * 0.16 : laneSize * 0.2))));
  const lanes = Array.from({ length: laneCount }, (_, i) => {
    if (vertical) return laneSize * i + laneSize * (laneCount > 1 ? 0.6 : 0.58);
    // horizontal: room above for the critter and jump arcs, below for the number (+ landmark on the last lane)
    const below = hit / 2 + 36 + (i === laneCount - 1 ? landmark : 0);
    const above = critter * 1.1 + 18;
    return laneSize * i + Math.max(above, Math.min(laneSize - below, laneSize * 0.52));
  });
  return { vertical, unit, spacing, hit, critter, landmark, start: vertical ? h - vPad : hPad, lanes, w, h };
}

/** Screen point of trail position t (in units) on a lane. */
export function pointAt(lay: TrailLayout, t: number, lane = 0): { x: number; y: number } {
  const along = lay.start + (lay.vertical ? -1 : 1) * t * lay.unit;
  const c = lay.lanes[lane] ?? lay.lanes[0]!;
  return lay.vertical ? { x: c, y: along } : { x: along, y: c };
}

/** Nearest trail position (in `ticks` per unit, clamped to 0..M·ticks) to a screen point. */
export function ticksAt(lay: TrailLayout, x: number, y: number, M: number, ticks: number): number {
  const t = lay.vertical ? (lay.start - y) / lay.unit : (x - lay.start) / lay.unit;
  return Math.max(0, Math.min(M * ticks, Math.round(t * ticks)));
}

/** Jumps from 0 to a fraction, in steps of 1/stepD: the landing points (units). 3/4 → [1/4, 2/4, 3/4]. */
export const jumpLandings = (a: number, stepD: number) => Array.from({ length: Math.max(0, a) }, (_, i) => (i + 1) / stepD);

export type { Item };
