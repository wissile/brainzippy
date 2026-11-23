import { mkdirSync } from "node:fs";
import { type Locator, type Page, expect, test } from "@playwright/test";
import { bestIndex, costOf, greedy, ledgerOf, revenue, surveyOf, trayOf } from "../src/games/lemonade-stand/logic";
import { ONBOARDED, collectErrors, press, screen, seed, whenReady } from "./helpers";
import { reviewDir } from "./helpers";

/** Budge's Lemonade Stand: pay, change, supplies, customers, savings jar and price slider by drag, tap and keyboard. */

const REVIEW = reviewDir("lemonade-stand");
type Method = "drag" | "tap" | "keyboard";
const board = (page: Page) => page.getByTestId("stand-board");

async function enter(page: Page) {
  await page.goto("/play/lemonade-stand");
  await press(page, '[data-testid="story-begin"]');
  await press(page, '[data-testid="story-skip"]');
}
async function ready(page: Page) {
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
  const params = JSON.parse((await board(page).getAttribute("data-params"))!) as Record<string, number>;
  const mode = (await board(page).getAttribute("data-mode"))!;
  return { params, mode, id: (await screen(page).getAttribute("data-exercise"))! };
}
async function helperGone(page: Page) {
  await page.getByTestId("helper").waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
}
async function nextExercise(page: Page, prev: string) {
  await expect
    .poll(async () => ((await screen(page).count()) === 0 ? "round-over" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 40_000 })
    .not.toBe(prev);
}
const isTouch = (page: Page) => page.evaluate(() => matchMedia("(pointer: coarse)").matches);

async function drag(page: Page, from: Locator, to: Locator) {
  await whenReady(from);
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  const ax = a.x + a.width / 2, ay = a.y + a.height / 2, bx = b.x + b.width / 2, by = b.y + b.height / 2;
  await page.mouse.move(ax, ay);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(ax + ((bx - ax) * i) / 10, ay + ((by - ay) * i) / 10);
  await page.mouse.up();
}

/** Do one move by the chosen method: drag source → zone, tap the source, or focus it and press Enter. */
async function act(page: Page, method: Method, source: string, zone: string) {
  const src = page.locator(source).first();
  if (method === "drag" && !(await isTouch(page))) return drag(page, src, page.locator(zone).first());
  if (method === "keyboard") {
    await src.focus();
    return page.keyboard.press("Enter");
  }
  return press(page, source);
}
async function submit(page: Page, method: Method, selector = '[data-testid="done"]') {
  await expect(page.locator(selector).first()).toHaveAttribute("aria-disabled", "false");
  if (method === "keyboard") {
    await page.locator(selector).first().focus();
    await page.keyboard.press("Enter");
  } else await press(page, selector);
}

/** The amount a coin item needs (signed for a rainy day). */
function coinTarget(mode: string, p: Record<string, number>) {
  if (mode === "pay") return p.price!;
  if (mode === "change") return 100 - p.price!;
  const l = ledgerOf(p);
  return revenue(l) - costOf(l);
}

async function putCoins(page: Page, method: Method, amount: number, tray: number) {
  for (const d of greedy(amount, trayOf(tray))!) await act(page, method, `[data-testid="coin"][data-value="${d}"]`, '[data-testid="drop"]');
  await expect(page.getByTestId("drop")).toHaveAttribute("data-total", String(amount));
}

/** Solve the current item correctly, the way a child would, using one input method throughout. */
async function solveCurrent(page: Page, method: Method) {
  const { params: p, mode, id } = await ready(page);
  await helperGone(page);
  if (mode === "pay" || mode === "change" || mode === "profit") {
    await putCoins(page, method, coinTarget(mode, p), p.tray!);
    await submit(page, method);
  } else if (mode === "loss") {
    const v = coinTarget(mode, p);
    await act(page, method === "drag" ? "tap" : method, `[data-testid="outcome"][data-value="${v > 0 ? "profit" : v < 0 ? "loss" : "even"}"]`, "");
    if (v !== 0) await putCoins(page, method, Math.abs(v), p.tray!);
    await expect(page.getByTestId("done")).toHaveAttribute("data-value", String(v));
    await submit(page, method);
  } else if (mode === "cost") {
    for (const s of ["lemons", "sugar", "cups"]) await act(page, method, `[data-testid="supply"][data-value="${s}"]`, '[data-testid="supply-box"]');
    await expect(board(page)).toHaveAttribute("data-ready", "true");
    await submit(page, method, `[data-testid="choice"][data-value="${costOf(ledgerOf(p))}"]`);
  } else if (mode === "revenue") {
    for (let i = 0; i < p.cups!; i++) await act(page, method, '[data-testid="pitcher"]', '[data-testid="queue"]');
    await expect(board(page)).toHaveAttribute("data-served", String(p.cups));
    await submit(page, method, `[data-testid="choice"][data-value="${revenue(ledgerOf(p))}"]`);
  } else if (mode === "price") {
    const s = surveyOf(p);
    const b = bestIndex(s);
    if (method === "keyboard") {
      await page.getByTestId("price-slider").focus();
      for (let i = 0; i <= b; i++) await page.keyboard.press("ArrowRight");
    } else if (method === "drag" && !(await isTouch(page))) {
      // slide the knob along the rail to the notch
      await drag(page, page.getByTestId("price-slider"), page.locator(`[data-testid="choice"][data-value="${s.prices[b]}"]`));
    } else await press(page, `[data-testid="choice"][data-value="${s.prices[b]}"]`);
    await expect(board(page)).toHaveAttribute("data-pick", String(s.prices[b]));
    await submit(page, method);
  }
  await nextExercise(page, id);
}

