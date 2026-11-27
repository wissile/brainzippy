import { type Page, expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { buildRound } from "../src/engine/round";
import type { Exercise } from "../src/engine/types";
import { lighthouseNight } from "../src/games/lighthouse-night/definition";
import { BAND } from "../src/games/lighthouse-night/generator";
import { type Finale, type Mode, boardOf, decodePoint, finaleOf, gameOf, modeOf } from "../src/games/lighthouse-night/logic";
import { collectErrors, press, reviewDir, screen } from "./helpers";

/**
 * Lighthouse Night: story → a whole round by tap, keyboard and drag → outro → sticker + level up; first miss shows
 * Ripple with a diagnosed hint and the fact card, second miss the worked model (keypad, dial, buoy, choice); every
 * inner game and finale; every control on screen and uncovered at five viewports, before a miss, with the helper and
 * with the model (screenshots in reviewDir("lighthouse-night")).
 */
const REVIEW = reviewDir("lighthouse-night");
mkdirSync(REVIEW, { recursive: true });
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "863x360", width: 863, height: 360 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];
const PROFILE = { monster: { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" }, monsterName: "Kiki", kidName: "Testkid", step: "done", parentSignup: "skipped" };
type Way = "tap" | "drag" | "keyboard";
const SEED = 4242;

const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 30_000 });
const board = (page: Page) => page.getByTestId("ln-board");
const sel = (v: string) => `[data-testid="choice"][data-value="${v}"]`;
const isDial = (ex: Exercise) => boardOf(ex) === "bback";
const isPlot = (ex: Exercise) => modeOf(ex) === "plot";
/** The helper's line is captioned in its bubble, or in the prompt pill on small screens. */
const hintShown = (page: Page, re: RegExp) => expect(page.locator(".helper-bubble, .prompt-pill").filter({ hasText: re }).first()).toBeVisible({ timeout: 20_000 });

async function setState(page: Page, level: number, round: unknown = null) {
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(({ lv, profile, round }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("bz.v1", JSON.stringify({ muted: true, ageBand: "ages-12-14", profile, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "lighthouse-night": lv } }, round }));
    sessionStorage.setItem("seeded", "1");
  }, { lv: level, profile: PROFILE, round });
}
/** Start a round at `level` whose current exercise is the band's first item of `mode` (and finale kind). */
async function startAt(page: Page, level: number, mode: Mode, fin?: Finale, seed = SEED) {
  let s = seed;
  let ex: Exercise | undefined;
  let round = buildRound(lighthouseNight, { level, seed: s });
  const want = (e: Exercise) => e.difficulty === level + 1 && modeOf(e) === mode && !e.tutorial && (!fin || finaleOf(e) === fin);
  for (let guard = 0; guard < 60 && !(ex = round.exercises.find(want)); guard++) round = buildRound(lighthouseNight, { level, seed: ++s });
  if (!ex) throw new Error(`no ${mode} ${fin ?? ""} at level ${level}`);
  // the finale is a closer: it is served on the last slot, so resume it with seven results already in
  const results = ex.closer
    ? round.exercises.filter((e) => e.difficulty === level + 1 && !e.closer && !e.tutorial).slice(0, BAND - 1).map((e) => ({ exerciseId: e.id, skillId: e.skillId, difficulty: e.difficulty, attempts: 1, firstTry: true, hintsShown: 0 }))
    : [];
  await setState(page, level, { v: 1, gameId: "lighthouse-night", progression: { difficulty: level + 1, streak: 0, played: results.map((r) => r.exerciseId), results }, currentId: ex.id, savedAt: Date.now(), level, seed: s });
  await page.goto("/play/lighthouse-night");
  await press(page, '[data-testid="start-game"]');
  await answering(page);
  await expect(screen(page)).toHaveAttribute("data-exercise", ex.id);
  return ex;
}
async function current(page: Page): Promise<Exercise> {
  await answering(page);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  const r = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).round as { level: number; seed: number });
  const ex = buildRound(lighthouseNight, { level: r.level, seed: r.seed }).exercises.find((e) => e.id === id);
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
    return page.waitForTimeout(150);
  }
  return press(page, selector);
}

const valueText = (v: number) => String(Math.abs(Math.round(v * 100) / 100));
async function typeValue(page: Page, v: number, way: Way) {
  if (way === "keyboard") {
    await page.getByTestId("done").focus();
    if (v < 0) await page.keyboard.press("-");
    await page.keyboard.type(valueText(v));
    await expect(page.getByTestId("ln-display")).toContainText(valueText(v).replace(/^0\./, "0."));
    return page.keyboard.press("Enter");
  }
  if (v < 0) await press(page, '[data-testid="key"][data-value="neg"]');
  for (const d of valueText(v)) await press(page, `[data-testid="key"][data-value="${d}"]`);
  await expect(page.getByTestId("ln-display")).toContainText(valueText(v));
  return press(page, '[data-testid="done"]');
}

