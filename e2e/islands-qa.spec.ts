import { type Page, expect, test } from "@playwright/test";
import { ONBOARDED, enterGame, press, seed } from "./helpers";

/**
 * QA review of D-041 (ocean map + journey islands): regression tests for defects found by the independent review.
 * Each test describes the expected behaviour; a failure here is a reported defect, not a flaky test.
 * Production-like (no dev override: English live, Pilot in fog). Synthetic test data only.
 */
const DAY = "2026-11-25";
const caption = (page: Page) => page.getByTestId("live-caption");

async function start(page: Page, extra: Record<string, unknown> = {}) {
  await page.clock.install({ time: new Date(`${DAY}T10:00:00`) });
  await seed(page, { muted: true, profile: ONBOARDED, ageBand: "ages-6-8", dailyLimit: 5, ...extra });
}

async function passGate(page: Page) {
  const q = (await page.locator('label[for="pa-gate-answer"]').textContent()) ?? "";
  const [a, b] = q.match(/\d+/g)!.map(Number);
  await page.getByTestId("pa-gate-answer").fill(String(a! * b!));
  await press(page, '[data-testid="pa-gate-ok"]');
}

test("QA-1: speech from a previously tapped island does not play over the newly chosen one", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "timing check runs once");
  await start(page);
  await page.goto("/paths");
  await press(page, '[data-testid="path-card-english"]'); // title, then (later) the pitch
  await press(page, '[data-testid="path-card-pilot"]'); // the child changes their mind at once
  await expect(page.getByTestId("ocean-card")).toHaveAttribute("data-island", "pilot");
  await expect(caption(page)).toHaveText("This island is still being built. Come back soon!");
  await page.waitForTimeout(3_000); // muted: the first island's title "ends" after ~1.8 s and its pitch would follow
  await expect(page.getByTestId("ocean-card")).toHaveAttribute("data-island", "pilot");
  await expect(caption(page)).not.toHaveText("Play with sounds and words with Sarah.");
});

test("QA-2: keyboard focus is not dropped to <body> when Sail starts the boat ride", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "keyboard check runs once");
  await start(page);
  await page.goto("/paths");
  await press(page, '[data-testid="path-card-english"]');
  await expect(page.getByTestId("path-go")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("ocean-boat-sailing")).toBeVisible();
  // the Sail button is gone; focus should land on Skip (the only control of the ride), not on <body>
  expect(await page.evaluate(() => document.activeElement === document.body || document.activeElement === null)).toBe(false);
});

test("QA-3: after the parent gate, focus goes to the currently selected age, not the first choice", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "keyboard check runs once");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await page.goto("/paths");
  await press(page, '[data-testid="age-badge"]');
  await passGate(page);
  await expect(page.getByTestId("age-choice-ages-6-8")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("age-choice-ages-6-8")).toBeFocused();
});

test("QA-4: a done stop labelled 'level 1 … Play again' opens that level, not the current one", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "runs once");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page, {
    ageBand: "ages-3-5",
    progress: { v: 1, stickers: [], roundsCompleted: 3, skills: {}, levels: { "rhyme-lanterns": 2 } },
    paths: { v: 1, cur: "english", at: "english", seen: ["english"], by: { english: { w: "rhyme-lanterns", easy: 0, hard: 0, n: 2, dn: null, warm: null } }, run: null, offered: null },
  });
  await page.goto("/path");
  await expect(page.getByTestId("path-view")).toHaveAttribute("data-level", "2");
  const first = page.getByTestId("path-stop-0");
  await expect(first).toHaveAttribute("aria-label", /level 1, done\. Play again$/);
  await press(page, '[data-testid="path-stop-0"]');
  await expect(page).toHaveURL(/\/play\/rhyme-lanterns$/);
  await enterGame(page);
  await expect(page.getByTestId("level")).toHaveText("Level 1");
});
