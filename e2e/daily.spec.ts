import { type Page, expect, test } from "@playwright/test";
import { ONBOARDED, enterGame, press, solve, waitForNext } from "./helpers";

/**
 * Daily learning loop (docs/DAILY_LEARNING.md): today's trail, the daily limit, the end-of-day scene,
 * the /play lock, date rollover (page.clock) and Explore. Synthetic test data only.
 */
const SHOTS = "/home/claude/review/daily";
const DAY = "2026-11-18";
const NEXT = "2026-11-19";
const round = (l: number) => ({ w: "counting-adventure", l, ft: 7, n: 8 });

async function start(page: Page, opts: { roundsToday: number; limit?: number; ageBand?: string; muted?: boolean }) {
  await page.clock.install({ time: new Date(`${DAY}T10:00:00`) });
  const state = {
    muted: opts.muted ?? true,
    profile: ONBOARDED,
    ageBand: opts.ageBand ?? "ages-3-5",
    dailyLimit: opts.limit ?? 3,
    progress: {
      v: 1, stickers: ["counting-champ"], roundsCompleted: opts.roundsToday + 2, skills: {}, levels: { "counting-adventure": 2 },
      daily: { days: { "2026-11-17": [round(0)], [DAY]: Array.from({ length: opts.roundsToday }, (_, i) => round(i + 1)) }, seen: { "counting-adventure": DAY }, skills: {}, learned: opts.roundsToday ? 2 : 1 },
    },
  };
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("bz.v1", JSON.stringify(s));
      sessionStorage.setItem("seeded", "1");
    }
  }, state);
}

async function noOverflow(page: Page, sel: string) {
  const vp = page.viewportSize()!;
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  for (const b of await page.locator(sel).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))) {
    expect(b.left).toBeGreaterThanOrEqual(-1);
    expect(b.top).toBeGreaterThanOrEqual(-1);
    expect(b.right).toBeLessThanOrEqual(vp.width + 1);
    expect(b.bottom).toBeLessThanOrEqual(vp.height + 1);
  }
}

test("play up to the daily limit → end-of-day scene; Again is gone", async ({ page }, info) => {
  await start(page, { roundsToday: 2 });
  await page.goto("/map");
  await expect(page.getByTestId("today-progress")).toHaveAttribute("data-done", "2");
  await expect(page.getByTestId("today-progress")).toContainText("2 of 3");
  await expect(page.locator('.trail-stop[data-state="done"]')).toHaveCount(2);
  await expect(page.getByTestId("days-learning")).toHaveAttribute("data-days", "2");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-01-trail-2of3.png` });

  // the next glowing stop starts the last round of the day
  await press(page, '.trail-stop[data-state="next"] [data-testid^="stop-"]');
  await enterGame(page);
  for (let i = 0; i < 8; i++) {
    const id = await solve(page);
    await waitForNext(page, id);
  }
  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 }); // the round in progress finished
  await expect(page.getByTestId("play-again")).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.daily.days["2026-11-18"]).toHaveLength(3);
  await press(page, '[data-testid="more-games"]');

  await expect(page.getByTestId("end-of-day")).toBeVisible();
  await expect(page.getByTestId("recap")).toContainText("You counted Bobbo's snacks");
  await expect(page.getByTestId("recap")).toContainText("For grown-ups: One-to-one counting");
  await expect(page.getByTestId("teaser")).toBeVisible();
  await expect(page.getByTestId("moon-sun")).toBeVisible();
  await expect(page.getByTestId("eod-monster")).toHaveAttribute("data-state", "sleeping", { timeout: 10_000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-02-end-of-day.png` });
  await noOverflow(page, '[data-testid="nav-home"], [data-testid="sound-toggle"]');
});

test("after the limit, /play URLs show the end-of-day scene; the next local day unlocks a new plan", async ({ page }, info) => {
  await start(page, { roundsToday: 3 });
  await page.goto("/play/glow-cave-hops");
  await expect(page.getByTestId("end-of-day")).toBeVisible();
  await expect(page.getByTestId("story")).toHaveCount(0);
  await page.goto("/map");
  await expect(page.getByTestId("end-of-day")).toBeVisible();
  await expect(page.getByTestId("map")).toHaveCount(0);

  // the app stays open past midnight: the trail comes back by itself with a fresh plan
  await page.clock.fastForward("14:01:00");
  await expect(page.getByTestId("map")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("map")).toHaveAttribute("data-day", NEXT);
  await expect(page.getByTestId("today-progress")).toHaveAttribute("data-done", "0");
  await expect(page.getByTestId("trail")).toHaveAttribute("data-stops", "3");
  const plan = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).progress.daily.plan);
  expect(plan.day).toBe(NEXT);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-03-next-day.png` });
  await page.goto("/play/glow-cave-hops");
  await expect(page.locator('[data-testid="story"], [data-testid="start-game"]').first()).toBeVisible({ timeout: 20_000 });
});

test("Explore lists every world by subject and opens one", async ({ page }, info) => {
  await start(page, { roundsToday: 1, limit: 5, ageBand: "ages-6-8" });
  await page.goto("/map");
  await press(page, '[data-testid="view-explore"]');
  await expect(page.getByTestId("explore")).toBeVisible();
  const total = Number(await page.getByTestId("explore").getAttribute("data-total"));
  expect(total).toBeGreaterThanOrEqual(4);
  const forAge = await page.locator(".explore-card").count();
  expect(forAge).toBeGreaterThan(0);
  await press(page, '[data-testid="explore-all-ages"]');
  await expect(page.locator(".explore-card")).toHaveCount(total);
  for (const id of ["counting-adventure", "glow-cave-hops", "sky-balloon-race", "cookie-kitchen"]) await expect(page.getByTestId(`explore-${id}`)).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-04-explore.png` });
  await press(page, '[data-testid="explore-cookie-kitchen"]');
  await expect(page).toHaveURL(/\/play\/cookie-kitchen$/);
});

