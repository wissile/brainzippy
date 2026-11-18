import type { Ctx, Route } from "../router";
import { requireParent } from "../lib/auth";
import { appOrigin } from "../lib/config";
import { billingDeletionStatements, billingExport, loadBilling, mergeTrialStart } from "../lib/entitlements";
import { err, esc, html, json, readCapped, readJson, redirect } from "../lib/http";
import { allow, clientIp, type Limit } from "../lib/rateLimit";
import { benv, StripeError, stripeMode } from "../lib/stripe";
import { MAX_WEBHOOK_BYTES, processWebhook } from "../lib/stripeEvents";
import { devSubscription, devWebhookRequest, rememberDevSubscription, stripeFor, stripeForWebhook, verifyDevLink, webhookSecret } from "../lib/stripeFake";
import { isObj, onlyKeys } from "../lib/validation";
import { hashAccessCode, normaliseAccessCode } from "../../src/billing/codes";
import { CHECKOUT_SUBMIT_MESSAGE, fmtDate } from "../../src/billing/copy";
import { checkoutTrialEnd, computeEntitlement, DAY_MS, hasLiveSubscription, PRICE, RENEWAL_TERMS_VERSION } from "../../src/billing/model";

/**
 * Billing API (parents only, behind the parent gate in the UI). Contract:
 * - POST /api/billing/status   {firstPlayAt?}  → {entitlement, offer, billing}   merges the device's first play (trial can only start earlier)
 * - POST /api/billing/checkout {consent:true}  → {url}   Stripe Checkout (subscription, card always collected, promotion codes allowed)
 * - POST /api/billing/portal   {flow?:"cancel"} → {url}  Stripe Customer Portal (optionally straight to the cancel confirmation)
 * - POST /api/billing/redeem   {code}          → {entitlement}   free-access code
 * - POST /api/billing/webhook  (Stripe → us; signature-verified, idempotent; crossOrigin)
 * - /api/billing/dev/*         development-only fake Checkout/Portal pages (404 elsewhere)
 */
export const BILLING_LIMITS = {
  checkoutPerParent: { bucket: "bill-co", max: 10, windowSec: 3600 },
  portalPerParent: { bucket: "bill-po", max: 30, windowSec: 3600 },
  redeemPerParent: { bucket: "bill-rd", max: 10, windowSec: 3600 },
  redeemPerIp: { bucket: "bill-rd-ip", max: 30, windowSec: 3600 },
} satisfies Record<string, Limit>;

const offerFor = (state: Parameters<typeof checkoutTrialEnd>[0], trialUsed: boolean, now: number) => ({
  trialEndsAt: checkoutTrialEnd(state, trialUsed, now),
  price: PRICE.display,
  interval: PRICE.interval,
});

async function readBody(c: Ctx, keys: string[]): Promise<Record<string, unknown> | null> {
  const body = (await readJson(c.req)) ?? {};
  return isObj(body) && onlyKeys(body, keys) ? body : null;
}

