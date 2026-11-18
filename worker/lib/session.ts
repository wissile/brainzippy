import { randomToken, sha256Hex, TOKEN_RE } from "./crypto";

/**
 * Parent sessions: random 256-bit id in an HttpOnly, Secure, SameSite=Lax cookie; only SHA-256(id) is stored in D1.
 * 30-day rolling expiry (refreshed at most once a day to save writes). Logout deletes the row.
 * Over plain-http localhost (dev/e2e) the cookie is named `bz_sid` without Secure, because `__Host-` requires Secure.
 */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

export interface Session {
  parentId: string;
  email: string;
  idHash: string;
}

const isLocalHttp = (url: URL) => url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
export const cookieName = (url: URL) => (isLocalHttp(url) ? "bz_sid" : "__Host-bz_sid");

export function sessionCookie(url: URL, value: string, maxAgeSec: number): string {
  const secure = isLocalHttp(url) ? "" : "; Secure";
  return `${cookieName(url)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

export function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

export async function createSession(env: Env, url: URL, parentId: string, now = Date.now()): Promise<string> {
  const id = randomToken();
  await env.DB.prepare("INSERT INTO sessions (id_hash, parent_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256Hex(id), parentId, now, now + SESSION_TTL_MS)
    .run();
  return sessionCookie(url, id, SESSION_TTL_MS / 1000);
}

export async function getSession(req: Request, env: Env, outHeaders: Headers, now = Date.now()): Promise<Session | null> {
  const url = new URL(req.url);
  const id = readCookie(req, cookieName(url));
  if (!id || !TOKEN_RE.test(id)) return null;
  const idHash = await sha256Hex(id);
  const row = await env.DB.prepare("SELECT s.parent_id, s.expires_at, p.email FROM sessions s JOIN parents p ON p.id = s.parent_id WHERE s.id_hash = ?")
    .bind(idHash)
    .first<{ parent_id: string; expires_at: number; email: string }>();
  if (!row) return null;
  if (row.expires_at <= now) {
    await env.DB.prepare("DELETE FROM sessions WHERE id_hash = ?").bind(idHash).run();
    return null;
  }
  if (row.expires_at - now < SESSION_TTL_MS - REFRESH_AFTER_MS) {
    await env.DB.prepare("UPDATE sessions SET expires_at = ? WHERE id_hash = ?").bind(now + SESSION_TTL_MS, idHash).run();
    outHeaders.append("set-cookie", sessionCookie(url, id, SESSION_TTL_MS / 1000));
  }
  return { parentId: row.parent_id, email: row.email, idHash };
}

export async function destroySession(env: Env, url: URL, idHash: string): Promise<string> {
  await env.DB.prepare("DELETE FROM sessions WHERE id_hash = ?").bind(idHash).run();
  return clearCookie(url);
}

export const clearCookie = (url: URL) => sessionCookie(url, "", 0);