for (const vp of [{ width: 390, height: 844 }, { width: 915, height: 412 }]) {
  test(`no overflow at ${vp.width}x${vp.height}: trail (10 stops), explore, end of day`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.setViewportSize(vp);
    await start(page, { roundsToday: 2, limit: 10 });
    await page.goto("/map");
    await expect(page.getByTestId("trail")).toHaveAttribute("data-stops", "10");
    await page.waitForTimeout(1500);
    await noOverflow(page, '[data-testid^="stop-"], [data-testid="today-progress"], [data-testid="view-today"], [data-testid="view-explore"], [data-testid="nav-home"], [data-testid="sound-toggle"]');
    for (const b of await page.locator('[data-testid^="stop-"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))) expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `${SHOTS}/${vp.width}x${vp.height}-trail10.png` });
    await press(page, '[data-testid="view-explore"]');
    await expect(page.getByTestId("explore")).toBeVisible();
    await noOverflow(page, '[data-testid="explore"], [data-testid="explore-all-ages"]');
    await page.screenshot({ path: `${SHOTS}/${vp.width}x${vp.height}-explore.png` });
    // reach the limit by lowering it: the end of day must fit too
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem("bz.v1")!);
      s.dailyLimit = 3;
      s.progress.daily.days["2026-11-18"].push({ w: "glow-cave-hops", l: 0, ft: 6, n: 8 });
      localStorage.setItem("bz.v1", JSON.stringify(s));
    });
    await page.goto("/map");
    await expect(page.getByTestId("eod-monster")).toHaveAttribute("data-state", "sleeping", { timeout: 10_000 });
    await page.waitForTimeout(600);
    await noOverflow(page, '[data-testid="nav-home"], [data-testid="sound-toggle"], .eod-title');
    await page.screenshot({ path: `${SHOTS}/${vp.width}x${vp.height}-end-of-day.png`, fullPage: true });
  });
}

test("grown-ups: daily pace is changed only behind the parent gate", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await start(page, { roundsToday: 0, limit: 5 });
  await page.goto("/grown-ups");
  await expect(page.getByText("BrainZippy works best a little every day.")).toBeVisible();
  await expect(page.getByTestId("daily-limit-value")).toHaveText("5");
  await page.getByTestId("daily-limit-change").click();
  await page.getByTestId("limit-gate-answer").fill("1");
  await page.getByTestId("limit-gate-confirm").click();
  await expect(page.getByTestId("daily-limit-plus")).toHaveCount(0);
  const q = await page.locator('label[for="limit-gate-answer"]').innerText();
  const [a, b] = q.match(/(\d+) × (\d+)/)!.slice(1).map(Number);
  await page.getByTestId("limit-gate-answer").fill(String(a! * b!));
  await page.getByTestId("limit-gate-confirm").click();
  for (let i = 0; i < 9; i++) await page.getByTestId("daily-limit-minus").click({ force: true });
  await expect(page.getByTestId("daily-limit-draft")).toContainText("3");
  await page.getByTestId("daily-limit-plus").click();
  await page.getByTestId("daily-limit-save").click();
  await expect(page.getByTestId("daily-limit-value")).toHaveText("4");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).dailyLimit)).toBe(4);
});

test.describe("full page load onto the map (audio still locked)", () => {
  test("the welcome line is captioned at once and voiced again after the first tap", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await start(page, { roundsToday: 2, muted: false });
    await page.goto("/map");
    const live = page.getByTestId("live-caption");
    await expect(live).toContainText("One more stop");
    await expect(live).toHaveText("", { timeout: 15_000 });
    await page.mouse.click(640, 300); // first tap on empty island unlocks audio → the queued line plays
    await expect(live).toContainText("One more stop", { timeout: 5_000 });
  });

  test("the first tap is never swallowed: tapping a stop opens it", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await start(page, { roundsToday: 0, muted: false });
    await page.goto("/map");
    await page.locator('.trail-stop[data-state="next"] [data-testid^="stop-"]').first().click();
    await expect(page).toHaveURL(/\/play\/counting-adventure$/);
    await expect(page.locator('[data-testid="story"], [data-testid="start-game"]').first()).toBeVisible({ timeout: 20_000 });
  });
});
