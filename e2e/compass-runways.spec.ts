import { type Page, expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { collectErrors, press, reviewDir, screen, seed } from "./helpers";

/**
 * Compass Rose Runways: story → a whole round by tap, drag (rotate) and keyboard → outro → Compass Rose Pin + level up;
 * every inner game (Windsock Reader, Runway Painter, Heading Turns, Into the Wind, Tower Talk); helper on the first miss,
 * model on the second; no overflow at four viewports. Answers are computed here from what the board shows
 * (data attributes mirror the scene), independently of the game's own logic module.
 */
const REVIEW = reviewDir("compass-runways");
mkdirSync(REVIEW, { recursive: true });
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];
const PROFILE = { monster: { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" }, monsterName: "Ziggy", kidName: "Testkid", step: "done", parentSignup: "skipped" };
type Way = "tap" | "drag" | "keyboard";

// ---------- independent heading maths ----------
const norm = (d: number) => { const x = ((d % 360) + 360) % 360; return x === 0 ? 360 : x; };
const diff = (a: number, b: number) => { const d = Math.abs(norm(a) - norm(b)) % 360; return d > 180 ? 360 - d : d; };
const rwNum = (h: number) => { const n = Math.floor(norm(h) / 10 + 0.5); return n === 0 ? 36 : n; };
const recip = (n: number) => (n > 18 ? n - 18 : n + 18);
const p2 = (n: number) => String(n).padStart(2, "0");
const p3 = (n: number) => String(norm(n)).padStart(3, "0");
const POINT: Record<number, string> = { 360: "n", 45: "ne", 90: "e", 135: "se", 180: "s", 225: "sw", 270: "w", 315: "nw" };

const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 30_000 });
const board = (page: Page) => page.getByTestId("cr-board");
const sel = (v: string) => `[data-testid="choice"][data-value="${v}"]`;

interface Scene { kind: string; h: number; n: number; d: number; dir: number; w: number; s: number; ends: number[] }
async function sceneOf(page: Page): Promise<Scene> {
  const b = board(page);
  const num = async (k: string) => Number(await b.getAttribute(`data-${k}`));
  return {
    kind: (await b.getAttribute("data-kind"))!, h: await num("h"), n: await num("n"), d: await num("d"), dir: await num("dir"), w: await num("w"), s: await num("s"),
    ends: ((await b.getAttribute("data-ends")) ?? "").split(",").map(Number),
  };
}
/** The right answer: an option id, or a number to enter (with its entry width). */
function rightFor(s: Scene): { choice: string } | { num: number; width: 2 | 3; dial: boolean } {
  switch (s.kind) {
    case "strength": return { choice: ["calm", "light", "strong"][s.s]! };
    case "from4": case "from8": return { choice: POINT[norm(s.w)]! };
    case "fromDeg": return { choice: `d${p3(s.w)}` };
    case "card": case "ten": case "round": return { num: rwNum(s.h), width: 2, dial: false };
    case "opp": return { num: recip(rwNum(s.h)), width: 2, dial: false };
    case "rotate": return { num: norm(s.n * 10), width: 3, dial: true };
    case "quarter": case "turn": case "wrap": return { num: norm(s.h + s.dir * s.d), width: 3, dial: true };
    case "two": case "four": case "twind": {
      const best = [...s.ends].sort((a, b) => diff(a * 10, s.w) - diff(b * 10, s.w))[0]!;
      return { choice: `rw${p2(best)}` };
    }
    case "xwind": case "tcomp": { const d = diff(s.h, s.w); return { choice: d <= 30 ? "head" : d >= 150 ? "tail" : "cross" }; }
    case "tline": return { choice: `h${p3(s.n * 10)}` };
    case "tjoin": return { choice: `rw${p2(rwNum(s.h + s.dir * s.d))}` };
  }
  throw new Error(`unknown kind ${s.kind}`);
}
/** A plausible wrong answer of the same shape. */
function wrongFor(s: Scene, k = 0): { choice: string } | { num: number; width: 2 | 3; dial: boolean } {
  const r = rightFor(s);
  if ("num" in r) {
    const max = r.width === 2 ? 36 : 360;
    const step = r.width === 2 ? 1 : 10;
    const v = ((r.num - 1 + step * (k + 1)) % max) + 1;
    return { ...r, num: v };
  }
  return r;
}

