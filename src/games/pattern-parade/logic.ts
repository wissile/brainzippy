import type { AnswerKey, AnswerValue, Exercise } from "../../engine/types";
import { MODES, type Mode } from "./generator";
import { TOKEN_IDS, towerSize } from "./tokens";

/**
 * Board-independent logic for Puff's Pattern Parade (pure, unit-tested).
 * Decodes the parade line from exercise params and maps marchers placed in gaps to an engine answer value.
 */
export interface Cell {
  kind: string;
  /** Gap number (0-based, left to right) or -1 for a marcher already in the parade. */
  gap: number;
}
export interface Parade {
  mode: Mode;
  row: Cell[];
  /** Translate: the pattern being copied (shown above the row). */
  source: string[] | null;
  unit: number;
  /** Marchers in Puff's cart (option ids / piece kinds), in display order. */
  cart: string[];
  /** The right marcher for each gap. */
  answer: string[];
}

const kindAt = (i: number | undefined) => TOKEN_IDS[i ?? 0] ?? TOKEN_IDS[0]!;

export function decodeParade(ex: Exercise): Parade {
  const p = ex.params ?? {};
  const len = p.len ?? 0;
  const mask = p.gap ?? 0;
  const mode = MODES[p.mode ?? 0] ?? "next";
  let g = 0;
  const row: Cell[] = Array.from({ length: len }, (_, i) => ({ kind: kindAt(p[`t${i}`]), gap: mask & (1 << i) ? g++ : -1 }));
  const source = mode === "translate" ? Array.from({ length: len }, (_, i) => kindAt(p[`s${i}`])) : null;
  return { mode, row, source, unit: p.unit ?? 1, cart: cartOf(ex), answer: row.filter((c) => c.gap >= 0).map((c) => c.kind) };
}

/** The marchers offered in the cart: choice options, or each piece kind once (first-appearance order). */
export function cartOf(ex: Exercise): string[] {
  const a = ex.answer;
  if (a.kind === "choice") return a.options.map((o) => o.id);
  if (a.kind === "sequence") return [...new Set(a.pieces.map((pc) => pc.text ?? pc.id))];
  return [];
}

/** A marcher is out of the cart once a hint greyed out any copy of it (all copies are interchangeable). */
export function kindOut(ex: Exercise, eliminated: readonly AnswerKey[], kind: string): boolean {
  const a = ex.answer;
  if (a.kind === "choice") return eliminated.includes(kind);
  if (a.kind === "sequence") return a.pieces.some((pc) => (pc.text ?? pc.id) === kind && eliminated.includes(pc.id));
  return false;
}

/** The engine value for the marchers in the gaps, or null while any gap is empty. */
export function valueFor(ex: Exercise, filled: readonly (string | null)[], eliminated: readonly AnswerKey[] = []): AnswerValue | null {
  if (filled.length === 0 || filled.some((k) => !k)) return null;
  const a = ex.answer;
  if (a.kind === "choice") return filled[0]!;
  if (a.kind !== "sequence") return null;
  const used = new Set<string>();
  const ids: string[] = [];
  for (const k of filled) {
    const pc = a.pieces.find((x) => (x.text ?? x.id) === k && !used.has(x.id) && !eliminated.includes(x.id));
    if (!pc) return null;
    used.add(pc.id);
    ids.push(pc.id);
  }
  return ids;
}

/** Marcher kinds of a submitted/modelled value (choice id or piece ids → kinds). */
export function kindsOf(ex: Exercise, v: AnswerValue | null): string[] {
  const a = ex.answer;
  if (typeof v === "string") return [v];
  if (Array.isArray(v) && a.kind === "sequence") return (v as readonly string[]).map((id) => a.pieces.find((p) => p.id === id)?.text ?? id);
  return [];
}

/** Repeating-unit chunks along the row (for the "box the part that repeats" hint). Growing patterns: none. */
export function chunks(parade: Parade): { start: number; end: number; hasGap: boolean }[] {
  if (parade.mode === "grow" || parade.unit < 2) return [];
  const out: { start: number; end: number; hasGap: boolean }[] = [];
  for (let s = 0; s < parade.row.length; s += parade.unit) {
    const end = Math.min(parade.row.length, s + parade.unit) - 1;
    out.push({ start: s, end, hasGap: parade.row.slice(s, end + 1).some((c) => c.gap >= 0) });
  }
  return out;
}

/** Worked example: march along the whole row, one marcher per step. */
export const alongSteps = (ex: Exercise): number => ex.params?.len ?? 0;
/** Growing towers are counted aloud during the worked example; repeating patterns are "sung" by sound, not numbers. */
export function alongSay(ex: Exercise, i: number): number | null {
  const p = decodeParade(ex);
  if (p.mode !== "grow") return null;
  const c = p.row[i];
  return c ? towerSize(c.kind) : null;
}

/** Row layout: how many cells per line and how big, so every gap stays ≥ minCell (64 px for under-7s). */
export function rowLayout(n: number, width: number, height: number, rows: 1 | 2, opts: { minCell?: number; maxCell?: number; gap?: number } = {}) {
  const min = opts.minCell ?? 64;
  const max = opts.maxCell ?? 120;
  const gap = opts.gap ?? 8;
  const fit = (perLine: number) => {
    const lines = Math.ceil(n / perLine);
    const byW = (width - gap * (perLine - 1)) / perLine;
    const byH = (height - gap * (lines * rows - 1)) / (lines * rows);
    return { perLine, lines, cell: Math.floor(Math.min(max, byW, byH)) };
  };
  let best = fit(n);
  if (best.cell < min) {
    // wrap onto more lines (balanced), keep the biggest cell
    for (let lines = 2; lines <= n; lines++) {
      const f = fit(Math.ceil(n / lines));
      if (f.cell > best.cell) best = f;
      if (f.cell >= min) break;
    }
  }
  return { ...best, cell: Math.max(min, best.cell) };
}
