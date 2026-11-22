import { mkdirSync } from "node:fs";
import { type Locator, type Page, expect, test } from "@playwright/test";
import {
  engineId,
  maxCrates,
  missionTable,
  missionWinners,
  rankOrder,
  scenarioOf,
  smallestLifter,
  speedUpChange,
  weightOf,
} from "../src/games/rocket-lab/logic";
import { ONBOARDED, collectErrors, press, screen, seed } from "./helpers";
import { reviewDir } from "./helpers";

/** Dabble's Rocket Lab: build by drag, tap-tap and keyboard; predict; launch; hints; every mode; a full round to the Launch Patch. */

const REVIEW = reviewDir("rocket-lab");
const board = (page: Page) => page.getByTestId("rocket-board");
type Method = "tap" | "drag" | "keyboard";

async function enter(page: Page) {
  await page.goto("/play/rocket-lab");
  await press(page, '[data-testid="story-begin"]');
  await press(page, '[data-testid="story-skip"]');
}
async function ready(page: Page) {
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
  await page.getByTestId("helper").waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
  return scenarioOf(JSON.parse((await board(page).getAttribute("data-params"))!) as Record<string, number>);
}
async function nextExercise(page: Page, prev: string) {
  await expect
    .poll(async () => ((await screen(page).count()) === 0 ? "round-over" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 40_000 })
    .not.toBe(prev);
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
async function isTouch(page: Page) {
  return page.evaluate(() => matchMedia("(pointer: coarse)").matches);
}
/** Move a part onto a target the chosen way (drag falls back to tap-tap on touch devices). */
async function move(page: Page, from: string, to: string, how: Method) {
  if (how === "drag" && !(await isTouch(page))) return drag(page, page.locator(from).first(), page.locator(to).first());
  if (how === "keyboard") {
    await page.locator(from).first().focus();
    await page.keyboard.press("Enter");
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

/** The correct value for any mode, computed from the same physics the game uses. */
function answerOf(s: ReturnType<typeof scenarioOf>): string | number | string[] {
  switch (s.mode) {
    case "lift": return s.t > s.w ? "yes" : "no";
    case "engine": case "engineKg": case "moonEngine": return engineId(smallestLifter(s.engines, s.w)!);
    case "cargo": return maxCrates(s.t, s.w, s.c);
    case "weight": return weightOf(s.m);
    case "moonMass": return s.m;
    case "fuelNet": return s.t2 - weightOf(s.m2);
    case "fuelChange": return speedUpChange(s.t, s.m, s.t2, s.m2);
    case "rank": return rankOrder(s.rockets);
    case "mission": {
      const w = missionWinners(missionTable(s.thrusts, s.m), s.target, s.budget)[0]!;
      return [String(w.engine), String(w.tanks)];
    }
  }
}

/** Build + predict the right answer, then launch. */
async function solveCurrent(page: Page, how: Method = "tap") {
  const s = await ready(page);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  const a = answerOf(s);
  switch (s.mode) {
    case "lift":
      await move(page, '[data-testid="part"][data-part="engine"]', '[data-testid="mount"]', how);
      await expect(board(page)).toHaveAttribute("data-engine", engineId(s.t));
      await tapOrKey(page, `[data-testid="choice"][data-value="${a}"]`, how);
      break;
    case "engine": case "engineKg": case "moonEngine":
      await move(page, `[data-testid="choice"][data-value="${a}"]`, '[data-testid="mount"]', how);
      await expect(board(page)).toHaveAttribute("data-engine", String(a));
      break;
    case "cargo":
      for (let i = 0; i < (a as number); i++) {
        if (how === "drag" && !(await isTouch(page))) await drag(page, page.getByTestId("crate-source"), page.getByTestId("rocket"));
        else {
          if (i === 0 || how === "keyboard") await tapOrKey(page, '[data-testid="crate-source"]', how);
          await tapOrKey(page, '[data-testid="bay"]', how);
        }
        await expect(board(page)).toHaveAttribute("data-crates", String(i + 1));
        if (how === "keyboard") await page.keyboard.press("Escape").catch(() => undefined);
      }
      break;
    case "weight": case "moonMass": case "fuelNet": case "fuelChange":
      await tapOrKey(page, `[data-testid="choice"][data-value="${a}"]`, how);
      break;
    case "rank":
      for (const [i, rid] of (a as string[]).entries()) await move(page, `[data-testid="rank-chip"][data-value="${rid}"]`, `[data-testid="slot"][data-slot="${i}"]`, how);
      await expect(page.locator('[data-testid="slot"][data-slot="2"]')).toHaveAttribute("data-value", (a as string[])[2]!);
      break;
    case "mission": {
      const [e, n] = (a as string[]).map(Number) as [number, number];
      await page.getByTestId("thrust-slider").fill(String(e));
      for (let i = 0; i < n; i++) {
        if (how === "drag" && !(await isTouch(page))) await drag(page, page.getByTestId("tank-source"), page.getByTestId("rocket"));
        else {
          if (i === 0) await press(page, '[data-testid="tank-source"]');
          await press(page, '[data-testid="bay"]');
        }
        await expect(board(page)).toHaveAttribute("data-tanks", String(i + 1));
      }
      break;
    }
  }
  // tap-tap crates/tanks keep "carrying" from the shelf; Launch still works
  await expect(page.getByTestId("launch")).toHaveAttribute("aria-disabled", "false");
  await tapOrKey(page, '[data-testid="launch"]', how);
  await expect(page.getByTestId("result")).toBeVisible({ timeout: 10_000 });
  return { id, s };
}

const atLevel = (level: number) => ({ progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "rocket-lab": level } } });

test("tutorial: drag the engine on, the thrust arrow appears to scale, predict and launch; the flight shows lift-off", async ({ page }, info) => {
  const errors = collectErrors(page);
  mkdirSync(REVIEW, { recursive: true });
  await seed(page, { muted: true });
  await enter(page);
  const s = await ready(page);
  expect([s.t, s.w]).toEqual([6, 3]);
  // before the engine: only the pull-down arrow; prediction cards wait
  await expect(page.getByTestId("thrust-arrow")).toHaveCount(0);
  await expect(page.getByTestId("weight-arrow")).toHaveAttribute("data-value", "3");
  await expect(page.locator('[data-testid="choice"][data-value="yes"]')).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByTestId("launch")).toHaveAttribute("aria-disabled", "true");
  await move(page, '[data-testid="part"][data-part="engine"]', '[data-testid="mount"]', "drag");
  await expect(page.getByTestId("thrust-arrow")).toHaveAttribute("data-value", "6");
  // arrows exactly proportional: 6 pushes is twice as long as 3
  const up = (await page.getByTestId("thrust-arrow").boundingBox())!.height;
  const down = (await page.getByTestId("weight-arrow").boundingBox())!.height;
  expect(up / down).toBeCloseTo(2, 1);
  await press(page, '[data-testid="choice"][data-value="yes"]');
  await expect(page.locator('[data-testid="choice"][data-value="yes"]')).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-tutorial-built.png` });
  const id = (await screen(page).getAttribute("data-exercise"))!;
  await press(page, '[data-testid="launch"]');
  await expect(page.getByTestId("result")).toContainText("6 > 3");
  await expect(board(page)).toHaveAttribute("data-flight", "is-launch");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-tutorial-launch.png` });
  await nextExercise(page, id);
  expect(errors).toEqual([]);
});

