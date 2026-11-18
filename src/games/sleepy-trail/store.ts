import { useSyncExternalStore } from "react";

/**
 * Shared trail state: the GameRunner renders Board, Tray and Background separately, so Rumble's (and Bobbo's)
 * positions and the round's pillow count live in this tiny store. Positions are in TICKS: posts for marked
 * trails, 24ths of a unit for estimates.
 */
export type Who = "rumble" | "bobbo";
export type Motion = "walk" | "drag" | "jump" | "back" | null;

export interface TrailState {
  exId: string;
  pos: Record<Who, number>;
  /** has the child moved this critter yet? (compare: both must be placed before answering) */
  placed: Record<Who, boolean>;
  /** critter the arrow keys move */
  active: Who;
  motion: Motion;
  /** pillows placed this round (background gets darker / starrier) */
  done: number;
  doneIds: readonly string[];
}

const fresh = (): TrailState => ({ exId: "", pos: { rumble: 0, bobbo: 0 }, placed: { rumble: false, bobbo: false }, active: "rumble", motion: null, done: 0, doneIds: [] });
let state: TrailState = fresh();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const trailStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** New exercise: critters back to Mossy Rock (or to a fixed spot, e.g. "name the fraction"). */
  load(exId: string, start: Partial<Record<Who, number>> = {}, roundLength = 8) {
    if (state.exId === exId) return;
    const over = state.done >= roundLength;
    state = {
      ...state,
      exId,
      pos: { rumble: start.rumble ?? 0, bobbo: start.bobbo ?? 0 },
      placed: { rumble: false, bobbo: false },
      active: "rumble",
      motion: null,
      done: over ? 0 : state.done,
      doneIds: over ? [] : state.doneIds,
    };
    emit();
  },
  move(exId: string, who: Who, pos: number, motion: Motion, placed = true) {
    if (state.exId !== exId) return;
    state = { ...state, pos: { ...state.pos, [who]: pos }, placed: { ...state.placed, [who]: placed || state.placed[who] }, active: who, motion };
    emit();
  },
  setActive(exId: string, who: Who) {
    if (state.exId !== exId || state.active === who) return;
    state = { ...state, active: who };
    emit();
  },
  pillow(exId: string) {
    if (state.doneIds.includes(exId)) return;
    const doneIds = [...state.doneIds, exId];
    state = { ...state, doneIds, done: doneIds.length };
    emit();
  },
  reset() {
    state = fresh();
    emit();
  },
};

export function useTrail(): TrailState {
  return useSyncExternalStore(trailStore.subscribe, trailStore.get, trailStore.get);
}
