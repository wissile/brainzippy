import { type Page, expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { buildRound } from "../src/engine/round";
import { patternParade } from "../src/games/pattern-parade/definition";
import { decodeParade } from "../src/games/pattern-parade/logic";
import { collectErrors, press, screen, seed } from "./helpers";
import { reviewDir } from "./helpers";

/** Puff's Pattern Parade: story → 8 parade gaps by tap, drag, tap-tap and keyboard → outro → Parade Star + level up. */
const REVIEW = reviewDir("pattern-parade");
mkdirSync(REVIEW, { recursive: true });
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];

const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 30_000 });

/** The exercise on screen, rebuilt from the saved round (same level + seed → same exercises). */
async function current(page: Page) {
  await answering(page);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).round as { level: number; seed: number });
  const ex = buildRound(patternParade, { level: saved.level, seed: saved.seed }).exercises.find((e) => e.id === id);
  expect(ex, id).toBeDefined();
  return { id, ex: ex!, parade: decodeParade(ex!) };
}

const pick = (kind: string) => `[data-testid="choice"][data-value="${kind}"]`;
const gap = (j: number) => `[data-testid="pp-gap"][data-gap="${j}"]`;

async function dragTo(page: Page, kind: string, j: number) {
  const from = (await page.locator(pick(kind)).boundingBox())!;
  const to = (await page.locator(gap(j)).boundingBox())!;
  const sx = from.x + from.width / 2, sy = from.y + from.height / 2;
  const tx = to.x + to.width / 2, ty = to.y + to.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(sx + ((tx - sx) * k) / 12, sy + ((ty - sy) * k) / 12);
  await page.mouse.up();
}

type Way = "tap" | "drag" | "taptap" | "keyboard";
async function fill(page: Page, kinds: string[], way: Way) {
  for (let j = 0; j < kinds.length; j++) {
    const k = kinds[j]!;
    if (way === "drag") await dragTo(page, k, j);
    else if (way === "taptap") {
      await press(page, gap(j));
      await expect(page.locator(gap(j))).toHaveClass(/is-target/);
      await press(page, pick(k));
    } else if (way === "keyboard") {
      await page.locator(pick(k)).focus();
      await page.keyboard.press("Enter");
    } else await press(page, pick(k));
    if (kinds.length > 1) await expect(page.locator(gap(j))).toHaveAttribute("data-kind", k);
  }
  if (kinds.length > 1) {
    if (way === "keyboard") {
      await page.getByTestId("done").focus();
      await page.keyboard.press("Enter");
    } else await press(page, '[data-testid="done"]');
  }
}

async function nextExercise(page: Page, id: string) {
  await expect
    .poll(async () => ((await screen(page).count()) === 0 ? "done" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 40_000 })
    .not.toBe(id);
}

async function noOverflow(page: Page) {
  const vp = page.viewportSize()!;
  const over = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
  expect(over.w).toBeLessThanOrEqual(vp.width + 1);
  expect(over.h).toBeLessThanOrEqual(vp.height + 1);
  for (const sel of ['[data-testid="choice"]', '[data-testid="pp-gap"]', '[data-testid="done"]']) {
    for (const box of await Promise.all((await page.locator(sel).all()).map((c) => c.boundingBox()))) {
      if (!box) continue;
      expect(Math.min(box.width, box.height), sel).toBeGreaterThanOrEqual(63.5);
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.y).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 1);
    }
  }
}

