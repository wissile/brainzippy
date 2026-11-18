/** Environment helpers. Development is the only environment allowed to run without secrets. */
export const isDev = (env: Env) => (env.APP_ENV as string) === "development";

const DEV_SIGNING_SECRET = "dev-only-signing-secret-not-for-production";

/** HMAC key for unsubscribe links and rate-limit key hashing. Null outside development when the secret is missing. */
export function signingSecret(env: Env): string | null {
  if (env.SIGNING_SECRET && env.SIGNING_SECRET.length >= 32) return env.SIGNING_SECRET;
  return isDev(env) ? DEV_SIGNING_SECRET : null;
}

/** Origin used in emailed links. Prefer the configured public origin so links never point at an internal host. */
export function appOrigin(env: Env, url: URL): string {
  return env.APP_ORIGIN && /^https:\/\/[a-z0-9.-]+$/.test(env.APP_ORIGIN) ? env.APP_ORIGIN : url.origin;
}

export const emailFrom = (env: Env) => env.EMAIL_FROM ?? "BrainZippy <hello@brainzippy.com>";

/** Version of the consent wording shown next to the checkbox (src/account/consent.ts). Bump when the wording changes. */
export { CONSENT_VERSION } from "../../src/account/consent";
