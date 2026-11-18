# Offline play and daily reminders (PWA)

Decision: D-PWA in `docs/DECISIONS.md`. Research checked 2026-11-18: vite-plugin-pwa 2.0.0 peer-supports Vite 8 (npm registry); RFC 8291 test vectors (rfc-editor.org); iOS Web Push needs a Home Screen web app, iOS/iPadOS 16.4+ (firt.dev PWA notes); Cron Triggers run in UTC, can be tested locally via `/cdn-cgi/local/scheduled` (Cloudflare docs).

## Installable app
- `public/manifest.webmanifest`: `display: standalone`, `orientation: any`, theme `#8fd0ff` (`--pill-top`), background `#fff6da` (`--cream`).
- Icons in `public/icons/`, drawn from the existing Bobbo favicon art plus the logo's zap: `icon.svg` (any), `maskable.svg` (artwork inside the central safe zone), `badge.svg` (notification badge, alpha only). Regenerate the PNGs with:
  `cd public/icons && rsvg-convert -w 192 -h 192 icon.svg -o icon-192.png && rsvg-convert -w 512 -h 512 icon.svg -o icon-512.png && rsvg-convert -w 512 -h 512 maskable.svg -o maskable-512.png && rsvg-convert -w 180 -h 180 maskable.svg -o apple-touch-icon.png && rsvg-convert -w 96 -h 96 badge.svg -o badge-96.png`
- `index.html` links the manifest and the apple-touch-icon.

## Service worker (`src/pwa/sw.ts` → `/sw.js`)
Built by `scripts/pwa-plugin.ts` after the client bundle is written, so every hashed filename comes from the real bundle. Registered only in production builds (`src/pwa/index.tsx`, called from `src/main.tsx`).

| Request | Strategy |
|---|---|
| Entry JS + static imports, CSS, woff2 fonts, SFX, icons, manifest, voice manifest, `/`, `/offline.html` | Precached at install (`bz-pre-<version>`), cache-first |
| Navigations | Network first (4 s cap for app routes) → cached app shell for app routes → `offline.html` for anything else |
| Other `/assets/*` (game chunks + CSS) | Cache-first, runtime (`bz-assets`); entries from old builds are deleted when a new worker activates |
| `/audio/voice/*.mp3`, `/audio/music/*.mp3` | Cache-first (`bz-media`), stored with a content revision; changed clips are dropped on activate |
| `/api/*` | Not touched: always network, never cached |

**World caching.** Opening a world loads its game chunk; the worker then caches that world's chunk and dependencies, its music, its voice clips (the line ids in `src/games/<id>/voice.json`) and the shared clips and music, then writes a marker `/__bz/world/<id>` in `bz-worlds`. On the very first visit, before the worker controls the page, the page reports already-loaded scripts (`SEEN` message). Worlds already visited are re-cached when a new version activates. Rough sizes: about 3 MB of shared clips once, plus 0.3–2.5 MB per world.

**Offline play.** After one online visit to a world, it is fully playable offline. Progress already lives in `localStorage`.

**Updates.** A new worker installs and waits. It activates only when (a) a grown-up taps **Update** in the "New version ready" toast, which shows only on home, the map and the grown-ups page, or (b) the page is hidden while on home or the map. It never activates mid-game. The page reloads once after activation.

**Sync queue.** `src/pwa/syncQueue.ts` is a generic queue: `enqueue({url, method, body, key})` and `flush()`, with an automatic flush on `online`. Same-origin `/api/` only; `key` coalesces items; 4xx drops an item, network errors and 5xx/429 keep it. The accounts work will use it. Progress sync itself is still off (D-011).

## Daily reminders (Web Push)
Parent-controlled, on the grown-ups page behind the parent gate (`src/pwa/ReminderSettings.tsx`). The parent chooses on/off and a time from 08:00 to 19:00. The timezone is the device's IANA zone and is shown to the parent. Notification permission is requested only inside the tap on **Turn on**; it is the first thing that tap does, because Safari requires the request to come straight from the gesture.

