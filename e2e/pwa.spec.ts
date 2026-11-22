import { type Page, expect, test } from "@playwright/test";
import { collectErrors, enterGame, press, seed, solve, waitForNext } from "./helpers";

/** These tests exercise the service worker; every other spec blocks it (playwright.config.ts). */
test.use({ serviceWorkers: "allow" });

/** Installable PWA, offline play, offline fallback and parent-controlled push reminders. Desktop Chromium. */
test.beforeEach(({ browserName }, info) => {
  test.skip(browserName !== "chromium" || info.project.name !== "desktop", "service-worker specs run on desktop Chromium");
});

async function waitForController(page: Page) {
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), undefined, { timeout: 30_000 });
}

const worldCached = (page: Page, id: string) =>
  page.evaluate(async (w) => Boolean(await (await caches.open("bz-worlds")).match(`/__bz/world/${w}`)), id);

test("service worker registers, controls the page and precaches the app shell", async ({ page }) => {
  await seed(page, { muted: true });
  await page.goto("/map");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await waitForController(page);
  const info = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const pre = (await caches.keys()).find((k) => k.startsWith("bz-pre-"));
    const keys = pre ? (await (await caches.open(pre)).keys()).map((r) => new URL(r.url).pathname) : [];
    const manifest = await (await fetch("/manifest.webmanifest")).json();
    return { script: reg?.active?.scriptURL ?? "", keys, manifest };
  });
  expect(info.script).toMatch(/\/sw\.js$/);
  expect(info.keys).toEqual(expect.arrayContaining(["/__app", "/offline.html", "/audio/sfx/correct.mp3", "/icons/icon-192.png"]));
  expect(info.keys.some((k) => /^\/assets\/index-.*\.js$/.test(k))).toBe(true);
  expect(info.keys.some((k) => k.endsWith(".woff2"))).toBe(true);
  expect(info.manifest).toMatchObject({ start_url: "/start", display: "standalone", orientation: "any", short_name: "BrainZippy" });
  expect(info.manifest.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBe(true);
});

test("after one online visit, a world plays a full exercise offline", async ({ page, context }) => {
  const errors = collectErrors(page);
  await seed(page, { muted: true });
  await page.goto("/map");
  await waitForController(page);
  await press(page, '[data-testid="stop-counting-adventure"]');
  await expect(page.getByTestId("story")).toBeVisible();
  // opening the world caches its whole bundle: chunk + deps, music, voice clips
  await expect.poll(() => worldCached(page, "counting-adventure"), { timeout: 90_000 }).toBe(true);
  const media = await page.evaluate(async () => (await (await caches.open("bz-media")).keys()).map((r) => new URL(r.url).pathname));
  expect(media).toEqual(expect.arrayContaining(["/audio/music/meadow.mp3", "/audio/voice/ca.story.1.mp3", "/audio/voice/number.3.mp3"]));

  await context.setOffline(true);
  await page.reload();
  // voice clips are served from the cache while offline
  const clip = await page.evaluate(async () => {
    const r = await fetch("/audio/voice/ca.story.1.mp3");
    return { ok: r.ok, type: r.headers.get("content-type") ?? "" };
  });
  expect(clip.ok).toBe(true);
  expect(clip.type).toMatch(/^audio\//);
  // a cold start shows "Start the story" first (audio needs a tap), then the usual skip
  await press(page, '[data-testid="story-begin"]');
  await enterGame(page);
  const id = await solve(page);
  await waitForNext(page, id);
  await expect(page.getByTestId("stars")).toHaveAttribute("data-done", "1");
  expect(errors).toEqual([]);
  await context.setOffline(false);
});

test("offline: an app route opens the cached app; an unknown page shows the offline page", async ({ page, context }) => {
  await seed(page, { muted: true });
  await page.goto("/map");
  await waitForController(page);
  await context.setOffline(true);
  await page.goto("/map");
  await expect(page.getByTestId("map")).toBeVisible();
  await page.goto("/teachers/resources");
  await expect(page.getByTestId("offline-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No internet right now" })).toBeVisible();
  await context.setOffline(false);
});