test("a full round by tap-tap (and one item by keyboard) ends with the Launch Patch and a level up", async ({ page }, info) => {
  const errors = collectErrors(page);
  mkdirSync(REVIEW, { recursive: true });
  await seed(page, { muted: true });
  await enter(page);
  for (let i = 0; i < 8; i++) {
    const { id } = await solveCurrent(page, i === 2 ? "keyboard" : "tap");
    await nextExercise(page, id);
  }
  await press(page, '[data-testid="outro-skip"]').catch(() => undefined);
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Launch Patch" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toHaveText("Level up! Next time: Level 2");
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-reward.png` });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("launch-patch");
  expect(stored.progress.levels["rocket-lab"]).toBe(1);
  expect(errors).toEqual([]);
});

test("first miss: Rumble explains, weighs the rocket and the engine greys out; second miss: arrows compared and the right engine glows", async ({ page }, info) => {
  const errors = collectErrors(page);
  await seed(page, { muted: true, ...atLevel(2) });
  await enter(page);
  const s = await ready(page);
  expect(s.mode).toBe("engine");
  const right = engineId(smallestLifter(s.engines, s.w)!);
  const balanced = engineId(s.w);
  const weak = engineId(s.engines.find((t) => t < s.w)!);

  await move(page, `[data-testid="choice"][data-value="${balanced}"]`, '[data-testid="mount"]', "tap");
  await press(page, '[data-testid="launch"]');
  await expect(page.getByTestId("result")).toContainText("balanced");
  await expect(board(page)).toHaveAttribute("data-flight", "is-rumble");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("spring-scale")).toBeVisible();
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
  await expect(page.locator(`[data-testid="choice"][data-value="${balanced}"]`)).toHaveClass(/is-out/);
  await expect(board(page)).toHaveAttribute("data-engine", ""); // the greyed engine went back to the shelf

  await page.getByTestId("helper").waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
  await move(page, `[data-testid="choice"][data-value="${weak}"]`, '[data-testid="mount"]', "tap");
  await press(page, '[data-testid="launch"]');
  await expect(page.locator(`[data-testid="choice"][data-value="${right}"]`)).toHaveClass(/is-model/, { timeout: 40_000 });
  await expect(page.locator(".rl-wins").first()).toBeVisible();
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-model.png` });
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
  // errorless: only the glowing engine can be launched
  const id = (await screen(page).getAttribute("data-exercise"))!;
  await move(page, `[data-testid="choice"][data-value="${right}"]`, '[data-testid="mount"]', "tap");
  await press(page, '[data-testid="launch"]');
  await expect(board(page)).toHaveAttribute("data-flight", "is-launch");
  await nextExercise(page, id);
  expect(errors).toEqual([]);
});

