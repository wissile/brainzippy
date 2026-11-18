import { type Page, expect, test } from "@playwright/test";
import { collectErrors, press, screen, seed, waitForNext } from "./helpers";

/**
 * Rumble's Sleepy Trail: the child walks Rumble to a fraction's post (tap a post, drag Rumble, or arrow keys)
 * and presses "Nap here" (data-testid="choice"); names fractions with cards; compares two trails; estimates on
 * unmarked trails. Synthetic state only.
 */
type How = "tap" | "key" | "drag";
interface Info { id: string; mode: string; a: number; d: number; P: number; M: number; a2: number; d2: number }

async function info(page: Page): Promise<Info> {
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 30_000 });
  const t = page.getByTestId("trail");
  const n = async (k: string) => Number(await t.getAttribute(`data-${k}`));
  return { id: (await screen(page).getAttribute("data-exercise"))!, mode: (await t.getAttribute("data-mode"))!, a: await n("a"), d: await n("d"), P: await n("p"), M: await n("m"), a2: await n("a2"), d2: await n("d2") };
}
const posIs = (page: Page, who: "rumble" | "bobbo", k: number) => expect(page.getByTestId(who)).toHaveAttribute("data-pos", String(k), { timeout: 10_000 });
const post = (page: Page, who: string, k: number) => `[data-testid="post"][data-lane="${who}"][data-value="${k}"]`;

async function center(page: Page, sel: string) {
  const b = (await page.locator(sel).first().boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function dragTo(page: Page, who: string, sel: string) {
  const from = await center(page, `[data-testid="${who}"]`);
  const to = await center(page, sel);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let s = 1; s <= 10; s++) await page.mouse.move(from.x + ((to.x - from.x) * s) / 10, from.y + ((to.y - from.y) * s) / 10);
  await page.mouse.up();
}

/** Put a critter on post k. */
async function walk(page: Page, who: "rumble" | "bobbo", k: number, how: How) {
  if (how === "tap") await press(page, post(page, who, k));
  else if (how === "drag") await dragTo(page, who, post(page, who, k));
  else {
    await page.getByTestId(who).focus();
    const cur = Number(await page.getByTestId(who).getAttribute("data-pos"));
    for (let i = cur; i < k; i++) await page.keyboard.press("ArrowRight");
    for (let i = cur; i > k; i--) await page.keyboard.press("ArrowLeft");
  }
  await posIs(page, who, k);
}

async function solve(page: Page, how: How) {
  const ex = await info(page);
  if (ex.mode === "place") {
    const k = (ex.a * ex.P) / ex.d;
    await walk(page, "rumble", k, how);
    await expect(page.getByTestId("choice")).toHaveAttribute("data-value", String(k));
    if (how === "key") await page.keyboard.press("Enter");
    else await press(page, '[data-testid="choice"]');
  } else if (ex.mode === "name") {
    if (how === "key") {
      await page.locator(`[data-testid="choice"][data-value="f${ex.a}-${ex.d}"]`).focus();
      await page.keyboard.press("Enter");
    } else await press(page, `[data-testid="choice"][data-value="f${ex.a}-${ex.d}"]`);
  } else if (ex.mode === "compare") {
    await walk(page, "rumble", ex.a, how);
    await walk(page, "bobbo", ex.a2, how);
    const farther = ex.a * ex.d2 > ex.a2 * ex.d ? "rumble" : "bobbo";
    await press(page, `[data-testid="choice"][data-value="${farther}"]`);
  } else {
    const ticks = (ex.a * 24) / ex.d;
    if (how === "tap") {
      const b = (await page.getByTestId("trail-pad").boundingBox())!;
      const vertical = (await page.getByTestId("trail").getAttribute("data-vertical")) === "true";
      const f = ticks / (24 * ex.M);
      const x = vertical ? b.x + b.width / 2 : b.x + 12 + f * (b.width - 24);
      const y = vertical ? b.y + b.height - 12 - f * (b.height - 24) : b.y + b.height / 2;
      await page.mouse.click(x, y);
      await expect.poll(async () => Math.abs(Number(await page.getByTestId("rumble").getAttribute("data-pos")) - ticks)).toBeLessThanOrEqual(1);
    } else {
      await page.getByTestId("rumble").focus();
      for (let i = 0; i < ticks; i++) await page.keyboard.press("ArrowRight");
      await posIs(page, "rumble", ticks);
    }
    await press(page, '[data-testid="choice"]');
  }
  return ex;
}

async function begin(page: Page, state: Record<string, unknown> = {}) {
  await seed(page, { muted: true, ...state });
  await page.goto("/play/sleepy-trail");
  await press(page, '[data-testid="story-begin"]');
  await expect(page.getByTestId("story")).toBeVisible();
  await press(page, '[data-testid="story-skip"]');
}

test("level 1: a full round by tap, keyboard and drag; diagnosed hint, then a modelled walk; sticker and level up", async ({ page }, info_) => {
  const errors = collectErrors(page);
  const shot = (name: string) => page.screenshot({ path: `test-results/screens/${info_.project.name}-sleepy-trail-${name}.png` });
  await begin(page);
  const hows: How[] = ["tap", "tap", "key", "drag", "tap", "key", "drag", "tap"];
  for (let i = 0; i < 8; i++) {
    const ex = await info(page);
    await posIs(page, "rumble", ex.mode === "name" ? ex.a : 0);
    if (i === 0) {
      expect(ex.id).toBe("st-tutorial-1-2");
      await shot("01-tutorial");
    }
    if (i === 1 && ex.mode === "place") {
      // first miss: one jump too far → Gloop explains "count the jumps", the wrong post greys out, Rumble walks home
      const k = (ex.a * ex.P) / ex.d;
      await walk(page, "rumble", k + 1, "tap");
      await press(page, '[data-testid="choice"]');
      await expect(page.getByTestId("helper")).toContainText("Count the jumps", { timeout: 15_000 });
      await shot("02-diagnosed-hint");
      await info(page);
      await posIs(page, "rumble", 0);
      await expect(page.locator(post(page, "rumble", k + 1))).toHaveClass(/is-out/);
      // second miss: the worked example walks the jumps, Rumble ends on the right post, "Nap here" glows
      await walk(page, "rumble", k > 1 ? k - 1 : k + 2, "tap");
      await press(page, '[data-testid="choice"]');
      await info(page);
      await posIs(page, "rumble", k);
      await expect(page.locator(post(page, "rumble", k))).toHaveClass(/is-model/);
      await expect(page.getByTestId("choice")).toHaveClass(/is-model/);
      await shot("03-model");
      await press(page, '[data-testid="choice"]');
    } else {
      await solve(page, hows[i]!);
    }
    if (i === 0) {
      await expect(page.getByTestId("pillow")).toBeVisible();
      await shot("04-correct");
    }
    await waitForNext(page, ex.id);
  }
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Trail Marker" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  await shot("05-sticker");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("trail-marker");
  expect(stored.progress.levels["sleepy-trail"]).toBe(1);
  expect(errors).toEqual([]);
});

test("level 7: compare two trails and estimate on unmarked trails (estimate miss shows the halfway mark)", async ({ page }, info_) => {
  const errors = collectErrors(page);
  await begin(page, { progress: { v: 1, stickers: [], roundsCompleted: 3, skills: {}, levels: { "sleepy-trail": 6 } } });
  let missedEstimate = false;
  for (let i = 0; i < 8; i++) {
    const ex = await info(page);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `overflow on ${ex.id}`).toBe(true);
    if (i === 0) {
      expect(ex.mode).toBe("compare");
      await page.screenshot({ path: `test-results/screens/${info_.project.name}-sleepy-trail-06-compare.png` });
    }
    if (ex.mode === "estimate" && !missedEstimate) {
      missedEstimate = true;
      await press(page, '[data-testid="choice"]'); // Rumble still on 0: too low
      await expect(page.getByTestId("helper")).toContainText("Not quite far enough", { timeout: 15_000 });
      await info(page);
      await expect(page.getByTestId("half-mark").first()).toBeVisible();
      await page.screenshot({ path: `test-results/screens/${info_.project.name}-sleepy-trail-07-estimate-hint.png` });
    }
    await solve(page, i % 2 ? "key" : "tap");
    await waitForNext(page, ex.id);
  }
  expect(missedEstimate).toBe(true);
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  expect(errors).toEqual([]);
});

