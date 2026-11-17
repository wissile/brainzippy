import { type GuestProgress, emptyProgress, parseGuestProgress } from "../engine/progressSchema";
import type { ProgressionState } from "../engine/types";

/**
 * Local guest storage. Holds no personal data: a random device-local id, coarse settings, progress.
 * All access is wrapped: private browsing / disabled storage degrades to in-memory only.
 */
const KEY = "bz.v1";

export interface RoundSnapshot {
  v: 1;
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
        round: parseRoundSnapshot(o.round),
      };
      return memory;
    }
  } catch {
    /* corrupted or unavailable */
  }
  memory = defaults();
  return memory;
}

const isStrArr = (a: unknown): a is string[] => Array.isArray(a) && a.length <= 100 && a.every((x) => typeof x === "string");
const isInt = (n: unknown, lo: number, hi: number) => typeof n === "number" && Number.isInteger(n) && n >= lo && n <= hi;

/** Validate a stored round snapshot; anything unexpected (old shape, corruption) is dropped, never trusted. */
export function parseRoundSnapshot(input: unknown): RoundSnapshot | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  const p = r.progression as Record<string, unknown> | undefined;
  if (r.v !== 1 || typeof r.gameId !== "string" || !(r.currentId === null || typeof r.currentId === "string")) return null;
  if (!p || typeof p !== "object" || !isInt(p.difficulty, 1, 4) || !isInt(p.streak, 0, 100) || !isStrArr(p.played)) return null;
  if (!Array.isArray(p.results) || p.results.length > 100) return null;
  for (const x of p.results as unknown[]) {
    const e = x as Record<string, unknown>;
    if (!e || typeof e.exerciseId !== "string" || typeof e.skillId !== "string" || !isInt(e.attempts, 1, 1000) || typeof e.firstTry !== "boolean" || !isInt(e.hintsShown, 0, 1000) || !isInt(e.difficulty, 1, 4)) return null;
  }
  return input as RoundSnapshot;
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
