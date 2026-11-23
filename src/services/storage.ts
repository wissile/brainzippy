import { type GuestProgress, emptyProgress, parseGuestProgress } from "../engine/progressSchema";
import type { ProgressionState } from "../engine/types";
import { type MonsterConfig, isMonsterConfig } from "../characters/Monster";
import { HISTORY_CAP, parseRoundRecord, parseSettings, type ChildSettings, type RoundRecord } from "../account/schema";
import { localDay, roundStars } from "../account/points";
import { UUID_RE } from "../account/schema";
import { type PathsState, emptyPathsState, parsePathsState } from "../engine/pathProgress";

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

/**
 * Device ⇄ child-profile link, set only by a signed-in parent in /parents. Holds the child's server id and the
 * parent's settings for that child (cached so the game can read the daily limit offline). No personal data.
 */
export interface AccountLink {
  childId: string;
  linkedAt: number;
  settings: ChildSettings | null;
}

/**
 * An accepted friend challenge being played on this device (see src/account/ChallengeScreen.tsx).
 * Contract for the game runtime: when `challenge` is set and `challenge.gameId` matches the game, the round SHOULD be
 * played at `level` with exercise order seeded by `seed`, so both children get the same round.
 */
export interface ActiveChallenge {
  token: string;
  gameId: string;
  level: number;
  seed: number;
  target: number;
  childId: string;
  startedAt: number;
  result: { score: number; beat: boolean; posted: boolean } | null;
}

export interface LocalState {
  profile: Profile;
  music: boolean;
  muted: boolean;
  ageBand: string | null;
  serverId: string | null;
  progress: GuestProgress;
  round: RoundSnapshot | null;
  /** Finished rounds on this device (newest last, capped). Feeds points, streaks and minutes. No personal data. */
  history: RoundRecord[];
  /** The round in play (set on its first exercise; kept after the runtime clears its snapshot until progress is saved). */
  currentRound: { gameId: string; startedAt: number } | null;
  account: AccountLink | null;
  challenge: ActiveChallenge | null;
  /** Parent setting: completed rounds per local day before play pauses until tomorrow (src/daily/settings.ts). */
  dailyLimit: number;
  /** Learning paths (D-034): chosen path, each path's current stop and streaks. Device-only, no personal data. */
  paths: PathsState;
}

export const DAILY_LIMIT = { min: 3, max: 10, default: 5 } as const;
export const clampDailyLimit = (n: unknown): number =>
  typeof n === "number" && Number.isFinite(n) ? Math.max(DAILY_LIMIT.min, Math.min(DAILY_LIMIT.max, Math.round(n))) : DAILY_LIMIT.default;

const defaults = (): LocalState => ({
  profile: emptyProfile(),
  music: true,
  muted: false,
  ageBand: null,
  serverId: null,
  progress: emptyProgress(),
  round: null,
  history: [],
  currentRound: null,
  account: null,
  challenge: null,
  dailyLimit: DAILY_LIMIT.default,
  paths: emptyPathsState(),
});

function parseHistory(x: unknown): RoundRecord[] {
  if (!Array.isArray(x)) return [];
  return x.map(parseRoundRecord).filter((r): r is RoundRecord => r !== null).slice(-HISTORY_CAP);
}

function parseCurrentRound(x: unknown): LocalState["currentRound"] {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  return typeof o.gameId === "string" && typeof o.startedAt === "number" ? { gameId: o.gameId, startedAt: o.startedAt } : null;
}

function parseAccount(x: unknown): AccountLink | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (typeof o.childId !== "string" || !UUID_RE.test(o.childId) || typeof o.linkedAt !== "number") return null;
  return { childId: o.childId, linkedAt: o.linkedAt, settings: o.settings ? parseSettings(o.settings) : null };
}

