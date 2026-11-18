import { type GuestProgress, emptyProgress, parseGuestProgress } from "../engine/progressSchema";
import type { ProgressionState } from "../engine/types";
import { type MonsterConfig, isMonsterConfig } from "../characters/Monster";

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
  /** Level and seed the round was built with (buildRound), so generated exercises rebuild exactly on resume. */
  level?: number;
  seed?: number;
}

/**
 * The child's profile lives ONLY on this device. The child's name is never sent to the server
 * (see docs/PRIVACY_SECURITY.md). Only a parent's email may be sent, with consent, behind a parent gate.
 */
export type OnboardingStep = "intro" | "pop" | "build" | "name" | "kid" | "age" | "grownup" | "done";
export interface Profile {
  monster: MonsterConfig | null;
  monsterName: string;
  kidName: string;
  step: OnboardingStep;
  parentSignup: "none" | "pending" | "skipped";
}
export const emptyProfile = (): Profile => ({ monster: null, monsterName: "", kidName: "", step: "intro", parentSignup: "none" });
const STEPS: OnboardingStep[] = ["intro", "pop", "build", "name", "kid", "age", "grownup", "done"];
const cleanName = (x: unknown) => (typeof x === "string" ? x.replace(/[^\p{L}\p{M} '\-]/gu, "").slice(0, 16) : "");

export function parseProfile(x: unknown): Profile {
  if (!x || typeof x !== "object") return emptyProfile();
  const o = x as Record<string, unknown>;
  return {
    monster: isMonsterConfig(o.monster) ? o.monster : null,
    monsterName: cleanName(o.monsterName),
    kidName: cleanName(o.kidName),
    step: STEPS.includes(o.step as OnboardingStep) ? (o.step as OnboardingStep) : "intro",
    parentSignup: o.parentSignup === "pending" || o.parentSignup === "skipped" ? o.parentSignup : "none",
  };
}
export { cleanName };

export interface LocalState {
  profile: Profile;
  music: boolean;
  muted: boolean;
  ageBand: string | null;
  serverId: string | null;
  progress: GuestProgress;
  round: RoundSnapshot | null;
  /** Parent setting: completed rounds per local day before play pauses until tomorrow (src/daily/settings.ts). */
  dailyLimit: number;
}

export const DAILY_LIMIT = { min: 3, max: 10, default: 5 } as const;
export const clampDailyLimit = (n: unknown): number =>
  typeof n === "number" && Number.isFinite(n) ? Math.max(DAILY_LIMIT.min, Math.min(DAILY_LIMIT.max, Math.round(n))) : DAILY_LIMIT.default;

const defaults = (): LocalState => ({ profile: emptyProfile(), music: true, muted: false, ageBand: null, serverId: null, progress: emptyProgress(), round: null, dailyLimit: DAILY_LIMIT.default });

/** A corrupted daily log must never wipe the rest of the progress: retry without it. */
function parseStoredProgress(x: unknown): GuestProgress | null {
  const p = parseGuestProgress(x);
  if (p || !x || typeof x !== "object" || !("daily" in x)) return p;
  const rest: Record<string, unknown> = { ...(x as Record<string, unknown>) };
  delete rest.daily;
  return parseGuestProgress(rest);
}
let memory: LocalState | null = null;

export function loadState(): LocalState {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw) as Partial<LocalState>;
      memory = {
        ...defaults(),
        profile: parseProfile(o.profile),
        music: o.music !== false,
        muted: o.muted === true,
        ageBand: typeof o.ageBand === "string" ? o.ageBand : null,
        serverId: typeof o.serverId === "string" ? o.serverId : null,
        progress: parseStoredProgress(o.progress) ?? emptyProgress(),
        round: parseRoundSnapshot(o.round),
        dailyLimit: clampDailyLimit(o.dailyLimit),
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
  if (r.level !== undefined && !isInt(r.level, 0, 1000)) return null;
  if (r.seed !== undefined && !isInt(r.seed, 0, 0xffffffff)) return null;
  if (!p || typeof p !== "object" || !isInt(p.difficulty, 1, 1001) || !isInt(p.streak, 0, 100) || !isStrArr(p.played)) return null;
  if (!Array.isArray(p.results) || p.results.length > 100) return null;
  for (const x of p.results as unknown[]) {
    const e = x as Record<string, unknown>;
    if (!e || typeof e.exerciseId !== "string" || typeof e.skillId !== "string" || !isInt(e.attempts, 1, 1000) || typeof e.firstTry !== "boolean" || !isInt(e.hintsShown, 0, 1000) || !isInt(e.difficulty, 1, 1001)) return null;
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
