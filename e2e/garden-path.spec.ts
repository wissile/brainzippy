import { type Page, expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { buildRound } from "../src/engine/round";
import { gardenPath } from "../src/games/garden-path/definition";
import { type Dir, type Puzzle, decodePuzzle, movesOf } from "../src/games/garden-path/logic";
import { collectErrors, press, screen, seed } from "./helpers";

/** Toggle's Garden Path: story → programs built by tap, drag, tap-tap and keyboard → Go → outro → Path Finder + level up. */
const REVIEW = "/home/claude/review/garden-path";
mkdirSync(REVIEW, { recursive: true });
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];
const PROFILE = { monster: { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" }, monsterName: "Ziggy", kidName: "Testkid", step: "done", parentSignup: "skipped" };
const atLevel = (level: number) => ({ muted: true, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "garden-path": level } } });

const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 30_000 });
const card = (c: string) => `[data-testid="choice"][data-value="${c}"]`;
const slot = (i: number) => `[data-testid="gp-slot"][data-slot="${i}"]`;
const body = (i: number, j: number) => `[data-testid="gp-body"][data-slot="${i}"][data-body="${j}"]`;

/** The puzzle on screen, rebuilt from the saved round (same level + seed → same exercises). */
async function current(page: Page): Promise<{ id: string; pz: Puzzle }> {
  await answering(page);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).round as { level: number; seed: number });
  const ex = [...buildRound(gardenPath, { level: saved.level, seed: saved.seed }).exercises, ...gardenPath.exercises].find((e) => e.id === id);
  expect(ex, id).toBeDefined();
  return { id, pz: decodePuzzle(ex!) };
}

type Way = "tap" | "drag" | "taptap" | "keyboard";

async function hit(page: Page, sel: string, way: Way) {
  if (way === "keyboard") {
    await page.locator(sel).first().focus();
    await page.keyboard.press("Enter");
  } else await press(page, sel);
}
async function dragTo(page: Page, from: string, to: string) {
  const a = (await page.locator(from).boundingBox())!;
  const b = (await page.locator(to).boundingBox())!;
  const sx = a.x + a.width / 2, sy = a.y + a.height / 2, tx = b.x + b.width / 2, ty = b.y + b.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(sx + ((tx - sx) * k) / 12, sy + ((ty - sy) * k) / 12);
  await page.mouse.up();
}
async function setCountTo(page: Page, top: number, n: number, way: Way) {
  const sel = `[data-testid="gp-count"][data-slot="${top}"]`;
  for (let k = 0; k < 6 && Number(await page.locator(sel).getAttribute("data-n")) !== n; k++) {
    if (way === "keyboard") {
      const cur = Number(await page.locator(sel).getAttribute("data-n"));
      await page.locator(sel).focus();
      await page.keyboard.press(cur < n ? "ArrowUp" : "ArrowDown");
    } else await press(page, sel);
  }
  await expect(page.locator(sel)).toHaveAttribute("data-n", String(n));
}
/** Put one card at a top-level space (tap / tap-tap / keyboard use "next empty space"; drag drops on the space). */
async function put(page: Page, c: string, top: number, way: Way, bodyIdx = -1) {
  if (way === "drag") await dragTo(page, card(c), bodyIdx >= 0 ? body(top, bodyIdx) : slot(top));
  else await hit(page, card(c), way);
  if (bodyIdx >= 0) await expect(page.locator(body(top, bodyIdx))).toHaveAttribute("data-block", c);
  else await expect(page.locator(slot(top))).toHaveAttribute("data-block", c);
}

