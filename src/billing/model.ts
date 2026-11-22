/**
 * Billing model: pure, shared by the Worker (server truth) and the client (offline play decisions).
 * No React, no DOM, no I/O. Every rule here is unit-tested (tests/unit/billing-model.test.ts).
 *
 * Owner's model: 14 free days (device first play or account creation, whichever is earlier once linked) →
 * a grown-up adds a card → 14 more free days (Stripe trial) → $6.99/month until cancelled.
 * Free-access codes bypass payment entirely. Stripe promotion codes give discounts inside Checkout.
 */
export const DAY_MS = 86_400_000;
export const INTRO_TRIAL_DAYS = 14;
export const CARD_TRIAL_DAYS = 14;
/** After a failed renewal payment, play continues for this long while Stripe retries. */
export const PAYMENT_GRACE_MS = 7 * DAY_MS;
/** A paid answer cached on the device stays valid this long past its own end date (covers renewals while offline). */
export const OFFLINE_GRACE_MS = 7 * DAY_MS;

export const PRICE = { cents: 699, display: "$6.99", currency: "usd", interval: "month" } as const;
/** Bump when the renewal wording on the paywall changes (stored with the parent's consent). */
export const RENEWAL_TERMS_VERSION = "2026-11-18";

export type EntitlementStatus = "trial" | "active" | "free" | "needs-payment";
/**
 * Where the entitlement comes from: the no-card free period, a Stripe subscription, a free-access code, nothing, or
 * early access (billing switched off: BILLING_ENABLED is not "true", D-030; everything is free, no trial clock).
 */
export type EntitlementSource = "intro" | "stripe" | "code" | "none" | "early-access";

export interface Entitlement {
  status: EntitlementStatus;
  source: EntitlementSource;
  /** Unix ms. trial: when the free period (intro) or the Stripe trial ends. needs-payment: when the free period ended. */
  trialEndsAt?: number;
  /** Unix ms of the next $6.99 charge (Stripe, not cancelling). */
  renewsAt?: number;
  /** Unix ms when access ends because the plan was cancelled or a time-limited code runs out. */
  endsAt?: number;
  /** Unix ms until which play continues after a failed payment. */
  graceEndsAt?: number;
  /** The server vouches for access until this time (null = no end, e.g. a free-forever code). */
  accessUntil: number | null;
  paymentIssue?: boolean;
  /** A Stripe customer exists, so the Customer Portal (manage/cancel) is available. */
  manageable?: boolean;
  /** Server time the answer was computed. */
  checkedAt: number;
}

export type SubStatus = "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "incomplete" | "incomplete_expired" | "paused";
export const LIVE_SUB_STATUSES: readonly string[] = ["trialing", "active", "past_due"];

export interface SubState {
  status: string;
  trialEnd: number | null;
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: number | null;
  paymentFailedAt: number | null;
  /** When we last updated the row (fallback start of the payment grace if no failure time was recorded). */
  updatedAt: number;
}

export interface BillingState {
  /** parents.created_at; null for a device that was never signed in. */
  accountCreatedAt: number | null;
  /** parents.trial_started_at, or the device's first play for an unlinked device. */
  trialStartedAt: number | null;
  sub: SubState | null;
  free: { kind: "forever" | "days"; until: number | null } | null;
  hasCustomer: boolean;
}

/** Start of the 14-day free period: the earliest known of account creation and first play. */
export function introStart(s: Pick<BillingState, "accountCreatedAt" | "trialStartedAt">, now: number): number {
  const known = [s.accountCreatedAt, s.trialStartedAt].filter((x): x is number => typeof x === "number" && Number.isFinite(x));
  return known.length ? Math.min(...known) : now;
}
export const introEnd = (s: Pick<BillingState, "accountCreatedAt" | "trialStartedAt">, now: number) => introStart(s, now) + INTRO_TRIAL_DAYS * DAY_MS;

function fromSubscription(sub: SubState, now: number, base: Pick<Entitlement, "checkedAt" | "manageable">): Entitlement | "needs-payment" | null {
  const cancelling = sub.cancelAtPeriodEnd || sub.cancelAt !== null;
  switch (sub.status) {
    case "trialing": {
      const end = sub.trialEnd ?? sub.periodEnd;
      const endsAt = sub.cancelAt ?? (sub.cancelAtPeriodEnd ? (end ?? undefined) : undefined);
      return { ...base, status: "trial", source: "stripe", trialEndsAt: end ?? undefined, renewsAt: cancelling ? undefined : (end ?? undefined), endsAt, accessUntil: endsAt ?? end ?? null };
    }
    case "active": {
      const endsAt = sub.cancelAt ?? (sub.cancelAtPeriodEnd ? (sub.periodEnd ?? undefined) : undefined);
      return { ...base, status: "active", source: "stripe", renewsAt: cancelling ? undefined : (sub.periodEnd ?? undefined), endsAt, accessUntil: endsAt ?? sub.periodEnd ?? null };
    }
    case "past_due": {
      const graceEndsAt = (sub.paymentFailedAt ?? sub.updatedAt) + PAYMENT_GRACE_MS;
      if (now < graceEndsAt) return { ...base, status: "active", source: "stripe", paymentIssue: true, graceEndsAt, accessUntil: graceEndsAt };
      return "needs-payment";
    }
    case "unpaid":
    case "paused":
    case "incomplete":
      return "needs-payment";
    default:
      return null; // canceled, incomplete_expired, unknown: the subscription no longer grants anything
  }
}

