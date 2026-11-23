import { mkdirSync } from "node:fs";
import { type Locator, type Page, expect, test } from "@playwright/test";
import { collectErrors, press, screen, seed, whenReady } from "./helpers";
import { fillingSubsets, nameOf, partition, type OutlineType, type PieceKind, type ShapeKind } from "../src/games/shape-squish/shapes";
import { reviewDir } from "./helpers";

/**
 * Gloop's Shape Squish: drag Gloop to the matching gate, find every triangle, sort by sides, and fill outlines.
 * Every mode is played by pointer drag, by tap / tap-tap and by keyboard. Synthetic state only.
 */
type How = "drag" | "tap" | "key";
const REVIEW = reviewDir("shape-squish");

const progress = (level: number) => ({ v: 1, stickers: [], roundsCompleted: 0, skills: {}, levels: { "shape-squish": level } });
async function open(page: Page, level = 0) {
  await seed(page, { muted: true, ...(level ? { progress: progress(level) } : {}) });
  await page.goto("/play/shape-squish");
  await press(page, '[data-testid="story-begin"]');
  await press(page, '[data-testid="story-skip"]');
}
const isTouch = (page: Page) => page.evaluate(() => matchMedia("(pointer: coarse)").matches);
async function helperGone(page: Page) {
  await page.getByTestId("helper").waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
}
async function ready(page: Page) {
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
  await helperGone(page);
  return (await screen(page).getAttribute("data-exercise"))!;
}
async function nextExercise(page: Page, prev: string) {
  await expect
    .poll(async () => ((await screen(page).count()) === 0 ? "round-over" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 45_000 })
    .not.toBe(prev);
}
async function drag(page: Page, from: Locator, to: Locator) {
  await whenReady(from);
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  const [ax, ay, bx, by] = [a.x + a.width / 2, a.y + a.height / 2, b.x + b.width / 2, b.y + b.height / 2];
  await page.mouse.move(ax, ay);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(ax + ((bx - ax) * i) / 10, ay + ((by - ay) * i) / 10);
  await page.mouse.up();
}
const sel = (testid: string, value: string) => `[data-testid="${testid}"][data-value="${value}"]`;
async function keyPress(page: Page, selector: string) {
  await whenReady(page.locator(selector).first());
  await page.locator(selector).first().focus();
  await page.keyboard.press("Enter");
}

/** Solve whatever exercise is on screen, the way a child would, using `how`. */
async function solve(page: Page, how: How) {
  const board = page.getByTestId("ss-board");
  const mode = (await board.getAttribute("data-mode"))!;
  if (how === "drag" && (await isTouch(page))) how = "tap";

  if (mode === "gate") {
    const want = nameOf((await board.getAttribute("data-gloop")) as ShapeKind);
    const gates = await page.getByTestId("choice").evaluateAll((els) => els.map((e) => [(e as HTMLElement).dataset.value!, (e as HTMLElement).dataset.shape!]));
    const id = gates.find(([, k]) => nameOf(k as ShapeKind) === want)![0];
    if (how === "drag") await drag(page, page.getByTestId("gloop"), page.locator(sel("choice", id)));
    else if (how === "tap") {
      await press(page, '[data-testid="gloop"]');
      await expect(page.getByTestId("gloop")).toHaveAttribute("aria-pressed", "true");
      await press(page, sel("choice", id));
    } else {
      await keyPress(page, '[data-testid="gloop"]');
      await expect(page.locator('[data-testid="choice"]').first()).toBeFocused();
      await keyPress(page, sel("choice", id));
    }
    return;
  }

  if (mode === "find") {
    const target = (await board.getAttribute("data-target"))!;
    const shapes = await page.getByTestId("shape").evaluateAll((els) => els.map((e) => [(e as HTMLElement).dataset.value!, (e as HTMLElement).dataset.shape!]));
    const ids = shapes.filter(([, k]) => nameOf(k as ShapeKind) === target).map(([id]) => id);
    for (const id of ids) {
      if (how === "drag") await drag(page, page.locator(sel("shape", id)), page.getByTestId("jar"));
      else if (how === "tap") await press(page, sel("shape", id));
      else await keyPress(page, sel("shape", id));
      await expect(page.locator(sel("in-jar", id))).toBeVisible();
    }
  } else if (mode === "sort") {
    const items = await page.getByTestId("shape").evaluateAll((els) => els.map((e) => [(e as HTMLElement).dataset.value!, (e as HTMLElement).dataset.sides!]));
    for (const [id, sides] of items) {
      const bin = sides === "3" ? "t3" : "t4";
      if (how === "drag") await drag(page, page.locator(sel("shape", id)), page.locator(sel("bin", bin)));
      else if (how === "tap") {
        await press(page, sel("shape", id));
        await press(page, sel("bin", bin));
      } else {
        await keyPress(page, sel("shape", id));
        await expect(page.locator(sel("bin", "t3"))).toBeFocused();
        if (bin === "t4") await page.keyboard.press("Tab");
        await page.keyboard.press("Enter");
      }
      await expect(page.locator(sel("sorted", id))).toBeVisible();
    }
  } else {
    const outline = (await board.getAttribute("data-outline")) as OutlineType;
    const count = mode === "two" ? 2 : 1;
    const pieces = await page.getByTestId("piece").evaluateAll((els) => els.map((e) => [(e as HTMLElement).dataset.value!, (e as HTMLElement).dataset.kind!]));
    const kinds = pieces.map(([, k]) => k as PieceKind);
    const subsets = fillingSubsets(outline, count, kinds);
    expect(subsets).toHaveLength(1);
    const groups = partition(outline, count, subsets[0]!.map((i) => kinds[i]!))!;
    for (const [o, group] of groups.entries()) {
      for (const g of group) {
        const id = pieces[subsets[0]![g]!]![0];
        const target = page.locator(sel("outline", String(o)));
        const before = Number(await target.getAttribute("data-used"));
        if (how === "drag") await drag(page, page.locator(sel("piece", id)), target);
        else if (how === "tap") {
          await press(page, sel("piece", id));
          if (count === 2) await press(page, sel("outline", String(o)));
        } else {
          await keyPress(page, sel("piece", id));
          if (count === 2) {
            await expect(page.locator(sel("outline", "0"))).toBeFocused();
            if (o === 1) await page.keyboard.press("Tab");
            await page.keyboard.press("Enter");
          }
        }
        await expect(target).not.toHaveAttribute("data-used", String(before));
      }
    }
  }
  if (how === "key") await keyPress(page, '[data-testid="done"]');
  else await press(page, '[data-testid="done"]');
}

