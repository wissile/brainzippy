import type { Route } from "../router";
import { publicConfig } from "../lib/config";
import { json } from "../lib/http";

/**
 * GET /api/config → { accounts, billing, friends, push }: which optional features this deployment has switched on
 * (D-030). Public and identical for every visitor: no auth, no cookies read, no personal data, booleans only.
 * Cacheable for 5 minutes, so turning a flag on reaches devices within minutes of a deploy. The app reads it once at
 * startup (src/app/features.ts) and falls back to its last cached answer, or to all-off, when offline.
 */
export const CONFIG_MAX_AGE_SEC = 300;

export const routes: Route[] = [
  {
    method: "GET",
    path: "/api/config",
    handler: ({ env }) => json(publicConfig(env), 200, { "cache-control": `public, max-age=${CONFIG_MAX_AGE_SEC}` }),
  },
];
