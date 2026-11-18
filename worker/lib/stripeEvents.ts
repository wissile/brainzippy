import { isUuid } from "./validation";
import { LIVE_SUB_STATUSES } from "../../src/billing/model";
import { idOf, parseEvent, subscriptionFields, verifyStripeSignature, type StripeApi, type StripeEvent, type StripeObject } from "./stripe";

/**
 * Webhook processing. Exactly-once: the event id is inserted in the SAME D1 batch (a transaction) as the state
 * change, with a plain INSERT on the primary key, so a concurrent duplicate fails and rolls back; a later duplicate is
 * answered from the stripe_events lookup.
 *
 * Ordering: Stripe doesn't guarantee delivery order, and event.created has 1-second resolution. For subscription
 * events we therefore RE-FETCH the subscription from Stripe and derive state from that current object, not from the
 * (possibly stale) payload. Consequences:
 * - Two events in the same second, in either order, both write the current state.
 * - A late `customer.subscription.created` for an old subscription reads its current status (e.g. canceled), so it
 *   can't overwrite a newer live subscription (the upsert's WHERE keeps a live subscription unless the incoming one
 *   is live too).
 * - sub_event_at still skips an event older than the last applied one (its refetch adds nothing newer).
 * - Unknown to Stripe (404): `deleted` events apply as canceled; other subscription events are ignored.
 * - Stripe unreachable: the call throws → 500 → Stripe retries the event later (nothing recorded).
 * Without a client (no secret key and not the dev fake) the payload is used as before.
 */
export const HANDLED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
  "invoice.paid",
] as const;

export const MAX_WEBHOOK_BYTES = 512 * 1024;
/** Processed event ids are kept this long for idempotency; purged by the daily job (worker/jobs/purge.ts). */
export const STRIPE_EVENT_RETENTION_MS = 30 * 86_400_000;

export type WebhookResult = { status: number; body: { received?: boolean; duplicate?: boolean; ignored?: boolean; error?: string } };

export type SubscriptionFetcher = Pick<StripeApi, "retrieveSubscription"> | null;

export async function processWebhook(env: Env, payload: string, signature: string | null, secret: string, now = Date.now(), stripe: SubscriptionFetcher = null): Promise<WebhookResult> {
  if (!(await verifyStripeSignature(payload, signature, secret, Math.floor(now / 1000)))) return { status: 400, body: { error: "invalid_signature" } };
  const event = parseEvent(payload);
  if (!event) return { status: 400, body: { error: "invalid_event" } };
  const seen = await env.DB.prepare("SELECT 1 AS x FROM stripe_events WHERE id = ?").bind(event.id).first();
  if (seen) return { status: 200, body: { received: true, duplicate: true } };
  const stmts = (HANDLED_EVENTS as readonly string[]).includes(event.type) ? await statementsFor(env, await withCurrentSubscription(event, stripe), now) : [];
  const record = env.DB.prepare("INSERT INTO stripe_events (id, type, received_at) VALUES (?, ?, ?)").bind(event.id, event.type, now);
  try {
    await env.DB.batch([record, ...stmts]);
  } catch (e) {
    // A concurrent delivery of the same event won the race: the work is done.
    if (await env.DB.prepare("SELECT 1 AS x FROM stripe_events WHERE id = ?").bind(event.id).first()) return { status: 200, body: { received: true, duplicate: true } };
    throw e;
  }
  return { status: 200, body: stmts.length ? { received: true } : { received: true, ignored: true } };
}

/** For subscription events, replaces the payload object with Stripe's current one (see the header). Null object = ignore. */
async function withCurrentSubscription(event: StripeEvent, stripe: SubscriptionFetcher): Promise<StripeEvent> {
  if (!stripe || !event.type.startsWith("customer.subscription.")) return event;
  const id = idOf(event.data.object.id);
  if (!id || !/^sub_[A-Za-z0-9_]{1,250}$/.test(id)) return { ...event, data: { object: {} } };
  const current = await stripe.retrieveSubscription(id); // throws on network/5xx → 500 → Stripe retries
  if (current && idOf(current.id) === id) return { ...event, data: { object: current } };
  if (event.type === "customer.subscription.deleted") return { ...event, data: { object: { ...event.data.object, status: "canceled" } } };
  return { ...event, data: { object: {} } }; // Stripe doesn't know it: ignore
}

async function parentExists(env: Env, id: string | null): Promise<boolean> {
  if (!id || !isUuid(id)) return false;
  return !!(await env.DB.prepare("SELECT 1 AS x FROM parents WHERE id = ?").bind(id).first());
}

async function parentForCustomer(env: Env, customer: string | null): Promise<string | null> {
  if (!customer) return null;
  return (await env.DB.prepare("SELECT parent_id FROM billing_accounts WHERE stripe_customer_id = ?").bind(customer).first<{ parent_id: string }>())?.parent_id ?? null;
}

