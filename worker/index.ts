import { MAX_PROGRESS_BYTES, parseGuestProgress } from "../src/engine/progressSchema";
import { handlePush, sendDueReminders } from "./routes/push";

/**
 * BrainZippy API Worker. Static assets (the SPA) are served by Workers Static Assets; only /api/* runs here.
 * Anonymous guest progress only — no personal data, no cookies, no third-party calls.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const RETENTION_MS = 180 * 24 * 60 * 60 * 1000;

const SECURITY_HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cross-origin-resource-policy": "same-origin",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
  "strict-transport-security": "max-age=31536000",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: SECURITY_HEADERS });
}

/** Reject cross-site writes: browsers always send Origin on POST/PUT/DELETE fetches. */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl, tests); no ambient credentials exist to abuse
  return origin === new URL(req.url).origin;
}

/** Read a JSON body, counting real bytes and aborting as soon as the cap is exceeded (works without Content-Length). */
async function readJson(req: Request): Promise<unknown | undefined> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return undefined;
  if (Number(req.headers.get("content-length") ?? "0") > MAX_PROGRESS_BYTES) return undefined;
  if (!req.body) return undefined;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_PROGRESS_BYTES) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(buf));
  } catch {
    return undefined;
  }
}

const EMAIL_RE = /^[^\s@"<>]{1,64}@[^\s@"<>]{1,189}\.[^\s@"<>]{2,24}$/;
const CONSENT_VERSION = "2026-11-17";
const RESEND_COOLDOWN_MS = 10 * 60 * 1000;
const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function sha256(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function html(body: string, status = 200): Response {
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BrainZippy</title><body style="font-family:system-ui;max-width:520px;margin:15vh auto;padding:0 20px;color:#2B2140;text-align:center">${body}</body>`, {
    status,
    headers: { ...SECURITY_HEADERS, "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'" },
  });
}

/**
 * Parent sign-up (consent step). Accepts ONLY a parent's email + explicit consent. Child data never reaches this endpoint.
 * Without an email provider configured, verification links are returned only in development; other environments
 * refuse rather than store addresses that can't be verified.
 */
async function parentSignup(req: Request, env: Env): Promise<Response> {
  const body = (await readJson(req)) as Record<string, unknown> | undefined;
  if (!body || typeof body !== "object") return json({ error: "invalid_body" }, 400);
  const keys = Object.keys(body);
  if (keys.some((k) => k !== "email" && k !== "consent")) return json({ error: "invalid_body" }, 400);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (body.consent !== true) return json({ error: "consent_required" }, 400);
  if (email.length > 254 || !EMAIL_RE.test(email)) return json({ error: "invalid_email" }, 400);

  const dev = env.APP_ENV === "development";
  if (!dev) return json({ error: "email_delivery_not_configured" }, 503);

  const now = Date.now();
  const existing = await env.DB.prepare("SELECT id, status, updated_at FROM parent_signups WHERE email = ?").bind(email).first<{ id: string; status: string; updated_at: number }>();
  if (existing?.status === "verified") return json({ ok: true, status: "verified" });
  if (existing && now - existing.updated_at < RESEND_COOLDOWN_MS) return json({ ok: true, status: "pending" }, 202);

  const token = randomToken();
  const tokenHash = await sha256(token);
  if (existing) {
    await env.DB.prepare("UPDATE parent_signups SET token_hash = ?, updated_at = ?, consent_version = ? WHERE id = ?").bind(tokenHash, now, CONSENT_VERSION, existing.id).run();
  } else {
    await env.DB.prepare("INSERT INTO parent_signups (id, email, status, token_hash, consent_version, created_at, updated_at) VALUES (?, ?, 'pending', ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), email, tokenHash, CONSENT_VERSION, now, now)
      .run();
  }
  const verifyUrl = `${new URL(req.url).origin}/api/parent-signup/verify?token=${token}`;
  return json({ ok: true, status: "pending", devVerifyUrl: verifyUrl }, 202);
}

async function verifyParent(url: URL, env: Env): Promise<Response> {
  const token = url.searchParams.get("token") ?? "";
  if (!/^[0-9a-f]{64}$/.test(token)) return html("<h1>Link not valid</h1><p>Please request a new confirmation email.</p>", 400);
  const hash = await sha256(token);
  const row = await env.DB.prepare("SELECT id, created_at FROM parent_signups WHERE token_hash = ? AND status = 'pending'").bind(hash).first<{ id: string; created_at: number }>();
  if (!row || Date.now() - row.created_at > PENDING_TTL_MS) return html("<h1>Link expired</h1><p>Please request a new confirmation email.</p>", 410);
  const now = Date.now();
  await env.DB.prepare("UPDATE parent_signups SET status = 'verified', token_hash = NULL, verified_at = ?, updated_at = ? WHERE id = ?").bind(now, now, row.id).run();
  return html("<h1>Thank you!</h1><p>Your email is confirmed. Your child can keep playing BrainZippy.</p>");
}

export async function handleApi(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  if (method !== "GET" && !sameOrigin(req)) return json({ error: "forbidden" }, 403);

  if (path.startsWith("/api/push/")) return handlePush(req, env);

  if (path === "/api/health" && method === "GET") {
    return json({ ok: true, env: env.APP_ENV });
  }

  if (path === "/api/parent-signup" && method === "POST") return parentSignup(req, env);
  if (path === "/api/parent-signup/verify" && method === "GET") return verifyParent(url, env);

  if (path === "/api/guest" && method === "POST") {
    const id = crypto.randomUUID();
    const now = Date.now();
    await env.DB.prepare("INSERT INTO guest_sessions (id, created_at, updated_at, progress_json) VALUES (?, ?, ?, '{}')")
      .bind(id, now, now)
      .run();
    return json({ id }, 201);
  }

  const m = path.match(/^\/api\/guest\/([^/]+)(\/progress)?$/);
  if (m) {
    const id = m[1] ?? "";
    if (!UUID_RE.test(id)) return json({ error: "not_found" }, 404);
    const isProgress = Boolean(m[2]);

    if (isProgress && method === "PUT") {
      const body = await readJson(req);
      const progress = parseGuestProgress(body);
      if (!progress) return json({ error: "invalid_body" }, 400);
      const res = await env.DB.prepare("UPDATE guest_sessions SET progress_json = ?, updated_at = ? WHERE id = ?")
        .bind(JSON.stringify(progress), Date.now(), id)
        .run();
      if (!res.meta.changes) return json({ error: "not_found" }, 404);
      return json({ ok: true });
    }

    if (isProgress && method === "GET") {
      const row = await env.DB.prepare("SELECT progress_json FROM guest_sessions WHERE id = ?").bind(id).first<{ progress_json: string }>();
      if (!row) return json({ error: "not_found" }, 404);
      return json({ progress: JSON.parse(row.progress_json) as unknown });
    }

    if (!isProgress && method === "DELETE") {
      await env.DB.prepare("DELETE FROM guest_sessions WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }
    return json({ error: "method_not_allowed" }, 405);
  }

  return json({ error: "not_found" }, 404);
}

export default {
  async fetch(req, env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(req, env);
      } catch {
        return json({ error: "server_error" }, 500);
      }
    }
    return env.ASSETS.fetch(req);
  },

  /** Daily retention purge (enable a cron trigger in wrangler.jsonc before launch). */
  async scheduled(event, env, ctx): Promise<void> {
    if (event.cron === "0 * * * *") return ctx.waitUntil(sendDueReminders(env).then(() => undefined)); // hourly daily-reminder job
    await env.DB.prepare("DELETE FROM guest_sessions WHERE updated_at < ?").bind(Date.now() - RETENTION_MS).run();
    await env.DB.prepare("DELETE FROM parent_signups WHERE status = 'pending' AND created_at < ?").bind(Date.now() - PENDING_TTL_MS).run();
  },
} satisfies ExportedHandler<Env>;
