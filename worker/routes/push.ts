import { REMINDER_TITLE, type ReminderPayload, reminderBody, reminderVariant } from "../../src/pwa/reminderCopy";
import { type Ctx, type Route, behind } from "../router";
import { readCapped } from "../lib/http";
import { LIMITS, allow, clientIp } from "../lib/rateLimit";
import { type VapidKeys, b64urlDecode, sendWebPush } from "../lib/webpush";
import { isAllowedHour, isValidTimeZone, selectDue } from "../lib/webpushSchedule";

/**
 * Parent-controlled daily reminders (Web Push). Self-contained: index.ts only dispatches /api/push/* here
 * and calls sendDueReminders() from the hourly cron.
 *
 * Stored per device (migrations/0004_push.sql): a random device id, the push endpoint + its two keys, the
 * chosen local hour, the IANA timezone and the local date of the last send. No names, emails, or IPs.
 *
 *   GET  /api/push/key           → { publicKey }   (503 if VAPID is not configured)
 *   POST /api/push/subscribe     { id, endpoint, keys: { p256dh, auth }, hour, tz }
 *   POST /api/push/unsubscribe   { id }
 */
export interface PushEnv {
  DB: D1Database;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}

const HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cross-origin-resource-policy": "same-origin",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
  "strict-transport-security": "max-age=63072000; includeSubDomains",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MAX_BODY = 2048;
/** Retention: a subscription the app hasn't refreshed for this long is deleted (the app refreshes it on every open). */
export const PUSH_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
/** Conservative per-run cap so one cron invocation stays well inside Workers subrequest limits. */
export const MAX_SENDS_PER_RUN = 40;
const MAX_ROWS_PER_RUN = 5000;

/**
 * Only real browser push services may be registered. Without this, anyone could make our Worker POST
 * to an arbitrary URL every day.
 */
const PUSH_HOST_SUFFIXES = ["fcm.googleapis.com", "android.googleapis.com", "push.services.mozilla.com", "notify.windows.com", "push.apple.com"];
export function isAllowedEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 1024) return false;
  let u: URL;
  try {
    u = new URL(endpoint);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return false;
  const host = u.hostname.toLowerCase();
  return PUSH_HOST_SUFFIXES.some((s) => host === s || host.endsWith(`.${s}`));
}

function keyOk(text: unknown, len: number, first?: number): text is string {
  if (typeof text !== "string" || text.length > 200) return false;
  try {
    const b = b64urlDecode(text);
    return b.length === len && (first === undefined || b[0] === first);
  } catch {
    return false;
  }
}

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(req.url).origin;
}

async function readBody(req: Request): Promise<Record<string, unknown> | undefined> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return undefined;
  // Byte-counted, aborts at MAX_BODY: never buffers an oversized or chunked body.
  const text = await readCapped(req, MAX_BODY).catch(() => undefined);
  if (text === undefined) return undefined;
  try {
    const v = JSON.parse(text) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

export interface SubscribeInput {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  hour: number;
  tz: string;
}

/** Strict validation: unknown keys are rejected so nothing else (names, emails) can ride along. */
export function parseSubscribe(body: Record<string, unknown> | undefined): SubscribeInput | null {
  if (!body) return null;
  if (Object.keys(body).some((k) => !["id", "endpoint", "keys", "hour", "tz"].includes(k))) return null;
  const keys = body.keys as Record<string, unknown> | undefined;
  if (!keys || typeof keys !== "object" || Object.keys(keys).some((k) => k !== "p256dh" && k !== "auth")) return null;
  if (typeof body.id !== "string" || !UUID_RE.test(body.id)) return null;
  if (!isAllowedEndpoint(body.endpoint)) return null;
  if (!keyOk(keys.p256dh, 65, 4) || !keyOk(keys.auth, 16)) return null;
  if (!isAllowedHour(body.hour)) return null;
  if (!isValidTimeZone(body.tz)) return null;
  return { id: body.id, endpoint: body.endpoint, p256dh: keys.p256dh, auth: keys.auth, hour: body.hour, tz: body.tz };
}

export async function handlePush(req: Request, env: PushEnv): Promise<Response> {
  const path = new URL(req.url).pathname;
  if (req.method !== "GET" && !sameOrigin(req)) return json({ error: "forbidden" }, 403);

  if (path === "/api/push/key" && req.method === "GET") {
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return json({ error: "push_not_configured" }, 503);
    return json({ publicKey: env.VAPID_PUBLIC_KEY });
  }

  if (path === "/api/push/subscribe" && req.method === "POST") {
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return json({ error: "push_not_configured" }, 503);
    const s = parseSubscribe(await readBody(req));
    if (!s) return json({ error: "invalid_body" }, 400);
    const now = Date.now();
    await env.DB.batch([
      // one row per endpoint: a re-subscribe from a new device id replaces the old row
      env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ? AND id != ?").bind(s.endpoint, s.id),
      env.DB.prepare(
        `INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, hour, tz, last_sent, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
         ON CONFLICT(id) DO UPDATE SET endpoint = excluded.endpoint, p256dh = excluded.p256dh, auth = excluded.auth,
           hour = excluded.hour, tz = excluded.tz, updated_at = excluded.updated_at`,
      ).bind(s.id, s.endpoint, s.p256dh, s.auth, s.hour, s.tz, now, now),
    ]);
    return json({ ok: true });
  }

  if (path === "/api/push/unsubscribe" && req.method === "POST") {
    const body = await readBody(req);
    if (!body || Object.keys(body).some((k) => k !== "id") || typeof body.id !== "string" || !UUID_RE.test(body.id)) return json({ error: "invalid_body" }, 400);
    await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(body.id).run();
    return json({ ok: true });
  }

  return json({ error: "not_found" }, 404);
}

interface SubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  hour: number;
  tz: string;
  last_sent: string | null;
}