const atLevel = (level: number) => ({ progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "lemonade-stand": level } } });

test("tutorial and a full round by drag, tap and keyboard end with the Stand Star and a level up", async ({ page }, info) => {
  const errors = collectErrors(page);
  mkdirSync(REVIEW, { recursive: true });
  await seed(page, { muted: true });
  await enter(page);
  const first = await ready(page);
  expect(first.id).toBe("ls-tutorial-pay-3");
  await expect(page.locator('[data-testid="coin"]')).toHaveCount(1); // pennies only
  const methods: Method[] = ["tap", "drag", "keyboard"];
  for (let i = 0; i < 8; i++) {
    if (i === 0) {
      // keyboard: Backspace takes the last coin back
      await helperGone(page);
      await press(page, '[data-testid="coin"][data-value="1"]');
      await press(page, '[data-testid="coin"][data-value="1"]');
      await expect(page.getByTestId("drop")).toHaveAttribute("data-total", "2");
      await page.keyboard.press("Backspace");
      await expect(page.getByTestId("drop")).toHaveAttribute("data-total", "1");
      // tap a stack on the counter to take a coin back
      await press(page, '[data-testid="placed"][data-value="1"]');
      await expect(page.getByTestId("drop")).toHaveAttribute("data-total", "0");
      await page.screenshot({ path: `${REVIEW}/${info.project.name}-play-tutorial.png` });
    }
    await solveCurrent(page, methods[i % 3]!);
  }
  await press(page, '[data-testid="outro-skip"]').catch(() => undefined);
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Stand Star" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toHaveText("Level up! Next time: Level 2");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("stand-star");
  expect(stored.progress.levels["lemonade-stand"]).toBe(1);
  await page.waitForTimeout(900);
  if (info.project.name === "desktop") {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${REVIEW}/${vp.name}-reward.png` });
    }
  } else await page.screenshot({ path: `${REVIEW}/${info.project.name}-reward.png` });
  expect(errors).toEqual([]);
});

test("pay: first miss brings Puff and the gap; second miss lays the coins down and Pay is errorless", async ({ page }) => {
  const errors = collectErrors(page);
  await seed(page, { muted: true, ...atLevel(2) });
  await enter(page);
  const { params: p, id } = await ready(page);
  await helperGone(page);
  const price = p.price!;
  await putCoins(page, "tap", price + 5, p.tray!);
  await submit(page, "tap");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 10_000 });
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
  await expect(page.getByTestId("value-bar")).toBeVisible();
  await expect(page.getByTestId("gap").first()).toHaveText("5¢ too much");
  await press(page, '[data-testid="coin"][data-value="1"]');
  await expect(page.getByTestId("gap").first()).toHaveText("6¢ too much");
  await submit(page, "tap");
  // model: the coins go down largest first, Pay pulses; tapping it is right
  await expect(page.getByTestId("done")).toHaveClass(/is-model/, { timeout: 40_000 });
  await expect(page.getByTestId("drop")).toHaveAttribute("data-total", String(price));
  await expect(page.locator('[data-testid="coin"]').first()).toHaveAttribute("aria-disabled", "true");
  await submit(page, "tap");
  await expect(page.getByTestId("done")).toHaveClass(/is-right/);
  await nextExercise(page, id);
  expect(errors).toEqual([]);
});

test("choice levels: a wrong card is greyed with a diagnosis, the second miss models the ledger", async ({ page }) => {
  const errors = collectErrors(page);
  await seed(page, { muted: true, ...atLevel(6) });
  await enter(page);
  const { params: p, id } = await ready(page);
  await helperGone(page);
  // the cards wait until every customer is served
  await expect(page.getByTestId("choice").first()).toHaveAttribute("aria-disabled", "true");
  for (let i = 0; i < p.cups!; i++) await press(page, '[data-testid="queue"]');
  const right = p.cups! * p.price!;
  const wrong = await page.locator(`[data-testid="choice"]:not([data-value="${right}"])`).evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.value!));
  await press(page, `[data-testid="choice"][data-value="${wrong[0]}"]`);
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 10_000 });
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
  await expect(page.locator(`[data-testid="choice"][data-value="${wrong[0]}"]`)).toHaveClass(/is-out/);
  await press(page, `[data-testid="choice"][data-value="${wrong[1]}"]`);
  await expect(page.locator(`[data-testid="choice"][data-value="${right}"]`)).toHaveClass(/is-model/, { timeout: 40_000 });
  await expect(page.locator(".ls-cash-slot.is-step")).toHaveCount(p.cups!);
  await press(page, `[data-testid="choice"][data-value="${right}"]`);
  await nextExercise(page, id);
  expect(errors).toEqual([]);
});

for (const [level, method] of [[4, "drag"], [5, "drag"], [6, "keyboard"], [7, "drag"], [8, "keyboard"], [9, "drag"], [9, "keyboard"]] as const) {
  test(`level ${level + 1} by ${method}: the stand works end to end`, async ({ page }) => {
    const errors = collectErrors(page);
    await seed(page, { muted: true, ...atLevel(level) });
    await enter(page);
    await solveCurrent(page, method);
    await solveCurrent(page, method === "drag" ? "tap" : "drag");
    expect(errors).toEqual([]);
  });
}

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];

async function noOverflow(page: Page) {
  await page.waitForTimeout(800);
  const bad = await page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const out: string[] = [];
    if (document.documentElement.scrollWidth > vw + 1) out.push(`page scrolls sideways ${document.documentElement.scrollWidth}>${vw}`);
    const sel = '[data-testid="coin"], [data-testid="placed"], [data-testid="done"], [data-testid="choice"], [data-testid="supply"], [data-testid="placed-supply"], [data-testid="pitcher"], [data-testid="queue"], [data-testid="outcome"], [data-testid="price-slider"], [data-testid="replay"]';
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const r = el.getBoundingClientRect();
      const id = `${el.dataset.testid}${el.dataset.value ?? ""}`;
      if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) out.push(`${id} off screen ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
      if (r.width < 43.5 || r.height < 43.5) out.push(`${id} too small ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(".ls-card"))) {
      const r = el.getBoundingClientRect();
      if (r.top < -1 || r.bottom > vh + 1) out.push(`card off screen ${Math.round(r.top)},${Math.round(r.bottom)}`);
    }
    return out;
  });
  expect(bad).toEqual([]);
}

async function setState(page: Page, state: Record<string, unknown>) {
  await page.goto("/grown-ups").catch(() => undefined);
  await page.evaluate((st) => localStorage.setItem("bz.v1", JSON.stringify(st)), { profile: ONBOARDED, ageBand: "ages-6-8", muted: true, ...state });
}

test("layout: no overflow and ≥44px targets at the four viewports for every kind of item", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport sweep runs once");
  test.setTimeout(600_000);
  mkdirSync(REVIEW, { recursive: true });
  const errors = collectErrors(page);
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const level of [0, 3, 4, 5, 6, 7, 8, 9]) {
      await setState(page, atLevel(level));
      await page.goto("/play/lemonade-stand");
      await press(page, '[data-testid="story-begin"]');
      if (level === 0) {
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${REVIEW}/${vp.name}-intro.png` });
      }
      await press(page, '[data-testid="story-skip"]');
      const { params: p, mode } = await ready(page);
      await helperGone(page);
      await noOverflow(page);
      // fill the stand so the busiest state is checked too
      if (mode === "pay" || mode === "change" || mode === "profit" || mode === "loss") {
        if (mode === "loss") await press(page, '[data-testid="outcome"][data-value="profit"]');
        for (const d of trayOf(p.tray!)) await press(page, `[data-testid="coin"][data-value="${d}"]`);
      } else if (mode === "cost") for (const s of ["lemons", "sugar", "cups"]) await press(page, `[data-testid="supply"][data-value="${s}"]`);
      else if (mode === "revenue") for (let i = 0; i < p.cups!; i++) await press(page, '[data-testid="queue"]');
      else await press(page, '[data-testid="choice"]');
      await noOverflow(page);
      await page.screenshot({ path: `${REVIEW}/${vp.name}-play-L${level + 1}-${mode}.png` });
    }
  }
  expect(errors).toEqual([]);
});
