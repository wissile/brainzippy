# Billing (Stripe) — how it works and how to set it up

Owner's model: **14 days of free play** (from the first game on a device, or the account's creation, whichever is earlier once a parent signs in on that device) → a grown-up adds a card → **14 more free days** (Stripe trial) → **$6.99/month** until cancelled. **Free-access codes** bypass payment entirely; **Stripe promotion codes** give discounts inside Checkout.

## How it fits together

| Piece | Where |
|---|---|
| Entitlement state machine (pure, shared by Worker and client) | `src/billing/model.ts` |
| D1 tables: `billing_accounts`, `stripe_events`, `access_codes`, `access_code_redemptions`; `parents.trial_started_at` | `migrations/0005_billing.sql` |
| Stripe REST client (fetch, pinned API version), webhook signature check | `worker/lib/stripe.ts` |
| Webhook processing (exactly-once, out-of-order guard) | `worker/lib/stripeEvents.ts` |
| Development-only fake Stripe (no network) | `worker/lib/stripeFake.ts` |
| Routes `/api/billing/{status,checkout,portal,redeem,webhook}` | `worker/routes/billing.ts` |
| Server entitlement + trial merge + deletion/export hooks | `worker/lib/entitlements.ts` |
| Child-facing gate ("ask a grown-up", no prices) | `src/billing/PlayGate.tsx` |
| Paywall `/plan` (behind the parent gate), billing card on `/parents` | `src/billing/PlanScreen.tsx`, `src/billing/ParentBilling.tsx` |
| Device storage + offline cache | `src/billing/client.ts`, `src/account/useEntitlement.ts` |
| Public `/pricing` page | `src/site/pages/pricing.tsx` |
| Owner CLI for free-access codes | `scripts/access-code.mjs` |

### Entitlement rules (tested in `tests/unit/billing-model.test.ts`)
Precedence: (1) live Stripe subscription — `trialing` → **trial**, `active` → **active**, `past_due` → **active with a payment issue for 7 days from the first failed payment**; (2) valid free-access code → **free**; (3) subscription needing payment (`past_due` after grace, `unpaid`, `paused`, `incomplete`) → **needs-payment**; (4) no-card free period, 14 days from the earliest of account creation and first play → **trial**, else **needs-payment**. `canceled`/`incomplete_expired` subscriptions grant nothing.

- **Remaining free days are kept:** a card trial ends 14 days after the later of "now" and the end of the free period (`subscription_data.trial_end`). One card trial per family (`trial_used`); a returning family is charged at Checkout.
- **Link-time merge:** each signed-in device reports its first-play time; the account's start can only move earlier.
- **Offline:** the device caches the last server answer. Paid/code access keeps working until the server's end date **plus 7 days**, so a renewal the device hasn't heard about never locks a paying child out. The no-card free period gets no grace.

### Enforcement model (honest user) — decision
Play is gated **on the device**. A determined adult can clear site data to restart a device's free period or edit local storage; we accept this for a children's learning product (no DRM, no fingerprinting, no tracking — which would conflict with our privacy rules). There are **no paid-only API features today**. Any future one must check `getEntitlement` server-side before acting. The PlayGate never interrupts a round in progress: a refresh can unlock immediately but only locks at the next game open.

### Children never see prices
At the end of the free period the child sees their own monster asleep and a "Grown-up" button (spoken + captioned line `paywall.askGrownUp`). Prices, cards and codes appear only after the parent gate (`/plan`, `/parents`).

### Webhooks
`POST /api/billing/webhook` (router `crossOrigin: true`; the signature is the authentication). We verify `Stripe-Signature` ourselves: HMAC-SHA256 of `${t}.${rawBody}` with the endpoint secret, constant-time compared with every `v1`, and `t` within ±300 s. Event ids are inserted in the same D1 batch as the state change (plain `INSERT` on the primary key), so each event applies exactly once; duplicates get `200 {duplicate:true}`. For `customer.subscription.*` events the Worker **re-fetches the subscription** (`GET /v1/subscriptions/:id`) and derives state from Stripe's current object, so same-second reordering and a late `subscription.created` for an old subscription can't apply stale data; events older than the last applied one (`sub_event_at`) are still skipped; a subscription Stripe doesn't know (404) is ignored except `deleted` (applied as canceled); if Stripe is unreachable the webhook fails (500) and Stripe retries. The dev fake keeps the subscriptions its pages create so it answers the same call. Ids are purged after 30 days by the daily purge cron (`worker/jobs/purge.ts`). Events handled: `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.payment_failed`, `invoice.paid`. Unknown types get `200 {ignored:true}`.

