import { type Page, expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { buildRound } from "../src/engine/round";
import type { Exercise } from "../src/engine/types";
import { postcardTrip } from "../src/games/postcard-trip/definition";
import { type Mission, cardId, decodeMission } from "../src/games/postcard-trip/generator";
import { FEATURES, refOf } from "../src/games/postcard-trip/island";
import { ONBOARDED, collectErrors, press, screen } from "./helpers";
import { reviewDir } from "./helpers";

/** Yonder's Postcard Trip: story → island compass walks → world postcards, boats, balloon, equator and trips, by tap, tap-tap, drag and keyboard. */
const REVIEW = reviewDir("postcard-trip");
mkdirSync(REVIEW, { recursive: true });
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];
const state = (level: number | null) => ({
  muted: true, ageBand: "ages-6-8", profile: ONBOARDED, round: null,
  progress: { v: 1, stickers: [], roundsCompleted: level === null ? 0 : 1, skills: {}, levels: level === null ? {} : { "postcard-trip": level } },
});
async function seedAt(page: Page, level: number | null) {
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("bz.v1", JSON.stringify(s));
      sessionStorage.setItem("seeded", "1");
    }
  }, state(level));
}
async function resetTo(page: Page, level: number) {
  await page.goto("/");
  await page.evaluate((s) => {
    localStorage.clear();
    localStorage.setItem("bz.v1", JSON.stringify(s));
    sessionStorage.setItem("seeded", "1");
  }, state(level));
}
async function enter(page: Page) {
  await page.goto("/play/postcard-trip");
  const begin = page.locator('[data-testid="story-begin"], [data-testid="start-game"]').first();
  await begin.waitFor({ state: "visible", timeout: 20_000 });
  const resumed = (await begin.getAttribute("data-testid")) === "start-game";
  await begin.click({ force: true });
  if (!resumed) await press(page, '[data-testid="story-skip"]');
}
const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 30_000 });
const missed = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "feedback", { timeout: 30_000 });
const solvedNow = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", /feedback|solved/, { timeout: 30_000 });

async function current(page: Page): Promise<{ id: string; ex: Exercise; m: Mission }> {
  await answering(page);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).round as { level: number; seed: number });
  const ex = [...buildRound(postcardTrip, { level: saved.level, seed: saved.seed }).exercises, ...postcardTrip.exercises].find((e) => e.id === id);
  expect(ex, id).toBeDefined();
  return { id, ex: ex!, m: decodeMission(ex!) };
}
async function nextExercise(page: Page, id: string) {
  await expect
    .poll(async () => ((await screen(page).count()) === 0 ? "done" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 45_000 })
    .not.toBe(id);
}

type Way = "tap" | "drag" | "keyboard";
async function dragTo(page: Page, from: string, to: string) {
  const a = (await page.locator(from).first().boundingBox())!;
  const b = (await page.locator(to).first().boundingBox())!;
  const sx = a.x + a.width / 2, sy = a.y + a.height / 2, tx = b.x + b.width / 2, ty = b.y + b.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let k = 1; k <= 14; k++) await page.mouse.move(sx + ((tx - sx) * k) / 14, sy + ((ty - sy) * k) / 14);
  await page.mouse.up();
}
async function hit(page: Page, sel: string, way: Way) {
  if (way === "keyboard") {
    await page.locator(sel).first().focus();
    await page.keyboard.press("Enter");
  } else await press(page, sel);
}
const choice = (v: string) => `[data-testid="choice"][data-value="${v}"]`;
const region = (v: string) => `[data-testid="pc-region"][data-value="${v}"]`;
const card = (v: string) => `[data-testid="pc-card"][data-value="${v}"]`;
const slot = (i: number) => `[data-testid="pc-slot"][data-slot="${i}"]`;

/** Move one item (card/boat) onto a target the way a child would. */
async function place(page: Page, item: string, target: string, way: Way) {
  if (way === "drag") return dragTo(page, item, target);
  await hit(page, item, way);
  await expect(page.locator(item).first()).toHaveAttribute("aria-pressed", "true");
  await hit(page, target, way);
}

/** Solve the current mission correctly. */
async function solve(page: Page, m: Mission, ex: Exercise, way: Way) {
  if (m.kind === "island") {
    if (m.mode === "step" || m.mode === "route") {
      for (const d of m.moves) await hit(page, choice(d), way);
      if (m.moves.length > 1) await hit(page, '[data-testid="done"]', way);
      return;
    }
    if (m.mode === "key") return hit(page, choice(FEATURES.find((f) => m.features[f] === m.target)!), way);
    return hit(page, choice(refOf(m.target).toLowerCase()), way);
  }
  switch (m.mode) {
    case "continent":
      return place(page, card("postcard"), region(m.place!.continent), way);
    case "ocean":
      return place(page, card("boat"), region(m.ocean!), way);
    case "side":
      return hit(page, region(m.side!.ocean), way === "drag" ? "tap" : way);
    case "fly":
    case "hemi":
    case "season":
      return hit(page, choice((ex.answer as { correct: string }).correct), way === "drag" ? "tap" : way);
    case "cards":
      for (const p of m.cardPlaces) await place(page, card(`card-${p.id}`), region(p.continent), way);
      return;
    case "trip":
      for (let i = 0; i < m.stops.length; i++) await place(page, card(cardId(m.stops[i]!)), slot(i), way);
  }
}

