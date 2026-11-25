import type { LearningPath } from "../registry";
import islandsJson from "./islands.json";

/**
 * Islands for the ocean map and the journey islands (D-041, docs/PATHS.md). Pure data + geometry; no React.
 * Art and the stop bands come from scripts/gen_islands.py (which checks every band stays on grass and clear of
 * the island's trees and buildings for 5–8 stops). Island coordinates are 0..1 of the island's 480×300 art.
 */

export type Pt = { x: number; y: number };
export interface Box { x: number; y: number; w: number; h: number }

/** Island art id per library (path id). Libraries without their own island yet use "generic". */
const ART_OF: Record<string, string> = {
  english: "word-woods",
  math: "number-hill",
  pilot: "sky-school",
  sci: "fizz-lab",
  cs: "code-garden",
  nature: "wild-shore",
};
export const ISLAND_ASPECT = 480 / 300;
export const HOME_ASPECT = 240 / 160;

const DATA = islandsJson as Record<string, { line: number[][]; spots: number[][] }>;

export const artIdOf = (pathId: string): string => ART_OF[pathId] ?? "generic";

/** Stops shown on an island for an age band: young children see a short trail, older ones a longer one. */
export function stopsForAge(band: readonly [number, number]): number {
  const age = band[0];
  return age <= 5 ? 5 : age <= 8 ? 7 : 8;
}

/** n points spread evenly (by length) along the island's checked stop band. */
export function trailPoints(artId: string, n: number): Pt[] {
  const line = (DATA[artId] ?? DATA.generic!).line.map(([x, y]) => ({ x: x!, y: y! }));
  if (n <= 1) return [line[Math.floor(line.length / 2)]!];
  const seg = line.slice(1).map((b, i) => Math.hypot(b.x * 480 - line[i]!.x * 480, b.y * 300 - line[i]!.y * 300));
  const total = seg.reduce((a, b) => a + b, 0);
  return Array.from({ length: n }, (_, i) => {
    let d = (total * i) / (n - 1);
    let j = 0;
    while (j < seg.length - 1 && d > seg[j]!) d -= seg[j++]!;
    const t = seg[j] ? Math.min(1, d / seg[j]!) : 0;
    const a = line[j]!, b = line[j + 1]!;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  });
}

/** Where the host (0) and a friend (1) stand: bottom-centre of the figure, island coordinates. */
export const spotsOf = (artId: string): Pt[] => (DATA[artId] ?? DATA.generic!).spots.map(([x, y]) => ({ x: x!, y: y! }));

// ------------------------------------------------------------------------------------------- stops (levels)

export interface IslandStop {
  world: LearningPath["worlds"][number];
  /** 0-based level of that world (0..maxLevel, maxLevel is the highest). */
  level: number;
  state: "done" | "here" | "today" | "later";
  /** Last stop of the whole path. */
  last: boolean;
}

/**
 * The window of stops shown on the island: each stop is one level of one of the path's worlds, in trail order.
 * Starts `behind` stops (at most 2) before the current one, so the child sees what they did (callers pass only as
 * many as were really played: a child placed in the middle of a path sees no ticks for stops they skipped), holds
 * `n` stops, and marks the current stop, the next ones the child can still play today (`todayLeft` rounds,
 * including the current one) and the rest as later.
 */
export function stopWindow(path: Pick<LearningPath, "worlds">, current: { index: number; level: number }, n: number, todayLeft: number, behind = 2): IslandStop[] {
  // a world's stops run from level 0 to its hand-off level (where the path moves on), the last world's to its top level
  const lastLevel = (i: number) => {
    const w = path.worlds[i]!;
    return i === path.worlds.length - 1 ? w.maxLevel : Math.max(0, Math.min(w.maxLevel, w.handoff ?? w.maxLevel));
  };
  const all: { world: LearningPath["worlds"][number]; level: number }[] = [];
  path.worlds.forEach((world, i) => {
    for (let level = 0; level <= lastLevel(i); level++) all.push({ world, level });
  });
  if (!all.length) return [];
  const curWorld = path.worlds[current.index];
  let at = curWorld ? all.findIndex((s) => s.world === curWorld && s.level === Math.max(0, Math.min(current.level, lastLevel(current.index)))) : -1;
  if (at < 0) at = 0;
  const size = Math.min(n, all.length);
  const start = Math.max(0, Math.min(at - Math.max(0, Math.min(2, behind)), all.length - size));
  return all.slice(start, start + size).map((s, k) => {
    const i = start + k;
    const state = i < at ? "done" : i === at ? "here" : i < at + Math.max(1, todayLeft) ? "today" : "later";
    return { ...s, state, last: i === all.length - 1 };
  });
}

