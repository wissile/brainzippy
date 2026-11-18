import { execFileSync } from "node:child_process";
import { type Page, expect, test } from "@playwright/test";
import { collectErrors, seed } from "./helpers";

/**
 * Billing end to end with the development fake Stripe (no network: APP_ENV=development, no STRIPE_SECRET_KEY,
 * localhost → worker/lib/stripeFake.ts emits signed webhooks into the real handler).
 * Synthetic data only. Requires `npm run db:migrate:local` (0005_billing) in this checkout.
 */
const DAY = 86_400_000;
const GAME = "/play/counting-adventure";
const uniq = () => `${Date.now()}${Math.floor(Math.random() * 1e6)}`;

async function passGate(page: Page) {
  const label = await page.locator('label[for="pa-gate-answer"]').innerText();
  const [a, b] = label.match(/(\d+)\s*×\s*(\d+)/)!.slice(1).map(Number);
  await page.getByTestId("pa-gate-answer").fill(String(a! * b!));
  await page.getByTestId("pa-gate-ok").click();
}

async function signUp(page: Page, email: string) {
  await page.goto("/parents");
  await maybeGate(page, page.getByTestId("pa-email"));
  await page.getByTestId("pa-email").fill(email);
  await page.getByTestId("pa-consent").check();
  await page.getByTestId("pa-send-link").click();
  await page.getByTestId("dev-magic-link").click();
  await page.getByTestId("verify-continue").click();
  await expect(page.getByTestId("pa-signed-in")).toContainText(email);
}

/** Pass the parent gate if it shows (lazy screens: wait until either the gate or the expected content is there). */
async function maybeGate(page: Page, content: ReturnType<Page["getByTestId"]>) {
  const gate = page.getByTestId("pa-gate-answer");
  await expect(gate.or(content).first()).toBeVisible();
  if (await gate.isVisible()) await passGate(page);
}