test("every level's experiment is playable: cargo, weight, Moon, ranking, fuel and the mission planner (drag where possible)", async ({ page }, info) => {
  test.setTimeout(400_000);
  const errors = collectErrors(page);
  mkdirSync(REVIEW, { recursive: true });
  for (const level of [3, 4, 5, 6, 7, 8]) {
    await page.goto("/grown-ups").catch(() => undefined);
    await page.evaluate((st) => localStorage.setItem("bz.v1", JSON.stringify(st)), { profile: ONBOARDED, ageBand: "ages-9-11", muted: true, ...atLevel(level) });
    await enter(page);
    for (let k = 0; k < 2; k++) {
      const s = await ready(page);
      await page.screenshot({ path: `${REVIEW}/${info.project.name}-L${level}-${s.mode}.png` });
      const { id } = await solveCurrent(page, k === 0 ? "drag" : "tap");
      await page.waitForTimeout(700);
      if (k === 0) await page.screenshot({ path: `${REVIEW}/${info.project.name}-L${level}-${s.mode}-result.png` });
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
    const sel = '[data-testid="choice"], [data-testid="part"], [data-testid="mount"], [data-testid="bay"], [data-testid="rocket"], [data-testid="launch"], [data-testid="crate-source"], [data-testid="tank-source"], [data-testid="rank-chip"], [data-testid="slot"], [data-testid="thrust-slider"], [data-testid="replay"]';
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const r = el.getBoundingClientRect();
      const id = `${el.dataset.testid}${el.dataset.value ?? el.dataset.slot ?? ""}`;
      if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) out.push(`${id} off screen ${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
      if (r.width < 43.5 || r.height < 43.5) out.push(`${id} too small ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    // the board's panels stay inside the board
    const b = document.querySelector('[data-testid="rocket-board"]')?.getBoundingClientRect();
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-testid="shelf"], [data-testid="scene"]'))) {
      const r = el.getBoundingClientRect();
      if (b && (r.bottom > b.bottom + 2 || r.right > b.right + 2)) out.push(`${el.dataset.testid} spills out of the board`);
    }
    return out;
  });
  expect(bad).toEqual([]);
}

test("layout: no overflow and ≥44px targets at the four viewports (intro story, play at four levels, reward)", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport sweep runs once");
  test.setTimeout(600_000);
  mkdirSync(REVIEW, { recursive: true });
  const errors = collectErrors(page);
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const level of [0, 3, 6, 8]) {
      await page.goto("/grown-ups").catch(() => undefined);
      await page.evaluate((st) => localStorage.setItem("bz.v1", JSON.stringify(st)), { profile: ONBOARDED, ageBand: "ages-9-11", muted: true, ...atLevel(level) });
      await page.goto("/play/rocket-lab");
      await press(page, '[data-testid="story-begin"]');
      if (level === 0) {
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${REVIEW}/${vp.name}-intro.png` });
      }
      await press(page, '[data-testid="story-skip"]');
      const s = await ready(page);
      await noOverflow(page);
      await page.screenshot({ path: `${REVIEW}/${vp.name}-play-L${level}-${s.mode}.png` });
    }
    // reward: a level-0 round
    await page.goto("/grown-ups").catch(() => undefined);
    await page.evaluate((st) => localStorage.setItem("bz.v1", JSON.stringify(st)), { profile: ONBOARDED, ageBand: "ages-9-11", muted: true });
    await enter(page);
    for (let i = 0; i < 8; i++) {
      const { id } = await solveCurrent(page, "tap");
      if (i === 0) {
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${REVIEW}/${vp.name}-launch.png` });
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

test("reduced motion: no flight animation, the rocket's start (ghost) and end positions are shown", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "once");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seed(page, { muted: true });
  await enter(page);
  await ready(page);
  await move(page, '[data-testid="part"][data-part="engine"]', '[data-testid="mount"]', "tap");
  await press(page, '[data-testid="choice"][data-value="yes"]');
  await press(page, '[data-testid="launch"]');
  await expect(page.locator(".rl-ghost")).toBeVisible();
  const anims = await page.evaluate(() => document.getAnimations().filter((a) => (a.effect as KeyframeEffect | null)?.target instanceof Element && ((a.effect as KeyframeEffect).target as Element).closest(".rl-stage")).length);
  expect(anims).toBe(0);
  await page.screenshot({ path: `${REVIEW}/reduced-motion-launch.png` });
});