// ------------------------------------------------------------------------------------------- ocean layout

/**
 * Ocean stage in virtual units (the screen scales it to its width and scrolls if it is taller): landscape 1600 wide,
 * portrait 900 wide, at least 900 / 1600 tall and taller when there are many islands. Returns a box per island (in
 * order) and the home islet. Islands keep the art's 1.6 aspect; up to two islands are drawn big.
 */
export function oceanLayout(count: number, portrait: boolean): { stage: { w: number; h: number }; islands: Box[]; home: Box } {
  const isl = (cx: number, cy: number, w: number): Box => ({ x: cx - w / 2, y: cy - w / ISLAND_ASPECT / 2, w, h: w / ISLAND_ASPECT });
  const homeAt = (cx: number, cy: number, w: number): Box => ({ x: cx - w / 2, y: cy - w / HOME_ASPECT / 2, w, h: w / HOME_ASPECT });
  const n = Math.max(0, count);
  if (portrait) {
    if (n <= 2) return { stage: { w: 900, h: 1600 }, islands: [isl(450, 330, 680), isl(450, 1250, 680)].slice(0, n), home: homeAt(450, 790, 300) };
    const rowY = (r: number) => (r === 0 ? 300 : 980 + (r - 1) * 340);
    const islands = Array.from({ length: n }, (_, i) => isl(i % 2 ? 665 : 235, rowY(Math.floor(i / 2)) + (i % 2 ? 50 : 0), 380));
    const h = Math.max(1600, rowY(Math.ceil(n / 2) - 1) + 300);
    return { stage: { w: 900, h }, islands, home: homeAt(450, 640, 300) };
  }
  if (n <= 2) return { stage: { w: 1600, h: 900 }, islands: [isl(420, 400, 620), isl(1190, 420, 620)].slice(0, n), home: homeAt(800, 735, 270) };
  if (n <= 4) {
    const slots: Pt[] = [{ x: 340, y: 270 }, { x: 1260, y: 270 }, { x: 340, y: 650 }, { x: 1260, y: 650 }];
    return { stage: { w: 1600, h: 900 }, islands: slots.slice(0, n).map((s) => isl(s.x, s.y, 520)), home: homeAt(800, 480, 280) };
  }
  const rowY = (r: number) => (r === 0 ? 250 : 710 + (r - 1) * 430);
  const islands = Array.from({ length: n }, (_, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    return isl([270, 800, 1330][col]!, rowY(row) + (col === 1 ? (row === 0 ? -20 : 20) : 0), 440);
  });
  const h = Math.max(900, rowY(Math.ceil(n / 3) - 1) + 230);
  return { stage: { w: 1600, h }, islands, home: homeAt(800, 478, 230) };
}

/** Where a boat parks: an island's lower-left shallows, or the home islet's dock. Stage units. */
export function dockOf(box: Box, home = false): Pt {
  // home: just off the end of the jetty; islands: the water off the left shore (clear of the name plaque below)
  return home ? { x: box.x + box.w * 1.1, y: box.y + box.h * 0.42 } : { x: box.x + box.w * 0.02, y: box.y + box.h * 0.62 };
}

/** A gentle curve between two docks (SVG path, stage units) for the boat to follow. */
export function sailPath(a: Pt, b: Pt): string {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
  const bend = Math.min(120, len * 0.25);
  const c = { x: mx - (dy / len) * bend, y: my + (dx / len) * bend };
  const f = (v: number) => Math.round(v);
  return `M${f(a.x)} ${f(a.y)} Q${f(c.x)} ${f(c.y)} ${f(b.x)} ${f(b.y)}`;
}
