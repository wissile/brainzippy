import { mkdirSync } from "node:fs";
import { type Locator, type Page, expect, test } from "@playwright/test";
import { formatEq, solve } from "../src/games/balance-island/logic";
import { ONBOARDED, collectErrors, press, screen, seed } from "./helpers";
import { reviewDir } from "./helpers";

/** Balance Scale Island: balance pans by drag, tap-tap and keyboard; hints; word stories; a full round to the sticker. */

const REVIEW = reviewDir("balance-island");
const board = (page: Page) => page.getByTestId("balance-board");

async function eq(page: Page) {
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
  const [lx, ln, rx, rn] = (await board(page).getAttribute("data-eq"))!.split(",").map(Number) as [number, number, number, number];
  const pans = { l: { x: lx, n: ln }, r: { x: rx, n: rn } };
  return { pans, x: solve(pans)!, text: formatEq(pans.l.x >= pans.r.x ? pans : { l: pans.r, r: pans.l }) };
}

async function helperGone(page: Page) {
  await page.getByTestId("helper").waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
}

async function enter(page: Page) {
  await page.goto("/play/balance-island");
  await press(page, '[data-testid="story-begin"]');
  await press(page, '[data-testid="story-skip"]');
}

async function drag(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  const ax = a.x + a.width / 2, ay = a.y + a.height / 2, bx = b.x + b.width / 2, by = b.y + b.height / 2;
  await page.mouse.move(ax, ay);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(ax + ((bx - ax) * i) / 10, ay + ((by - ay) * i) / 10);
  await page.mouse.up();
}

const count = (page: Page, side: "l" | "r") =>
  page.locator(`[data-testid="pan-weights"][data-side="${side}"]`).getAttribute("data-count", { timeout: 1000 }).then(Number).catch(() => 0);

async function nextExercise(page: Page, prev: string) {
  await expect
    .poll(async () => ((await screen(page).count()) === 0 ? "round-over" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 40_000 })
    .not.toBe(prev);
}

async function noOverflow(page: Page) {
  await page.waitForTimeout(800); // entry animations settle
  const bad = await page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const out: string[] = [];
    if (document.documentElement.scrollWidth > vw + 1) out.push(`page scrolls sideways ${document.documentElement.scrollWidth}>${vw}`);
    const sel = '[data-testid="choice"], [data-testid="pan"], [data-testid^="both-"], [data-testid="undo"], [data-testid^="shelf-"], [data-testid="pan-weights"], [data-testid="pan-bags"], [data-testid="eq-option"], [data-testid="replay"]';
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const r = el.getBoundingClientRect();
      const id = `${el.dataset.testid}${el.dataset.side ?? el.dataset.value ?? ""}`;
      if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) out.push(`${id} off screen ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
      if (r.width < 43.5 || r.height < 43.5) out.push(`${id} too small ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return out;
  });
  expect(bad).toEqual([]);
}

