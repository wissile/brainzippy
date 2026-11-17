import { useSyncExternalStore } from "react";

/**
 * Tiny shared store so the board (track + cart), the tray (Hop / Go buttons) and the background
 * (cave light level) see the same cart position. The GameRunner renders Board, Tray and Background
 * separately, so they can't share React state directly.
 */
export type Motion = "hop" | "roll" | "drag" | "slide" | null;

export interface CartState {
  exId: string;
  pos: number;
  motion: Motion;
  /** Increments on every hop so the bounce animation restarts. */
  hopSeq: number;
  /** Exercises solved this round → how bright the cave is (0..8). */
  lit: number;
  litIds: readonly string[];
}

let state: CartState = { exId: "", pos: 0, motion: null, hopSeq: 0, lit: 0, litIds: [] };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const cartStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** New exercise: put the cart on the start stop. A finished round (8 lit) starts dark again. */
  load(exId: string, start: number, roundLength: number) {
    if (state.exId === exId) return;
    const fresh = state.lit >= roundLength;
    state = { ...state, exId, pos: start, motion: null, lit: fresh ? 0 : state.lit, litIds: fresh ? [] : state.litIds };
    emit();
  },
  move(exId: string, pos: number, motion: Motion) {
    if (state.exId !== exId) return;
    state = { ...state, pos, motion, hopSeq: motion === "hop" ? state.hopSeq + 1 : state.hopSeq };
    emit();
  },
  light(exId: string) {
    if (state.litIds.includes(exId)) return;
    const litIds = [...state.litIds, exId];
    state = { ...state, litIds, lit: litIds.length };
    emit();
  },
  reset() {
    state = { exId: "", pos: 0, motion: null, hopSeq: 0, lit: 0, litIds: [] };
    emit();
  },
};

export function useCart(): CartState {
  return useSyncExternalStore(cartStore.subscribe, cartStore.get, cartStore.get);
}

/** Cart position for this exercise (before the board has registered it, the cart is on the start stop). */
export function usePos(exId: string, start: number): number {
  const s = useCart();
  return s.exId === exId ? s.pos : start;
}
