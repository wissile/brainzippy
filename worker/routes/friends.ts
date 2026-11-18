import type { Route, Ctx } from "../router";
import { weekSummary, addDays } from "../../src/account/points";
import { ownChild, requireParent, type ChildRow } from "../lib/auth";
import { rowMonster, rowProgress } from "../lib/children";
import { appOrigin } from "../lib/config";
import { inviteCode, normaliseInviteCode, sha256Hex } from "../lib/crypto";
import { err, json, readJson } from "../lib/http";
import { allow, clientIp, LIMITS } from "../lib/rateLimit";
import { isObj, isUuid, onlyKeys } from "../lib/validation";

/**
 * Friends-only social features. A friendship is between two CHILD profiles and becomes active only when both
 * parents approve: the inviting parent creates a single-use code; the other (signed-in) parent accepts it for one
 * of their children (their approval); the inviting parent then approves. Friends see only monster name, monster art
 * and weekly points. There is no messaging and no free text between families.
 */
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_FRIENDS = 20;
const MAX_OPEN_INVITES = 5;

/** "today" for weekly windows: the client's local day if it is within a day of UTC, else the UTC day. */
export function todayFor(url: URL, now = Date.now()): string {
  const utc = new Date(now).toISOString().slice(0, 10);
  const q = url.searchParams.get("today") ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(q) && (q === utc || q === addDays(utc, 1) || q === addDays(utc, -1)) ? q : utc;
}

interface FriendRow {
  id: string;
  child_a: string;
  child_b: string;
  approved_a: number;
  approved_b: number;
  created_at: number;
  other_id: string;
  monster_name: string;
  monster_json: string;
  progress_json: string;
}

export async function friendsOf(c: Ctx, childId: string): Promise<FriendRow[]> {
  return (
    await c.env.DB.prepare(
      `SELECT f.id, f.child_a, f.child_b, f.approved_a, f.approved_b, f.created_at, o.id AS other_id, o.monster_name, o.monster_json, o.progress_json
       FROM friendships f JOIN children o ON o.id = CASE WHEN f.child_a = ?1 THEN f.child_b ELSE f.child_a END
       WHERE f.child_a = ?1 OR f.child_b = ?1 ORDER BY f.created_at`,
    )
      .bind(childId)
      .all<FriendRow>()
  ).results;
}

const statusFor = (f: FriendRow, childId: string) => {
  if (f.approved_a && f.approved_b) return "active";
  const mineApproved = f.child_a === childId ? f.approved_a : f.approved_b;
  return mineApproved ? "waiting-for-them" : "needs-your-approval";
};