/** In-app navigation (keeps the page and its fake clock). */
async function spaGo(page: Page, path: string) {
  await page.evaluate((p) => {
    history.pushState(null, "", p);
    dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

/** The game (story intro, start button or board) is on screen instead of the ask-a-grown-up scene. */
const gameReady = (page: Page) => page.locator('[data-testid="story-skip"], [data-testid="start-game"], [data-testid="game-screen"], [aria-label$=" story"]').first();

async function noOverflow(page: Page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw).toBeLessThanOrEqual(iw);
}

test("day 15 on a device: the child sees a sleepy-monster scene with no prices; the grown-up gets a calm paywall", async ({ page }, info) => {
  test.skip(!["desktop", "phone"].includes(info.project.name), "desktop + phone");
  if (info.project.name === "phone") await page.setViewportSize({ width: 390, height: 844 });
  const errors = collectErrors(page);
  const t0 = Date.now();
  await page.clock.install({ time: t0 });
  await seed(page, { muted: true });

  await page.goto(GAME);
  await expect(gameReady(page)).toBeVisible(); // day 1: plays (and starts this device's 14 days)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("bz.billing")!).firstPlayAt)).toBeGreaterThanOrEqual(t0);

  await page.clock.setSystemTime(t0 + 14 * DAY - 60_000);
  await spaGo(page, "/map");
  await spaGo(page, GAME);
  await expect(gameReady(page)).toBeVisible(); // still day 14

  await page.clock.setSystemTime(t0 + 15 * DAY);
  await spaGo(page, "/map");
  await spaGo(page, GAME);
  const scene = page.getByTestId("ask-grown-up");
  await expect(scene).toBeVisible();
  await expect(gameReady(page)).toHaveCount(0);
  const kidText = await page.locator("body").innerText();
  expect(kidText).not.toMatch(/\$|6\.99|price|pay|subscri|card/i);
  await noOverflow(page);
  const go = page.getByTestId("ask-grown-up-go");
  const box = (await go.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(64);
  await page.screenshot({ path: info.outputPath("ask-grown-up.png") });

  await go.click({ force: true }); // breathing animation never settles
  await expect(page.getByTestId("pa-gate-answer")).toBeVisible(); // grown-ups only
  expect(await page.locator("body").innerText()).not.toContain("6.99");
  await passGate(page);
  await expect(page.getByTestId("paywall-price")).toHaveText("$6.99/month after a 14-day free trial, cancel anytime");
  await expect(page.getByTestId("paywall-terms")).toContainText("until you cancel");
  await expect(page.getByTestId("paywall-signin")).toBeVisible(); // not signed in on this device yet
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath("paywall.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("parent gate → paywall → Checkout (fake Stripe) → webhook → Stripe trial → play unlocked; portal cancel in two clicks", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "account flows run on desktop");
  const errors = collectErrors(page);
  const t0 = Date.now();
  await page.clock.install({ time: t0 });
  await seed(page, { muted: true });
  await page.goto(GAME);
  await expect(gameReady(page)).toBeVisible();

  await signUp(page, `bill+${uniq()}@example.com`);
  await expect(page.getByTestId("billing-status")).toHaveAttribute("data-source", "intro");
  await expect(page.getByTestId("billing-status")).toContainText("14 days left");

  // Day 15 on this device's clock: the account's free period (same start) has ended.
  await page.clock.setSystemTime(t0 + 15 * DAY);
  await spaGo(page, GAME);
  await expect(page.getByTestId("ask-grown-up")).toBeVisible();
  await page.getByTestId("ask-grown-up-go").click({ force: true });
  await expect(page.getByTestId("paywall-actions")).toBeVisible(); // gate already passed in this tab, signed in
  await page.getByTestId("billing-checkout").click();
  await expect(page.getByRole("alert")).toContainText("tick the box"); // explicit consent, never pre-ticked
  await expect(page.getByTestId("billing-consent")).not.toBeChecked();
  await page.getByTestId("billing-consent").check();
  await page.getByTestId("billing-checkout").click();

  await expect(page).toHaveURL(/\/api\/billing\/dev\/checkout\?/);
  await expect(page.locator("body")).toContainText("$6.99/month until you cancel");
  await page.getByTestId("dev-checkout-pay").click();

  await expect(page).toHaveURL(/\/parents\?billing=success$/);
  await maybeGate(page, page.getByTestId("billing-status"));
  const status = page.getByTestId("billing-status");
  await expect(status).toHaveAttribute("data-source", "stripe");
  await expect(status).toHaveAttribute("data-status", "trial");
  await expect(status).toContainText("first $6.99 payment");
  await expect(page.getByTestId("billing-manage")).toBeVisible();
  await expect(page.getByTestId("billing-cancel")).toBeVisible();

  await spaGo(page, GAME);
  await expect(gameReady(page)).toBeVisible(); // unlocked
  await expect(page.getByTestId("ask-grown-up")).toHaveCount(0);

  // Cancel: "Cancel plan" (click 1) → confirm on the portal (click 2).
  await spaGo(page, "/parents");
  await page.getByTestId("billing-cancel").click();
  await expect(page).toHaveURL(/\/api\/billing\/dev\/portal\?/);
  await page.getByTestId("dev-portal-cancel").click();
  await expect(page).toHaveURL(/\/parents\?billing=portal$/);
  await maybeGate(page, page.getByTestId("billing-status"));
  await expect(page.getByTestId("billing-status")).toContainText("cancelled");
  await expect(page.getByTestId("billing-cancel")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("free-access code from the owner CLI unlocks play without a card", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "account flows run on desktop");
  const out = execFileSync("node", ["scripts/access-code.mjs", "create", "--kind", "free_forever", "--note", "e2e", "--local"], { encoding: "utf8", timeout: 120_000 });
  const code = out.match(/\b([2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4})\b/)![1]!;

  const t0 = Date.now();
  await page.clock.install({ time: t0 });
  await seed(page, { muted: true });
  await page.goto(GAME);
  await expect(gameReady(page)).toBeVisible();
  await signUp(page, `code+${uniq()}@example.com`);

  await page.getByTestId("billing-show-code").click();
  await page.getByTestId("redeem-code-input").fill(code.toLowerCase().replace(/-/g, " "));
  await page.getByTestId("redeem-code-submit").click();
  await expect(page.getByText("Code accepted")).toBeVisible();
  await expect(page.getByTestId("billing-status")).toHaveAttribute("data-status", "free");

  await page.clock.setSystemTime(t0 + 40 * DAY);
  await spaGo(page, GAME);
  await expect(gameReady(page)).toBeVisible();

  // single-use: a second family can't use it
  await page.context().clearCookies();
  await signUp(page, `code2+${uniq()}@example.com`);
  await page.getByTestId("billing-show-code").click();
  await page.getByTestId("redeem-code-input").fill(code);
  await page.getByTestId("redeem-code-submit").click();
  await expect(page.getByRole("alert")).toContainText("expired or has already been used");
});
