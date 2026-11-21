import { type Page, expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { buildRound } from "../src/engine/round";
import { budgetBridge } from "../src/games/budget-bridge/definition";
import { type Cell, type Piece, type Puzzle, decodePuzzle } from "../src/games/budget-bridge/logic";
import { ONBOARDED, collectErrors, press, screen } from "./helpers";

/** Brix's Budget Bridge: story → bridges built by tap-tap, gap-first taps, drag and keyboard → Test → outro → Bridge Builder + level up. */
const REVIEW = "/home/claude/review/budget-bridge";
mkdirSync(REVIEW, { recursive: true });
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];
const state = (level: number | null) => ({
  muted: true, ageBand: "ages-9-11", profile: ONBOARDED, round: null,
  progress: { v: 1, stickers: [], roundsCompleted: level === null ? 0 : 1, skills: {}, levels: level === null ? {} : { "budget-bridge": level } },
});
/** Fresh local state before the app boots (once per page, so reloads keep the saved round). */
async function seedAt(page: Page, level: number | null) {
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("bz.v1", JSON.stringify(s));
      sessionStorage.setItem("seeded", "1");
    }
  }, state(level));
}
/** Reset state inside an open page (for several levels in one test). */
async function resetTo(page: Page, level: number) {
  await page.goto("/");
  await page.evaluate((s) => {
    localStorage.clear();
    localStorage.setItem("bz.v1", JSON.stringify(s));
    sessionStorage.setItem("seeded", "1");
  }, state(level));
}

const missed = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "feedback", { timeout: 30_000 });
const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 30_000 });
const piece = (p: string) => `[data-testid="choice"][data-value="${p}"]`;
const cell = (i: number) => `[data-testid="bb-cell"][data-cell="${i}"]`;

async function current(page: Page): Promise<{ id: string; pz: Puzzle }> {
  await answering(page);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).round as { level: number; seed: number });
  const ex = [...buildRound(budgetBridge, { level: saved.level, seed: saved.seed }).exercises, ...budgetBridge.exercises].find((e) => e.id === id);
  expect(ex, id).toBeDefined();
  return { id, pz: decodePuzzle(ex!) };
}

type Way = "taptap" | "cellfirst" | "drag" | "keyboard";
const piecesOf = (c: Cell): Piece[] => [...(c.pillar ? ["pillar" as const] : []), ...(c.deck ? [c.deck] : []), ...(c.brace ? ["brace" as const] : [])];

async function dragTo(page: Page, from: string, to: string) {
  const a = (await page.locator(from).boundingBox())!;
  const b = (await page.locator(to).boundingBox())!;
  const sx = a.x + a.width / 2, sy = a.y + a.height / 2, tx = b.x + b.width / 2, ty = b.y + b.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(sx + ((tx - sx) * k) / 12, sy + ((ty - sy) * k) / 12);
  await page.mouse.up();
}
async function expectCell(page: Page, i: number, c: Cell) {
  const loc = page.locator(cell(i));
  await expect(loc).toHaveAttribute("data-deck", c.deck ?? "");
  await expect(loc).toHaveAttribute("data-pillar", String(c.pillar));
  await expect(loc).toHaveAttribute("data-brace", String(c.brace));
}
async function cellNow(page: Page, i: number): Promise<Cell> {
  const loc = page.locator(cell(i));
  const deck = (await loc.getAttribute("data-deck")) || null;
  return { deck: deck as Cell["deck"], pillar: (await loc.getAttribute("data-pillar")) === "true", brace: (await loc.getAttribute("data-brace")) === "true" };
}
const same = (a: Cell, b: Cell) => a.deck === b.deck && a.pillar === b.pillar && a.brace === b.brace;

