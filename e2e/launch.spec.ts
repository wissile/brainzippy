import { type Page, expect, test } from "@playwright/test";
import { beginIfAsked, collectErrors, press, seed } from "./helpers";

/**
 * Guest-only production launch (D-030): what a visitor to brainzippy.com sees while accounts, billing and friends are
 * switched off. Needs the production-like flags: `npm run e2e:launch` (BZ_E2E_FLAGS=launch, playwright.config.ts).
 * With development flags (.dev.vars) every test here skips itself. A full round under these flags is covered by
 * full-round.spec.ts, which e2e:launch runs too. Synthetic data only.
 */
const DAY = 86_400_000;
const GAME = "/play/counting-adventure";

test.beforeEach(async ({ request }, info) => {
  test.skip(!["desktop", "phone"].includes(info.project.name), "desktop + phone");
  const flags = await (await request.get("/api/config")).json();
  test.skip(flags.accounts !== false || flags.billing !== false || flags.friends !== false, "needs production flags: npm run e2e:launch");
});

/** Records every non-GET request (except anonymous play counters) and every request to an account/billing API. */
function watchRequests(page: Page) {
  const sent: string[] = [];
  page.on("request", (r) => {
    const path = new URL(r.url()).pathname;
    // anonymous play counters (D-033) are allowed; e2e/analytics.spec.ts checks what they contain
    if (path === "/api/play-stats") return;
    if (r.method() !== "GET" || /^\/api\/(auth|parent-signup|me|children|billing|friends|invites|challenges)/.test(path)) sent.push(`${r.method()} ${path} ${r.postData() ?? ""}`);
  });
  return sent;
}

async function spaGo(page: Page, path: string) {
  await page.evaluate((p) => {
    history.pushState(null, "", p);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

const gameReady = (page: Page) => page.locator('[data-testid="story-skip"], [data-testid="start-game"], [data-testid="game-screen"], [aria-label$=" story"]').first();

async function noOverflow(page: Page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw).toBeLessThanOrEqual(iw);
}

test("the server reports guest-only flags", async ({ request }) => {
  const res = await request.get("/api/config");
  expect(await res.json()).toEqual({ accounts: false, billing: false, friends: false, push: false, analytics: true }); // anonymous counters stay on (D-033)
  expect(res.headers()["cache-control"]).toBe("public, max-age=300");
  expect((await request.post("/api/parent-signup", { data: { email: "a@example.com", consent: true } })).status()).toBe(404);
  expect((await request.post("/api/auth/magic-link", { data: { email: "a@example.com", consent: true, mode: "signup" } })).status()).toBe(404);
  // reminders not configured and accounts off: push and the digest unsubscribe link don't exist
  expect((await request.get("/api/push/key")).status()).toBe(404);
  expect((await request.post("/api/push/subscribe", { data: {} })).status()).toBe(404);
  expect((await request.get("/api/unsubscribe")).status()).toBe(404);
});

test("onboarding goes from age straight to the map and never asks for an email", async ({ page }, info) => {
  const errors = collectErrors(page);
  const sent = watchRequests(page);
  let sawEmailField = false;
  await seed(page, { muted: true }, { fresh: true });
  await page.goto("/");
  await press(page, '[data-testid="site-play"]');
  await beginIfAsked(page);
  const onb = page.getByTestId("onboarding");
  await expect(onb).toHaveAttribute("data-step", "intro");
  await press(page, '[data-testid="opening-skip"]');
  await expect(onb).toHaveAttribute("data-step", "pop");
  // Bubbles must actually float up into view (a clashing @keyframes name once left them all below the screen).
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const f = document.querySelector(".bubble-field")!.getBoundingClientRect();
          return Array.from(document.querySelectorAll("[data-testid=bubble]")).filter((b) => {
            const r = b.getBoundingClientRect();
            return r.bottom > f.top + 20 && r.top < f.bottom - 20;
          }).length;
        }),
      { timeout: 8_000 },
    )
    .toBeGreaterThan(0);
  for (let i = 0; i < 8; i++) {
    await page.getByTestId("bubble").first().focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(120);
  }
  await expect(onb).toHaveAttribute("data-step", "build", { timeout: 15_000 });
  await press(page, '[data-testid="build-random"]');
  await press(page, '[data-testid="build-done"]');
  await expect(onb).toHaveAttribute("data-step", "name");
  await press(page, '[data-testid="name-Nova"]');
  await press(page, '[data-testid="name-done"]');
  await expect(onb).toHaveAttribute("data-step", "kid");
  await page.getByTestId("kid-name-input").fill("Sam");
  await press(page, '[data-testid="kid-done"]');
  await expect(onb).toHaveAttribute("data-step", "age");
  sawEmailField ||= (await page.locator('input[type="email"]').count()) > 0;
  await expect(page.locator(".onb-dots i")).toHaveCount(6); // the grown-up step is not part of the flow
  await press(page, '[data-testid="age-ages-3-5"]');

  await expect(page.getByTestId("map")).toBeVisible();
  await expect(page.getByTestId("map")).toContainText("Nova");
  sawEmailField ||= (await page.locator('input[type="email"]').count()) > 0;
  expect(sawEmailField).toBe(false);
  await expect(page.locator('[data-testid="parent-email"], [data-testid="onb-gate-answer"], [data-testid="grownup-skip"]')).toHaveCount(0);
  const profile = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).profile);
  expect(profile.step).toBe("done");
  expect(profile.parentSignup).toBe("none");
  expect(sent).toEqual([]); // nothing posted, no account or billing API touched
  await page.screenshot({ path: info.outputPath("launch-map.png") });
  expect(errors).toEqual([]);
});