const beamNow = async (page: Page) => Number(await board(page).getAttribute("data-beam"));
async function setBeam(page: Page, target: number, way: Way) {
  if (way === "drag") {
    const box = (await page.locator('[data-testid="ln-dial"] svg').boundingBox())!;
    const cx = box.x + (200 / 400) * box.width, cy = box.y + (120 / 236) * box.height;
    const r = 0.18 * box.width;
    const pt = (b: number) => [cx + r * Math.sin((b * Math.PI) / 180), cy - r * Math.cos((b * Math.PI) / 180)] as const;
    const from = pt(await beamNow(page));
    await page.mouse.move(from[0], from[1]);
    await page.mouse.down();
    const start = await beamNow(page);
    const delta = ((target - start + 540) % 360) - 180;
    for (let i = 1; i <= 12; i++) {
      const [x, y] = pt(start + (delta * i) / 12);
      await page.mouse.move(x, y);
    }
    await page.mouse.up();
  }
  for (let guard = 0; guard < 60 && (await beamNow(page)) !== target; guard++) {
    const now = await beamNow(page);
    const d = ((target - now + 540) % 360) - 180;
    const step = Math.abs(d) >= 30 ? 30 : 5;
    if (way === "keyboard") {
      await page.getByTestId("ln-dial").focus();
      await page.keyboard.press(step === 30 ? (d > 0 ? "PageUp" : "PageDown") : d > 0 ? "ArrowRight" : "ArrowLeft");
    } else await press(page, `[data-testid="ln-turn"][data-value="${d > 0 ? step : -step}"]`);
  }
  await expect(board(page)).toHaveAttribute("data-beam", String(target));
}

const buoyNow = async (page: Page): Promise<[number, number]> => [Number(await board(page).getAttribute("data-x")), Number(await board(page).getAttribute("data-y"))];
async function setBuoy(page: Page, x: number, y: number, way: Way) {
  if (way === "drag") {
    const box = (await page.locator('[data-testid="ln-grid"] svg').boundingBox())!;
    const q4 = (await page.locator(".ln-svg-tick", { hasText: "−" }).count()) > 0;
    const [lo, hi] = q4 ? [-6, 6] : [0, 8];
    const cell = (300 - 48) / (hi - lo);
    const px = (gx: number) => box.x + ((24 + (gx - lo) * cell) / 300) * box.width;
    const py = (gy: number) => box.y + ((300 - 24 - (gy - lo) * cell) / 300) * box.height;
    const [sx, sy] = await buoyNow(page);
    await page.mouse.move(px(sx), py(sy));
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(px(sx + ((x - sx) * i) / 10), py(sy + ((y - sy) * i) / 10));
    await page.mouse.up();
  }
  for (let guard = 0; guard < 30; guard++) {
    const [bx, by] = await buoyNow(page);
    if (bx === x && by === y) break;
    const key = bx < x ? "ArrowRight" : bx > x ? "ArrowLeft" : by < y ? "ArrowUp" : "ArrowDown";
    const btn = bx < x ? "x+" : bx > x ? "x-" : by < y ? "y+" : "y-";
    if (way === "keyboard") {
      await page.getByTestId("ln-grid").focus();
      await page.keyboard.press(key);
    } else await press(page, `[data-testid="ln-move"][data-value="${btn}"]`);
  }
  await expect(board(page)).toHaveAttribute("data-x", String(x));
  await expect(board(page)).toHaveAttribute("data-y", String(y));
}

