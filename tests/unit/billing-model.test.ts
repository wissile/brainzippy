import { describe, expect, it } from "vitest";
import {
  canPlay,
  checkoutTrialEnd,
  computeEntitlement,
  DAY_MS,
  daysLeft,
  decidePlay,
  introStart,
  OFFLINE_GRACE_MS,
  PAYMENT_GRACE_MS,
  parseEntitlement,
  type BillingState,
  type SubState,
} from "../../src/billing/model";

const T0 = Date.UTC(2026, 10, 1, 12); // 1 Nov 2026
const day = (n: number) => T0 + n * DAY_MS;
const S = (o: Partial<BillingState> = {}): BillingState => ({ accountCreatedAt: T0, trialStartedAt: null, sub: null, free: null, hasCustomer: false, ...o });
const sub = (o: Partial<SubState>): SubState => ({ status: "trialing", trialEnd: null, periodEnd: null, cancelAtPeriodEnd: false, cancelAt: null, paymentFailedAt: null, updatedAt: T0, ...o });

describe("entitlement state machine: no-card free period (intro)", () => {
  it("is a 14-day trial from account creation, then needs payment", () => {
    expect(computeEntitlement(S(), day(0))).toMatchObject({ status: "trial", source: "intro", trialEndsAt: day(14), accessUntil: day(14) });
    expect(computeEntitlement(S(), day(14) - 1).status).toBe("trial");
    expect(computeEntitlement(S(), day(14))).toMatchObject({ status: "needs-payment", source: "none", trialEndsAt: day(14), accessUntil: 0 });
  });

  it("link-time merge: starts at the EARLIER of account creation and the device's first play", () => {
    expect(introStart(S({ trialStartedAt: day(-5) }), day(0))).toBe(day(-5));
    expect(computeEntitlement(S({ trialStartedAt: day(-5) }), day(9)).status).toBe("needs-payment");
    expect(introStart(S({ trialStartedAt: day(3) }), day(0))).toBe(day(0)); // a later first play never extends it
    expect(introStart(S({ accountCreatedAt: null, trialStartedAt: null }), day(7))).toBe(day(7));
  });

  it("days left rounds up and never goes negative", () => {
    expect(daysLeft(day(14), day(0))).toBe(14);
    expect(daysLeft(day(14), day(13) + 1)).toBe(1);
    expect(daysLeft(day(14), day(20))).toBe(0);
  });
});

describe("entitlement state machine: Stripe subscription", () => {
  it("trialing → trial (stripe) with the first charge date; cancelled trial ends without renewal", () => {
    expect(computeEntitlement(S({ sub: sub({ trialEnd: day(28) }), hasCustomer: true }), day(15))).toMatchObject({ status: "trial", source: "stripe", trialEndsAt: day(28), renewsAt: day(28), accessUntil: day(28), manageable: true });
    const c = computeEntitlement(S({ sub: sub({ trialEnd: day(28), cancelAtPeriodEnd: true }) }), day(15));
    expect(c).toMatchObject({ status: "trial", endsAt: day(28), accessUntil: day(28) });
    expect(c.renewsAt).toBeUndefined();
  });

  it("active → active with renewal date; cancel_at_period_end and cancel_at give an end date", () => {
    expect(computeEntitlement(S({ sub: sub({ status: "active", periodEnd: day(58) }) }), day(30))).toMatchObject({ status: "active", source: "stripe", renewsAt: day(58), accessUntil: day(58) });
    const c = computeEntitlement(S({ sub: sub({ status: "active", periodEnd: day(58), cancelAtPeriodEnd: true }) }), day(30));
    expect(c).toMatchObject({ status: "active", endsAt: day(58) });
    expect(c.renewsAt).toBeUndefined();
    expect(computeEntitlement(S({ sub: sub({ status: "active", periodEnd: day(58), cancelAt: day(40) }) }), day(30))).toMatchObject({ endsAt: day(40), accessUntil: day(40) });
  });

  it("past_due: 7-day grace from the first failed payment, then needs payment", () => {
    const st = S({ sub: sub({ status: "past_due", periodEnd: day(58), paymentFailedAt: day(58) }) });
    expect(computeEntitlement(st, day(60))).toMatchObject({ status: "active", paymentIssue: true, graceEndsAt: day(58) + PAYMENT_GRACE_MS, accessUntil: day(65) });
    expect(computeEntitlement(st, day(65))).toMatchObject({ status: "needs-payment", source: "stripe", paymentIssue: true });
    // no failure time recorded (events out of order): grace runs from the row's last update
    expect(computeEntitlement(S({ sub: sub({ status: "past_due", updatedAt: day(59) }) }), day(60)).graceEndsAt).toBe(day(66));
  });

  it("unpaid, paused, incomplete → needs payment; canceled / incomplete_expired fall back to the free period", () => {
    for (const status of ["unpaid", "paused", "incomplete"]) expect(computeEntitlement(S({ sub: sub({ status }) }), day(3)).status).toBe("needs-payment");
    expect(computeEntitlement(S({ sub: sub({ status: "canceled" }) }), day(3))).toMatchObject({ status: "trial", source: "intro" });
    expect(computeEntitlement(S({ sub: sub({ status: "incomplete_expired" }) }), day(30))).toMatchObject({ status: "needs-payment", source: "none" });
  });
});

