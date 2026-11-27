import { type Page, expect, test } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { buildRound } from "../src/engine/round";
import type { Exercise } from "../src/engine/types";
import { bakery } from "../src/games/bakery/definition";
import { BAND } from "../src/games/bakery/generator";
import { type Kind, barSlots, buildCols, buildRows, decode, mistakes } from "../src/games/bakery/logic";
import { collectErrors, press, reviewDir, screen } from "./helpers";

/**
 * Bobbo's Bakery: story → a whole round by tap, drag and keyboard → order sheet last → outro → Head Baker's Hat + level
 * up; first miss shows Puff with a hint diagnosed from the wrong answer, second miss the worked model; every inner game
 * by tap, keyboard and (where there is one) drag; every control on screen, ≥ 44 px and uncovered at five viewports in
 * every inner game, before a miss, with the helper and with the model (screenshots in reviewDir("bakery")).
 */
const REVIEW = reviewDir("bakery");
mkdirSync(REVIEW, { recursive: true });
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "863x360", width: 863, height: 360 },
];
const PROFILE = { monster: { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" }, monsterName: "Ziggy", kidName: "Testkid", step: "done", parentSignup: "skipped" };
const LINES = (JSON.parse(readFileSync("src/games/bakery/voice.json", "utf8")) as { lines: Record<string, { text: string }> }).lines;
type Way = "tap" | "drag" | "keyboard";
const SEED = 2468;

const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 30_000 });
const board = (page: Page) => page.getByTestId("bk-board");
const sel = (v: string) => `[data-testid="choice"][data-value="${v}"]`;
const kindOf = (ex: Exercise): Kind => decode(ex).kind;

async function setState(page: Page, level: number, round: unknown = null) {
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(({ lv, profile, round }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("bz.v1", JSON.stringify({ muted: true, ageBand: "ages-9-11", profile, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { bakery: lv } }, round }));
    sessionStorage.setItem("seeded", "1");
  }, { lv: level, profile: PROFILE, round });
}
/** Start a round at `level` whose current exercise is the band's first item of `kind` (resume snapshot, fixed seed). */
async function startAt(page: Page, level: number, kind: Kind, seed = SEED) {
  const round = buildRound(bakery, { level, seed });
  const ex = round.exercises.find((e) => e.difficulty === level + 1 && kindOf(e) === kind && !e.tutorial);
  if (!ex) throw new Error(`no ${kind} at level ${level}`);
  const results = ex.closer
    ? round.exercises.filter((e) => e.difficulty === level + 1 && !e.closer && !e.tutorial).slice(0, BAND - 1).map((e) => ({ exerciseId: e.id, skillId: e.skillId, difficulty: e.difficulty, attempts: 1, firstTry: true, hintsShown: 0 }))
    : [];
  await setState(page, level, { v: 1, gameId: "bakery", progression: { difficulty: level + 1, streak: 0, played: results.map((r) => r.exerciseId), results }, currentId: ex.id, savedAt: Date.now(), level, seed });
  await page.goto("/play/bakery");
  await press(page, '[data-testid="start-game"]');
  await answering(page);
  return ex;
}
async function current(page: Page): Promise<Exercise> {
  await answering(page);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  const r = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).round as { level: number; seed: number });
  const ex = buildRound(bakery, { level: r.level, seed: r.seed }).exercises.find((e) => e.id === id);
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
    return page.waitForTimeout(120);
  }
  return press(page, selector);
}
const blur = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