async function playRound(page: Page, how: How, onEach?: (i: number, mode: string) => Promise<void>) {
  const modes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const id = await ready(page);
    const mode = (await page.getByTestId("ss-board").getAttribute("data-mode"))!;
    modes.push(mode);
    await onEach?.(i, mode);
    await solve(page, how);
    await nextExercise(page, id);
  }
  await press(page, '[data-testid="outro-skip"]').catch(() => undefined);
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 40_000 });
  return modes;
}

test("a whole round by drag (tap on touch screens): gates, then finding shapes; sticker and level up", async ({ page }, info) => {
  const errors = collectErrors(page);
  await open(page, 0);
  const modes = await playRound(page, "drag", async (i) => {
    if (i === 0) {
      // tutorial: circle vs square, Gloop is out on the board (empty lily pad in the host spot), drag demo shows
      await expect(page.getByTestId("choice")).toHaveCount(2);
      await expect(page.getByTestId("ss-board")).toHaveAttribute("data-gloop", "circle");
      await expect(page.locator(".ss-lilypad")).toBeVisible();
      await expect(page.getByTestId("drag-demo")).toBeAttached({ timeout: 10_000 });
    }
  });
  expect(modes[0]).toBe("gate");
  expect(modes).toContain("find");
  await expect(page.getByRole("heading", { name: "Shape Squisher" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("shape-squisher");
  expect(stored.progress.levels["shape-squish"]).toBe(1);
  if (info.project.name === "desktop") {
    mkdirSync(REVIEW, { recursive: true });
    for (const [w, h] of [[390, 844], [915, 412], [1024, 1366], [1280, 800]] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${REVIEW}/reward-${w}x${h}.png` });
    }
  }
  expect(errors).toEqual([]);
});

test("a whole round by tap and tap-tap: sorting by sides and composing (level 5 start)", async ({ page }) => {
  const errors = collectErrors(page);
  await open(page, 4);
  const modes = await playRound(page, "tap");
  expect(modes[0]).toBe("sort");
  expect(modes.some((m) => m === "fill" || m === "two")).toBe(true);
  expect(errors).toEqual([]);
});

test("a whole round by keyboard only: turned gates, find, sort and fill (level 3 start)", async ({ page }) => {
  const errors = collectErrors(page);
  await open(page, 2);
  const modes = await playRound(page, "key");
  expect(modes[0]).toBe("gate");
  expect(new Set(modes).size).toBeGreaterThanOrEqual(3);
  expect(errors).toEqual([]);
});

test("two outlines, each a different way, by drag (level 8)", async ({ page }) => {
  await open(page, 7);
  for (let i = 0; i < 2; i++) {
    const id = await ready(page);
    await expect(page.getByTestId("outline")).toHaveCount(2);
    await solve(page, "drag");
    await nextExercise(page, id);
  }
});

test("first miss brings Zuzu's hint, second miss models the answer; a piece that doesn't fit bounces back", async ({ page }) => {
  const errors = collectErrors(page);
  await open(page, 3); // find every triangle / square
  await ready(page);
  const board = page.getByTestId("ss-board");
  await expect(board).toHaveAttribute("data-mode", "find");
  const target = (await board.getAttribute("data-target"))!;
  const shapes = await page.getByTestId("shape").evaluateAll((els) => els.map((e) => [(e as HTMLElement).dataset.value!, (e as HTMLElement).dataset.shape!]));
  const wrong = shapes.filter(([, k]) => nameOf(k as ShapeKind) !== target).map(([id]) => id);
  // miss 1: a non-target shape → helper explains, the wrong shape is greyed out
  await press(page, sel("shape", wrong[0]!));
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 15_000 });
  await ready(page);
  await expect(page.locator(sel("shape", wrong[0]!))).toHaveClass(/is-out/);
  await expect(page.locator(sel("shape", wrong[1]!))).toHaveClass(/ss-item/);
  // miss 2: another wrong shape → the board models the answer; everything else is locked; Squish glows
  await press(page, sel("shape", wrong[1]!));
  await press(page, '[data-testid="done"]');
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
  await expect(page.getByTestId("done")).toHaveClass(/is-model/);
  const want = shapes.filter(([, k]) => nameOf(k as ShapeKind) === target).length;
  await expect(page.getByTestId("in-jar")).toHaveCount(want);
  await expect(page.locator('[data-testid="in-jar"].is-model')).toHaveCount(want);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("done")).toHaveClass(/is-right/);
  await nextExercise(page, id);

  // compose: a wrong-family piece bounces off the outline and is not placed (fresh tab = fresh seed)
  const p2 = await page.context().newPage();
  const errors2 = collectErrors(p2);
  await open(p2, 6);
  await ready(p2);
  const pieces = await p2.getByTestId("piece").evaluateAll((els) => els.map((e) => [(e as HTMLElement).dataset.value!, (e as HTMLElement).dataset.kind!]));
  const odd = pieces.find(([, k]) => !["c-trap", "c-rh", "c-tri"].includes(k!));
  expect(odd).toBeDefined();
  await press(p2, sel("piece", odd![0]!));
  await expect(p2.locator(sel("piece", odd![0]!))).toHaveClass(/nofit/);
  await expect(p2.locator(sel("outline", "0"))).toHaveAttribute("data-used", "0");
  expect([...errors, ...errors2]).toEqual([]);
});

test("every mode fits the screen: no overflow, tap targets ≥ 64 px (screenshots for review)", async ({ page }, info) => {
  mkdirSync(REVIEW, { recursive: true });
  const shots = info.project.name === "desktop";
  const sizes = shots ? ([[390, 844], [915, 412], [1024, 1366], [1280, 800]] as const) : ([[0, 0]] as const);
  let tab = page;
  for (const [level, name] of [[0, "gate"], [2, "gate-turned"], [3, "find"], [4, "sort"], [5, "fill-square"], [6, "fill-hexagon"], [7, "two"]] as const) {
    tab = await page.context().newPage();
    await open(tab, level);
    await ready(tab);
    for (const [w, h] of sizes) {
      if (w) await tab.setViewportSize({ width: w, height: h });
      await tab.waitForTimeout(500);
      const vp = tab.viewportSize()!;
      const where = `${name} ${vp.width}x${vp.height}`;
      expect(await tab.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${where} scroll`).toBe(true);
      const boxes = await tab.locator('[data-testid="choice"], [data-testid="gloop"], [data-testid="shape"], [data-testid="piece"], [data-testid="bin"], [data-testid="outline"], [data-testid="done"]').evaluateAll((els) =>
        els.map((e) => { const r = e.getBoundingClientRect(); return { id: (e as HTMLElement).dataset.testid, x: r.x, y: r.y, w: r.width, h: r.height }; }));
      expect(boxes.length, where).toBeGreaterThan(1);
      for (const b of boxes) {
        expect(b.x, `${where} ${b.id} left`).toBeGreaterThanOrEqual(-1);
        expect(b.x + b.w, `${where} ${b.id} right`).toBeLessThanOrEqual(vp.width + 1);
        expect(b.y + b.h, `${where} ${b.id} bottom`).toBeLessThanOrEqual(vp.height + 1);
        expect(Math.min(b.w, b.h), `${where} ${b.id} size`).toBeGreaterThanOrEqual(64);
      }
      if (shots) await tab.screenshot({ path: `${REVIEW}/play-${name}-${vp.width}x${vp.height}.png` });
    }
    await tab.close();
  }
  if (shots) {
    for (const [w, h] of [[390, 844], [915, 412], [1024, 1366], [1280, 800]] as const) {
      tab = await page.context().newPage();
      await tab.setViewportSize({ width: w, height: h });
      await seed(tab, { muted: true });
      await tab.goto("/play/shape-squish");
      await press(tab, '[data-testid="story-begin"]');
      await tab.waitForTimeout(2600);
      await tab.screenshot({ path: `${REVIEW}/intro-${w}x${h}.png` });
      await tab.close();
    }
  }
});