test("tutorial: balance the scale by drag, tap-tap and keyboard; the beam tips and levels; then answer", async ({ page }, info) => {
  const errors = collectErrors(page);
  await seed(page, { muted: true });
  await enter(page);
  const { pans, x } = await eq(page);
  expect(formatEq(pans)).toBe("x + 3 = 7");
  await helperGone(page);
  await expect(page.locator('[data-testid="work-line"][data-eq="x + 3 = 7"]')).toHaveCount(1);
  const touch = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  const lw = page.locator('[data-testid="pan-weights"][data-side="l"]');
  const rw = page.locator('[data-testid="pan-weights"][data-side="r"]');

  // 1) drag one weight off the left pan: the scale tips; then off the right pan: level again (x + 2 = 6)
  if (!touch) await drag(page, lw, page.getByTestId("shelf-weight"));
  else {
    await press(page, '[data-testid="pan-weights"][data-side="l"]');
    await press(page, '[data-testid="shelf-weight"]');
  }
  await expect.poll(() => count(page, "l")).toBe(2);
  await expect(board(page)).toHaveAttribute("data-balanced", "false");
  await expect(page.getByTestId("tipped")).toBeVisible();
  await expect(page.getByTestId("scale")).toHaveAttribute("data-tilt", "1"); // right pan heavier → tips right
  if (!touch) await drag(page, rw, page.getByTestId("shelf-weight"));
  else {
    await press(page, '[data-testid="pan-weights"][data-side="r"]');
    await press(page, '[data-testid="shelf-weight"]');
  }
  await expect.poll(() => count(page, "r")).toBe(6);
  await expect(board(page)).toHaveAttribute("data-balanced", "true");
  await expect(page.locator('[data-testid="work-line"][data-eq="x + 2 = 6"]')).toHaveAttribute("data-note", "−1");

  // 2) tap-tap: pick up from a pan, then tap the counter (x + 1 = 5)
  await press(page, '[data-testid="pan-weights"][data-side="l"]');
  await expect(lw).toHaveAttribute("aria-pressed", "true");
  await press(page, '[data-testid="shelf-weight"]');
  await press(page, '[data-testid="pan-weights"][data-side="r"]');
  await press(page, '[data-testid="shelf-weight"]');
  await expect.poll(async () => [await count(page, "l"), await count(page, "r")]).toEqual([1, 5]);
  // a spare weight can go ON a pan too (tap-tap), and Undo takes it back
  await press(page, '[data-testid="shelf-weight"]');
  await press(page, '[data-testid="pan"][data-side="r"]');
  await expect.poll(() => count(page, "r")).toBe(6);
  await press(page, '[data-testid="undo"]');
  await expect.poll(() => count(page, "r")).toBe(5);

  // 3) keyboard: Enter on a pile moves focus to the counter; Enter there puts it back
  await lw.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("shelf-weight")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() => count(page, "l")).toBe(0);
  await expect(board(page)).toHaveAttribute("data-balanced", "false");
  await press(page, '[data-testid="undo"]');
  // ...and the "both sides" button by keyboard
  await page.getByTestId("both-unit").focus();
  await page.keyboard.press("Enter");
  await expect(board(page)).toHaveAttribute("data-alone", "true");
  await expect(page.locator('[data-testid="work-line"][data-eq="x = 4"]')).toHaveCount(1);
  await page.screenshot({ path: `test-results/screens/${info.project.name}-bi-alone.png` });

  const id = (await screen(page).getAttribute("data-exercise"))!;
  await press(page, `[data-testid="choice"][data-value="${x}"]`);
  await expect(page.locator(`[data-testid="choice"][data-value="${x}"]`)).toHaveClass(/is-right/);
  await expect(board(page)).toHaveClass(/is-celebrating/);
  await nextExercise(page, id);

  // a bag can be split: the next equations need ÷ or − moves; check the split button works when offered
  const next = await eq(page);
  await helperGone(page);
  const g = Number(await page.getByTestId("both-split").getAttribute("data-k"));
  if (g >= 2) {
    await press(page, '[data-testid="both-split"]');
    await expect(board(page)).toHaveAttribute("data-balanced", "true");
  }
  expect(next.x).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("first miss tests the guess on the scale with Rumble's hint; second miss models the solution", async ({ page }) => {
  const errors = collectErrors(page);
  await seed(page, { muted: true });
  await enter(page);
  const { x } = await eq(page);
  await helperGone(page);
  const choices = await page.getByTestId("choice").evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.value)));
  const [w1, w2] = choices.filter((c) => c !== x) as [number, number];

  await press(page, `[data-testid="choice"][data-value="${w1}"]`);
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("check-line")).toContainText(`= ${w1}`);
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
  await expect(page.locator(`[data-testid="choice"][data-value="${w1}"]`)).toHaveClass(/is-out/);

  await press(page, `[data-testid="choice"][data-value="${w2}"]`);
  await expect(page.locator(`[data-testid="choice"][data-value="${x}"]`)).toHaveClass(/is-model/, { timeout: 40_000 });
  await expect(board(page)).toHaveAttribute("data-alone", "true");
  await expect(page.locator(`[data-testid="work-line"][data-eq="x = ${x}"]`)).toHaveCount(1);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  await press(page, `[data-testid="choice"][data-value="${x}"]`);
  await nextExercise(page, id);
  expect(errors).toEqual([]);
});