test("trail never overflows and controls meet tap-target sizes", async ({ page }) => {
  await begin(page);
  await info(page);
  const vp = page.viewportSize()!;
  for (const id of ["step-back", "choice", "step-forward", "rumble"]) {
    const box = (await page.getByTestId(id).boundingBox())!;
    expect(box.x, id).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, id).toBeLessThanOrEqual(vp.width + 1);
    expect(box.y + box.height, id).toBeLessThanOrEqual(vp.height + 1);
    if (id !== "rumble") expect(Math.min(box.width, box.height), id).toBeGreaterThanOrEqual(64);
  }
  for (const b of await page.getByTestId("post").all()) {
    const box = (await b.boundingBox())!;
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

const VIEWPORTS = [[390, 844], [915, 412], [1024, 1366], [1280, 800]] as const;
test("review screenshots: story, play (each mode) and reward at four viewports", async ({ browser }, info_) => {
  test.skip(info_.project.name !== "desktop", "one run is enough");
  test.setTimeout(900_000);
  const dir = "/home/claude/review/sleepy-trail";
  for (const [w, h] of VIEWPORTS) {
    const touch = w < h;
    for (const level of [0, 3, 4, 5, 6, 8]) {
      const ctx = await browser.newContext({ baseURL: `http://localhost:${process.env.PW_PORT ?? 4173}`, viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch && w < 600 });
      const page = await ctx.newPage();
      await seed(page, { muted: true, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "sleepy-trail": level } } });
      await page.goto("/play/sleepy-trail");
      await press(page, '[data-testid="story-begin"]');
      if (level === 0) {
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${dir}/${w}x${h}-story.png` });
      }
      await press(page, '[data-testid="story-skip"]');
      const ex = await info(page);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${dir}/${w}x${h}-play-l${level}-${ex.mode}.png` });
      const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.documentElement.scrollHeight <= window.innerHeight + 1);
      expect(fits, `${w}x${h} level ${level}`).toBe(true);
      if (level === 6 || level === 0) {
        await solve(page, "tap");
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${dir}/${w}x${h}-play-l${level}-solved.png` });
      }
      if (level === 0) {
        await waitForNext(page, ex.id);
        for (let i = 1; i < 8; i++) {
          const e = await solve(page, "tap");
          await waitForNext(page, e.id);
        }
        await press(page, '[data-testid="outro-skip"]');
        await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
        await page.waitForTimeout(1200);
        await page.screenshot({ path: `${dir}/${w}x${h}-reward.png` });
      }
      await ctx.close();
    }
  }
});