async function noOverflow(page: Page) {
  const vp = page.viewportSize()!;
  const over = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
  expect(over.w).toBeLessThanOrEqual(vp.width + 1);
  expect(over.h).toBeLessThanOrEqual(vp.height + 1);
  for (const sel of ['[data-testid="choice"]', '[data-testid="done"]', '[data-testid="pc-card"]', '[data-testid="pc-region"]', '[data-testid="pc-slot"]', '[data-testid="pc-key-item"]', '[data-testid="pc-plan-slot"]', '[data-testid="pc-leg"]']) {
    for (const loc of await page.locator(sel).all()) {
      const box = await loc.boundingBox();
      if (!box) continue;
      // controls are ≥ 64 px for ages 5–9; spatial targets on a map (region pins, island squares in the key level)
      // follow the map's scale and stay ≥ 44 px (they also have a keyboard path)
      const spatial = sel === '[data-testid="pc-region"]' || (await loc.evaluate((el) => el.classList.contains("pc-tile")));
      expect(Math.min(box.width, box.height), sel).toBeGreaterThanOrEqual(spatial ? 43.5 : 63.5);
      expect(box.x, sel).toBeGreaterThanOrEqual(-1);
      expect(box.y, sel).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width, sel).toBeLessThanOrEqual(vp.width + 1);
      expect(box.y + box.height, sel).toBeLessThanOrEqual(vp.height + 1);
    }
  }
}

