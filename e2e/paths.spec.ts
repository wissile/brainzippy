import { type Page, expect, test } from "@playwright/test";
import { ONBOARDED, enterGame, press, reviewDir, solve, waitForNext } from "./helpers";

/**
 * Learning paths (docs/PATHS.md, D-034, D-041): choosing a path on the ocean map, its journey island, playing from
 * it, the step-up after easy rounds (seeded state), the host's offer between rounds, switching path, keyboard-only
 * use and layout at the four review viewports. Only English is live, so most tests use the dev/localhost override
 * `?paths=all`. The ocean map and journey islands themselves are covered by e2e/islands.spec.ts.
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

/** Play a whole round; the first `wrong` exercises get one wrong answer first. */
async function playRound(page: Page, wrong = 0) {
  await enterGame(page);
  for (let i = 0; i < 8; i++) {
    const id = await solve(page, { wrongFirst: i < wrong });
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

/** Sail to the selected island: Skip ends the boat ride if one plays. */
async function sail(page: Page) {
  await press(page, '[data-testid="path-go"]');
  const skip = page.getByTestId("ocean-skip");
  if (await skip.isVisible().catch(() => false)) await press(page, '[data-testid="ocean-skip"]');
}

/** Press Tab until the element with `testid` has focus (keyboard-only navigation). */
async function tabTo(page: Page, testid: string, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((t) => (document.activeElement as HTMLElement | null)?.dataset.testid === t, testid)) return;
  }
  throw new Error(`Tab never reached ${testid}`);
}

test("only live paths show without the dev override: English is live (ages 3–14), Pilot is next (in fog)", async ({ page }) => {
  await start(page);
  await page.goto("/map");
  await expect(page.getByTestId("trail")).toBeVisible(); // a new child's boat is at home: today's trail
  await expect(page.getByTestId("view-explore")).toBeVisible();
  await expect(page.getByTestId("view-islands")).toBeVisible(); // a live path exists
  await page.goto("/paths");
  await expect(page.getByTestId("path-picker")).toBeVisible();
  await expect(page.getByTestId("path-card-english")).toHaveAttribute("aria-label", /Learn English with Sarah/);
  await expect(page.getByTestId("path-card-pilot")).toHaveAttribute("aria-label", "Sky School: coming soon");
  for (const id of ["math", "cs", "money", "sci"]) await expect(page.getByTestId(`path-card-${id}`)).toHaveCount(0);
});

test("pick a path, hear it, sail there, play from it, come back to the island", async ({ page }, info) => {
  await start(page);
  await page.goto("/paths?paths=all");
  await expect(page.getByTestId("path-picker")).toBeVisible();
  await expect(page.getByTestId("view-islands")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("path-go")).toHaveCount(0); // nothing chosen yet
  await expect(page.getByTestId("path-card-pilot")).toHaveAttribute("aria-label", /Learn to fly with Ziggy/);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-01-ocean.png` });

  await press(page, '[data-testid="path-card-math"]');
  await expect(page.getByTestId("path-card-math")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("ocean-card")).toContainText("Count and build with Bobbo");
  await expect(page.getByTestId("live-caption")).toHaveText("Count, add and share with Bobbo."); // title, then pitch: always captioned
  await sail(page);

  await expect(page).toHaveURL(/\/path$/);
  const view = page.getByTestId("path-view");
  await expect(page.getByTestId("path-title")).toHaveText("Count and build with Bobbo");
  await expect(page.getByTestId("path-title")).toBeFocused(); // focus moves to the new screen
  await expect(view).toHaveAttribute("data-world", "counting-adventure"); // age band 3–5 → age 4 → first maths world for 4
  await expect(view).toHaveAttribute("data-level", "0");
  await expect(page.locator('.journey-stop[aria-current="step"]')).toHaveAttribute("data-world", "counting-adventure");
  await expect(page.locator(".journey-stop")).toHaveCount(5); // ages 3–5: five stops; 10 rounds left today, so all glow
  await expect(page.locator(".journey-stop").last()).toHaveAttribute("data-state", "today");
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-02-island.png` });
  expect((await stored(page)).paths).toMatchObject({ v: 1, cur: "math", at: "math", by: { math: { w: "counting-adventure", easy: 0, hard: 0 } } });

  // today's trail (Monster Island) prefers the chosen path: its world is the first learning stop
  await press(page, '[data-testid="view-islands"]');
  await press(page, '[data-testid="ocean-home"]');
  await sail(page);
  await expect(page.getByTestId("trail")).toBeVisible();
  const plan = (await stored(page)).progress.daily.plan.stops as { w: string; k: string }[];
  expect(plan.find((s) => s.k !== "review" && s.k !== "pick")?.w).toBe("counting-adventure");
  await press(page, '[data-testid="view-islands"]');
  await press(page, '[data-testid="path-card-math"]');
  await sail(page);
  await expect(page).toHaveURL(/\/path$/);

  await press(page, '[data-testid="path-play"]');
  await expect(page).toHaveURL(/\/play\/counting-adventure$/);
  await playRound(page);
  await expect(page.getByTestId("nav-back")).toHaveAttribute("aria-label", "Back to my path");
  // placement (A3): one easy round in a new world skips ahead, as far as the round showed (≤ level + 2)
  await expect(page.getByTestId("level-up")).toHaveText("Zoom! You're ready for a bigger challenge!");
  await expect(page.getByTestId("live-caption")).toHaveText("Zoom! You're ready for a bigger challenge!", { timeout: 25_000 }); // the note is spoken
  await press(page, '[data-testid="more-games"]');
  await expect(page).toHaveURL(/\/path$/); // a round started from the island returns to it
  await expect(page.getByTestId("path-view")).toBeVisible();
  const st = await stored(page);
  expect(st.paths.run).toEqual({ p: "math", day: DAY, n: 1, r: 100 });
  expect(st.progress.levels["counting-adventure"]).toBe(2);
  // the played level now shows behind the glowing stop (a skipped level is not shown as done)
  await expect(page.locator(".journey-stop.done")).toHaveCount(1);
});

