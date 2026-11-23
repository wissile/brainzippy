import { type Page, expect, test } from "@playwright/test";
import { ONBOARDED, enterGame, press, reviewDir, solve, waitForNext } from "./helpers";

/**
 * Learning paths (docs/PATHS.md, D-034): the picker, the your-path view, playing from it, the step-up after easy
 * rounds (seeded state), the host's offer between rounds, switching path, keyboard-only use and layout at the four
 * review viewports. No path is live yet, so every test but the first uses the dev/localhost override `?paths=all`.
 * Synthetic test data only.
 */
const SHOTS = reviewDir("paths");
const DAY = "2026-11-23";

async function start(page: Page, extra: Record<string, unknown> = {}) {
  await page.clock.install({ time: new Date(`${DAY}T10:00:00`) });
  const state = { muted: true, profile: ONBOARDED, ageBand: "ages-3-5", dailyLimit: 10, ...extra };
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("bz.v1", JSON.stringify(s));
      sessionStorage.setItem("seeded", "1");
    }
  }, state);
}
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
const progress = (levels: Record<string, number>) => ({ v: 1, stickers: [], roundsCompleted: 3, skills: {}, levels });

async function playRound(page: Page) {
  await enterGame(page);
  for (let i = 0; i < 8; i++) {
    const id = await solve(page);
    await waitForNext(page, id);
  }
  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
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

/** Press Tab until the element with `testid` has focus (keyboard-only navigation). */
async function tabTo(page: Page, testid: string, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((t) => (document.activeElement as HTMLElement | null)?.dataset.testid === t, testid)) return;
  }
  throw new Error(`Tab never reached ${testid}`);
}

test("no live path yet: no path UI, and /paths falls back to the map", async ({ page }) => {
  await start(page);
  await page.goto("/map");
  await expect(page.getByTestId("trail")).toBeVisible();
  await expect(page.getByTestId("view-explore")).toBeVisible();
  await expect(page.getByTestId("view-path")).toHaveCount(0);
  await page.goto("/paths");
  await expect(page).toHaveURL(/\/map$/);
  await expect(page.getByTestId("path-picker")).toHaveCount(0);
});

test("pick a path, hear its title, play from it, come back to the path", async ({ page }, info) => {
  await start(page);
  await page.goto("/paths?paths=all");
  await expect(page.getByTestId("path-picker")).toBeVisible();
  await expect(page.getByTestId("view-path")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("path-go")).toBeDisabled();
  await expect(page.getByTestId("path-card-pilot")).toContainText("Learn to fly with Zephy");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-01-picker.png` });

  await press(page, '[data-testid="path-card-math"]');
  await expect(page.getByTestId("path-card-math")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("live-caption")).toHaveText("Count and build with Bobbo!"); // spoken title, always captioned
  await press(page, '[data-testid="path-go"]');

  await expect(page).toHaveURL(/\/path$/);
  const view = page.getByTestId("path-view");
  await expect(page.getByTestId("path-title")).toHaveText("Count and build with Bobbo");
  await expect(view).toHaveAttribute("data-world", "counting-adventure"); // age band 3–5 → age 4 → first maths world for 4
  await expect(view).toHaveAttribute("data-level", "0");
  await expect(page.getByTestId("path-stop-counting-adventure")).toHaveAttribute("aria-current", "step");
  await expect(page.getByTestId("path-stop-balance-island")).toHaveAttribute("data-state", "later");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-02-your-path.png` });
  expect((await stored(page)).paths).toMatchObject({ v: 1, cur: "math", by: { math: { w: "counting-adventure", easy: 0, hard: 0 } } });

  // today's trail prefers the chosen path: its world is the first learning stop
  await press(page, '[data-testid="view-today"]');
  await expect(page.getByTestId("trail")).toBeVisible();
  const plan = (await stored(page)).progress.daily.plan.stops as { w: string; k: string }[];
  expect(plan.find((s) => s.k !== "review" && s.k !== "pick")?.w).toBe("counting-adventure");
  await press(page, '[data-testid="view-path"]');
  await expect(page).toHaveURL(/\/path$/);

  await press(page, '[data-testid="path-play"]');
  await expect(page).toHaveURL(/\/play\/counting-adventure$/);
  await playRound(page);
  await press(page, '[data-testid="more-games"]');
  await expect(page).toHaveURL(/\/path$/); // a round started from the path returns to it
  await expect(page.getByTestId("path-view")).toBeVisible();
  const st = await stored(page);
  expect(st.paths.run).toEqual({ p: "math", day: DAY, n: 1 });
  expect(st.progress.levels["counting-adventure"]).toBe(1); // R0 for a first-try round
});

