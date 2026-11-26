import { type Page, expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { buildRound } from "../src/engine/round";
import type { Exercise } from "../src/engine/types";
import { flightPlan } from "../src/games/flight-plan/definition";
import { BAND } from "../src/games/flight-plan/generator";
import { type Mode, gameOf, modeOf } from "../src/games/flight-plan/logic";
import { collectErrors, press, reviewDir, screen } from "./helpers";

/**
 * Ziggy's Flight Plan: story → a whole round by slide/drag, tap and keyboard → outro → sticker + level up; first miss
 * shows Dabble, second miss shows the worked model (numeric, number, choice, match, sequence); every inner game; the
 * educational-only notice; no overflow at the four viewports (screenshots in reviewDir("flight-plan")).
 */
const REVIEW = reviewDir("flight-plan");
mkdirSync(REVIEW, { recursive: true });
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];
const PROFILE = { monster: { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" }, monsterName: "Ziggy", kidName: "Testkid", step: "done", parentSignup: "skipped" };
type Way = "tap" | "drag" | "keyboard";
const SEED = 4242;

const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 30_000 });
const board = (page: Page) => page.getByTestId("fp-board");
const sel = (v: string) => `[data-testid="choice"][data-value="${v}"]`;

async function setState(page: Page, level: number, round: unknown = null) {
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(({ lv, profile, round }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("bz.v1", JSON.stringify({ muted: true, ageBand: "ages-12-14", profile, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "flight-plan": lv } }, round }));
    sessionStorage.setItem("seeded", "1");
  }, { lv: level, profile: PROFILE, round });
}
/** Start a round at `level` whose current exercise is the band's first item of `mode` (resume snapshot, fixed seed). */
async function startAt(page: Page, level: number, mode: Mode, seed = SEED) {
  const round = buildRound(flightPlan, { level, seed });
  const ex = round.exercises.find((e) => e.difficulty === level + 1 && modeOf(e) === mode && !e.tutorial && !e.closer) ?? round.exercises.find((e) => e.difficulty === level + 1 && modeOf(e) === mode)!;
  // the briefing is a closer: it is served on the last slot, so resume it with seven results already in
  const results = ex.closer
    ? round.exercises.filter((e) => e.difficulty === level + 1 && !e.closer).slice(0, BAND - 1).map((e) => ({ exerciseId: e.id, skillId: e.skillId, difficulty: e.difficulty, attempts: 1, firstTry: true, hintsShown: 0 }))
    : [];
  await setState(page, level, { v: 1, gameId: "flight-plan", progression: { difficulty: level + 1, streak: 0, played: results.map((r) => r.exerciseId), results }, currentId: ex.id, savedAt: Date.now(), level, seed });
  await page.goto("/play/flight-plan");
  await press(page, '[data-testid="start-game"]');
  await answering(page);
  return ex;
}
/** The exercise on screen, rebuilt from the saved round (level + seed) the way the app builds it. */
async function current(page: Page): Promise<Exercise> {
  await answering(page);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  const r = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).round as { level: number; seed: number });
  const ex = buildRound(flightPlan, { level: r.level, seed: r.seed }).exercises.find((e) => e.id === id);
  if (!ex) throw new Error(`exercise ${id} not in the rebuilt round`);
  return ex;
}
async function nextExercise(page: Page, id: string) {
  await expect
    .poll(async () => ((await screen(page).count()) === 0 ? "done" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 45_000 })
    .not.toBe(id);
}
async function activate(page: Page, selector: string, way: Way) {
  if (way === "keyboard") {
    const loc = page.locator(selector).first();
    await expect(loc).not.toHaveAttribute("aria-disabled", "true");
    await loc.focus();
    await page.keyboard.press("Enter");
    return page.waitForTimeout(150); // the board moves focus for keyboard users; let it settle
  }
  return press(page, selector);
}
async function dragTo(page: Page, from: string, to: string) {
  const a = (await page.locator(from).first().boundingBox())!;
  const b = (await page.locator(to).first().boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(a.x + a.width / 2 + ((b.x + b.width / 2 - a.x - a.width / 2) * i) / 12, a.y + a.height / 2 + ((b.y + b.height / 2 - a.y - a.height / 2) * i) / 12);
  await page.mouse.up();
}
const aoaNow = async (page: Page) => Number(await board(page).getAttribute("data-aoa"));
async function setAngle(page: Page, target: number, way: Way) {
  if (way === "drag") {
    const box = (await page.getByTestId("fp-aoa").boundingBox())!;
    const xAt = (v: number) => box.x + 22 + (v / 24) * (box.width - 44);
    const y = box.y + box.height / 2;
    await page.mouse.move(xAt(await aoaNow(page)), y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(xAt(await aoaNow(page)) + ((xAt(target) - xAt(await aoaNow(page))) * i) / 10, y);
    await page.mouse.move(xAt(target), y);
    await page.mouse.up();
  }
  for (let guard = 0; guard < 30 && (await aoaNow(page)) !== target; guard++) {
    const up = (await aoaNow(page)) < target;
    if (way === "keyboard") {
      await page.getByTestId("fp-aoa").focus();
      await page.keyboard.press(up ? "ArrowRight" : "ArrowLeft");
    } else await press(page, `[data-testid="fp-aoa-${up ? "up" : "down"}"]`);
  }
  await expect(board(page)).toHaveAttribute("data-aoa", String(target));
}
async function typeMinutes(page: Page, n: number, way: Way) {
  if (way === "keyboard") {
    await page.getByTestId("done").focus();
    await page.keyboard.type(String(n));
    await expect(page.getByTestId("fp-display")).toContainText(String(n));
    return page.keyboard.press("Enter");
  }
  for (const d of String(n)) await press(page, `[data-testid="key"][data-value="${d}"]`);
  await expect(page.getByTestId("fp-display")).toContainText(String(n));
  return press(page, '[data-testid="done"]');
}
/** Solve the exercise on screen the given way. */
async function solve(page: Page, way: Way, ex?: Exercise) {
  const e = ex ?? (await current(page));
  const a = e.answer;
  switch (a.kind) {
    case "numeric":
      await setAngle(page, a.value, way);
      return activate(page, '[data-testid="done"]', way);
    case "number":
      return typeMinutes(page, a.value, way === "drag" ? "tap" : way);
    case "choice":
      return activate(page, sel(a.correct), way === "drag" ? "tap" : way);
    case "match":
      for (const it of a.items) {
        const target = `[data-testid="target"][data-value="${a.pairs[it.id]}"]`;
        if (way === "drag") await dragTo(page, target, sel(it.id));
        else {
          await activate(page, sel(it.id), way);
          await activate(page, target, way);
        }
        await expect(page.locator(sel(it.id))).toHaveClass(/is-paired/);
      }
      return activate(page, '[data-testid="done"]', way === "drag" ? "tap" : way);
    case "sequence":
      for (const [i, id] of a.order.entries()) {
        if (way === "drag") await dragTo(page, sel(id), `.fp-slot >> nth=${i}`);
        else await activate(page, sel(id), way);
        await expect(page.getByTestId("fp-slot").nth(i)).toHaveAttribute("data-value", id);
      }
      return activate(page, '[data-testid="done"]', way === "drag" ? "tap" : way);
    default:
      throw new Error(`unexpected answer kind ${a.kind}`);
  }
}
async function noOverflow(page: Page) {
  const vp = page.viewportSize()!;
  const over = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
  expect(over.w).toBeLessThanOrEqual(vp.width + 1);
  expect(over.h).toBeLessThanOrEqual(vp.height + 1);
  for (const s of ['[data-testid="choice"]', '[data-testid="target"]', '[data-testid="done"]', '[data-testid="key"]', '[data-testid="fp-slot"]', '[data-testid="fp-hear"]', ".fp-step"]) {
    for (const box of await Promise.all((await page.locator(s).all()).map((c) => c.boundingBox()))) {
      if (!box) continue;
      expect(Math.min(box.width, box.height), s).toBeGreaterThanOrEqual(43.5);
      expect(box.x, s).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width, s).toBeLessThanOrEqual(vp.width + 1);
    }
  }
}

test("a whole round by slide, tap and keyboard: notice, tutorial hand, briefing last, sticker and level up", async ({ page }, info) => {
  test.setTimeout(300_000);
  const errors = collectErrors(page);
  const shot = (name: string) => page.screenshot({ path: `${REVIEW}/${info.project.name}-${name}.png` });
  await setState(page, 0);
  await page.goto("/play/flight-plan");
  // the educational-only notice is on the first beat, visible before anything is tapped
  await expect(page.getByTestId("fp-notice")).toContainText("Educational only", { timeout: 20_000 });
  await page.waitForTimeout(500);
  await shot("01-story");
  await press(page, '[data-testid="story-begin"]');
  await press(page, '[data-testid="story-skip"]');

  expect(await screen(page).getAttribute("data-exercise")).toBe("fp-tutorial-find");
  await answering(page);
  await expect(page.getByTestId("hand-pointer")).toBeVisible({ timeout: 25_000 });
  await shot("02-tutorial");
  await noOverflow(page);

  const ways: Way[] = ["drag", "tap", "keyboard", "tap", "keyboard", "drag", "tap", "keyboard"];
  const games: string[] = [];
  for (let i = 0; i < 8; i++) {
    if ((await screen(page).count()) === 0) break;
    const ex = await current(page);
    games.push(gameOf(ex));
    let way = ways[i]!;
    if (way === "drag" && info.project.name !== "desktop") way = "tap";
    if (i === 1) await shot(`03-${modeOf(ex)}`);
    await solve(page, way, ex);
    await nextExercise(page, ex.id);
  }
  expect(games.at(-1)).toBe("brief");
  expect(games.slice(0, -1)).not.toContain("brief");
  expect(new Set(games).size).toBeGreaterThanOrEqual(3);
  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
  await shot("05-outro");
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Co-pilot's Clipboard" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  await page.waitForTimeout(1200);
  await shot("06-reward");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("copilot-clipboard");
  expect(stored.progress.levels["flight-plan"]).toBe(1);
  if (info.project.name === "desktop") {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-reward.png` });
    }
  }
  expect(errors).toEqual([]);
});

test("misses: Dabble explains on the first, the worked model shows on the second (stall angle, leg time)", async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  // wind tunnel (numeric ±1°)
  const find = await startAt(page, 1, "find");
  const crit = find.params!.crit!;
  await setAngle(page, crit - 4, "tap");
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.getByTestId("fp-direction")).toContainText("still rising");
  await expect(page.getByTestId("fp-graph")).toBeVisible();
  await setAngle(page, crit + 5, "tap");
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("model-steps")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(board(page)).toHaveAttribute("data-aoa", String(crit));
  await expect(page.getByTestId("done")).toHaveClass(/is-model/);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-07-model-tunnel.png` });
  await press(page, '[data-testid="done"]');
  await nextExercise(page, find.id);

  // leg timer (number): a "forgot the wind" answer gets its own line; then the worked division
  const leg = await startAt(page, 3, "time");
  if (leg.answer.kind !== "number") throw new Error("number");
  const right = leg.answer.value;
  await typeMinutes(page, right + 7, "tap");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.getByTestId("fp-method")).toBeVisible();
  await typeMinutes(page, right + 9, "keyboard");
  await expect(page.getByTestId("model-steps")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.getByTestId("fp-display")).toContainText(String(right));
  await expect(page.getByTestId("model-steps")).toContainText("× 60 ÷");
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-08-model-leg.png` });
  await press(page, '[data-testid="done"]');
  await nextExercise(page, leg.id);
  expect(errors).toEqual([]);
});

test("misses on matching, ordering and choosing: right parts stay, the model completes all but the last move", async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  // weather decode (match)
  const dec = await startAt(page, 3, "decode");
  if (dec.answer.kind !== "match") throw new Error("match");
  const a = dec.answer;
  const last = a.items[a.items.length - 1]!;
  const rest = a.items.slice(0, -1); // level 3: three groups, so two to swap
  const swap = async () => {
    for (const [i, it] of rest.entries()) {
      await press(page, sel(it.id));
      await press(page, `[data-testid="target"][data-value="${a.pairs[rest[(i + 1) % rest.length]!.id]}"]`);
    }
  };
  await swap();
  await press(page, sel(last.id));
  await press(page, `[data-testid="target"][data-value="${a.pairs[last.id]}"]`);
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(".fp-group.is-ok")).toHaveCount(1); // the right pair stays (gold); the others come back
  await swap();
  await press(page, '[data-testid="done"]');
  await expect(page.locator(".fp-tile.is-model")).toHaveCount(1, { timeout: 20_000 }); // all pairs but the last filled in; the last tile glows
  await answering(page);
  if (info.project.name === "desktop") await expect(page.getByTestId("model-steps")).toBeVisible(); // phones: the filled-in board is the model
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-09-model-decode.png` });
  await press(page, sel(last.id));
  await press(page, `[data-testid="target"][data-value="${a.pairs[last.id]}"]`);
  await press(page, '[data-testid="done"]');
  await nextExercise(page, dec.id);

  // checklist order (sequence with a skip card at level 6)
  const ord = await startAt(page, 6, "order");
  if (ord.answer.kind !== "sequence") throw new Error("sequence");
  const skip = ord.answer.pieces.find((pc) => pc.id.startsWith("k"))!;
  const wrongOrder = [skip.id, ...ord.answer.order.slice(0, -1)].reverse();
  for (const id of wrongOrder) await press(page, sel(id));
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(sel(skip.id))).toHaveClass(/is-out/);
  for (const id of [...ord.answer.order].reverse()) if ((await page.locator(sel(id)).getAttribute("aria-disabled")) !== "true") await press(page, sel(id));
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("model-steps")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  for (const [i, id] of ord.answer.order.entries()) await expect(page.getByTestId("fp-slot").nth(i)).toHaveAttribute("data-value", id);
  await press(page, '[data-testid="done"]');
  await nextExercise(page, ord.id);

  // IMSAFE (choice): the wrong pick greys out, then the right one pulses
  const ims = await startAt(page, 6, "imsafe");
  if (ims.answer.kind !== "choice") throw new Error("choice");
  const wrongs = ims.answer.options.filter((o) => o.id !== (ims.answer as { correct: string }).correct).map((o) => o.id);
  await press(page, sel(wrongs[0]!));
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(sel(wrongs[0]!))).toHaveClass(/is-out/);
  await press(page, sel(wrongs[1]!));
  await expect(page.locator(sel(ims.answer.correct))).toHaveClass(/is-model/, { timeout: 20_000 });
  await answering(page);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-10-model-imsafe.png` });
  await press(page, sel(ims.answer.correct));
  await nextExercise(page, ims.id);
  expect(errors).toEqual([]);
});

test("every inner game plays by tap and keyboard (and drag on desktop)", async ({ page }, info) => {
  test.setTimeout(300_000);
  const errors = collectErrors(page);
  const desktop = info.project.name === "desktop";
  const cases: { level: number; mode: Mode; way: Way }[] = [
    { level: 0, mode: "lift", way: "keyboard" },
    { level: 1, mode: "speed", way: "tap" },
    { level: 1, mode: "engine", way: "keyboard" },
    { level: 3, mode: "recover", way: "tap" },
    { level: 4, mode: "flaps", way: desktop ? "drag" : "keyboard" },
    { level: 2, mode: "time", way: "keyboard" },
    { level: 7, mode: "time", way: "tap" },
    { level: 2, mode: "decode", way: "keyboard" },
    { level: 7, mode: "decode", way: desktop ? "drag" : "tap" },
    { level: 6, mode: "call", way: "tap" },
    { level: 5, mode: "order", way: "keyboard" },
    { level: 7, mode: "order", way: desktop ? "drag" : "tap" },
    { level: 4, mode: "missed", way: "tap" },
    { level: 5, mode: "imsafe", way: "keyboard" },
    { level: 5, mode: "brief", way: "tap" },
    { level: 0, mode: "brief", way: "keyboard" },
  ];
  for (const c of cases) {
    const ex = await startAt(page, c.level, c.mode);
    await expect(board(page)).toHaveAttribute("data-mode", c.mode);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${REVIEW}/${info.project.name}-20-l${c.level}-${c.mode}-${c.way}.png` });
    await noOverflow(page);
    await solve(page, c.way, ex);
    await nextExercise(page, ex.id);
  }
  expect(errors).toEqual([]);
});

test("the planning room fits every viewport for every inner game", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport sweep runs once (it resizes through all four sizes)");
  test.setTimeout(300_000);
  const cases: { level: number; mode: Mode }[] = [
    { level: 0, mode: "find" }, { level: 0, mode: "time" }, { level: 1, mode: "speed" }, { level: 7, mode: "decode" }, { level: 7, mode: "call" },
    { level: 7, mode: "order" }, { level: 4, mode: "missed" }, { level: 6, mode: "imsafe" }, { level: 7, mode: "brief" }, { level: 7, mode: "time" },
  ];
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp);
    await setState(page, 0);
    await page.goto("/play/flight-plan");
    await press(page, '[data-testid="story-begin"]');
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-story.png` });
    await press(page, '[data-testid="story-skip"]');
    await answering(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-intro-tutorial.png` });
    for (const c of cases) {
      await startAt(page, c.level, c.mode);
      await page.waitForTimeout(500);
      await noOverflow(page);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-l${c.level}-${c.mode}.png` });
    }
  }
});
