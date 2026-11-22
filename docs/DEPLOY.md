# Deploying BrainZippy (owner guide)

The code is on GitHub (`wissile/brainzippy`). Two GitHub Actions workflows handle releases:
- **CI** runs on every push and pull request: typecheck, unit tests, and browser tests (desktop + phone).
- **Deploy**:
  - **staging** deploys automatically after each push to `main`, once Cloudflare secrets exist.
  - **production** deploys only when you start it by hand: *Actions → Deploy → Run workflow → production*. It sits behind an approval you control.

Nothing goes live on brainzippy.com without your approval.

Production launches as **guest play only** (decision D-030): every game works, progress stays on the device, and nothing that collects personal data or takes money is switched on. Parent accounts, billing and friends are built and tested but stay off until a lawyer has reviewed them ([section 4](#4-turning-features-on-later)).

Costs for a guest-only launch: **$0** on Cloudflare Workers Free (D1 included). Move to Workers Paid ($5/month) when you start taking payments; `docs/DATABASE.md` explains why.

---

## Shortest path to go live (guest play only, about 20 minutes)

You need: a Cloudflare account with **brainzippy.com active**, **one API token**, and **two GitHub secrets**. No database to create by hand, no IDs to paste, no Worker secrets.

1. **Cloudflare zone.** Add **brainzippy.com** as a site in Cloudflare and change the nameservers at your registrar to the two Cloudflare gives you. Wait until the zone shows **Active**.
   - Delete any existing `CNAME` record for `brainzippy.com` itself: Cloudflare can't attach a Worker custom domain to a hostname that has one ([Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)).
2. **Account ID.** In the dashboard, open *Workers & Pages* and copy the **Account ID** from the right sidebar.
3. **API token.** Go to *My Profile → API Tokens → Create Token*.
   - Start from the template **"Edit Cloudflare Workers"**.
   - Make sure it also has **Account → D1 → Edit** (the first deploy creates the database) and **Zone → Workers Routes → Edit** for brainzippy.com (the custom domain; [Workers authorization](https://developers.cloudflare.com/workers/authorization/workers/)).
   - Copy the token. You will not see it again.
4. **GitHub.** In the repo, go to *Settings → Secrets and variables → Actions → New repository secret*:
   - `CLOUDFLARE_API_TOKEN` (step 3)
   - `CLOUDFLARE_ACCOUNT_ID` (step 2)

   Then *Settings → Environments*: create **production** and tick **Required reviewers → you**. Create **staging** too (no reviewers).
5. **Deploy.** Go to *Actions → Deploy → Run workflow*, choose **production**, leave **allow_features** unticked, then approve the run. The workflow:
   1. builds the site and Worker with the production config;
   2. **stops** unless `ACCOUNTS_ENABLED`, `BILLING_ENABLED` and `FRIENDS_ENABLED` are all `"false"` for production, both in `wrangler.jsonc` and in the built config (`scripts/check-guest-flags.mjs`; see [section 4](#4-turning-features-on-later) for the override);
   3. runs `wrangler deploy`, which on the very first run **creates the D1 database `brainzippy-db`** and the **brainzippy.com custom domain** (DNS record and certificate);
   4. applies the database migrations;
   5. checks `https://brainzippy.com/api/health` and that the live feature flags are all off.
6. **Optional, recommended:**
   - **www redirect:** *Rules → Redirect Rules → Create*: `www.brainzippy.com/*` → `https://brainzippy.com/${1}`, status 301, preserve query string. Add a proxied DNS record for `www` (for example `AAAA www 100::`) so the rule can run.
   - **`SIGNING_SECRET`:** not needed for guest play. In guest-only production no route rate-limits, so nothing (not even a hashed IP address) is stored. It becomes **required** before you switch on accounts, reminders or guest sync: without it, every route that must rate-limit answers 503 instead of storing an unkeyed hash ([section 4](#4-turning-features-on-later)).
   - **Support inbox:** make sure **hello@brainzippy.com** receives mail. It is the contact address on the site, in the grown-ups page and in the legal drafts. Cloudflare Email Routing can forward it to your own inbox for free.

Note that once the two secrets exist, every push to `main` also deploys **staging** (`brainzippy-staging.<your-subdomain>.workers.dev`, its own database `brainzippy-db-staging`). Staging has every feature flag on so you can try accounts and billing, but without the Resend, Stripe and signing secrets, sign-up and checkout refuse ("not available yet" or 503), so nobody can leave personal data there.

**Protect staging (recommended).** Staging is public on its workers.dev address and has every flag on, so once you add secrets there, anyone who finds the URL could sign up or try codes. Put it behind **Cloudflare Access**: *Workers & Pages → brainzippy-staging → Access → Protect this Worker behind Access → All traffic*, then choose who may sign in (your Cloudflare account or your email domain) and *Apply Access*. This covers the workers.dev hostname and preview URLs, and needs Zero Trust set up on the account ([Cloudflare Access for Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/); the page doesn't cover plan limits, so check them in the Zero Trust dashboard). With Access on, the CI smoke test (`STAGING_URL`) and Stripe's test webhooks can't reach staging: leave `STAGING_URL` unset, and test webhooks with the Stripe CLI. If you keep staging open instead, accept the risk: keep real secrets off it, use only Stripe **test** keys and synthetic data, and never share the URL.

---

## 1. Which features are on

| Feature | Flag (`wrangler.jsonc` vars) | Production now | Staging / local dev |
|---|---|---|---|
| Parent accounts: sign-in/sign-up by magic link, onboarding email step, `/api/parent-signup`, children, sync, parent dashboard, daily digest email | `ACCOUNTS_ENABLED` | `"false"` | `"true"` |
| Billing: plan page, Stripe Checkout and portal, free-access codes, webhook, the day-15 paywall and trial clock | `BILLING_ENABLED` (needs accounts) | `"false"` | `"true"` |
| Friends, leaderboard, challenges | `FRIENDS_ENABLED` (needs accounts) | `"false"` | `"true"` |
| Daily reminders (web push) | `VAPID_PUBLIC_KEY` non-empty **and** the `VAPID_PRIVATE_KEY` secret set | off (no keys) | off (no keys) |

A flag is on only when its value is exactly `"true"`. When a flag is off:
- the Worker answers **404** on its routes (indistinguishable from a route that doesn't exist), before any rate limiting, and its cron job does nothing. With accounts off this includes the digest unsubscribe link (`/api/unsubscribe`); with reminders off, every `/api/push/*` route;
- the app reads `GET /api/config` (`{accounts, billing, friends, push}`, cached for 5 minutes) and hides everything that belongs to the feature: the reminders section and any mention of reminders disappear, the onboarding grown-up email step is skipped, `/parents` says "Grown-up accounts are coming soon. Progress is saved on this device.", there is no paywall, `/plan` has nothing to buy and grown-up copy says "Free while we're in early access";
- the public site is built without the `/pricing` page or any price, and its privacy notice (`/privacy`) describes only features that are on (it reads the flags of the environment being built).

Always on: guest play, offline play, local progress, the daily game limit, the early-access privacy notice and the nightly retention purge.

**Rate limiting needs `SIGNING_SECRET`.** Rate-limit keys are HMACs of the IP address or email; there is no unkeyed fallback. Outside local development, a route that must rate-limit (accounts, billing, friends, reminders, guest sync) answers **503** without the secret and stores nothing.

## 2. Databases (automatic provisioning)

`wrangler.jsonc` names the databases (`brainzippy-db`, `brainzippy-db-staging`) but has **no `database_id`** for staging or production. Wrangler 4.x provisions D1, KV and R2 bindings automatically on `wrangler deploy` ([changelog, 2025-10-24](https://developers.cloudflare.com/changelog/2025-10-24-automatic-resource-provisioning/)). Checked against the pinned wrangler 4.163.0 source:

- **First deploy:** no database with that name exists, so wrangler creates one named exactly `database_name` and binds it.
- **Later deploys reuse it.** Wrangler first keeps the database already bound to the deployed Worker (same binding name and database name); otherwise it looks the database up **by name**. The docs say provisioned resources "will stay linked across future deploys even without adding the resource IDs to the config file".
- **Migrations** (`wrangler d1 migrations apply brainzippy-db --remote --env production`) also find the database by name through the API.
- **CI doesn't write the ID back** (wrangler only edits the config file in interactive runs).

**Should you paste the ID into `wrangler.jsonc` afterwards?** Not needed, and nothing breaks if you don't. Pasting it (from `npx wrangler d1 list`) pins the binding to that exact database, which protects against one mistake: renaming `database_name` would otherwise make the next deploy create a new, empty database. If you paste it, keep `database_name` unchanged. Database IDs are not secret, but this repo keeps them out on purpose.

The top-level `database_id` (all zeros) is only for local development (`--local` state). A deploy that accidentally fell back to the top level would fail on it, which is the safe outcome.

### Deploy order in the workflow

`build → migrate (only if the database already exists) → wrangler deploy (creates the database on the first run) → migrate → smoke test`.

The first migrate step means that on later deploys the schema is updated before the new code goes live. The second one applies everything to a brand-new database and is a no-op otherwise. Migrations must stay additive: compatible with the code that is live while they run. The smoke test (`scripts/ci-smoke.sh`) fails the run if `/api/health` doesn't answer, or if the live `/api/config` flags differ from the build's `wrangler.jsonc` flags.

## 3. Which environment a deploy uses (and why the top level is production-safe)

- The Vite plugin picks the environment **at build time** from `CLOUDFLARE_ENV` and writes a flattened `dist/brainzippy/wrangler.json`; `wrangler deploy` then deploys exactly that ([Vite plugin: Cloudflare environments](https://developers.cloudflare.com/workers/vite-plugin/reference/cloudflare-environments/)). The workflows always set `CLOUDFLARE_ENV=staging` or `production`. Verified 2026-11-22: `CLOUDFLARE_ENV=production npm run build && npx wrangler deploy --dry-run` accepts the config without a `database_id` and lists `env.DB (brainzippy-db)` with all three flags `"false"`.
- **Unknown name → hard error.** Verified 2026-11-18 against wrangler 4.163.0: `CLOUDFLARE_ENV=nope` fails with `No environment found in configuration with name "nope"`, because `wrangler.jsonc` defines `env` sections.
- **Unset or empty → silent fallback to the top level.** That is why the top level is production-safe: `APP_ENV` is `"production"` and every feature flag is `"false"` there, so a mistaken fallback can't switch on development behaviour or unreviewed features.
- **Development only comes from `.dev.vars`** (gitignored; `cp .dev.vars.example .dev.vars`), which `npm run dev` and `vite preview` read. The Worker also refuses development behaviour unless the request host is `localhost` or `127.0.0.1` (`worker/lib/config.ts`). `wrangler deploy` never reads `.dev.vars`, and the site prerender ignores it too.
- **See production locally:** `npm run e2e:launch` builds, overrides the three flags to `"false"` in the preview copy only (`scripts/preview-vars.mjs`), and runs the guest-launch browser checks.

## 4. Turning features on later

Each feature needs: **legal review → publish the final privacy policy in place of the early-access notice → secrets and settings → flip the flag → deploy**. Flip a flag by changing `"false"` to `"true"` under `env.production.vars` in `wrangler.jsonc`, then run *Deploy → production* **with `allow_features` ticked**: the deploy guard (`scripts/check-guest-flags.mjs`) fails any production deploy where `ACCOUNTS_ENABLED`, `BILLING_ENABLED` or `FRIENDS_ENABLED` is not `"false"` unless that box is ticked, so a flag can't go live by accident in an unrelated release. Tick it on every production deploy from then on. The post-deploy smoke test still checks that the live flags match the build. Open apps pick the change up within about five minutes (the `/api/config` cache).

### Parent accounts (`ACCOUNTS_ENABLED`)
1. **Legal:** a lawyer reviews and finalises `docs/legal/PRIVACY_POLICY_DRAFT.md`, `TERMS_DRAFT.md` and the consent method in `COPPA_CHECKLIST.md`. Publish the final privacy policy before switching on.
2. **Resend:** create an account, add the domain **brainzippy.com**, add the DNS records it shows (SPF/DKIM, optionally DMARC) in Cloudflare DNS, and wait for **Verified**. Create an API key with *Sending access*.
3. **Secrets:**
   ```bash
   npx wrangler secret put RESEND_API_KEY --env production
   npx wrangler secret put SIGNING_SECRET --env production   # if not set yet; openssl rand -base64 48
   ```
   `EMAIL_FROM` is already `BrainZippy <hello@brainzippy.com>`.
4. Set `ACCOUNTS_ENABLED` to `"true"` and deploy.

Don't switch accounts off again once real parents have accounts: while the flag is off, the parent area (including data export and account deletion) is unavailable to them.

### Billing (`BILLING_ENABLED`, needs accounts)
1. **Legal:** terms (refunds, renewal wording), auto-renewal rules and sales tax; see `docs/BILLING.md`.
2. **Stripe:** follow `docs/BILLING.md`. Short version:
   - create the product **BrainZippy** with a recurring price of **$6.99/month** and put its `price_…` ID in `STRIPE_PRICE_ID`;
   - configure the Customer Portal (cancel at period end, no survey);
   - add a webhook endpoint `https://brainzippy.com/api/billing/webhook` with the events listed in `docs/BILLING.md`;
   - try everything in **test mode** on staging first.
3. **Secrets:** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (`npx wrangler secret put … --env production`, live keys only on production).
4. Set `BILLING_ENABLED` to `"true"` and deploy. This also publishes the `/pricing` page and the price wording on the site (the next build picks it up).
   - Devices start their 14 free days when billing is switched on, not from their first visit: no trial clock runs while billing is off.
   - Move to Workers Paid first (`docs/DATABASE.md`).

Switching billing off again doesn't cancel anyone's Stripe subscription, and the webhook stops answering. Cancel subscriptions in Stripe first.

Free-access codes for schools and promotions: `node scripts/access-code.mjs --help`.

### Friends, leaderboard and challenges (`FRIENDS_ENABLED`, needs accounts)
1. **Legal:** a lawyer must answer in writing which verifiable parental consent method social features need (`docs/legal/COPPA_CHECKLIST.md`, question 1).
2. Set `FRIENDS_ENABLED` to `"true"` and deploy.

### Daily reminders (`VAPID_PUBLIC_KEY`)
```bash
node scripts/gen-vapid.mjs
```
This prints a key pair:
- Put the **public** key in `VAPID_PUBLIC_KEY` under `env.production.vars`.
- Set the **private** key as a secret: `npx wrangler secret put VAPID_PRIVATE_KEY --env production`.

`VAPID_SUBJECT` is already `mailto:hello@brainzippy.com`. Reminders need **both** keys (with only one, `/api/config` says `push: false` and `/api/push/*` answers 404) and **`SIGNING_SECRET`** (subscribe and unsubscribe are rate-limited per IP; without the secret they answer 503). Reminders need no account (they are per device, behind the grown-up check). The privacy notice describes them automatically once the public key is set, but have a lawyer confirm the wording (`docs/legal/PRIVACY_POLICY_DRAFT.md`, section 3) before switching them on.

### Staging

Staging gets the same secrets, with `--env staging` and Stripe **test** keys. Set `APP_ORIGIN` under `env.staging.vars` to the workers.dev URL, and the optional GitHub variable `STAGING_URL` to the same address for the smoke test.

## Before real customers (not code)

- Have a lawyer review `docs/legal/*` (privacy policy, terms, COPPA checklist). These are drafts and not legal advice.
- Decide the refund policy (placeholder in the terms) and how long to keep consent records.
- Company name and address in the legal drafts are still placeholders. The contact address is hello@brainzippy.com.
