import { getWorld } from "../../src/content/registry";
import { MAX_BODY_BYTES, MAX_ROWS_PER_BATCH, validRow, type StatRow } from "../../src/analytics/schema";
import type { Route } from "../router";
import { behind } from "../router";
import { safeEqual, sha256Hex } from "../lib/crypto";
import { SECURITY_HEADERS, err, json, readCapped } from "../lib/http";
import { isDev } from "../lib/config";

/**
 * Anonymous play statistics (D-033).
 *
 * POST /api/play-stats  body: { rows: StatRow[] } (application/json or text/plain, for navigator.sendBeacon)
 *   Adds each valid row to today's (UTC) counter. The day is the server's, so a client can't write to other days.
 *   Invalid rows are skipped one by one (an old app version must not lose a whole batch); exercise and skill ids must
 *   belong to the game they're counted under, so made-up keys can't fill the table. Reads no cookie, stores no IP or
 *   user agent, answers 204 with no body. A D1 failure is logged and still answers 204: stats never matter more than
 *   play, and the app never retries (it can't double count).
 *   Abuse: the STATS_LIMITER binding allows 20 batches per minute per IP address (IPv6 per /64) at each Cloudflare
 *   location; over the limit the batch is dropped with 204 (the app doesn't care). The IP is only used as the limiter's
 *   key in memory at the edge; nothing stores it. The app sends at most one batch every 5 minutes plus one when hidden.
 *
 * GET /api/insights?days=30  Authorization: Bearer <ANALYTICS_TOKEN>
 *   The owner's dashboard data. 404 unless the secret is set (≥32 chars) and matches, so the route is invisible.
 *
 * Both answer 404 unless ANALYTICS_ENABLED="true".
 */
const content = { isGame: (id: string) => getWorld(id) !== undefined, skillsOf: (id: string) => getWorld(id)?.skills };

/** Rate-limit key: the IPv4 address, or the /64 prefix of an IPv6 address (one home network). Never stored. */
export function limiterKey(ip: string): string {
  if (!ip.includes(":")) return ip;
  const full = ip.split("::");
  const head = full[0]!.split(":").filter(Boolean);
  const tail = full.length > 1 ? (full[1] ?? "").split(":").filter(Boolean) : [];
  const groups = [...head, ...Array(Math.max(0, 8 - head.length - tail.length)).fill("0"), ...tail];
  return groups.slice(0, 4).join(":") + "::/64";
}

interface Limiter {
  limit(opts: { key: string }): Promise<{ success: boolean }>;
}
export const INSIGHTS_MAX_ROWS = 20_000;

export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** Pure: parse a body into valid rows (merging duplicates). Exported for tests. */
export function parseBatch(text: string | undefined): { rows: StatRow[]; skipped: number } | null {
  if (text === undefined) return null;
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  const raw = (body as { rows?: unknown } | null)?.rows;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_ROWS_PER_BATCH) return null;
  const merged = new Map<string, StatRow>();
  let skipped = 0;
  for (const x of raw) {
    const r = validRow(x, content);
    if (!r) {
      skipped++;
      continue;
    }
    const key = r.slice(0, 4).join("\u0000");
    const prev = merged.get(key);
    merged.set(key, prev ? [r[0], r[1], r[2], r[3], prev[4] + r[4], prev[5] + r[5]] : r);
  }
  return { rows: [...merged.values()], skipped };
}

function bearer(req: Request): string {
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

export const routes: Route[] = behind("analytics", [
  {
    method: "POST",
    path: "/api/play-stats",
    handler: async ({ req, env, url }) => {
      const type = req.headers.get("content-type") ?? "";
      if (!type.includes("application/json") && !type.includes("text/plain")) return err("bad_request", 400);
      const batch = parseBatch(await readCapped(req, MAX_BODY_BYTES));
      if (!batch) return err("bad_request", 400);
      const limiter = (env as Env & { STATS_LIMITER?: Limiter }).STATS_LIMITER;
      const ip = req.headers.get("cf-connecting-ip") ?? "";
      // local development (localhost only, like the other rate limits) is never limited, so e2e runs aren't throttled
      const within = !limiter || !ip || isDev(env, url) ? true : await limiter.limit({ key: limiterKey(ip) }).then((r) => r.success).catch(() => true);
      if (batch.rows.length > 0 && within) {
        const day = utcDay(Date.now());
        const stmt = env.DB.prepare(
          "INSERT INTO play_stats (day, event, game, k1, k2, count, total) VALUES (?, ?, ?, ?, ?, ?, ?) " +
            "ON CONFLICT (day, event, game, k1, k2) DO UPDATE SET count = count + excluded.count, total = total + excluded.total",
        );
        try {
          await env.DB.batch(batch.rows.map((r) => stmt.bind(day, ...r)));
        } catch (e) {
          console.error(`[stats] write failed: ${e instanceof Error ? e.message : "error"}`);
        }
      }
      const headers = new Headers(SECURITY_HEADERS);
      headers.delete("content-type");
      return new Response(null, { status: 204, headers });
    },
  },
  {
    method: "GET",
    path: "/api/insights",
    handler: async ({ req, env, url }) => {
      const secret = env.ANALYTICS_TOKEN ?? "";
      // compare fixed-length hashes so the check takes the same time whatever the key's length
      if (secret.length < 32 || !safeEqual(await sha256Hex(bearer(req)), await sha256Hex(secret))) return err("not_found", 404);
      const days = Math.min(400, Math.max(1, Number.parseInt(url.searchParams.get("days") ?? "30", 10) || 30));
      const from = utcDay(Date.now() - (days - 1) * 86_400_000);
      const [totals, daily] = await env.DB.batch<{ event: string; game: string; k1: string; k2: string; count: number; total: number; day?: string }>([
        env.DB.prepare(
          "SELECT event, game, k1, k2, SUM(count) AS count, SUM(total) AS total FROM play_stats WHERE day >= ? GROUP BY event, game, k1, k2 ORDER BY count DESC LIMIT ?",
        ).bind(from, INSIGHTS_MAX_ROWS),
        env.DB.prepare(
          "SELECT day, event, '' AS game, '' AS k1, '' AS k2, SUM(count) AS count, SUM(total) AS total FROM play_stats WHERE day >= ? AND event IN ('session', 'round_start', 'round_done', 'round_quit') GROUP BY day, event ORDER BY day",
        ).bind(from),
      ]);
      const rows = (totals?.results ?? []).map((r) => [r.event, r.game, r.k1, r.k2, r.count, r.total]);
      const perDay = (daily?.results ?? []).map((r) => [r.day, r.event, r.count]);
      return json({ from, days, rows, perDay, truncated: rows.length >= INSIGHTS_MAX_ROWS });
    },
  },
]);