test("child fills Puff's parade by tap, drag, tap-tap and keyboard, and levels up", async ({ page }, info) => {
  const errors = collectErrors(page);
  await seed(page, { muted: true });
  const shot = (name: string) => page.screenshot({ path: `${REVIEW}/${info.project.name}-${name}.png` });

  await page.goto("/play/pattern-parade");
  await press(page, '[data-testid="story-begin"]');
  await expect(page.getByTestId("story")).toBeVisible();
  await page.waitForTimeout(600);
  await shot("01-story");
  await press(page, '[data-testid="story-skip"]');

  const first = await current(page);
  expect(first.ex.tutorial).toBe(true);
  await expect(page.getByTestId("hand-pointer")).toBeVisible({ timeout: 20_000 }); // tutorial hand points at the gap
  await shot("02-play-tutorial");
  await noOverflow(page);

  const ways: Way[] = ["tap", "drag", "taptap", "keyboard", "tap", "drag", "taptap", "keyboard"];
  for (let i = 0; i < 8; i++) {
    const { id, parade, ex } = await current(page);
    let way = ways[i]!;
    if (way === "drag" && info.project.name !== "desktop") way = "tap"; // touch drag is covered on desktop (pointer events)
    if (i === 0) {
      // first miss: never punished — the wrong float is greyed out and Gloop explains the strategy
      const wrong = parade.cart.find((k) => k !== parade.answer[0])!;
      await press(page, pick(wrong));
      await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
      await answering(page);
      await expect(page.locator(pick(wrong))).toHaveAttribute("aria-disabled", "true");
      await expect(page.locator(gap(0))).toHaveAttribute("data-kind", "");
    }
    if (i === 3) await shot("03-play-mid");
    await fill(page, parade.answer, way);
    await expect(screen(page)).toHaveAttribute("data-phase", /feedback|solved/);
    await expect(page.getByTestId("parade-board")).toHaveClass(/is-solved/);
    expect(ex.id).toBe(id);
    await nextExercise(page, id);
  }

  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Parade Star" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  await page.waitForTimeout(1200);
  await shot("04-reward");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("parade-star");
  expect(stored.progress.levels["pattern-parade"]).toBe(1);
  if (info.project.name === "desktop") {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-reward.png` });
    }
  }
  expect(errors).toEqual([]);
});

test("second miss shows the boxes, then the modelled parade; the child still places it", async ({ page }) => {
  const errors = collectErrors(page);
  await seed(page, { muted: true, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "pattern-parade": 1 } } });
  await page.goto("/play/pattern-parade");
  await press(page, '[data-testid="story-begin"]');
  await press(page, '[data-testid="story-skip"]');
  const { parade } = await current(page);
  expect(parade.answer.length).toBe(2);
  const distractor = parade.cart.find((k) => !parade.answer.includes(k))!;

  // miss 1: two copies of the new marcher → helper + boxes around each repeat, the new marcher is greyed out
  await fill(page, [distractor, distractor], "tap");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.getByTestId("parade-board")).toHaveClass(/show-boxes/);
  await expect(page.locator(pick(distractor))).toHaveAttribute("aria-disabled", "true");

  // miss 2: right marchers, wrong order → the worked example marches along and shows ghosts in the gaps
  await fill(page, [parade.answer[1]!, parade.answer[0]!], "tap");
  await expect(page.locator(".pp-ghost").first()).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(`${pick(parade.answer[0]!)}.is-model`)).toBeVisible();
  await page.screenshot({ path: `${REVIEW}/desktop-05-model.png` });
  await fill(page, parade.answer, "tap");
  await expect(page.getByTestId("parade-board")).toHaveClass(/is-solved/);
  expect(errors).toEqual([]);
});

test("parade fits every viewport at every kind of level", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport sweep runs once (it resizes through all four sizes)");
  for (const level of [0, 1, 4, 6, 8]) {
    await page.context().clearCookies();
    await page.goto("/");
    await page.evaluate((lv) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem(
        "bz.v1",
        JSON.stringify({ muted: true, ageBand: "ages-3-5", profile: { monster: { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" }, monsterName: "Ziggy", kidName: "Testkid", step: "done", parentSignup: "skipped" }, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "pattern-parade": lv } }, round: null }),
      );
    }, level);
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.goto("/play/pattern-parade");
      const begin = page.locator('[data-testid="story-begin"], [data-testid="start-game"]').first();
      await begin.waitFor({ state: "visible", timeout: 20_000 });
      const resumed = (await begin.getAttribute("data-testid")) === "start-game";
      if (resumed && level === 0) {
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-intro.png` });
      }
      await begin.click({ force: true });
      if (!resumed) {
        if (level === 0) {
          await page.waitForTimeout(500);
          await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-story.png` });
        }
        await press(page, '[data-testid="story-skip"]');
      }
      await answering(page);
      await page.waitForTimeout(900);
      await noOverflow(page);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-play-l${level}.png` });
      if (level === 0 && vp === VIEWPORTS[0]) {
        // the resume card (Puff's intro) at the phone size
        await page.reload();
        await page.getByTestId("start-game").waitFor({ state: "visible", timeout: 20_000 });
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-intro.png` });
      }
    }
  }
});
