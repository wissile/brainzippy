import { type Page, expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { collectErrors, press, screen, seed } from "./helpers";
import { reviewDir } from "./helpers";

/** Zephy's Sky Hoops: story → fly by tap, drag and keyboard → outro → Sky Wings + level up; every mode; hints; viewports. */
const REVIEW = reviewDir("sky-hoops");
mkdirSync(REVIEW, { recursive: true });
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];
const PROFILE = { monster: { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" }, monsterName: "Ziggy", kidName: "Testkid", step: "done", parentSignup: "skipped" };
type Way = "tap" | "drag" | "keyboard";
const KEY: Record<string, string> = { back: "ArrowDown", fwd: "ArrowUp", left: "ArrowLeft", right: "ArrowRight", lpedal: "q", rpedal: "e" };
const HOOP_CTL: Record<string, string> = { above: "back", below: "fwd", left: "left", right: "right" };
const PART: Record<string, string> = { back: "elevator", fwd: "elevator", left: "ailerons", right: "ailerons", lpedal: "rudder", rpedal: "rudder" };
const FORCE: Record<string, string> = { level: "balanced", faster: "thrustWins", slower: "dragWins", down: "weight", up: "lift" };
const sel = (v: string) => `[data-testid="choice"][data-value="${v}"]`;

const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 30_000 });
const board = (page: Page) => page.getByTestId("sh-board");
async function exId(page: Page) {
  await answering(page);
  return (await screen(page).getAttribute("data-exercise"))!;
}
async function nextExercise(page: Page, id: string) {
  await expect
    .poll(async () => ((await screen(page).count()) === 0 ? "done" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 45_000 })
    .not.toBe(id);
}
async function reset(page: Page, level: number) {
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(({ lv, profile }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("bz.v1", JSON.stringify({ muted: true, ageBand: "ages-6-8", profile, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "sky-hoops": lv } }, round: null }));
    sessionStorage.setItem("seeded", "1");
  }, { lv: level, profile: PROFILE });
}
async function enter(page: Page) {
  await page.goto("/play/sky-hoops");
  const begin = page.locator('[data-testid="story-begin"], [data-testid="start-game"]').first();
  await begin.waitFor({ state: "visible", timeout: 20_000 });
  const resumed = (await begin.getAttribute("data-testid")) === "start-game";
  await begin.click({ force: true });
  if (!resumed) await press(page, '[data-testid="story-skip"]');
}

/** The right answer for what is on screen (computed from the scene, the way a child reads it). */
async function rightAnswer(page: Page): Promise<string | string[]> {
  const b = board(page);
  const mode = (await b.getAttribute("data-mode"))!;
  if (mode === "hoop") return HOOP_CTL[(await b.getAttribute("data-hoop"))!]!;
  if (mode === "name") return (await b.getAttribute("data-axis"))!;
  if (mode === "part") return PART[(await b.getAttribute("data-ctl"))!]!;
  if (mode === "line") return (await b.getAttribute("data-nose")) === "right" ? "lpedal" : "rpedal";
  if (mode === "turn") return (await b.getAttribute("data-side"))!;
  if (mode === "force") return FORCE[(await b.getAttribute("data-template"))!]!;
  return (await b.getAttribute("data-course"))!.split(",");
}
async function dragStick(page: Page, dir: string) {
  await page.waitForTimeout(350); // let the knob spring back to the centre first
  const k = (await page.getByTestId("sh-knob").boundingBox())!;
  const sx = k.x + k.width / 2, sy = k.y + k.height / 2;
  const [dx, dy] = { back: [0, 1], fwd: [0, -1], left: [-1, 0], right: [1, 0] }[dir]!;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(sx + dx! * i * 7, sy + dy! * i * 7);
  await page.mouse.up();
}
async function act(page: Page, v: string, way: Way) {
  const isCtl = v in KEY;
  if (way === "keyboard" && isCtl) return page.keyboard.press(KEY[v]!);
  if (way === "keyboard") {
    await page.locator(sel(v)).first().focus();
    return page.keyboard.press("Enter");
  }
  if (way === "drag" && ["back", "fwd", "left", "right"].includes(v)) return dragStick(page, v);
  return press(page, sel(v));
}
async function solve(page: Page, way: Way) {
  const r = await rightAnswer(page);
  if (Array.isArray(r)) {
    for (const [i, c] of r.entries()) {
      await act(page, c, way);
      await expect(page.getByTestId("sh-slot").nth(i)).toHaveAttribute("data-value", c);
    }
    if (way === "keyboard") {
      await page.getByTestId("done").focus();
      return page.keyboard.press("Enter");
    }
    return press(page, '[data-testid="done"]');
  }
  return act(page, r, way);
}
async function noOverflow(page: Page) {
  const vp = page.viewportSize()!;
  const over = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
  expect(over.w).toBeLessThanOrEqual(vp.width + 1);
  expect(over.h).toBeLessThanOrEqual(vp.height + 1);
  for (const s of ['[data-testid="choice"]', '[data-testid="done"]', '[data-testid="sh-undo"]', '[data-testid="sh-replay"]', '[data-testid="sh-say"]']) {
    for (const box of await Promise.all((await page.locator(s).all()).map((c) => c.boundingBox()))) {
      if (!box) continue;
      expect(Math.min(box.width, box.height), s).toBeGreaterThanOrEqual(43.5);
      expect(box.x, s).toBeGreaterThanOrEqual(-1);
      expect(box.y, s).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width, s).toBeLessThanOrEqual(vp.width + 1);
      expect(box.y + box.height, s).toBeLessThanOrEqual(vp.height + 1);
    }
  }
}

