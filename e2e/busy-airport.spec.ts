import { mkdirSync } from "node:fs";
import { type Locator, type Page, expect, test } from "@playwright/test";
import { collectErrors, press, reviewDir, screen, seed, whenReady } from "./helpers";

/**
 * Ziggy's Busy Airport: four inner games in one round — Bag Drop (sort bags onto planes), All Aboard (count
 * passengers / count out a set), Runway Lights (continue a light pattern) and Marshaller (follow signals).
 * Every game is played by pointer drag (where there is something to carry), by tap / tap-tap and by keyboard.
 * Synthetic state only.
 */
type How = "drag" | "tap" | "key";
const REVIEW = reviewDir("busy-airport");
const SIZES = [[390, 844], [915, 412], [1024, 1366], [1280, 800]] as const;

const progress = (level: number) => ({ v: 1, stickers: [], roundsCompleted: 0, skills: {}, levels: { "busy-airport": level } });
async function open(page: Page, level = 0) {
  await seed(page, { muted: true, ...(level ? { progress: progress(level) } : {}) });
  await page.goto("/play/busy-airport");
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
const attrs = (loc: Locator, ...names: string[]) => loc.evaluateAll((els, ns) => els.map((e) => ns.map((n) => (e as HTMLElement).getAttribute(n) ?? "")), names);
const board = (page: Page) => page.getByTestId("ba-board");

/** Which plane a bag belongs on (read from the pictures' data attributes, like a child reading colour and tag). */
async function bagPlan(page: Page) {
  const rule = (await board(page).getAttribute("data-rule"))!;
  const bags = await attrs(page.getByTestId("bag"), "data-value", "data-colour", "data-tag");
  const planes = await attrs(page.getByTestId("plane"), "data-value", "data-colour", "data-tag");
  return bags.map(([id, c, t]) => {
    const p = planes.findIndex(([, pc, pt]) => (rule === "colour" ? pc === c : rule === "shape" ? pt === t : pc === c && pt === t));
    return { bag: id!, plane: planes[p]![0]!, planeIndex: p };
  });
}

/** The colours the empty sockets need, worked out from the lights shown (the core comes from the exercise id). */
async function lightPlan(page: Page): Promise<string[]> {
  const id = (await screen(page).getAttribute("data-exercise"))!;
  const core = /^ba-lights-([a-c]+)-/.exec(id)![1]!.toUpperCase();
  const row = await page.locator('[data-testid="lamp"], [data-testid="socket"]').evaluateAll((els) => els.map((e) => ((e as HTMLElement).dataset.testid === "socket" ? null : (e as HTMLElement).dataset.light!)));
  const map = new Map<string, string>();
  row.forEach((c, i) => c && map.set(core[i % core.length]!, c));
  return row.map((c, i) => (c ? null : map.get(core[i % core.length]!)!)).filter((c): c is string => c !== null);
}

/** Solve whatever inner game is on screen, the way a child would, using `how`. */
async function solve(page: Page, how: How) {
  const mode = (await board(page).getAttribute("data-mode"))!;
  if (how === "drag" && (await isTouch(page))) how = "tap";

  if (mode === "bags") {
    for (const { bag, plane, planeIndex } of await bagPlan(page)) {
      if (how === "drag") await drag(page, page.locator(sel("bag", bag)), page.locator(sel("plane", plane)));
      else if (how === "tap") {
        await press(page, sel("bag", bag));
        await expect(page.locator(sel("bag", bag))).toHaveAttribute("aria-pressed", "true");
        await press(page, sel("plane", plane));
      } else {
        await keyPress(page, sel("bag", bag));
        await expect(page.getByTestId("plane").first()).toBeFocused();
        for (let i = 0; i < planeIndex; i++) await page.keyboard.press("Tab");
        await page.keyboard.press("Enter");
      }
      await expect(page.locator(sel("loaded", bag))).toBeVisible();
    }
  } else if (mode === "count" || mode === "make") {
    const n = mode === "make" ? Number(await page.locator(".ba-need-n").innerText()) : Number(await board(page).getAttribute("data-pool"));
    for (let i = 0; i < n; i++) {
      const p = page.locator('[data-testid="passenger"]').first();
      if (how === "drag") await drag(page, p, page.getByTestId("jumbo"));
      else if (how === "tap") await press(page, '[data-testid="passenger"]');
      else await keyPress(page, '[data-testid="passenger"]');
      await expect(page.locator('[data-testid="window"][data-full="true"]')).toHaveCount(i + 1);
    }
    if (mode === "count") {
      if (how === "key") await keyPress(page, sel("choice", String(n)));
      else await press(page, sel("choice", String(n)));
      return;
    }
  } else if (mode === "lights") {
    const want = await lightPlan(page);
    const single = (await board(page).getAttribute("data-kind")) === "choice";
    for (const colour of want) {
      const bulb = `[data-testid="${single ? "choice" : "bulb"}"][data-light="${colour}"]:not([aria-disabled="true"])`;
      if (how === "drag") await drag(page, page.locator(bulb).first(), page.locator('[data-testid="socket"]').first());
      else if (how === "tap") await press(page, bulb);
      else await keyPress(page, bulb);
    }
    if (single) return;
    await expect(page.locator('[data-testid="socket"]:not([data-light=""])')).toHaveCount(want.length);
  } else {
    const want = (await board(page).getAttribute("data-want"))!.split(",");
    const two = want.length === 2;
    for (const s of want) {
      const b = sel(two ? "steer" : "choice", s);
      if (how === "key") await keyPress(page, b);
      else await press(page, b);
    }
    if (!two) return;
    await expect(page.locator('[data-testid="plan-slot"][data-value=""]')).toHaveCount(0);
  }
  if (how === "key") await keyPress(page, '[data-testid="done"]');
  else await press(page, '[data-testid="done"]');
}

async function playRound(page: Page, how: How, onEach?: (i: number, mode: string) => Promise<void>) {
  const modes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const id = await ready(page);
    const mode = (await board(page).getAttribute("data-mode"))!;
    modes.push(mode);
    await onEach?.(i, mode);
    await solve(page, how);
    await nextExercise(page, id);
  }
  await press(page, '[data-testid="outro-skip"]').catch(() => undefined);
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 40_000 });
  return modes;
}

