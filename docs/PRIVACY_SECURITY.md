# Privacy & Security

> Not legal advice. A qualified lawyer must review COPPA (US), GDPR/UK GDPR + Age Appropriate Design Code, and other applicable law **before** enabling accounts or collecting any personal information.

## Onboarding data (milestone 1.1)
| Data | Where | Sent to server? | Notes |
|---|---|---|---|
| Child's first name / nickname (optional, "Skip" offered) | localStorage `profile.kidName` | **Never** (e2e asserts no request contains it) | sanitised to letters, ≤16 chars |
| Monster design + monster name | localStorage | Never | |
| Age band | localStorage | Never | |
| **Parent's** email + explicit consent | D1 `parent_signups` | Yes, behind a parent gate, optional ("Skip for now") | token stored only as SHA-256; link single-use; unverified rows purged after 7 days; resend cooldown 10 min |
**Why the email belongs to the parent, not the child:** collecting a child's (under 13) email or other online contact information requires verifiable parental consent under COPPA, and BrainZippy's master instructions require a parent-controlled process. Asking the parent directly, with consent, and keeping the child's name on the device is the data-minimising design. The API rejects any field other than `email` and `consent`.
**Email delivery is not configured yet:** in development the confirmation link is shown on screen; in any other environment the endpoint returns 503 instead of storing addresses it can't verify. Choosing an email provider (e.g. Cloudflare Email Service, Postmark, Resend) is an open decision. A parent-facing unsubscribe/delete-email path must ship with it.

## Milestone 1 data inventory
| Data | Where | Personal? | Purpose | Retention |
|---|---|---|---|---|
| Mute setting, coarse age band (e.g. "ages-3-5") | browser localStorage | no (the band also appears in the `/play/ages-3-5` URL path on navigation; coarse, low risk) | UX | until cleared |
| Stickers, rounds completed, per-skill tallies | localStorage | no | progress | until cleared |
| In-progress round snapshot | localStorage | no | refresh-safe resume | cleared at round end |
| ~~Random guest UUID + progress JSON~~ | D1 `guest_sessions` | — | **Client sync is OFF** (D-011): the API and table exist and are tested, but guest play sends nothing until a parent-controlled restore path exists | purge cron (180 days) remains for safety |
Not collected: names, emails, birthdates, photos, voice, location, contacts, device fingerprints, ad IDs. No cookies. No analytics or third-party scripts; fonts self-hosted. Request IP addresses are processed by Cloudflare for delivery but not stored by the app. Workers invocation logs (which would retain request URLs) are disabled in `wrangler.jsonc`.

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
1. Rate limiting on `/api/*` (free WAF rule or Workers rate-limit binding) and lazy row creation (create on first valid PUT) — before enabling sync or launch.
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
