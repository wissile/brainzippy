# Deploying BrainZippy (owner guide)

The code is on GitHub (`wissile/brainzippy`). Two GitHub Actions workflows handle releases:
- **CI** runs on every push and pull request: typecheck, unit tests, and browser tests (desktop + phone).
- **Deploy**:
  - **staging** deploys automatically after each push to `main`, once Cloudflare secrets exist.
  - **production** deploys only when you start it by hand: *Actions → Deploy → Run workflow → production*. It sits behind an approval you control.

Nothing goes live on brainzippy.com without your approval.

Costs while you have no customers: **$0** on Cloudflare Workers Free (D1 included), Resend free tier and Stripe (no monthly fee; Stripe charges a fee per successful payment). Move to Workers Paid ($5/month) when you start taking payments; `docs/DATABASE.md` explains why.

---

## 1. Cloudflare (about 15 minutes)

1. Create a Cloudflare account and add **brainzippy.com** as a site: change the nameservers at your registrar to the two Cloudflare gives you. Wait until the zone shows **Active**.
2. **Account ID:** go to the dashboard, open *Workers & Pages*, and copy the Account ID from the right sidebar.
3. **API token:** go to *My Profile → API Tokens → Create Token*.
   - Start from the template **"Edit Cloudflare Workers"**.
   - Add the permissions **Account → D1 → Edit**, plus **Zone → Workers Routes → Edit** for brainzippy.com.
   - Copy the token. You will not see it again.