/** Build `target` (the solver's design) on the board from whatever is there, the way a child would with `way`. */
async function build(page: Page, pz: Puzzle, target: readonly Cell[], way: Way) {
  const todo: { i: number; ps: Piece[] }[] = [];
  for (let i = 0; i < pz.gap; i++) {
    const now = await cellNow(page, i);
    if (same(now, target[i]!)) continue;
    if (now.deck || now.pillar || now.brace) {
      // clear the gap first (Clear tool, or Delete on the keyboard)
      if (way === "keyboard") {
        await page.locator(cell(i)).focus();
        await page.keyboard.press("Delete");
      } else {
        await press(page, piece("erase"));
        await press(page, cell(i));
        await press(page, piece("erase")); // put the Clear tool down again
      }
      await expectCell(page, i, { deck: null, pillar: false, brace: false });
    }
    todo.push({ i, ps: piecesOf(target[i]!) });
  }
  if (way === "taptap") {
    // pick a piece up, tap every gap that needs it, put it down
    for (const p of pz.pieces) {
      const cells = todo.filter((t) => t.ps.includes(p));
      if (!cells.length) continue;
      await press(page, piece(p));
      await expect(page.locator(piece(p))).toHaveAttribute("aria-pressed", "true");
      for (const t of cells) await press(page, cell(t.i));
      await press(page, piece(p));
    }
  } else {
    for (const t of todo) {
      if (way === "cellfirst") {
        await press(page, cell(t.i));
        await expect(page.locator(cell(t.i))).toHaveAttribute("aria-pressed", "true");
        for (const p of t.ps) await press(page, piece(p));
      } else if (way === "drag") {
        for (const p of t.ps) await dragTo(page, piece(p), cell(t.i));
      } else {
        await page.locator(cell(t.i)).focus();
        for (const p of t.ps) await page.keyboard.press(String(pz.pieces.indexOf(p) + 1));
      }
    }
    if (way === "cellfirst" && todo.length) await press(page, cell(todo.at(-1)!.i)); // un-pick the last gap
  }
  for (let i = 0; i < pz.gap; i++) await expectCell(page, i, target[i]!);
}
async function testIt(page: Page, way: Way) {
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
  for (const sel of ['[data-testid="choice"]', '[data-testid="bb-cell"]', '[data-testid="done"]', '[data-testid="bb-budget"]', ".bb-scene"]) {
    for (const box of await Promise.all((await page.locator(sel).all()).map((c) => c.boundingBox()))) {
      if (!box) continue;
      if (sel !== ".bb-scene") expect(Math.min(box.width, box.height), sel).toBeGreaterThanOrEqual(43.5);
      expect(box.x, sel).toBeGreaterThanOrEqual(-1);
      expect(box.y, sel).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width, sel).toBeLessThanOrEqual(vp.width + 1);
      expect(box.y + box.height, sel).toBeLessThanOrEqual(vp.height + 1);
    }
  }
}
async function enter(page: Page) {
  await page.goto("/play/budget-bridge");
  const begin = page.locator('[data-testid="story-begin"], [data-testid="start-game"]').first();
  await begin.waitFor({ state: "visible", timeout: 20_000 });
  const resumed = (await begin.getAttribute("data-testid")) === "start-game";
  await begin.click({ force: true });
  if (!resumed) await press(page, '[data-testid="story-skip"]');
}
const startState = (pz: Puzzle) => pz.given ?? Array.from({ length: pz.gap }, () => ({ deck: null, pillar: false, brace: false }));