test("story → tutorial hand → a whole island round by tap and keyboard → Explorer Sticker and level up", async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await seedAt(page, null);
  const shot = (name: string) => page.screenshot({ path: `${REVIEW}/${info.project.name}-${name}.png` });
  await page.goto("/play/postcard-trip");
  await press(page, '[data-testid="story-begin"]');
  await expect(page.getByTestId("story")).toBeVisible();
  await page.waitForTimeout(800);
  await shot("01-story");
  await press(page, '[data-testid="story-skip"]');

  const first = await current(page);
  expect(first.id).toBe("pc-tutorial-north");
  await expect(page.getByTestId("hand-pointer")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("pc-island-card")).toBeVisible(); // level 1: the postcard waits at the lighthouse
  await shot("02-play-tutorial");
  await noOverflow(page);

  for (let i = 0; i < 10; i++) {
    if ((await screen(page).count()) === 0) break;
    const { id, ex, m } = await current(page);
    const way: Way = i % 2 ? "keyboard" : "tap";
    await solve(page, m, ex, way);
    await solvedNow(page);
    if (m.kind === "island" && (m.mode === "step" || m.mode === "route")) {
      await expect(page.getByTestId("pc-board")).toHaveAttribute("data-yonder", String(m.target));
    }
    if (i === 2) await shot("03-play-solved");
    await nextExercise(page, id);
  }
  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(900);
  await shot("04-outro");
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Explorer Sticker" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  await page.waitForTimeout(1200);
  await shot("05-reward");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("explorer-sticker");
  expect(stored.progress.levels["postcard-trip"]).toBe(1);
  if (info.project.name === "desktop") {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-reward.png` });
    }
  }
  expect(errors).toEqual([]);
});

test("a whole world round by drag (desktop) or tap-tap (phone): postcards to continents", async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await seedAt(page, 5);
  await enter(page);
  const way: Way = info.project.name === "desktop" ? "drag" : "tap";
  for (let i = 0; i < 10; i++) {
    if ((await screen(page).count()) === 0) break;
    const { id, ex, m } = await current(page);
    await solve(page, m, ex, way);
    await solvedNow(page);
    if (i === 0) await page.screenshot({ path: `${REVIEW}/${info.project.name}-06-world-posted.png` });
    await nextExercise(page, id);
  }
  await expect(page.getByTestId("outro").or(page.getByTestId("achievement")).first()).toBeVisible({ timeout: 30_000 });
  expect(errors).toEqual([]);
});

test("first miss: Zephy explains and the compass rose glows; second miss: ghost steps to follow", async ({ page }, info) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await seedAt(page, 1);
  await enter(page);
  const { m } = await current(page);
  if (m.kind !== "island") throw new Error("expected an island mission");
  const opp = { n: "s", s: "n", e: "w", w: "e" } as const;
  const wrong = opp[m.moves[0]!];
  await press(page, choice(wrong)); // the east/west (or north/south) swap: Yonder walks to the decoy
  await missed(page);
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(".pc-rose.is-glow")).toBeVisible();
  await expect(page.getByTestId("pc-board")).toHaveAttribute("data-yonder", String(m.start)); // home again, never punished
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-07-first-miss.png` });
  await press(page, choice(wrong));
  await missed(page);
  await answering(page);
  await expect(page.locator(".pc-plan-slot.has-ghost")).toHaveCount(1);
  await expect(page.getByTestId("pc-model-step")).toHaveCount(1);
  await expect(page.locator(`${choice(m.moves[0]!)}.is-model`)).toBeVisible();
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-08-model.png` });
  await press(page, choice(m.moves[0]!));
  await solvedNow(page);
  await expect(page.getByTestId("pc-board")).toHaveClass(/is-solved/);
  expect(errors).toEqual([]);
});

test("world misses: the wrong continent greys out and the area glows; then a ghost postcard to tap", async ({ page }, info) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await seedAt(page, 5);
  await enter(page);
  const { m } = await current(page);
  if (m.kind !== "world") throw new Error("expected a world mission");
  const right = m.place!.continent;
  const [w1, w2] = (["antarctica", "australia", "sa", "europe"] as const).filter((c) => c !== right);
  await place(page, card("postcard"), region(w1!), "tap");
  await missed(page);
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(`${region(w1!)}.is-out`)).toBeVisible();
  await expect(page.locator(".pc-area")).toHaveCount(1);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-09-world-first-miss.png` });
  await press(page, region(w2!)); // tapping a place posts the card straight away
  await missed(page);
  await answering(page);
  await expect(page.getByTestId("pc-ghost")).toBeVisible();
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-10-world-model.png` });
  await press(page, '[data-testid="pc-ghost"]');
  await solvedNow(page);
  await expect(page.locator(`${region(right)}.is-right`)).toBeVisible();
  expect(errors).toEqual([]);
});

test("every level plays by every input: oceans, balloon, equator, seasons, trips, review", async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  const drag = info.project.name === "desktop" ? "drag" : "tap";
  const cases: { level: number; way: Way }[] = [
    { level: 2, way: "keyboard" }, { level: 3, way: "tap" }, { level: 4, way: "keyboard" }, { level: 6, way: drag },
    { level: 6, way: "keyboard" }, { level: 7, way: "tap" }, { level: 8, way: "keyboard" }, { level: 9, way: drag }, { level: 9, way: "keyboard" },
  ];
  for (const c of cases) {
    await resetTo(page, c.level);
    await enter(page);
    for (let k = 0; k < 2; k++) {
      const { id, ex, m } = await current(page);
      await solve(page, m, ex, c.way);
      await solvedNow(page);
      await expect(page.getByTestId("pc-board")).toHaveClass(/is-solved/);
      if (k === 0) await page.screenshot({ path: `${REVIEW}/${info.project.name}-11-level${c.level}-${c.way}-${m.mode}.png` });
      await nextExercise(page, id);
    }
  }
  expect(errors).toEqual([]);
});

test("the map fits every viewport at every kind of level", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport sweep runs once (it resizes through all four sizes)");
  test.setTimeout(240_000);
  for (const level of [0, 2, 3, 4, 5, 6, 7, 8, 9]) {
    await resetTo(page, level);
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.goto("/play/postcard-trip");
      const begin = page.locator('[data-testid="story-begin"], [data-testid="start-game"]').first();
      await begin.waitFor({ state: "visible", timeout: 20_000 });
      const resumed = (await begin.getAttribute("data-testid")) === "start-game";
      if (level === 0) {
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-${resumed ? "intro" : "story"}.png` });
      }
      await begin.click({ force: true });
      if (!resumed) await press(page, '[data-testid="story-skip"]');
      await current(page);
      await page.waitForTimeout(500);
      await noOverflow(page);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-play-l${level}.png` });
    }
  }
});

test("reduced motion: no walking animation, Yonder arrives at once", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one run is enough");
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAt(page, 2);
  await enter(page);
  const { ex, m } = await current(page);
  await page.keyboard.press("Tab"); // arrow keys work too: plan the route with them
  for (const d of (m as { moves: string[] }).moves) await page.keyboard.press({ n: "ArrowUp", e: "ArrowRight", s: "ArrowDown", w: "ArrowLeft" }[d]!);
  await expect(page.locator('[data-testid="pc-plan-slot"][data-dir=""]')).toHaveCount(0);
  await press(page, '[data-testid="done"]');
  await solvedNow(page);
  await expect(page.getByTestId("pc-board")).toHaveAttribute("data-yonder", String((m as { target: number }).target));
  expect(ex.id).toContain("route");
  expect(errors).toEqual([]);
});
