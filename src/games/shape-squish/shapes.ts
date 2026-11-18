/**
 * Gloop's Shape Squish — pure shape logic (no React, no DOM). Used by the generator, the board, the art and tests.
 *
 *  1. Named and unnamed 2D shapes: geometry, sides, corners, a plain-language description (a11y, no colour cues).
 *     A shape is drawn from a compact spec string `kind~rot~stretch~size~color` stored in `AnswerOption.art`,
 *     so the generator decides every rotation/stretch/size and tests can check the maths.
 *  2. Composing: pattern-block style pieces that fill an outline. Outlines are rings of equal cells around their
 *     centre (square: 4 triangles or 4 small squares; hexagon: 6 triangles). A piece covers k neighbouring cells, so
 *     pieces packed around the ring always tile exactly — the board can never show an impossible arrangement.
 */

// ---------------------------------------------------------------- named shapes

export type ShapeName = "circle" | "square" | "triangle" | "rectangle" | "hexagon";
export const SHAPE_NAMES: readonly ShapeName[] = ["circle", "square", "triangle", "rectangle", "hexagon"];

export type ShapeKind =
  | "circle" | "oval"
  | "square" | "rect"
  | "tri-eq" | "tri-right" | "tri-thin" | "tri-wide" | "tri-scalene"
  | "hexagon" | "pentagon"
  | "trapezoid" | "rhombus" | "kite" | "parallelogram";

type Pt = readonly [number, number];

interface KindInfo {
  /** The shape's name, when it is one of the five named shapes children learn here. */
  name: ShapeName | null;
  sides: number;
  corners: number;
  /** May be stretched (y-scale) without changing what it is. */
  stretchable: boolean;
  /** Plain description of the defining attributes, e.g. "4 equal sides and 4 square corners". */
  about: string;
  /** Unit polygon (≈ radius 1, y down). Circles/ovals are drawn as ellipses. */
  points?: readonly Pt[];
}

const regular = (n: number, start: number): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = ((start + (360 / n) * i) * Math.PI) / 180;
    return [Math.cos(a), Math.sin(a)] as const;
  });

export const KINDS: Record<ShapeKind, KindInfo> = {
  circle: { name: "circle", sides: 0, corners: 0, stretchable: false, about: "round all the way, with no sides and no corners" },
  oval: { name: null, sides: 0, corners: 0, stretchable: false, about: "long and round, with no corners" },
  square: { name: "square", sides: 4, corners: 4, stretchable: false, about: "4 equal sides and 4 square corners", points: [[-1, -1], [1, -1], [1, 1], [-1, 1]] },
  rect: { name: "rectangle", sides: 4, corners: 4, stretchable: false, about: "2 long sides, 2 short sides and 4 square corners", points: [[-1, -1], [1, -1], [1, 1], [-1, 1]] },
  "tri-eq": { name: "triangle", sides: 3, corners: 3, stretchable: true, about: "3 straight sides and 3 corners", points: regular(3, -90) },
  "tri-right": { name: "triangle", sides: 3, corners: 3, stretchable: true, about: "3 straight sides and 3 corners", points: [[-1, 1], [1, 1], [-1, -1]] },
  "tri-thin": { name: "triangle", sides: 3, corners: 3, stretchable: true, about: "3 straight sides and 3 corners, tall and thin", points: [[-0.42, 1], [0.42, 1], [0.05, -1.5]] },
  "tri-wide": { name: "triangle", sides: 3, corners: 3, stretchable: true, about: "3 straight sides and 3 corners, wide and flat", points: [[-1.5, 0.45], [1.5, 0.45], [0.35, -0.5]] },
  "tri-scalene": { name: "triangle", sides: 3, corners: 3, stretchable: true, about: "3 straight sides of different lengths and 3 corners", points: [[-1, 0.8], [1.25, 0.8], [-0.35, -1]] },
  hexagon: { name: "hexagon", sides: 6, corners: 6, stretchable: false, about: "6 equal sides and 6 corners", points: regular(6, 0) },
  pentagon: { name: null, sides: 5, corners: 5, stretchable: false, about: "5 sides and 5 corners", points: regular(5, -90) },
  trapezoid: { name: null, sides: 4, corners: 4, stretchable: true, about: "4 sides and 4 corners, with a long bottom and a short top", points: [[-1.25, 0.7], [1.25, 0.7], [0.6, -0.7], [-0.6, -0.7]] },
  rhombus: { name: null, sides: 4, corners: 4, stretchable: false, about: "4 equal sides and 4 corners that are not square", points: [[0, -1.3], [0.75, 0], [0, 1.3], [-0.75, 0]] },
  kite: { name: null, sides: 4, corners: 4, stretchable: true, about: "4 sides and 4 corners, shaped like a kite", points: [[0, -1.2], [0.8, -0.3], [0, 1.3], [-0.8, -0.3]] },
  parallelogram: { name: null, sides: 4, corners: 4, stretchable: false, about: "4 sides and 4 corners, leaning over", points: [[-1.3, 0.6], [0.6, 0.6], [1.3, -0.6], [-0.6, -0.6]] },
};