export interface ReminderRunResult {
  skipped?: "not_configured";
  due: number;
  sent: number;
  removed: number;
  failed: number;
}

/**
 * Hourly cron job: send today's reminder to every subscription whose chosen local hour is now.
 * 404/410 from the push service = the subscription is gone → delete it. Other failures are left for
 * tomorrow (no retries inside the hour, so a flaky push service can never cause duplicates).
 */
export async function sendDueReminders(env: PushEnv, now = new Date(), fetchImpl: typeof fetch = fetch): Promise<ReminderRunResult> {
  await env.DB.prepare("DELETE FROM push_subscriptions WHERE updated_at < ?").bind(now.getTime() - PUSH_RETENTION_MS).run();
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return { skipped: "not_configured", due: 0, sent: 0, removed: 0, failed: 0 };
  const keys: VapidKeys = { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };

  // Most overdue first: never-sent rows, then the oldest last_sent (local dates sort as text), then the least recently
  // refreshed. With more due rows than MAX_SENDS_PER_RUN (or rows than MAX_ROWS_PER_RUN), nobody is starved by
  // insertion order: whoever was skipped today has the oldest last_sent tomorrow.
  const { results } = await env.DB.prepare(
    `SELECT id, endpoint, p256dh, auth, hour, tz, last_sent FROM push_subscriptions
     ORDER BY last_sent IS NOT NULL, last_sent ASC, updated_at ASC, id ASC LIMIT ${MAX_ROWS_PER_RUN}`,
  ).all<SubRow>();
  const due = selectDue(results ?? [], now);
  const result: ReminderRunResult = { due: due.length, sent: 0, removed: 0, failed: 0 };

  for (const { sub, localDate, ttl } of due.slice(0, MAX_SENDS_PER_RUN)) {
    const variant = reminderVariant(localDate);
    const payload: ReminderPayload = { v: 1, kind: "daily", variant, title: REMINDER_TITLE, body: reminderBody(variant), url: "/" };
    let status = 0;
    try {
      status = await sendWebPush(sub, JSON.stringify(payload), keys, env.VAPID_SUBJECT, { ttl, topic: "bz-daily", urgency: "normal", fetchImpl });
    } catch {
      status = 0;
    }
    if (status >= 200 && status < 300) {
      await env.DB.prepare("UPDATE push_subscriptions SET last_sent = ? WHERE id = ?").bind(localDate, sub.id).run();
      result.sent++;
    } else if (status === 404 || status === 410) {
      await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(sub.id).run();
      result.removed++;
    } else {
      result.failed++;
    }
  }
  return result;
}

/**
 * Router adapter: /api/push/* keeps its self-contained handler; state-changing calls are rate-limited per IP.
 * Behind the "push" feature: unless both VAPID keys are configured, every /api/push/* route answers 404 before any rate
 * limiting, so a deployment without reminders never writes a rate_limits row for them.
 */
const limited = async (c: Ctx): Promise<Response> => {
  if (!(await allow(c.env, LIMITS.pushPerIp, clientIp(c.req), c.url))) return json({ error: "rate_limited" }, 429);
  return handlePush(c.req, c.env as unknown as PushEnv);
};
export const routes: Route[] = behind("push", [
  { method: "GET", path: "/api/push/key", handler: (c) => handlePush(c.req, c.env as unknown as PushEnv) },
  { method: "POST", path: "/api/push/subscribe", handler: limited },
  { method: "POST", path: "/api/push/unsubscribe", handler: limited },
]);