describe("entitlement state machine: free-access codes and precedence", () => {
  it("free forever and free days (until they run out)", () => {
    expect(computeEntitlement(S({ free: { kind: "forever", until: null } }), day(400))).toMatchObject({ status: "free", source: "code", accessUntil: null });
    const d = S({ free: { kind: "days", until: day(40) } });
    expect(computeEntitlement(d, day(39))).toMatchObject({ status: "free", endsAt: day(40), accessUntil: day(40) });
    expect(computeEntitlement(d, day(40)).status).toBe("needs-payment");
  });

  it("a live subscription wins over a code; a code wins over a subscription that needs payment", () => {
    expect(computeEntitlement(S({ free: { kind: "forever", until: null }, sub: sub({ status: "active", periodEnd: day(50) }) }), day(30)).source).toBe("stripe");
    expect(computeEntitlement(S({ free: { kind: "forever", until: null }, sub: sub({ status: "unpaid" }) }), day(30)).status).toBe("free");
  });
});

describe("checkout trial: remaining free days are kept, one trial per family", () => {
  it("ends 14 days after the later of now and the end of the free period", () => {
    expect(checkoutTrialEnd(S(), false, day(5))).toBe(day(28));
    expect(checkoutTrialEnd(S(), false, day(20))).toBe(day(34));
    expect(checkoutTrialEnd(S(), true, day(5))).toBeNull();
  });
});

describe("client play decision (offline cache)", () => {
  it("device-only: plays for 14 days from first play, locked on day 15", () => {
    expect(decidePlay(day(0), null, day(13)).playable).toBe(true);
    expect(decidePlay(day(0), null, day(14)).playable).toBe(false);
    expect(decidePlay(null, null, day(100)).playable).toBe(true); // never played: the clock starts now
  });

  it("a cached server answer wins over the device's own free period", () => {
    const ent = computeEntitlement(S({ accountCreatedAt: day(-30) }), day(0));
    expect(decidePlay(day(0), { ent, fetchedAt: day(0) }, day(1)).playable).toBe(false);
  });

  it("paid access survives 7 days offline past its end date; intro trials get no grace; needs-payment never plays", () => {
    const active = computeEntitlement(S({ sub: sub({ status: "active", periodEnd: day(30) }) }), day(10));
    expect(canPlay(active, day(31))).toBe(true);
    expect(canPlay(active, day(30) + OFFLINE_GRACE_MS - 1)).toBe(true);
    expect(canPlay(active, day(30) + OFFLINE_GRACE_MS)).toBe(false);
    const intro = computeEntitlement(S(), day(1));
    expect(canPlay(intro, day(14))).toBe(false);
    expect(canPlay(computeEntitlement(S(), day(20)), day(20))).toBe(false);
    expect(canPlay(computeEntitlement(S({ free: { kind: "forever", until: null } }), day(1)), day(9999))).toBe(true);
  });

  it("parses stored entitlements strictly", () => {
    const ent = computeEntitlement(S({ sub: sub({ status: "active", periodEnd: day(30) }), hasCustomer: true }), day(10));
    expect(parseEntitlement(JSON.parse(JSON.stringify(ent)))).toEqual(ent);
    expect(parseEntitlement({ ...ent, status: "vip" })).toBeNull();
    expect(parseEntitlement({ ...ent, accessUntil: "soon" })).toBeNull();
    expect(parseEntitlement(null)).toBeNull();
  });
});