export const TRIANGLE_KINDS: readonly ShapeKind[] = ["tri-eq", "tri-right", "tri-thin", "tri-wide", "tri-scalene"];
export const QUAD_KINDS: readonly ShapeKind[] = ["square", "rect", "trapezoid", "rhombus", "kite", "parallelogram"];

/** Jelly colours (index = ShapeSpec.color). Colour never carries meaning: every shape is described by sides and corners. */
export const JELLY = ["#FF8FB1", "#FFD43B", "#8E6CEF", "#4D96FF", "#FF9F43", "#6BCB77"] as const;
export const JELLY_NAMES = ["pink", "yellow", "purple", "blue", "orange", "green"] as const;

export interface ShapeSpec {
  kind: ShapeKind;
  /** Rotation in degrees (clockwise). */
  rot: number;
  /** Stretch ×100: rectangles = width/height (≥ 150, never a square); stretchable kinds = vertical scale; else 100. */
  stretch: number;
  /** Size in % of its box (≈ 50–100). */
  size: number;
  /** Index into JELLY. */
  color: number;
}

export const encodeShape = (s: ShapeSpec) => `${s.kind}~${s.rot}~${s.stretch}~${s.size}~${s.color}`;

export function parseShape(art: string): ShapeSpec | null {
  const [kind, rot, stretch, size, color] = art.split("~");
  if (!kind || !(kind in KINDS)) return null;
  const n = [rot, stretch, size, color].map(Number);
  if (n.some((x) => !Number.isFinite(x))) return null;
  return { kind: kind as ShapeKind, rot: n[0]!, stretch: n[1]!, size: n[2]!, color: n[3]! };
}

export const nameOf = (s: ShapeSpec | ShapeKind) => KINDS[typeof s === "string" ? s : s.kind].name;
export const sidesOf = (s: ShapeSpec | ShapeKind) => KINDS[typeof s === "string" ? s : s.kind].sides;
export const cornersOf = (s: ShapeSpec | ShapeKind) => KINDS[typeof s === "string" ? s : s.kind].corners;

const tilted = (rot: number) => ((rot % 360) + 360) % 360 !== 0;
/** Screen-reader / caption description by attributes — never by colour alone, never by name (that would give the answer). */
export function describeShape(s: ShapeSpec): string {
  const k = KINDS[s.kind];
  const size = s.size >= 88 ? "big " : s.size <= 64 ? "small " : "";
  const turn = k.sides > 0 && tilted(s.rot) ? ", turned" : "";
  return `a ${size}shape with ${k.about}${turn}`;
}