/** Debug levels: fix only the planted bug (tap the wrong card out, put the right one in). Else build the intended program. */
async function solve(page: Page, pz: Puzzle, way: Way) {
  if (pz.given && pz.bug) {
    const b = pz.bug;
    const right = pz.solution[b.top]!;
    if (b.kind === "count" && right.t === "repeat") return setCountTo(page, b.top, right.n, way);
    const wantDir = right.t === "move" ? right.d : right.body[b.body]!;
    const sel = b.body >= 0 ? body(b.top, b.body) : slot(b.top);
    if (way === "keyboard") {
      await page.locator(sel).focus();
      await page.keyboard.press("Backspace");
    } else await press(page, sel); // tap the wrong card: it comes out, its space stays empty
    await expect(page.locator(sel)).toHaveAttribute("data-block", "");
    await put(page, wantDir, b.top, way === "taptap" ? "tap" : way, b.body);
    return;
  }
  if (way === "taptap") {
    // tap-tap: a card goes in, tap it to take it out (its space stays empty), tap the card that belongs there
    const first = pz.solution[0]!;
    const other = pz.palette.find((d) => first.t !== "move" || d !== first.d);
    if (other) {
      await press(page, card(other));
      await expect(page.locator(slot(0))).toHaveAttribute("data-block", other);
      await press(page, slot(0));
      await expect(page.locator(slot(0))).toHaveAttribute("data-block", "");
    }
  }
  for (let i = 0; i < pz.solution.length; i++) {
    const blk = pz.solution[i]!;
    if (blk.t === "move") await put(page, blk.d, i, way);
    else {
      await put(page, "repeat", i, way);
      for (let j = 0; j < blk.body.length; j++) await put(page, blk.body[j]!, i, way, j);
      await setCountTo(page, i, blk.n, way);
    }
  }
}
async function go(page: Page, way: Way) {
  if (way === "keyboard") {
    await page.getByTestId("done").focus();
    await page.keyboard.press("Enter");
  } else await press(page, '[data-testid="done"]');
}
async function nextExercise(page: Page, id: string) {
  await expect
    .poll(async () => ((await screen(page).count()) === 0 ? "done" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 45_000 })
    .not.toBe(id);
}
async function noOverflow(page: Page) {
  const vp = page.viewportSize()!;
  const over = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
  expect(over.w).toBeLessThanOrEqual(vp.width + 1);
  expect(over.h).toBeLessThanOrEqual(vp.height + 1);
  for (const sel of ['[data-testid="choice"]', '[data-testid="gp-slot"]', '[data-testid="gp-body"]', '[data-testid="gp-count"]', '[data-testid="done"]', '[data-testid="gp-board"] .gp-garden']) {
    for (const box of await Promise.all((await page.locator(sel).all()).map((c) => c.boundingBox()))) {
      if (!box) continue;
      if (!sel.includes("garden")) expect(Math.min(box.width, box.height), sel).toBeGreaterThanOrEqual(63.5);
      expect(box.x, sel).toBeGreaterThanOrEqual(-1);
      expect(box.y, sel).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width, sel).toBeLessThanOrEqual(vp.width + 1);
      expect(box.y + box.height, sel).toBeLessThanOrEqual(vp.height + 1);
    }
  }
}
async function enter(page: Page) {
  await page.goto("/play/garden-path");
  const begin = page.locator('[data-testid="story-begin"], [data-testid="start-game"]').first();
  await begin.waitFor({ state: "visible", timeout: 20_000 });
  const resumed = (await begin.getAttribute("data-testid")) === "start-game";
  await begin.click({ force: true });
  if (!resumed) await press(page, '[data-testid="story-skip"]');
}

