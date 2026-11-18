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

/** Feature flag for friends, leaderboard and challenges (FRIENDS_ENABLED var). Off unless exactly "true". */
export const friendsEnabled = (env: Env): boolean => env.FRIENDS_ENABLED === "true";

/** Version of the consent wording shown next to the checkbox (src/account/consent.ts). Bump when the wording changes. */
export { CONSENT_VERSION } from "../../src/account/consent";
