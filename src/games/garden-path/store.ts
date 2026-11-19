import { useSyncExternalStore } from "react";
import type { Exercise } from "../../engine/types";
import { type Card, type Target, initialProgram } from "./edit";
import { type Diagnosis, type Slot, decodePuzzle } from "./logic";

/**
 * Board ↔ tray channel for one exercise. The board (garden + program strip) owns the logic and registers its
 * actions; the tray (card palette + Go) reads the program and calls them. Keyed by exercise id, so a stale value
 * never leaks into the next puzzle.
 */
export interface Mark { top: number; body: number; count?: boolean }
export interface GpShared {
  exId: string;
  program: Slot[];
  running: boolean;
  /** Second miss: the intended program shown as ghost cards. */
  model: boolean;
  /** The block to wobble after a miss (the first step that went wrong). */
  mark: Mark | null;
  /** Why the last run failed (the helper's first-miss line is chosen from it). */
  diagnosis: Diagnosis | null;
}
export interface GpApi {
  add(card: Card): void;
  placeAt(t: Target | null, card: Card): void;
  go(): void;
}

let current: GpShared = { exId: "", program: [], running: false, model: false, mark: null, diagnosis: null };
const listeners = new Set<() => void>();
let api: GpApi | null = null;

const fresh = (ex: Exercise): GpShared => ({ exId: ex.id, program: initialProgram(decodePuzzle(ex)), running: false, model: false, mark: null, diagnosis: null });

export const gpStore = {
  get: (): GpShared => current,
  /** Make sure the store holds this exercise (silently: safe to call during render). */
  ensure(ex: Exercise): GpShared {
    if (current.exId !== ex.id) current = fresh(ex);
    return current;
  },
  set(exId: string, patch: Partial<GpShared>) {
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
  setApi(a: GpApi | null) {
    api = a;
  },
  api: (): GpApi | null => api,
};

export function useGp(ex: Exercise): GpShared {
  gpStore.ensure(ex);
  const s = useSyncExternalStore(gpStore.subscribe, gpStore.get, gpStore.get);
  return s.exId === ex.id ? s : gpStore.ensure(ex);
}