test("day 15 and day 40: games still open, no ask-a-grown-up paywall, no trial clock", async ({ page }, info) => {
  const errors = collectErrors(page);
  const sent = watchRequests(page);
  const t0 = Date.now();
  await page.clock.install({ time: t0 });
  await seed(page, { muted: true });
  await page.goto(GAME);
  await expect(gameReady(page)).toBeVisible();
  for (const day of [15, 40]) {
    await page.clock.setSystemTime(t0 + day * DAY);
    await spaGo(page, "/map");
    await expect(page.getByTestId("map")).toBeVisible();
    await spaGo(page, GAME);
    await expect(gameReady(page)).toBeVisible();
    await expect(page.getByTestId("ask-grown-up")).toHaveCount(0);
  }
  // full reload on day 40 (fresh app start reading cached flags)
  await page.reload();
  await expect(gameReady(page)).toBeVisible();
  await expect(page.getByTestId("ask-grown-up")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("bz.billing"))).toBeNull(); // first play never recorded
  expect(sent).toEqual([]);
  await page.screenshot({ path: info.outputPath("launch-day40.png") });
  expect(errors).toEqual([]);
});

test("/parents is a calm coming-soon page; /plan and /grown-ups show nothing purchasable", async ({ page }, info) => {
  const errors = collectErrors(page);
  const sent = watchRequests(page);
  await seed(page, { muted: true });

  await page.goto("/parents");
  const soon = page.getByTestId("parents-coming-soon");
  await expect(soon).toContainText("Grown-up accounts are coming soon. Progress is saved on this device.");
  await expect(page.locator('input[type="email"], [data-testid="pa-gate-answer"], [data-testid="pa-send-link"]')).toHaveCount(0);
  await expect(soon.getByRole("link", { name: "hello@brainzippy.com" })).toHaveAttribute("href", "mailto:hello@brainzippy.com");
  await expect(soon).not.toContainText(/reminder/i); // push is not configured in production
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("launch-parents.png"), fullPage: true });

  await page.goto("/plan");
  await expect(page.getByTestId("plan-early-access")).toContainText("Free while we're in early access");
  await expect(page.locator('[data-testid="paywall"], [data-testid="billing-checkout"], [data-testid="redeem-code-input"]')).toHaveCount(0);
  expect(await page.locator("body").innerText()).not.toMatch(/\$|6\.99|subscri|card number/i);
  await noOverflow(page);

  await page.goto("/grown-ups");
  await expect(page.getByTestId("early-access")).toContainText("Free while we're in early access");
  await expect(page.getByTestId("accounts-coming-soon")).toBeVisible();
  await expect(page.getByTestId("open-parents")).toHaveCount(0); // no sign-in link
  // no VAPID keys in production: no reminders section, nothing that could ask for notification permission
  await expect(page.locator('.bz-reminders, [data-testid="reminder-open"]')).toHaveCount(0);
  await expect(page.getByTestId("privacy-notice-link")).toHaveAttribute("href", "/privacy");
  await expect(page.getByTestId("support-email")).toHaveAttribute("href", "mailto:hello@brainzippy.com");
  expect(await page.locator("body").innerText()).not.toMatch(/\$6\.99|add friends/i);
  await noOverflow(page);

  // the public pricing page is not published in this build
  const pricing = await page.request.get("/pricing");
  expect(await pricing.text()).not.toContain("6.99");
  expect(sent).toEqual([]);
  expect(errors).toEqual([]);
});
