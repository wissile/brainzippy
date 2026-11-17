/**
 * Deterministic object placement (pure). Objects sit in jittered grid cells chosen by a seeded shuffle,
 * so they look naturally scattered but can never overlap: each object is at most OBJECT_FRACTION of its
 * cell and jitter is bounded so a gap always remains (see tests/unit/layout.test.ts).
 */
export interface Pos {
  x: number; // centre, % of field width
  y: number; // centre, % of field height
  r: number; // rotation, degrees
}
export interface Layout {
  positions: Pos[];
  cols: number;
  rows: number;
}

export const OBJECT_FRACTION = 0.78;
const JITTER = 0.15; // total jitter range as a fraction of a cell

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Grid shape for `slots` cells in a field of width/height ratio `aspect`, favouring square-ish cells. */
export function gridFor(slots: number, aspect: number): { cols: number; rows: number } {
  let best = { cols: slots, rows: 1, score: Infinity };
  for (let cols = 1; cols <= slots; cols++) {
    const rows = Math.ceil(slots / cols);
    const cellAspect = aspect / cols / (1 / rows); // cell width / cell height
    const score = Math.abs(Math.log(cellAspect)) + (cols * rows - slots) * 0.05;
    if (score < best.score) best = { cols, rows, score };
  }
  return { cols: best.cols, rows: best.rows };
}

export function layoutObjects(count: number, layout: "scatter" | "row" | "ten-frame", seed: number, aspect = 1.6): Layout {
  const a = Math.max(0.3, Math.min(6, Math.round(aspect * 10) / 10));
  const rand = mulberry32(seed * 7919 + count);

  if (layout === "ten-frame") {
    return { cols: 5, rows: 2, positions: Array.from({ length: count }, (_, i) => ({ x: 10 + (i % 5) * 20, y: i < 5 ? 25 : 75, r: 0 })) };
  }
  if (layout === "row") {
    const { cols, rows } = gridFor(count, a);
    return {
      cols,
      rows,
      positions: Array.from({ length: count }, (_, i) => ({ x: (((i % cols) + 0.5) / cols) * 100, y: ((Math.floor(i / cols) + 0.5) / rows) * 100, r: 0 })),
    };
  }

  const slots = count <= 2 ? count + 1 : Math.ceil(count * 1.35);
  const { cols, rows } = gridFor(slots, a);
  const cells = Array.from({ length: cols * rows }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cells[i], cells[j]] = [cells[j]!, cells[i]!];
  }
  const chosen = cells.slice(0, count).sort((p, q) => p - q);
  const positions = chosen.map((c) => {
    const col = c % cols;
    const row = Math.floor(c / cols);
    return {
      x: ((col + 0.5 + (rand() - 0.5) * JITTER) / cols) * 100,
      y: ((row + 0.5 + (rand() - 0.5) * JITTER) / rows) * 100,
      r: (rand() - 0.5) * 24,
    };
  });
  return { positions, cols, rows };
}
