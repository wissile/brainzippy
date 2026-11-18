/**
 * Daily-reminder notification copy. Shared by the Worker (which sends a generic version) and the service
 * worker (which swaps in the child's monster name — that name is stored only on the device and never sent).
 *
 * Written for the PARENT who sees the notification: gentle, no guilt, no streaks, no "don't miss out".
 * Notifications are text only; none of these lines is ever spoken (voice lines never contain emoji).
 */
export const REMINDER_TITLE = "BrainZippy";
export const DEFAULT_MONSTER = "Bobbo";

export const REMINDER_LINES = [
  "{monster} has a new adventure ready today 🌟",
  "A fresh puzzle is waiting on Monster Island, whenever you're ready ✨",
  "{monster} found a new Brain Spark trail to explore together 🌈",
  "Fancy a few minutes of play? {monster} saved a puzzle for today 🎈",
] as const;

/** Variant for a given local date, so the copy changes day to day (deterministic, testable). */
export function reminderVariant(localDate: string): number {
  let h = 0;
  for (const ch of localDate) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % REMINDER_LINES.length;
}

export function reminderBody(variant: number, monsterName?: string | null): string {
  const line = REMINDER_LINES[((variant % REMINDER_LINES.length) + REMINDER_LINES.length) % REMINDER_LINES.length] ?? REMINDER_LINES[0];
  const name = (monsterName ?? "").trim() || DEFAULT_MONSTER;
  return line.replace("{monster}", name);
}

/** The JSON payload inside the encrypted push message. Contains no personal data. */
export interface ReminderPayload {
  v: 1;
  kind: "daily";
  variant: number;
  title: string;
  body: string;
  url: "/";
}