/**
 * The entitlement state machine. Precedence:
 * 1. a live Stripe subscription (trialing, active, past_due within the 7-day payment grace);
 * 2. a valid free-access code (forever, or days not yet run out);
 * 3. a subscription that needs payment (past_due after grace, unpaid, paused, incomplete) → needs-payment;
 * 4. the no-card free period (14 days from introStart) → trial, else needs-payment.
 */
export function computeEntitlement(s: BillingState, now: number): Entitlement {
  const base = { checkedAt: now, ...(s.hasCustomer ? { manageable: true } : {}) };
  const fromSub = s.sub ? fromSubscription(s.sub, now, base) : null;
  if (fromSub && fromSub !== "needs-payment") return fromSub;
  if (s.free?.kind === "forever") return { ...base, status: "free", source: "code", accessUntil: null };
  if (s.free?.kind === "days" && s.free.until !== null && now < s.free.until) return { ...base, status: "free", source: "code", endsAt: s.free.until, accessUntil: s.free.until };
  if (fromSub === "needs-payment") return { ...base, status: "needs-payment", source: "stripe", paymentIssue: true, accessUntil: 0 };
  const end = introEnd(s, now);
  if (now < end) return { ...base, status: "trial", source: "intro", trialEndsAt: end, accessUntil: end };
  return { ...base, status: "needs-payment", source: "none", trialEndsAt: end, accessUntil: 0 };
}

/** Is the subscription one that blocks starting another Checkout (and redeeming codes)? */
export const hasLiveSubscription = (s: BillingState) => !!s.sub && LIVE_SUB_STATUSES.includes(s.sub.status);

/**
 * What the card trial would be if the parent started Checkout now. Remaining no-card days are kept:
 * the card trial ends 14 days after the later of now and the end of the free period.
 * null = no trial (one was already used): the first payment is taken at Checkout.
 */
export function checkoutTrialEnd(s: BillingState, trialUsed: boolean, now: number): number | null {
  if (trialUsed) return null;
  return Math.max(now, introEnd(s, now)) + CARD_TRIAL_DAYS * DAY_MS;
}

/** Client play decision. A cached server answer wins over the device's own free period ("whichever is earlier once linked"). */
export function canPlay(ent: Entitlement, now: number): boolean {
  if (ent.status === "needs-payment") return false;
  if (ent.source === "intro") return ent.accessUntil !== null && now < ent.accessUntil;
  if (ent.accessUntil === null) return true;
  // Paid or code access: the server's end date plus an offline grace. A renewal the device hasn't heard about yet
  // (offline) never locks a paying child out; when online, every game open refreshes the answer.
  return now < ent.accessUntil + OFFLINE_GRACE_MS;
}

export interface CachedEntitlement {
  ent: Entitlement;
  fetchedAt: number;
}

/** Billing switched off (early access): free, no end date, no trial clock. Never cached as a server answer. */
export const earlyAccessEntitlement = (now: number): Entitlement => ({ status: "free", source: "early-access", accessUntil: null, checkedAt: now });

/** Device-only entitlement (never signed in): the free period from this device's first play. */
export function deviceEntitlement(firstPlayAt: number | null, now: number): Entitlement {
  return computeEntitlement({ accountCreatedAt: null, trialStartedAt: firstPlayAt ?? now, sub: null, free: null, hasCustomer: false }, now);
}

export function decidePlay(firstPlayAt: number | null, cached: CachedEntitlement | null, now: number): { entitlement: Entitlement; playable: boolean } {
  if (cached) return { entitlement: cached.ent, playable: canPlay(cached.ent, now) };
  const entitlement = deviceEntitlement(firstPlayAt, now);
  return { entitlement, playable: canPlay(entitlement, now) };
}

/** Whole days left until `t` (rounded up), never negative. */
export const daysLeft = (t: number, now: number) => Math.max(0, Math.ceil((t - now) / DAY_MS));

/** Validates an entitlement from storage or the network (anything odd → null, never trusted). */
export function parseEntitlement(x: unknown): Entitlement | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const statuses: EntitlementStatus[] = ["trial", "active", "free", "needs-payment"];
  const sources: EntitlementSource[] = ["intro", "stripe", "code", "none", "early-access"];
  if (!statuses.includes(o.status as EntitlementStatus) || !sources.includes(o.source as EntitlementSource)) return null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  if (!(o.accessUntil === null || num(o.accessUntil) !== undefined) || num(o.checkedAt) === undefined) return null;
  const out: Entitlement = { status: o.status as EntitlementStatus, source: o.source as EntitlementSource, accessUntil: o.accessUntil as number | null, checkedAt: o.checkedAt as number };
  for (const k of ["trialEndsAt", "renewsAt", "endsAt", "graceEndsAt"] as const) if (num(o[k]) !== undefined) out[k] = o[k] as number;
  if (o.paymentIssue === true) out.paymentIssue = true;
  if (o.manageable === true) out.manageable = true;
  return out;
}
