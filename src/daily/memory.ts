import type { DailyLog, DailyRound, SkillMemory } from "../engine/progressSchema";
import { MAX_DAILY_DAYS, emptyDailyLog } from "../engine/progressSchema";
import { type LocalDate, addDays } from "./date";

/**
 * Mastery + spaced review memory (docs/curriculum/README.md §3.3–3.4, simplified to what rounds record).
 * Pure: `recordRound(log, round)` returns a new log; no clock, no storage. All numbers are tunable here.
 *
 *  M1  A skill is mastered after MASTERY_COUNT first-try successes at or above the world's mastery level,
 *      with at least LATER_COUNT of them on a local date later than the first qualifying one.
 *  M2  Assisted / modelled answers never subtract; they just don't count.
 *  S1  On mastery: box 1, next review in REVIEW_DAYS[1] days.
 *  S3  A round in a world while one of its skills is due is that skill's review: ≥ REVIEW_PASS of the
 *      skill's items first-try → box + 1; otherwise box − 1 (min 1). Two failed reviews in a row in box 1 →
 *      quietly back to practising (box 0) with half the evidence kept.
 */
export const MASTERY_COUNT = 6;
export const LATER_COUNT = Math.ceil(MASTERY_COUNT / 3);
/** U1: a prerequisite counts as met with this many qualifying successes, even before mastery. */
export const UNLOCK_COUNT = Math.ceil(MASTERY_COUNT / 2);
/** Days until the next review, indexed by Leitner box (box 0 = not mastered). */
export const REVIEW_DAYS = [0, 2, 4, 8, 16, 32] as const;
export const MAX_BOX = REVIEW_DAYS.length - 1;
export const REVIEW_PASS = 0.6;

/** The 0-based level from which a world exercises its skills without scaffolds ("Lm"). Default: half its levels. */
export const masteryLevel = (maxLevel: number): number => Math.floor(maxLevel / 2);

/** One answered item of a completed round (a subset of the engine's ExerciseResult). */
export interface ItemResult {
  skillId: string;
  /** 1-based difficulty band (level + 1). */
  difficulty: number;
  firstTry: boolean;
}
export interface CompletedRound {
  day: LocalDate;
  world: string;
  /** Level the round was played at (0-based). */
  level: number;
  /** The world's maxLevel (for the mastery level). */
  maxLevel: number;
  results: readonly ItemResult[];
  /** Index of the trail stop the round was started from, if any. */
  stop?: number;
}

export const emptySkill = (): SkillMemory => ({ q: 0, lq: 0, b: 0, fails: 0 });
export const isMastered = (m: SkillMemory | undefined): boolean => (m?.b ?? 0) >= 1;
export const isDue = (m: SkillMemory | undefined, day: LocalDate): boolean => isMastered(m) && !!m!.due && m!.due <= day;

/** Update one skill's memory with its items from one round. */
export function updateSkill(prev: SkillMemory | undefined, items: readonly ItemResult[], ctx: { day: LocalDate; world: string; mastery: number }): SkillMemory {
  const m: SkillMemory = { ...(prev ?? emptySkill()) };
  if (items.length === 0) return m;
  m.lw = ctx.world;
  if (isDue(m, ctx.day)) {
    // S3 review
    const pass = items.filter((r) => r.firstTry).length / items.length >= REVIEW_PASS;
    if (pass) {
      m.b = Math.min(MAX_BOX, m.b + 1);
      m.fails = 0;
    } else if (m.b === 1) {
      m.fails += 1;
      if (m.fails >= 2) {
        // practising again (the child only ever hears "let's practise this again")
        m.b = 0;
        m.fails = 0;
        m.q = Math.floor(MASTERY_COUNT / 2);
        m.lq = 0;
        m.f = ctx.day;
        delete m.due;
        return m;
      }
    } else {
      m.b = m.b - 1;
    }
    m.due = addDays(ctx.day, REVIEW_DAYS[m.b]!);
    return m;
  }
  if (isMastered(m)) return m; // extra practice of a mastered skill before it is due changes nothing
  for (const r of items) {
    if (!r.firstTry || r.difficulty - 1 < ctx.mastery) continue; // M2: no penalty, it just doesn't count
    m.q += 1;
    if (!m.f) m.f = ctx.day;
    else if (ctx.day > m.f) m.lq += 1;
  }
  if (m.q >= MASTERY_COUNT && m.lq >= LATER_COUNT) {
    m.b = 1; // S1
    m.fails = 0;
    m.due = addDays(ctx.day, REVIEW_DAYS[1]);
  }
  return m;
}

/** Record a completed round: day log, last-seen, "days learning", skill memory. Old days are pruned. */
export function recordRound(log: DailyLog | undefined, round: CompletedRound): DailyLog {
  const base = log ?? emptyDailyLog();
  const firstToday = !(base.days[round.day]?.length);
  const entry: DailyRound = { w: round.world, l: round.level, ft: round.results.filter((r) => r.firstTry).length, n: round.results.length };
  if (round.stop !== undefined) entry.s = round.stop;
  const days = { ...base.days, [round.day]: [...(base.days[round.day] ?? []), entry].slice(-50) };
  const keep = Object.keys(days).sort().slice(-MAX_DAILY_DAYS);
  const pruned = Object.fromEntries(keep.map((d) => [d, days[d]!]));

  const bySkill = new Map<string, ItemResult[]>();
  for (const r of round.results) bySkill.set(r.skillId, [...(bySkill.get(r.skillId) ?? []), r]);
  const skills = { ...base.skills };
  const ctx = { day: round.day, world: round.world, mastery: masteryLevel(round.maxLevel) };
  for (const [id, items] of [...bySkill].sort(([a], [b]) => a.localeCompare(b))) skills[id] = updateSkill(skills[id], items, ctx);

  const out: DailyLog = { ...base, days: pruned, seen: { ...base.seen, [round.world]: round.day }, skills, learned: base.learned + (firstToday ? 1 : 0) };
  return out;
}

/** Rounds completed on `day`. */
export const roundsOn = (log: DailyLog | undefined, day: LocalDate): readonly DailyRound[] => log?.days[day] ?? [];