test("a whole round by drag (tap on touch screens) from the tutorial: sticker and level up", async ({ page }, info) => {
  const errors = collectErrors(page);
  await open(page, 0);
  const modes = await playRound(page, "drag", async (i) => {
    if (i === 0) {
      // tutorial: two bags, two colour planes, and a hand that drags a bag to its plane
      await expect(page.getByTestId("bag")).toHaveCount(2);
      await expect(page.getByTestId("plane")).toHaveCount(2);
      await expect(page.getByTestId("drag-demo")).toBeAttached({ timeout: 10_000 });
      await expect(page.getByTestId("station-sign")).toHaveAttribute("data-game", "bag-drop");
    }
  });
  expect(modes[0]).toBe("bags");
  // stepping up within the round brings in the next inner games (All Aboard, then Runway Lights)
  expect(new Set(modes).size).toBeGreaterThanOrEqual(2);
  await expect(page.getByRole("heading", { name: "Ground Crew" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("ground-crew");
  expect(stored.progress.levels["busy-airport"]).toBe(1);
  if (info.project.name === "desktop") {
    mkdirSync(REVIEW, { recursive: true });
    for (const [w, h] of SIZES) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${REVIEW}/reward-${w}x${h}.png` });
    }
  }
  expect(errors).toEqual([]);
});

test("a whole round by tap and tap-tap: all four inner games (level 4 start)", async ({ page }) => {
  const errors = collectErrors(page);
  await open(page, 3);
  const modes = await playRound(page, "tap");
  expect(modes[0]).toBe("signal");
  for (const m of ["bags", "lights", "signal"]) expect(modes, m).toContain(m);
  expect(modes.some((m) => m === "count" || m === "make")).toBe(true);
  expect(errors).toEqual([]);
});

test("a whole round by keyboard only: count out a set, two-attribute bags, patterns, signals (level 5 start)", async ({ page }) => {
  const errors = collectErrors(page);
  await open(page, 4);
  const modes = await playRound(page, "key");
  expect(modes[0]).toBe("make");
  expect(new Set(modes).size).toBeGreaterThanOrEqual(4);
  expect(errors).toEqual([]);
});

test("top levels: two marshaller signals in order and three runway lights, by drag", async ({ page }) => {
  const errors = collectErrors(page);
  await open(page, 8);
  let id = await ready(page);
  await expect(board(page)).toHaveAttribute("data-mode", "signal");
  await expect(page.getByTestId("plan-slot")).toHaveCount(2);
  await solve(page, "drag");
  await expect(page.getByTestId("taxi-plane")).toHaveAttribute("data-motion", /^go-/);
  await nextExercise(page, id);
  await page.close(); // the next tab shares localStorage: a live round here would be resumed there

  const p2 = await page.context().newPage();
  const errors2 = collectErrors(p2);
  await open(p2, 7);
  id = await ready(p2);
  await expect(board(p2)).toHaveAttribute("data-mode", "lights");
  await expect(p2.getByTestId("socket")).toHaveCount(3);
  await solve(p2, "drag");
  await nextExercise(p2, id);
  expect([...errors, ...errors2]).toEqual([]);
});

test("first miss brings Hoot's hint, second miss models the answer on the board (bags and counting)", async ({ page }) => {
  const errors = collectErrors(page);
  await open(page, 0);
  await ready(page);
  // miss 1: both bags on the wrong planes → Hoot explains; the bags roll back onto the belt
  const plan = await bagPlan(page);
  for (const { bag, plane } of plan) {
    const other = plan.find((p) => p.plane !== plane)!.plane;
    await press(page, sel("bag", bag));
    await press(page, sel("plane", other));
  }
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 15_000 });
  await ready(page);
  await expect(page.getByTestId("bag")).toHaveCount(2);
  await expect(page.getByTestId("loaded")).toHaveCount(0);
  // miss 2: wrong again → every bag is loaded for the child, one by one, and Ready glows
  for (const { bag, plane } of plan) {
    await press(page, sel("bag", bag));
    await press(page, sel("plane", plan.find((p) => p.plane !== plane)!.plane));
  }
  await press(page, '[data-testid="done"]');
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
  await expect(page.getByTestId("done")).toHaveClass(/is-model/);
  await expect(page.locator('[data-testid="loaded"].is-model')).toHaveCount(2);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("done")).toHaveClass(/is-right/);
  await nextExercise(page, id);
  await page.close(); // the next tab shares localStorage: a live round here would be resumed there

  // counting: a wrong number greys out; a second wrong number makes the right one glow (count-along on the windows)
  const p2 = await page.context().newPage();
  const errors2 = collectErrors(p2);
  await open(p2, 1);
  await ready(p2);
  await expect(board(p2)).toHaveAttribute("data-mode", "count");
  const n = Number(await board(p2).getAttribute("data-pool"));
  await expect(p2.locator('[data-testid="choice"]').first()).toHaveAttribute("aria-disabled", "true"); // board everyone first
  for (let i = 0; i < n; i++) await press(p2, '[data-testid="passenger"]');
  const wrong = (await attrs(p2.getByTestId("choice"), "data-value")).map(([v]) => v!).filter((v) => Number(v) !== n);
  await press(p2, sel("choice", wrong[0]!));
  await expect(p2.getByTestId("helper")).toBeVisible({ timeout: 15_000 });
  await ready(p2);
  await expect(p2.locator(sel("choice", wrong[0]!))).toHaveClass(/is-out/);
  await press(p2, sel("choice", wrong[1]!));
  await expect(screen(p2)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
  await expect(p2.locator(sel("choice", String(n)))).toHaveClass(/is-model/);
  await press(p2, sel("choice", String(n)));
  await expect(p2.locator(sel("choice", String(n)))).toHaveClass(/is-right/);
  expect([...errors, ...errors2]).toEqual([]);
});

test("make-a-set: too many is never punished; Send one back fixes it", async ({ page }) => {
  await open(page, 4);
  await ready(page);
  await expect(board(page)).toHaveAttribute("data-mode", "make");
  const n = Number(await page.locator(".ba-need-n").innerText());
  for (let i = 0; i <= n; i++) await press(page, '[data-testid="passenger"]');
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 15_000 });
  await ready(page);
  // the seats Ziggy needs are outlined now; one passenger goes back off the plane
  await expect(page.locator(".ba-window.is-slot")).toHaveCount(n);
  await press(page, '[data-testid="unboard"]');
  await expect(page.locator('[data-testid="window"][data-full="true"]')).toHaveCount(n);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  await press(page, '[data-testid="done"]');
  await nextExercise(page, id);
});

test("every inner game fits the screen: no overflow, tap targets ≥ 64 px (screenshots for review)", async ({ page }, info) => {
  mkdirSync(REVIEW, { recursive: true });
  const shots = info.project.name === "desktop";
  const sizes = shots ? SIZES : ([[0, 0]] as const);
  for (const [level, name] of [[0, "bags-tutorial"], [1, "count"], [2, "lights-next"], [3, "signal"], [4, "make"], [5, "bags-both"], [6, "signal-five"], [7, "lights-three"], [8, "signal-two"]] as const) {
    const tab = await page.context().newPage();
    await open(tab, level);
    await ready(tab);
    for (const [w, h] of sizes) {
      if (w) await tab.setViewportSize({ width: w, height: h });
      await tab.waitForTimeout(500);
      const vp = tab.viewportSize()!;
      const where = `${name} ${vp.width}x${vp.height}`;
      expect(await tab.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${where} scroll`).toBe(true);
      const boxes = await tab
        .locator('[data-testid="choice"], [data-testid="bag"], [data-testid="plane"], [data-testid="passenger"], [data-testid="bulb"], [data-testid="steer"], [data-testid="undo"], [data-testid="unboard"], [data-testid="done"]')
        .evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { id: (e as HTMLElement).dataset.testid, x: r.x, y: r.y, w: r.width, h: r.height }; }));
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
    for (const [w, h] of SIZES) {
      const tab = await page.context().newPage();
      await tab.setViewportSize({ width: w, height: h });
      await seed(tab, { muted: true });
      await tab.goto("/play/busy-airport");
      await press(tab, '[data-testid="story-begin"]');
      await tab.waitForTimeout(2600);
      await tab.screenshot({ path: `${REVIEW}/intro-${w}x${h}.png` });
      await tab.close();
    }
  }
});
