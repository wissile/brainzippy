import { type Page, expect, test } from "@playwright/test";
import { ONBOARDED, press, reviewDir, seed } from "./helpers";

/**
 * Ocean map and journey islands (D-041, docs/PATHS.md): islands for live paths, Monster Island (home, today's
 * adventure) and the next path in fog; tap → card → Sail (boat ride, Skip, reduced motion) → the journey island;
 * stops as levels; the map reopens where the boat is; the grown-ups age badge; keyboard use; layout at the four
 * review viewports. Production-like: no dev override, so only English is live. Synthetic test data only.
 */
const SHOTS = reviewDir("islands");
const DAY = "2026-11-25";
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));

async function start(page: Page, extra: Record<string, unknown> = {}) {
  await page.clock.install({ time: new Date(`${DAY}T10:00:00`) });
  await seed(page, { muted: true, profile: ONBOARDED, ageBand: "ages-6-8", dailyLimit: 5, ...extra });
}

async function noOverflow(page: Page, sel: string) {
  const vp = page.viewportSize()!;
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1)).toBe(false);
  const boxes = await page.locator(sel).evaluateAll((els) => els.map((e) => ({ id: (e as HTMLElement).dataset.testid ?? e.className, ...e.getBoundingClientRect().toJSON() })));
  expect(boxes.length).toBeGreaterThan(0);
  for (const b of boxes) {
    expect(b.left, b.id).toBeGreaterThanOrEqual(-1);
    expect(b.top, b.id).toBeGreaterThanOrEqual(-1);
    expect(b.right, b.id).toBeLessThanOrEqual(vp.width + 1);
    expect(b.bottom, b.id).toBeLessThanOrEqual(vp.height + 1);
  }
}

const caption = (page: Page) => page.getByTestId("live-caption");

/** Sail to Word Woods from the ocean (Skip ends the ride). */
async function sailToWordWoods(page: Page) {
  await page.goto("/paths");
  await press(page, '[data-testid="path-card-english"]');
  await press(page, '[data-testid="path-go"]');
  const skip = page.getByTestId("ocean-skip");
  if (await skip.isVisible().catch(() => false)) await press(page, '[data-testid="ocean-skip"]');
  await expect(page.getByTestId("path-view")).toBeVisible({ timeout: 8_000 });
}

async function passGate(page: Page) {
  const q = (await page.locator('label[for="pa-gate-answer"]').textContent()) ?? "";
  const [a, b] = q.match(/\d+/g)!.map(Number);
  await page.getByTestId("pa-gate-answer").fill(String(a! * b!));
  await press(page, '[data-testid="pa-gate-ok"]');
}