async function display(page: Page) {
  return Number((await page.getByTestId("cr-display").getAttribute("data-value")) || "0");
}
async function dragDial(page: Page, target: number) {
  const box = (await page.getByTestId("cr-frame").boundingBox())!;
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2, r = box.width * 0.38;
  const at = (h: number): [number, number] => [cx + Math.sin((h * Math.PI) / 180) * r, cy - Math.cos((h * Math.PI) / 180) * r];
  const from = await display(page);
  const steps = 10;
  const sweep = ((target - from + 540) % 360) - 180; // the short way round
  await page.mouse.move(...at(from));
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) await page.mouse.move(...at(from + (sweep * i) / steps));
  await page.mouse.up();
  await expect(page.getByTestId("cr-display")).toHaveAttribute("data-value", String(target));
}
async function enterNumber(page: Page, v: { num: number; width: 2 | 3; dial: boolean }, way: Way) {
  const digits = String(v.num).padStart(v.width, "0");
  if (way === "drag" && v.dial) {
    await dragDial(page, v.num);
    return press(page, '[data-testid="done"]');
  }
  if (way === "keyboard") {
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.type(digits);
    await expect(page.getByTestId("cr-display")).toHaveAttribute("data-value", String(v.num));
    return page.keyboard.press("Enter");
  }
  // tap: the keypad when it is shown, otherwise the steppers
  if (await page.getByTestId("cr-key").first().isVisible()) {
    for (const c of digits) await press(page, `[data-testid="cr-key"][data-key="${c}"]`);
  } else {
    for (let guard = 0; guard < 60; guard++) {
      const cur = await display(page);
      if (cur === v.num) break;
      const max = v.width === 2 ? 36 : 360;
      const up = (((v.num - cur) % max) + max) % max;
      const by = v.width === 2 ? (up <= max / 2 ? 1 : -1) : up <= 180 ? (up >= 10 ? 10 : 1) : max - up >= 10 ? -10 : -1;
      await press(page, `[data-testid="cr-step"][data-by="${by}"]`);
    }
  }
  await expect(page.getByTestId("cr-display")).toHaveAttribute("data-value", String(v.num));
  return press(page, '[data-testid="done"]');
}
async function answer(page: Page, a: { choice: string } | { num: number; width: 2 | 3; dial: boolean }, way: Way) {
  if ("num" in a) return enterNumber(page, a, way);
  if (way === "keyboard") {
    await page.locator(sel(a.choice)).focus();
    return page.keyboard.press("Enter");
  }
  return press(page, sel(a.choice));
}
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
    localStorage.setItem("bz.v1", JSON.stringify({ muted: true, ageBand: "ages-9-11", profile, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "compass-runways": lv } }, round: null }));
    sessionStorage.setItem("seeded", "1");
  }, { lv: level, profile: PROFILE });
}
async function enter(page: Page) {
  await page.goto("/play/compass-runways");
  const begin = page.locator('[data-testid="story-begin"], [data-testid="start-game"]').first();
  await begin.waitFor({ state: "visible", timeout: 20_000 });
  const resumed = (await begin.getAttribute("data-testid")) === "start-game";
  await begin.click({ force: true });
  if (!resumed) await press(page, '[data-testid="story-skip"]');
}
async function noOverflow(page: Page) {
  const vp = page.viewportSize()!;
  const over = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
  expect(over.w).toBeLessThanOrEqual(vp.width + 1);
  expect(over.h).toBeLessThanOrEqual(vp.height + 1);
  for (const s of ['[data-testid="choice"]', '[data-testid="done"]', '[data-testid="cr-step"]', '[data-testid="cr-key"]']) {
    for (const loc of await page.locator(s).all()) {
      if (!(await loc.isVisible())) continue;
      const box = await loc.boundingBox();
      if (!box) continue;
      expect(Math.min(box.width, box.height), s).toBeGreaterThanOrEqual(43.5);
      expect(box.x, s).toBeGreaterThanOrEqual(-1);
      expect(box.y, s).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width, s).toBeLessThanOrEqual(vp.width + 1);
      expect(box.y + box.height, s).toBeLessThanOrEqual(vp.height + 1);
    }
  }
}

