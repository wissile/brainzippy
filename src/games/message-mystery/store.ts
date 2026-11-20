import { useSyncExternalStore } from "react";
import type { Exercise } from "../../engine/types";

/**
 * Per-exercise UI state for Fenn's Message Mystery (keyed by exercise id, so nothing leaks into the next
 * message). Kept outside React state so the runner's re-renders never reset a half-sorted inbox.
 */
export type Bin = "safe" | "ask";
export interface MmShared {
  exId: string;
  /** Tap-tap: the message has been picked up and the next bin tap posts it. */
  lifted: boolean;
  /** Bin under the dragged message. */
  hot: Bin | null;
  /** Part currently under the magnifier. */
  zoom: string | null;
  /** Parts whose real address / destination has been revealed by the magnifier. */
  revealed: string[];
  /** Clue mode: circled parts. */
  picks: string[];
  /** Inbox: message id → bin, the message being read, and ids locked after a check. */
  assign: Record<string, Bin>;
  open: number;
  locked: string[];
  /** The child did something (stops the automatic read-aloud). */
  touched: boolean;
}

let current: MmShared = fresh("");
const listeners = new Set<() => void>();

function fresh(exId: string): MmShared {
  return { exId, lifted: false, hot: null, zoom: null, revealed: [], picks: [], assign: {}, open: 0, locked: [], touched: false };
}

export const mmStore = {
  get: (): MmShared => current,
  ensure(ex: Pick<Exercise, "id">): MmShared {
    if (current.exId !== ex.id) current = fresh(ex.id);
    return current;
  },
  set(exId: string, patch: Partial<MmShared>) {
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
};

export function useMm(ex: Pick<Exercise, "id">): MmShared {
  mmStore.ensure(ex);
  const s = useSyncExternalStore(mmStore.subscribe, mmStore.get, mmStore.get);
  return s.exId === ex.id ? s : mmStore.ensure(ex);
}
