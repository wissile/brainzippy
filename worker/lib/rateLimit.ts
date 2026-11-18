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

/**
 * Rate-limit key for the client address. IPv4 is used as is; IPv6 is reduced to its /64 prefix, because one
 * subscriber usually gets a whole /64 and could otherwise rotate through 2^64 addresses to dodge per-IP limits.
 */
export const clientIp = (req: Request) => ipKey(req.headers.get("cf-connecting-ip") ?? "local");

export function ipKey(ip: string): string {
  const s = ip.trim().toLowerCase();
  if (!s.includes(":")) return s;
  const hextets = expandIpv6(s);
  return hextets ? `${hextets.slice(0, 4).join(":")}::/64` : s;
}

/** Eight 4-digit hextets, or null if it isn't a valid IPv6 literal. Handles "::" and an embedded IPv4 tail. */
function expandIpv6(ip: string): string[] | null {
  let s = ip.replace(/^\[|\]$/g, "").replace(/%.*$/, ""); // brackets, zone id
  const v4 = s.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const n = v4.slice(1).map(Number);
    if (n.some((x) => x > 255)) return null;
    s = s.slice(0, v4.index) + `${((n[0]! << 8) | n[1]!).toString(16)}:${((n[2]! << 8) | n[3]!).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const all = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  if (all.length !== 8 || all.some((h) => !/^[0-9a-f]{1,4}$/.test(h))) return null;
  return all.map((h) => h.padStart(4, "0"));
}

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
