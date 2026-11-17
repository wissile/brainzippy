/**
 * Tiny board → tray channel. The answer tray is rendered by the runner apart from the board, but the matching
 * "N each" pill should glow once the child has shared every cookie fairly (a self-check). The board publishes
 * the fair share here; the tray subscribes. Keyed by exercise id so a stale value never leaks across exercises.
 */
export interface FairShare {
  exId: string;
  each: number | null;
}

let current: FairShare = { exId: "", each: null };
const listeners = new Set<() => void>();

export const fairStore = {
  get: (): FairShare => current,
  set(next: FairShare) {
    if (next.exId === current.exId && next.each === current.each) return;
    current = next;
    for (const l of listeners) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
