/**
 * Points: a deterministic, published rule. Pure functions over the round history; no randomness, no clocks
 * (callers pass "today"). Mistakes never cost points: wrong attempts are simply not counted.
 *
 *   Round stars   1 = finished the round · 2 = at least half solved first try · 3 = at least 80% solved first try
 *   Round points  10 × stars + 2 × first-try answers                      (an 8-item round earns 10–46)
 *   Streak bonus  once per day played: 5 × min(streak length that day, 7)  (day 1 = +5 … day 7+ = +35)
 *   Weekly points sum of round points + streak bonuses for days in the ISO week (Monday–Sunday)
 *
 * Speed is never used. Days are the device's local calendar days recorded with each round.
 */
import type { RoundRecord } from "./schema";

export const STAR_POINTS = 10;
export const FIRST_TRY_POINTS = 2;
export const STREAK_POINTS = 5;
export const STREAK_CAP = 7;

export function roundStars(exercises: number, firstTry: number): 1 | 2 | 3 {
  if (exercises <= 0) return 1;
  if (firstTry * 5 >= exercises * 4) return 3;
  if (firstTry * 2 >= exercises) return 2;
  return 1;
}

export const roundPoints = (r: Pick<RoundRecord, "stars" | "firstTry">) => STAR_POINTS * r.stars + FIRST_TRY_POINTS * r.firstTry;

// ---- calendar helpers on YYYY-MM-DD strings (UTC arithmetic on the date itself; no time zones involved) ----
const toUtc = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (day: string, n: number) => fromUtc(toUtc(day) + n * 86_400_000);
/** Monday of the ISO week containing `day`. */
export function weekStart(day: string): string {
  const dow = new Date(toUtc(day)).getUTCDay(); // 0 = Sunday
  return addDays(day, -((dow + 6) % 7));
}
/** Local calendar day for a timestamp on this device. */
export function localDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const playedDays = (history: readonly RoundRecord[]) => new Set(history.map((r) => r.day));

/** Length of the run of consecutive played days ending on `day` (0 if `day` was not played). */
export function streakOn(days: ReadonlySet<string>, day: string): number {
  let n = 0;
  for (let d = day; days.has(d); d = addDays(d, -1)) n++;
  return n;
}

/** Current streak: consecutive days ending today, or ending yesterday if today has no game yet (the streak is still alive). */
export function currentStreak(history: readonly RoundRecord[], today: string): number {
  const days = playedDays(history);
  return days.has(today) ? streakOn(days, today) : streakOn(days, addDays(today, -1));
}

export function streakBonus(streakLength: number): number {
  return streakLength > 0 ? STREAK_POINTS * Math.min(streakLength, STREAK_CAP) : 0;
}

export interface WeekSummary {
  weekStart: string;
  points: number;
  rounds: number;
  minutes: number;
  skills: string[];
  days: number;
}

/** Points, rounds, minutes and skills for the ISO week containing `today`. */
export function weekSummary(history: readonly RoundRecord[], today: string): WeekSummary {
  const start = weekStart(today);
  const end = addDays(start, 6);
  const days = playedDays(history);
  const inWeek = history.filter((r) => r.day >= start && r.day <= end);
  let points = 0;
  let seconds = 0;
  const skills = new Set<string>();
  for (const r of inWeek) {
    points += roundPoints(r);
    seconds += r.seconds;
    r.skills.forEach((s) => skills.add(s));
  }
  const weekDays = [...new Set(inWeek.map((r) => r.day))];
  for (const d of weekDays) points += streakBonus(streakOn(days, d));
  return { weekStart: start, points, rounds: inWeek.length, minutes: Math.round(seconds / 60), skills: [...skills].sort(), days: weekDays.length };
}