test("a whole round by tap, drag and keyboard: Sky Wings and a level up", async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await seed(page, { muted: true, ageBand: "ages-6-8" });
  const shot = (name: string) => page.screenshot({ path: `${REVIEW}/${info.project.name}-${name}.png` });
  await page.goto("/play/sky-hoops");
  await press(page, '[data-testid="story-begin"]');
  await expect(page.getByTestId("story")).toBeVisible();
  await page.waitForTimeout(800);
  await shot("01-story");
  await press(page, '[data-testid="story-skip"]');

  expect(await exId(page)).toBe("sh-tutorial-up");
  await expect(page.getByTestId("hand-pointer")).toBeVisible({ timeout: 20_000 }); // points at "pull back"
  await shot("02-play-tutorial");
  await noOverflow(page);

  const ways: Way[] = ["tap", "drag", "keyboard", "tap", "drag", "keyboard", "tap", "drag", "keyboard"];
  for (let i = 0; i < 9; i++) {
    if ((await screen(page).count()) === 0) break;
    const id = await exId(page);
    let way = ways[i]!;
    if (way === "drag" && info.project.name !== "desktop") way = "tap";
    const flies = ["hoop", "line", "turn", "course"].includes((await board(page).getAttribute("data-mode"))!);
    await solve(page, way);
    if (flies) await expect(board(page)).toHaveAttribute("data-anim", "fly");
    if (i === 1) await shot("03-flying");
    await expect(board(page)).toHaveClass(/is-solved/, { timeout: 20_000 });
    if (i === 1) await shot("04-through");
    await nextExercise(page, id);
  }
  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
  await shot("05-outro");
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Sky Wings" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  await page.waitForTimeout(1200);
  await shot("06-reward");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("sky-wings");
  expect(stored.progress.levels["sky-hoops"]).toBe(1);
  if (info.project.name === "desktop") {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-reward.png` });
    }
  }
  expect(errors).toEqual([]);
});

test("misses: the plane passes beside the hoop, Bobbo explains, then the ghost plane models the right control", async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  // four-way hoops: miss twice
  await reset(page, 3);
  await enter(page);
  await answering(page);
  const right = (await rightAnswer(page)) as string;
  const wrong = ["back", "fwd", "left", "right"].filter((c) => c !== right);
  await press(page, sel(wrong[0]!));
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(sel(wrong[0]!))).toHaveClass(/is-out/);
  await expect(page.getByTestId("sh-say-live")).toContainText("passed beside");
  await press(page, sel(wrong[1]!));
  await expect(page.locator(sel(right))).toHaveClass(/is-model/, { timeout: 20_000 });
  await answering(page);
  await expect(page.locator(".sh-plane.is-ghost")).toHaveCount(1);
  await expect(page.locator(".sh-surf.is-glow").first()).toBeVisible();
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-07-model.png` });
  await press(page, sel(wrong[2]!)); // only the modelled control flies now
  await expect(board(page)).toHaveAttribute("data-anim", "idle");
  await press(page, sel(right));
  await expect(board(page)).toHaveClass(/is-solved/, { timeout: 20_000 });

  // turning: the pedal-only misconception gets its own line
  await reset(page, 7);
  await enter(page);
  await answering(page);
  const side = (await board(page).getAttribute("data-side"))!;
  await press(page, sel(side === "left" ? "lpedal" : "rpedal"));
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await press(page, sel(side));
  await expect(board(page)).toHaveClass(/is-solved/, { timeout: 20_000 });
  expect(errors).toEqual([]);
});

test("every kind of level plays by tap and keyboard (names, parts, runway, turn, forces, course)", async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  const cases: { level: number; way: Way }[] = [
    { level: 2, way: "keyboard" },
    { level: 4, way: "tap" },
    { level: 5, way: "keyboard" },
    { level: 6, way: "keyboard" },
    { level: 7, way: "tap" },
    { level: 8, way: "keyboard" },
    { level: 9, way: "keyboard" },
    { level: 9, way: info.project.name === "desktop" ? "drag" : "tap" },
  ];
  for (const c of cases) {
    await reset(page, c.level);
    await enter(page);
    await answering(page);
    if (c.level === 4 || c.level === 5) await expect(board(page)).toHaveAttribute("data-anim", "demo", { timeout: 10_000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${REVIEW}/${info.project.name}-10-level${c.level}-${c.way}.png` });
    if (c.level === 9) {
      // undo works: add a move, take it back
      await act(page, "back", "tap");
      await press(page, '[data-testid="sh-undo"]');
      await expect(page.getByTestId("sh-slot").first()).toHaveAttribute("data-value", "");
    }
    await solve(page, c.way);
    await expect(board(page)).toHaveClass(/is-solved/, { timeout: 25_000 });
  }
  expect(errors).toEqual([]);
});

test("the sky fits every viewport at every kind of level", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport sweep runs once (it resizes through all four sizes)");
  test.setTimeout(240_000);
  for (const level of [0, 2, 4, 5, 6, 7, 8, 9]) {
    await reset(page, level);
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.goto("/play/sky-hoops");
      const begin = page.locator('[data-testid="story-begin"], [data-testid="start-game"]').first();
      await begin.waitFor({ state: "visible", timeout: 20_000 });
      const resumed = (await begin.getAttribute("data-testid")) === "start-game";
      if (level === 0) {
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-${resumed ? "intro" : "story"}.png` });
      }
      await begin.click({ force: true });
      if (!resumed) await press(page, '[data-testid="story-skip"]');
      await answering(page);
      await page.waitForTimeout(700);
      await noOverflow(page);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-play-l${level}.png` });
    }
  }
});
