import { hmacHex, sha256Hex } from "./crypto";
import { isDev, signingSecret } from "./config";

/**
 * Fixed-window rate limiter backed by D1 (one upsert per check). Exact across locations, works in local dev,
 * and needs no extra binding. Keys are keyed hashes of the IP / email, so no raw IP or email is stored here.
 * Edge-level flood protection (WAF rate-limiting rule) is a separate, recommended layer — see docs/DATABASE.md.
 */
export interface Limit {
  bucket: string;
  max: number;
  windowSec: number;
}

export const LIMITS = {
  magicLinkPerIp: { bucket: "ml-ip", max: 10, windowSec: 3600 },
  magicLinkPerEmail: { bucket: "ml-em", max: 3, windowSec: 900 },
  verifyPerIp: { bucket: "vf-ip", max: 30, windowSec: 600 },
  invitePerParent: { bucket: "inv", max: 20, windowSec: 86_400 },
  acceptPerIp: { bucket: "acc-ip", max: 20, windowSec: 3600 },
  challengePerParent: { bucket: "chl", max: 30, windowSec: 86_400 },
  writePerParent: { bucket: "wr", max: 600, windowSec: 3600 },
  pushPerIp: { bucket: "push-ip", max: 30, windowSec: 3600 },
} satisfies Record<string, Limit>;

export const clientIp = (req: Request) => req.headers.get("cf-connecting-ip") ?? "local";

async function keyFor(env: Env, bucket: string, value: string, url: URL | null): Promise<string> {
  const secret = signingSecret(env, url);
  const digest = secret ? await hmacHex(secret, `rl:${value}`) : await sha256Hex(`rl:${value}`);
  return `${bucket}:${digest.slice(0, 32)}`;
}

/**
 * Returns true when the request is allowed. Fails open on database errors so rate limiting never blocks sign-in outright.
 * `url` is the request URL (null for non-request callers); it decides whether the local-development bypass may apply.
 */
export async function allow(env: Env, limit: Limit, value: string, url: URL | null, now = Date.now()): Promise<boolean> {
  // Per-IP limits are skipped in local development only: every local request comes from the same loopback address.
  if (isDev(env, url) && limit.bucket.endsWith("-ip")) return true;
  const windowStart = Math.floor(now / (limit.windowSec * 1000)) * limit.windowSec * 1000;
  try {
    const row = await env.DB.prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
       ON CONFLICT(key) DO UPDATE SET count = CASE WHEN window_start = ?2 THEN count + 1 ELSE 1 END, window_start = ?2
       RETURNING count`,
    )
      .bind(await keyFor(env, limit.bucket, value, url), windowStart)
      .first<{ count: number }>();
    return (row?.count ?? 0) <= limit.max;
  } catch {
    return true;
  }
}