test("two easy rounds in a row skip ahead (evidence-capped) and the note is spoken; steady play brings no offer", async ({ page }) => {
  await start(page, {
    progress: progress({ "counting-adventure": 2 }),
    paths: { v: 1, cur: "math", by: { math: { w: "counting-adventure", easy: 1, hard: 0, n: 5 } }, run: { p: "math", day: DAY, n: 2, r: 100 } },
  });
  await page.goto("/path?paths=all");
  await expect(page.getByTestId("path-view")).toHaveAttribute("data-level", "2");
  await press(page, '[data-testid="path-play"]');
  await playRound(page); // every item first try = the 2nd easy round in a row
  await expect(page.getByTestId("level-up")).toHaveText("Zoom! You're ready for a bigger challenge!");
  expect((await stored(page)).progress.levels["counting-adventure"]).toBe(4); // round level 2 + 2 (the round reached higher items)
  await expect(page.getByTestId("live-caption")).toHaveText("Zoom! You're ready for a bigger challenge!", { timeout: 25_000 });
  await page.waitForTimeout(2500);
  await expect(page.getByTestId("path-offer")).toHaveCount(0); // 3rd round of the run, but no drop: no offer
});

/** Seed the 3rd round of a run whose first round was perfect, so a drop of ≥ 20 points brings the offer (T1). */
const tiredRun = (extraLevels: Record<string, number> = {}) => ({
  progress: progress({ "counting-adventure": 1, ...extraLevels }),
  paths: { v: 1, cur: "math", by: { math: { w: "counting-adventure", easy: 0, hard: 0, n: 5 } }, run: { p: "math", day: DAY, n: 2, r: 100 } },
});

test("a drop in the 3rd round brings the host's offer: full spoken text, Keep going first, app inert, fits small screens", async ({ page }, info) => {
  await start(page, tiredRun());
  await page.goto("/path?paths=all");
  await press(page, '[data-testid="path-play"]');
  await playRound(page, 2); // 6 of 8 first try = 75 %, 25 points below the run's first round
  const offer = page.getByTestId("path-offer");
  await expect(offer).toBeVisible({ timeout: 25_000 });
  await expect(offer).toHaveAttribute("data-reason", "tired");
  await expect(page.getByTestId("path-offer-text")).toHaveText("Great playing! Want to try another path for a while? You can come back anytime.");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("path-offer-no")).toBeFocused(); // the default is to keep going
  await expect(page.locator("#root")).toHaveAttribute("inert", "");
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("path-offer-yes")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByTestId("path-offer-no")).toBeFocused(); // focus stays in the dialog
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-03-offer.png` });
  for (const vp of [{ width: 915, height: 412 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-03-offer-${vp.width}x${vp.height}.png` });
    for (const b of await page.locator('[data-testid="path-offer-yes"], [data-testid="path-offer-no"], [data-testid="path-offer-text"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))) {
      expect(b.left).toBeGreaterThanOrEqual(-1);
      expect(b.top).toBeGreaterThanOrEqual(-1);
      expect(b.right).toBeLessThanOrEqual(vp.width + 1);
      expect(b.bottom).toBeLessThanOrEqual(vp.height + 1);
    }
    for (const h of await page.locator('[data-testid="path-offer-yes"], [data-testid="path-offer-no"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(64);
  }
  await page.keyboard.press("Escape");
  await expect(offer).toHaveCount(0);
  await expect(page.locator("#root")).not.toHaveAttribute("inert", "");
  await expect(page.getByTestId("achievement")).toBeVisible(); // still on the reward screen: nothing moved
  expect((await stored(page)).paths.offered).toEqual({ day: DAY, p: ["math"] });
});