test("push reminders: permission is requested only after the grown-up's tap; subscription holds no personal data", async ({ page, context }) => {
  await context.grantPermissions(["notifications"]);
  // Headless Chromium has no push service: stand in a fake PushManager with real-shaped keys, and count permission requests.
  await page.addInitScript(() => {
    const w = window as unknown as { __permCalls: number };
    w.__permCalls = 0;
    const real = Notification.requestPermission.bind(Notification);
    Notification.requestPermission = ((...a: []) => {
      w.__permCalls++;
      return real(...a);
    }) as typeof Notification.requestPermission;
    let sub: unknown = null;
    const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    PushManager.prototype.getSubscription = async () => sub as PushSubscription | null;
    PushManager.prototype.subscribe = async () => {
      const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
      const p256dh = b64(await crypto.subtle.exportKey("raw", pair.publicKey));
      const json = { endpoint: `https://fcm.googleapis.com/fcm/send/e2e-${crypto.randomUUID()}`, keys: { p256dh, auth: b64(crypto.getRandomValues(new Uint8Array(16))) } };
      sub = { endpoint: json.endpoint, toJSON: () => json, unsubscribe: async () => ((sub = null), true) };
      return sub as PushSubscription;
    };
  });
  const VAPID_PUBLIC = "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8"; // RFC 8291 sample key (test only)
  // Reminders are shown only when the deployment has push configured (/api/config push); local dev has no VAPID keys.
  await page.route("**/api/config", (r) => r.fulfill({ json: { accounts: true, billing: true, friends: true, push: true } }));
  let keyFetched = false;
  await page.route("**/api/push/key", (r) => ((keyFetched = true), r.fulfill({ json: { publicKey: VAPID_PUBLIC } })));
  let unsubscribed: Record<string, unknown> | null = null;
  await page.route("**/api/push/unsubscribe", async (r) => {
    unsubscribed = r.request().postDataJSON() as Record<string, unknown>;
    await r.fulfill({ json: { ok: true } });
  });
  let posted: Record<string, unknown> | null = null;
  await page.route("**/api/push/subscribe", async (r) => {
    posted = r.request().postDataJSON() as Record<string, unknown>;
    await r.fulfill({ json: { ok: true } });
  });

  await seed(page, { muted: true });
  await page.goto("/grown-ups");
  await waitForController(page);
  const permCalls = () => page.evaluate(() => (window as unknown as { __permCalls: number }).__permCalls);
  expect(await permCalls()).toBe(0);

  await page.getByTestId("reminder-open").click();
  const q = await page.locator('label[for="reminder-gate"]').innerText();
  const [, a, b] = q.match(/(\d+) × (\d+)/)!;
  await page.getByTestId("reminder-gate-answer").fill(String(Number(a) * Number(b)));
  expect(await permCalls()).toBe(0);
  await page.getByTestId("reminder-gate-ok").click();
  await expect(page.getByTestId("reminder-panel")).toBeVisible();
  // the server key is fetched as the panel opens, BEFORE any permission prompt; "Turn on" waits for it
  await expect.poll(() => keyFetched).toBe(true);
  await expect(page.getByTestId("reminder-on")).toBeEnabled();
  expect(await permCalls()).toBe(0);
  await expect(page.getByTestId("reminder-tz")).toContainText(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone));
  // quiet hours: no option before 08:00 or from 20:00
  const hours = await page.getByTestId("reminder-hour").locator("option").evaluateAll((o) => o.map((x) => Number((x as HTMLOptionElement).value)));
  expect(Math.min(...hours)).toBe(8);
  expect(Math.max(...hours)).toBe(19);
  await page.getByTestId("reminder-hour").selectOption("9");
  expect(await permCalls()).toBe(0);

  await page.getByTestId("reminder-on").click();
  await expect(page.getByTestId("reminder-note")).toContainText("Done");
  expect(await permCalls()).toBe(1);
  expect(posted).not.toBeNull();
  const body = posted as unknown as Record<string, unknown>;
  expect(Object.keys(body).sort()).toEqual(["endpoint", "hour", "id", "keys", "tz"]);
  expect(body.hour).toBe(9);
  expect(String(body.id)).toMatch(/^[0-9a-f-]{36}$/);
  expect(JSON.stringify(body)).not.toContain("Testkid");
  expect(JSON.stringify(body)).not.toContain("Ziggy");
  await expect(page.getByTestId("reminder-status")).toContainText("On");
  // the monster name goes to the service worker on this device only (for the notification text)
  await expect
    .poll(() => page.evaluate(async () => (await (await caches.open("bz-local")).match("/__bz/prefs"))?.json() ?? null))
    .toEqual({ monsterName: "Ziggy" });

  // "Delete all progress" also forgets reminders: the subscription, the device id and the cached monster name
  const deviceId = String(body.id);
  await page.getByTestId("reset-progress").click();
  const gq = await page.locator('label[for="gate-answer"]').innerText();
  const [, ga, gb] = gq.match(/(\d+) × (\d+)/)!;
  await page.getByTestId("gate-answer").fill(String(Number(ga) * Number(gb)));
  await page.getByTestId("gate-confirm").click();
  await expect(page.getByTestId("reset-done")).toBeVisible();
  expect(unsubscribed).toEqual({ id: deviceId });
  const left = await page.evaluate(async () => ({ push: localStorage.getItem("bz.push.v1"), state: localStorage.getItem("bz.v1"), prefsCache: await caches.has("bz-local") }));
  expect(left).toEqual({ push: null, state: null, prefsCache: false });
});