test("a whole round by tap, drag and keyboard: the Compass Rose Pin and a level up", async ({ page }, info) => {
  test.setTimeout(300_000);
  const errors = collectErrors(page);
  await seed(page, { muted: true, ageBand: "ages-9-11" });
  const shot = (name: string) => page.screenshot({ path: `${REVIEW}/${info.project.name}-${name}.png` });
  await page.goto("/play/compass-runways");
  await press(page, '[data-testid="story-begin"]');
  await expect(page.getByTestId("story")).toBeVisible();
  await page.waitForTimeout(800);
  await shot("01-story");
  await press(page, '[data-testid="story-skip"]');

  expect(await exId(page)).toBe("cr-tutorial-east");
  await expect(page.getByTestId("hand-pointer")).toBeVisible({ timeout: 20_000 }); // points at "East"
  await shot("02-play-tutorial");
  await noOverflow(page);

  const ways: Way[] = ["tap", "keyboard", "drag", "tap", "keyboard", "drag", "tap", "keyboard", "drag"];
  for (let i = 0; i < 9; i++) {
    if ((await screen(page).count()) === 0) break;
    const id = await exId(page);
    let way = ways[i]!;
    if (way === "drag" && info.project.name !== "desktop") way = "tap";
    const s = await sceneOf(page);
    await answer(page, rightFor(s), way);
    await expect(board(page)).toHaveClass(/is-solved/, { timeout: 20_000 });
    if (i === 1) await shot("03-solved");
    await nextExercise(page, id);
  }
  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
  await shot("05-outro");
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Compass Rose Pin" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  await page.waitForTimeout(1200);
  await shot("06-reward");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("compass-rose-pin");
  expect(stored.progress.levels["compass-runways"]).toBe(1);
  if (info.project.name === "desktop") {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-reward.png` });
    }
  }
  expect(errors).toEqual([]);
});

test("misses: Gloop explains on the first miss, the second miss models the answer (number and runway-end items)", async ({ page }, info) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  // Heading Turns past 360 (level 4, first item): two wrong headings
  await reset(page, 4);
  await enter(page);
  await answering(page);
  let s = await sceneOf(page);
  expect(["wrap", "turn", "rotate", "opp"]).toContain(s.kind);
  await answer(page, wrongFor(s, 0), "tap");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await answer(page, wrongFor(s, 1), "keyboard");
  await expect(page.getByTestId("cr-working")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  const r = rightFor(s) as { num: number };
  await expect(page.getByTestId("cr-display")).toHaveAttribute("data-value", String(r.num)); // the model sets the answer
  await expect(page.getByTestId("cr-display")).toHaveClass(/is-model/);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-07-model-number.png` });
  await press(page, '[data-testid="done"]');
  await expect(board(page)).toHaveClass(/is-solved/, { timeout: 20_000 });

  // Into the Wind (level 5): land with the wind behind (the downwind end), then a side-on end → model
  await reset(page, 5);
  await enter(page);
  await answering(page);
  s = await sceneOf(page);
  if (s.kind !== "two") test.info().annotations.push({ type: "note", description: `first item was ${s.kind}` });
  if (s.kind === "two") {
    const right = (rightFor(s) as { choice: string }).choice;
    const downwind = `rw${p2(recip(Number(right.slice(2))))}`;
    await press(page, sel(downwind));
    await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
    await answering(page);
    await expect(page.locator(sel(downwind))).toHaveClass(/is-out/);
    await expect(page.locator(".cr-leaf-path")).toHaveCount(1); // a leaf blows from the wind's source
    await page.screenshot({ path: `${REVIEW}/${info.project.name}-08-hint-leaf.png` });
    await press(page, sel(right));
    await expect(board(page)).toHaveClass(/is-solved/, { timeout: 20_000 });
  }

  // Tower Talk (level 7): two wrong runway ends → the right one glows, worked steps, ghost plane
  await reset(page, 7);
  await enter(page);
  await answering(page);
  s = await sceneOf(page);
  expect(s.kind).toBe("twind");
  const right = (rightFor(s) as { choice: string }).choice;
  const wrong = s.ends.map((e) => `rw${p2(e)}`).filter((id) => id !== right);
  await press(page, sel(wrong[0]!));
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.getByTestId("cr-tips")).toBeVisible();
  const second = wrong.find((id) => !(id === wrong[0]))!;
  await press(page, sel(second));
  await expect(page.locator(sel(right))).toHaveClass(/is-model/, { timeout: 20_000 });
  await answering(page);
  await expect(page.getByTestId("cr-working")).toBeVisible();
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-09-model-tower.png` });
  await press(page, sel(right));
  await expect(board(page)).toHaveClass(/is-solved/, { timeout: 20_000 });
  expect(errors).toEqual([]);
});

test("every inner game plays by tap and keyboard (windsock, painter, rotate, turns, wind, tower)", async ({ page }, info) => {
  test.setTimeout(300_000);
  const errors = collectErrors(page);
  const seen = new Set<string>();
  const cases: { level: number; way: Way }[] = [
    { level: 0, way: "tap" }, // windsock strength (side view)
    { level: 1, way: "keyboard" }, // paint by tens
    { level: 2, way: "tap" }, // rounding
    { level: 3, way: info.project.name === "desktop" ? "drag" : "tap" }, // quarter turn on the dial
    { level: 4, way: "keyboard" }, // past 360
    { level: 5, way: "keyboard" }, // into the wind, 2 ends
    { level: 6, way: "tap" }, // 4 ends
    { level: 7, way: "keyboard" }, // tower: wind call
    { level: 8, way: "tap" }, // tower: turn then runway
  ];
  for (const c of cases) {
    await reset(page, c.level);
    await enter(page);
    await answering(page);
    // play two items per level so the second slot's inner game is covered too
    for (let k = 0; k < 2; k++) {
      const id = await exId(page);
      const s = await sceneOf(page);
      seen.add((await board(page).getAttribute("data-mode"))!);
      await page.waitForTimeout(300);
      if (k === 0) await page.screenshot({ path: `${REVIEW}/${info.project.name}-10-level${c.level}-${s.kind}-${c.way}.png` });
      await answer(page, rightFor(s), c.way);
      await expect(board(page)).toHaveClass(/is-solved/, { timeout: 25_000 });
      await nextExercise(page, id);
    }
  }
  expect([...seen].sort()).toEqual(["paint", "sock", "tower", "turn", "wind"]);
  expect(errors).toEqual([]);
});

test("rotate the runway by dragging around the compass rose", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "mouse drag (touch uses the same pointer handlers; tap/keyboard paths are covered elsewhere)");
  test.setTimeout(240_000);
  // level 1 holds one rotate item. Missing each other item once keeps the difficulty in this band (no step-up after
  // a miss), so the whole band is served and the rotate item comes up within the round.
  await reset(page, 1);
  await enter(page);
  for (let i = 0; i < 8; i++) {
    const id = await exId(page);
    const s = await sceneOf(page);
    if (s.kind === "rotate") {
      await dragDial(page, norm(s.n * 10));
      await page.screenshot({ path: `${REVIEW}/desktop-11-rotate-drag.png` });
      await press(page, '[data-testid="done"]');
      await expect(board(page)).toHaveClass(/is-solved/, { timeout: 20_000 });
      return;
    }
    const r = rightFor(s);
    const wrong = "num" in r ? wrongFor(s) : { choice: (await page.locator('[data-testid="choice"]').evaluateAll((els, right) => els.map((e) => e.getAttribute("data-value")).find((v) => v !== right), r.choice))! };
    await answer(page, wrong, "tap");
    await answering(page);
    await answer(page, r, "tap");
    await expect(board(page)).toHaveClass(/is-solved/, { timeout: 20_000 });
    await nextExercise(page, id);
  }
  throw new Error("no rotate item reached");
});

test("the airfield fits every viewport at every level", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport sweep runs once (it resizes through all four sizes)");
  test.setTimeout(300_000);
  for (const level of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
    await reset(page, level);
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.goto("/play/compass-runways");
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