export const routes: Route[] = [
  {
    method: "POST",
    path: "/api/billing/status",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const body = await readBody(c, ["firstPlayAt"]);
      if (!body) return err("invalid_body", 400);
      const now = Date.now();
      if (body.firstPlayAt !== undefined) await mergeTrialStart(c.env, s.parentId, body.firstPlayAt, now);
      const loaded = await loadBilling(c.env, s.parentId);
      if (!loaded) return err("unauthorized", 401);
      return json({ entitlement: computeEntitlement(loaded.state, now), offer: offerFor(loaded.state, loaded.row?.trial_used === 1, now), billing: stripeMode(c.env, c.url) });
    },
  },
  {
    method: "POST",
    path: "/api/billing/checkout",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const body = await readBody(c, ["consent"]);
      if (!body) return err("invalid_body", 400);
      if (body.consent !== true) return err("consent_required", 400);
      const stripe = stripeFor(c.env, c.url);
      if (!stripe) return err("billing_not_configured", 503);
      if (!(await allow(c.env, BILLING_LIMITS.checkoutPerParent, s.parentId, c.url))) return err("rate_limited", 429);
      const now = Date.now();
      const loaded = await loadBilling(c.env, s.parentId);
      if (!loaded) return err("unauthorized", 401);
      if (hasLiveSubscription(loaded.state)) return err("already_subscribed", 409);
      if (loaded.state.free?.kind === "forever") return err("already_free", 409);
      // Express consent to the renewal terms, recorded before Checkout (California ARL keeps proof of consent).
      await c.env.DB.prepare(
        `INSERT INTO billing_accounts (parent_id, renewal_consent_at, renewal_consent_version, created_at, updated_at) VALUES (?1, ?2, ?3, ?2, ?2)
         ON CONFLICT(parent_id) DO UPDATE SET renewal_consent_at = excluded.renewal_consent_at, renewal_consent_version = excluded.renewal_consent_version, updated_at = excluded.updated_at`,
      )
        .bind(s.parentId, now, RENEWAL_TERMS_VERSION)
        .run();
      const origin = appOrigin(c.env, c.url);
      try {
        const session = await stripe.createCheckoutSession({
          parentId: s.parentId,
          email: s.email,
          customerId: loaded.row?.stripe_customer_id ?? null,
          priceId: benv(c.env).STRIPE_PRICE_ID ?? "price_dev",
          trialEnd: checkoutTrialEnd(loaded.state, loaded.row?.trial_used === 1, now),
          successUrl: `${origin}/parents?billing=success`,
          cancelUrl: `${origin}/plan?billing=cancelled`,
          submitMessage: CHECKOUT_SUBMIT_MESSAGE,
          automaticTax: benv(c.env).STRIPE_AUTOMATIC_TAX === "1",
        });
        return json({ url: session.url });
      } catch (e) {
        console.error(`[billing] checkout failed: ${e instanceof StripeError ? e.message : "error"}`);
        return err("billing_unavailable", 502);
      }
    },
  },
  {
    method: "POST",
    path: "/api/billing/portal",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      const body = await readBody(c, ["flow"]);
      if (!body || (body.flow !== undefined && body.flow !== "cancel")) return err("invalid_body", 400);
      const stripe = stripeFor(c.env, c.url);
      if (!stripe) return err("billing_not_configured", 503);
      if (!(await allow(c.env, BILLING_LIMITS.portalPerParent, s.parentId, c.url))) return err("rate_limited", 429);
      const loaded = await loadBilling(c.env, s.parentId);
      const customer = loaded?.row?.stripe_customer_id;
      if (!loaded || !customer) return err("no_billing_account", 404);
      const cancelId = body.flow === "cancel" && hasLiveSubscription(loaded.state) ? (loaded.row?.stripe_subscription_id ?? undefined) : undefined;
      try {
        const portal = await stripe.createPortalSession({ customerId: customer, returnUrl: `${appOrigin(c.env, c.url)}/parents?billing=portal`, cancelSubscriptionId: cancelId });
        return json({ url: portal.url });
      } catch (e) {
        console.error(`[billing] portal failed: ${e instanceof StripeError ? e.message : "error"}`);
        return err("billing_unavailable", 502);
      }
    },
  },
  {
    method: "POST",
    path: "/api/billing/redeem",
    async handler(c) {
      const s = await requireParent(c);
      if (s instanceof Response) return s;
      if (!(await allow(c.env, BILLING_LIMITS.redeemPerParent, s.parentId, c.url)) || !(await allow(c.env, BILLING_LIMITS.redeemPerIp, clientIp(c.req), c.url))) return err("rate_limited", 429);
      const body = await readBody(c, ["code"]);
      if (!body) return err("invalid_body", 400);
      const code = normaliseAccessCode(body.code);
      if (!code) return err("invalid_code", 400);
      const db = c.env.DB;
      const row = await db.prepare("SELECT id FROM access_codes WHERE code_hash = ?").bind(await hashAccessCode(code)).first<{ id: string }>();
      if (!row) return err("invalid_code", 400);
      const loaded = await loadBilling(c.env, s.parentId);
      if (!loaded) return err("unauthorized", 401);
      if (hasLiveSubscription(loaded.state)) return err("has_subscription", 409);
      if (await db.prepare("SELECT 1 AS x FROM access_code_redemptions WHERE code_id = ? AND parent_id = ?").bind(row.id, s.parentId).first()) return err("already_redeemed", 409);
      const now = Date.now();
      // Claim one redemption atomically: only succeeds while the code is enabled, unexpired and under its limit.
      const claim = await db
        .prepare("UPDATE access_codes SET redemptions = redemptions + 1 WHERE id = ? AND disabled = 0 AND redemptions < max_redemptions AND (expires_at IS NULL OR expires_at > ?) RETURNING kind, days")
        .bind(row.id, now)
        .first<{ kind: "free_forever" | "free_days"; days: number | null }>();
      if (!claim) return err("code_unavailable", 410);
      const cur = loaded.state.free;
      let kind: "forever" | "days" = "forever";
      let until: number | null = null;
      if (claim.kind === "free_days" && cur?.kind !== "forever") {
        kind = "days";
        until = Math.max(now, cur?.kind === "days" && cur.until ? cur.until : now) + (claim.days ?? 0) * DAY_MS;
      }
      try {
        await db.batch([
          db.prepare("INSERT INTO access_code_redemptions (code_id, parent_id, redeemed_at) VALUES (?, ?, ?)").bind(row.id, s.parentId, now),
          db
            .prepare(
              `INSERT INTO billing_accounts (parent_id, free_kind, free_until, free_code_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?5)
               ON CONFLICT(parent_id) DO UPDATE SET free_kind = excluded.free_kind, free_until = excluded.free_until, free_code_id = excluded.free_code_id, updated_at = excluded.updated_at`,
            )
            .bind(s.parentId, kind, until, row.id, now),
        ]);
      } catch {
        await db.prepare("UPDATE access_codes SET redemptions = redemptions - 1 WHERE id = ? AND redemptions > 0").bind(row.id).run(); // give the slot back
        return err("already_redeemed", 409);
      }
      const after = await loadBilling(c.env, s.parentId);
      return json({ entitlement: computeEntitlement(after!.state, now) });
    },
  },
  {
    method: "POST",
    path: "/api/billing/webhook",
    crossOrigin: true, // Stripe's servers post here; the signature is the authentication
    async handler({ req, env, url }) {
      const secret = webhookSecret(env, url);
      if (!secret) return err("billing_not_configured", 503);
      // Byte-counted read that stops at the cap (Content-Length can be absent or wrong).
      const payload = await readCapped(req, MAX_WEBHOOK_BYTES);
      if (payload === undefined) return err("too_large", 413);
      const r = await processWebhook(env, payload, req.headers.get("stripe-signature"), secret, Date.now(), stripeForWebhook(env, url));
      return json(r.body, r.status);
    },
  },
  ...devRoutes(),
];

