# Privacy & Security

> Not legal advice. A qualified lawyer must review COPPA (US), GDPR/UK GDPR + Age Appropriate Design Code, and other applicable law **before** enabling accounts or collecting any personal information.

## Onboarding data (milestone 1.1)
| Data | Where | Sent to server? | Notes |
|---|---|---|---|
| Child's first name / nickname (optional, "Skip" offered) | localStorage `profile.kidName` | **Never** (e2e asserts no request contains it) | sanitised to letters, ≤16 chars |
| Monster design + monster name (typed by the child) | localStorage | Never (not even for signed-in accounts) | |
| Age band | localStorage | Never | |
| **Parent's** email + explicit consent | D1 `parent_signups` | Yes, behind a parent gate, optional ("Skip for now") | token stored only as SHA-256; link single-use; unverified rows purged after 7 days; resend cooldown 10 min |
**Why the email belongs to the parent, not the child:** collecting a child's (under 13) email or other online contact information requires verifiable parental consent under COPPA, and BrainZippy's master instructions require a parent-controlled process. Asking the parent directly, with consent, and keeping the child's name on the device is the data-minimising design. The API rejects any field other than `email` and `consent`.
**Email delivery:** Resend (owner decision 2026-11-17), via its REST API with the `RESEND_API_KEY` secret. In development without a key, links are logged to the console (link + subject, never the address) and shown on screen; other environments without a key return 503. `parent_signups` is superseded by `parents` (migration 0003): confirming the onboarding email creates a parent account.

## Milestone 1 data inventory
| Data | Where | Personal? | Purpose | Retention |
|---|---|---|---|---|
| Mute setting, coarse age band (e.g. "ages-3-5") | browser localStorage | no (the band also appears in the `/play/ages-3-5` URL path on navigation; coarse, low risk) | UX | until cleared |
| Stickers, rounds completed, per-skill tallies | localStorage | no | progress | until cleared |
| In-progress round snapshot | localStorage | no | refresh-safe resume | cleared at round end |
| ~~Random guest UUID + progress JSON~~ | D1 `guest_sessions` | — | **Client sync is OFF** (D-011): guest play sends nothing until a parent-controlled restore path exists, and since the 2026-11-18 security review the write endpoints (`POST /api/guest`, `PUT /api/guest/:id/progress`) answer 404 unless `GUEST_SYNC_ENABLED="true"` (then rate-limited per IP: 20 creates / 240 writes per hour). GET/DELETE remain so existing rows can be read or deleted | purge cron (180 days) remains for safety |
Not collected: names, emails, birthdates, photos, voice, location, contacts, device fingerprints, ad IDs. No cookies. No analytics or third-party scripts; fonts self-hosted. Request IP addresses are processed by Cloudflare for delivery but not stored by the app. Workers invocation logs (which would retain request URLs) are disabled in `wrangler.jsonc`.

## Parent accounts (Phase 1, migration 0003) — data inventory
| Data | Where | Personal? | Purpose | Retention |
|---|---|---|---|---|
| Parent email, consent version + time, created/last-login time, digest opt-in | D1 `parents` | **yes** (parent) | sign-in, consent record, digest | until the parent deletes the account (immediate hard delete) — inactive-account policy: lawyer to decide (proposed 24 months) |
| Magic-link token **hash**, email, purpose | D1 `auth_tokens` | yes (email) | single-use sign-in, 15-minute expiry | purged 1 day after expiry |
| Session id **hash**, parent id, expiry | D1 `sessions` (+ HttpOnly cookie) | pseudonymous | stay signed in, 30-day rolling | deleted at logout/expiry (daily purge) |
| Child profile: monster design, **public name** (pick-list combination; NULL = default derived from the profile id), age band (`ages-3-5`…) | D1 `children` | low (chosen nickname-like name, coarse age) | dashboard, friends | until the parent deletes the child or account |
| Child **nickname** | D1 `children.nickname` | yes (could be a real name) | parent's dashboard and emails only; **never shown to friends** | **NULL by default**; set only when the parent opts in; cleared when they opt out |
| Per-child settings (daily limit 3–10, sound, music) | D1 `children.settings_json` | no | parent controls | with the profile |
| Progress: worlds/levels/stars, stickers, per-skill tallies, last 200 rounds (time, game, level, counts, seconds) | D1 `children.progress_json` + device | no direct identifier | dashboard, points, streaks, digest | with the profile; history capped at 200 rounds |
| Friend invite code **hash** | D1 `friend_invites` | no | single-use invite, 7 days | purged on use/expiry |
| Friendship (two child ids + two approvals) | D1 `friendships` | no | friends-only leaderboard | until either parent removes it or deletes the child |
| Challenge (token **hash**, world, level, seed, score) + results (score) | D1 `challenges`, `challenge_results` | no | "beat my score" | 14 days, then purged |
| Rate-limit counters (keyed HMAC of IP or email, never raw) | D1 `rate_limits` | pseudonymous | abuse prevention | purged after 2 days |
| Device link (child id, cached settings), round history, active challenge | browser localStorage | no | local-first sync | until "Clear this device" / "Delete all progress on this device" |

