/**
 * Shared (client + Worker) data contracts and strict validators for parent accounts.
 * Pure TypeScript: no DOM, no React. Every validator rejects unknown keys and caps sizes.
 */
import { AGE_BAND_IDS, MONSTER_PARTS, WORLD_IDS, type AgeBandId } from "./catalog";

export interface MonsterSpec {
  body: string;
  color: string;
  eyes: string;
  mouth: string;
  arms: string;
  top: string;
}

export interface SkillTally {
  attempts: number;
  firstTry: number;
  completed: number;
}

/** One finished round. `id` is minted on the device (`<ts>-<gameId>`) so the same round never counts twice. */
export interface RoundRecord {
  id: string;
  ts: number; // unix ms, device clock
  day: string; // YYYY-MM-DD in the device's local time
  gameId: string;
  level: number; // level the round was played at (0-based)
  exercises: number;
  firstTry: number; // exercises solved on the first try
  stars: number; // 1–3, see points.ts roundStars()
  seconds: number; // capped at 1800
  skills: string[];
}

export interface WorldProgress {
  level: number;
  stars: number; // best round stars in this world
}

/** Per-child progress as stored in D1 (`children.progress_json`) and merged on sync. No personal data. */
export interface ChildProgress {
  v: 1;
  worlds: Record<string, WorldProgress>;
  stickers: string[];
  skills: Record<string, SkillTally>;
  roundsCompleted: number;
  history: RoundRecord[];
}

export interface ChildSettings {
  dailyLimit: number; // games per day, 3–10
  sound: boolean;
  music: boolean;
}
export const DEFAULT_SETTINGS: ChildSettings = { dailyLimit: 5, sound: true, music: true };
export const DAILY_LIMIT_MIN = 3;
export const DAILY_LIMIT_MAX = 10;
export const MAX_CHILDREN = 4;
export const HISTORY_CAP = 200;
export const MAX_CHILD_PROGRESS_BYTES = 64 * 1024;

export const emptyChildProgress = (): ChildProgress => ({ v: 1, worlds: {}, stickers: [], skills: {}, roundsCompleted: 0, history: [] });

