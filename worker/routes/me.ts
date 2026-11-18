import type { Route } from "../router";
import { requireParent, type ChildRow } from "../lib/auth";
import { childOut, deleteChildrenStatements } from "../lib/children";
import { getEntitlement } from "../lib/entitlements";
import { err, json, readJson } from "../lib/http";
import { clearCookie } from "../lib/session";
import { isObj, onlyKeys } from "../lib/validation";

interface ParentRow {
  id: string;
  email: string;
  consent_version: string;
  consented_at: number;
  created_at: number;
  last_login_at: number | null;
  digest_opt_in: number;
}

export const routes: Route[] = [
  {
    method: "GET",
    path: "/api/me",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const [p, kids] = await c.env.DB.batch<ParentRow | ChildRow>([
        c.env.DB.prepare("SELECT * FROM parents WHERE id = ?").bind(s.parentId),
        c.env.DB.prepare("SELECT * FROM children WHERE parent_id = ? ORDER BY created_at").bind(s.parentId),
      ]);
      const parent = p?.results[0] as ParentRow | undefined;
      if (!parent) return err("unauthorized", 401);
      return json({
        parent: { email: parent.email, digestOptIn: parent.digest_opt_in === 1, createdAt: parent.created_at },
        children: (kids?.results as ChildRow[]).map(childOut),
        entitlement: await getEntitlement(c.env, { parentId: s.parentId }),
      });
    },
  },
  {
    method: "PUT",
    path: "/api/me",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const body = await readJson(c.req);
      if (!isObj(body) || !onlyKeys(body, ["digestOptIn"]) || typeof body.digestOptIn !== "boolean") return err("invalid_body", 400);
      await c.env.DB.prepare("UPDATE parents SET digest_opt_in = ? WHERE id = ?").bind(body.digestOptIn ? 1 : 0, s.parentId).run();
      return json({ ok: true, digestOptIn: body.digestOptIn });
    },
  },
  {
    method: "GET",
    path: "/api/me/export",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const db = c.env.DB;
      const parent = await db.prepare("SELECT email, consent_version, consented_at, created_at, last_login_at, digest_opt_in FROM parents WHERE id = ?").bind(s.parentId).first<Omit<ParentRow, "id">>();
      const kids = (await db.prepare("SELECT * FROM children WHERE parent_id = ? ORDER BY created_at").bind(s.parentId).all<ChildRow>()).results;
      const ids = kids.map((k) => k.id);
      const ph = ids.map(() => "?").join(",") || "NULL";
      const [friends, challenges, results] = ids.length
        ? await db.batch([
            db.prepare(
              `SELECT f.id, f.child_a, f.child_b, f.approved_a, f.approved_b, f.created_at, ca.monster_name AS name_a, cb.monster_name AS name_b
               FROM friendships f JOIN children ca ON ca.id = f.child_a JOIN children cb ON cb.id = f.child_b WHERE f.child_a IN (${ph}) OR f.child_b IN (${ph})`,
            ).bind(...ids, ...ids),
            db.prepare(`SELECT id, from_child, world_id, level, seed, score, created_at, expires_at FROM challenges WHERE from_child IN (${ph})`).bind(...ids),
            db.prepare(`SELECT challenge_id, child_id, score, created_at FROM challenge_results WHERE child_id IN (${ph})`).bind(...ids),
          ])
        : [{ results: [] }, { results: [] }, { results: [] }];
      const body = {
        exportedAt: new Date().toISOString(),
        format: "brainzippy-export-v1",
        parent: parent && { ...parent, digest_opt_in: parent.digest_opt_in === 1 },
        children: kids.map(childOut),
        friendships: friends?.results ?? [],
        challengesSent: challenges?.results ?? [],
        challengeResults: results?.results ?? [],
        note: "Friend entries show only the friend's monster name. Progress on a device that is not linked to an account is not included.",
      };
      return json(body, 200, { "content-disposition": 'attachment; filename="brainzippy-export.json"' });
    },
  },
  {
    method: "DELETE",
    path: "/api/me",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const body = await readJson(c.req);
      if (!isObj(body) || !onlyKeys(body, ["confirm"]) || body.confirm !== "delete") return err("confirmation_required", 400);
      const db = c.env.DB;
      const ids = (await db.prepare("SELECT id FROM children WHERE parent_id = ?").bind(s.parentId).all<{ id: string }>()).results.map((r) => r.id);
      await db.batch([
        ...deleteChildrenStatements(db, ids),
        db.prepare("DELETE FROM sessions WHERE parent_id = ?").bind(s.parentId),
        db.prepare("DELETE FROM auth_tokens WHERE email = ?").bind(s.email),
        db.prepare("DELETE FROM parent_signups WHERE email = ?").bind(s.email),
        db.prepare("DELETE FROM parents WHERE id = ?").bind(s.parentId),
      ]);
      c.outHeaders.delete("set-cookie");
      return json({ ok: true }, 200, { "set-cookie": clearCookie(c.url) });
    },
  },
];

