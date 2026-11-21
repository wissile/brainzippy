import { useSyncExternalStore } from "react";
import type { Exercise } from "../../engine/types";
import type { Dir } from "./geo";

/**
 * Board ↔ tray channel for one exercise. The board (the map) owns the logic and registers its actions; the tray
 * (compass pad, postcards, answer buttons) reads this state and calls them. Keyed by exercise id, so nothing
 * leaks into the next mission.
 */
export interface PcShared {
  exId: string;
  /** Island route plan (compass cards in the strip). */
  plan: Dir[];
  /** Yonder is walking / the balloon is flying. */
  running: boolean;
  /** Picked-up postcard or boat (tap-tap and keyboard). */
  held: string | null;
  /** Where cards sit: cards mode item → continent; trip slot "0".."2" → card id. */
  placed: Record<string, string>;
  /** First-miss helper line chosen from the miss (island steering). */
  diagnosis: string | null;
  /** The compass rose glows (first miss on a direction mission). */
  roseGlow: boolean;
}
export interface PcApi {
  press(d: Dir): void;
  removeAt(i: number): void;
  walk(): void;
  pick(id: string | null): void;
  drop(target: string, card?: string): void;
  choose(id: string): void;
}

let current: PcShared = { exId: "", plan: [], running: false, held: null, placed: {}, diagnosis: null, roseGlow: false };
const listeners = new Set<() => void>();
let api: PcApi | null = null;

const fresh = (ex: Exercise): PcShared => ({ exId: ex.id, plan: [], running: false, held: null, placed: {}, diagnosis: null, roseGlow: false });

export const pcStore = {
  get: (): PcShared => current,
  ensure(ex: Exercise): PcShared {
    if (current.exId !== ex.id) current = fresh(ex);
    return current;
  },
  set(exId: string, patch: Partial<PcShared>) {
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
  setApi(a: PcApi | null) {
    api = a;
  },
  api: (): PcApi | null => api,
};

export function usePc(ex: Exercise): PcShared {
  pcStore.ensure(ex);
  const s = useSyncExternalStore(pcStore.subscribe, pcStore.get, pcStore.get);
  return s.exId === ex.id ? s : pcStore.ensure(ex);
}
