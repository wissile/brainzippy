import { emailFrom, isDev } from "./config";

/**
 * Email delivery through the Resend REST API (https://resend.com/docs/api-reference/emails/send-email).
 * - With RESEND_API_KEY: POST https://api.resend.com/emails (or /emails/batch for up to 100 messages).
 * - Local development (APP_ENV=development AND a localhost request) without a key: the message is logged to the console (link + subject only; no address) and not sent.
 * - Any other environment without a key: not sent, `{ ok: false, reason: "not_configured" }`.
 * Emails only ever go to parents. Recipient addresses are never logged.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
}

export type SendResult = { ok: true; mode: "sent" | "dev-console" } | { ok: false; reason: "not_configured" | "provider_error" };

const RESEND_URL = "https://api.resend.com";

const payload = (env: Env, m: EmailMessage) => ({
  from: emailFrom(env),
  to: [m.to],
  subject: m.subject,
  html: m.html,
  text: m.text,
  ...(m.headers ? { headers: m.headers } : {}),
  ...(m.tags ? { tags: m.tags } : {}),
});

function devLog(m: EmailMessage) {
  // Development only: show the subject and the text body (which contains the link) so no email provider is needed.
  console.log(`[dev email] ${m.subject}\n${m.text}`);
}

/** `url` is the request URL (null from cron jobs): the console fallback only runs for local development requests. */
export async function sendEmail(env: Env, url: URL | null, m: EmailMessage, idempotencyKey?: string): Promise<SendResult> {
  if (!env.RESEND_API_KEY) {
    if (isDev(env, url)) {
      devLog(m);
      return { ok: true, mode: "dev-console" };
    }
    return { ok: false, reason: "not_configured" };
  }
  const res = await fetch(`${RESEND_URL}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json", ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}) },
    body: JSON.stringify(payload(env, m)),
  }).catch(() => null);
  if (!res?.ok) {
    console.warn(`[email] provider error ${res?.status ?? "network"}`);
    return { ok: false, reason: "provider_error" };
  }
  return { ok: true, mode: "sent" };
}

/** Up to 100 messages in one API call (one subrequest), used by the daily digest job. */
export async function sendBatch(env: Env, url: URL | null, messages: EmailMessage[], idempotencyKey?: string): Promise<SendResult> {
  if (messages.length === 0) return { ok: true, mode: "sent" };
  if (messages.length > 100) throw new Error("batch too large");
  if (!env.RESEND_API_KEY) {
    if (isDev(env, url)) {
      messages.forEach(devLog);
      return { ok: true, mode: "dev-console" };
    }
    return { ok: false, reason: "not_configured" };
  }
  const res = await fetch(`${RESEND_URL}/emails/batch`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json", ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}) },
    body: JSON.stringify(messages.map((m) => payload(env, m))),
  }).catch(() => null);
  if (!res?.ok) {
    console.warn(`[email] batch provider error ${res?.status ?? "network"}`);
    return { ok: false, reason: "provider_error" };
  }
  return { ok: true, mode: "sent" };
}
