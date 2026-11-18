import { hmacHex, safeEqual } from "./crypto";
import { isDev } from "./config";

/**
 * Minimal Stripe REST client over fetch (no SDK): three calls, form-encoded, pinned API version.
 * Why not stripe-node: it does run on Workers (createFetchHttpClient + createSubtleCryptoProvider), but we need only
 * three endpoints and webhook verification; plain fetch keeps the bundle small and lets tests point STRIPE_API_BASE
 * at a stub. See docs/BILLING.md.
 *
 * Modes:
 * - "live": STRIPE_SECRET_KEY + STRIPE_PRICE_ID set (test-mode keys `sk_test_…` behave the same).
 * - "fake": development only, no secret key, request to localhost → worker/lib/stripeFake.ts (no network at all).
 * - null: billing not configured → routes answer 503.
 */
export type BillingEnv = Env & {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
  /** Tests/mocks only, e.g. http://localhost:12111. Defaults to https://api.stripe.com. */
  STRIPE_API_BASE?: string;
  /** "1" to turn on Stripe Tax in Checkout (after registering in the Stripe Dashboard). */
  STRIPE_AUTOMATIC_TAX?: string;
};
export const benv = (env: Env) => env as BillingEnv;

export const STRIPE_API_VERSION = "2026-10-28.endive";
export const SIGNATURE_TOLERANCE_SEC = 300;

export interface CheckoutParams {
  parentId: string;
  email: string;
  customerId: string | null;
  priceId: string;
  /** Unix ms; null = no trial. */
  trialEnd: number | null;
  successUrl: string;
  cancelUrl: string;
  /** Renewal terms shown next to Stripe's Subscribe button. */
  submitMessage: string;
  automaticTax: boolean;
}

export interface StripeApi {
  mode: "live" | "fake";
  createCheckoutSession(p: CheckoutParams): Promise<{ id: string; url: string }>;
  createPortalSession(p: { customerId: string; returnUrl: string; cancelSubscriptionId?: string }): Promise<{ url: string }>;
  cancelSubscriptionNow(subscriptionId: string): Promise<void>;
}

export class StripeError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`stripe ${status} ${code}`);
    this.name = "StripeError";
  }
}

export function stripeMode(env: Env, url: URL): "live" | "fake" | null {
  const e = benv(env);
  if (e.STRIPE_SECRET_KEY && e.STRIPE_PRICE_ID) return "live";
  if (!e.STRIPE_SECRET_KEY && isDev(env, url)) return "fake"; // isDev includes the localhost check
  return null;
}

/** Stripe's form encoding: nested objects/arrays become a[b][0][c]=v. undefined/null are skipped. */
export function encodeForm(obj: Record<string, unknown>, prefix = "", out = new URLSearchParams()): URLSearchParams {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === "object" && item !== null ? encodeForm(item as Record<string, unknown>, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === "object") encodeForm(v as Record<string, unknown>, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export function liveStripe(env: Env): StripeApi {
  const e = benv(env);
  const base = (e.STRIPE_API_BASE || "https://api.stripe.com").replace(/\/$/, "");
  async function call<T>(method: "POST" | "DELETE", path: string, params: Record<string, unknown> = {}): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { authorization: `Bearer ${e.STRIPE_SECRET_KEY}`, "content-type": "application/x-www-form-urlencoded", "stripe-version": STRIPE_API_VERSION },
      body: encodeForm(params).toString(),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: { code?: string; type?: string } };
    if (!res.ok) throw new StripeError(res.status, data.error?.code ?? data.error?.type ?? "error");
    return data as T;
  }
  return {
    mode: "live",
    async createCheckoutSession(p) {
      const sub: Record<string, unknown> = { metadata: { parent_id: p.parentId } };
      if (p.trialEnd !== null) sub.trial_end = Math.floor(p.trialEnd / 1000);
      const s = await call<{ id: string; url: string }>("POST", "/v1/checkout/sessions", {
        mode: "subscription",
        line_items: [{ price: p.priceId, quantity: 1 }],
        client_reference_id: p.parentId,
        metadata: { parent_id: p.parentId },
        subscription_data: sub,
        payment_method_collection: "always",
        allow_promotion_codes: true,
        ...(p.customerId ? { customer: p.customerId } : { customer_email: p.email }),
        ...(p.automaticTax ? { automatic_tax: { enabled: true }, ...(p.customerId ? { customer_update: { address: "auto" } } : {}) } : {}),
        custom_text: { submit: { message: p.submitMessage } },
        success_url: p.successUrl,
        cancel_url: p.cancelUrl,
      });
      return { id: s.id, url: s.url };
    },
    async createPortalSession(p) {
      const s = await call<{ url: string }>("POST", "/v1/billing_portal/sessions", {
        customer: p.customerId,
        return_url: p.returnUrl,
        ...(p.cancelSubscriptionId ? { flow_data: { type: "subscription_cancel", subscription_cancel: { subscription: p.cancelSubscriptionId } } } : {}),
      });
      return { url: s.url };
    },
    async cancelSubscriptionNow(id) {
      try {
        await call("DELETE", `/v1/subscriptions/${encodeURIComponent(id)}`);
      } catch (e) {
        if (e instanceof StripeError && e.status === 404) return; // already gone
        throw e;
      }
    },
  };
}

