import { mkdirSync } from "node:fs";
import { type Locator, type Page, expect, test } from "@playwright/test";
import { ACTIONS, ANIMALS, FACT_QS, GRAZERS, STORIES, type ChainId, type HomeItemId, type ZoneId, chainValid, homesFor, riskiestRun, runId, weeksAbove } from "../src/games/reef-rescue/facts";
import { MODES, type ModeName } from "../src/games/reef-rescue/generator";
import { ONBOARDED, collectErrors, press, screen, seed } from "./helpers";

/** Ripple's Reef Rescue: place species by drag, tap-tap and keyboard; hints; every level; a full round to the Reef Guardian shell. */

const REVIEW = "/home/claude/review/reef-rescue";
const board = (page: Page) => page.getByTestId("reef-board");
type Method = "tap" | "drag" | "keyboard";
type P = Record<string, number>;

async function enter(page: Page) {
  await page.goto("/play/reef-rescue");
  await press(page, '[data-testid="story-begin"]');
  await press(page, '[data-testid="story-skip"]');
}
async function ready(page: Page): Promise<{ mode: ModeName; p: P }> {
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
  await page.getByTestId("helper").waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
  const p = JSON.parse((await board(page).getAttribute("data-params"))!) as P;
  return { mode: MODES[p.mode ?? 0]!, p };
}
async function nextExercise(page: Page, prev: string) {
  await expect
    .poll(async () => ((await screen(page).count()) === 0 ? "round-over" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 40_000 })
    .not.toBe(prev);
}
async function dragTo(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  const ax = a.x + a.width / 2, ay = a.y + a.height / 2, bx = b.x + b.width / 2, by = b.y + b.height / 2;
  await page.mouse.move(ax, ay);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(ax + ((bx - ax) * i) / 10, ay + ((by - ay) * i) / 10);
  await page.mouse.up();
}
const isTouch = (page: Page) => page.evaluate(() => matchMedia("(pointer: coarse)").matches);
const card = (id: string) => `[data-testid="shelf"] [data-testid="choice"][data-value="${id}"]`;
const target = (id: string) => `[data-testid="target"][data-value="${id}"]`;