test("push message shows the reminder with the device-local monster name", async ({ page, context }) => {
  await seed(page, { muted: true });
  await page.goto("/map");
  await waitForController(page);
  await page.evaluate(() => navigator.serviceWorker.controller!.postMessage({ type: "PREFS", monsterName: "Ziggy" }));
  await expect.poll(() => page.evaluate(async () => Boolean(await (await caches.open("bz-local")).match("/__bz/prefs")))).toBe(true);

  // Headless Chromium refuses showNotification even with permission granted, so record the call inside the real worker.
  const worker = context.serviceWorkers().find((w) => w.url().endsWith("/sw.js"))!;
  expect(worker).toBeTruthy();
  await worker.evaluate(() => {
    const g = self as unknown as { registration: { showNotification: unknown }; __shown: unknown[] };
    g.__shown = [];
    g.registration.showNotification = async (title: string, o: NotificationOptions & { data?: unknown }) => {
      g.__shown.push({ title, body: o.body, tag: o.tag, icon: o.icon, data: o.data });
    };
  });

  const cdp = await context.newCDPSession(page);
  const regId = new Promise<string>((resolve) =>
    cdp.on("ServiceWorker.workerRegistrationUpdated", (e: { registrations: { registrationId: string; scopeURL: string }[] }) => {
      const r = e.registrations.find((x) => x.scopeURL.startsWith(new URL(page.url()).origin));
      if (r) resolve(r.registrationId);
    }),
  );
  await cdp.send("ServiceWorker.enable");
  const origin = new URL(page.url()).origin;
  await cdp.send("ServiceWorker.deliverPushMessage", { origin, registrationId: await regId, data: JSON.stringify({ v: 1, kind: "daily", variant: 0, title: "BrainZippy", body: "generic", url: "/" }) });
  await expect
    .poll(() => worker.evaluate(() => (self as unknown as { __shown: unknown[] }).__shown), { timeout: 10_000 })
    .toEqual([{ title: "BrainZippy", body: "Ziggy has a new adventure ready today 🌟", tag: "bz-daily", icon: "/icons/icon-192.png", data: { url: "/" } }]);
});