test("accepting the offer opens the ocean; switching path keeps each path's stop", async ({ page }) => {
  await start(page, tiredRun({ "shape-squish": 3 }));
  await page.goto("/path?paths=all");
  await press(page, '[data-testid="path-play"]');
  await playRound(page, 2);
  await expect(page.getByTestId("path-offer")).toBeVisible({ timeout: 25_000 });
  await press(page, '[data-testid="path-offer-yes"]');
  await expect(page).toHaveURL(/\/paths$/);
  await expect(page.getByTestId("path-picker")).toHaveAttribute("data-boat", "math"); // the boat waits at the current island
  await expect(page.getByTestId("path-card-math")).toHaveAttribute("aria-label", /you are here/);

  await press(page, '[data-testid="path-card-english"]');
  await sail(page);
  await expect(page.getByTestId("path-title")).toHaveText("Learn English with Sarah");
  await expect(page.getByTestId("path-view")).toHaveAttribute("data-world", "rhyme-lanterns");
  let st = await stored(page);
  expect(st.paths.cur).toBe("english");
  expect(st.paths.by.math.w).toBe("counting-adventure");

  await press(page, '[data-testid="view-islands"]');
  await press(page, '[data-testid="path-card-math"]');
  await sail(page);
  await expect(page.getByTestId("path-view")).toHaveAttribute("data-world", "counting-adventure");
  st = await stored(page);
  expect(st.paths.cur).toBe("math");
  expect(st.paths.by.english.w).toBe("rhyme-lanterns");
});

test("keyboard only: choose a path, sail, start it and open the game", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await page.goto("/paths?paths=all");
  await expect(page.getByTestId("path-picker")).toBeVisible();
  await expect(page.locator("#ocean-title")).toBeFocused();
  await tabTo(page, "path-card-pilot");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("path-card-pilot")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("path-go")).toBeFocused(); // the card takes focus
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/path$/);
  await expect(page.getByTestId("path-title")).toHaveText("Learn to fly with Ziggy");
  await tabTo(page, "path-play");
  await expect(page.getByTestId("path-play")).toHaveAttribute("aria-label", /^Play Zephy's Sky Hoops, level \d+$/);
  await page.keyboard.press(" ");
  await expect(page).toHaveURL(/\/play\/sky-hoops$/);
});

for (const vp of [{ width: 390, height: 844 }, { width: 915, height: 412 }, { width: 1024, height: 1366 }, { width: 1280, height: 800 }]) {
  test(`no overflow at ${vp.width}x${vp.height}: ocean (every path) and a journey island`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "viewport sweep runs once (desktop project)");
    await start(page, { progress: progress({ "glow-cave-hops": 1 }), paths: { v: 1, cur: "math", by: { math: { w: "glow-cave-hops", easy: 0, hard: 0 } }, run: null } });
    await page.setViewportSize(vp);
    await page.goto("/paths?paths=all");
    await expect(page.getByTestId("path-picker")).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/vp-${vp.width}x${vp.height}-ocean.png` });
    await noOverflow(page, '[data-testid="view-islands"], [data-testid="view-explore"], [data-testid="path-picker"], [data-testid="sound-toggle"], [data-testid="age-badge"]');
    // every island is a big target
    for (const h of await page.locator("button.ocean-island").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(64);

    await page.goto("/path");
    await expect(page.getByTestId("path-view")).toBeVisible();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/vp-${vp.width}x${vp.height}-island.png` });
    await noOverflow(page, '[data-testid="path-play"], [data-testid="path-hear"], [data-testid="view-islands"], [data-testid="sound-toggle"]');
    expect((await page.getByTestId("path-play").boundingBox())!.height).toBeGreaterThanOrEqual(56);
    expect((await page.getByTestId("path-hear").boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // the caption band never covers the glowing stop
    const band = await page.getByTestId("map-caption-band").boundingBox();
    const play = await page.getByTestId("path-play").boundingBox();
    expect(play!.y + play!.height).toBeLessThanOrEqual(band!.y + 1);
  });
}