/** Move a card onto a target the chosen way (drag falls back to tap-tap on touch devices). */
async function move(page: Page, from: string, to: string, how: Method) {
  if (how === "drag" && !(await isTouch(page))) return dragTo(page, page.locator(from).first(), page.locator(to).first());
  if (how === "keyboard") {
    await page.locator(from).first().focus();
    await page.keyboard.press("Enter");
    // the board moves focus into the reef after a card is lifted; then Tab/focus to the spot we want
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).toBe("target");
    await page.locator(to).first().focus();
    await page.keyboard.press("Enter");
    return;
  }
  await press(page, from);
  await press(page, to);
}
async function tapOrKey(page: Page, sel: string, how: Method) {
  if (how === "keyboard") {
    await page.locator(sel).first().focus();
    await page.keyboard.press("Enter");
  } else await press(page, sel);
}
async function shelfIds(page: Page) {
  return page.locator('[data-testid="shelf"] [data-testid="choice"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-value")!));
}
async function targetIds(page: Page) {
  return page.locator('[data-testid="target"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-value")!));
}
const temps = (p: P) => Array.from({ length: 12 }, (_, i) => p[`t${i}`]!);

/** The placements (card → target) or pick that solve the current item, from the same fact table the game uses. */
async function answerOf(page: Page, mode: ModeName, p: P): Promise<{ moves: [string, string][]; pick?: string | number }> {
  const cards = await shelfIds(page);
  const targets = await targetIds(page);
  switch (mode) {
    case "eats": {
      const a = ANIMALS[p.a ?? 0]!;
      return { moves: [[a.id, a.food]] };
    }
    case "home":
      return { moves: cards.map((c) => [c, homesFor(c as HomeItemId, targets as ZoneId[])[0]!]) };
    case "chain": {
      const n = targets.length;
      const perm = (xs: string[], k: number): string[][] => (k === 0 ? [[]] : xs.flatMap((x, i) => perm([...xs.slice(0, i), ...xs.slice(i + 1)], k - 1).map((r) => [x, ...r])));
      const order = perm(cards, n).find((o) => chainValid(o as ChainId[]))!;
      return { moves: order.map((c, i) => [c, `slot-${i}`]) };
    }
    case "fact":
      return { moves: [[FACT_QS[p.q ?? 0]!.correct, "blank"]] };
    case "story":
      return { moves: STORIES[p.s ?? 0]!.order.map((c, i) => [c, `slot-${i}`]) };
    case "sort":
      return { moves: cards.map((c) => [c, ACTIONS[c as keyof typeof ACTIONS].helps ? "help" : "harm"]) };
    case "grazers":
      return { moves: cards.filter((c) => (GRAZERS as readonly string[]).includes(c)).map((c) => [c, "reef"]) };
    case "plant":
      return { moves: Array.from({ length: 8 }, (_, i) => i).filter((i) => p[`s${i}`] === 0).map((i) => ["frag", `slot-${"abcdefgh"[i]}`]) };
    case "risk":
      return { moves: [], pick: runId(riskiestRun(temps(p))!) };
    case "count":
      return { moves: [], pick: weeksAbove(temps(p)) };
  }
}

/** Place everything right, then Check. */
async function solveCurrent(page: Page, how: Method = "tap") {
  const { mode, p } = await ready(page);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  const a = await answerOf(page, mode, p);
  for (const [k, [c, t]] of a.moves.entries()) {
    // coral pieces stay in hand after planting one: just tap/Enter the next spot
    if (mode === "plant" && k > 0 && (how !== "drag" || (await isTouch(page)))) await tapOrKey(page, target(t), how);
    else await move(page, card(c), target(t), how);
    if (mode !== "plant") await expect(page.locator(card(c))).toHaveCount(0);
  }
  if (a.pick !== undefined) await tapOrKey(page, `[data-testid="choice"][data-value="${a.pick}"]`, how);
  await expect(page.getByTestId("done")).toHaveAttribute("aria-disabled", "false");
  await tapOrKey(page, '[data-testid="done"]', how);
  await expect(page.getByTestId("result")).toBeVisible({ timeout: 10_000 });
  return { id, mode };
}

const atLevel = (level: number) => ({ progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "reef-rescue": level } } });
async function seedLevel(page: Page, level: number) {
  await page.goto("/grown-ups").catch(() => undefined);
  await page.evaluate((st) => localStorage.setItem("bz.v1", JSON.stringify(st)), { profile: ONBOARDED, ageBand: "ages-9-11", muted: true, ...atLevel(level) });
}

test("tutorial: drag the parrotfish onto the algae, Check; the patch blooms and a fish arrives", async ({ page }, info) => {
  const errors = collectErrors(page);
  mkdirSync(REVIEW, { recursive: true });
  await seed(page, { muted: true });
  await enter(page);
  const { mode } = await ready(page);
  expect(mode).toBe("eats");
  await expect(board(page)).toHaveAttribute("data-healthy", "2");
  await expect(page.getByTestId("done")).toHaveAttribute("aria-disabled", "true");
  await move(page, card("parrotfish"), target("algae"), "drag");
  await expect(page.locator(target("algae"))).toHaveAttribute("data-card", "parrotfish");
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-tutorial-placed.png` });
  const id = (await screen(page).getAttribute("data-exercise"))!;
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("result")).toContainText("Parrotfish scrape algae");
  await expect(board(page)).toHaveAttribute("data-healthy", "3");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-tutorial-solved.png` });
  await nextExercise(page, id);
  expect(errors).toEqual([]);
});

