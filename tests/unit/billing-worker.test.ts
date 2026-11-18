// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleApi } from "../../worker/index";
import { createSession } from "../../worker/lib/session";
import { encodeForm, signStripePayload, subscriptionFields, verifyStripeSignature } from "../../worker/lib/stripe";
import { processWebhook } from "../../worker/lib/stripeEvents";
import { mergeTrialStart } from "../../worker/lib/entitlements";
import { hashAccessCode, normaliseAccessCode } from "../../src/billing/codes";
import { DAY_MS } from "../../src/billing/model";
import { fakeEnv } from "./helpers/d1";

const ORIGIN = "https://brainzippy.test";
const SECRET = "whsec_test_secret_value";
const STRIPE = { STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_ID: "price_699", STRIPE_WEBHOOK_SECRET: SECRET, STRIPE_API_BASE: "https://stripe.mock" };

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function setup(extra: Record<string, unknown> = STRIPE, createdAt = Date.now()) {
  const f = fakeEnv(extra as never);
  const parentId = crypto.randomUUID();
  f.raw.prepare("INSERT INTO parents (id, email, consent_version, consented_at, created_at, digest_opt_in) VALUES (?, ?, 'v', ?, ?, 0)").run(parentId, "p@example.com", createdAt, createdAt);
  const cookie = (await createSession(f.env, new URL(ORIGIN), parentId)).split(";")[0]!;
  const call = (path: string, body?: unknown, method = "POST") =>
    handleApi(new Request(`${ORIGIN}${path}`, { method, headers: { cookie, origin: ORIGIN, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }), f.env);
  return { ...f, parentId, call };
}

/** Stub Stripe's REST API; records every call. */
function stubStripe(responses: Record<string, unknown> = {}) {
  const calls: { url: string; method: string; body: URLSearchParams; headers: Headers }[] = [];
  vi.stubGlobal("fetch", async (input: string, init: RequestInit) => {
    const url = String(input);
    calls.push({ url, method: init.method ?? "GET", body: new URLSearchParams(String(init.body ?? "")), headers: new Headers(init.headers) });
    const path = new URL(url).pathname;
    const body = responses[path] ?? (path.includes("checkout") ? { id: "cs_test_1", url: "https://checkout.stripe.test/c/1" } : path.includes("billing_portal") ? { url: "https://billing.stripe.test/p/1" } : { id: "sub_1", status: "canceled" });
    return new Response(JSON.stringify(body), { status: 200 });
  });
  return calls;
}

const event = (type: string, object: Record<string, unknown>, created = Math.floor(Date.now() / 1000), id = `evt_${crypto.randomUUID().replace(/-/g, "")}`) => JSON.stringify({ id, object: "event", type, created, data: { object } });
const sendWebhook = async (env: Env, payload: string, opts: { t?: number; secret?: string; header?: string } = {}) => {
  const t = opts.t ?? Math.floor(Date.now() / 1000);
  const header = opts.header ?? (await signStripePayload(payload, opts.secret ?? SECRET, t));
  return handleApi(new Request(`${ORIGIN}/api/billing/webhook`, { method: "POST", headers: { "stripe-signature": header, "content-type": "application/json", origin: "https://stripe.example" }, body: payload }), env);
};
const subObj = (o: Record<string, unknown>) => ({ id: "sub_1", object: "subscription", customer: "cus_1", status: "trialing", trial_end: null, cancel_at_period_end: false, cancel_at: null, ended_at: null, metadata: {}, items: { data: [{ current_period_end: null }] }, ...o });

describe("webhook signature verification", () => {
  const now = 1_800_000_000;
  it("accepts a valid signature, also among several v1 values (secret rotation)", async () => {
    const h = await signStripePayload("{}", SECRET, now);
    expect(await verifyStripeSignature("{}", h, SECRET, now)).toBe(true);
    expect(await verifyStripeSignature("{}", `t=${now},v1=${"0".repeat(64)},${h.split(",")[1]}`, SECRET, now)).toBe(true);
  });
  it("rejects tampered payloads, wrong secrets, malformed headers", async () => {
    const h = await signStripePayload('{"a":1}', SECRET, now);
    expect(await verifyStripeSignature('{"a":2}', h, SECRET, now)).toBe(false);
    expect(await verifyStripeSignature('{"a":1}', h, "whsec_other", now)).toBe(false);
    expect(await verifyStripeSignature('{"a":1}', null, SECRET, now)).toBe(false);
    expect(await verifyStripeSignature('{"a":1}', "garbage", SECRET, now)).toBe(false);
    expect(await verifyStripeSignature('{"a":1}', h.replace(/v1=/, "v0="), SECRET, now)).toBe(false);
  });
  it("rejects stale or future timestamps beyond 5 minutes", async () => {
    const h = await signStripePayload("{}", SECRET, now);
    expect(await verifyStripeSignature("{}", h, SECRET, now + 300)).toBe(true);
    expect(await verifyStripeSignature("{}", h, SECRET, now + 301)).toBe(false);
    expect(await verifyStripeSignature("{}", h, SECRET, now - 301)).toBe(false);
  });
  it("the route answers 400 for bad signatures and 503 without a webhook secret", async () => {
    const { env } = await setup();
    const p = event("customer.subscription.created", subObj({}));
    expect((await sendWebhook(env, p, { secret: "whsec_wrong" })).status).toBe(400);
    expect((await sendWebhook(env, p, { t: Math.floor(Date.now() / 1000) - 3600 })).status).toBe(400);
    const { env: bare } = await setup({});
    expect((await sendWebhook(bare, p)).status).toBe(503);
  });
});

describe("webhook processing", () => {
  it("checkout + subscription events produce a Stripe trial; deleting ends it", async () => {
    const { env, call, parentId, count } = await setup();
    const trialEnd = Math.floor((Date.now() + 20 * DAY_MS) / 1000);
    expect((await sendWebhook(env, event("checkout.session.completed", { object: "checkout.session", mode: "subscription", client_reference_id: parentId, customer: "cus_1", subscription: "sub_1" }))).status).toBe(200);
    await sendWebhook(env, event("customer.subscription.created", subObj({ trial_end: trialEnd, metadata: { parent_id: parentId }, items: { data: [{ current_period_end: trialEnd }] } })));
    let ent = ((await (await call("/api/billing/status", {})).json()) as { entitlement: Record<string, unknown> }).entitlement;
    expect(ent).toMatchObject({ status: "trial", source: "stripe", trialEndsAt: trialEnd * 1000, renewsAt: trialEnd * 1000, manageable: true });
    await sendWebhook(env, event("customer.subscription.deleted", subObj({ status: "canceled", metadata: { parent_id: parentId } })));
    ent = ((await (await call("/api/billing/status", {})).json()) as { entitlement: Record<string, unknown> }).entitlement;
    expect(ent).toMatchObject({ status: "trial", source: "intro" }); // account is new: back to its own free days
    expect(count("stripe_events")).toBe(3);
  });

  it("is idempotent: a replayed event is applied once", async () => {
    const { env, parentId, raw } = await setup();
    const p = event("customer.subscription.updated", subObj({ status: "active", metadata: { parent_id: parentId }, items: { data: [{ current_period_end: 2_000_000_000 }] } }));
    const first = await sendWebhook(env, p);
    expect(await first.json()).toEqual({ received: true });
    raw.prepare("UPDATE billing_accounts SET sub_status = 'canceled'").run(); // pretend something else changed it since
    const second = await sendWebhook(env, p);
    expect(await second.json()).toEqual({ received: true, duplicate: true });
    expect(raw.prepare("SELECT sub_status FROM billing_accounts").get()).toEqual({ sub_status: "canceled" });
  });

  it("ignores out-of-order (older) subscription events and unknown event types", async () => {
    const { env, parentId, raw } = await setup();
    const t = Math.floor(Date.now() / 1000);
    await sendWebhook(env, event("customer.subscription.updated", subObj({ status: "active", metadata: { parent_id: parentId } }), t));
    await sendWebhook(env, event("customer.subscription.created", subObj({ status: "trialing", metadata: { parent_id: parentId } }), t - 60));
    expect(raw.prepare("SELECT sub_status FROM billing_accounts").get()).toEqual({ sub_status: "active" });
    expect(await (await sendWebhook(env, event("charge.refunded", { id: "ch_1" }))).json()).toEqual({ received: true, ignored: true });
  });

  it("invoice.payment_failed starts a 7-day grace, then needs-payment; invoice.paid clears it", async () => {
    const { env, call, parentId } = await setup();
    const now = Date.now();
    await sendWebhook(env, event("customer.subscription.updated", subObj({ status: "past_due", metadata: { parent_id: parentId }, items: { data: [{ current_period_end: Math.floor(now / 1000) }] } })));
    await sendWebhook(env, event("invoice.payment_failed", { object: "invoice", customer: "cus_1" }, Math.floor((now - 8 * DAY_MS) / 1000)));
    const late = ((await (await call("/api/billing/status", {})).json()) as { entitlement: Record<string, unknown> }).entitlement;
    expect(late).toMatchObject({ status: "needs-payment", paymentIssue: true });
    await sendWebhook(env, event("invoice.paid", { object: "invoice", customer: "cus_1" }));
    const ok = ((await (await call("/api/billing/status", {})).json()) as { entitlement: Record<string, unknown> }).entitlement;
    expect(ok).toMatchObject({ status: "active", paymentIssue: true }); // still past_due, grace restarts from the row update
  });

  it("drops events for unknown parents or customers owned by someone else", async () => {
    const { env, raw } = await setup();
    const r = await processWebhook(env, event("checkout.session.completed", { mode: "subscription", client_reference_id: crypto.randomUUID(), customer: "cus_x", subscription: "sub_x" }), null, SECRET);
    expect(r.status).toBe(400); // unsigned
    const payload = event("checkout.session.completed", { mode: "subscription", client_reference_id: crypto.randomUUID(), customer: "cus_x", subscription: "sub_x" });
    expect(await (await sendWebhook(env, payload)).json()).toEqual({ received: true, ignored: true });
    expect(raw.prepare("SELECT COUNT(*) AS n FROM billing_accounts").get()).toEqual({ n: 0 });
  });

  it("reads current_period_end from items (new API) or the subscription (old API)", () => {
    expect(subscriptionFields({ id: "sub_1", customer: "cus_1", items: { data: [{ current_period_end: 10 }, { current_period_end: 20 }] } }).periodEnd).toBe(20_000);
    expect(subscriptionFields({ id: "sub_1", customer: { id: "cus_1" }, current_period_end: 30 })).toMatchObject({ periodEnd: 30_000, customer: "cus_1" });
  });
});

describe("checkout, portal, status", () => {
  it("creates a subscription Checkout Session with card collection, promo codes, a 14-day trial and the parent's id", async () => {
    const calls = stubStripe();
    const { call, raw } = await setup();
    expect((await call("/api/billing/checkout", {})).status).toBe(400); // consent required
    const res = await call("/api/billing/checkout", { consent: true });
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.test/c/1" });
    const c = calls[0]!;
    expect(c.url).toBe("https://stripe.mock/v1/checkout/sessions");
    expect(c.headers.get("authorization")).toBe("Bearer sk_test_x");
    expect(c.headers.get("stripe-version")).toMatch(/^\d{4}-\d{2}-\d{2}\./);
    const b = Object.fromEntries(c.body);
    expect(b).toMatchObject({ mode: "subscription", "line_items[0][price]": "price_699", "line_items[0][quantity]": "1", payment_method_collection: "always", allow_promotion_codes: "true", customer_email: "p@example.com", success_url: `${ORIGIN}/parents?billing=success` });
    expect(b.client_reference_id).toBe(b["subscription_data[metadata][parent_id]"]);
    // new account: 14 free days left, so the card trial ends 28 days from now
    const trialEnd = Number(b["subscription_data[trial_end]"]) * 1000;
    expect(Math.abs(trialEnd - (Date.now() + 28 * DAY_MS))).toBeLessThan(60_000);
    expect(raw.prepare("SELECT renewal_consent_version FROM billing_accounts").get()).toEqual({ renewal_consent_version: "2026-11-18" });
  });

  it("no second trial; no second subscription; portal needs a customer and can open the cancel flow", async () => {
    const calls = stubStripe();
    const { call, raw, parentId } = await setup();
    expect((await call("/api/billing/portal", {})).status).toBe(404);
    raw.prepare("INSERT INTO billing_accounts (parent_id, stripe_customer_id, stripe_subscription_id, sub_status, trial_used, created_at, updated_at) VALUES (?, 'cus_9', 'sub_9', 'canceled', 1, 1, 1)").run(parentId);
    await call("/api/billing/checkout", { consent: true });
    const b = Object.fromEntries(calls[0]!.body);
    expect(b["subscription_data[trial_end]"]).toBeUndefined();
    expect(b.customer).toBe("cus_9");
    raw.prepare("UPDATE billing_accounts SET sub_status = 'active'").run();
    expect((await call("/api/billing/checkout", { consent: true })).status).toBe(409);
    expect(await (await call("/api/billing/portal", { flow: "cancel" })).json()).toEqual({ url: "https://billing.stripe.test/p/1" });
    const p = Object.fromEntries(calls.at(-1)!.body);
    expect(p).toMatchObject({ customer: "cus_9", "flow_data[type]": "subscription_cancel", "flow_data[subscription_cancel][subscription]": "sub_9" });
  });

  it("503 when billing is not configured; 401 without a session; Stripe errors become 502", async () => {
    const { call } = await setup({});
    expect((await call("/api/billing/checkout", { consent: true })).status).toBe(503);
    const anon = await handleApi(new Request(`${ORIGIN}/api/billing/status`, { method: "POST" }), fakeEnv().env);
    expect(anon.status).toBe(401);
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: { type: "invalid_request_error" } }), { status: 400 }));
    const s = await setup();
    expect((await s.call("/api/billing/checkout", { consent: true })).status).toBe(502);
  });

  it("status merges the device's first play: it can only move the trial start earlier", async () => {
    const now = Date.now();
    const { env, call, raw, parentId } = await setup(STRIPE, now);
    const r = (await (await call("/api/billing/status", { firstPlayAt: now - 10 * DAY_MS })).json()) as { entitlement: { trialEndsAt: number }; offer: { trialEndsAt: number } };
    expect(Math.abs(r.entitlement.trialEndsAt - (now + 4 * DAY_MS))).toBeLessThan(5000);
    expect(Math.abs(r.offer.trialEndsAt - (now + 18 * DAY_MS))).toBeLessThan(5000);
    expect(await mergeTrialStart(env, parentId, now - 2 * DAY_MS)).toBe(false); // later than the current start
    expect(await mergeTrialStart(env, parentId, now + 5 * DAY_MS)).toBe(false); // future
    expect(await mergeTrialStart(env, parentId, "x")).toBe(false);
    await mergeTrialStart(env, parentId, 5); // absurdly old: clamped
    expect((raw.prepare("SELECT trial_started_at FROM parents").get() as { trial_started_at: number }).trial_started_at).toBe(Date.UTC(2026, 0, 1));
    expect((await call("/api/billing/status", { firstPlayAt: 1, extra: 1 })).status).toBe(400);
  });

  it("account deletion cancels the live subscription first, then deletes the Stripe customer, and removes billing rows", async () => {
    const calls = stubStripe();
    const { call, raw, parentId, count } = await setup();
    raw.prepare("INSERT INTO billing_accounts (parent_id, stripe_customer_id, stripe_subscription_id, sub_status, created_at, updated_at) VALUES (?, 'cus_1', 'sub_1', 'active', 1, 1)").run(parentId);
    const res = await call("/api/me", { confirm: "delete" }, "DELETE");
    expect(res.status).toBe(200);
    expect(calls.map((c) => `${c.method} ${new URL(c.url).pathname}`)).toEqual(["DELETE /v1/subscriptions/sub_1", "DELETE /v1/customers/cus_1"]);
    expect(count("billing_accounts")).toBe(0);
    expect(count("parents")).toBe(0);
  });

  it("account deletion deletes a Stripe customer with no live subscription; a 404 customer is fine; other errors stop deletion", async () => {
    const calls = stubStripe();
    const a = await setup();
    a.raw.prepare("INSERT INTO billing_accounts (parent_id, stripe_customer_id, stripe_subscription_id, sub_status, created_at, updated_at) VALUES (?, 'cus_9', 'sub_9', 'canceled', 1, 1)").run(a.parentId);
    expect((await a.call("/api/me", { confirm: "delete" }, "DELETE")).status).toBe(200);
    expect(calls.map((c) => `${c.method} ${new URL(c.url).pathname}`)).toEqual(["DELETE /v1/customers/cus_9"]);

    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: { code: "resource_missing" } }), { status: 404 }));
    const b = await setup();
    b.raw.prepare("INSERT INTO billing_accounts (parent_id, stripe_customer_id, created_at, updated_at) VALUES (?, 'cus_gone', 1, 1)").run(b.parentId);
    expect((await b.call("/api/me", { confirm: "delete" }, "DELETE")).status).toBe(200);

    vi.stubGlobal("fetch", async () => new Response("{}", { status: 500 }));
    const c = await setup();
    c.raw.prepare("INSERT INTO billing_accounts (parent_id, stripe_customer_id, created_at, updated_at) VALUES (?, 'cus_x', 1, 1)").run(c.parentId);
    expect((await c.call("/api/me", { confirm: "delete" }, "DELETE")).status).toBe(502);
    expect(c.count("parents")).toBe(1);
  });

  it("account deletion stops (502) if Stripe can't cancel the subscription", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 500 }));
    const { call, raw, parentId, count } = await setup();
    raw.prepare("INSERT INTO billing_accounts (parent_id, stripe_customer_id, stripe_subscription_id, sub_status, created_at, updated_at) VALUES (?, 'cus_1', 'sub_1', 'trialing', 1, 1)").run(parentId);
    expect((await call("/api/me", { confirm: "delete" }, "DELETE")).status).toBe(502);
    expect(count("parents")).toBe(1);
  });

  it("encodes nested params the way Stripe expects", () => {
    expect(encodeForm({ a: { b: [{ c: 1 }, "x"] }, n: null, t: true }).toString()).toBe("a%5Bb%5D%5B0%5D%5Bc%5D=1&a%5Bb%5D%5B1%5D=x&t=true");
  });
});