4. **Create the two databases.** From a computer with the project checked out:
   ```bash
   npx wrangler login
   npx wrangler d1 create brainzippy-db-staging
   npx wrangler d1 create brainzippy-db
   ```
   Each command prints a `database_id`. Paste them into `wrangler.jsonc`, replacing the placeholder zeros:
   - the `staging` entry ends in `…0001`;
   - the `production` entry ends in `…0002`.

   Then commit and push. (Or send me the two IDs and I'll do it.)
5. **www redirect:** go to *Rules → Redirect Rules → Create*: `www.brainzippy.com/*` → `https://brainzippy.com/${1}`, status 301, preserve query string. Add a proxied DNS record for `www` (e.g. `AAAA www 100::`) so the rule can run.

## 2. GitHub (about 5 minutes)

In the repo, go to *Settings → Secrets and variables → Actions*:
- **Secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (from step 1).
- **Variable (optional):** `STAGING_URL`, the staging address shown after the first deploy, e.g. `https://brainzippy-staging.<your-subdomain>.workers.dev`. It's used for a smoke test.

Then go to *Settings → Environments*:
- Create **production** and tick **Required reviewers → you**. This is the approval step before anything reaches brainzippy.com.
- Create **staging** (no reviewers needed).

## 3. Worker secrets (per environment)

Set these once for staging and once for production. Run each command and paste the value when asked:
```bash
npx wrangler secret put SIGNING_SECRET      --env staging   # any long random string: openssl rand -base64 48
npx wrangler secret put RESEND_API_KEY      --env staging   # step 4
npx wrangler secret put STRIPE_SECRET_KEY   --env staging   # step 5 (test-mode key on staging!)
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env staging # step 5
npx wrangler secret put VAPID_PRIVATE_KEY   --env staging   # step 6
# …then the same with --env production (live Stripe keys only on production)
```

Non-secret settings live in `wrangler.jsonc` under each environment's `vars`:
- `APP_ORIGIN`: for staging, set the workers.dev URL.
- `EMAIL_FROM`
- `STRIPE_PRICE_ID`
- `VAPID_PUBLIC_KEY`

### Which environment a deploy uses (and why the top level is production-safe)

- The Vite plugin picks the environment **at build time** from `CLOUDFLARE_ENV` and writes a flattened `dist/brainzippy/wrangler.json`; `wrangler deploy` then deploys exactly that ([Vite plugin: Cloudflare environments](https://developers.cloudflare.com/workers/vite-plugin/reference/cloudflare-environments/)). The workflows always set `CLOUDFLARE_ENV=staging` or `production`.
- **Unknown name → hard error.** Verified 2026-11-18 against the pinned wrangler 4.163.0 (the config loader used by both wrangler and the Vite plugin): `CLOUDFLARE_ENV=nope` (or `--env nope`) fails with `No environment found in configuration with name "nope"` because `wrangler.jsonc` defines `env` sections. (Wrangler only downgrades this to a warning when a config has no `env` sections at all.) The official docs ([system environment variables](https://developers.cloudflare.com/workers/wrangler/system-environment-variables/)) don't describe this case, so re-check after upgrading wrangler.
- **Unset or empty → silent fallback to the top level.** `CLOUDFLARE_ENV=""` or a missing variable builds the top-level config (Worker name `brainzippy`, no custom domain, placeholder D1). That is why the top level is production-safe: `APP_ENV` is `"production"` and `FRIENDS_ENABLED` is `"false"` there, so a mistaken fallback can't switch on development behaviour or unreviewed features.
- **Development only comes from `.dev.vars`** (gitignored; `cp .dev.vars.example .dev.vars`), which `npm run dev` and `vite preview` read. The Worker also refuses development behaviour (on-screen magic links, dev signing secret, fake Stripe, per-IP rate-limit bypass) unless the request host is `localhost` or `127.0.0.1` (`worker/lib/config.ts`), so even a misconfigured deploy can't expose it on a real host. CI copies the example before the browser tests. `wrangler deploy` never reads `.dev.vars`.

## 4. Resend (parent emails)

1. Create a Resend account and add the domain **brainzippy.com**.
2. Resend shows DNS records (SPF/DKIM, and optionally DMARC). Add them in Cloudflare DNS and wait for **Verified**.
3. Create an API key with *Sending access* and set it as `RESEND_API_KEY` (step 3).

Until this is done, sign-in links are only printed in the local development console. Staging and production refuse to pretend they sent email.

## 5. Stripe (payments)

Follow `docs/BILLING.md`. Short version:
1. Create the product **BrainZippy** with a recurring price of **$6.99/month**, and put its price ID (`price_…`) in `STRIPE_PRICE_ID`.
2. Configure the Customer Portal: cancel at period end, no cancellation survey.
3. Add a webhook endpoint `https://brainzippy.com/api/billing/webhook` (staging: your workers.dev URL) with the events listed in `docs/BILLING.md`. Copy its signing secret to `STRIPE_WEBHOOK_SECRET`.
4. Use **test mode** keys on staging. Switch production to live keys only after a full test.
5. Recommended: enable Stripe Tax.

Free-access codes for schools and promotions: `node scripts/access-code.mjs --help`.

## 6. Daily reminders (web push)

```bash
node scripts/gen-vapid.mjs
```
This prints a key pair:
- Put the **public** key in `VAPID_PUBLIC_KEY` (`wrangler.jsonc`, per environment).
- Set the **private** key as the `VAPID_PRIVATE_KEY` secret.

Leaving the public key empty keeps reminders switched off.

## 7. First deploy

1. Push to `main`, or run *Actions → Deploy → staging*. The workflow applies database migrations, deploys, and smoke-tests `/api/health`.
2. Try staging end to end:
   - landing page → play → sign-in email;
   - Stripe test checkout with card `4242 4242 4242 4242`;
   - reminders.
3. When you're happy, run *Actions → Deploy → production* and approve it. The workflow migrates the production database, deploys, creates the brainzippy.com custom domain on first deploy, and checks `https://brainzippy.com/api/health`.

## Before real customers (not code)

- Have a lawyer review `docs/legal/*` (privacy policy, terms, COPPA checklist). These are drafts and not legal advice.
- Decide the refund policy (placeholder in the terms) and how long to keep consent records.
- Register a support email address and add it to the privacy policy.
