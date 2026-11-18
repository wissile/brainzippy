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
  /** Daily learning log (src/daily, docs/DAILY_LEARNING.md). Optional for older saves. */
  daily?: DailyLog;
}

// ---------------------------------------------------------------- daily learning log
// Dates are the child's LOCAL calendar date "YYYY-MM-DD" (device clock). No times, no personal data.

/** One completed round: world id, 0-based level played, first-try items, items, plan stop index (if started from the trail). */
export interface DailyRound {
  w: string;
  l: number;
  ft: number;
  n: number;
  s?: number;
}
/** Per-skill mastery + Leitner review memory (docs/curriculum/README.md §3.3–3.4). */
export interface SkillMemory {
  /** Qualifying first-try successes (at or above the mastery level) while practising. */
  q: number;
  /** First local date with a qualifying success. */
  f?: string;
  /** Qualifying successes on dates later than `f` (M1 day-spreading). */
  lq: number;
  /** Leitner box: 0 = not mastered (practising), 1..5 = mastered, reviewed on a schedule. */
  b: number;
  /** Next review date (box ≥ 1). */
  due?: string;
  /** Consecutive failed reviews in box 1 (two → back to practising, quietly). */
  fails: number;
  /** World the skill was last practised in (reviews prefer a different one). */
  lw?: string;
}
export type DailyStopKind = "review" | "new" | "practice" | "stretch" | "pick";
export interface DailyPlanStop {
  w: string;
  k: DailyStopKind;
  /** For the last "pick" stop: the two worlds the child chooses between. */
  o?: string[];
}
export interface DailyPlan {
  day: string;
  /** Daily limit the plan was made for. */
  k: number;
  /** Registry fingerprint (world ids) — a new world in the registry triggers a re-plan. */
  reg: number;
  stops: DailyPlanStop[];
}
export interface DailyLog {
  /** Local date → rounds completed that day (only the most recent MAX_DAILY_DAYS dates are kept). */
  days: Record<string, DailyRound[]>;
  /** World → last local date a round was completed there. */
  seen: Record<string, string>;
  skills: Record<string, SkillMemory>;
  /** Distinct local dates with at least one completed round ("days learning" sparks; never decreases). */
  learned: number;
  plan?: DailyPlan;
}
export const MAX_DAILY_DAYS = 8;
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const KINDS: readonly DailyStopKind[] = ["review", "new", "practice", "stretch", "pick"];
export const emptyDailyLog = (): DailyLog => ({ days: {}, seen: {}, skills: {}, learned: 0 });

export const MAX_PROGRESS_BYTES = 8 * 1024;
const ID_RE = /^[a-z0-9][a-z0-9.\-]{0,63}$/;

function isCount(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 1_000_000;
}

/** Strict validator: rejects unknown keys, wrong types, oversized collections. */
export function parseGuestProgress(input: unknown): GuestProgress | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const o = input as Record<string, unknown>;
  const allowed = new Set(["v", "stickers", "roundsCompleted", "skills", "levels", "daily"]);
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
  if (o.daily !== undefined) {
    const daily = parseDailyLog(o.daily);
    if (!daily) return null;
    out.daily = daily;
  }
  return out;
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const onlyKeys = (o: Record<string, unknown>, keys: readonly string[]) => Object.keys(o).every((k) => keys.includes(k));
const isDate = (x: unknown): x is string => typeof x === "string" && DATE_RE.test(x);
const isSmall = (n: unknown, max: number): n is number => isCount(n) && n <= max;

/** Strict validator for the daily learning log (unknown keys, bad dates or oversized collections → null). */
export function parseDailyLog(input: unknown): DailyLog | null {
  if (!isObj(input) || !onlyKeys(input, ["days", "seen", "skills", "learned", "plan"])) return null;
  const { days, seen, skills, learned, plan } = input;
  if (!isObj(days) || Object.keys(days).length > MAX_DAILY_DAYS) return null;
  const outDays: Record<string, DailyRound[]> = {};
  for (const [d, rounds] of Object.entries(days)) {
    if (!isDate(d) || !Array.isArray(rounds) || rounds.length > 50) return null;
    const out: DailyRound[] = [];
    for (const r of rounds as unknown[]) {
      if (!isObj(r) || !onlyKeys(r, ["w", "l", "ft", "n", "s"])) return null;
      if (typeof r.w !== "string" || !ID_RE.test(r.w) || !isSmall(r.l, 100) || !isSmall(r.ft, 100) || !isSmall(r.n, 100) || (r.s !== undefined && !isSmall(r.s, 20))) return null;
      out.push(r.s === undefined ? { w: r.w, l: r.l, ft: r.ft, n: r.n } : { w: r.w, l: r.l, ft: r.ft, n: r.n, s: r.s });
    }
    outDays[d] = out;
  }
  if (!isObj(seen) || Object.keys(seen).length > 300) return null;
  const outSeen: Record<string, string> = {};
  for (const [w, d] of Object.entries(seen)) {
    if (!ID_RE.test(w) || !isDate(d)) return null;
    outSeen[w] = d;
  }
  if (!isObj(skills) || Object.keys(skills).length > 400) return null;
  const outSkills: Record<string, SkillMemory> = {};
  for (const [id, m] of Object.entries(skills)) {
    if (!ID_RE.test(id) || !isObj(m) || !onlyKeys(m, ["q", "f", "lq", "b", "due", "fails", "lw"])) return null;
    if (!isSmall(m.q, 100_000) || !isSmall(m.lq, 100_000) || !isSmall(m.b, 5) || !isSmall(m.fails, 100)) return null;
    if ((m.f !== undefined && !isDate(m.f)) || (m.due !== undefined && !isDate(m.due)) || (m.lw !== undefined && (typeof m.lw !== "string" || !ID_RE.test(m.lw)))) return null;
    const mem: SkillMemory = { q: m.q, lq: m.lq, b: m.b, fails: m.fails };
    if (m.f !== undefined) mem.f = m.f as string;
    if (m.due !== undefined) mem.due = m.due as string;
    if (m.lw !== undefined) mem.lw = m.lw as string;
    outSkills[id] = mem;
  }
  if (!isCount(learned)) return null;
  const out: DailyLog = { days: outDays, seen: outSeen, skills: outSkills, learned };
  if (plan !== undefined) {
    if (!isObj(plan) || !onlyKeys(plan, ["day", "k", "reg", "stops"]) || !isDate(plan.day) || !isSmall(plan.k, 20)) return null;
    if (typeof plan.reg !== "number" || !Number.isInteger(plan.reg) || plan.reg < 0 || plan.reg > 0xffffffff) return null;
    if (!Array.isArray(plan.stops) || plan.stops.length > 20) return null;
    const stops: DailyPlanStop[] = [];
    for (const st of plan.stops as unknown[]) {
      if (!isObj(st) || !onlyKeys(st, ["w", "k", "o"]) || typeof st.w !== "string" || !ID_RE.test(st.w) || !KINDS.includes(st.k as DailyStopKind)) return null;
      if (st.o !== undefined && !(Array.isArray(st.o) && st.o.length <= 3 && st.o.every((x) => typeof x === "string" && ID_RE.test(x)))) return null;
      stops.push(st.o === undefined ? { w: st.w, k: st.k as DailyStopKind } : { w: st.w, k: st.k as DailyStopKind, o: [...(st.o as string[])] });
    }
    out.plan = { day: plan.day, k: plan.k, reg: plan.reg, stops };
  }
  return out;
}

export function emptyProgress(): GuestProgress {
  return { v: 1, stickers: [], roundsCompleted: 0, skills: {} };
}
