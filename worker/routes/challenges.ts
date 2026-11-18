import type { Ctx, Route } from "../router";
import { WORLDS } from "../../src/account/catalog";
import { ownChild, requireParent } from "../lib/auth";
import { rowMonster } from "../lib/children";
import { appOrigin } from "../lib/config";
import { randomToken, sha256Hex } from "../lib/crypto";
import { err, json, readJson } from "../lib/http";
import { allow, LIMITS } from "../lib/rateLimit";
import { CHALLENGE_TOKEN_RE, isInt, isObj, isWorldId, onlyKeys } from "../lib/validation";

/**
 * "Beat my score in <world>": a link to the same seeded round (world id, level, seed) plus the challenger's score.
 * Only the challenger's family and families with an ACTIVE friendship to the challenger can open it.
 * Results are visible to the challenger's parent (all results) and to each friend's parent (their own children only).
 */
export const CHALLENGE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const MAX_SCORE = 1000;

interface ChallengeRow {
  id: string;
  from_child: string;
  world_id: string;
  level: number;
  seed: number;
  score: number;
  created_at: number;
  expires_at: number;
  from_parent: string;
  monster_name: string;
  monster_json: string;
}

async function loadChallenge(c: Ctx, token: string | undefined): Promise<ChallengeRow | null> {
  if (!token || !CHALLENGE_TOKEN_RE.test(token)) return null;
  return c.env.DB.prepare(
    `SELECT ch.*, k.parent_id AS from_parent, k.monster_name, k.monster_json FROM challenges ch JOIN children k ON k.id = ch.from_child
     WHERE ch.token_hash = ? AND ch.expires_at > ?`,
  )
    .bind(await sha256Hex(token), Date.now())
    .first<ChallengeRow>();
}

/** The viewer's children who are active friends of the challenger. */
async function eligibleChildren(c: Ctx, parentId: string, fromChild: string) {
  return (
    await c.env.DB.prepare(
      `SELECT k.id, k.monster_name FROM children k JOIN friendships f
         ON ((f.child_a = k.id AND f.child_b = ?1) OR (f.child_b = k.id AND f.child_a = ?1))
       WHERE k.parent_id = ?2 AND f.approved_a = 1 AND f.approved_b = 1 ORDER BY k.created_at`,
    )
      .bind(fromChild, parentId)
      .all<{ id: string; monster_name: string }>()
  ).results;
}

