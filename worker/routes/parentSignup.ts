import type { Route } from "../router";
import { appOrigin, CONSENT_VERSION, isDev } from "../lib/config";
import { randomToken, sha256Hex, TOKEN_RE } from "../lib/crypto";
import { sendEmail } from "../lib/email";
import { esc, err, html, json, readJson } from "../lib/http";
import { allow, clientIp, LIMITS } from "../lib/rateLimit";
import { isObj, normaliseEmail, onlyKeys } from "../lib/validation";

/**
 * LEGACY onboarding sign-up (`/api/parent-signup`), kept with its original contract for the onboarding grown-up step.
 * `parent_signups` is superseded by `parents`: it only holds pending confirmations; confirming creates a parent
 * account (consent carried over) and deletes the pending row. New sign-ups from the parent area use /api/auth/*.
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
      const dev = isDev(env);
      if (!dev && !env.RESEND_API_KEY) return err("email_delivery_not_configured", 503);
      if (!(await allow(env, LIMITS.magicLinkPerIp, clientIp(req))) || !(await allow(env, LIMITS.magicLinkPerEmail, email))) return err("rate_limited", 429);

      const now = Date.now();
      const account = await env.DB.prepare("SELECT id FROM parents WHERE email = ?").bind(email).first<{ id: string }>();
      if (account) return json({ ok: true, status: "verified" });
      const existing = await env.DB.prepare("SELECT id, updated_at FROM parent_signups WHERE email = ?").bind(email).first<{ id: string; updated_at: number }>();
      if (existing && now - existing.updated_at < RESEND_COOLDOWN_MS) return json({ ok: true, status: "pending" }, 202);

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
        {
          to: email,
          subject: "Confirm your email for BrainZippy",
          text: `Please confirm your email for BrainZippy:\n${verifyUrl}\n\nIf you did not ask for this, ignore this email.`,
          html: `<!doctype html><html lang="en"><body style="font-family:Arial,sans-serif;color:#2b2140;line-height:1.5"><p>Please confirm your email for BrainZippy.</p><p><a href="${esc(verifyUrl)}">Confirm my email</a></p><p>If you did not ask for this, ignore this email.</p></body></html>`,
        },
        `signup-${tokenHash.slice(0, 32)}`,
      );
      return sent.ok ? json({ ok: true, status: "pending" }, 202) : err("email_failed", 502);
    },
  },
  {
    method: "GET",
    path: "/api/parent-signup/verify",
    async handler({ env, url }) {
      const token = url.searchParams.get("token") ?? "";
      if (!TOKEN_RE.test(token)) return html("<h1>Link not valid</h1><p>Please request a new confirmation email.</p>", 400);
      const row = await env.DB.prepare("SELECT id, email, consent_version, created_at FROM parent_signups WHERE token_hash = ? AND status = 'pending'")
        .bind(await sha256Hex(token))
        .first<{ id: string; email: string; consent_version: string; created_at: number }>();
      if (!row || Date.now() - row.created_at > PENDING_TTL_MS) return html("<h1>Link expired</h1><p>Please request a new confirmation email.</p>", 410);
      const now = Date.now();
      await env.DB.batch([
        env.DB.prepare("INSERT OR IGNORE INTO parents (id, email, consent_version, consented_at, created_at, digest_opt_in) VALUES (?, ?, ?, ?, ?, 0)").bind(crypto.randomUUID(), row.email, row.consent_version, now, now),
        env.DB.prepare("DELETE FROM parent_signups WHERE id = ?").bind(row.id),
      ]);
      return html('<h1>Thank you!</h1><p>Your email is confirmed. Your child can keep playing BrainZippy.</p><p><a class="btn" href="/parents">Open the parent area</a></p>');
    },
  },
];
