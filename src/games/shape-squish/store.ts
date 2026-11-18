import type { AnswerValue } from "../../engine/types";

/**
 * Tiny external stores shared by the board, the tray and the host mascot (same pattern as Cookie Kitchen's store).
 *  - squishStore: what the Squish button would submit for the current exercise (published by the board).
 *  - hostStore:   true while Gloop is out on the board (gate levels), so the mascot spot shows his empty lily pad.
 */
function store<T>(initial: T) {
  let value = initial;
  const subs = new Set<() => void>();
  return {
    get: () => value,
    set: (v: T) => {
      if (Object.is(v, value)) return;
      value = v;
      subs.forEach((f) => f());
    },
    subscribe: (f: () => void) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
  };
}

export interface SquishState {
  exId: string;
  /** The value Squish submits, or null when nothing is ready to check. */
  value: AnswerValue | null;
}
export const squishStore = store<SquishState>({ exId: "", value: null });
export const hostStore = store<boolean>(false);
