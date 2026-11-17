# Privacy & Security

> Not legal advice. A qualified lawyer must review COPPA (US), GDPR/UK GDPR + Age Appropriate Design Code, and other applicable law **before** enabling accounts or collecting any personal information.

## Milestone 1 data inventory
| Data | Where | Personal? | Purpose | Retention |
|---|---|---|---|---|
| Mute setting, coarse age band (e.g. "ages-3-5") | browser localStorage | no (age band never leaves the device) | UX | until cleared |
| Stickers, rounds completed, per-skill tallies | localStorage | no | progress | until cleared |
| In-progress round snapshot | localStorage | no | refresh-safe resume | cleared at round end |
| Random guest UUID + same progress JSON | D1 `guest_sessions` | no direct identifiers; UUID is a pseudonymous key | backup of progress | purged 180 days after last update (daily cron) |
Not collected: names, emails, birthdates, photos, voice, location, contacts, device fingerprints, ad IDs. No cookies. No analytics or third-party scripts; fonts self-hosted. Request IP addresses are processed by Cloudflare for delivery but not stored by the app.

## Controls
- Strict server-side schema (`progressSchema.ts`): unknown keys rejected, ids pattern-checked, sizes capped (8 KB body, 200 items).
- Same-origin enforcement on writes; parameterised SQL; generic error bodies; `no-store` + `nosniff` on API responses.
- CSP and security headers on static responses (`public/_headers`): `default-src 'self'`, no inline scripts, `frame-ancestors 'none'`, permissions policy denying camera/mic/geolocation.
- Parent controls: mute; "Delete all progress on this device" (clears localStorage and deletes the server row) on the For grown-ups page.
- No ads, chat, public profiles, UGC, or purchase prompts in child mode.
- Test data only: automated tests use synthetic data; no real child data in development.

## Known gaps / next steps
1. Rate limiting on `/api/*` (free WAF rule or Workers rate-limit binding) — before public launch.
2. CSP on Worker-generated responses (API returns JSON only; low risk).
3. Parent gate (e.g. adult-only challenge) in front of the grown-ups page actions.
4. Privacy policy text and data-processing records drafted with counsel.
5. Accounts (Phase 5) require: verifiable parental consent flow, data access/export/deletion, DPIA, vendor review.
Independent review findings for this milestone are recorded in DECISIONS.md.
