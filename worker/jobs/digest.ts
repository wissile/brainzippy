import { SKILL_WORLD, WORLDS, skillLabel, worldName } from "../../src/account/catalog";
import { currentStreak } from "../../src/account/points";
import type { ChildProgress } from "../../src/account/schema";
import { rowProgress } from "../lib/children";
import { appOrigin, signingSecret } from "../lib/config";
import { sendBatch, type EmailMessage } from "../lib/email";
import { digestEmail, type DigestChild } from "../lib/emailTemplates";
import { unsubscribeUrl } from "../routes/unsubscribe";

/**
 * Daily progress email (opt-in per parent). Runs from Cron Triggers in the evening (UTC).
 * Each run handles up to digestBatch(env) parents with 3 D1 queries and 1 Resend batch call, which keeps it inside the Free plan's
 * 50 D1 queries and 50 subrequests per invocation; several runs per evening cover more parents (see wrangler.jsonc).
 * Parents whose children did not play in the last 24 hours get no email. Never sent to children.
 */
/**
 * Parents per run. Default 25 keeps one run well inside the Free plan's 10 ms CPU per Cron invocation (each parent's
 * children's progress JSON is parsed). Set the DIGEST_BATCH var (max 90: ≤100 bound parameters per D1 query and
 * ≤100 emails per Resend batch) higher on Workers Paid.
 */
export const DEFAULT_BATCH = 25;
export const digestBatch = (env: Env) => {
  const n = Number(env.DIGEST_BATCH ?? DEFAULT_BATCH);
  return Number.isInteger(n) && n >= 1 && n <= 90 ? n : DEFAULT_BATCH;
};
const WINDOW_MS = 24 * 60 * 60 * 1000;
const RESEND_GAP_MS = 20 * 60 * 60 * 1000;

/** Pure: build one child's section from its progress for rounds in (now − 24h, now]. Null if the child did not play. */
export function digestChild(label: string, progress: ChildProgress, now: number): DigestChild | null {
  const recent = progress.history.filter((r) => r.ts > now - WINDOW_MS && r.ts <= now);
  if (recent.length === 0) return null;
  const skills = [...new Set(recent.flatMap((r) => r.skills))].sort();
  const lastDay = recent[recent.length - 1]!.day;
  return {
    label,
    games: recent.map((r) => ({ world: worldName(r.gameId), level: r.level, stars: r.stars })),
    skills: skills.map(skillLabel),
    streak: currentStreak(progress.history, lastDay),
    suggestion: suggestNext(progress),
  };
}

/** Pure: the skill with the lowest first-try rate (≥3 items seen), else the first world not yet played, else "keep going". */
export function suggestNext(p: ChildProgress): string {
  const candidates = Object.entries(p.skills)
    .filter(([id, t]) => t.completed >= 3 && SKILL_WORLD[id])
    .map(([id, t]) => ({ id, rate: t.firstTry / Math.max(1, t.completed) }))
    .sort((a, b) => a.rate - b.rate || a.id.localeCompare(b.id));
  const weakest = candidates[0];
  if (weakest && weakest.rate < 0.8) return `${worldName(SKILL_WORLD[weakest.id]!)}: a little more practice with ${skillLabel(weakest.id).toLowerCase()}.`;
  const unplayed = WORLDS.find((w) => !p.worlds[w.id]);
  if (unplayed) return `Try a new world: ${unplayed.name} (ages ${unplayed.ages}).`;
  return "Keep going: every world has harder levels to unlock.";
}

interface DigestParent {
  id: string;
  email: string;
}
interface DigestChildRow {
  parent_id: string;
  monster_name: string;
  nickname: string | null;
  progress_json: string;
}

export async function dailyDigest(env: Env, now = Date.now()): Promise<{ considered: number; sent: number }> {
  const base = new URL(appOrigin(env, new URL("https://brainzippy.com")));
  // Cron has no request: `base` is the public origin, so development fallbacks (dev secret, console email) never apply.
  if (!signingSecret(env, base)) {
    console.warn("[digest] SIGNING_SECRET missing: not sending (every email needs a signed unsubscribe link)");
    return { considered: 0, sent: 0 };
  }
  const db = env.DB;
  const parents = (
    await db
      .prepare("SELECT id, email FROM parents WHERE digest_opt_in = 1 AND (digest_last_sent_at IS NULL OR digest_last_sent_at < ?) ORDER BY id LIMIT ?")
      .bind(now - RESEND_GAP_MS, digestBatch(env))
      .all<DigestParent>()
  ).results;
  if (parents.length === 0) return { considered: 0, sent: 0 };
  const ph = parents.map(() => "?").join(",");
  const kids = (await db.prepare(`SELECT parent_id, monster_name, nickname, progress_json FROM children WHERE parent_id IN (${ph}) ORDER BY created_at`).bind(...parents.map((p) => p.id)).all<DigestChildRow>()).results;

  const messages: EmailMessage[] = [];
  for (const p of parents) {
    const sections = kids
      .filter((k) => k.parent_id === p.id)
      .map((k) => digestChild(k.nickname ?? k.monster_name, rowProgress(k), now))
      .filter((x): x is DigestChild => x !== null);
    if (sections.length === 0) continue;
    const unsub = (await unsubscribeUrl(env, base, p.id))!;
    const mail = digestEmail(sections, `${base.origin}/parents`, unsub);
    messages.push({
      to: p.email,
      ...mail,
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      tags: [{ name: "kind", value: "daily-digest" }],
    });
  }
  const day = new Date(now).toISOString().slice(0, 10);
  const result = await sendBatch(env, base, messages, `digest-${day}-${parents[0]!.id}`);
  if (!result.ok) {
    console.warn(`[digest] not sent: ${result.reason}`);
    return { considered: parents.length, sent: 0 };
  }
  // Mark everyone considered (including parents with nothing to report) so the next run moves on.
  await db.prepare(`UPDATE parents SET digest_last_sent_at = ? WHERE id IN (${ph})`).bind(now, ...parents.map((p) => p.id)).run();
  return { considered: parents.length, sent: messages.length };
}