/** Polygon points in a 100×100 box: rotated, stretched, scaled to fit `size` % and centred. Circles return []. */
export function shapePoints(s: ShapeSpec): Pt[] {
  const k = KINDS[s.kind];
  if (!k.points) return [];
  const sx = s.kind === "rect" ? s.stretch / 100 : 1;
  const sy = k.stretchable ? s.stretch / 100 : 1;
  const a = (s.rot * Math.PI) / 180;
  const pts = k.points.map(([x, y]) => {
    const X = x * sx;
    const Y = y * sy;
    return [X * Math.cos(a) - Y * Math.sin(a), X * Math.sin(a) + Y * Math.cos(a)] as const;
  });
  return fitBox(pts, s.size);
}

/** Ellipse radii (in the 100 box) for circles and ovals. */
export function ellipseOf(s: ShapeSpec): { rx: number; ry: number; rot: number } | null {
  if (s.kind === "circle") return { rx: (42 * s.size) / 100, ry: (42 * s.size) / 100, rot: 0 };
  if (s.kind === "oval") return { rx: (44 * s.size) / 100, ry: (26 * s.size) / 100, rot: s.rot };
  return null;
}

function fitBox(pts: readonly Pt[], size: number): Pt[] {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = Math.max(x1 - x0, y1 - y0) || 1;
  const k = ((84 * size) / 100) / span;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return pts.map(([x, y]) => [50 + (x - cx) * k, 50 + (y - cy) * k] as const);
}

export const toPath = (pts: readonly Pt[]) => (pts.length ? `M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(" L")} Z` : "");

/** Side lengths of a polygon (any units). */
export function sideLengths(pts: readonly Pt[]): number[] {
  return pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length]!;
    return Math.hypot(q[0] - p[0], q[1] - p[1]);
  });
}

/** Interior angles in degrees. */
export function cornerAngles(pts: readonly Pt[]): number[] {
  return pts.map((p, i) => {
    const a = pts[(i + pts.length - 1) % pts.length]!;
    const b = pts[(i + 1) % pts.length]!;
    const v1 = [a[0] - p[0], a[1] - p[1]];
    const v2 = [b[0] - p[0], b[1] - p[1]];
    const cos = (v1[0]! * v2[0]! + v1[1]! * v2[1]!) / (Math.hypot(v1[0]!, v1[1]!) * Math.hypot(v2[0]!, v2[1]!));
    return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  });
}

/** Geometric check used by tests: does this drawn polygon really have the attributes its name requires? */
export function classify(pts: readonly Pt[]): ShapeName | null {
  const n = pts.length;
  if (n === 3) return "triangle";
  const sides = sideLengths(pts);
  const angles = cornerAngles(pts);
  const eq = (a: number, b: number) => Math.abs(a - b) / Math.max(a, b) < 0.03;
  if (n === 4 && angles.every((x) => Math.abs(x - 90) < 1.5)) return sides.every((s) => eq(s, sides[0]!)) ? "square" : "rectangle";
  if (n === 6 && sides.every((s) => eq(s, sides[0]!))) return "hexagon";
  return null;
}

// ---------------------------------------------------------------- composing (pattern-block pieces)

export type PieceKind = "c-half" | "c-qtri" | "c-rect" | "c-sq" | "c-trap" | "c-rh" | "c-tri";
export type Family = "diag" | "grid" | "hex";
export type OutlineType = "square" | "hexagon";
export const OUTLINES: readonly OutlineType[] = ["square", "hexagon"];

interface PieceInfo {
  family: Family;
  cells: number;
  sides: number;
  /** Shape polygon centred on its bounding box, in outline units (square side 100, hexagon side 60). */
  points: readonly Pt[];
  about: string;
}