Stripe API version is pinned in `worker/lib/stripe.ts` (`STRIPE_API_VERSION`). The parser reads `current_period_end` from subscription items (API ≥ 2025-03-31) and falls back to the old top-level field.

### Why no stripe-node SDK — decision
stripe-node does run on Workers (`Stripe.createFetchHttpClient()` + `Stripe.createSubtleCryptoProvider()` + `constructEventAsync`), but we call three endpoints. A ~100-line fetch client keeps the Worker small, avoids a dependency, and lets tests point `STRIPE_API_BASE` at a stub.

### Account deletion and export
Deleting a parent account first cancels any live Stripe subscription **immediately** (`DELETE /v1/subscriptions/:id`); if Stripe can't be reached, deletion stops with "billing_cancel_failed" so a deleted account is never charged again. Billing rows are deleted in the same batch. `GET /api/me/export` includes a `billing` section (status, dates, consent time; no card data — Stripe holds that).

## Owner setup (do these once per environment; start in **test mode**)

1. **Stripe account**: create it, complete business details, set the public business name and support email (Settings → Public details). Add your Terms URL there once the terms are final.
2. **Product and price**: Product catalogue → add product "BrainZippy Family" → recurring price **$6.99 USD / month** → copy the price id `price_…`.
3. **Customer Portal** (Settings → Billing → Customer portal): enable *Cancel subscriptions* (cancel **at end of billing period**; keep the cancellation-reason survey optional or off so cancel stays two clicks), *Update payment methods*, *View invoice history*. Turn off plan switching (one plan). Set the default return URL to `https://brainzippy.com/parents`.
4. **Billing emails** (Settings → Billing → Subscriptions and emails): turn on receipts, failed-payment emails and card-expiry emails; turn on **trial-ending reminders** (good practice even though our 14-day trial is under the 31 days that California's reminder rule targets); set Smart Retries to retry for ~1 week, then **cancel** the subscription if all retries fail.
5. **Webhook endpoint** (Developers → Webhooks → Add endpoint): URL `https://brainzippy.com/api/billing/webhook` (staging: its own host), API version `2026-10-28.endive` (same as `STRIPE_API_VERSION`), events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid`. Copy the signing secret `whsec_…`.
6. **Secrets and vars** (never in code):
   ```
   npx wrangler secret put STRIPE_SECRET_KEY        # sk_test_… first, sk_live_… at launch (or a restricted key: Checkout Sessions write, Customer Portal write, Subscriptions write)
   npx wrangler secret put STRIPE_WEBHOOK_SECRET    # whsec_…
   # wrangler.jsonc → vars: "STRIPE_PRICE_ID": "price_…"   (staging: under env.staging)
   ```
   Add `--env staging` for staging. Billing stays off (`503 billing_not_configured`) until both the key and the price id are set.
7. **Migration**: `npm run db:migrate:remote` (applies `0005_billing.sql`). Production: only with the owner's approval.
8. **Test in test mode**: card `4242 4242 4242 4242`, any future date/CVC. Check: day-15 scene → parent gate → Checkout → back on `/parents` showing "Free trial…" → Manage billing → Cancel plan. Use Stripe **test clocks** to advance through trial end and a failed renewal (card `4000 0000 0000 0341` attaches but fails on charge).
9. **Stripe Tax (recommended)**: US states increasingly tax digital subscriptions. Register where you have nexus in Stripe Tax, set the product tax code (e.g. "Software as a service — personal use"), then set var `STRIPE_AUTOMATIC_TAX` to `"1"`; Checkout will collect the address it needs and add tax. Prices are shown "plus any applicable tax".
10. **Go live**: switch to live keys, recreate the product/price, portal settings and webhook in live mode, update the secrets and `STRIPE_PRICE_ID`.

### Local development
`npm run dev` with **no** `STRIPE_SECRET_KEY` uses the built-in fake: "Checkout" and "Manage billing" open local test pages under `/api/billing/dev/*` that send correctly signed webhooks to the real handler. The fake only runs when `APP_ENV=development` **and** the request is for `localhost`/`127.0.0.1`. To try real Stripe test mode locally, put `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` in `.dev.vars` (gitignored), set `STRIPE_PRICE_ID`, and forward webhooks with `stripe listen --forward-to localhost:5173/api/billing/webhook`.

## Fees (check Stripe's pricing page for your country before launch)
US list pricing at the time of writing: card payments **2.9% + 30¢** per successful charge, and **Stripe Billing** for recurring subscriptions adds a percentage of billing volume (historically **0.7%** pay-as-you-go). On $6.99 that is roughly **$0.53–0.55 per charge**, about $6.45 net before tax and Stripe Tax fees (Stripe Tax is charged per transaction where you're registered). Trials cost nothing until the first charge. These numbers are not verified by this document; confirm on stripe.com/pricing.

## Free-access codes (no card, no Stripe)
Created only from the command line; the code is printed **once** and only its SHA-256 is stored. Parents redeem on `/parents` → Plan and billing → "I have a code" (signed in; 10 tries/hour per parent, 30/hour per IP). A family with a live paid plan must cancel it first (the UI says so).
```
node scripts/access-code.mjs create --kind free_forever --note "Grandma" --prod
node scripts/access-code.mjs create --kind free_days --days 30 --max 200 --expires 2027-06-30 --note "School pilot" --prod
node scripts/access-code.mjs list --prod
node scripts/access-code.mjs disable <id> --prod        # stops new redemptions; existing families keep access
```
Use `--local` for the dev database, `--staging` for staging, `--dry-run` to print the wrangler command. `free_days` codes add days to any unexpired code time.

## Promotions (discounts)
Discounts are Stripe **promotion codes** typed on the Checkout page (`allow_promotion_codes: true`). Create a coupon (e.g. 50% off for 3 months, or $6.99 off once) under Product catalogue → Coupons, then add a customer-facing promotion code (e.g. `LAUNCH50`) with optional limits (first-time customers only, max redemptions, expiry). No code changes needed.

## US auto-renewal rules (engineering summary, not legal advice — counsel must review)
- **FTC "click-to-cancel" rule**: vacated by the Eighth Circuit in July 2025; the FTC restarted rulemaking (ANPRM published March 2026, comments closed April 13, 2026). **ROSCA still applies**: clearly disclose all material terms before taking billing information, get express informed consent, and provide a simple way to stop recurring charges.
- **California ARL (amended by AB 2863, effective July 1, 2025)**: covers free-to-paid conversions; requires express affirmative consent to the renewal terms, keeping proof of that consent (at least 3 years, or 1 year after the subscription ends, whichever is longer), cancellation through the same channel used to sign up (online), and annual reminders with the renewal frequency and amount.
- What we do: price and renewal terms on `/plan` and `/pricing` before any card entry; an **unticked** consent box whose wording and version (`RENEWAL_TERMS_VERSION`) and time we store (`billing_accounts.renewal_consent_*`); the same terms next to Stripe's Subscribe button; cancel online in two clicks (`Cancel plan` → portal confirm); no countdowns or urgency on the paywall.
- **Open for counsel**: whether our consent record (deleted with the account) plus Stripe's own records satisfy the retention rule; the annual reminder (check whether Stripe's upcoming-renewal emails can cover a monthly plan; otherwise add our own yearly email to parents); refund policy; EU/UK 14-day withdrawal right if we sell there; state-specific requirements beyond California.

Sources (read 2026-11-18): Stripe API reference — Create a Checkout Session (`payment_method_collection` defaults to `always`; `allow_promotion_codes`; `subscription_data`), Subscription object (statuses; `current_period_end` on items); Gibson Dunn, "FTC Restarts Negative Option Rulemaking After Eighth Circuit Vacatur" (2026); Barnes & Thornburg, "California Expands Automatic Renewal Law" (2025); Cloudflare blog / community notes on stripe-node in Workers.
