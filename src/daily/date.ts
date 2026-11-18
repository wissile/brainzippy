/**
 * Local calendar dates as "YYYY-MM-DD" strings (the child's device clock). Pure helpers: callers pass the
 * current time in, so tests use a fixed clock. Clock tampering is out of scope (docs/DAILY_LEARNING.md).
 */
export type LocalDate = string;

const pad = (n: number) => String(n).padStart(2, "0");

/** The local calendar date of `now`. */
export function localDate(now: Date): LocalDate {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toUtc(day: LocalDate): number {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

/** `day` plus `n` calendar days (n may be negative). Calendar arithmetic, so DST changes never matter. */
export function addDays(day: LocalDate, n: number): LocalDate {
  const t = new Date(toUtc(day) + n * 86_400_000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Whole calendar days from `a` to `b` (positive when b is later). */
export function daysBetween(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** Milliseconds until the next local midnight after `now`. */
export function msUntilNextDay(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, next.getTime() - now.getTime());
}