/** Solve the exercise on screen the given way. */
async function solve(page: Page, way: Way, ex?: Exercise) {
  const e = ex ?? (await current(page));
  const a = e.answer;
  if (isDial(e) && a.kind === "numeric") {
    await setBeam(page, a.value, way);
    return activate(page, '[data-testid="done"]', way === "drag" ? "tap" : way);
  }
  if (isPlot(e) && a.kind === "number") {
    const [x, y] = decodePoint(a.value);
    await setBuoy(page, x, y, way);
    return activate(page, '[data-testid="done"]', way === "drag" ? "tap" : way);
  }
  if (a.kind === "number" || a.kind === "numeric") return typeValue(page, a.value, way === "drag" ? "tap" : way);
  if (a.kind === "choice") return activate(page, sel(a.correct), way === "drag" ? "tap" : way);
  throw new Error(`unexpected answer kind ${a.kind}`);
}
/** A wrong answer of the right kind for the exercise on screen (first or second miss). */
async function missOnce(page: Page, ex: Exercise, n: 1 | 2) {
  const a = ex.answer;
  if (isDial(ex) && a.kind === "numeric") {
    await setBeam(page, (a.value + (n === 1 ? 90 : 120)) % 360, "tap");
    return press(page, '[data-testid="done"]');
  }
  if (isPlot(ex) && a.kind === "number") {
    const [x, y] = decodePoint(a.value);
    await setBuoy(page, x + (x < 0 ? 1 : -1), y + (n === 2 ? (y < 0 ? 1 : -1) : 0), "tap");
    return press(page, '[data-testid="done"]');
  }
  if (a.kind === "number" || a.kind === "numeric") return typeValue(page, Math.abs(a.value) + (n === 1 ? 7 : 9), "tap");
  if (a.kind === "choice") return press(page, sel(a.options.filter((o) => o.id !== a.correct)[n - 1]!.id));
  throw new Error(`unexpected answer kind ${a.kind}`);
}

const CONTROLS = ['[data-testid="choice"]', '[data-testid="done"]', '[data-testid="key"]', '[data-testid="ln-turn"]', '[data-testid="ln-move"]', '[data-testid="ln-dial"]', '[data-testid="ln-grid"]'];
/** Every rendered control is fully on screen (x and y), ≥ 44 px, not clipped, and is what elementFromPoint finds at its centre. */
async function unreachableControls(page: Page): Promise<string[]> {
  return page.evaluate((sels) => {
    const bad: string[] = [];
    for (const s of sels)
      for (const e of Array.from(document.querySelectorAll<HTMLElement>(s))) {
        const r = e.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const name = `${s}${e.dataset.value ? `[${e.dataset.value}]` : ""}`;
        if (Math.min(r.width, r.height) < 43.5) bad.push(`${name}: ${Math.round(r.width)}×${Math.round(r.height)} px`);
        if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) { bad.push(`${name}: off screen (x ${Math.round(r.left)}–${Math.round(r.right)} of ${innerWidth}, y ${Math.round(r.top)}–${Math.round(r.bottom)} of ${innerHeight})`); continue; }
        let clip: string | null = null;
        for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
          const ar = a.getBoundingClientRect();
          if (r.top < ar.top - 1 || r.bottom > ar.bottom + 1 || r.left < ar.left - 1 || r.right > ar.right + 1) { clip = `${a.tagName.toLowerCase()}.${String(a.className).split(" ")[0]}`; break; }
        }
        if (clip) { bad.push(`${name}: clipped by ${clip}`); continue; }
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (!hit || !(hit === e || e.contains(hit))) bad.push(`${name}: covered by ${hit ? `${hit.tagName.toLowerCase()}.${String(hit.getAttribute("class") ?? "").split(" ")[0]}` : "nothing"}`);
      }
    return bad;
  }, CONTROLS);
}
async function noOverflow(page: Page, tag = "") {
  const vp = page.viewportSize()!;
  const over = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
  expect(over.w, `${tag} page width`).toBeLessThanOrEqual(vp.width + 1);
  expect(over.h, `${tag} page height`).toBeLessThanOrEqual(vp.height + 1);
  expect(await unreachableControls(page), `${tag} controls on screen and pressable`).toEqual([]);
}

test("a whole round by tap, keyboard and drag: tutorial hand, finale last, outro, sticker and level up", async ({ page }, info) => {
  test.setTimeout(300_000);
  const errors = collectErrors(page);
  const shot = (name: string) => page.screenshot({ path: `${REVIEW}/${info.project.name}-${name}.png` });
  await setState(page, 0);
  await page.goto("/play/lighthouse-night");
  await press(page, '[data-testid="story-begin"]');
  await page.waitForTimeout(700);
  await shot("01-story");
  await press(page, '[data-testid="story-skip"]');

  expect(await screen(page).getAttribute("data-exercise")).toBe("ln-tutorial-line");
  await answering(page);
  await expect(page.getByTestId("hand-pointer")).toBeVisible({ timeout: 25_000 });
  await shot("02-tutorial");
  await noOverflow(page, "tutorial");

  const ways: Way[] = ["tap", "keyboard", "tap", "keyboard", "tap", "keyboard", "tap", "keyboard"];
  const games: string[] = [];
  for (let i = 0; i < 8; i++) {
    if ((await screen(page).count()) === 0) break;
    const ex = await current(page);
    games.push(gameOf(ex));
    if (i === 2) await shot(`03-${modeOf(ex)}`);
    await solve(page, ways[i]!, ex);
    await nextExercise(page, ex.id);
  }
  expect(games.at(-1)).toBe("home");
  expect(games.slice(0, -1)).not.toContain("home");
  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(700);
  await shot("05-outro");
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Keeper's Lamp" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  await page.waitForTimeout(1200);
  await shot("06-reward");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("keepers-lamp");
  expect(stored.progress.levels["lighthouse-night"]).toBe(1);
  expect(errors).toEqual([]);
});

