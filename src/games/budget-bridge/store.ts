import { useSyncExternalStore } from "react";
import type { Exercise } from "../../engine/types";
import { type Cell, type Diagnosis, type Piece, type Segment, decodePuzzle, grade, initialDesign } from "./logic";

/**
 * Board ↔ tray channel for one exercise. The board (river, bridge, budget) owns the logic and registers its
 * actions; the tray (pieces + Test) reads the state and calls them. Keyed by exercise id, so a stale value never
 * leaks into the next site.
 */
export type Tool = Piece | "erase";
export interface TestResult {
  segments: Segment[];
  /** Index (in `segments`) of the span that sagged, or −1 when every span held. */
  failAt: number;
  overBudget: boolean;
}
export interface BbShared {
  exId: string;
  design: Cell[];
  /** The piece picked up in the tray (tap a gap to put it there), or null. */
  armed: Tool | null;
  /** The gap picked first (tap a piece to put it there), or null. */
  selected: number | null;
  running: boolean;
  /** Second miss: the solution shows as ghost pieces. */
  model: boolean;
  /** The last load test (badges per span); cleared by an edit. */
  result: TestResult | null;
  /** The span that sagged: it keeps glowing until one of its cells changes. */
  weak: [number, number] | null;
  /** The design as it was tested, and why it missed (the helper's first-miss line and the praise come from it). */
  tested: Cell[] | null;
  diagnosis: Diagnosis | null;
  /** Gaps without a deck, flashed when Test is pressed too early. */
  holes: number[];
  /** The gap under a piece being dragged. */
  hot: number | null;
}
export interface BbApi {
  tapPiece(t: Tool): void;
  tapCell(i: number): void;
  drop(t: Tool, i: number | null): void;
  test(): void;
}

let current: BbShared = { exId: "", design: [], armed: null, selected: null, running: false, model: false, result: null, weak: null, tested: null, diagnosis: null, holes: [], hot: null };
const listeners = new Set<() => void>();
let api: BbApi | null = null;

function fresh(ex: Exercise): BbShared {
  const pz = decodePuzzle(ex);
  const design = initialDesign(pz);
  // the improve level opens on the earlier load test: the span that sagged is already glowing
  let result: TestResult | null = null;
  if (pz.given) {
    const g = grade(pz, design);
    result = { segments: g.segments, failAt: g.segments.findIndex((s) => s.tooWeak || s.tooLong), overBudget: !g.rules.budget };
  }
  return { exId: ex.id, design, armed: null, selected: null, running: false, model: false, result, weak: pz.weak, tested: null, diagnosis: null, holes: [], hot: null };
}

export const bbStore = {
  get: (): BbShared => current,
  ensure(ex: Exercise): BbShared {
    if (current.exId !== ex.id) current = fresh(ex);
    return current;
  },
  set(exId: string, patch: Partial<BbShared>) {
    if (exId !== current.exId) return;
    current = { ...current, ...patch };
    for (const l of listeners) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  setApi(a: BbApi | null) {
    api = a;
  },
  api: (): BbApi | null => api,
};

export function useBb(ex: Exercise): BbShared {
  bbStore.ensure(ex);
  const s = useSyncExternalStore(bbStore.subscribe, bbStore.get, bbStore.get);
  return s.exId === ex.id ? s : bbStore.ensure(ex);
}
