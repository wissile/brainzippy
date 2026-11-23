/**
 * Environment helpers. Development is the only environment allowed to run without secrets.
 *
 * Defence in depth: `APP_ENV` is "production" at the top level of wrangler.jsonc; development comes only from the
 * gitignored `.dev.vars`. Even if a deployed Worker were misconfigured with APP_ENV=development, `isDev` is still
 * false unless the request itself is for localhost / 127.0.0.1, so dev links, the dev signing secret, the fake
 * Stripe and the rate-limit bypasses can never run on a real host. Code without a request (cron jobs) passes null
 * and never gets development behaviour.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

export const isLocalHost = (url: URL | null | undefined): boolean => !!url && LOCAL_HOSTS.has(url.hostname);

export const isDev = (env: Env, url: URL | null | undefined): boolean => (env.APP_ENV as string) === "development" && isLocalHost(url);

const DEV_SIGNING_SECRET = "dev-only-signing-secret-not-for-production";

/** HMAC key for unsubscribe links and rate-limit key hashing. Null outside local development when the secret is missing. */
export function signingSecret(env: Env, url: URL | null): string | null {
  if (env.SIGNING_SECRET && env.SIGNING_SECRET.length >= 32) return env.SIGNING_SECRET;
  return isDev(env, url) ? DEV_SIGNING_SECRET : null;
}

/** Origin used in emailed links. Prefer the configured public origin so links never point at an internal host. */
export function appOrigin(env: Env, url: URL): string {
  return env.APP_ORIGIN && /^https:\/\/[a-z0-9.-]+$/.test(env.APP_ORIGIN) ? env.APP_ORIGIN : url.origin;
}

export const emailFrom = (env: Env) => env.EMAIL_FROM ?? "BrainZippy <hello@brainzippy.com>";

/**
 * Feature flags (wrangler.jsonc vars). Each is off unless its value is exactly "true": a typo, "1", "TRUE" or a
 * missing var keeps the feature off. Top level and production are "false" until legal review (D-030).
 *
 * Dependencies are enforced here, once, so no caller can get them wrong:
 * - ACCOUNTS_ENABLED: parent sign-in/sign-up (magic links), /api/parent-signup, /api/me, children, sync, dashboard,
 *   and the daily digest email job.
 * - BILLING_ENABLED: checkout, portal, redeem, status, webhook and the day-15 trial clock. Needs accounts (every
 *   billing route except the webhook needs a signed-in parent).
 * - FRIENDS_ENABLED: friends, leaderboard and challenges. Needs accounts.
 */
export const flagOn = (v: string | undefined): boolean => v === "true";
export const accountsEnabled = (env: Env): boolean => flagOn(env.ACCOUNTS_ENABLED);
export const billingEnabled = (env: Env): boolean => accountsEnabled(env) && flagOn(env.BILLING_ENABLED);
export const friendsEnabled = (env: Env): boolean => accountsEnabled(env) && flagOn(env.FRIENDS_ENABLED);
/**
 * Daily reminders (web push) are configured only when BOTH VAPID keys exist: the public key var is non-empty and the
 * VAPID_PRIVATE_KEY secret is set. One notion everywhere: /api/config `push`, the /api/push/* routes (404 otherwise,
 * before any rate limiting) and the client's reminders section.
 */
export const pushEnabled = (env: Env): boolean =>
  typeof env.VAPID_PUBLIC_KEY === "string" && env.VAPID_PUBLIC_KEY.trim().length > 0 && typeof env.VAPID_PRIVATE_KEY === "string" && env.VAPID_PRIVATE_KEY.length > 0;

/**
 * ANALYTICS_ENABLED: anonymous, aggregate play statistics (D-033, src/analytics/schema.ts). Independent of accounts:
 * it stores counters only, never anything that identifies a child or device.
 */
export const analyticsEnabled = (env: Env): boolean => flagOn(env.ANALYTICS_ENABLED);

export type Feature = "accounts" | "billing" | "friends" | "push" | "analytics";
export interface PublicConfig {
  accounts: boolean;
  billing: boolean;
  friends: boolean;
  push: boolean;
  analytics: boolean;
}
/** What GET /api/config tells the app. Booleans only: no ids, no keys, nothing about the visitor. */
export const publicConfig = (env: Env): PublicConfig => ({ accounts: accountsEnabled(env), billing: billingEnabled(env), friends: friendsEnabled(env), push: pushEnabled(env), analytics: analyticsEnabled(env) });
const FEATURE_CHECKS: Record<Feature, (env: Env) => boolean> = { accounts: accountsEnabled, billing: billingEnabled, friends: friendsEnabled, push: pushEnabled, analytics: analyticsEnabled };
export const featureEnabled = (env: Env, f: Feature): boolean => FEATURE_CHECKS[f](env);

/** Version of the consent wording shown next to the checkbox (src/account/consent.ts). Bump when the wording changes. */
export { CONSENT_VERSION } from "../../src/account/consent";