test("a full round by tap-tap (one item by keyboard, one by drag) ends with the Reef Guardian shell and a level up", async ({ page }, info) => {
  const errors = collectErrors(page);
  mkdirSync(REVIEW, { recursive: true });
  await seed(page, { muted: true });
  await enter(page);
  for (let i = 0; i < 8; i++) {
    const { id } = await solveCurrent(page, i === 2 ? "keyboard" : i === 4 ? "drag" : "tap");
    await nextExercise(page, id);
  }
  await press(page, '[data-testid="outro-skip"]').catch(() => undefined);
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Reef Guardian" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toHaveText("Level up! Next time: Level 2");
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-reward.png` });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("reef-guardian");
  expect(stored.progress.levels["reef-rescue"]).toBe(1);
  expect(errors).toEqual([]);
});

test("first miss: Dabble explains, the lens shows a clue, wrong cards float back; second miss: the chain is modelled and only it can be checked", async ({ page }, info) => {
  const errors = collectErrors(page);
  mkdirSync(REVIEW, { recursive: true });
  await seed(page, { muted: true, ...atLevel(3) });
  await enter(page);
  const { mode, p } = await ready(page);
  expect(mode).toBe("chain");
  const right = (await answerOf(page, mode, p)).moves.map(([c]) => c);
  const wrong = [...right].reverse();
  for (const [i, c] of wrong.entries()) await move(page, card(c), target(`slot-${i}`), "tap");
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("lens")).toBeVisible();
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
  // reversed 4-chain: no slot is right, so every card is back on the shelf
  await expect(page.locator('[data-testid="shelf"] [data-testid="choice"]')).toHaveCount(4);
  await page.getByTestId("helper").waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
  for (const [i, c] of wrong.entries()) await move(page, card(c), target(`slot-${i}`), "tap");
  await press(page, '[data-testid="done"]');
  await expect(page.locator(target("slot-3"))).toHaveClass(/is-model/, { timeout: 40_000 });
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
  for (const [i, c] of right.entries()) await expect(page.locator(target(`slot-${i}`))).toHaveAttribute("data-card", c);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-model.png` });
  const id = (await screen(page).getAttribute("data-exercise"))!;
  await expect(page.getByTestId("done")).toHaveAttribute("aria-disabled", "false");
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("result")).toContainText("energy flows");
  await nextExercise(page, id);
  expect(errors).toEqual([]);
});

test("every level is playable: habitats, chains, coral facts, stories, sorting, grazers, planting, the chart (drag where possible)", async ({ page }, info) => {
  test.setTimeout(500_000);
  const errors = collectErrors(page);
  mkdirSync(REVIEW, { recursive: true });
  for (const level of [1, 2, 4, 5, 6, 7, 8, 9]) {
    await seedLevel(page, level);
    await enter(page);
    for (let k = 0; k < 2; k++) {
      const { mode } = await ready(page);
      await page.screenshot({ path: `${REVIEW}/${info.project.name}-L${level}-${mode}.png` });
      const { id } = await solveCurrent(page, k === 0 ? "drag" : "keyboard");
      await page.waitForTimeout(500);
      if (k === 0) await page.screenshot({ path: `${REVIEW}/${info.project.name}-L${level}-${mode}-solved.png` });
      await nextExercise(page, id);
    }
  }
  expect(errors).toEqual([]);
});

const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];

