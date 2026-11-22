import { accountsEnabled } from "../lib/config";
import { dailyDigest } from "./digest";
import { purge } from "./purge";
import { type PushEnv, sendDueReminders } from "../routes/push";

/**
 * Named scheduled jobs. `jobsDue` decides which run on each tick of the single `CRON`.
 * Add a job: write it, add it to JOBS, and give it a time slot in `jobsDue`.
 */
export type Job = (env: Env, now: number) => Promise<unknown>;

export const JOBS: Record<string, Job> = {
  // Retention purge always runs: deleting expired data is never a feature to switch off.
  purge: (env, now) => purge(env, now),
  // Parent emails exist only with accounts (ACCOUNTS_ENABLED, D-030). Off: a no-op that touches neither D1 nor Resend.
  "daily-digest": async (env, now) => (accountsEnabled(env) ? dailyDigest(env, now) : { skipped: "accounts_disabled" }),
  "push-reminders": (env, now) => sendDueReminders(env as unknown as PushEnv, new Date(now)),
};

/**
 * One Cron Trigger for everything (wrangler.jsonc `triggers.crons`, UTC). The Workers Free plan allows only 5 Cron
 * Triggers per *account*, shared by every Worker in it, so this Worker uses one and picks jobs by the clock (D-032).
 */
export const CRON = "*/10 * * * *";

/** Pure: the jobs due at a scheduled time (UTC), rounded down to its 10-minute slot so a late run still matches. */
export function jobsDue(now: number): string[] {
  const d = new Date(now);
  const hour = d.getUTCHours();
  const slot = Math.floor(d.getUTCMinutes() / 10) * 10;
  const due: string[] = [];
  // Hourly: parent-chosen local-hour reminders, max one per day per device (worker/routes/push.ts).
  if (slot === 0) due.push("push-reminders");
  // Every 10 min 23:00–23:50 UTC (early evening in the Americas, late evening in Europe); each run sends one batch.
  if (hour === 23) due.push("daily-digest");
  // Once a day at 03:10 UTC.
  if (hour === 3 && slot === 10) due.push("purge");
  return due;
}

/** Runs every job due now; one failing job never stops the others. An unknown cron runs nothing. Returns the names that failed. */
export async function runScheduled(cron: string, env: Env, now: number): Promise<string[]> {
  if (cron !== CRON) {
    console.warn(`[cron] unknown schedule "${cron}"`);
    return [];
  }
  const names = jobsDue(now);
  const failed: string[] = [];
  for (const name of names) {
    try {
      await JOBS[name]!(env, now);
    } catch (e) {
      failed.push(name);
      console.error(`[cron] job ${name} failed: ${e instanceof Error ? e.message : "error"}`);
    }
  }
  return failed;
}