/** Type a number on the keypad (tap) or with the number keys (keyboard), then Check. */
async function typeAnswer(page: Page, n: number, way: Way, check = true) {
  if (way === "keyboard") {
    await blur(page);
    await page.keyboard.type(String(n));
    if (check) await page.keyboard.press("Enter");
    return;
  }
  for (const d of String(n)) await press(page, `[data-testid="key"][data-value="${d}"]`);
  if (check) await press(page, '[data-testid="done"]');
}
/** Centre of grid cell (row, col) of the tray / grid SVG, in page pixels. */
async function cellPoint(page: Page, testId: string, row: number, col: number): Promise<[number, number]> {
  const svg = page.getByTestId(testId);
  const box = (await svg.boundingBox())!;
  const [x0, y0, cell, vw, vh] = (await svg.getAttribute("data-geo"))!.split(",").map(Number) as [number, number, number, number, number];
  const scale = Math.min(box.width / vw, box.height / vh);
  const ox = box.x + (box.width - vw * scale) / 2, oy = box.y + (box.height - vh * scale) / 2;
  return [ox + (x0 + (col + 0.5) * cell) * scale, oy + (y0 + (row + 0.5) * cell) * scale];
}
async function dragPath(page: Page, from: [number, number], to: [number, number]) {
  await page.mouse.move(...from);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(from[0] + ((to[0] - from[0]) * i) / 10, from[1] + ((to[1] - from[1]) * i) / 10);
  await page.mouse.up();
}
async function stepTo(page: Page, id: string, target: number, way: Way, keys?: { up: string; down: string }) {
  const value = async () => Number(await page.getByTestId(`bk-${id}-value`).innerText());
  for (let g = 0; g < 30 && (await value()) !== target; g++) {
    const up = (await value()) < target;
    if (way === "keyboard") {
      await blur(page);
      await page.keyboard.press(up ? (keys?.up ?? "ArrowUp") : (keys?.down ?? "ArrowDown"));
    } else await press(page, `[data-testid="bk-${id}-${up ? "up" : "down"}"]`);
  }
  await expect(page.getByTestId(`bk-${id}-value`)).toHaveText(String(target));
}
async function placeTags(page: Page, ex: Exercise, way: Way) {
  const slots = barSlots(decode(ex));
  for (const sl of slots) {
    if ((await page.locator(`[data-testid="bk-slot"][data-value="${sl.id}"]`).getAttribute("aria-disabled")) === "true") continue; // already filled
    const tag = `[data-testid="bk-tag"][data-value="${sl.id}"]`;
    const slot = `[data-testid="bk-slot"][data-value="${sl.id}"]`;
    if (way === "drag") {
      const a = (await page.locator(tag).boundingBox())!, b = (await page.locator(slot).boundingBox())!;
      await dragPath(page, [a.x + a.width / 2, a.y + a.height / 2], [b.x + b.width / 2, b.y + b.height / 2]);
    } else {
      await activate(page, tag, way);
      await activate(page, slot, way);
    }
    await expect(page.locator(slot)).toHaveClass(/is-filled/);
  }
}
/** Set the value an item submits (without Check), by the given way. */
async function setValue(page: Page, ex: Exercise, v: number, way: Way) {
  const s = decode(ex);
  switch (s.kind) {
    case "build": {
      const rows = buildRows(v), cols = buildCols(v);
      if (way === "drag") return dragPath(page, await cellPoint(page, "bk-tray", 0, 0), await cellPoint(page, "bk-tray", rows - 1, cols - 1));
      await stepTo(page, "rows", rows, way, { up: "ArrowDown", down: "ArrowUp" });
      return stepTo(page, "cols", cols, way, { up: "ArrowRight", down: "ArrowLeft" });
    }
    case "missing":
    case "make": {
      if (way === "drag") {
        const svg = s.kind === "missing" ? "bk-tray" : "bk-grid";
        if (s.kind === "missing") return dragPath(page, await cellPoint(page, svg, 0, 0), s.v === 0 ? await cellPoint(page, svg, 0, v - 1) : await cellPoint(page, svg, v - 1, 0));
        return dragPath(page, await cellPoint(page, svg, 11, 0), await cellPoint(page, svg, 12 - v, 0));
      }
      if (v > 12 || way === "keyboard") return typeAnswer(page, v, way, false); // the keypad takes any value (typical misses too)
      return stepTo(page, "value", v, way);
    }
    case "equiv": {
      if (way === "drag") {
        const box = (await page.getByTestId("bk-cake").boundingBox())!;
        const at = (i: number): [number, number] => {
          const ang = ((i + 0.5) / s.c) * Math.PI * 2;
          return [box.x + box.width / 2 + Math.sin(ang) * box.width * 0.3, box.y + box.height / 2 - Math.cos(ang) * box.height * 0.3];
        };
        return dragPath(page, at(0), at(v - 1));
      }
      return stepTo(page, "value", v, way);
    }
    case "pw": case "cmpb": case "mulb": case "timesb": case "fracb":
      await placeTags(page, ex, way);
      return typeAnswer(page, v, way === "drag" ? "tap" : way, false);
    case "order":
      if (way === "keyboard") {
        await blur(page);
        for (let i = 0; i < s.lines.length; i++) await page.keyboard.press("ArrowDown");
      } else await press(page, '[data-testid="bk-line"][data-value="total"]');
      await expect(board(page)).toHaveAttribute("data-active", String(s.lines.length));
      return typeAnswer(page, v, way === "drag" ? "tap" : way, false);
    default:
      return typeAnswer(page, v, way === "drag" ? "tap" : way, false);
  }
}
async function pressCheck(page: Page, way: Way) {
  if (way === "keyboard") {
    await blur(page);
    return page.keyboard.press("Enter");
  }
  return press(page, '[data-testid="done"]');
}
/** Solve the exercise on screen the given way. */
async function solve(page: Page, way: Way, ex?: Exercise) {
  const e = ex ?? (await current(page));
  const a = e.answer;
  if (a.kind === "choice") return activate(page, sel(a.correct), way === "drag" ? "tap" : way);
  if (a.kind !== "number") throw new Error("unexpected answer kind");
  await setValue(page, e, a.value, way);
  await pressCheck(page, way === "drag" ? "tap" : way);
}
/** A wrong answer of the right kind: miss 1 is a typical mistake (so the hint is diagnosed), miss 2 something else. */
function wrongValue(ex: Exercise, n: 1 | 2): number | string {
  const s = decode(ex);
  const a = ex.answer;
  if (a.kind === "choice") return a.options.filter((o) => o.id !== a.correct)[n - 1]!.id;
  const right = (a as { value: number }).value;
  const reachable = (v: number) => {
    if (s.kind === "build") return buildRows(v) >= 1 && buildRows(v) <= 6 && buildCols(v) >= 1 && buildCols(v) <= 10;
    if (s.kind === "equiv") return v >= 1 && v <= s.c;
    return v >= 0 && v <= 9999;
  };
  const typical = mistakes(s).filter((m) => reachable(m.value));
  if (n === 1 && typical[0]) return typical[0].value;
  const alt = s.kind === "build" ? right + 100 * (buildRows(right) < 6 ? 1 : -1) : s.kind === "equiv" ? (right < s.c ? right + 1 : right - 1) : right + 1;
  return n === 2 && typical[1] && typical[1].value !== typical[0]?.value ? typical[1].value : alt;
}
async function missOnce(page: Page, ex: Exercise, n: 1 | 2) {
  const v = wrongValue(ex, n);
  if (typeof v === "string") return press(page, sel(v));
  await setValue(page, ex, v, "tap");
  return press(page, '[data-testid="done"]');
}