/* ---------------- account deletion + export hooks (used by worker/routes/me.ts) ---------------- */

/** Cancels the Stripe subscription, deletes the Stripe Customer and returns statements deleting billing rows. Throws when Stripe fails. */
export async function billingOnAccountDelete(c: Ctx, parentId: string): Promise<D1PreparedStatement[]> {
  const stripe = stripeFor(c.env, c.url);
  const need = () => {
    if (!stripe) throw new Error("billing_not_configured");
    return stripe;
  };
  return billingDeletionStatements(c.env, parentId, {
    cancel: (id) => need().cancelSubscriptionNow(id),
    deleteCustomer: (id) => need().deleteCustomer(id),
  });
}
export { billingExport };

/* ---------------- development-only fake Checkout / Portal pages ---------------- */

function devRoutes(): Route[] {
  const guard = async (c: Ctx, params: URLSearchParams) => stripeMode(c.env, c.url) === "fake" && (await verifyDevLink(params));
  const sameOrigin = (c: Ctx, u: string | null) => (u && u.startsWith(`${c.url.origin}/`) ? u : `${c.url.origin}/parents`);
  const banner = '<p style="background:#fff4d6;border:2px dashed #c9a227;padding:8px;border-radius:10px">Development test page. No real card, no real Stripe.</p>';
  // Deliver through the real webhook processor so signature verification and idempotency run exactly as in production.
  const post = async (c: Ctx, type: string, object: Record<string, unknown>) => {
    if (object.object === "subscription") rememberDevSubscription(object); // the fake's "Stripe side" now holds this state
    const req = await devWebhookRequest(c.url.origin, type, object);
    const secret = webhookSecret(c.env, c.url)!;
    const r = await processWebhook(c.env, await req.text(), req.headers.get("stripe-signature"), secret, Date.now(), stripeForWebhook(c.env, c.url));
    if (r.status !== 200) throw new Error(`dev webhook ${type} failed`);
  };
  return [
    {
      method: "GET",
      path: "/api/billing/dev/checkout",
      async handler(c) {
        if (!(await guard(c, c.url.searchParams))) return err("not_found", 404);
        const t = Number(c.url.searchParams.get("t"));
        const terms = t > 0 ? `Free until ${esc(fmtDate(t))}, then ${PRICE.display}/month until you cancel.` : `${PRICE.display} today, then every month until you cancel.`;
        return html(
          `${banner}<h1>BrainZippy Family</h1><p>${terms}</p>
<form method="post" action="/api/billing/dev/checkout?${esc(c.url.searchParams.toString())}"><button type="submit" data-testid="dev-checkout-pay">${t > 0 ? "Start free trial" : "Subscribe"}</button></form>
<p><a href="${esc(sameOrigin(c, c.url.searchParams.get("back")))}" data-testid="dev-checkout-back">Back</a></p>`,
        );
      },
    },
    {
      method: "POST",
      path: "/api/billing/dev/checkout",
      async handler(c) {
        const q = c.url.searchParams;
        if (!(await guard(c, q))) return err("not_found", 404);
        const parentId = q.get("p")!;
        const customer = q.get("c")!;
        const t = Number(q.get("t"));
        const now = Date.now();
        const sub = `sub_dev_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
        await post(c, "checkout.session.completed", { id: `cs_dev_${sub.slice(8)}`, object: "checkout.session", mode: "subscription", status: "complete", client_reference_id: parentId, customer, subscription: sub });
        await post(c, "customer.subscription.created", devSubscription({ id: sub, customer, parentId, status: t > 0 ? "trialing" : "active", trialEnd: t > 0 ? t : null, periodEnd: t > 0 ? t : now + 30 * DAY_MS, cancelAtPeriodEnd: false }));
        return redirect(sameOrigin(c, q.get("ok")));
      },
    },
    {
      method: "GET",
      path: "/api/billing/dev/portal",
      async handler(c) {
        if (!(await guard(c, c.url.searchParams))) return err("not_found", 404);
        const row = await c.env.DB.prepare("SELECT sub_status, cancel_at_period_end FROM billing_accounts WHERE stripe_customer_id = ?").bind(c.url.searchParams.get("c")).first<{ sub_status: string | null; cancel_at_period_end: number }>();
        const cancelForm = row?.sub_status && ["trialing", "active", "past_due"].includes(row.sub_status) && !row.cancel_at_period_end
          ? `<form method="post" action="/api/billing/dev/portal?${esc(c.url.searchParams.toString())}"><button type="submit" data-testid="dev-portal-cancel">Cancel plan</button></form>`
          : "<p>No plan to cancel.</p>";
        const flow = c.url.searchParams.get("flow") === "cancel";
        return html(`${banner}<h1>${flow ? "Cancel your plan" : "Manage billing"}</h1><p>Plan status: ${esc(row?.sub_status ?? "none")}${row?.cancel_at_period_end ? " (cancels at period end)" : ""}</p>${cancelForm}
<p><a href="${esc(sameOrigin(c, c.url.searchParams.get("back")))}" data-testid="dev-portal-back">Back to BrainZippy</a></p>`);
      },
    },
    {
      method: "POST",
      path: "/api/billing/dev/portal",
      async handler(c) {
        const q = c.url.searchParams;
        if (!(await guard(c, q))) return err("not_found", 404);
        const row = await c.env.DB.prepare("SELECT * FROM billing_accounts WHERE stripe_customer_id = ?").bind(q.get("c")).first<{ parent_id: string; stripe_subscription_id: string; sub_status: string; trial_end: number | null; current_period_end: number | null }>();
        if (row?.stripe_subscription_id) {
          await post(c, "customer.subscription.updated", devSubscription({ id: row.stripe_subscription_id, customer: q.get("c")!, parentId: row.parent_id, status: row.sub_status, trialEnd: row.trial_end, periodEnd: row.current_period_end ?? Date.now(), cancelAtPeriodEnd: true }));
        }
        return redirect(sameOrigin(c, q.get("back")));
      },
    },
  ];
}
