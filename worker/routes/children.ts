import type { Route } from "../router";
import { mergeChildProgress } from "../../src/account/merge";
import { emptyChildProgress, DEFAULT_SETTINGS, MAX_CHILDREN } from "../../src/account/schema";
import { parsePublicName } from "../../src/account/publicName";
import { ownChild, requireParent, type ChildRow } from "../lib/auth";
import { childOut, deleteChildrenStatements, rowProgress, rowSettings } from "../lib/children";
import { err, json, readJson } from "../lib/http";
import { allow, LIMITS } from "../lib/rateLimit";
import { cleanDisplayName, isObj, MAX_CHILD_PROGRESS_BYTES, onlyKeys, parseAgeBand, parseChildProgress, parseMonster, parseSettings } from "../lib/validation";

/**
 * Child profiles (max 4 per parent), per-child settings and local-first progress sync.
 * Contract for GET/PUT /api/children/:id/settings is documented in docs/TECHNICAL_ARCHITECTURE.md (API section).
 * The child-typed monster name is never accepted: other families see only `publicName`, a pick-list combination
 * (src/account/publicName.ts) that defaults to a deterministic name and can be changed by the parent.
 */
export const routes: Route[] = [
  {
    method: "GET",
    path: "/api/children",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const rows = (await c.env.DB.prepare("SELECT * FROM children WHERE parent_id = ? ORDER BY created_at").bind(s.parentId).all<ChildRow>()).results;
      return json({ children: rows.map(childOut) });
    },
  },
  {
    method: "POST",
    path: "/api/children",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const body = await readJson(c.req, MAX_CHILD_PROGRESS_BYTES);
      if (!isObj(body) || !onlyKeys(body, ["publicName", "monster", "ageBand", "nickname", "progress"])) return err("invalid_body", 400);
      const monster = parseMonster(body.monster);
      const ageBand = parseAgeBand(body.ageBand);
      const publicName = body.publicName === undefined ? null : parsePublicName(body.publicName);
      if (!monster || !ageBand || (body.publicName !== undefined && !publicName)) return err("invalid_body", 400);
      let nickname: string | null = null;
      if (body.nickname !== undefined && body.nickname !== null) {
        nickname = cleanDisplayName(body.nickname);
        if (!nickname) return err("invalid_body", 400);
      }
      const progress = body.progress === undefined ? emptyChildProgress() : parseChildProgress(body.progress);
      if (!progress) return err("invalid_body", 400);
      const id = crypto.randomUUID();
      const now = Date.now();
      // Single statement so two concurrent requests can never exceed the cap (D1 runs one query at a time per database).
      const res = await c.env.DB.prepare(
        `INSERT INTO children (id, parent_id, monster_json, public_name, age_band, nickname, settings_json, progress_json, created_at, updated_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM children WHERE parent_id = ?) < ?`,
      )
        .bind(id, s.parentId, JSON.stringify(monster), publicName, ageBand, nickname, JSON.stringify(DEFAULT_SETTINGS), JSON.stringify(progress), now, now, s.parentId, MAX_CHILDREN)
        .run();
      if (!res.meta.changes) return err("too_many_children", 409);
      const row = await c.env.DB.prepare("SELECT * FROM children WHERE id = ?").bind(id).first<ChildRow>();
      return json({ child: childOut(row!) }, 201);
    },
  },
  {
    method: "PUT",
    path: "/api/children/:id",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const child = await ownChild(c, s, c.params.id);
      if (child instanceof Response) return child;
      const body = await readJson(c.req);
      if (!isObj(body) || !onlyKeys(body, ["publicName", "monster", "ageBand", "nickname"])) return err("invalid_body", 400);
      let { public_name, monster_json, age_band, nickname } = child;
      if (body.publicName !== undefined) {
        const v = parsePublicName(body.publicName);
        if (!v) return err("invalid_body", 400);
        public_name = v;
      }
      if (body.monster !== undefined) {
        const v = parseMonster(body.monster);
        if (!v) return err("invalid_body", 400);
        monster_json = JSON.stringify(v);
      }
      if (body.ageBand !== undefined) {
        const v = parseAgeBand(body.ageBand);
        if (!v) return err("invalid_body", 400);
        age_band = v;
      }
      if (body.nickname !== undefined) {
        if (body.nickname === null) nickname = null; // opt out: the stored nickname is deleted
        else {
          const v = cleanDisplayName(body.nickname);
          if (!v) return err("invalid_body", 400);
          nickname = v;
        }
      }
      await c.env.DB.prepare("UPDATE children SET public_name = ?, monster_json = ?, age_band = ?, nickname = ?, updated_at = ? WHERE id = ?")
        .bind(public_name, monster_json, age_band, nickname, Date.now(), child.id)
        .run();
      return json({ child: childOut({ ...child, public_name, monster_json, age_band, nickname }) });
    },
  },
  {
    method: "DELETE",
    path: "/api/children/:id",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const child = await ownChild(c, s, c.params.id);
      if (child instanceof Response) return child;
      await c.env.DB.batch(deleteChildrenStatements(c.env.DB, [child.id]));
      return json({ ok: true });
    },
  },
  {
    method: "GET",
    path: "/api/children/:id/settings",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const child = await ownChild(c, s, c.params.id);
      if (child instanceof Response) return child;
      return json({ settings: rowSettings(child) });
    },
  },
  {
    method: "PUT",
    path: "/api/children/:id/settings",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const child = await ownChild(c, s, c.params.id);
      if (child instanceof Response) return child;
      const settings = parseSettings(await readJson(c.req), rowSettings(child));
      if (!settings) return err("invalid_body", 400);
      await c.env.DB.prepare("UPDATE children SET settings_json = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(settings), Date.now(), child.id).run();
      return json({ settings });
    },
  },
  {
    method: "GET",
    path: "/api/children/:id/progress",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const child = await ownChild(c, s, c.params.id);
      if (child instanceof Response) return child;
      return json({ progress: rowProgress(child) });
    },
  },
  {
    method: "POST",
    path: "/api/children/:id/sync",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      if (!(await allow(c.env, LIMITS.writePerParent, s.parentId, c.url))) return err("rate_limited", 429);
      const child = await ownChild(c, s, c.params.id);
      if (child instanceof Response) return child;
      const body = await readJson(c.req, MAX_CHILD_PROGRESS_BYTES);
      if (!isObj(body) || !onlyKeys(body, ["progress"])) return err("invalid_body", 400);
      const incoming = parseChildProgress(body.progress);
      if (!incoming) return err("invalid_body", 400);
      const merged = mergeChildProgress(rowProgress(child), incoming);
      await c.env.DB.prepare("UPDATE children SET progress_json = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(merged), Date.now(), child.id).run();
      return json({ progress: merged, settings: rowSettings(child) });
    },
  },
];