const CONTROLS = ['[data-testid="choice"]', '[data-testid="done"]', '[data-testid="key"]', '[data-testid$="-up"]', '[data-testid$="-down"]', '[data-testid="bk-tag"]', '[data-testid="bk-slot"]', '[data-testid="bk-group"]', '[data-testid="bk-line"]'];
/**
 * Every rendered control is fully on screen and pressable where it is drawn: inside the viewport (x and y), at least
 * 44 px, not clipped by a scrolling ancestor, and elementFromPoint at its centre is the control (not under the mascot,
 * the helper or anything else).
 */
async function unreachableControls(page: Page): Promise<string[]> {
  return page.evaluate((sels) => {
    const bad: string[] = [];
    for (const s of sels)
      for (const e of Array.from(document.querySelectorAll<HTMLElement>(s))) {
        if (!e.closest('[data-testid="game-screen"]')) continue;
        const r = e.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (getComputedStyle(e).visibility === "hidden") continue; // a placed number tag keeps its space but is gone
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
        if (!hit || !(hit === e || e.contains(hit))) bad.push(`${name}: covered by ${hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).split(" ")[0]}` : "nothing"}`);
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

test("a whole round by tap, drag and keyboard: tutorial hand, order sheet last, sticker and level up", async ({ page }, info) => {
  test.setTimeout(300_000);
  const errors = collectErrors(page);
  const shot = (name: string) => page.screenshot({ path: `${REVIEW}/${info.project.name}-${name}.png` });
  await setState(page, 0);
  await page.goto("/play/bakery");
  await press(page, '[data-testid="story-begin"]');
  await expect(page.getByTestId("story")).toBeVisible();
  await page.waitForTimeout(900);
  await shot("01-story");
  await press(page, '[data-testid="story-skip"]');

  await answering(page);
  expect(await screen(page).getAttribute("data-exercise")).toBe("bk-tutorial-build");
  await expect(page.getByTestId("hand-pointer")).toBeVisible({ timeout: 20_000 }); // points at "one more row"
  await shot("02-play-tutorial");
  await noOverflow(page, "tutorial");

  const ways: Way[] = ["tap", "drag", "keyboard", "tap", "drag", "keyboard", "tap", "keyboard", "drag"];
  const kinds: Kind[] = [];
  for (let i = 0; i < 9; i++) {
    if ((await screen(page).count()) === 0) break;
    const ex = await current(page);
    kinds.push(kindOf(ex));
    let way = ways[i]!;
    if (way === "drag" && info.project.name !== "desktop") way = "tap";
    if (i === 2) await shot(`03-${kindOf(ex)}`);
    await solve(page, way, ex);
    await nextExercise(page, ex.id);
  }
  expect(kinds.at(-1)).toBe("order");
  expect(kinds.slice(0, -1)).not.toContain("order");
  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(900);
  await shot("05-outro");
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Head Baker's Hat" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  await page.waitForTimeout(1200);
  await shot("06-reward");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("head-baker-hat");
  expect(stored.progress.levels.bakery).toBe(1);
  expect(errors).toEqual([]);
});

/** Helper caption check: the bubble, or the prompt pill on small screens. */
async function saysLine(page: Page, id: string) {
  const text = LINES[id]!.text;
  await expect(page.locator('[data-testid="helper"], [data-testid="prompt"]').filter({ hasText: text.slice(0, 40) }).first()).toBeVisible({ timeout: 20_000 });
}

test("misses are diagnosed: perimeter for area, added instead of multiplied, one step of two, then the worked model", async ({ page }, info) => {
  test.setTimeout(300_000);
  const errors = collectErrors(page);
  // area: typing the perimeter → Puff names it; second miss → worked model, answer filled in
  const area = await startAt(page, 3, "area");
  const s = decode(area);
  await typeAnswer(page, 2 * (s.a + s.b), "tap");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await saysLine(page, "bk.hint.perimeter");
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-07-hint-area.png` });
  await answering(page);
  await expect(page.getByTestId("bk-readout")).toContainText(`${s.b} rows of ${s.a}`); // the tiles appear row by row
  await typeAnswer(page, s.a + s.b, "keyboard");
  await expect(page.getByTestId("model-steps")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.getByTestId("bk-display")).toHaveAttribute("data-value", String(s.a * s.b));
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-08-model-area.png` });
  await press(page, '[data-testid="done"]');
  await nextExercise(page, area.id);

  // a times fact: added instead of multiplied
  const fact = await startAt(page, 2, "fact");
  const f = decode(fact);
  await typeAnswer(page, f.a + f.b, "tap");
  await saysLine(page, "bk.hint.added");
  await answering(page);
  await typeAnswer(page, f.a * f.b, "keyboard");
  await nextExercise(page, fact.id);

  // bar model: one step only
  const pw = await startAt(page, 6, "pw");
  const p = decode(pw);
  await placeTags(page, pw, "tap");
  await typeAnswer(page, p.a - p.b, "tap");
  await saysLine(page, "bk.hint.oneStep");
  await answering(page);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-09-hint-bar.png` });
  await typeAnswer(page, p.b + p.c, "tap");
  await expect(page.getByTestId("model-steps")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.getByTestId("bk-display")).toHaveAttribute("data-value", String(p.a - p.b - p.c));
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-10-model-bar.png` });
  await press(page, '[data-testid="done"]');
  await nextExercise(page, pw.id);

  // compare: picking the fraction with more (smaller) slices; the wrong pick greys out, then the right one pulses
  const cmp = await startAt(page, 4, "cmp");
  if (cmp.answer.kind !== "choice") throw new Error("choice");
  const wrongs = cmp.answer.options.filter((o) => o.id !== (cmp.answer as { correct: string }).correct).map((o) => o.id);
  await press(page, sel(wrongs[0]!));
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(sel(wrongs[0]!))).toHaveClass(/is-out/);
  await press(page, sel(wrongs[1]!));
  await expect(page.locator(sel(cmp.answer.correct))).toHaveClass(/is-model/, { timeout: 20_000 });
  await answering(page);
  await press(page, sel(cmp.answer.correct));
  await nextExercise(page, cmp.id);

  // order sheet: a line left out of the total; lines get marked after the miss
  const ord = await startAt(page, 6, "order");
  const o = decode(ord);
  const first = o.lines[0]!;
  const v0 = first.k === 4 ? (first.c / first.b) * first.a : first.k === 5 ? first.a * first.b + first.c : first.a * first.b;
  await press(page, '[data-testid="bk-line"][data-value="0"]');
  await typeAnswer(page, v0, "tap", false);
  await press(page, '[data-testid="bk-line"][data-value="total"]');
  await typeAnswer(page, (ord.answer as { value: number }).value - v0, "tap");
  await saysLine(page, "bk.hint.missedLine");
  await answering(page);
  await expect(page.locator(".bk-line.is-ok")).toHaveCount(1);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-11-hint-order.png` });
  await typeAnswer(page, (ord.answer as { value: number }).value, "keyboard");
  await nextExercise(page, ord.id);
  expect(errors).toEqual([]);
});

