import { hmacHex, randomToken, safeEqual } from "./crypto";
import { benv, liveStripe, signStripePayload, stripeMode, type CheckoutParams, type StripeApi } from "./stripe";

/**
 * DEVELOPMENT-ONLY stand-in for Stripe, active only when APP_ENV=development, no STRIPE_SECRET_KEY is set AND the
 * request is for localhost (see stripeMode). It makes no network calls: "Checkout" and "Customer Portal" are plain
 * local pages under /api/billing/dev/*, which emit correctly signed webhook events into the real webhook handler.
 * This lets `npm run dev` and Playwright exercise the whole flow (paywall → Checkout → webhook → entitlement).
 */
export const DEV_WEBHOOK_SECRET = "whsec_dev_only_not_a_real_secret";
const DEV_LINK_SECRET = "dev-only-billing-link-secret";

export const webhookSecret = (env: Env, url: URL): string | null => benv(env).STRIPE_WEBHOOK_SECRET ?? (stripeMode(env, url) === "fake" ? DEV_WEBHOOK_SECRET : null);

export async function signDevLink(params: URLSearchParams): Promise<string> {
  params.delete("sig");
  params.sort();
  params.set("sig", await hmacHex(DEV_LINK_SECRET, params.toString()));
  return params.toString();
}
export async function verifyDevLink(params: URLSearchParams): Promise<boolean> {
  const sig = params.get("sig") ?? "";
  const copy = new URLSearchParams(params);
  copy.delete("sig");
  copy.sort();
  return safeEqual(await hmacHex(DEV_LINK_SECRET, copy.toString()), sig);
}

/**
 * The fake's "Stripe side": subscriptions the dev pages created, so retrieveSubscription can answer like Stripe.
 * Module memory of the local workerd isolate (lost on restart: a lost subscription then reads as 404 and its events
 * are ignored, as they would be for a subscription Stripe doesn't know).
 */
const FAKE_SUBSCRIPTIONS = new Map<string, Record<string, unknown>>();
export const rememberDevSubscription = (sub: Record<string, unknown>) => void FAKE_SUBSCRIPTIONS.set(String(sub.id), sub);

export function fakeStripe(url: URL): StripeApi {
  return {
    mode: "fake",
    async createCheckoutSession(p: CheckoutParams) {
      const q = new URLSearchParams({ p: p.parentId, c: p.customerId ?? `cus_dev_${randomToken(8)}`, t: p.trialEnd === null ? "0" : String(p.trialEnd), ok: p.successUrl, back: p.cancelUrl });
      return { id: `cs_dev_${randomToken(8)}`, url: `${url.origin}/api/billing/dev/checkout?${await signDevLink(q)}` };
    },
    async createPortalSession(p) {
      const q = new URLSearchParams({ c: p.customerId, back: p.returnUrl, ...(p.cancelSubscriptionId ? { flow: "cancel" } : {}) });
      return { url: `${url.origin}/api/billing/dev/portal?${await signDevLink(q)}` };
    },
    async cancelSubscriptionNow() {
      /* nothing to cancel: rows are deleted by the caller */
    },
    async retrieveSubscription(id) {
      return FAKE_SUBSCRIPTIONS.get(id) ?? null;
    },
    async deleteCustomer() {
      /* no customer exists outside our own rows, which the caller deletes */
    },
  };
}

export function stripeFor(env: Env, url: URL): StripeApi | null {
  const mode = stripeMode(env, url);
  return mode === "live" ? liveStripe(env) : mode === "fake" ? fakeStripe(url) : null;
}

/** Client the webhook uses to re-fetch subscriptions: any configured secret key (even without a price id), else the fake. */
export function stripeForWebhook(env: Env, url: URL): StripeApi | null {
  if (benv(env).STRIPE_SECRET_KEY) return liveStripe(env);
  return stripeMode(env, url) === "fake" ? fakeStripe(url) : null;
}

/** A signed webhook request, as Stripe would send it. */
export async function devWebhookRequest(origin: string, type: string, object: Record<string, unknown>, nowMs = Date.now()): Promise<Request> {
  const created = Math.floor(nowMs / 1000);
  const body = JSON.stringify({ id: `evt_dev_${randomToken(12)}`, object: "event", type, created, data: { object } });
  return new Request(`${origin}/api/billing/webhook`, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": await signStripePayload(body, DEV_WEBHOOK_SECRET, created) }, body });
}

export function devSubscription(o: { id: string; customer: string; parentId: string; status: string; trialEnd: number | null; periodEnd: number; cancelAtPeriodEnd: boolean }) {
  const sec = (ms: number | null) => (ms === null ? null : Math.floor(ms / 1000));
  return {
    id: o.id,
    object: "subscription",
    customer: o.customer,
    status: o.status,
    trial_end: sec(o.trialEnd),
    cancel_at_period_end: o.cancelAtPeriodEnd,
    cancel_at: o.cancelAtPeriodEnd ? sec(o.periodEnd) : null,
    ended_at: null,
    metadata: { parent_id: o.parentId },
    items: { object: "list", data: [{ id: `si_dev_${o.id.slice(-8)}`, current_period_end: sec(o.periodEnd), price: { id: "price_dev", unit_amount: 699, currency: "usd", recurring: { interval: "month" } } }] },
  };
}
