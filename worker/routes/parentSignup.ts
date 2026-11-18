import type { Route } from "../router";
import { appOrigin, CONSENT_VERSION, isDev } from "../lib/config";
import { randomToken, sha256Hex, TOKEN_RE } from "../lib/crypto";
import { sendEmail } from "../lib/email";
import { esc, err, html, json, readForm, readJson } from "../lib/http";
import { allow, clientIp, LIMITS } from "../lib/rateLimit";
import { isObj, normaliseEmail, onlyKeys } from "../lib/validation";

/**
 * LEGACY onboarding sign-up (`/api/parent-signup`), kept with its original contract for the onboarding grown-up step.
 * `parent_signups` is superseded by `parents`: it only holds pending confirmations; confirming creates a parent
 * account (consent carried over) and deletes the pending row. New sign-ups from the parent area use /api/auth/*.
 * - The reply is always `{status: "pending"}`, whether or not an account exists (no account enumeration). An existing
 *   account gets a short "you already have an account" email instead of a confirmation link.
 * - The emailed link opens a confirmation page; GET never consumes the token or records consent (mail scanners
 *   prefetch links). The page's button POSTs the token, which consumes it, exactly like /api/auth/verify.
 */
const RESEND_COOLDOWN_MS = 10 * 60 * 1000;
const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const routes: Route[] = [
  {
    method: "POST",
    path: "/api/parent-signup",
    async handler({ req, env, url }) {
      const body = await readJson(req);
      if (!isObj(body) || !onlyKeys(body, ["email", "consent"])) return err("invalid_body", 400);
      if (body.consent !== true) return err("consent_required", 400);
      const email = normaliseEmail(body.email);
      if (!email) return err("invalid_email", 400);
      const dev = isDev(env, url);
      if (!dev && !env.RESEND_API_KEY) return err("email_delivery_not_configured", 503);
      if (!(await allow(env, LIMITS.magicLinkPerIp, clientIp(req), url)) || !(await allow(env, LIMITS.magicLinkPerEmail, email, url))) return err("rate_limited", 429);

      const now = Date.now();
      const pending = () => json({ ok: true, status: "pending" }, 202);
      const account = await env.DB.prepare("SELECT id FROM parents WHERE email = ?").bind(email).first<{ id: string }>();
      if (account) {
        if (dev) return pending();
        const signIn = `${appOrigin(env, url)}/parents`;
        const sent = await sendEmail(
          env,
          url,
          {
            to: email,
            subject: "You already have a BrainZippy account",
            text: `Someone (hopefully you) asked to confirm this email for BrainZippy. You already have a parent account, so there is nothing to confirm. Sign in here: ${signIn}\n\nIf this wasn't you, ignore this email.`,
            html: `<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;color:#2b2140;line-height:1.5"><p>Someone (hopefully you) asked to confirm this email for BrainZippy. You already have a parent account, so there is nothing to confirm.</p><p><a href="${esc(signIn)}">Sign in to BrainZippy</a></p><p>If this wasn't you, ignore this email.</p></body></html>`,
          },
          `signup-exists-${(await sha256Hex(`${email}:${Math.floor(now / RESEND_COOLDOWN_MS)}`)).slice(0, 32)}`,
        );
        return sent.ok ? pending() : err("email_failed", 502);
      }
      const existing = await env.DB.prepare("SELECT id, updated_at FROM parent_signups WHERE email = ?").bind(email).first<{ id: string; updated_at: number }>();
      if (existing && now - existing.updated_at < RESEND_COOLDOWN_MS) return pending();

      const token = randomToken();
      const tokenHash = await sha256Hex(token);
      if (existing) {
        await env.DB.prepare("UPDATE parent_signups SET token_hash = ?, updated_at = ?, consent_version = ?, created_at = ? WHERE id = ?").bind(tokenHash, now, CONSENT_VERSION, now, existing.id).run();
      } else {
        await env.DB.prepare("INSERT INTO parent_signups (id, email, status, token_hash, consent_version, created_at, updated_at) VALUES (?, ?, 'pending', ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), email, tokenHash, CONSENT_VERSION, now, now)
          .run();
      }
      const verifyUrl = `${appOrigin(env, url)}/api/parent-signup/verify?token=${token}`;
      if (dev) return json({ ok: true, status: "pending", devVerifyUrl: verifyUrl }, 202);
      const sent = await sendEmail(
        env,
        url,
        {
          to: email,
          subject: "Confirm your email for BrainZippy",
          text: `Please confirm your email for BrainZippy:\n${verifyUrl}\n\nIf you did not ask for this, ignore this email.`,
          html: `<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;color:#2b2140;line-height:1.5"><p>Please confirm your email for BrainZippy.</p><p><a href="${esc(verifyUrl)}">Confirm my email</a></p><p>If you did not ask for this, ignore this email.</p></body></html>`,
        },
        `signup-${tokenHash.slice(0, 32)}`,
      );
      return sent.ok ? pending() : err("email_failed", 502);
    },
  },
  {
    method: "GET",
    path: "/api/parent-signup/verify",
    async handler({ env, url }) {
      const token = url.searchParams.get("token") ?? "";
      if (!TOKEN_RE.test(token)) return invalidPage();
      const row = await pendingRow(env, token);
      if (!row) return expiredPage();
      // Shows the address being confirmed so a parent can spot a link that isn't theirs. Nothing changes until the POST.
      return html(
        `<h1>Confirm your email</h1>
<p>You are confirming <strong data-testid="signup-email">${esc(row.email)}</strong> for a BrainZippy parent account.</p>
<p>If that isn't your email address, close this page.</p>
<form method="post" action="/api/parent-signup/verify"><input type="hidden" name="token" value="${esc(token)}"><button type="submit" data-testid="signup-confirm">Confirm my email</button></form>`,
      );
    },
  },
  {
    method: "POST",
    path: "/api/parent-signup/verify",
    async handler({ req, env, url }) {
      if (!(await allow(env, LIMITS.verifyPerIp, clientIp(req), url))) return html("<h1>Too many attempts</h1><p>Please wait a few minutes and try again.</p>", 429);
      const token = (await readForm(req))?.get("token") ?? "";
      if (!TOKEN_RE.test(token)) return invalidPage();
      const row = await pendingRow(env, token);
      if (!row) return expiredPage();
      const now = Date.now();
      // Consume atomically: the DELETE is conditional on the token, so only one request creates the account.
      const [del] = await env.DB.batch([
        env.DB.prepare("DELETE FROM parent_signups WHERE id = ? AND token_hash = ?").bind(row.id, await sha256Hex(token)),
        env.DB.prepare("INSERT OR IGNORE INTO parents (id, email, consent_version, consented_at, created_at, digest_opt_in) SELECT ?, ?, ?, ?, ?, 0 WHERE changes() = 1").bind(
          crypto.randomUUID(),
          row.email,
          row.consent_version,
          now,
          now,
        ),
      ]);
      if (!del?.meta.changes) return expiredPage();
      return html('<h1>Thank you!</h1><p>Your email is confirmed. Your child can keep playing BrainZippy.</p><p><a class="btn" href="/parents">Open the parent area</a></p>');
    },
  },
];

const invalidPage = () => html("<h1>Link not valid</h1><p>Please request a new confirmation email.</p>", 400);
const expiredPage = () => html("<h1>Link expired</h1><p>Please request a new confirmation email.</p>", 410);

async function pendingRow(env: Env, token: string) {
  const row = await env.DB.prepare("SELECT id, email, consent_version, created_at FROM parent_signups WHERE token_hash = ? AND status = 'pending'")
    .bind(await sha256Hex(token))
    .first<{ id: string; email: string; consent_version: string; created_at: number }>();
  return row && Date.now() - row.created_at <= PENDING_TTL_MS ? row : null;
}