/** The customer id must not already belong to a different parent (UNIQUE would fail the batch forever). */
async function customerConflict(env: Env, customer: string | null, parentId: string): Promise<boolean> {
  const owner = await parentForCustomer(env, customer);
  return owner !== null && owner !== parentId;
}

async function statementsFor(env: Env, event: StripeEvent, now: number): Promise<D1PreparedStatement[]> {
  const db = env.DB;
  const obj: StripeObject = event.data.object;
  const at = event.created * 1000;
  switch (event.type) {
    case "checkout.session.completed": {
      if (obj.mode !== "subscription") return [];
      const parentId = typeof obj.client_reference_id === "string" ? obj.client_reference_id : null;
      const customer = idOf(obj.customer);
      const subscription = idOf(obj.subscription);
      if (!parentId || !(await parentExists(env, parentId)) || !customer || (await customerConflict(env, customer, parentId))) return [];
      return [
        db
          .prepare(
            `INSERT INTO billing_accounts (parent_id, stripe_customer_id, stripe_subscription_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)
             ON CONFLICT(parent_id) DO UPDATE SET
               stripe_customer_id = excluded.stripe_customer_id,
               stripe_subscription_id = CASE
                 WHEN billing_accounts.sub_status IN ('trialing', 'active', 'past_due') AND billing_accounts.stripe_subscription_id IS NOT excluded.stripe_subscription_id
                   THEN billing_accounts.stripe_subscription_id
                 ELSE COALESCE(excluded.stripe_subscription_id, billing_accounts.stripe_subscription_id) END,
               updated_at = excluded.updated_at`,
          )
          .bind(parentId, customer, subscription, now),
      ];
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const f = subscriptionFields(obj);
      if (!f.id || !f.customer) return [];
      const status = event.type === "customer.subscription.deleted" ? "canceled" : f.status;
      let parentId = (await parentExists(env, f.parentId)) ? f.parentId : null;
      parentId ??= await parentForCustomer(env, f.customer);
      if (!parentId || (await customerConflict(env, f.customer, parentId))) return [];
      const live = LIVE_SUB_STATUSES.includes(status) ? 1 : 0;
      return [
        db
          .prepare(
            `INSERT INTO billing_accounts (parent_id, stripe_customer_id, stripe_subscription_id, sub_status, trial_end, current_period_end, cancel_at_period_end, cancel_at, ended_at, sub_event_at, trial_used, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)
             ON CONFLICT(parent_id) DO UPDATE SET
               stripe_customer_id = excluded.stripe_customer_id,
               stripe_subscription_id = excluded.stripe_subscription_id,
               sub_status = excluded.sub_status,
               trial_end = excluded.trial_end,
               current_period_end = excluded.current_period_end,
               cancel_at_period_end = excluded.cancel_at_period_end,
               cancel_at = excluded.cancel_at,
               ended_at = excluded.ended_at,
               sub_event_at = excluded.sub_event_at,
               trial_used = MAX(billing_accounts.trial_used, excluded.trial_used),
               payment_failed_at = CASE WHEN excluded.sub_status IN ('trialing', 'active') THEN NULL ELSE billing_accounts.payment_failed_at END,
               updated_at = excluded.updated_at
             WHERE (billing_accounts.sub_event_at IS NULL OR billing_accounts.sub_event_at <= excluded.sub_event_at OR billing_accounts.stripe_subscription_id IS NOT excluded.stripe_subscription_id)
               AND (billing_accounts.stripe_subscription_id IS NULL OR billing_accounts.stripe_subscription_id = excluded.stripe_subscription_id
                    OR billing_accounts.sub_status IS NULL OR billing_accounts.sub_status NOT IN ('trialing', 'active', 'past_due') OR ?13 = 1)`,
          )
          .bind(parentId, f.customer, f.id, status, f.trialEnd, f.periodEnd, f.cancelAtPeriodEnd ? 1 : 0, f.cancelAt, f.endedAt, at, f.hadTrial ? 1 : 0, now, live),
      ];
    }
    case "invoice.payment_failed": {
      const customer = idOf(obj.customer);
      if (!customer) return [];
      return [db.prepare("UPDATE billing_accounts SET payment_failed_at = COALESCE(payment_failed_at, ?), updated_at = ? WHERE stripe_customer_id = ?").bind(at, now, customer)];
    }
    case "invoice.paid": {
      const customer = idOf(obj.customer);
      if (!customer) return [];
      return [db.prepare("UPDATE billing_accounts SET payment_failed_at = NULL, updated_at = ? WHERE stripe_customer_id = ? AND payment_failed_at IS NOT NULL AND payment_failed_at <= ?").bind(now, customer, at)];
    }
    default:
      return [];
  }
}