function parseChallenge(x: unknown): ActiveChallenge | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (typeof o.token !== "string" || !/^[0-9a-f]{32}$/.test(o.token) || typeof o.gameId !== "string" || typeof o.childId !== "string") return null;
  if (![o.level, o.seed, o.target, o.startedAt].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  const r = o.result as Record<string, unknown> | null | undefined;
  const result = r && typeof r.score === "number" && typeof r.beat === "boolean" ? { score: r.score, beat: r.beat, posted: r.posted === true } : null;
  return { token: o.token, gameId: o.gameId, level: o.level as number, seed: o.seed as number, target: o.target as number, childId: o.childId, startedAt: o.startedAt as number, result };
}

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
        history: parseHistory(o.history),
        currentRound: parseCurrentRound(o.currentRound),
        account: parseAccount(o.account),
        challenge: parseChallenge(o.challenge),
        dailyLimit: clampDailyLimit(o.dailyLimit),
        // migration: state saved before paths existed (or a corrupt entry) gets an empty path state
        paths: parsePathsState(o.paths),
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

type RoundListener = (record: RoundRecord, state: LocalState) => void;
const roundListeners = new Set<RoundListener>();
/** Subscribe to finished rounds (used by services/accountSync). Returns an unsubscribe function. */
export function onRoundRecorded(fn: RoundListener): () => void {
  roundListeners.add(fn);
  return () => roundListeners.delete(fn);
}

/**
 * Derive a RoundRecord from the game runtime's own writes, without touching the runtime: a round starts with the
 * first `saveState({ round: snapshot })` (→ currentRound) and completes with `saveState({ progress, round: null })`
 * raising `roundsCompleted`. Exercise and first-try counts are the per-skill tally deltas of that write.
 * Writes without a `round` key (e.g. account sync folding server progress in) never create records.
 */
export function deriveRoundRecord(prev: LocalState, patch: Partial<LocalState>, now: number): RoundRecord | null {
  if (!patch.progress || !("round" in patch) || patch.round !== null || !prev.currentRound) return null;
  if (patch.progress.roundsCompleted <= prev.progress.roundsCompleted) return null;
  const gameId = prev.currentRound.gameId;
  let exercises = 0;
  let firstTry = 0;
  const skills: string[] = [];
  for (const [id, t] of Object.entries(patch.progress.skills)) {
    const before = prev.progress.skills[id] ?? { attempts: 0, firstTry: 0, completed: 0 };
    const done = t.completed - before.completed;
    if (done > 0) {
      exercises += done;
      firstTry += Math.max(0, t.firstTry - before.firstTry);
      skills.push(id);
    }
  }
  if (exercises <= 0 || !/^[a-z0-9][a-z0-9.\-]{0,63}$/.test(gameId)) return null;
  firstTry = Math.min(firstTry, exercises);
  const started = prev.currentRound.startedAt;
  return {
    id: `${now}-${gameId}`,
    ts: now,
    day: localDay(now),
    gameId,
    level: Math.min(20, prev.progress.levels?.[gameId] ?? 0),
    exercises: Math.min(50, exercises),
    firstTry: Math.min(50, firstTry),
    stars: roundStars(exercises, firstTry),
    seconds: Math.max(0, Math.min(1800, Math.round((now - started) / 1000))),
    skills: skills.sort().slice(0, 20),
  };
}

export function saveState(patch: Partial<LocalState>): LocalState {
  const prev = loadState();
  const now = Date.now();
  const record = deriveRoundRecord(prev, patch, now);
  const extra: Partial<LocalState> = {};
  const cur = prev.currentRound;
  // first exercise of a new round (a resumed round keeps its start; an abandoned one older than 2 h starts afresh)
  if (patch.round && (!cur || cur.gameId !== patch.round.gameId || now - cur.startedAt > 2 * 3600_000)) {
    extra.currentRound = { gameId: patch.round.gameId, startedAt: now };
  }
  if (record) {
    extra.history = [...prev.history, record].slice(-HISTORY_CAP);
    extra.currentRound = null;
  }
  memory = { ...prev, ...patch, ...extra };
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* in-memory only */
  }
  if (record) {
    const state = memory;
    for (const fn of roundListeners) {
      try {
        fn(record, state);
      } catch {
        /* listeners never break gameplay */
      }
    }
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
