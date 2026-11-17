import { MAX_PROGRESS_BYTES, parseGuestProgress } from "../src/engine/progressSchema";

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

export async function handleApi(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  if (method !== "GET" && !sameOrigin(req)) return json({ error: "forbidden" }, 403);

  if (path === "/api/health" && method === "GET") {
    return json({ ok: true, env: env.APP_ENV });
  }

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
  async scheduled(_event, env): Promise<void> {
    await env.DB.prepare("DELETE FROM guest_sessions WHERE updated_at < ?").bind(Date.now() - RETENTION_MS).run();
  },
} satisfies ExportedHandler<Env>;
