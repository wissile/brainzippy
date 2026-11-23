/** Daily retention purge. Retention periods are documented in docs/PRIVACY_SECURITY.md. */
import { STRIPE_EVENT_RETENTION_MS } from "../lib/stripeEvents";
export const GUEST_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
export const PENDING_SIGNUP_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
/** Anonymous play statistics are kept 400 days (a full year to compare with, plus margin), D-033. */
export const PLAY_STATS_RETENTION_DAYS = 400;

export async function purge(env: Env, now = Date.now()): Promise<void> {
  const db = env.DB;
  await db.batch([
    db.prepare("DELETE FROM guest_sessions WHERE updated_at < ?").bind(now - GUEST_RETENTION_MS),
    db.prepare("DELETE FROM parent_signups WHERE status = 'pending' AND created_at < ?").bind(now - PENDING_SIGNUP_TTL_MS),
    db.prepare("DELETE FROM auth_tokens WHERE expires_at < ?").bind(now - DAY),
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now),
    db.prepare("DELETE FROM friend_invites WHERE expires_at < ?").bind(now),
    db.prepare("DELETE FROM challenge_results WHERE challenge_id IN (SELECT id FROM challenges WHERE expires_at < ?)").bind(now),
    db.prepare("DELETE FROM challenges WHERE expires_at < ?").bind(now),
    db.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(now - 2 * DAY),
    // Stripe retries a webhook for up to 3 days, so 30 days of processed ids is ample for idempotency.
    db.prepare("DELETE FROM stripe_events WHERE received_at < ?").bind(now - STRIPE_EVENT_RETENTION_MS),
    db.prepare("DELETE FROM play_stats WHERE day < ?").bind(new Date(now - PLAY_STATS_RETENTION_DAYS * DAY).toISOString().slice(0, 10)),
  ]);
}
