import { type GuestProgress, emptyProgress, parseGuestProgress } from "../engine/progressSchema";
import type { ProgressionState } from "../engine/types";

/**
 * Local guest storage. Holds no personal data: a random device-local id, coarse settings, progress.
 * All access is wrapped: private browsing / disabled storage degrades to in-memory only.
 */
const KEY = "bz.v1";

export interface RoundSnapshot {
  gameId: string;
  progression: ProgressionState;
  currentId: string | null;
  savedAt: number;
}

export interface LocalState {
  muted: boolean;
  ageBand: string | null;
  serverId: string | null;
  progress: GuestProgress;
  round: RoundSnapshot | null;
}

const defaults = (): LocalState => ({ muted: false, ageBand: null, serverId: null, progress: emptyProgress(), round: null });
let memory: LocalState | null = null;

export function loadState(): LocalState {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw) as Partial<LocalState>;
      memory = {
        ...defaults(),
        muted: o.muted === true,
        ageBand: typeof o.ageBand === "string" ? o.ageBand : null,
        serverId: typeof o.serverId === "string" ? o.serverId : null,
        progress: parseGuestProgress(o.progress) ?? emptyProgress(),
        round: o.round && typeof o.round === "object" ? (o.round as RoundSnapshot) : null,
      };
      return memory;
    }
  } catch {
    /* corrupted or unavailable */
  }
  memory = defaults();
  return memory;
}

export function saveState(patch: Partial<LocalState>): LocalState {
  memory = { ...loadState(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* in-memory only */
  }
  return memory;
}

/** Parent control: wipe everything stored on this device. */
export function clearState() {
  memory = defaults();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
