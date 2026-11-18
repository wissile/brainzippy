/**
 * Secrets and optional vars not present in the generated worker-configuration.d.ts.
 * Set secrets with `wrangler secret put <NAME>` (and `.dev.vars` locally, gitignored). All are optional in development.
 */
interface Env {
  /** Resend API key (secret). Without it, development logs magic links to the console; other environments refuse to send. */
  RESEND_API_KEY?: string;
  /** HMAC key for unsubscribe links and hashed rate-limit keys (secret, ≥32 random bytes). Required outside development. */
  SIGNING_SECRET?: string;
  /** Sender, e.g. "BrainZippy <hello@mail.brainzippy.com>" (var). Domain must be verified in Resend. */
  EMAIL_FROM?: string;
  /** Public origin used in emailed links, e.g. "https://brainzippy.com" (var). Defaults to the request origin. */
  APP_ORIGIN?: string;
  /** Parents per digest run (1–90, default 25). Raise on Workers Paid. */
  DIGEST_BATCH?: string;
  /** "true" turns on friends, leaderboard and challenges (var). Off at top level and in production until the
   * verifiable-parental-consent question is decided by a lawyer (docs/legal/COPPA_CHECKLIST.md). */
  FRIENDS_ENABLED?: string;
  /** "true" re-enables anonymous guest progress writes (/api/guest). Off by default: client sync is off (D-011). */
  GUEST_SYNC_ENABLED?: string;
}
