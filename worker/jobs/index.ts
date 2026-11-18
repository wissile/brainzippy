import { dailyDigest } from "./digest";
import { purge } from "./purge";
import { type PushEnv, sendDueReminders } from "../routes/push";

/**
 * Named scheduled jobs. `CRON_JOBS` maps each cron expression in wrangler.jsonc (`triggers.crons`, UTC) to job names.
 * Add a job: write it, add it to JOBS, list it under a cron (and add the cron to wrangler.jsonc if new).
 */
export type Job = (env: Env, now: number) => Promise<unknown>;

export const JOBS: Record<string, Job> = {
  purge: (env, now) => purge(env, now),
  "daily-digest": (env, now) => dailyDigest(env, now),
  "push-reminders": (env, now) => sendDueReminders(env as unknown as PushEnv, new Date(now)),
};

export const CRON_JOBS: Record<string, string[]> = {
  "17 3 * * *": ["purge"],
  // Every 10 min 23:00–23:50 UTC (early evening in the Americas, late evening in Europe); each run sends one batch.
  "*/10 23 * * *": ["daily-digest"],
  // Hourly: parent-chosen local-hour reminders, max one per day per device (worker/routes/push.ts).
  "0 * * * *": ["push-reminders"],
};

/** Runs every job for the cron; one failing job never stops the others. Returns the names that failed. */
export async function runScheduled(cron: string, env: Env, now: number): Promise<string[]> {
  const names = CRON_JOBS[cron] ?? [];
  if (names.length === 0) console.warn(`[cron] no jobs for "${cron}"`);
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
