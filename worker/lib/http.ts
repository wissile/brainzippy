/** Response helpers and request body readers. Every API response carries the security headers below. */
export const SECURITY_HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cross-origin-resource-policy": "same-origin",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
  "strict-transport-security": "max-age=63072000; includeSubDomains",
};

/** Extra headers replace the defaults (e.g. a cacheable cache-control); set-cookie is appended so several can be sent. */
const addHeaders = (headers: Headers, extra: HeadersInit) => new Headers(extra).forEach((v, k) => (k === "set-cookie" ? headers.append(k, v) : headers.set(k, v)));

export function json(body: unknown, status = 200, extra: HeadersInit = {}): Response {
  const headers = new Headers(SECURITY_HEADERS);
  addHeaders(headers, extra);
  return new Response(JSON.stringify(body), { status, headers });
}

export const err = (code: string, status: number) => json({ error: code }, status);

const escapeMap: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => escapeMap[c]!);

/** Minimal, self-contained HTML page (no scripts, no external resources). `body` must already be escaped. */
export function html(body: string, status = 200, extra: HeadersInit = {}): Response {
  const headers = new Headers({
    ...SECURITY_HEADERS,
    "content-type": "text/html; charset=utf-8",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    // "no-referrer" would make browsers send `Origin: null` on this page's same-origin form POSTs (rejected by the
    // origin check). "same-origin" sends the referrer only to us; these pages load nothing external.
    "referrer-policy": "same-origin",
  });
  new Headers(extra).forEach((v, k) => headers.append(k, v));
  const page = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BrainZippy</title>
<style>body{font-family:system-ui,sans-serif;max-width:520px;margin:12vh auto;padding:0 20px;color:#2B2140;text-align:center;line-height:1.5}
button,a.btn{font:inherit;font-weight:700;font-size:1.1rem;min-height:48px;padding:10px 24px;border-radius:999px;border:0;background:#3b8eea;color:#fff;cursor:pointer;text-decoration:none;display:inline-block}
button:focus-visible,a:focus-visible{outline:3px solid #2B2140;outline-offset:3px}</style>
<body>${body}</body></html>`;
  return new Response(page, { status, headers });
}

export function redirect(location: string, extra: HeadersInit = {}): Response {
  const headers = new Headers({ ...SECURITY_HEADERS, location });
  headers.delete("content-type");
  new Headers(extra).forEach((v, k) => headers.append(k, v));
  return new Response(null, { status: 303, headers });
}

/**
 * Read a body, counting real bytes and aborting once `max` is exceeded (works without Content-Length or with a lying
 * one). Returns undefined when there is no body or it is too large. Use this (or readJson/readForm) for every body.
 */
export async function readCapped(req: Request, max: number): Promise<string | undefined> {
  if (Number(req.headers.get("content-length") ?? "0") > max) return undefined;
  if (!req.body) return undefined;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
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
  return new TextDecoder().decode(buf);
}

export async function readJson(req: Request, max = 8 * 1024): Promise<unknown | undefined> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return undefined;
  const text = await readCapped(req, max);
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** Read an `application/x-www-form-urlencoded` body (used by the no-JS confirmation pages). */
export async function readForm(req: Request, max = 2048): Promise<URLSearchParams | undefined> {
  if (!(req.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded")) return undefined;
  const text = await readCapped(req, max);
  return text === undefined ? undefined : new URLSearchParams(text);
}