export const routes: Route[] = [
  {
    method: "POST",
    path: "/api/children/:id/invites",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const child = await ownChild(c, s, c.params.id);
      if (child instanceof Response) return child;
      if (!(await allow(c.env, LIMITS.invitePerParent, s.parentId))) return err("rate_limited", 429);
      const code = inviteCode();
      const now = Date.now();
      await c.env.DB.batch([
        // keep only the newest few open invites per child
        c.env.DB.prepare(
          `DELETE FROM friend_invites WHERE child_id = ?1 AND code_hash NOT IN (SELECT code_hash FROM friend_invites WHERE child_id = ?1 AND expires_at > ?2 ORDER BY created_at DESC LIMIT ${MAX_OPEN_INVITES - 1})`,
        ).bind(child.id, now),
        c.env.DB.prepare("INSERT INTO friend_invites (code_hash, child_id, created_at, expires_at) VALUES (?, ?, ?, ?)").bind(await sha256Hex(code), child.id, now, now + INVITE_TTL_MS),
      ]);
      return json({ code, link: `${appOrigin(c.env, c.url)}/parents/invite/${code}`, expiresAt: now + INVITE_TTL_MS }, 201);
    },
  },
  {
    method: "GET",
    path: "/api/invites/:code",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      if (!(await allow(c.env, LIMITS.acceptPerIp, clientIp(c.req)))) return err("rate_limited", 429);
      const code = normaliseInviteCode(c.params.code);
      if (!code) return err("not_found", 404);
      const row = await c.env.DB.prepare(
        "SELECT ch.parent_id, ch.monster_name, ch.monster_json FROM friend_invites i JOIN children ch ON ch.id = i.child_id WHERE i.code_hash = ? AND i.expires_at > ?",
      )
        .bind(await sha256Hex(code), Date.now())
        .first<{ parent_id: string; monster_name: string; monster_json: string }>();
      if (!row) return err("not_found", 404);
      return json({ from: { monsterName: row.monster_name, monster: rowMonster(row) }, ownChild: row.parent_id === s.parentId });
    },
  },
  {
    method: "POST",
    path: "/api/invites/:code/accept",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      if (!(await allow(c.env, LIMITS.acceptPerIp, clientIp(c.req)))) return err("rate_limited", 429);
      const code = normaliseInviteCode(c.params.code);
      const body = await readJson(c.req);
      if (!code || !isObj(body) || !onlyKeys(body, ["childId"])) return err("invalid_body", 400);
      const mine = await ownChild(c, s, typeof body.childId === "string" ? body.childId : undefined);
      if (mine instanceof Response) return mine;
      const codeHash = await sha256Hex(code);
      const invite = await c.env.DB.prepare("SELECT i.child_id, ch.parent_id FROM friend_invites i JOIN children ch ON ch.id = i.child_id WHERE i.code_hash = ? AND i.expires_at > ?")
        .bind(codeHash, Date.now())
        .first<{ child_id: string; parent_id: string }>();
      if (!invite) return err("not_found", 404);
      if (invite.parent_id === s.parentId) return err("own_child", 400);
      const existing = await c.env.DB.prepare("SELECT id FROM friendships WHERE (child_a = ?1 AND child_b = ?2) OR (child_a = ?2 AND child_b = ?1)").bind(invite.child_id, mine.id).first();
      if (existing) {
        await c.env.DB.prepare("DELETE FROM friend_invites WHERE code_hash = ?").bind(codeHash).run();
        return err("already_friends", 409);
      }
      const counts = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM friendships WHERE child_a IN (?1, ?2) OR child_b IN (?1, ?2)").bind(invite.child_id, mine.id).first<{ n: number }>();
      if ((counts?.n ?? 0) >= MAX_FRIENDS * 2) return err("too_many_friends", 409);
      // Consume the invite (single use) and create the friendship with the accepting parent's approval.
      const id = crypto.randomUUID();
      const [del] = await c.env.DB.batch([
        c.env.DB.prepare("DELETE FROM friend_invites WHERE code_hash = ?").bind(codeHash),
        // changes() = rows deleted by the previous statement in this batch: no friendship unless this request consumed the code
        c.env.DB.prepare("INSERT OR IGNORE INTO friendships (id, child_a, child_b, approved_a, approved_b, created_at) SELECT ?, ?, ?, 0, 1, ? WHERE changes() = 1").bind(id, invite.child_id, mine.id, Date.now()),
      ]);
      if (!del?.meta.changes) return err("not_found", 404);
      return json({ ok: true, friendshipId: id, status: "waiting-for-them" }, 201);
    },
  },
  {
    method: "GET",
    path: "/api/children/:id/friends",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const child = await ownChild(c, s, c.params.id);
      if (child instanceof Response) return child;
      const rows = await friendsOf(c, child.id);
      return json({ friends: rows.map((f) => ({ id: f.id, status: statusFor(f, child.id), monsterName: f.monster_name, monster: rowMonster(f) })) });
    },
  },
  {
    method: "POST",
    path: "/api/friendships/:id/approve",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      if (!isUuid(c.params.id)) return err("not_found", 404);
      const res = await c.env.DB.prepare(
        `UPDATE friendships SET
           approved_a = CASE WHEN child_a IN (SELECT id FROM children WHERE parent_id = ?1) THEN 1 ELSE approved_a END,
           approved_b = CASE WHEN child_b IN (SELECT id FROM children WHERE parent_id = ?1) THEN 1 ELSE approved_b END
         WHERE id = ?2 AND (child_a IN (SELECT id FROM children WHERE parent_id = ?1) OR child_b IN (SELECT id FROM children WHERE parent_id = ?1))`,
      )
        .bind(s.parentId, c.params.id)
        .run();
      if (!res.meta.changes) return err("not_found", 404);
      return json({ ok: true });
    },
  },
  {
    method: "DELETE",
    path: "/api/friendships/:id",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      if (!isUuid(c.params.id)) return err("not_found", 404);
      const res = await c.env.DB.prepare(
        "DELETE FROM friendships WHERE id = ?2 AND (child_a IN (SELECT id FROM children WHERE parent_id = ?1) OR child_b IN (SELECT id FROM children WHERE parent_id = ?1))",
      )
        .bind(s.parentId, c.params.id)
        .run();
      if (!res.meta.changes) return err("not_found", 404);
      return json({ ok: true });
    },
  },
  {
    method: "GET",
    path: "/api/children/:id/leaderboard",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const child = await ownChild(c, s, c.params.id);
      if (child instanceof Response) return child;
      const today = todayFor(c.url);
      const entry = (key: string, row: Pick<ChildRow, "monster_name" | "monster_json" | "progress_json">, me: boolean) => ({
        key,
        me,
        monsterName: row.monster_name,
        monster: rowMonster(row),
        points: weekSummary(rowProgress(row).history, today).points,
      });
      const friends = (await friendsOf(c, child.id)).filter((f) => f.approved_a && f.approved_b);
      const rows = [entry("me", child, true), ...friends.map((f) => entry(f.id, f, false))];
      rows.sort((a, b) => b.points - a.points || (a.me ? -1 : b.me ? 1 : a.monsterName.localeCompare(b.monsterName)));
      return json({ week: weekSummary([], today).weekStart, entries: rows });
    },
  },
];