test("child programs Toggle by tap, drag, tap-tap and keyboard, and levels up", async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await seed(page, { muted: true });
  const shot = (name: string) => page.screenshot({ path: `${REVIEW}/${info.project.name}-${name}.png` });

  await page.goto("/play/garden-path");
  await press(page, '[data-testid="story-begin"]');
  await expect(page.getByTestId("story")).toBeVisible();
  await page.waitForTimeout(700);
  await shot("01-story");
  await press(page, '[data-testid="story-skip"]');

  const first = await current(page);
  expect(first.id).toBe("gp-tutorial-right");
  await expect(page.getByTestId("hand-pointer")).toBeVisible({ timeout: 20_000 }); // tutorial hand points at the → card
  await shot("02-play-tutorial");
  await noOverflow(page);

  const ways: Way[] = ["tap", "drag", "taptap", "keyboard", "tap", "drag", "taptap", "keyboard", "tap"];
  for (let i = 0; i < 9; i++) {
    if ((await screen(page).count()) === 0) break;
    const { id, pz } = await current(page);
    let way = ways[i]!;
    if (way === "drag" && info.project.name !== "desktop") way = "tap"; // pointer drag is covered on desktop
    await solve(page, pz, way);
    if (i === 2) await shot("03-play-program");
    await go(page, way);
    await expect(page.getByTestId("gp-board")).toHaveAttribute("data-running", "true");
    await expect(screen(page)).toHaveAttribute("data-phase", /feedback|solved/, { timeout: 20_000 });
    await expect(page.getByTestId("gp-board")).toHaveClass(/is-solved/);
    await expect(page.getByTestId("gp-board")).toHaveAttribute("data-toggle", String(pz.goal));
    if (i === 1) await shot("04-play-solved");
    await nextExercise(page, id);
  }

  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Path Finder" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  await page.waitForTimeout(1200);
  await shot("05-reward");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("path-finder");
  expect(stored.progress.levels["garden-path"]).toBe(1);
  if (info.project.name === "desktop") {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-reward.png` });
    }
  }
  expect(errors).toEqual([]);
});

test("first miss: Puff explains and the first wrong card wobbles; second miss: footprints + ghost cards; then it runs", async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await seed(page, atLevel(2));
  await enter(page);
  const { pz } = await current(page);
  const used = new Set(movesOf(pz.solution));
  const wrong = (["up", "right", "down", "left"] as Dir[]).find((d) => !used.has(d))!;
  for (let i = 0; i < pz.slots; i++) await press(page, card(wrong));
  await press(page, '[data-testid="done"]');
  // miss 1: never punished — Puff explains, the run replays and stops on the first wrong card, which wobbles
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".gp-space.is-bug").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(`${slot(0)}.is-bug`)).toBeVisible();
  await answering(page);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-06-first-miss.png` });
  // miss 2: the worked example — numbered footprints on the grid, ghost cards in the strip
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("gp-model-step").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".gp-ghost").first()).toBeVisible();
  await answering(page);
  await expect(page.getByTestId("gp-model-step")).toHaveCount(movesOf(pz.solution).length);
  await expect(page.locator(`${card(wrong)}.is-out`)).toBeVisible();
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-07-model.png` });
  // errorless: tap each ghost card to confirm it, then Go
  for (let i = 0; i < pz.solution.length; i++) await press(page, slot(i));
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("gp-board")).toHaveClass(/is-solved/, { timeout: 20_000 });
  expect(errors).toEqual([]);
});

test("debugging and repeat levels play by every input", async ({ page }, info) => {
  test.setTimeout(180_000);
  const errors = collectErrors(page);
  const cases: { level: number; way: Way }[] = [
    { level: 4, way: "keyboard" },
    { level: 5, way: "tap" },
    { level: 6, way: info.project.name === "desktop" ? "drag" : "tap" },
    { level: 7, way: "keyboard" },
    { level: 8, way: "tap" },
    { level: 8, way: "keyboard" },
  ];
  for (const c of cases) {
    await page.context().clearCookies();
    await page.goto("/");
    await page.evaluate(({ lv, profile }) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("bz.v1", JSON.stringify({ muted: true, ageBand: "ages-6-8", profile, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "garden-path": lv } }, round: null }));
      sessionStorage.setItem("seeded", "1");
    }, { lv: c.level, profile: PROFILE });
    await enter(page);
    const { pz } = await current(page);
    if (pz.given) await expect(page.locator(slot(0))).not.toHaveAttribute("data-block", ""); // the buggy program is already in the strip
    await solve(page, pz, c.way);
    await page.screenshot({ path: `${REVIEW}/${info.project.name}-08-level${c.level}-${c.way}.png` });
    await go(page, c.way);
    await expect(page.getByTestId("gp-board")).toHaveClass(/is-solved/, { timeout: 25_000 });
  }
  expect(errors).toEqual([]);
});

test("garden fits every viewport at every kind of level", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport sweep runs once (it resizes through all four sizes)");
  test.setTimeout(240_000);
  for (const level of [0, 3, 4, 6, 7, 8]) {
    await page.context().clearCookies();
    await page.goto("/");
    await page.evaluate(({ lv, profile }) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("bz.v1", JSON.stringify({ muted: true, ageBand: "ages-6-8", profile, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "garden-path": lv } }, round: null }));
    }, { lv: level, profile: PROFILE });
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.goto("/play/garden-path");
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
          await page.waitForTimeout(600);
          await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-story.png` });
        }
        await press(page, '[data-testid="story-skip"]');
      }
      await answering(page);
      // fill the strip so the widest program (repeat cards, two rows) is what we measure
      const { pz } = await current(page);
      if (!pz.given) await solve(page, pz, "tap");
      await page.waitForTimeout(500);
      await noOverflow(page);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-play-l${level}.png` });
      // empty the strip again so the next viewport starts from the same exercise
      if (!pz.given) for (let i = 0; i < pz.solution.length; i++) await press(page, slot(i));
    }
  }
});