test("child builds bridges by tap-tap, gap-first, drag and keyboard, tests them, and levels up", async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await seedAt(page, null);
  const shot = (name: string) => page.screenshot({ path: `${REVIEW}/${info.project.name}-${name}.png` });

  await page.goto("/play/budget-bridge");
  await press(page, '[data-testid="story-begin"]');
  await expect(page.getByTestId("story")).toBeVisible();
  await page.waitForTimeout(700);
  await shot("01-story");
  await press(page, '[data-testid="story-skip"]');

  const first = await current(page);
  expect(first.id).toBe("bb-tutorial-plank");
  await expect(page.getByTestId("hand-pointer")).toBeVisible({ timeout: 20_000 }); // the tutorial hand points at the wood plank
  await shot("02-play-tutorial");
  await noOverflow(page);

  const ways: Way[] = ["taptap", "drag", "cellfirst", "keyboard", "taptap", "drag", "cellfirst", "keyboard", "taptap"];
  for (let i = 0; i < 9; i++) {
    if ((await screen(page).count()) === 0) break;
    const { id, pz } = await current(page);
    let way = ways[i]!;
    if (way === "drag" && info.project.name !== "desktop") way = "taptap"; // pointer drag is covered on desktop
    await build(page, pz, pz.solution, way);
    await expect(page.getByTestId("bb-budget")).not.toHaveClass(/is-over/);
    if (i === 2) await shot("03-play-built");
    await testIt(page, way);
    await expect(page.getByTestId("bb-board")).toHaveAttribute("data-running", "true");
    await expect(screen(page)).toHaveAttribute("data-phase", /feedback|solved/, { timeout: 25_000 });
    await expect(page.getByTestId("bb-board")).toHaveClass(/is-solved/);
    await expect(page.getByTestId("bb-board")).toHaveAttribute("data-vehicle-at", "far");
    if (i === 1) await shot("04-play-solved");
    await nextExercise(page, id);
  }

  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(900);
  await shot("05-outro");
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Bridge Builder" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  await page.waitForTimeout(1200);
  await shot("06-reward");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("bridge-builder");
  expect(stored.progress.levels["budget-bridge"]).toBe(1);
  if (info.project.name === "desktop") {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-reward.png` });
    }
  }
  expect(errors).toEqual([]);
});

test("first miss: Budge explains and the weak span glows; second miss: a ghost bridge to tap; then it holds", async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await seedAt(page, 4);
  await enter(page);
  const { pz } = await current(page);
  // wood everywhere, no pillar: wood can't span 4 cells, so the span sags
  await press(page, piece("wood"));
  for (let i = 0; i < pz.gap; i++) await press(page, cell(i));
  await press(page, piece("wood"));
  await press(page, '[data-testid="done"]');
  await missed(page);
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".bb-weak-glow")).toHaveCount(1);
  await expect(page.locator('[data-testid="bb-badge"][data-ok="false"]')).toHaveCount(1);
  await expect(page.getByTestId("bb-board")).toHaveAttribute("data-vehicle-at", "start"); // backed off, no fall
  await answering(page);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-07-first-miss.png` });
  // miss 2: the worked example — ghost pieces of one working bridge
  await press(page, '[data-testid="done"]');
  await missed(page);
  await expect(page.getByTestId("bb-ghost").first()).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-08-model.png` });
  await expect(page.locator(`${piece("erase")}.is-out`)).toBeVisible();
  // errorless: tap each glowing gap, then Test
  for (let i = 0; i < pz.gap; i++) await press(page, cell(i));
  for (let i = 0; i < pz.gap; i++) await expectCell(page, i, pz.solution[i]!);
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("bb-board")).toHaveClass(/is-solved/, { timeout: 25_000 });
  expect(errors).toEqual([]);
});

test("over budget is a gentle miss; later levels (triangles, deep water, improve, tight budget) play by every input", async ({ page }, info) => {
  test.setTimeout(200_000);
  const errors = collectErrors(page);
  const cases: { level: number; way: Way }[] = [
    { level: 1, way: "cellfirst" },
    { level: 3, way: "keyboard" },
    { level: 5, way: info.project.name === "desktop" ? "drag" : "taptap" },
    { level: 7, way: "taptap" },
    { level: 7, way: "keyboard" },
    { level: 8, way: "cellfirst" },
  ];
  for (const c of cases) {
    await resetTo(page, c.level);
    await enter(page);
    const { pz } = await current(page);
    if (pz.given) {
      // improve: the bridge is pre-built and the span that sagged already glows
      for (let i = 0; i < pz.gap; i++) await expectCell(page, i, pz.given[i]!);
      await expect(page.locator(".bb-weak-glow")).toHaveCount(1);
    }
    if (c.level === 1 && pz.pieces.includes("steel")) {
      // steel everywhere is strong but over budget: a miss, never a punishment
      await press(page, piece("steel"));
      for (let i = 0; i < pz.gap; i++) await press(page, cell(i));
      await press(page, piece("steel"));
      if (await page.getByTestId("bb-budget").evaluate((el) => el.classList.contains("is-over"))) {
        await press(page, '[data-testid="done"]');
        await missed(page);
        await expect(page.getByTestId("helper")).toBeVisible({ timeout: 25_000 });
        await answering(page);
      }
    }
    await build(page, pz, pz.solution, c.way);
    await page.screenshot({ path: `${REVIEW}/${info.project.name}-09-level${c.level}-${c.way}.png` });
    await testIt(page, c.way);
    await expect(page.getByTestId("bb-board")).toHaveClass(/is-solved/, { timeout: 25_000 });
  }
  expect(errors).toEqual([]);
});

test("the river fits every viewport at every kind of level", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport sweep runs once (it resizes through all four sizes)");
  test.setTimeout(240_000);
  for (const level of [0, 2, 5, 7, 8]) {
    await resetTo(page, level);
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.goto("/play/budget-bridge");
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
      const { pz } = await current(page);
      await build(page, pz, pz.solution, "taptap");
      await page.waitForTimeout(400);
      await noOverflow(page);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-play-l${level}.png` });
      await build(page, pz, startState(pz), "taptap"); // back to the start so the next viewport sees the same site
    }
  }
});

test("reduced motion: no driving; the result appears at once with a badge per span", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one run is enough");
  test.setTimeout(90_000);
  const errors = collectErrors(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAt(page, 2);
  await enter(page);
  const { pz } = await current(page);
  await press(page, piece("wood"));
  for (let i = 0; i < pz.gap; i++) await press(page, cell(i));
  await press(page, piece("wood"));
  await press(page, '[data-testid="done"]');
  await missed(page);
  await expect(page.locator('[data-testid="bb-badge"][data-ok="false"]')).toHaveCount(1);
  await expect(page.getByTestId("bb-board")).toHaveAttribute("data-vehicle-at", "start");
  await expect(page.getByTestId("bb-results")).toContainText("too long");
  await answering(page);
  await page.screenshot({ path: `${REVIEW}/desktop-10-reduced-motion-miss.png` });
  await build(page, pz, pz.solution, "taptap");
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("bb-board")).toHaveClass(/is-solved/, { timeout: 20_000 });
  await expect(page.getByTestId("bb-board")).toHaveAttribute("data-vehicle-at", "far");
  expect(errors).toEqual([]);
});
