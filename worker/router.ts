import { featureEnabled, type Feature } from "./lib/config";
import { err } from "./lib/http";
import { RateLimitUnavailable } from "./lib/rateLimit";
import { getSession, type Session } from "./lib/session";

/**
 * Tiny router. Route modules export `routes: Route[]`; worker/routes/index.ts lists modules, one line each.
 * Same-origin policy for state-changing methods lives here so no route can forget it.
 */
export type Method = "GET" | "POST" | "PUT" | "DELETE";

export interface Ctx {
  req: Request;
  env: Env;
  url: URL;
  params: Record<string, string>;
  exec?: ExecutionContext;
  /** Loads (and rolls) the parent session from the cookie; cached per request. */
  session(): Promise<Session | null>;
  /** Headers routes should add to their response (e.g. a refreshed session cookie). */
  outHeaders: Headers;
}

export interface Route {
  method: Method;
  /** e.g. "/api/children/:id/settings". Params match one path segment. */
  path: string;
  handler: (c: Ctx) => Promise<Response> | Response;
  /** Allow cross-origin POSTs (only for token-authenticated endpoints such as RFC 8058 one-click unsubscribe). */
  crossOrigin?: boolean;
  /**
   * Feature-flagged route: answers 404 (as if it didn't exist) unless the feature is on (worker/lib/config.ts):
   * "accounts" = ACCOUNTS_ENABLED, "billing" = BILLING_ENABLED (+ accounts), "friends" = FRIENDS_ENABLED (+ accounts),
   * "push" = both VAPID keys configured. Checked before the handler runs, so a disabled route never rate-limits.
   */
  feature?: Feature;
}

export const featureOn = (env: Env, feature: Route["feature"]): boolean => feature === undefined || featureEnabled(env, feature);

/** Marks every route of a module as belonging to a feature. */
export const behind = (feature: Feature, routes: Route[]): Route[] => routes.map((r) => ({ ...r, feature }));

interface Compiled extends Route {
  re: RegExp;
  keys: string[];
}

function compile(r: Route): Compiled {
  const keys: string[] = [];
  const pattern = r.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\/:([a-zA-Z]+)/g, (_m, k: string) => {
    keys.push(k);
    return "/([^/]+)";
  });
  return { ...r, re: new RegExp(`^${pattern}$`), keys };
}

export const SESSION_COOKIES = ["__Host-bz_sid", "bz_sid"];
const hasSessionCookie = (req: Request) => SESSION_COOKIES.some((n) => (req.headers.get("cookie") ?? "").includes(`${n}=`));

/**
 * Browsers send Origin on every cross-origin request and on same-origin POST/PUT/DELETE fetches.
 * - Origin present and different → reject.
 * - Origin missing: allowed only when the request carries no session cookie (curl, tests: no ambient authority to abuse).
 */
export function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (origin) return origin === new URL(req.url).origin;
  return !hasSessionCookie(req);
}

export function createRouter(routes: readonly Route[]) {
  const compiled = routes.map(compile);
  return async function handle(req: Request, env: Env, exec?: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method === "HEAD" ? "GET" : req.method;
    let pathMatched = false;
    for (const r of compiled) {
      const m = url.pathname.match(r.re);
      if (!m) continue;
      if (!featureOn(env, r.feature)) continue; // disabled features are indistinguishable from missing routes
      pathMatched = true;
      if (r.method !== method) continue;
      if (method !== "GET" && !r.crossOrigin && !originAllowed(req)) return err("forbidden", 403);
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1] ?? "")));
      const outHeaders = new Headers();
      let cached: Promise<Session | null> | undefined;
      const ctx: Ctx = { req, env, url, params, exec, outHeaders, session: () => (cached ??= getSession(req, env, outHeaders)) };
      let res: Response;
      try {
        res = await r.handler(ctx);
      } catch (e) {
        // Rate limiting is required but impossible (no SIGNING_SECRET outside development): fail closed, store nothing.
        if (e instanceof RateLimitUnavailable) return err("unavailable", 503);
        throw e;
      }
      if ([...outHeaders.keys()].length === 0) return res;
      const merged = new Response(res.body, res);
      outHeaders.forEach((v, k) => merged.headers.append(k, v));
      return merged;
    }
    return pathMatched ? err("method_not_allowed", 405) : err("not_found", 404);
  };
}