const H = 60 * Math.sin(Math.PI / 3); // height of the 60-unit equilateral triangle ≈ 51.96
export const PIECES: Record<PieceKind, PieceInfo> = {
  "c-half": { family: "diag", cells: 2, sides: 3, points: [[-50, -50], [50, -50], [50, 50]], about: "big triangle with a square corner" },
  "c-qtri": { family: "diag", cells: 1, sides: 3, points: [[-50, -25], [50, -25], [0, 25]], about: "small triangle with a square corner" },
  "c-rect": { family: "grid", cells: 2, sides: 4, points: [[-50, -25], [50, -25], [50, 25], [-50, 25]], about: "rectangle" },
  "c-sq": { family: "grid", cells: 1, sides: 4, points: [[-25, -25], [25, -25], [25, 25], [-25, 25]], about: "small square" },
  "c-trap": { family: "hex", cells: 3, sides: 4, points: [[-60, H / 2], [60, H / 2], [30, -H / 2], [-30, -H / 2]], about: "trapezoid, 4 sides with a long bottom" },
  "c-rh": { family: "hex", cells: 2, sides: 4, points: [[0, -30], [H, 0], [0, 30], [-H, 0]], about: "diamond with 4 equal sides" },
  "c-tri": { family: "hex", cells: 1, sides: 3, points: [[-30, H / 2], [30, H / 2], [0, -H / 2]], about: "triangle with 3 equal sides" },
};

export const OUTLINE_INFO: Record<OutlineType, { cells: number; families: readonly Family[] }> = {
  square: { cells: 4, families: ["diag", "grid"] },
  hexagon: { cells: 6, families: ["hex"] },
};

export interface PieceSpec {
  kind: PieceKind;
  rot: number;
  color: number;
}
export const encodePiece = (p: PieceSpec) => `${p.kind}~${p.rot}~${p.color}`;
export function parsePiece(art: string): PieceSpec | null {
  const [kind, rot, color] = art.split("~");
  if (!kind || !(kind in PIECES)) return null;
  const r = Number(rot);
  const c = Number(color);
  return Number.isFinite(r) && Number.isFinite(c) ? { kind: kind as PieceKind, rot: r, color: c } : null;
}

export function piecePoints(p: PieceSpec): Pt[] {
  const a = (p.rot * Math.PI) / 180;
  return PIECES[p.kind].points.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)] as const);
}

/** Can `piece` go into an outline that already holds `inside` (piece kinds)? Same family, and enough free cells. */
export function fits(outline: OutlineType, inside: readonly PieceKind[], piece: PieceKind): boolean {
  const info = OUTLINE_INFO[outline];
  const p = PIECES[piece];
  if (!info.families.includes(p.family)) return false;
  if (inside.length > 0 && PIECES[inside[0]!].family !== p.family) return false;
  return usedCells(inside) + p.cells <= info.cells;
}
export const usedCells = (inside: readonly PieceKind[]) => inside.reduce((n, k) => n + PIECES[k].cells, 0);
export const isFull = (outline: OutlineType, inside: readonly PieceKind[]) => inside.length > 0 && usedCells(inside) === OUTLINE_INFO[outline].cells;

const SQ: Pt[] = [[-50, -50], [50, -50], [50, 50], [-50, 50]];
const HEX: Pt[] = Array.from({ length: 6 }, (_, i) => [60 * Math.cos((i * Math.PI) / 3), 60 * Math.sin((i * Math.PI) / 3)] as const);
const QUAD: Pt[][] = [
  [[-50, -50], [0, -50], [0, 0], [-50, 0]],
  [[0, -50], [50, -50], [50, 0], [0, 0]],
  [[0, 0], [50, 0], [50, 50], [0, 50]],
  [[-50, 0], [0, 0], [0, 50], [-50, 50]],
];

/** The outline's border polygon (outline units, centred on 0,0). */
export const outlinePoints = (o: OutlineType): Pt[] => (o === "square" ? SQ : HEX);

/** Polygon a piece of `cells` cells occupies when packed at ring position `start` (family decides the ring). */
export function cellPolygon(family: Family, start: number, cells: number): Pt[] {
  if (family === "grid") {
    const qs = Array.from({ length: cells }, (_, i) => QUAD[(start + i) % 4]!).flat();
    const xs = qs.map((p) => p[0]);
    const ys = qs.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  }
  const ring = family === "hex" ? HEX : SQ;
  const n = ring.length;
  const pts: Pt[] = cells >= n ? [] : [[0, 0]];
  for (let i = 0; i <= Math.min(cells, n - 1); i++) pts.push(ring[(start + i) % n]!);
  return dedupeCollinear(pts);
}