// ---------------- primitives ----------------
const ID_RE = /^[a-z0-9][a-z0-9.\-]{0,63}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ROUND_ID_RE = /^\d{1,15}-[a-z0-9][a-z0-9.\-]{0,63}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const EMAIL_RE = /^[^\s@"<>]{1,64}@[^\s@"<>]{1,189}\.[^\s@"<>]{2,24}$/;

export const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
export const isInt = (n: unknown, lo: number, hi: number): n is number => typeof n === "number" && Number.isInteger(n) && n >= lo && n <= hi;
export const onlyKeys = (o: Record<string, unknown>, allowed: readonly string[]) => Object.keys(o).every((k) => allowed.includes(k));

export function normaliseEmail(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const e = x.trim().toLowerCase();
  return e.length <= 254 && EMAIL_RE.test(e) ? e : null;
}

/** Names shown to friends: letters, marks, spaces, apostrophes, hyphens; 1–16 chars. Same rule as the device profile. */
export function cleanDisplayName(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const s = x.replace(/[^\p{L}\p{M} '\-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 16);
  return s.length ? s : null;
}

export function parseMonster(x: unknown): MonsterSpec | null {
  if (!isObj(x) || !onlyKeys(x, Object.keys(MONSTER_PARTS))) return null;
  const out: Record<string, string> = {};
  for (const [k, allowed] of Object.entries(MONSTER_PARTS)) {
    const v = x[k];
    if (typeof v !== "string" || !(allowed as readonly string[]).includes(v)) return null;
    out[k] = v;
  }
  return out as unknown as MonsterSpec;
}

export const parseAgeBand = (x: unknown): AgeBandId | null => ((AGE_BAND_IDS as readonly unknown[]).includes(x) ? (x as AgeBandId) : null);

export function parseSettings(x: unknown, base: ChildSettings = DEFAULT_SETTINGS): ChildSettings | null {
  if (!isObj(x) || !onlyKeys(x, ["dailyLimit", "sound", "music"])) return null;
  const out = { ...base };
  if (x.dailyLimit !== undefined) {
    if (!isInt(x.dailyLimit, DAILY_LIMIT_MIN, DAILY_LIMIT_MAX)) return null;
    out.dailyLimit = x.dailyLimit;
  }
  for (const k of ["sound", "music"] as const) {
    if (x[k] !== undefined) {
      if (typeof x[k] !== "boolean") return null;
      out[k] = x[k];
    }
  }
  return out;
}

const isCount = (n: unknown): n is number => isInt(n, 0, 1_000_000);

export function parseRoundRecord(x: unknown): RoundRecord | null {
  if (!isObj(x) || !onlyKeys(x, ["id", "ts", "day", "gameId", "level", "exercises", "firstTry", "stars", "seconds", "skills"])) return null;
  const { id, ts, day, gameId, level, exercises, firstTry, stars, seconds, skills } = x;
  if (typeof id !== "string" || !ROUND_ID_RE.test(id)) return null;
  if (!isInt(ts, 0, 8_640_000_000_000_000) || typeof day !== "string" || !DAY_RE.test(day)) return null;
  if (typeof gameId !== "string" || !ID_RE.test(gameId)) return null;
  if (!isInt(level, 0, 20) || !isInt(exercises, 1, 50) || !isInt(firstTry, 0, exercises) || !isInt(stars, 1, 3) || !isInt(seconds, 0, 1800)) return null;
  if (!Array.isArray(skills) || skills.length > 20 || !skills.every((s) => typeof s === "string" && ID_RE.test(s))) return null;
  return { id, ts, day, gameId, level, exercises, firstTry, stars, seconds, skills: [...new Set(skills as string[])] };
}

/** Strict validator for ChildProgress (Worker input and stored JSON). */
export function parseChildProgress(input: unknown): ChildProgress | null {
  if (!isObj(input) || !onlyKeys(input, ["v", "worlds", "stickers", "skills", "roundsCompleted", "history"])) return null;
  if (input.v !== 1 || !isCount(input.roundsCompleted)) return null;
  const { worlds, stickers, skills, history } = input;
  if (!isObj(worlds) || Object.keys(worlds).length > 100) return null;
  const outWorlds: Record<string, WorldProgress> = {};
  for (const [k, w] of Object.entries(worlds)) {
    if (!ID_RE.test(k) || !isObj(w) || !onlyKeys(w, ["level", "stars"]) || !isInt(w.level, 0, 20) || !isInt(w.stars, 0, 3)) return null;
    outWorlds[k] = { level: w.level, stars: w.stars };
  }
  if (!Array.isArray(stickers) || stickers.length > 200 || !stickers.every((s) => typeof s === "string" && ID_RE.test(s))) return null;
  if (!isObj(skills) || Object.keys(skills).length > 200) return null;
  const outSkills: Record<string, SkillTally> = {};
  for (const [k, t] of Object.entries(skills)) {
    if (!ID_RE.test(k) || !isObj(t) || !onlyKeys(t, ["attempts", "firstTry", "completed"])) return null;
    if (!isCount(t.attempts) || !isCount(t.firstTry) || !isCount(t.completed)) return null;
    outSkills[k] = { attempts: t.attempts, firstTry: t.firstTry, completed: t.completed };
  }
  if (!Array.isArray(history) || history.length > HISTORY_CAP) return null;
  const outHistory: RoundRecord[] = [];
  for (const h of history) {
    const r = parseRoundRecord(h);
    if (!r) return null;
    outHistory.push(r);
  }
  return { v: 1, worlds: outWorlds, stickers: [...new Set(stickers as string[])], skills: outSkills, roundsCompleted: input.roundsCompleted, history: outHistory };
}

/** World ids accepted for challenges (only real worlds). */
export const isWorldId = (x: unknown): x is string => typeof x === "string" && WORLD_IDS.includes(x);
