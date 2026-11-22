/**
 * Secrets and optional vars not present in the generated worker-configuration.d.ts.
 * Set secrets with `wrangler secret put <NAME>` (and `.dev.vars` locally, gitignored). All are optional in development.
 */
interface Env {
  /** Resend API key (secret). Without it, development logs magic links to the console; other environments refuse to send. */
  RESEND_API_KEY?: string;
  /** HMAC key for unsubscribe links and rate-limit keys (secret, ≥32 random bytes). Not needed for guest-only play; outside
   * development, every route that rate-limits (accounts, billing, friends, push, guest sync) answers 503 without it. */
  SIGNING_SECRET?: string;
  /** Sender (var), default "BrainZippy <hello@brainzippy.com>". The domain must be verified in Resend. */
  EMAIL_FROM?: string;
  /** Public origin used in emailed links, e.g. "https://brainzippy.com" (var). Defaults to the request origin. */
  APP_ORIGIN?: string;
  /** Parents per digest run (1–90, default 25). Raise on Workers Paid. */
  DIGEST_BATCH?: string;
  /** "true" turns on friends, leaderboard and challenges (var). Off at top level and in production until the
   * verifiable-parental-consent question is decided by a lawyer (docs/legal/COPPA_CHECKLIST.md). */
  FRIENDS_ENABLED?: string;
  /** "true" turns on parent accounts: magic-link sign-in, /api/parent-signup, /api/me, children, sync and the daily
   * digest (var). Off at top level and in production until legal review (D-030). */
  ACCOUNTS_ENABLED?: string;
  /** "true" turns on billing: checkout, portal, redeem, status, webhook and the trial clock (var). Needs
   * ACCOUNTS_ENABLED. Off at top level and in production until legal review (D-030). */
  BILLING_ENABLED?: string;
  /** VAPID public key (var). Empty = daily reminders off. */
  VAPID_PUBLIC_KEY?: string;
  /** VAPID private key (secret). Missing = daily reminders off, even with a public key. */
  VAPID_PRIVATE_KEY?: string;
  /** Contact for push services, e.g. "mailto:hello@brainzippy.com" (var). */
  VAPID_SUBJECT?: string;
  /** "true" re-enables anonymous guest progress writes (/api/guest). Off by default: client sync is off (D-011). */
  GUEST_SYNC_ENABLED?: string;
}