test("the ocean shows live journeys, the next one in fog and Monster Island", async ({ page }, info) => {
  await start(page);
  await page.goto("/paths");
  await expect(page.getByTestId("path-picker")).toBeVisible();
  await expect(page.getByTestId("path-card-english")).toHaveAttribute("aria-label", /^Word Woods: Learn English with Sarah/);
  await expect(page.getByTestId("path-card-pilot")).toHaveAttribute("aria-label", "Sky School: coming soon");
  for (const id of ["math", "cs", "sci", "nature", "money"]) await expect(page.getByTestId(`path-card-${id}`)).toHaveCount(0);
  await expect(page.getByTestId("ocean-home")).toHaveAttribute("aria-label", /you are here/); // a new child's boat is at home
  await expect(caption(page)).toHaveText("Which island shall we sail to? Tap one!");
  await expect(page.getByTestId("view-islands")).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/ocean-${info.project.name}.png` });
});

test("tap an island, hear it, sail there (Skip ends the ride); the map then opens on that island", async ({ page }, info) => {
  await start(page);
  await page.goto("/paths");
  await press(page, '[data-testid="path-card-english"]');
  const card = page.getByTestId("ocean-card");
  await expect(card).toBeVisible();
  await expect(card).toContainText("Word Woods");
  await expect(card).toContainText("Learn English with Sarah");
  await expect(page.getByTestId("ocean-card-stops")).toHaveText("7 stops for you"); // ages 6–8
  await expect(page.getByTestId("path-go")).toBeFocused();
  // title, then the pitch (muted runs move from one caption to the next at once, so check the last one)
  await expect(caption(page)).toHaveText("Play with sounds and words with Sarah.", { timeout: 15_000 });
  await page.screenshot({ path: `${SHOTS}/card-${info.project.name}.png` });
  await press(page, '[data-testid="path-go"]');
  await expect(page.getByTestId("ocean-boat-sailing")).toBeVisible();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/sailing-${info.project.name}.png` });
  await press(page, '[data-testid="ocean-skip"]');
  const view = page.getByTestId("path-view");
  await expect(view).toBeVisible();
  await expect(view).toHaveAttribute("data-path", "english");
  await expect(page.getByTestId("path-title")).toHaveText("Learn English with Sarah");
  const st = await stored(page);
  expect(st.paths.at).toBe("english");
  expect(st.paths.cur).toBe("english");
  expect(st.paths.seen).toContain("english");
  await page.goto("/map");
  await expect(page).toHaveURL(/\/path$/); // the boat is at Word Woods: the map opens there
  await expect(view).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/island-${info.project.name}.png` });
});

test("on the island: the glowing stop plays; others ask to wait; the host and a friend talk; no ticks for skipped stops", async ({ page }) => {
  await start(page);
  await sailToWordWoods(page);
  await expect(page.locator(".journey-stop")).toHaveCount(7);
  await expect(page.locator(".journey-stop").first()).toHaveAttribute("data-state", "here"); // just placed: nothing behind
  await expect(page.locator(".journey-stop.done")).toHaveCount(0);
  await expect(page.locator(".journey-stop.today")).toHaveCount(4); // 5 rounds left today = this stop + 4
  await expect(page.locator(".journey-stop.later")).toHaveCount(2);
  await press(page, '[data-testid="path-stop-1"]');
  await expect(caption(page)).toHaveText("Play the glowing stop first!");
  await press(page, '[data-testid="path-stop-6"]');
  await expect(caption(page)).toHaveText("That stop is for another day. Play the glowing stop!");
  await press(page, '[data-testid="journey-host"]');
  await expect(caption(page)).toHaveText("Play with sounds and words with Sarah.");
  await press(page, '[data-testid="journey-friend"]');
  await expect(caption(page)).toHaveText("Hi! I'm Hoot. I live on this island too!");
  const world = await page.getByTestId("path-view").getAttribute("data-world");
  await press(page, '[data-testid="path-play"]');
  await expect(page).toHaveURL(new RegExp(`/play/${world}$`));
});

test("reduced motion: Sail goes straight to the island, no boat ride", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await page.goto("/paths");
  await press(page, '[data-testid="path-card-english"]');
  await press(page, '[data-testid="path-go"]');
  await expect(page.getByTestId("path-view")).toBeVisible({ timeout: 1_500 });
  await expect(page.getByTestId("ocean-boat-sailing")).toHaveCount(0);
});

test("sail home to Monster Island: today's trail, and the map stays there", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await sailToWordWoods(page);
  await press(page, '[data-testid="view-islands"]');
  await expect(page.getByTestId("path-picker")).toHaveAttribute("data-boat", "english");
  await expect(page.getByTestId("path-card-english")).toHaveAttribute("aria-label", /you are here/);
  await press(page, '[data-testid="ocean-home"]');
  await expect(page.getByTestId("ocean-card")).toContainText("Monster Island");
  await expect(caption(page)).toHaveText("Monster Island! Your home, with a mix of games picked for you today.");
  await press(page, '[data-testid="path-go"]');
  await expect(page.getByTestId("trail")).toBeVisible();
  expect((await stored(page)).paths.at).toBe("home");
  await page.goto("/map");
  await expect(page.getByTestId("trail")).toBeVisible();
  await expect(page).toHaveURL(/\/map$/);
});

test("the island in fog only says it is coming soon", async ({ page }) => {
  await start(page);
  await page.goto("/paths");
  await press(page, '[data-testid="path-card-pilot"]');
  await expect(page.getByTestId("ocean-card")).toContainText("This island is still being built. Come back soon!");
  await expect(page.getByTestId("path-go")).toHaveCount(0);
  await expect(caption(page)).toHaveText("This island is still being built. Come back soon!");
  await press(page, '[data-testid="ocean-card-close"]');
  await expect(page.getByTestId("ocean-card")).toHaveCount(0);
});

test("age badge: grown-ups only; a new age changes the stops on the island", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await sailToWordWoods(page);
  await expect(page.getByTestId("age-badge")).toHaveText(/6–8$/);
  await press(page, '[data-testid="age-badge"]');
  await expect(page.getByTestId("age-dialog")).toBeVisible();
  await expect(page.getByTestId("pa-gate-answer")).toBeVisible(); // the parent gate comes first
  await passGate(page);
  await press(page, '[data-testid="age-choice-ages-12-14"]');
  await expect(page.getByTestId("age-dialog")).toHaveCount(0);
  await expect(page.getByTestId("age-badge")).toHaveText(/12–14$/);
  expect((await stored(page)).ageBand).toBe("ages-12-14");
  await expect(page.locator(".journey-stop")).toHaveCount(8);
  await press(page, '[data-testid="age-badge"]');
  await press(page, '[data-testid="age-choice-ages-3-5"]'); // gate passed once per session
  await expect(page.locator(".journey-stop")).toHaveCount(5);
});

test("keyboard only: choose an island, close and reopen its card, sail, play", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await page.goto("/paths");
  await expect(page.getByTestId("path-picker")).toBeVisible();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid === "path-card-english")) break;
  }
  await expect(page.getByTestId("path-card-english")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("path-go")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("ocean-card")).toHaveCount(0);
  await expect(page.getByTestId("path-card-english")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("path-go")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("path-title")).toBeFocused();
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid === "path-play")) break;
  }
  await expect(page.getByTestId("path-play")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/play\//);
});

test("layout: no overflow; the glowing stop starts in view; key controls fit", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await page.goto("/paths");
  await expect(page.getByTestId("path-picker")).toBeVisible();
  await noOverflow(page, '[data-testid="age-badge"], [data-testid="view-islands"], [data-testid="map-grown-ups"], [data-testid="map-caption-band"]');
  await press(page, '[data-testid="path-card-english"]');
  await noOverflow(page, '[data-testid="ocean-card"], [data-testid="path-go"], [data-testid="ocean-card-close"]');
  await press(page, '[data-testid="path-go"]');
  await expect(page.getByTestId("path-view")).toBeVisible();
  await page.waitForTimeout(300);
  await noOverflow(page, '[data-testid="path-play"], [data-testid="journey-monster"], [data-testid="path-hear"], [data-testid="age-badge"], [data-testid="view-islands"]');
  // the glowing stop is a big target and not under the caption band
  const play = (await page.getByTestId("path-play").boundingBox())!;
  const band = (await page.getByTestId("map-caption-band").boundingBox())!;
  expect(play.width).toBeGreaterThanOrEqual(56);
  expect(play.y + play.height).toBeLessThanOrEqual(band.y + 1);
  await page.screenshot({ path: `${SHOTS}/layout-island-${info.project.name}.png` });
});