describe("free-access codes", () => {
  async function addCode(raw: ReturnType<typeof fakeEnv>["raw"], code: string, o: { kind?: string; days?: number | null; max?: number; expires?: number | null; disabled?: number } = {}) {
    const id = crypto.randomUUID();
    raw
      .prepare("INSERT INTO access_codes (id, code_hash, kind, days, max_redemptions, expires_at, disabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1)")
      .run(id, await hashAccessCode(normaliseAccessCode(code)!), o.kind ?? "free_forever", o.days ?? null, o.max ?? 1, o.expires ?? null, o.disabled ?? 0);
    return id;
  }

  it("redeems a free-forever code (case/dash-insensitive) and the entitlement becomes free", async () => {
    const { call, raw } = await setup();
    await addCode(raw, "ABCD-EFGH-JKMN");
    const res = await call("/api/billing/redeem", { code: " abcd efgh-jkmn " });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { entitlement: unknown }).entitlement).toMatchObject({ status: "free", source: "code", accessUntil: null });
    expect((await call("/api/billing/redeem", { code: "ABCDEFGHJKMN" })).status).toBe(409); // same parent twice
  });

  it("enforces max redemptions, expiry and disabled codes", async () => {
    const a = await setup();
    const b = await setup();
    // two separate databases: put the same code in each to test limits per database
    await addCode(a.raw, "LIMITED1", { max: 1 });
    expect((await a.call("/api/billing/redeem", { code: "LIMITED1" })).status).toBe(200);
    const second = await setupOn(a);
    expect((await second("/api/billing/redeem", { code: "LIMITED1" })).status).toBe(410);
    await addCode(b.raw, "EXPIRED1", { expires: Date.now() - 1000 });
    expect((await b.call("/api/billing/redeem", { code: "EXPIRED1" })).status).toBe(410);
    await addCode(b.raw, "DISABLED1", { disabled: 1 });
    expect((await b.call("/api/billing/redeem", { code: "DISABLED1" })).status).toBe(410);
    expect((await b.call("/api/billing/redeem", { code: "NOPE-NOPE" })).status).toBe(400);
    expect((await b.call("/api/billing/redeem", { code: "x" })).status).toBe(400);
    expect(a.raw.prepare("SELECT redemptions FROM access_codes").get()).toEqual({ redemptions: 1 });
  });

  it("free_days codes stack on an unexpired grant; blocked while a subscription is live", async () => {
    const { call, raw, parentId } = await setup();
    await addCode(raw, "DAYS-30-A", { kind: "free_days", days: 30, max: 5 });
    await addCode(raw, "DAYS-30-B", { kind: "free_days", days: 30, max: 5 });
    await call("/api/billing/redeem", { code: "DAYS30A" });
    const r = (await (await call("/api/billing/redeem", { code: "DAYS30B" })).json()) as { entitlement: { endsAt: number } };
    expect(Math.abs(r.entitlement.endsAt - (Date.now() + 60 * DAY_MS))).toBeLessThan(5000);
    await addCode(raw, "AFTERSUB1");
    raw.prepare("UPDATE billing_accounts SET stripe_customer_id = 'cus_1', stripe_subscription_id = 'sub_1', sub_status = 'active' WHERE parent_id = ?").run(parentId);
    expect((await call("/api/billing/redeem", { code: "AFTERSUB1" })).status).toBe(409);
  });

  it("rate-limits redemption attempts per parent", async () => {
    const { call } = await setup();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push((await call("/api/billing/redeem", { code: `WRONG${i}XX` })).status);
    expect(statuses.slice(0, 10).every((s) => s === 400)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});

/** A second signed-in parent on the same database as `s`. */
async function setupOn(s: Awaited<ReturnType<typeof setup>>) {
  const parentId = crypto.randomUUID();
  s.raw.prepare("INSERT INTO parents (id, email, consent_version, consented_at, created_at, digest_opt_in) VALUES (?, ?, 'v', 1, ?, 0)").run(parentId, `${parentId}@example.com`, Date.now());
  const cookie = (await createSession(s.env, new URL(ORIGIN), parentId)).split(";")[0]!;
  return (path: string, body: unknown) => handleApi(new Request(`${ORIGIN}${path}`, { method: "POST", headers: { cookie, origin: ORIGIN, "content-type": "application/json" }, body: JSON.stringify(body) }), s.env);
}