test("misses: a diagnosed hint with the fact card on the first, the worked model on the second", async ({ page }, info) => {
  test.setTimeout(300_000);
  const errors = collectErrors(page);
  // keypad (angles on a line): "360 − the rest" gets its own line
  const line = await startAt(page, 1, "line");
  const parts = [line.params!.p0!, line.params!.p1!, line.params!.p2!].slice(0, line.params!.n);
  const known = parts.filter((_, i) => i !== line.params!.u).reduce((s, x) => s + x, 0);
  await typeValue(page, 360 - known, "tap");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await hintShown(page, /half a turn/i);
  await answering(page);
  await expect(page.getByTestId("ln-method")).toContainText("180°");
  await typeValue(page, 999, "keyboard");
  await expect(page.getByTestId("model-steps")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  if (line.answer.kind !== "number") throw new Error("number");
  await expect(page.getByTestId("ln-display")).toContainText(String(line.answer.value));
  await expect(page.locator(".ln-ang.is-model")).toHaveCount(1);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-07-model-line.png` });
  await press(page, '[data-testid="done"]');
  await nextExercise(page, line.id);

  // dial (back bearing): "the same bearing" is diagnosed; the model turns the beam for the child to confirm
  const bb = await startAt(page, 3, "bback");
  if (bb.answer.kind !== "numeric") throw new Error("numeric");
  await setBeam(page, bb.params!.b!, "tap");
  await press(page, '[data-testid="done"]');
  await hintShown(page, /look back the other way/i);
  await answering(page);
  await missOnce(page, bb, 2);
  await expect(page.getByTestId("model-steps")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(board(page)).toHaveAttribute("data-beam", String(bb.answer.value));
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-08-model-dial.png` });
  await press(page, '[data-testid="done"]');
  await nextExercise(page, bb.id);

  // buoy (plot): swapped coordinates are diagnosed
  const pl = await startAt(page, 6, "plot");
  await setBuoy(page, pl.params!.y!, pl.params!.x!, "tap");
  await press(page, '[data-testid="done"]');
  await hintShown(page, /swapped/i);
  await answering(page);
  await missOnce(page, pl, 2);
  await expect(page.getByTestId("model-steps")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(board(page)).toHaveAttribute("data-x", String(pl.params!.x));
  await press(page, '[data-testid="done"]');
  await nextExercise(page, pl.id);

  // choice (the converse): the wrong pick greys out, then the right one pulses
  const cv = await startAt(page, 7, "conv");
  if (cv.answer.kind !== "choice") throw new Error("choice");
  const wrongs = cv.answer.options.filter((o) => o.id !== (cv.answer as { correct: string }).correct).map((o) => o.id);
  await press(page, sel(wrongs[0]!));
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(sel(wrongs[0]!))).toHaveClass(/is-out/);
  await press(page, sel(wrongs[1]!));
  await expect(page.locator(sel(cv.answer.correct))).toHaveClass(/is-model/, { timeout: 20_000 });
  await answering(page);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-09-model-conv.png` });
  await press(page, sel(cv.answer.correct));
  await nextExercise(page, cv.id);
  expect(errors).toEqual([]);
});

test("every inner game and finale plays by tap and keyboard (and drag on desktop)", async ({ page }, info) => {
  test.setTimeout(600_000);
  const errors = collectErrors(page);
  const desktop = info.project.name === "desktop";
  const cases: { level: number; mode: Mode; fin?: Finale; way: Way }[] = [
    { level: 0, mode: "point", way: "keyboard" },
    { level: 0, mode: "kind", way: "tap" },
    { level: 1, mode: "vert", way: "tap" },
    { level: 7, mode: "tri", way: "keyboard" },
    { level: 3, mode: "par", way: "tap" },
    { level: 5, mode: "reason", way: "keyboard" },
    { level: 5, mode: "bread", way: "keyboard" },
    { level: 4, mode: "bback", way: desktop ? "drag" : "keyboard" },
    { level: 3, mode: "hyp", way: "tap" },
    { level: 4, mode: "leg", way: "keyboard" },
    { level: 5, mode: "round", way: "tap" },
    { level: 7, mode: "conv", way: "tap" },
    { level: 1, mode: "real", way: "keyboard" },
    { level: 2, mode: "map", way: "tap" },
    { level: 6, mode: "share", way: "keyboard" },
    { level: 7, mode: "ratio", way: "tap" },
    { level: 2, mode: "plot", way: desktop ? "drag" : "tap" },
    { level: 6, mode: "plot", way: "keyboard" },
    { level: 6, mode: "grad", way: "tap" },
    { level: 7, mode: "icpt", way: "keyboard" },
    { level: 6, mode: "eqn", way: "tap" },
    { level: 8, mode: "meet", way: "keyboard" },
    { level: 8, mode: "para", way: "tap" },
    { level: 0, mode: "home", fin: "fline", way: "keyboard" },
    { level: 1, mode: "home", fin: "ftri", way: "tap" },
    { level: 3, mode: "home", fin: "fback", way: desktop ? "drag" : "tap" },
    { level: 4, mode: "home", fin: "fchart", way: "keyboard" },
    { level: 6, mode: "home", fin: "fcourse", way: "tap" },
  ];
  for (const c of cases) {
    const ex = await startAt(page, c.level, c.mode, c.fin);
    await expect(board(page)).toHaveAttribute("data-mode", c.mode);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${REVIEW}/${info.project.name}-20-l${c.level}-${c.mode}${c.fin ? `-${c.fin}` : ""}-${c.way}.png` });
    await noOverflow(page, `L${c.level} ${c.mode}`);
    await solve(page, c.way, ex);
    await nextExercise(page, ex.id);
  }
  expect(errors).toEqual([]);
});