async function noOverflow(page: Page) {
  await page.waitForTimeout(700);
  const bad = await page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const out: string[] = [];
    if (document.documentElement.scrollWidth > vw + 1) out.push(`page scrolls sideways ${document.documentElement.scrollWidth}>${vw}`);
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-testid="choice"], [data-testid="target"], [data-testid="placed"], [data-testid="done"], [data-testid="table-toggle"], [data-testid="replay"]'))) {
      const r = el.getBoundingClientRect();
      const id = `${el.dataset.testid}:${el.dataset.value ?? ""}`;
      if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) out.push(`${id} off screen ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
      if (r.width < 43.5 || r.height < 43.5) out.push(`${id} too small ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    const b = document.querySelector('[data-testid="reef-board"]')?.getBoundingClientRect();
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-testid="shelf"], [data-testid="scene"]'))) {
      const r = el.getBoundingClientRect();
      if (b && (r.bottom > b.bottom + 2 || r.right > b.right + 2)) out.push(`${el.dataset.testid} spills out of the board`);
    }
    // every target and card inside the scene/shelf panels (nothing clipped)
    const scene = document.querySelector('[data-testid="scene"]')?.getBoundingClientRect();
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-testid="scene"] [data-testid="target"]'))) {
      const r = el.getBoundingClientRect();
      if (scene && (r.top < scene.top - 1 || r.bottom > scene.bottom + 1 || r.left < scene.left - 1 || r.right > scene.right + 1)) out.push(`target ${el.dataset.value} clipped by the scene`);
    }
    // shelf cards are fully visible (never hidden inside a scrolled shelf)
    const shelf = document.querySelector('[data-testid="shelf"]')?.getBoundingClientRect();
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-testid="shelf"] [data-testid="choice"]'))) {
      const r = el.getBoundingClientRect();
      if (shelf && (r.bottom > shelf.bottom + 1 || r.right > shelf.right + 1)) out.push(`card ${el.dataset.value} hidden in the shelf`);
    }
    return out;
  });
  expect(bad).toEqual([]);
}

test("layout: no overflow and ≥44px targets at the four viewports (intro story, every play mode, reward)", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport sweep runs once");
  test.setTimeout(900_000);
  mkdirSync(REVIEW, { recursive: true });
  const errors = collectErrors(page);
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const level of [0, 1, 3, 4, 5, 6, 7, 8, 9]) {
      await seedLevel(page, level);
      await page.goto("/play/reef-rescue");
      await press(page, '[data-testid="story-begin"]');
      if (level === 0) {
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${REVIEW}/${vp.name}-intro.png` });
      }
      await press(page, '[data-testid="story-skip"]');
      for (let k = 0; k < (level === 1 || level === 9 ? 3 : 1); k++) {
        const { mode } = await ready(page);
        await noOverflow(page);
        await page.screenshot({ path: `${REVIEW}/${vp.name}-play-L${level}-${mode}.png` });
        if (level === 1 || level === 9) {
          const { id } = await solveCurrent(page, "tap");
          await nextExercise(page, id);
        }
      }
    }
    await seedLevel(page, 0);
    await enter(page);
    for (let i = 0; i < 8; i++) {
      const { id } = await solveCurrent(page, "tap");
      if (i === 0) {
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${REVIEW}/${vp.name}-solved.png` });
      }
      await nextExercise(page, id);
    }
    await press(page, '[data-testid="outro-skip"]').catch(() => undefined);
    await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${REVIEW}/${vp.name}-reward.png` });
  }
  expect(errors).toEqual([]);
});

test("reduced motion: no swimming, swaying or blooming inside the reef; colour still comes back", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "once");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(page, { muted: true });
  await enter(page);
  await ready(page);
  await move(page, card("parrotfish"), target("algae"), "tap");
  await press(page, '[data-testid="done"]');
  await expect(board(page)).toHaveAttribute("data-healthy", "3");
  const anims = await page.evaluate(() =>
    document.getAnimations().filter((a) => (a.effect as KeyframeEffect | null)?.target instanceof Element && ((a.effect as KeyframeEffect).target as Element).closest(".rr-stage") && a.playState === "running")
      .map((a) => { const t = (a.effect as KeyframeEffect).target as Element; return `${t.tagName} ${t.getAttribute("class")} ${t.parentElement?.getAttribute("class")} ${(a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty}`; }));
  expect(anims).toEqual([]);
  await page.screenshot({ path: `${REVIEW}/reduced-motion.png` });
});
