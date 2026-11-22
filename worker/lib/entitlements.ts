/**
 * Entitlements: what a parent's family may use, derived from D1 (billing_accounts, parents) by the pure state machine
 * in src/billing/model.ts. Callers depend only on the Entitlement type.
 *
 * Enforcement model (honest user): play is gated on the device (src/billing/PlayGate.tsx) using this answer, cached
 * for offline play. There are no paid-only API features today; any future one must check `requirePaid` server-side.
 */
import { computeEntitlement, DAY_MS, earlyAccessEntitlement, type BillingState, type Entitlement } from "../../src/billing/model";
import { billingEnabled } from "./config";

export type { Entitlement, EntitlementStatus } from "../../src/billing/model";
export type EntitlementSubject = { parentId: string } | { deviceId: string };

export interface BillingRow {
  parent_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  sub_status: string | null;
  trial_end: number | null;
  current_period_end: number | null;
  cancel_at_period_end: number;
  cancel_at: number | null;
  ended_at: number | null;
  payment_failed_at: number | null;
  sub_event_at: number | null;
  trial_used: number;
  free_kind: "forever" | "days" | null;
  free_until: number | null;
  free_code_id: string | null;
  renewal_consent_at: number | null;
  renewal_consent_version: string | null;
  created_at: number;
  updated_at: number;
}

export function rowToState(p: { created_at: number; trial_started_at: number | null }, b: BillingRow | null): BillingState {
  return {
    accountCreatedAt: p.created_at,
    trialStartedAt: p.trial_started_at,
    sub:
      b?.sub_status && b.stripe_subscription_id
        ? {
            status: b.sub_status,
            trialEnd: b.trial_end,
            periodEnd: b.current_period_end,
            cancelAtPeriodEnd: b.cancel_at_period_end === 1,
            cancelAt: b.cancel_at,
            paymentFailedAt: b.payment_failed_at,
            updatedAt: b.updated_at,
          }
        : null,
    free: b?.free_kind ? { kind: b.free_kind, until: b.free_until } : null,
    hasCustomer: !!b?.stripe_customer_id,
  };
}

export async function loadBilling(env: Env, parentId: string): Promise<{ state: BillingState; row: BillingRow | null } | null> {
  const [p, b] = await env.DB.batch([
    env.DB.prepare("SELECT created_at, trial_started_at FROM parents WHERE id = ?").bind(parentId),
    env.DB.prepare("SELECT * FROM billing_accounts WHERE parent_id = ?").bind(parentId),
  ]);
  const parent = p?.results[0] as { created_at: number; trial_started_at: number | null } | undefined;
  if (!parent) return null;
  const row = (b?.results[0] as BillingRow | undefined) ?? null;
  return { state: rowToState(parent, row), row };
}

export async function getEntitlement(env: Env, subject: EntitlementSubject, now = Date.now()): Promise<Entitlement> {
  // Billing off (BILLING_ENABLED, D-030): everyone is free during early access; no trial clock runs.
  if (!billingEnabled(env)) return earlyAccessEntitlement(now);
  if ("parentId" in subject) {
    const loaded = await loadBilling(env, subject.parentId);
    if (loaded) return computeEntitlement(loaded.state, now);
    return computeEntitlement({ accountCreatedAt: null, trialStartedAt: now, sub: null, free: null, hasCustomer: false }, now);
  }
  // Unlinked devices: guest rows (if any) start the free period; the device's own clock is the client's job.
  const g = await env.DB.prepare("SELECT created_at FROM guest_sessions WHERE id = ?").bind(subject.deviceId).first<{ created_at: number }>();
  return computeEntitlement({ accountCreatedAt: null, trialStartedAt: g?.created_at ?? now, sub: null, free: null, hasCustomer: false }, now);
}

/** Earliest first-play time we accept from a device (anything older is clamped; the field can only shorten a trial). */
const EARLIEST_PLAUSIBLE = Date.UTC(2026, 0, 1);

/**
 * Link-time trial merge: the account's free period starts at the earliest of account creation and any reported
 * first play on a signed-in device. A report can only move the start earlier, never later.
 */
export async function mergeTrialStart(env: Env, parentId: string, firstPlayAt: unknown, now = Date.now()): Promise<boolean> {
  if (typeof firstPlayAt !== "number" || !Number.isFinite(firstPlayAt) || firstPlayAt > now + DAY_MS) return false;
  const t = Math.max(EARLIEST_PLAUSIBLE, Math.min(now, Math.floor(firstPlayAt)));
  const r = await env.DB.prepare("UPDATE parents SET trial_started_at = ? WHERE id = ? AND COALESCE(trial_started_at, created_at) > ?").bind(t, parentId, t).run();
  return (r.meta.changes ?? 0) > 0;
}

/** For GET /api/me/export: billing facts we hold (never card data; Stripe holds that). */
export async function billingExport(env: Env, parentId: string) {
  const loaded = await loadBilling(env, parentId);
  if (!loaded) return null;
  const r = loaded.row;
  return {
    entitlement: computeEntitlement(loaded.state, Date.now()),
    trialStartedAt: loaded.state.trialStartedAt,
    stripeCustomer: r?.stripe_customer_id ? "yes (payment details are held by Stripe)" : "no",
    subscriptionStatus: r?.sub_status ?? null,
    renewalConsentAt: r?.renewal_consent_at ?? null,
    renewalConsentVersion: r?.renewal_consent_version ?? null,
  };
}

/**
 * Account deletion: cancel any Stripe subscription immediately (a deleted account must never be charged again), then
 * delete the Stripe Customer (removes saved payment methods; Stripe keeps its own legally required payment records,
 * see docs/PRIVACY_SECURITY.md), then return the statements that delete our billing rows. Throws if Stripe can't be
 * reached, so deletion stops and can be retried.
 */
export interface StripeDeletion {
  cancel(subscriptionId: string): Promise<void>;
  deleteCustomer(customerId: string): Promise<void>;
}
export async function billingDeletionStatements(env: Env, parentId: string, stripe: StripeDeletion): Promise<D1PreparedStatement[]> {
  const row = await env.DB.prepare("SELECT stripe_customer_id, stripe_subscription_id, sub_status FROM billing_accounts WHERE parent_id = ?")
    .bind(parentId)
    .first<{ stripe_customer_id: string | null; stripe_subscription_id: string | null; sub_status: string | null }>();
  if (row?.stripe_subscription_id && row.sub_status && !["canceled", "incomplete_expired"].includes(row.sub_status)) await stripe.cancel(row.stripe_subscription_id);
  if (row?.stripe_customer_id) await stripe.deleteCustomer(row.stripe_customer_id);
  return [
    env.DB.prepare("DELETE FROM access_code_redemptions WHERE parent_id = ?").bind(parentId),
    env.DB.prepare("DELETE FROM billing_accounts WHERE parent_id = ?").bind(parentId),
  ];
}