// Every board at every viewport: on screen and pressable at the start (with the round-start helper), while the helper
// explains a first miss, and with the worked model after a second miss.
const SWEEP: { level: number; mode: Mode; fin?: Finale }[] = [
  { level: 1, mode: "line" }, { level: 1, mode: "point" }, { level: 0, mode: "kind" }, { level: 1, mode: "vert" }, { level: 7, mode: "tri" },
  { level: 3, mode: "par" }, { level: 5, mode: "reason" }, { level: 5, mode: "bread" }, { level: 4, mode: "bback" }, { level: 3, mode: "hyp" },
  { level: 5, mode: "round" }, { level: 7, mode: "conv" }, { level: 8, mode: "real" }, { level: 6, mode: "share" }, { level: 7, mode: "ratio" },
  { level: 6, mode: "plot" }, { level: 6, mode: "grad" }, { level: 6, mode: "eqn" }, { level: 8, mode: "meet" }, { level: 8, mode: "para" },
  { level: 1, mode: "home", fin: "ftri" }, { level: 4, mode: "home", fin: "fchart" }, { level: 6, mode: "home", fin: "fcourse" },
];
for (const vp of VIEWPORTS) {
  test(`${vp.name}: every control stays on screen and uncovered, before a miss, with the helper and with the model`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "viewport set explicitly");
    test.setTimeout(900_000);
    await page.setViewportSize(vp);
    if (vp.name === "390x844") {
      await setState(page, 0);
      await page.goto("/play/lighthouse-night");
      await press(page, '[data-testid="story-begin"]');
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-story.png` });
    }
    for (const c of SWEEP) {
      const tag = `${vp.name} L${c.level} ${c.mode}${c.fin ? ` ${c.fin}` : ""}`;
      const ex = await startAt(page, c.level, c.mode, c.fin);
      await page.waitForTimeout(400);
      expect.soft(await unreachableControls(page), `${tag} start`).toEqual([]);
      const over = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      expect.soft(over, `${tag} no page scroll`).toBeLessThanOrEqual(1);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-${c.mode}${c.fin ? `-${c.fin}` : ""}.png` });
      await missOnce(page, ex, 1);
      await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(700);
      expect.soft(await unreachableControls(page), `${tag} helper`).toEqual([]);
      await answering(page);
      await missOnce(page, ex, 2);
      await expect(page.locator('[data-testid="model-steps"]:visible, .is-model:visible').first()).toBeVisible({ timeout: 20_000 });
      await answering(page);
      await page.waitForTimeout(600);
      expect.soft(await unreachableControls(page), `${tag} model`).toEqual([]);
      // the picture shows the modelled value too (lengths on the tower triangle)
      if (gameOf(ex) === "ladder" && c.mode !== "conv" && (ex.answer.kind === "number" || ex.answer.kind === "numeric")) await expect.soft(page.locator(".ln-side.is-model")).toContainText(`${c.mode === "round" ? ex.answer.value.toFixed(1) : ex.answer.value} m`);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-${c.mode}${c.fin ? `-${c.fin}` : ""}-model.png` });
    }
  });
}
