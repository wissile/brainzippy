import type { Route } from "../router";
import { err, json, readJson } from "../lib/http";
import { MAX_PROGRESS_BYTES, isUuid, parseGuestProgress } from "../lib/validation";

/** Anonymous guest progress (unchanged behaviour; client sync is OFF per D-011). No personal data. */
export const routes: Route[] = [
  {
    method: "POST",
    path: "/api/guest",
    async handler({ env }) {
      const id = crypto.randomUUID();
      const now = Date.now();
      await env.DB.prepare("INSERT INTO guest_sessions (id, created_at, updated_at, progress_json) VALUES (?, ?, ?, '{}')").bind(id, now, now).run();
      return json({ id }, 201);
    },
  },
  {
    method: "PUT",
    path: "/api/guest/:id/progress",
    async handler({ req, env, params }) {
      if (!isUuid(params.id)) return err("not_found", 404);
      const progress = parseGuestProgress(await readJson(req, MAX_PROGRESS_BYTES));
      if (!progress) return err("invalid_body", 400);
      const res = await env.DB.prepare("UPDATE guest_sessions SET progress_json = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(progress), Date.now(), params.id).run();
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
