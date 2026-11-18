/**
 * Which push subscriptions get today's reminder, decided from the parent's chosen local hour and the
 * device's IANA timezone. Pure functions (time is injected) so every rule is unit-tested.
 *
 * Rules
 *  1. Send only during the chosen local hour (the cron runs hourly at :00 UTC; in half-hour zones it
 *     lands at hh:30 local, still inside the chosen hour).
 *  2. Never during quiet hours: 20:00–08:00 local. Allowed hours are 8..19.
 *  3. At most once per local calendar day (last_sent holds the local date of the last send).
 *  4. The push TTL expires before 20:00 local, so an offline device never gets a late-evening reminder.
 */
export const QUIET_START = 20; // 20:00 local — nothing at or after
export const QUIET_END = 8; // 08:00 local — nothing before
export const MAX_TTL_S = 4 * 3600;

export interface ScheduledSub {
  hour: number;
  tz: string;
  last_sent: string | null;
}

export interface LocalTime {
  date: string; // YYYY-MM-DD
  hour: number; // 0..23
  minute: number;
}

export const isAllowedHour = (h: unknown): h is number => typeof h === "number" && Number.isInteger(h) && h >= QUIET_END && h < QUIET_START;

const fmtCache = new Map<string, Intl.DateTimeFormat>();

/** Local wall-clock time in `tz`, or null if the timezone is unknown to the runtime. */
export function localTime(now: Date, tz: string): LocalTime | null {
  let fmt = fmtCache.get(tz);
  if (!fmt) {
    try {
      fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    } catch {
      return null;
    }
    fmtCache.set(tz, fmt);
  }
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(now)) p[part.type] = part.value;
  const hour = Number(p.hour) % 24;
  return { date: `${p.year}-${p.month}-${p.day}`, hour, minute: Number(p.minute) };
}

export function isValidTimeZone(tz: unknown): tz is string {
  return typeof tz === "string" && tz.length > 0 && tz.length <= 64 && /^[A-Za-z0-9_+\-/]+$/.test(tz) && localTime(new Date(0), tz) !== null;
}

export type DueDecision = { due: true; localDate: string; ttl: number } | { due: false; reason: "invalid" | "quiet" | "hour" | "sent" };

export function dueDecision(sub: ScheduledSub, now: Date): DueDecision {
  if (!isAllowedHour(sub.hour)) return { due: false, reason: "invalid" };
  const lt = localTime(now, sub.tz);
  if (!lt) return { due: false, reason: "invalid" };
  if (lt.hour < QUIET_END || lt.hour >= QUIET_START) return { due: false, reason: "quiet" };
  if (lt.hour !== sub.hour) return { due: false, reason: "hour" };
  if (sub.last_sent === lt.date) return { due: false, reason: "sent" };
  const secondsToQuiet = (QUIET_START * 60 - (lt.hour * 60 + lt.minute)) * 60;
  return { due: true, localDate: lt.date, ttl: Math.max(60, Math.min(MAX_TTL_S, secondsToQuiet)) };
}

export function selectDue<T extends ScheduledSub>(subs: T[], now: Date): { sub: T; localDate: string; ttl: number }[] {
  const out: { sub: T; localDate: string; ttl: number }[] = [];
  for (const sub of subs) {
    const d = dueDecision(sub, now);
    if (d.due) out.push({ sub, localDate: d.localDate, ttl: d.ttl });
  }
  return out;
}