/* ---------------- webhook signatures ---------------- */

/**
 * Verifies a `Stripe-Signature` header (`t=<unix>,v1=<hex>[,v1=…]`): HMAC-SHA256 over `${t}.${rawBody}` with the
 * endpoint secret, constant-time compared with every v1 (several during secret rotation), and `t` within ±tolerance.
 */
export async function verifyStripeSignature(payload: string, header: string | null, secret: string, nowSec: number, toleranceSec = SIGNATURE_TOLERANCE_SEC): Promise<boolean> {
  if (!header || !secret) return false;
  let t: number | null = null;
  const sigs: string[] = [];
  for (const part of header.split(",")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k === "t" && /^\d{1,12}$/.test(v)) t = Number(v);
    else if (k === "v1" && /^[0-9a-f]{64}$/.test(v)) sigs.push(v);
  }
  if (t === null || sigs.length === 0 || Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = await hmacHex(secret, `${t}.${payload}`);
  let ok = false;
  for (const s of sigs) ok = safeEqual(expected, s) || ok; // check all, no early exit
  return ok;
}

/** Builds a valid header (used by tests and the development fake). */
export async function signStripePayload(payload: string, secret: string, tSec: number): Promise<string> {
  return `t=${tSec},v1=${await hmacHex(secret, `${tSec}.${payload}`)}`;
}

/* ---------------- event payload readers (tolerant of API-version differences) ---------------- */

export type StripeObject = Record<string, unknown>;
export interface StripeEvent {
  id: string;
  type: string;
  created: number;
  data: { object: StripeObject };
}

export function parseEvent(text: string): StripeEvent | null {
  try {
    const o = JSON.parse(text) as Record<string, unknown>;
    const data = o.data as { object?: unknown } | undefined;
    if (typeof o.id !== "string" || !/^evt_[A-Za-z0-9_]{1,250}$/.test(o.id) || typeof o.type !== "string" || typeof o.created !== "number") return null;
    if (!data || typeof data.object !== "object" || data.object === null) return null;
    return { id: o.id, type: o.type, created: o.created, data: { object: data.object as StripeObject } };
  } catch {
    return null;
  }
}

/** An id field that may be a string or an expanded object. */
export function idOf(x: unknown): string | null {
  if (typeof x === "string") return x;
  if (x && typeof x === "object" && typeof (x as { id?: unknown }).id === "string") return (x as { id: string }).id;
  return null;
}

const secToMs = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x * 1000 : null);

/** current_period_end moved to subscription items in API 2025-03-31; read both shapes. */
export function subscriptionFields(sub: StripeObject) {
  const items = (sub.items as { data?: StripeObject[] } | undefined)?.data ?? [];
  const itemEnds = items.map((i) => secToMs(i.current_period_end)).filter((x): x is number => x !== null);
  const meta = (sub.metadata as Record<string, unknown> | undefined) ?? {};
  return {
    id: idOf(sub.id),
    customer: idOf(sub.customer),
    status: typeof sub.status === "string" ? sub.status : "unknown",
    trialEnd: secToMs(sub.trial_end),
    periodEnd: itemEnds.length ? Math.max(...itemEnds) : secToMs(sub.current_period_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end === true,
    cancelAt: secToMs(sub.cancel_at),
    endedAt: secToMs(sub.ended_at),
    parentId: typeof meta.parent_id === "string" ? meta.parent_id : null,
    hadTrial: sub.trial_end !== null && sub.trial_end !== undefined,
  };
}