test("word stories: match the story to its equation, then solve", async ({ page }) => {
  const errors = collectErrors(page);
  await seed(page, { muted: true, progress: { v: 1, stickers: [], roundsCompleted: 3, skills: {}, levels: { "balance-island": 7 } } });
  await enter(page);
  const { x, text } = await eq(page);
  await helperGone(page);
  await expect(page.getByTestId("story-card")).toBeVisible();
  await expect(page.getByTestId("choice").first()).toHaveAttribute("aria-disabled", "true");
  const wrong = page.locator(`[data-testid="eq-option"]:not([data-eq="${text}"])`).first();
  const wrongText = (await wrong.getAttribute("data-eq"))!;
  await press(page, `[data-testid="eq-option"][data-eq="${wrongText}"]`);
  await expect(page.locator(`[data-testid="eq-option"][data-eq="${wrongText}"]`)).toHaveClass(/is-out/);
  await expect(board(page)).toHaveAttribute("data-translated", "false");
  await press(page, `[data-testid="eq-option"][data-eq="${text}"]`);
  await expect(board(page)).toHaveAttribute("data-translated", "true");
  await expect(page.getByTestId("equation")).toBeVisible();
  await expect(page.getByTestId("choice").first()).toHaveAttribute("aria-disabled", "false");
  const id = (await screen(page).getAttribute("data-exercise"))!;
  await press(page, `[data-testid="choice"][data-value="${x}"]`);
  await nextExercise(page, id);
  expect(errors).toEqual([]);
});

test("a full round without dragging ends with the Balance Keeper sticker and a level up", async ({ page }, info) => {
  const errors = collectErrors(page);
  mkdirSync(REVIEW, { recursive: true });
  await seed(page, { muted: true });
  await enter(page);
  for (let i = 0; i < 8; i++) {
    const { x } = await eq(page);
    await helperGone(page);
    const id = (await screen(page).getAttribute("data-exercise"))!;
    if (i === 1) {
      // solve this one on the scale with the model moves, by tapping the "both sides" buttons
      for (let k = 0; k < 12 && (await board(page).getAttribute("data-alone")) !== "true"; k++) {
        if ((await page.getByTestId("both-bag").getAttribute("aria-disabled")) === "false") await press(page, '[data-testid="both-bag"]');
        else if ((await page.getByTestId("both-unit").getAttribute("aria-disabled")) === "false") await press(page, '[data-testid="both-unit"]');
        else await press(page, '[data-testid="both-split"]');
      }
      await expect(board(page)).toHaveAttribute("data-alone", "true");
    }
    await press(page, `[data-testid="choice"][data-value="${x}"]`);
    await nextExercise(page, id);
  }
  await press(page, '[data-testid="outro-skip"]').catch(() => undefined);
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Balance Keeper" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toHaveText("Level up! Next time: Level 2");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-reward.png` });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("balance-keeper");
  expect(stored.progress.levels["balance-island"]).toBe(1);
  expect(errors).toEqual([]);
});

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];

async function setState(page: Page, state: Record<string, unknown>) {
  await page.goto("/grown-ups").catch(() => undefined);
  await page.evaluate((st) => localStorage.setItem("bz.v1", JSON.stringify(st)), { profile: ONBOARDED, ageBand: "ages-3-5", muted: true, ...state });
}
const atLevel = (level: number) => ({ progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "balance-island": level } } });

test("layout: no overflow and ≥44px targets at the four viewports (intro, play, story level)", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport sweep runs once");
  test.setTimeout(400_000);
  mkdirSync(REVIEW, { recursive: true });
  const errors = collectErrors(page);
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    // the two middle sizes show the busiest equations (bags on both pans)
    await setState(page, vp.name === "915x412" || vp.name === "1024x1366" ? atLevel(6) : {});
    await page.goto("/play/balance-island");
    await press(page, '[data-testid="story-begin"]');
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${REVIEW}/${vp.name}-intro.png` });
    await press(page, '[data-testid="story-skip"]');
    await eq(page);
    await helperGone(page);
    await page.waitForTimeout(600);
    await noOverflow(page);
    await page.screenshot({ path: `${REVIEW}/${vp.name}-play.png` });
    // pick a weight off a pan (tap-tap) to show the tipped state
    await press(page, '[data-testid="pan-weights"]');
    await press(page, '[data-testid="shelf-weight"]');
    await page.waitForTimeout(1500);
    await noOverflow(page);
    await page.screenshot({ path: `${REVIEW}/${vp.name}-tipped.png` });
  }
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await setState(page, atLevel(7));
    await page.goto("/play/balance-island");
    await press(page, '[data-testid="story-begin"]');
    await press(page, '[data-testid="story-skip"]');
    await eq(page);
    await helperGone(page);
    await noOverflow(page);
    await page.screenshot({ path: `${REVIEW}/${vp.name}-story.png` });
  }
  expect(errors).toEqual([]);
});