test("every inner game plays by tap and keyboard (and drag on desktop)", async ({ page }, info) => {
  test.setTimeout(420_000);
  const errors = collectErrors(page);
  const desktop = info.project.name === "desktop";
  const cases: { level: number; kind: Kind; way: Way }[] = [
    { level: 0, kind: "count", way: "keyboard" },
    { level: 0, kind: "build", way: desktop ? "drag" : "tap" },
    { level: 1, kind: "build", way: "keyboard" },
    { level: 1, kind: "missing", way: desktop ? "drag" : "tap" },
    { level: 3, kind: "missing", way: "keyboard" },
    { level: 2, kind: "fact", way: "tap" },
    { level: 2, kind: "area", way: "keyboard" },
    { level: 2, kind: "perim", way: "tap" },
    { level: 3, kind: "make", way: desktop ? "drag" : "tap" },
    { level: 7, kind: "make", way: "keyboard" },
    { level: 5, kind: "lshape", way: "tap" },
    { level: 4, kind: "of", way: "keyboard" },
    { level: 5, kind: "equiv", way: desktop ? "drag" : "tap" },
    { level: 8, kind: "equiv", way: "keyboard" },
    { level: 7, kind: "cmp", way: "keyboard" },
    { level: 6, kind: "pw", way: desktop ? "drag" : "tap" },
    { level: 6, kind: "cmpb", way: "keyboard" },
    { level: 7, kind: "mulb", way: "tap" },
    { level: 7, kind: "timesb", way: desktop ? "drag" : "keyboard" },
    { level: 7, kind: "fracb", way: "keyboard" },
    { level: 8, kind: "cmpb", way: "tap" },
    { level: 2, kind: "order", way: "keyboard" },
    { level: 8, kind: "order", way: "tap" },
  ];
  for (const c of cases) {
    const ex = await startAt(page, c.level, c.kind);
    await expect(board(page)).toHaveAttribute("data-kind", c.kind);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${REVIEW}/${info.project.name}-20-l${c.level}-${c.kind}-${c.way}.png` });
    await noOverflow(page, `${c.kind} L${c.level}`);
    await solve(page, c.way, ex);
    await nextExercise(page, ex.id);
  }
  expect(errors).toEqual([]);
});

test("a wrong tag slides back; after two slips it settles on its bar (never counted as a miss)", async ({ page }) => {
  test.setTimeout(120_000);
  const ex = await startAt(page, 6, "pw");
  const slots = barSlots(decode(ex));
  const [x, y] = [slots[1]!, slots[2]!];
  for (let i = 0; i < 2; i++) {
    await press(page, `[data-testid="bk-tag"][data-value="${x.id}"]`);
    await press(page, `[data-testid="bk-slot"][data-value="${y.id}"]`);
  }
  await expect(page.locator(`[data-testid="bk-slot"][data-value="${x.id}"]`)).toHaveClass(/is-filled/);
  await expect(page.getByTestId("bk-note")).toContainText(x.tag);
  expect(await screen(page).getAttribute("data-phase")).toBe("answering");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).round);
  expect(stored.progression.results).toEqual([]);
});

// Every inner game at every viewport: on screen and pressable at the start (with the round-start helper), while the
// helper explains a first miss, and with the worked model after a second miss.
const SWEEP: { level: number; kind: Kind }[] = [
  { level: 0, kind: "count" }, { level: 1, kind: "build" }, { level: 8, kind: "fact" }, { level: 8, kind: "missing" },
  { level: 2, kind: "area" }, { level: 3, kind: "perim" }, { level: 7, kind: "make" }, { level: 8, kind: "lshape" },
  { level: 6, kind: "of" }, { level: 4, kind: "of" }, { level: 5, kind: "equiv" }, { level: 4, kind: "cmp" },
  { level: 6, kind: "pw" }, { level: 7, kind: "mulb" }, { level: 7, kind: "timesb" }, { level: 8, kind: "fracb" }, { level: 8, kind: "order" },
];
for (const vp of VIEWPORTS) {
  test(`${vp.name}: every control stays on screen and uncovered, before a miss, with the helper and with the model`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "viewport set explicitly");
    test.setTimeout(600_000);
    await page.setViewportSize(vp);
    await setState(page, 0);
    await page.goto("/play/bakery");
    await press(page, '[data-testid="story-begin"]');
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-story.png` });
    await press(page, '[data-testid="story-skip"]');
    await answering(page);
    await page.waitForTimeout(500);
    expect.soft(await unreachableControls(page), `${vp.name} tutorial`).toEqual([]);
    await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-tutorial.png` });
    for (const c of SWEEP) {
      const tag = `${vp.name} L${c.level} ${c.kind}`;
      const ex = await startAt(page, c.level, c.kind);
      await page.waitForTimeout(400);
      expect.soft(await unreachableControls(page), `${tag} start`).toEqual([]);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-l${c.level}-${c.kind}-a.png` });
      await missOnce(page, ex, 1);
      await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(700);
      expect.soft(await unreachableControls(page), `${tag} helper`).toEqual([]);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-l${c.level}-${c.kind}-b-helper.png` });
      await answering(page);
      await missOnce(page, ex, 2);
      await expect(page.locator('[data-testid="model-steps"]:visible, .is-model:visible').first()).toBeVisible({ timeout: 20_000 });
      await answering(page);
      await page.waitForTimeout(600);
      expect.soft(await unreachableControls(page), `${tag} model`).toEqual([]);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-l${c.level}-${c.kind}-c-model.png` });
    }
  });
}
