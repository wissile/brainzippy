/**
 * Build-time switches for the prerendered public site (D-030). The site is static HTML, so it can't ask
 * /api/config; instead scripts/prerender.mjs reads the flags of the Worker being built (the flattened
 * dist/<worker>/wrangler.json, i.e. wrangler.jsonc for CLOUDFLARE_ENV) and sets `globalThis.__BZ_SITE_FLAGS__`
 * before it imports the site. It never reads .dev.vars, so a local build can't publish a pricing page by accident.
 *
 * Unset (unit tests, a plain import) means the production default: billing off, so no /pricing page and
 * "Free while we're in early access" wherever the price would be.
 */
export interface SiteFlags {
  /** BILLING_ENABLED (and ACCOUNTS_ENABLED) are "true" for the environment being built. */
  billing: boolean;
  /** ACCOUNTS_ENABLED is "true". */
  accounts?: boolean;
  /** FRIENDS_ENABLED (and ACCOUNTS_ENABLED) are "true". */
  friends?: boolean;
  /**
   * VAPID_PUBLIC_KEY is non-empty. The private key is a secret the build can't see, so the site may describe reminders
   * that still lack it (over-disclosure, never under-disclosure); the app itself follows /api/config.
   */
  push?: boolean;
}

export const SITE_FLAGS_GLOBAL = "__BZ_SITE_FLAGS__";

export function siteFlags(): Required<SiteFlags> {
  const g = (globalThis as Record<string, unknown>)[SITE_FLAGS_GLOBAL] as Partial<SiteFlags> | undefined;
  return { billing: g?.billing === true, accounts: g?.accounts === true, friends: g?.friends === true, push: g?.push === true };
}