**Data stored** (`migrations/0004_push.sql`, table `push_subscriptions`): random device id (UUID minted on the device), push endpoint, p256dh, auth, hour, tz, `last_sent` (local date), created and updated times. No names, emails or IPs. The API rejects any other field. Endpoints must be on a known push service host (FCM, Mozilla, WNS, Apple), so the Worker can't be turned into a request relay. The app re-sends the subscription on every open while reminders are on, which keeps the timezone current. Rows not refreshed for 180 days are purged by the cron job.

**Copy** (`src/pwa/reminderCopy.ts`) is addressed to the parent, with no guilt, streaks or fear of missing out, for example "Ziggy has a new adventure ready today 🌟". The server sends a generic version. The service worker swaps in the monster name, which the page hands to it on the device (`bz-local` cache) and which is never sent to the server. Clicking a notification focuses an open BrainZippy window (it never navigates a child out of a game) or opens `/`.

**Schedule** (`worker/lib/webpushSchedule.ts`; the Cron Trigger `0 * * * *` calls `sendDueReminders`):
- A reminder goes out only during the chosen local hour. In half-hour timezones it arrives at hh:30.
- Quiet hours: never between 20:00 and 08:00 local time. These hours can't be chosen, and the job rejects them as well.
- At most one reminder per local calendar day.
- The push TTL runs out before 20:00 local time, and `Topic: bz-daily` collapses undelivered reminders. A phone that comes back online late never receives an evening reminder or a backlog.
- 404 or 410 from the push service deletes the subscription. Other failures are not retried within the hour.
- At most 40 sends per run (`MAX_SENDS_PER_RUN`), a conservative cap to stay inside Workers subrequest limits. Scaling path: batch the work through Cloudflare Queues.

**Encryption.** RFC 8291 aes128gcm and an RFC 8292 VAPID ES256 JWT (12-hour expiry), both with WebCrypto in the Worker (`worker/lib/webpush.ts`). The unit test reproduces the RFC 8291 Appendix A header and ciphertext byte for byte.

### Setup (per environment)
1. `node scripts/gen-vapid.mjs`
2. Put `VAPID_PUBLIC_KEY` in `wrangler.jsonc` `vars` (empty means reminders are off and `/api/push/key` returns 503). Set `VAPID_SUBJECT` to a monitored `mailto:` or https URL. The current `mailto:hello@brainzippy.com` is a placeholder.
3. `npx wrangler secret put VAPID_PRIVATE_KEY`. For local development, add it to `.dev.vars`.
4. Apply migration 0004 (`npm run db:migrate:local` or `:remote`) and regenerate the Worker types (`npm run cf-typegen`).
5. Test the job locally with `curl "http://localhost:5173/cdn-cgi/local/scheduled?cron=0+*+*+*+*"`.

### iOS / iPadOS
Web Push works only after **Add to Home Screen**, on iOS or iPadOS 16.4 or later, with the app opened from the Home Screen icon. In Safari tabs the settings panel explains these steps instead of offering the switch. Declarative Web Push (iOS 18.4+) is not used. The service-worker path covers it.

## Tests
- Unit: `tests/unit/webpush.test.ts` (RFC 8291 vector, fresh salt and key per message, VAPID JWT shape and signature), `tests/unit/push.test.ts` (timezones, DST, half-hour zones, quiet hours, once per day, TTL, validation and allowlist, subscribe/unsubscribe, cron job deleting on 410, retention, per-run cap), `tests/unit/syncQueue.test.ts`.
- E2E (`e2e/pwa.spec.ts`, desktop Chromium): the worker registers and precaches; a world plays a full exercise offline after one online visit; an app route works offline and an unknown route shows the offline page; push permission is requested only after the tap and the subscription body holds no names; a delivered push message (CDP `deliverPushMessage`) builds the notification with the local monster name.
- Known test limits: headless Chromium has no push service, so the spec stubs `PushManager.subscribe`. It also refuses `showNotification`, so the spec records that call inside the real worker. Nothing has been tested on a real phone, and nothing on Safari or Firefox.

## Known gaps
- "Delete all progress" doesn't yet unsubscribe reminders (the setting lives in `bz.push.v1`).
- No rate limiting on `/api/push/*` (same open item as the other APIs).
- Other e2e specs that use `page.route` on `/audio/**` no longer intercept requests the service worker serves. Set `serviceWorkers: "block"` for the non-PWA specs in `playwright.config.ts`.
