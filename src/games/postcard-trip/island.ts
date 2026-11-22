import type { Dir } from "./geo";

/**
 * Monster Island map (levels 1–5): a 6×6 grid, columns A–F left to right, rows 1–6 top to bottom (atlas style),
 * north at the top. Pure helpers for moves, grid references and descriptions.
 */
export const COLS = 6;
export const ROWS = 6;
export const CELLS = COLS * ROWS;
export const COL_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

export type Feature = "lighthouse" | "forest" | "cave" | "bridge" | "beach" | "house" | "mountain" | "lake";
export const FEATURES: readonly Feature[] = ["lighthouse", "forest", "cave", "bridge", "beach", "house", "mountain", "lake"];
export const FEATURE_NAME: Record<Feature, string> = {
  lighthouse: "lighthouse", forest: "forest", cave: "cave", bridge: "bridge", beach: "beach", house: "house", mountain: "mountain", lake: "lake",
};
/** Key symbols that look alike (the L3 distractor: "a symbol looks like the real thing"). */
export const LOOKALIKE: Record<Feature, Feature> = {
  cave: "mountain", mountain: "cave", lake: "beach", beach: "lake", house: "lighthouse", lighthouse: "house", forest: "mountain", bridge: "lake",
};
/** Features that only make sense on the coast (edge cells). */
export const COASTAL: ReadonlySet<Feature> = new Set(["lighthouse", "beach"]);

export const DELTA: Record<Dir, readonly [number, number]> = { n: [-1, 0], e: [0, 1], s: [1, 0], w: [0, -1] };

export const rc = (cell: number): [number, number] => [Math.floor(cell / COLS), cell % COLS];
export const cellAt = (r: number, c: number) => r * COLS + c;
export const isEdge = (cell: number) => {
  const [r, c] = rc(cell);
  return r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1;
};
export function step(cell: number, d: Dir): number {
  const [r, c] = rc(cell);
  const [dr, dc] = DELTA[d];
  const nr = r + dr, nc = c + dc;
  return nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS ? -1 : cellAt(nr, nc);
}
export interface Walk { cells: number[]; bump: number; end: number }
/** Cells after each move (cells[0] = start). A move off the island stops the walk (`bump` = its index, else −1). */
export function walk(start: number, moves: readonly Dir[]): Walk {
  const cells = [start];
  let at = start;
  for (let i = 0; i < moves.length; i++) {
    const n = step(at, moves[i]!);
    if (n < 0) return { cells, bump: i, end: at };
    at = n;
    cells.push(at);
  }
  return { cells, bump: -1, end: at };
}
/** Grid reference, column letter first: cell 14 → "C3". */
export const refOf = (cell: number) => {
  const [r, c] = rc(cell);
  return `${COL_LETTERS[c]}${r + 1}`;
};
/** The row/column swap misconception: column ↔ row value (B5 → E2). */
export const transposed = (cell: number) => {
  const [r, c] = rc(cell);
  return cellAt(c, r);
};
