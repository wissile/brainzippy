/**
 * Tiny board → tray channel. On word-story exercises the answer pills wait until the child has matched the
 * story to its equation (that step lives on the board). Keyed by exercise id so a stale value never leaks.
 */
export interface BoardStatus {
  exId: string;
  ready: boolean;
}

let current: BoardStatus = { exId: "", ready: true };
const listeners = new Set<() => void>();

export const boardStore = {
  get: (): BoardStatus => current,
  set(next: BoardStatus) {
    if (next.exId === current.exId && next.ready === current.ready) return;
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
