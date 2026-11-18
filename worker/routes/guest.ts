import type { Ctx, Route } from "../router";
import { err, json, readJson } from "../lib/http";
import { allow, clientIp, type Limit } from "../lib/rateLimit";
import { MAX_PROGRESS_BYTES, isUuid, parseGuestProgress } from "../lib/validation";

/**
 * Anonymous guest progress. No personal data.
 *
 * Writes are DISABLED while client sync is off (D-011, security review 2026-11-18): POST /api/guest and
 * PUT /api/guest/:id/progress answer 404 unless GUEST_SYNC_ENABLED="true". Nothing in the app calls them, so leaving
 * them open would only let anyone fill D1 with rows. GET and DELETE stay available so any existing row can still be
 * read back or deleted by its device. If writes are re-enabled, they are rate-limited per IP (IPv6 by /64).
 */
export const GUEST_LIMITS = {
  createPerIp: { bucket: "guest-ip", max: 20, windowSec: 3600 },
  writePerIp: { bucket: "guestw-ip", max: 240, windowSec: 3600 },
} satisfies Record<string, Limit>;

const writesEnabled = (env: Env) => env.GUEST_SYNC_ENABLED === "true";
const limited = async (c: Ctx, limit: Limit) => !(await allow(c.env, limit, clientIp(c.req), c.url));

export const routes: Route[] = [
  {
    method: "POST",
    path: "/api/guest",
    async handler(c) {
      if (!writesEnabled(c.env)) return err("not_found", 404);
      if (await limited(c, GUEST_LIMITS.createPerIp)) return err("rate_limited", 429);
      const id = crypto.randomUUID();
      const now = Date.now();
      await c.env.DB.prepare("INSERT INTO guest_sessions (id, created_at, updated_at, progress_json) VALUES (?, ?, ?, '{}')").bind(id, now, now).run();
      return json({ id }, 201);
    },
  },
  {
    method: "PUT",
    path: "/api/guest/:id/progress",
    async handler(c) {
      if (!writesEnabled(c.env)) return err("not_found", 404);
      if (!isUuid(c.params.id)) return err("not_found", 404);
      if (await limited(c, GUEST_LIMITS.writePerIp)) return err("rate_limited", 429);
      const progress = parseGuestProgress(await readJson(c.req, MAX_PROGRESS_BYTES));
      if (!progress) return err("invalid_body", 400);
      const res = await c.env.DB.prepare("UPDATE guest_sessions SET progress_json = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(progress), Date.now(), c.params.id).run();
      if (!res.meta.changes) return err("not_found", 404);
      return json({ ok: true });
    },
  },
  {
    method: "GET",
    path: "/api/guest/:id/progress",
    async handler({ env, params }) {
      if (!isUuid(params.id)) return err("not_found", 404);
      const row = await env.DB.prepare("SELECT progress_json FROM guest_sessions WHERE id = ?").bind(params.id).first<{ progress_json: string }>();
      if (!row) return err("not_found", 404);
      return json({ progress: JSON.parse(row.progress_json) as unknown });
    },
  },
  {
    method: "DELETE",
    path: "/api/guest/:id",
    async handler({ env, params }) {
      if (!isUuid(params.id)) return err("not_found", 404);
      await env.DB.prepare("DELETE FROM guest_sessions WHERE id = ?").bind(params.id).run();
      return json({ ok: true });
    },
  },
];
