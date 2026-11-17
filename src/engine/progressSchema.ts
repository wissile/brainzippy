/**
 * Shared (client + Worker) schema for anonymous guest progress.
 * Contains NO personal data: only sticker ids, counts and per-skill tallies.
 */
export interface SkillTally {
  attempts: number;
  firstTry: number;
  completed: number;
}

export interface GuestProgress {
  v: 1;
  stickers: string[];
  roundsCompleted: number;
  skills: Record<string, SkillTally>;
  /** Completed rounds per game (drives level-ups). Optional for older saves. */
  levels?: Record<string, number>;
}

export const MAX_PROGRESS_BYTES = 8 * 1024;
const ID_RE = /^[a-z0-9][a-z0-9.\-]{0,63}$/;

function isCount(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 1_000_000;
}

/** Strict validator: rejects unknown keys, wrong types, oversized collections. */
export function parseGuestProgress(input: unknown): GuestProgress | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const o = input as Record<string, unknown>;
  const allowed = new Set(["v", "stickers", "roundsCompleted", "skills", "levels"]);
  if (Object.keys(o).some((k) => !allowed.has(k))) return null;
  if (o.v !== 1) return null;
  if (!Array.isArray(o.stickers) || o.stickers.length > 200) return null;
  if (!o.stickers.every((s) => typeof s === "string" && ID_RE.test(s))) return null;
  if (!isCount(o.roundsCompleted)) return null;
  if (typeof o.skills !== "object" || o.skills === null || Array.isArray(o.skills)) return null;
  const skills = o.skills as Record<string, unknown>;
  if (Object.keys(skills).length > 200) return null;
  const outSkills: Record<string, SkillTally> = {};
  for (const [k, val] of Object.entries(skills)) {
    if (!ID_RE.test(k) || typeof val !== "object" || val === null) return null;
    const t = val as Record<string, unknown>;
    if (Object.keys(t).length !== 3 || !isCount(t.attempts) || !isCount(t.firstTry) || !isCount(t.completed)) return null;
    outSkills[k] = { attempts: t.attempts, firstTry: t.firstTry, completed: t.completed };
  }
  const levels: Record<string, number> = {};
  if (o.levels !== undefined) {
    if (typeof o.levels !== "object" || o.levels === null || Array.isArray(o.levels) || Object.keys(o.levels).length > 100) return null;
    for (const [k, v] of Object.entries(o.levels as Record<string, unknown>)) {
      if (!ID_RE.test(k) || !isCount(v)) return null;
      levels[k] = v;
    }
  }
  const out: GuestProgress = { v: 1, stickers: [...new Set(o.stickers as string[])], roundsCompleted: o.roundsCompleted, skills: outSkills };
  if (o.levels !== undefined) out.levels = levels;
  return out;
}

export function emptyProgress(): GuestProgress {
  return { v: 1, stickers: [], roundsCompleted: 0, skills: {} };
}
