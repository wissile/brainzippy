import type { Denom } from "./logic";

/**
 * Board → tray channel. The board owns the stand (coins on the counter, supplies, customers, price slider);
 * the tray holds the answer controls (Pay / choice cards / Set price) and reads what the board built.
 * Keyed by exercise id so a stale value never leaks into the next item.
 */
export interface StandStatus {
  exId: string;
  /** Coins/notes the child has put down (coin modes). */
  coins: readonly Denom[];
  /** Choice modes: the scene is ready (supplies in the stand / every customer served). */
  ready: boolean;
  /** Rainy day: what the child says the day was (1 profit, -1 loss, 0 break even), or null before choosing. */
  sign: -1 | 0 | 1 | null;
  /** Best price: the price on the slider, or null before the child moves it. */
  pick: number | null;
}

const EMPTY: StandStatus = { exId: "", coins: [], ready: false, sign: null, pick: null };
let current: StandStatus = EMPTY;
const listeners = new Set<() => void>();

export const standStore = {
  get: (): StandStatus => current,
  set(next: StandStatus) {
    const c = current;
    if (next.exId === c.exId && next.ready === c.ready && next.sign === c.sign && next.pick === c.pick && next.coins.length === c.coins.length && next.coins.every((x, i) => x === c.coins[i])) return;
    current = next;
    for (const l of listeners) l();
  },
  reset() {
    current = EMPTY;
    for (const l of listeners) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