/** Drop points that sit on a straight line between their neighbours (e.g. the centre of a half-square). */
function dedupeCollinear(pts: Pt[]): Pt[] {
  return pts.filter((p, i) => {
    const a = pts[(i + pts.length - 1) % pts.length]!;
    const b = pts[(i + 1) % pts.length]!;
    return Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) > 1e-6;
  });
}

/** Where each packed piece sits: pieces fill the ring in order, so any fitting sequence tiles exactly. */
export function packOutline(inside: readonly PieceKind[]): { kind: PieceKind; points: Pt[] }[] {
  let start = 0;
  return inside.map((kind) => {
    const p = PIECES[kind];
    const points = cellPolygon(p.family, start, p.cells);
    start += p.cells;
    return { kind, points };
  });
}

/** The empty cells (the "gap") after packing, as polygons — shown as a hint after a miss. */
export function gapCells(inside: readonly PieceKind[], outline: OutlineType): Pt[][] {
  if (inside.length === 0) return [];
  const fam = PIECES[inside[0]!].family;
  const total = OUTLINE_INFO[outline].cells;
  const out: Pt[][] = [];
  for (let c = usedCells(inside); c < total; c++) out.push(cellPolygon(fam, c, 1));
  return out;
}

/**
 * Every way to fill `count` outlines exactly from a subset of `pieces`: returns the subsets (as sorted index lists)
 * whose pieces split into `count` groups, each one family that fills the outline. Brute force (≤ 2^9 subsets).
 */
export function fillingSubsets(outline: OutlineType, count: number, pieces: readonly PieceKind[]): number[][] {
  const out: number[][] = [];
  const n = pieces.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const idx = Array.from({ length: n }, (_, i) => i).filter((i) => mask & (1 << i));
    if (partition(outline, count, idx.map((i) => pieces[i]!)) !== null) out.push(idx);
  }
  return out;
}

/**
 * Split `pieces` into `count` groups that each fill the outline exactly (one family per group), or null.
 * Deterministic: the first group found keeps the lowest indices it can.
 */
export function partition(outline: OutlineType, count: number, pieces: readonly PieceKind[]): number[][] | null {
  const info = OUTLINE_INFO[outline];
  if (pieces.some((k) => !info.families.includes(PIECES[k].family))) return null;
  if (usedCells(pieces) !== info.cells * count) return null;
  const n = pieces.length;
  const rec = (left: number[], k: number): number[][] | null => {
    if (k === 0) return left.length === 0 ? [] : null;
    if (k === 1) {
      const kinds = left.map((i) => pieces[i]!);
      return kinds.length && new Set(kinds.map((x) => PIECES[x].family)).size === 1 && usedCells(kinds) === info.cells ? [left] : null;
    }
    const first = left[0]!;
    const rest = left.slice(1);
    for (let mask = 0; mask < 1 << rest.length; mask++) {
      const group = [first, ...rest.filter((_, j) => mask & (1 << j))];
      const kinds = group.map((i) => pieces[i]!);
      if (new Set(kinds.map((x) => PIECES[x].family)).size !== 1 || usedCells(kinds) !== info.cells) continue;
      const more = rec(left.filter((i) => !group.includes(i)), k - 1);
      if (more) return [group, ...more];
    }
    return null;
  };
  return rec(Array.from({ length: n }, (_, i) => i), count);
}

/** Two groups are "different ways" when they are not the same collection of piece kinds. */
export const sameWay = (a: readonly PieceKind[], b: readonly PieceKind[]) => [...a].sort().join() === [...b].sort().join();

export function describePiece(p: PieceSpec): string {
  const turn = tilted(p.rot) ? ", turned" : "";
  return `a ${PIECES[p.kind].about}${turn}`;
}
