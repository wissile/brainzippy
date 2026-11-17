# Privacy & Security

> Not legal advice. A qualified lawyer must review COPPA (US), GDPR/UK GDPR + Age Appropriate Design Code, and other applicable law **before** enabling accounts or collecting any personal information.

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
