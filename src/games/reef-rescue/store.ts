/**
 * The child's arrangement for the current item, shared by the board (cards, reef targets) and the tray
 * (number picks, Check). Keyed by exercise id: a stale arrangement never leaks into the next item.
 */
export interface Carry {
  card: string;
  /** "shelf" or the target id the card was lifted from. */
  from: string;
}
export interface ReefState {
  exId: string;
  place: Record<string, string>;
  carry: Carry | null;
  pick: string | number | null;
  table: boolean;
}

const fresh = (exId: string): ReefState => ({ exId, place: {}, carry: null, pick: null, table: false });

let current: ReefState = fresh("");
let spare: ReefState = current;
const listeners = new Set<() => void>();

export const reefStore = {
  get: (): ReefState => current,
  for(exId: string): ReefState {
    if (current.exId === exId) return current;
    if (spare.exId !== exId) spare = fresh(exId);
    return spare;
  },
  update(exId: string, change: (s: ReefState) => Partial<ReefState>) {
    const base = current.exId === exId ? current : fresh(exId);
    current = { ...base, ...change(base) };
    for (const l of listeners) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
