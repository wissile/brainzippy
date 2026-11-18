import type { Route } from "../router";
import { appOrigin, CONSENT_VERSION, isDev } from "../lib/config";
import { randomToken, sha256Hex, TOKEN_RE } from "../lib/crypto";
import { sendEmail } from "../lib/email";
import { magicLinkEmail } from "../lib/emailTemplates";
import { err, esc, html, json, readForm, readJson, redirect } from "../lib/http";
import { allow, clientIp, LIMITS } from "../lib/rateLimit";
import { clearCookie, createSession, destroySession } from "../lib/session";
import { isObj, normaliseEmail, onlyKeys } from "../lib/validation";

/**
 * Parent sign-up / sign-in by email magic link.
 * - Tokens: 256-bit random, stored as SHA-256 only, single use, 15-minute expiry.
 * - The emailed link opens a confirmation page (GET never consumes the token, so mail scanners that prefetch links
 *   cannot burn it); the page's button POSTs the token, which consumes it, creates the session and redirects to /parents.
 * - Sign-in for an unknown email answers exactly like a known one (no account enumeration) and sends nothing.
 */
export const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

const expiredPage = () =>
  html('<h1>This link has expired</h1><p>Sign-in links work once and only for 15 minutes.</p><p><a class="btn" href="/parents">Get a new link</a></p>', 410);

export const routes: Route[] = [
  {
    method: "POST",
    path: "/api/auth/magic-link",
    async handler({ req, env, url }) {
      const body = await readJson(req);
      if (!isObj(body) || !onlyKeys(body, ["email", "consent", "mode"])) return err("invalid_body", 400);
      const mode = body.mode;
      if (mode !== "signup" && mode !== "signin") return err("invalid_body", 400);
      if (body.consent !== undefined && typeof body.consent !== "boolean") return err("invalid_body", 400);
      const email = normaliseEmail(body.email);
      if (!email) return err("invalid_email", 400);
      if (mode === "signup" && body.consent !== true) return err("consent_required", 400);
      if (!isDev(env) && !env.RESEND_API_KEY) return err("email_delivery_not_configured", 503);
      if (!(await allow(env, LIMITS.magicLinkPerIp, clientIp(req))) || !(await allow(env, LIMITS.magicLinkPerEmail, email))) return err("rate_limited", 429);

      const now = Date.now();
      const parent = await env.DB.prepare("SELECT id FROM parents WHERE email = ?").bind(email).first<{ id: string }>();
      if (!parent && mode === "signin") return json({ ok: true, ...(isDev(env) ? { devNote: "no_account" } : {}) }, 202);

      const purpose = parent ? "signin" : "signup";
      const token = randomToken();
      const tokenHash = await sha256Hex(token);
      await env.DB.prepare("INSERT INTO auth_tokens (token_hash, email, purpose, consent_version, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(tokenHash, email, purpose, purpose === "signup" ? CONSENT_VERSION : null, now, now + MAGIC_LINK_TTL_MS)
        .run();
      const link = `${appOrigin(env, url)}/api/auth/verify?token=${token}`;
      const sent = await sendEmail(env, { to: email, ...magicLinkEmail(link, purpose === "signup"), tags: [{ name: "kind", value: "magic-link" }] }, `ml-${tokenHash.slice(0, 40)}`);
      if (!sent.ok) return err(sent.reason === "not_configured" ? "email_delivery_not_configured" : "email_failed", sent.reason === "not_configured" ? 503 : 502);
      return json({ ok: true, ...(sent.mode === "dev-console" ? { devLink: link } : {}) }, 202);
    },
  },
  {
    method: "GET",
    path: "/api/auth/verify",
    async handler({ env, url }) {
      const token = url.searchParams.get("token") ?? "";
      if (!TOKEN_RE.test(token)) return expiredPage();
      const row = await env.DB.prepare("SELECT purpose FROM auth_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?")
        .bind(await sha256Hex(token), Date.now())
        .first<{ purpose: string }>();
      if (!row) return expiredPage();
      const label = row.purpose === "signup" ? "Confirm and continue" : "Continue to BrainZippy";
      return html(
        `<h1>${row.purpose === "signup" ? "Confirm your parent account" : "Sign in to BrainZippy"}</h1>
<p>Press the button to finish on this device.</p>
<form method="post" action="/api/auth/verify"><input type="hidden" name="token" value="${esc(token)}"><button type="submit" data-testid="verify-continue">${label}</button></form>`,
      );
    },
  },
  {
    method: "POST",
    path: "/api/auth/verify",
    async handler({ req, env, url }) {
      if (!(await allow(env, LIMITS.verifyPerIp, clientIp(req)))) return html("<h1>Too many attempts</h1><p>Please wait a few minutes and try again.</p>", 429);
      const form = await readForm(req);
      const token = form?.get("token") ?? "";
      if (!TOKEN_RE.test(token)) return expiredPage();
      const now = Date.now();
      // Consume atomically: only one request can flip used_at.
      const tok = await env.DB.prepare("UPDATE auth_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING email, purpose, consent_version")
        .bind(now, await sha256Hex(token), now)
        .first<{ email: string; purpose: string; consent_version: string | null }>();
      if (!tok) return expiredPage();
      let parent = await env.DB.prepare("SELECT id FROM parents WHERE email = ?").bind(tok.email).first<{ id: string }>();
      if (!parent) {
        if (tok.purpose !== "signup" || !tok.consent_version) return expiredPage();
        const id = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO parents (id, email, consent_version, consented_at, created_at, last_login_at, digest_opt_in) VALUES (?, ?, ?, ?, ?, ?, 0)")
          .bind(id, tok.email, tok.consent_version, now, now, now)
          .run();
        parent = { id };
      } else {
        await env.DB.prepare("UPDATE parents SET last_login_at = ? WHERE id = ?").bind(now, parent.id).run();
      }
      const cookie = await createSession(env, url, parent.id, now);
      return redirect("/parents", { "set-cookie": cookie });
    },
  },
  {
    method: "POST",
    path: "/api/auth/logout",
    async handler(c) {
      const s = await c.session();
      const cookie = s ? await destroySession(c.env, c.url, s.idHash) : clearCookie(c.url);
      c.outHeaders.delete("set-cookie"); // never re-send a refreshed cookie after logout
      return json({ ok: true }, 200, { "set-cookie": cookie });
    },
  },
];