What friends see: **public name (from fixed word lists, never the typed monster name), monster picture, weekly points** (and challenge scores). Never the nickname, email, age band, skills or history.
Not collected for accounts: child email, child password, birthdate, photo, voice, location, contacts, free text between users.

### Controls added with accounts
- Magic-link tokens: 256-bit random, SHA-256 stored, single use (atomic `UPDATE … WHERE used_at IS NULL … RETURNING`), 15-minute expiry. The emailed link opens a confirmation page; only its button (POST) consumes the token, so mail-scanner prefetches can't burn or use it.
- Sessions: `__Host-bz_sid` cookie, `HttpOnly; Secure; SameSite=Lax; Path=/`, 256-bit id, only the hash in D1, 30-day rolling expiry (refreshed at most daily), logout deletes the row. (Plain-http localhost only: `bz_sid` without `Secure`.)
- Origin check in the router for every POST/PUT/DELETE: a mismatched Origin is rejected; a missing Origin is rejected when a session cookie is present. Only the signed one-click unsubscribe POST is exempt (RFC 8058 senders post cross-origin; the HMAC signature authorises it).
- Rate limits (D1 fixed window): magic links 10/hour per IP and 3/15 min per email; verify 30/10 min per IP; invites 20/day per parent; invite lookups 20/hour per IP; challenges 30/day per parent; sync 600/hour per parent. IP limits are skipped in development (all requests are loopback).
- Sign-in for an unknown email answers exactly like a known one and sends nothing (no account enumeration). Children's ids are only reachable through the owning parent's session (404 otherwise).
- Strict validators shared by client and Worker (`src/account/schema.ts`): unknown keys rejected, ids/days pattern-checked, sizes capped (64 KB progress, 200 rounds, 16-char names). Parameterised SQL only.
- No PII in logs: email addresses are never logged; error logs replace ids in paths; invocation logs stay off.
- Tokens appear in URLs only in single-use or short-lived links: magic link (15 min, single use), legacy onboarding confirmation (single use, 7 days), invite (single use, 7 days), challenge (opaque, friends-only, 14 days), unsubscribe (HMAC signature, no session).
- Deletion: "Delete profile" and "Delete account" hard-delete rows explicitly (children, friendships, invites, challenges, results, sessions, tokens, legacy sign-ups) in one D1 batch. "Delete account" first cancels any live Stripe subscription, then deletes the Stripe Customer (`DELETE /v1/customers/:id`; saved cards go with it), and stops (502, nothing deleted, retry offered) if Stripe can't be reached. It also switches off daily reminders on the device where it runs; push subscriptions are per device and not linked to accounts, so other devices keep theirs until turned off there or purged after 180 days without a refresh. Copies persist only in D1 Time Travel (7 days on Free, 30 on Paid) — the policy says "up to 30 days".
- Export: `GET /api/me/export` returns all account data as JSON (friend entries show only the friend's public name).
- Daily digest: opt-in per parent (off by default), parents only, only on days a child played, no images, text twin, `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, unsubscribe page needs no sign-in. Not sent at all without `SIGNING_SECRET`.
- Entitlements (`worker/lib/entitlements.ts`) are Stripe-backed since migration 0005; see "Billing" below. Billing UI stays behind the parent gate.

### Billing (migration 0005) — data inventory and controls
| Data | Where | Personal? | Purpose | Retention |
|---|---|---|---|---|
| Stripe customer id, subscription id, status, trial/period/cancel dates, failed-payment time | D1 `billing_accounts` | pseudonymous (linked to the parent) | entitlement | deleted with the account |
| Renewal-consent time + wording version | D1 `billing_accounts` | yes (parent) | proof of consent to auto-renewal (California ARL) | deleted with the account — **counsel: retention may need to be longer** |
| Free-access code **hash**, kind, limits, owner note; redemptions (code id, parent id, time) | D1 `access_codes`, `access_code_redemptions` | redemptions pseudonymous | free access | codes until disabled; redemptions deleted with the account |
| Processed webhook event ids | D1 `stripe_events` | no | idempotency | 30 days |
| Device first-play time; last entitlement answer | browser localStorage `bz.billing` | no | 14-day free period, offline play | until site data is cleared (kept by "delete progress on this device" so the free period isn't restarted by it) |
| Parent email, card, billing address | **Stripe** (processor) | yes (parent) | payment, receipts, tax | Customer object deleted on account deletion. **Stripe keeps its own records of past charges, invoices and disputes after a Customer is deleted** (legal, tax and anti-fraud obligations; Stripe's privacy policy), which we can't delete; we never see card numbers |

Controls: webhook signature verified (HMAC-SHA256, ±5 min, constant-time), exactly-once processing; Checkout/portal URLs come only from Stripe responses; only the parent's email and our parent id go to Stripe (never child data); free-access codes always generated (12 random characters, ≈59 bits; custom codes removed), hashed, single claim per family, rate-limited (10/h per parent, 30/h per IP); no admin HTTP endpoint (owner CLI via wrangler); the development fake Stripe runs only with `APP_ENV=development`, no secret key, and a localhost request; account deletion cancels the subscription before deleting rows. Sub-processor to add to the privacy policy and DPA review: **Stripe**.

### Daily reminders (Web Push, migration 0004) — data inventory and controls
| Data | Where | Personal? | Purpose | Retention |
|---|---|---|---|---|
| Random device id (UUID minted on the device) | D1 `push_subscriptions.id` + browser `bz.push.v1` | pseudonymous | identify the subscription for unsubscribe | until unsubscribed / purged |
| Push endpoint URL + `p256dh`/`auth` keys (issued by the browser's push service) | D1 `push_subscriptions` | **persistent identifier?** — unique per browser install; **[LAWYER]** (COPPA checklist §4) | deliver the reminder the parent turned on | until the parent turns reminders off, the push service reports 404/410, or **180 days** without the app refreshing it (hourly cron purge) |
| Chosen local hour (08–19), IANA timezone, local date of the last send | D1 `push_subscriptions` | low (timezone ≈ coarse region) | send at the chosen local time, at most once a day, never 20:00–08:00 | as above |
| Monster name for the notification text | browser cache `bz-local` (service worker) | could be a real name | personalise the notification on the device | on the device only; **never sent** to the server |
| Reminder payload (generic text, no names) | sent to the push service (Google FCM, Mozilla, Apple, Microsoft WNS), encrypted end-to-end (RFC 8291) | no | delivery | push service's own retention; TTL expires before 20:00 local |

Not stored: names, emails, IP addresses, account or child ids (subscriptions aren't linked to accounts). Controls: parent gate + explicit tap before the permission prompt; strict body schema (unknown keys rejected) read with a 2 KB byte-counted cap; endpoint allow-list (known push-service hosts only, no relay); 30 requests/hour per IP (IPv6 by /64); `VAPID_PUBLIC_KEY` empty = reminders off (production until legal sign-off). "Delete all progress on this device" and "Delete account" both unsubscribe the current device.

### Open items for review (accounts)
1. **Verifiable parental consent (lawyer):** email + confirmation link ("email plus") is only permitted under COPPA for internal uses without disclosure. Friends/leaderboards make a child's monster name and points visible to another family: decide whether that is a "disclosure" requiring a stronger VPC method (e.g. card check via Stripe, signed form). See `docs/legal/COPPA_CHECKLIST.md`.
2. Inactive-account retention period (proposed 24 months, with an email warning 30 days before deletion).
3. Session revocation UI ("sign out everywhere") and a per-parent session cap.
4. DPA/sub-processor review: Cloudflare (hosting, D1), Resend (email), Stripe (payments).
5. Independent security review of `worker/**` and `src/account/**` before enabling accounts in production.

## Controls
- Strict server-side schema (`progressSchema.ts`): unknown keys rejected, ids pattern-checked, sizes capped (8 KB body, 200 items).
- Same-origin enforcement on writes; parameterised SQL; generic error bodies; `no-store` + `nosniff` on API responses.
- CSP and security headers on static responses (`public/_headers`): `default-src 'self'`, no inline scripts, `frame-ancestors 'none'`, permissions policy denying camera/mic/geolocation.
- Parent controls: mute; "Delete all progress on this device" behind a simple parent gate; if a server copy exists and its deletion fails, local data is kept and a retry is offered (no silent orphaning).
- API responses: `content-security-policy: default-src 'none'`, HSTS, `nosniff`, `no-store`; request bodies capped by real byte count while streaming (8 KB).
- Corrupted/old saved rounds are validated and dropped; a top-level error boundary offers "Start again".
- No ads, chat, public profiles, UGC, or purchase prompts in child mode.
- Test data only: automated tests use synthetic data; no real child data in development.

## Known gaps / next steps
1. Rate limiting: account endpoints are rate-limited in the Worker (above). Guest writes (`/api/guest*`, sync OFF) are disabled (404) unless `GUEST_SYNC_ENABLED`, and rate-limited per IP if enabled; still add a free WAF rate-limiting rule on `/api/*` before launch.
2. Restore path for server backup (parent-held recovery code behind a parent gate) — prerequisite for re-enabling sync.
3. Stronger parent gate design (current arithmetic gate is a speed bump, not a security control).
4. Privacy policy text and data-processing records drafted with counsel.
5. Accounts (Phase 5) require: verifiable parental consent flow, data access/export/deletion, DPIA, vendor review.
Independent review findings for this milestone are recorded in DECISIONS.md.

## Questions for counsel (from the independent review)
1. Is a server-minted guest UUID a COPPA "persistent identifier", and would a progress backup fall under the "support for internal operations" exception? GDPR/UK AADC status when combined with IPs in CDN logs.
2. Cloudflare DPA, sub-processors and international transfers.
3. Retention period justification; D1 Time Travel keeps deleted rows recoverable for 7–30 days — affects what the deletion promise can say.
4. Whether ePrivacy/PECR's strictly-necessary exemption covers localStorage for settings, age band and progress.
5. Parent-gate requirements and final privacy-notice wording.