test("two easy rounds in a row skip ahead; the 3rd path round of the day brings the host's offer", async ({ page }, info) => {
  await start(page, {
    progress: progress({ "counting-adventure": 2 }),
    paths: { v: 1, cur: "math", by: { math: { w: "counting-adventure", easy: 1, hard: 0 } }, run: { p: "math", day: DAY, n: 2 } },
  });
  await page.goto("/path?paths=all");
  await expect(page.getByTestId("path-view")).toHaveAttribute("data-level", "2");
  await press(page, '[data-testid="path-play"]');
  await playRound(page); // every item first try = an easy round (the 2nd in a row)
  await expect(page.getByTestId("level-up")).toHaveText("Zoom! You're ready for Level 5!");
  expect((await stored(page)).progress.levels["counting-adventure"]).toBe(4); // R0 +1, plus the skip
  // the offer waits until the reward lines are over, then the host asks (never forces)
  const offer = page.getByTestId("path-offer");
  await expect(offer).toBeVisible({ timeout: 20_000 });
  await expect(offer).toHaveAttribute("data-reason", "tired");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("path-offer-yes")).toBeFocused();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-03-offer.png` });
  await press(page, '[data-testid="path-offer-no"]');
  await expect(offer).toHaveCount(0);
  await expect(page.getByTestId("achievement")).toBeVisible(); // still on the reward screen: nothing moved
  expect((await stored(page)).paths.run.n).toBe(0);
});

test("accepting the offer opens the picker; switching path keeps each path's stop", async ({ page }) => {
  await start(page, {
    progress: progress({ "counting-adventure": 1, "shape-squish": 3 }),
    paths: { v: 1, cur: "math", by: { math: { w: "counting-adventure", easy: 0, hard: 0 } }, run: { p: "math", day: DAY, n: 2 } },
  });
  await page.goto("/path?paths=all");
  await press(page, '[data-testid="path-play"]');
  await playRound(page);
  await expect(page.getByTestId("path-offer")).toBeVisible({ timeout: 20_000 });
  await press(page, '[data-testid="path-offer-yes"]');
  await expect(page).toHaveURL(/\/paths$/);
  await expect(page.getByTestId("path-card-math")).toHaveAttribute("aria-pressed", "true"); // the current path is preselected
  await expect(page.getByTestId("path-card-math")).toContainText("Your path");

  await press(page, '[data-testid="path-card-english"]');
  await press(page, '[data-testid="path-go"]');
  await expect(page.getByTestId("path-title")).toHaveText("Learn English with Hoot");
  await expect(page.getByTestId("path-view")).toHaveAttribute("data-world", "rhyme-lanterns");
  let st = await stored(page);
  expect(st.paths.cur).toBe("english");
  expect(st.paths.by.math.w).toBe("counting-adventure");

  await press(page, '[data-testid="path-change"]');
  await press(page, '[data-testid="path-card-math"]');
  await press(page, '[data-testid="path-go"]');
  await expect(page.getByTestId("path-view")).toHaveAttribute("data-world", "counting-adventure");
  st = await stored(page);
  expect(st.paths.cur).toBe("math");
  expect(st.paths.by.english.w).toBe("rhyme-lanterns");
});

test("keyboard only: choose a path, start it and open the game", async ({ page }) => {
  await start(page);
  await page.goto("/paths?paths=all");
  await expect(page.getByTestId("path-picker")).toBeVisible();
  await tabTo(page, "path-card-pilot");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("path-card-pilot")).toHaveAttribute("aria-pressed", "true");
  await tabTo(page, "path-go");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/path$/);
  await expect(page.getByTestId("path-title")).toHaveText("Learn to fly with Zephy");
  await tabTo(page, "path-change");
  await tabTo(page, "path-play");
  await expect(page.getByTestId("path-play")).toHaveAttribute("aria-label", /^Play Zephy's Sky Hoops, level \d+$/);
  await page.keyboard.press(" ");
  await expect(page).toHaveURL(/\/play\/sky-hoops$/);
});

for (const vp of [{ width: 390, height: 844 }, { width: 915, height: 412 }, { width: 1024, height: 1366 }, { width: 1280, height: 800 }]) {
  test(`no overflow at ${vp.width}x${vp.height}: picker and your path`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "viewport sweep runs once (desktop project)");
    await start(page, { progress: progress({ "glow-cave-hops": 1 }), paths: { v: 1, cur: "math", by: { math: { w: "glow-cave-hops", easy: 0, hard: 0 } }, run: null } });
    await page.setViewportSize(vp);
    await page.goto("/paths?paths=all");
    await expect(page.getByTestId("path-picker")).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/vp-${vp.width}x${vp.height}-picker.png` });
    await noOverflow(page, '[data-testid="path-go"], [data-testid="view-today"], [data-testid="view-path"], [data-testid="view-explore"], [data-testid="path-picker"], [data-testid="sound-toggle"]');
    // targets: every path card and the Go button are at least 64 px tall
    for (const h of await page.locator('[data-testid^="path-card-"], [data-testid="path-go"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(64);

    await page.goto("/path");
    await expect(page.getByTestId("path-view")).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/vp-${vp.width}x${vp.height}-your-path.png` });
    await noOverflow(page, '[data-testid="path-play"], [data-testid="path-change"], [data-testid="path-hear"], [data-testid="path-title"], [data-testid="path-stop-glow-cave-hops"], [data-testid="view-path"], [data-testid="sound-toggle"]');
    for (const h of await page.locator('[data-testid="path-play"], [data-testid="path-change"], [data-testid="path-hear"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(64);
    // the caption band never covers the actions
    const band = await page.getByTestId("map-caption-band").boundingBox();
    const play = await page.getByTestId("path-play").boundingBox();
    expect(play!.y + play!.height).toBeLessThanOrEqual(band!.y + 1);
  });
}