export const routes: Route[] = [
  {
    method: "POST",
    path: "/api/challenges",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const body = await readJson(c.req);
      if (!isObj(body) || !onlyKeys(body, ["childId", "worldId", "level", "seed", "score"])) return err("invalid_body", 400);
      const { worldId, level, seed, score } = body;
      const world = WORLDS.find((w) => w.id === worldId);
      if (!isWorldId(worldId) || !world || !isInt(level, 0, world.maxLevel) || !isInt(seed, 0, 2_147_483_647) || !isInt(score, 0, MAX_SCORE)) return err("invalid_body", 400);
      const child = await ownChild(c, s, typeof body.childId === "string" ? body.childId : undefined);
      if (child instanceof Response) return child;
      if (!(await allow(c.env, LIMITS.challengePerParent, s.parentId))) return err("rate_limited", 429);
      const token = randomToken(16);
      const now = Date.now();
      await c.env.DB.prepare("INSERT INTO challenges (id, token_hash, from_child, world_id, level, seed, score, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), await sha256Hex(token), child.id, worldId, level, seed, score, now, now + CHALLENGE_TTL_MS)
        .run();
      return json({ token, link: `${appOrigin(c.env, c.url)}/challenge/${token}`, expiresAt: now + CHALLENGE_TTL_MS }, 201);
    },
  },
  {
    method: "GET",
    path: "/api/challenges/:token",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const ch = await loadChallenge(c, c.params.token);
      if (!ch) return err("not_found", 404);
      const mine = ch.from_parent === s.parentId;
      const players = mine ? [] : await eligibleChildren(c, s.parentId, ch.from_child);
      if (!mine && players.length === 0) return err("not_found", 404); // not a friend: indistinguishable from a missing challenge
      const results = (
        await c.env.DB.prepare(
          `SELECT r.child_id, r.score, k.monster_name, k.parent_id FROM challenge_results r JOIN children k ON k.id = r.child_id WHERE r.challenge_id = ? ORDER BY r.created_at`,
        )
          .bind(ch.id)
          .all<{ child_id: string; score: number; monster_name: string; parent_id: string }>()
      ).results.filter((r) => mine || r.parent_id === s.parentId);
      return json({
        worldId: ch.world_id,
        level: ch.level,
        seed: ch.seed,
        score: ch.score,
        expiresAt: ch.expires_at,
        mine,
        from: { monsterName: ch.monster_name, monster: rowMonster(ch) },
        players: players.map((p) => ({ id: p.id, monsterName: p.monster_name })),
        results: results.map((r) => ({ childId: r.parent_id === s.parentId ? r.child_id : undefined, monsterName: r.monster_name, score: r.score, beat: r.score > ch.score })),
      });
    },
  },
  {
    method: "POST",
    path: "/api/challenges/:token/result",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const ch = await loadChallenge(c, c.params.token);
      if (!ch) return err("not_found", 404);
      const body = await readJson(c.req);
      if (!isObj(body) || !onlyKeys(body, ["childId", "score"]) || typeof body.childId !== "string" || !isInt(body.score, 0, MAX_SCORE)) return err("invalid_body", 400);
      const players = await eligibleChildren(c, s.parentId, ch.from_child);
      if (!players.some((p) => p.id === body.childId)) return err("not_found", 404);
      await c.env.DB.prepare(
        `INSERT INTO challenge_results (challenge_id, child_id, score, created_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(challenge_id, child_id) DO UPDATE SET score = MAX(score, excluded.score)`,
      )
        .bind(ch.id, body.childId, body.score, Date.now())
        .run();
      const row = await c.env.DB.prepare("SELECT score FROM challenge_results WHERE challenge_id = ? AND child_id = ?").bind(ch.id, body.childId).first<{ score: number }>();
      const best = row?.score ?? body.score;
      return json({ ok: true, score: best, target: ch.score, beat: best > ch.score });
    },
  },
  {
    method: "GET",
    path: "/api/children/:id/challenges",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const child = await ownChild(c, s, c.params.id);
      if (child instanceof Response) return child;
      const now = Date.now();
      const [sent, played] = await c.env.DB.batch([
        c.env.DB.prepare(
          `SELECT ch.id, ch.world_id, ch.score, ch.created_at, r.score AS their_score, k.monster_name AS their_name
           FROM challenges ch LEFT JOIN challenge_results r ON r.challenge_id = ch.id LEFT JOIN children k ON k.id = r.child_id
           WHERE ch.from_child = ? AND ch.expires_at > ? ORDER BY ch.created_at DESC LIMIT 50`,
        ).bind(child.id, now),
        c.env.DB.prepare(
          `SELECT ch.id, ch.world_id, ch.score AS their_score, r.score AS my_score, k.monster_name AS their_name, r.created_at
           FROM challenge_results r JOIN challenges ch ON ch.id = r.challenge_id JOIN children k ON k.id = ch.from_child
           WHERE r.child_id = ? ORDER BY r.created_at DESC LIMIT 50`,
        ).bind(child.id),
      ]);
      type SentRow = { id: string; world_id: string; score: number; created_at: number; their_score: number | null; their_name: string | null };
      const byId = new Map<string, { id: string; worldId: string; score: number; createdAt: number; results: { monsterName: string; score: number; beat: boolean }[] }>();
      for (const r of (sent?.results ?? []) as SentRow[]) {
        const e = byId.get(r.id) ?? { id: r.id, worldId: r.world_id, score: r.score, createdAt: r.created_at, results: [] };
        if (r.their_name !== null && r.their_score !== null) e.results.push({ monsterName: r.their_name, score: r.their_score, beat: r.their_score > r.score });
        byId.set(r.id, e);
      }
      type PlayedRow = { id: string; world_id: string; their_score: number; my_score: number; their_name: string };
      return json({
        sent: [...byId.values()],
        played: ((played?.results ?? []) as PlayedRow[]).map((r) => ({ id: r.id, worldId: r.world_id, from: r.their_name, target: r.their_score, score: r.my_score, beat: r.my_score > r.their_score })),
      });
    },
  },
];
