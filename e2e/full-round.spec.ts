import { expect, test } from "@playwright/test";
import { collectErrors, enterGame, openFromMap, openGame, press, screen, seed, solve, waitForNext } from "./helpers";

test("child plays a complete round from home to sticker, then plays again", async ({ page }, info) => {
  const errors = collectErrors(page);
  // desktop runs with sound on (real timing); other devices muted for speed — captions are identical
  await seed(page, { muted: info.project.name !== "desktop" });
  const shot = (name: string) => page.screenshot({ path: `test-results/screens/${info.project.name}-${name}.png` });

  await page.goto("/");
  await expect(page.getByTestId("site-play")).toBeVisible(); // prerendered landing page
  await shot("01-home");
  await press(page, '[data-testid="site-play"]');
  await expect(page.getByTestId("map")).toBeVisible();
  await shot("02-map");
  await openFromMap(page);
  await expect(page.getByTestId("story")).toBeVisible();
  await page.waitForTimeout(1500);
  await shot("04-story");
  await enterGame(page);

  const seen = new Set<string>();
  for (let i = 0; i < 8; i++) {
    const id = await solve(page);
    expect(seen.has(id)).toBe(false);
    seen.add(id);
    if (i === 0) {
      await expect(screen(page)).toHaveAttribute("data-phase", "feedback");
      await shot("05-first-correct");
    }
    await waitForNext(page, id);
    if (i < 7) await expect(page.getByTestId("stars")).toHaveAttribute("data-done", String(i + 1));
  }
  // story ending plays, then the sticker
  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await shot("05b-outro");
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("level-up")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Counting Champ" })).toBeVisible();
  await expect(page.getByTestId("reward-monster")).toBeVisible();
  await expect(page.getByText("Ziggy saw you keep trying!")).toBeVisible();
  await shot("06-achievement");

  // layout sanity on the reward screen: action buttons are fully on-screen
  const vp = page.viewportSize()!;
  for (const id of ["play-again", "more-games"]) {
    const box = (await page.getByTestId(id).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 1);
  }

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("counting-champ");
  expect(stored.progress.roundsCompleted).toBe(1);
  expect(JSON.stringify(stored)).not.toMatch(/email|birth/i); // child name is device-only by design; network test asserts it never leaves

  // level-up: the next round starts a level higher and skips the tutorial item
  expect(stored.progress.levels["counting-adventure"]).toBe(1);
  await press(page, '[data-testid="play-again"]');
  await expect(screen(page)).not.toHaveAttribute("data-exercise", "ca-tap-3-apple");
  await expect(page.getByTestId("level").first()).toContainText("2");
  await press(page, '[data-testid="nav-back"]');
  await expect(page.getByTestId("map")).toBeVisible();
  expect(errors).toEqual([]);
});

test("tap targets are at least 44px and nothing overflows during play", async ({ page }) => {
  await seed(page, { muted: true });
  await openGame(page);
  await expect(screen(page)).toHaveAttribute("data-phase", "counting");
  await page.waitForTimeout(1500); // let drop-in animations finish before measuring
  const vp = page.viewportSize()!;
  const targets = page.locator('[data-testid="count-object"], [data-testid="nav-back"], [data-testid="sound-toggle"], [data-testid="replay"]');
  for (const box of await targets.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))) {
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.right).toBeLessThanOrEqual(vp.width + 1);
    expect(box.bottom).toBeLessThanOrEqual(vp.height + 1);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test("tutorial hand appears inside the viewport and does not shift the layout", async ({ page }) => {
  await seed(page, { muted: true });
  await openGame(page);
  await expect(screen(page)).toHaveAttribute("data-phase", "counting");
  await page.waitForTimeout(1200);
  const before = (await page.locator(".board").boundingBox())!;
  const hand = page.getByTestId("hand-pointer");
  await expect(hand).toBeVisible({ timeout: 10_000 });
  const vp = page.viewportSize()!;
  const hb = (await hand.boundingBox())!;
  expect(hb.y).toBeGreaterThanOrEqual(0);
  expect(hb.y + hb.height).toBeLessThanOrEqual(vp.height + 40);
  expect(hb.x + hb.width).toBeLessThanOrEqual(vp.width + 40);
  const after = (await page.locator(".board").boundingBox())!;
  expect(Math.abs(after.height - before.height)).toBeLessThan(2);
});

test("speech captions never cover objects the child must count", async ({ page }) => {
  await seed(page, { muted: true });
  await openGame(page);
  for (let i = 0; i < 3; i++) await press(page, '[data-testid="count-object"][data-counted="false"]');
  await expect(screen(page)).toHaveAttribute("data-phase", "answering");
  await press(page, '[data-testid="choice"][data-value="2"]');
  const bubble = page.getByTestId("speech-bubble").last();
  await expect(bubble).toBeVisible();
  await page.waitForTimeout(400);
  const b = (await bubble.boundingBox())!;
  const objs = await page.locator('[data-testid="count-object"], [data-testid="choice"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
  for (const o of objs) {
    const overlap = Math.max(0, Math.min(b.x + b.width, o.right) - Math.max(b.x, o.left)) * Math.max(0, Math.min(b.y + b.height, o.bottom) - Math.max(b.y, o.top));
    expect(overlap / (o.width * o.height)).toBeLessThan(0.05);
  }
  // …nor the prompt: on small screens the caption replaces the pill's text (inside the pill, clear of Replay);
  // on wide screens it sits beside the mascot, clear of the whole pill
  const area = (o: { left: number; right: number; top: number; bottom: number }) =>
    Math.max(0, Math.min(b.x + b.width, o.right) - Math.max(b.x, o.left)) * Math.max(0, Math.min(b.y + b.height, o.bottom) - Math.max(b.y, o.top));
  const replay = await page.getByTestId("replay").evaluate((e) => e.getBoundingClientRect().toJSON());
  expect(area(replay)).toBe(0);
  const pill = await page.getByTestId("prompt").evaluate((e) => e.getBoundingClientRect().toJSON());
  if (await bubble.evaluate((e) => e.classList.contains("prompt-caption"))) {
    expect(b.x).toBeGreaterThanOrEqual(pill.left - 1);
    expect(b.x + b.width).toBeLessThanOrEqual(pill.right + 1);
    expect(b.y).toBeGreaterThanOrEqual(pill.top - 1);
    expect(b.y + b.height).toBeLessThanOrEqual(pill.bottom + 1);
  } else expect(area(pill)).toBe(0);
});

test("legacy /play pickers open Explore", async ({ page }) => {
  await seed(page, {});
  await page.goto("/play");
  await expect(page).toHaveURL(/\/explore$/);
  await page.goto("/play/ages-3-5");
  await expect(page).toHaveURL(/\/explore$/);
});
