import { type Page, expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { buildRound } from "../src/engine/round";
import type { Exercise } from "../src/engine/types";
import { lighthouseNight } from "../src/games/lighthouse-night/definition";
import { BAND } from "../src/games/lighthouse-night/generator";
import { type Finale, type Mode, boardOf, decodePoint, finaleOf, modeOf } from "../src/games/lighthouse-night/logic";
import { collectErrors, press, reviewDir, screen } from "./helpers";

/**
 * Independent QA probe for Lighthouse Night (2026-11-27). Synthetic state only.
 * Adds what e2e/lighthouse-night.spec.ts does not check: text blocks (fact card, worked model, prompt) clipped or off
 * screen, the diagram covered by the helper, rendered SVG text size, keyboard-only play from Tab (no programmatic
 * focus), focus after a miss, screen-reader text for the diagrams, and reduced motion.
 */
const REVIEW = reviewDir("lighthouse-qa");
mkdirSync(REVIEW, { recursive: true });
const PROFILE = { monster: { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" }, monsterName: "Kiki", kidName: "Testkid", step: "done", parentSignup: "skipped" };
const SEED = 4242;
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "863x360", width: 863, height: 360 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];
const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 30_000 });
const board = (page: Page) => page.getByTestId("ln-board");
const sel = (v: string) => `[data-testid="choice"][data-value="${v}"]`;

async function startAt(page: Page, level: number, mode: Mode, fin?: Finale, opts: { begin?: boolean } = {}) {
  let s = SEED;
  let ex: Exercise | undefined;
  let round = buildRound(lighthouseNight, { level, seed: s });
  const want = (e: Exercise) => e.difficulty === level + 1 && modeOf(e) === mode && !e.tutorial && (!fin || finaleOf(e) === fin);
  for (let guard = 0; guard < 60 && !(ex = round.exercises.find(want)); guard++) round = buildRound(lighthouseNight, { level, seed: ++s });
  if (!ex) throw new Error(`no ${mode} ${fin ?? ""} at level ${level}`);
  const results = ex.closer
    ? round.exercises.filter((e) => e.difficulty === level + 1 && !e.closer && !e.tutorial).slice(0, BAND - 1).map((e) => ({ exerciseId: e.id, skillId: e.skillId, difficulty: e.difficulty, attempts: 1, firstTry: true, hintsShown: 0 }))
    : [];
  const saved = { v: 1, gameId: "lighthouse-night", progression: { difficulty: level + 1, streak: 0, played: results.map((r) => r.exerciseId), results }, currentId: ex.id, savedAt: Date.now(), level, seed: s };
  await page.goto("/");
  await page.evaluate(({ lv, profile, round }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("bz.v1", JSON.stringify({ muted: true, ageBand: "ages-12-14", profile, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "lighthouse-night": lv } }, round }));
    sessionStorage.setItem("seeded", "1");
  }, { lv: level, profile: PROFILE, round: saved });
  await page.goto("/play/lighthouse-night");
  if (opts.begin !== false) {
    await press(page, '[data-testid="start-game"]');
    await answering(page);
    await expect(screen(page)).toHaveAttribute("data-exercise", ex.id);
  }
  return ex;
}

const beamNow = async (page: Page) => Number(await board(page).getAttribute("data-beam"));
async function setBeamTap(page: Page, target: number) {
  for (let g = 0; g < 60 && (await beamNow(page)) !== target; g++) {
    const d = ((target - (await beamNow(page)) + 540) % 360) - 180;
    const step = Math.abs(d) >= 30 ? 30 : 5;
    await press(page, `[data-testid="ln-turn"][data-value="${d > 0 ? step : -step}"]`);
  }
}
const buoyNow = async (page: Page): Promise<[number, number]> => [Number(await board(page).getAttribute("data-x")), Number(await board(page).getAttribute("data-y"))];
async function setBuoyTap(page: Page, x: number, y: number) {
  for (let g = 0; g < 30; g++) {
    const [bx, by] = await buoyNow(page);
    if (bx === x && by === y) break;
    await press(page, `[data-testid="ln-move"][data-value="${bx < x ? "x+" : bx > x ? "x-" : by < y ? "y+" : "y-"}"]`);
  }
}
async function typeTap(page: Page, v: number) {
  if (v < 0) await press(page, '[data-testid="key"][data-value="neg"]');
  for (const d of String(Math.abs(Math.round(v * 100) / 100))) await press(page, `[data-testid="key"][data-value="${d}"]`);
  await press(page, '[data-testid="done"]');
}
async function miss(page: Page, ex: Exercise, n: 1 | 2) {
  const a = ex.answer;
  if (boardOf(ex) === "bback" && a.kind === "numeric") { await setBeamTap(page, (a.value + (n === 1 ? 90 : 120)) % 360); return press(page, '[data-testid="done"]'); }
  if (modeOf(ex) === "plot" && a.kind === "number") {
    const [x, y] = decodePoint(a.value);
    await setBuoyTap(page, x + (x < 0 ? 1 : -1), y + (n === 2 ? (y < 0 ? 1 : -1) : 0));
    return press(page, '[data-testid="done"]');
  }
  if (a.kind === "number" || a.kind === "numeric") return typeTap(page, Math.abs(a.value) + (n === 1 ? 7 : 9));
  if (a.kind === "choice") return press(page, sel(a.options.filter((o) => o.id !== a.correct)[n - 1]!.id));
  throw new Error(a.kind);
}

/** Layout audit of the current screen (beyond the builder's control check). */
async function audit(page: Page) {
  return page.evaluate(() => {
    const out: { problems: string[]; minFont: { px: number; cls: string; text: string } | null; diagramCovered: number; coveredBy: string[] } = { problems: [], minFont: null, diagramCovered: 0, coveredBy: [] };
    const desc = (e: Element | null) => (e ? `${e.tagName.toLowerCase()}.${String(e.getAttribute("class") ?? "").split(" ")[0]}` : "nothing");
    const clippedBy = (e: Element) => {
      const r = e.getBoundingClientRect();
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
        const ar = a.getBoundingClientRect();
        if (r.top < ar.top - 1 || r.bottom > ar.bottom + 1 || r.left < ar.left - 1 || r.right > ar.right + 1) return desc(a);
      }
      return null;
    };
    // 1. readable blocks: fact card, worked model, radio/path cards, readouts, notes, the prompt pill, the helper's bubble
    const TEXT = ['[data-testid="model-steps"]', '[data-testid="ln-method"]', ".ln-radio", ".ln-readout", ".ln-note", '[data-testid="ln-display"]', '[data-testid="prompt"]', ".helper-bubble", ".ln-tab"];
    for (const s of TEXT)
      for (const e of Array.from(document.querySelectorAll<HTMLElement>(s))) {
        const r = e.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (getComputedStyle(e).visibility === "hidden" || getComputedStyle(e).display === "none") continue;
        if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) { out.problems.push(`${s}: off screen (y ${Math.round(r.top)}–${Math.round(r.bottom)} of ${innerHeight}, x ${Math.round(r.left)}–${Math.round(r.right)} of ${innerWidth})`); continue; }
        const c = clippedBy(e);
        if (c) out.problems.push(`${s}: clipped by ${c}`);
        for (const t of [e, ...Array.from(e.querySelectorAll<HTMLElement>("*"))]) {
          const cs = getComputedStyle(t);
          if ((cs.overflow !== "visible" || cs.textOverflow === "ellipsis") && (t.scrollHeight > t.clientHeight + 2 || t.scrollWidth > t.clientWidth + 2) && t.clientHeight > 0) { out.problems.push(`${s}: text truncated inside ${desc(t)} (${t.scrollWidth}×${t.scrollHeight} in ${t.clientWidth}×${t.clientHeight})`); break; }
        }
        // something else drawn over the block's centre (e.g. the helper over the fact card)
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (s !== ".helper-bubble" && hit && !(hit === e || e.contains(hit)) && !hit.contains(e)) out.problems.push(`${s}: centre covered by ${desc(hit)}`);
      }
    // 2. the diagram (and dial/grid) covered by anything outside the board
    const stage = document.querySelector('[data-testid="ln-board"]');
    const diagram = document.querySelector('[data-testid="ln-board"] svg.ln-diagram');
    if (stage && diagram) {
      const r = diagram.getBoundingClientRect();
      let bad = 0, n = 0;
      const by = new Set<string>();
      for (let i = 1; i < 10; i++)
        for (let j = 1; j < 10; j++) {
          const x = r.left + (r.width * i) / 10, y = r.top + (r.height * j) / 10;
          if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) { bad++; n++; by.add("off screen"); continue; }
          n++;
          const hit = document.elementFromPoint(x, y);
          if (!hit || !stage.contains(hit)) { bad++; by.add(desc(hit)); }
        }
      out.diagramCovered = Math.round((100 * bad) / n);
      out.coveredBy = [...by];
      // 3. smallest rendered SVG text
      const vb = (diagram as SVGSVGElement).viewBox.baseVal;
      const scale = r.width / vb.width;
      for (const t of Array.from(diagram.querySelectorAll<SVGTextElement>("text"))) {
        if (!t.textContent?.trim()) continue;
        const px = parseFloat(getComputedStyle(t).fontSize) * scale;
        if (!out.minFont || px < out.minFont.px) out.minFont = { px: Math.round(px * 10) / 10, cls: String(t.getAttribute("class")), text: t.textContent.slice(0, 30) };
      }
    }
    // 4. page scroll
    if (document.documentElement.scrollHeight > innerHeight + 1) out.problems.push(`page scrolls: ${document.documentElement.scrollHeight} > ${innerHeight}`);
    if (document.documentElement.scrollWidth > innerWidth + 1) out.problems.push(`page scrolls x: ${document.documentElement.scrollWidth} > ${innerWidth}`);
    return out;
  });
}

const PROBE: { level: number; mode: Mode; fin?: Finale }[] = [
  { level: 1, mode: "line" }, { level: 4, mode: "bback" }, { level: 7, mode: "tri" }, { level: 5, mode: "bread" }, { level: 3, mode: "par" },
  { level: 3, mode: "hyp" }, { level: 5, mode: "round" }, { level: 7, mode: "conv" },
  { level: 1, mode: "real" }, { level: 6, mode: "share" }, { level: 7, mode: "ratio" },
  { level: 6, mode: "plot" }, { level: 6, mode: "grad" }, { level: 7, mode: "icpt" }, { level: 8, mode: "meet" },
  { level: 0, mode: "home", fin: "fline" }, { level: 1, mode: "home", fin: "ftri" }, { level: 3, mode: "home", fin: "fback" }, { level: 4, mode: "home", fin: "fchart" }, { level: 6, mode: "home", fin: "fcourse" },
];
const MIN_SVG_PX = 10;

for (const vp of VIEWPORTS) {
  test(`QA ${vp.name}: text blocks unclipped, diagram uncovered, SVG text ≥ ${MIN_SVG_PX}px (start, helper, model)`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "viewport set explicitly");
    test.setTimeout(1_200_000);
    const errors = collectErrors(page);
    await page.setViewportSize(vp);
    const log: Record<string, unknown>[] = [];
    for (const c of PROBE) {
      const tag = `${c.mode}${c.fin ? `-${c.fin}` : ""}`;
      const ex = await startAt(page, c.level, c.mode, c.fin);
      const step = async (state: string) => {
        const a = await audit(page);
        log.push({ vp: vp.name, tag, state, ...a });
        await page.screenshot({ path: `${REVIEW}/${vp.name}-${tag}-${state}.png` });
        expect.soft(a.problems, `${vp.name} ${tag} ${state}: text blocks`).toEqual([]);
        expect.soft(a.diagramCovered, `${vp.name} ${tag} ${state}: diagram % covered by ${a.coveredBy.join(", ")}`).toBe(0);
        if (a.minFont) expect.soft(a.minFont.px, `${vp.name} ${tag} ${state}: smallest diagram text ${JSON.stringify(a.minFont)}`).toBeGreaterThanOrEqual(MIN_SVG_PX);
      };
      await page.waitForTimeout(400);
      await step("start");
      await miss(page, ex, 1);
      await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(800);
      await step("helper");
      await answering(page);
      await page.waitForTimeout(300);
      await step("hinted");
      await miss(page, ex, 2);
      await expect(page.locator('[data-testid="model-steps"]:visible, .is-model:visible').first()).toBeVisible({ timeout: 20_000 });
      await answering(page);
      await page.waitForTimeout(700);
      await step("model");
    }
    writeFileSync(`${REVIEW}/audit-${vp.name}.json`, JSON.stringify(log, null, 1));
    expect.soft(errors, "console errors").toEqual([]);
  });
}

/** Tab from the top of the page until `target` is focused; returns the focus order and whether each stop showed a ring. */
async function tabTo(page: Page, target: string, max = 40) {
  const order: string[] = [];
  await page.locator("body").focus();
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate((t) => {
      const e = document.activeElement as HTMLElement | null;
      if (!e || e === document.body) return { name: "body", hit: false, ring: false };
      const cs = getComputedStyle(e);
      const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2) || /rgb/.test(cs.boxShadow);
      return { name: `${e.dataset.testid ?? e.tagName.toLowerCase()}${e.dataset.value ? `[${e.dataset.value}]` : ""}`, hit: e.matches(t), ring };
    }, target);
    order.push(`${info.name}${info.ring ? "" : " (NO RING)"}`);
    if (info.hit) return order;
  }
  throw new Error(`never reached ${target} by Tab: ${order.join(" → ")}`);
}
const focused = (page: Page) => page.evaluate(() => { const e = document.activeElement as HTMLElement | null; return e && e !== document.body ? `${e.dataset.testid ?? e.tagName.toLowerCase()}${e.dataset.value ? `[${e.dataset.value}]` : ""}` : "body"; });

test("QA keyboard only: the beam dial from Tab, a miss, the model; focus stays on a control that answers Enter", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one keyboard project");
  test.setTimeout(240_000);
  const notes: string[] = [];
  const ex = await startAt(page, 4, "bback");
  if (ex.answer.kind !== "numeric") throw new Error("numeric");
  const order = await tabTo(page, '[data-testid="ln-dial"]');
  notes.push(`tab order to dial: ${order.join(" → ")}`);
  const dial = page.getByTestId("ln-dial");
  await page.screenshot({ path: `${REVIEW}/kbd-dial-focus.png` });
  // the dial announces its value
  await page.keyboard.press("PageUp");
  await expect(dial).toHaveAttribute("aria-valuetext", /030°/);
  await page.keyboard.press("ArrowRight");
  await expect(dial).toHaveAttribute("aria-valuenow", "35");
  // first miss: Enter on the dial at a wrong bearing
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await page.waitForTimeout(300);
  notes.push(`focus after first miss: ${await focused(page)}`);
  expect.soft(await focused(page), "focus returns to the dial after the hint").toBe("ln-dial");
  // second miss
  await page.keyboard.press("PageUp");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("model-steps")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await page.waitForTimeout(400);
  const f2 = await focused(page);
  notes.push(`focus with the model: ${f2}`);
  // with the model on, Enter on whatever has focus should confirm (as it does on the plot grid)
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  const moved = (await screen(page).count()) === 0 || (await screen(page).getAttribute("data-exercise")) !== ex.id || (await screen(page).getAttribute("data-phase")) !== "answering";
  notes.push(`Enter on ${f2} with the model confirms: ${moved}`);
  writeFileSync(`${REVIEW}/kbd-dial.txt`, notes.join("\n"));
  expect.soft(moved, `Enter on the focused ${f2} with the worked model does nothing (keyboard user must find Shine)`).toBe(true);
});

test("QA keyboard only: plot the buoy, a keypad item and a choice item, reached by Tab alone", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one keyboard project");
  test.setTimeout(240_000);
  const notes: string[] = [];
  // plot
  const pl = await startAt(page, 6, "plot");
  if (pl.answer.kind !== "number") throw new Error("number");
  notes.push(`plot tab order: ${(await tabTo(page, '[data-testid="ln-grid"]')).join(" → ")}`);
  const [x, y] = decodePoint(pl.answer.value);
  for (let g = 0; g < 30; g++) {
    const [bx, by] = await buoyNow(page);
    if (bx === x && by === y) break;
    await page.keyboard.press(bx < x ? "ArrowRight" : bx > x ? "ArrowLeft" : by < y ? "ArrowUp" : "ArrowDown");
  }
  await expect(page.getByTestId("ln-grid")).toHaveAttribute("aria-label", new RegExp(`\\(${x}, ${y}\\)`.replace(/-/g, "−")));
  await page.screenshot({ path: `${REVIEW}/kbd-plot-focus.png` });
  await page.keyboard.press("Enter");
  await expect(screen(page)).not.toHaveAttribute("data-exercise", pl.id, { timeout: 30_000 });

  // keypad: keyboard user types digits anywhere; first-miss focus; model focus
  const ln = await startAt(page, 1, "line");
  if (ln.answer.kind !== "number") throw new Error("number");
  notes.push(`keypad tab order to Done: ${(await tabTo(page, '[data-testid="done"]')).join(" → ")}`);
  await page.keyboard.type("999");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await page.waitForTimeout(300);
  notes.push(`keypad focus after first miss: ${await focused(page)}`);
  await page.keyboard.type("998");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("model-steps")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await page.waitForTimeout(400);
  const fm = await focused(page);
  notes.push(`keypad focus with the model: ${fm}`);
  expect.soft(fm, "with the model on, keyboard focus should land on the visible Done (it is lost to <body>)").toBe("done");
  await page.keyboard.press("Enter");
  await expect(screen(page)).not.toHaveAttribute("data-exercise", ln.id, { timeout: 30_000 });

  // choice
  const cv = await startAt(page, 7, "conv");
  if (cv.answer.kind !== "choice") throw new Error("choice");
  notes.push(`choice tab order: ${(await tabTo(page, sel(cv.answer.correct))).join(" → ")}`);
  await page.keyboard.press("Enter");
  await expect(screen(page)).not.toHaveAttribute("data-exercise", cv.id, { timeout: 30_000 });
  writeFileSync(`${REVIEW}/kbd-other.txt`, notes.join("\n"));
});

test("QA screen reader: the diagram's text alternative carries the givens the question needs", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "semantics are viewport-independent");
  test.setTimeout(240_000);
  const cases: { level: number; mode: Mode; givens: (ex: Exercise) => string[] }[] = [
    { level: 1, mode: "line", givens: (ex) => [ex.params!.p0!, ex.params!.p1!, ex.params!.p2!].slice(0, ex.params!.n).filter((_, i) => i !== ex.params!.u).map((v) => `${v}`) },
    { level: 1, mode: "vert", givens: (ex) => [`${ex.params!.a}`] },
    { level: 5, mode: "bread", givens: (ex) => [`${ex.params!.d}`] },
    { level: 6, mode: "grad", givens: (ex) => [`${ex.params!.x1}`, `${ex.params!.y1}`, `${ex.params!.x2}`, `${ex.params!.y2}`] },
  ];
  const report: string[] = [];
  for (const c of cases) {
    const ex = await startAt(page, c.level, c.mode);
    const label = (await page.getByTestId("ln-diagram").getAttribute("aria-label")) ?? "";
    const prompt = (await page.getByTestId("live-caption").textContent()) ?? "";
    const panel = (await page.locator(".ln-panel").innerText()) ?? "";
    const missing = c.givens(ex).filter((g) => !`${label} ${prompt} ${panel}`.includes(g));
    report.push(`${c.mode}: aria-label "${label}" · caption "${prompt}" · missing ${JSON.stringify(missing)}`);
    expect.soft(missing, `${c.mode}: givens only drawn in the SVG (role=img "${label}")`).toEqual([]);
  }
  writeFileSync(`${REVIEW}/sr-diagrams.txt`, report.join("\n"));
});

test("QA reduced motion: no infinite animation on the board, the model pulse or the finale boat", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one project");
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const loops = () => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" && (a.effect?.getComputedTiming().iterations ?? 1) === Infinity).map((a) => {
    const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
    return `${(a as CSSAnimation).animationName ?? "anim"} on ${t ? `${t.tagName.toLowerCase()}.${String(t.getAttribute("class") ?? "").split(" ")[0]}` : "?"}`;
  }));
  const found: string[] = [];
  const ex = await startAt(page, 7, "conv");
  await page.waitForTimeout(600);
  found.push(...(await loops()).map((s) => `conv start: ${s}`));
  await miss(page, ex, 1);
  await answering(page);
  await miss(page, ex, 2);
  await answering(page);
  await page.waitForTimeout(600);
  found.push(...(await loops()).map((s) => `conv model: ${s}`));
  await startAt(page, 6, "home", "fcourse");
  await page.waitForTimeout(600);
  found.push(...(await loops()).map((s) => `finale: ${s}`));
  await page.screenshot({ path: `${REVIEW}/reduced-finale.png` });
  writeFileSync(`${REVIEW}/reduced-motion.txt`, found.join("\n"));
  expect(found.filter((s) => /ln-|board|stage/.test(s))).toEqual([]);
});

/** Text labels inside the diagram must not overlap each other or run past the picture's edge. */
const labelClashes = (page: Page) =>
  page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>('[data-testid="ln-board"] svg.ln-diagram');
    if (!svg) return ["no diagram"];
    const sr = svg.getBoundingClientRect();
    const ts = Array.from(svg.querySelectorAll<SVGTextElement>("text")).filter((t) => t.textContent?.trim()).map((t) => ({ t: t.textContent!.trim(), r: t.getBoundingClientRect() }));
    const bad: string[] = [];
    for (const a of ts) if (a.r.left < sr.left - 1 || a.r.right > sr.right + 1 || a.r.top < sr.top - 1 || a.r.bottom > sr.bottom + 1) bad.push(`"${a.t}" runs past the diagram edge`);
    for (let i = 0; i < ts.length; i++)
      for (let j = i + 1; j < ts.length; j++) {
        const a = ts[i]!.r, b = ts[j]!.r;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 3 && oy > 3) bad.push(`"${ts[i]!.t}" overlaps "${ts[j]!.t}"`);
      }
    return bad;
  });

test("QA worked-model diagrams: labels (run/rise, points, ticks) neither overlap nor leave the picture", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport set explicitly");
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const cases: { level: number; mode: Mode; fin?: Finale }[] = [{ level: 6, mode: "grad" }, { level: 7, mode: "icpt" }, { level: 8, mode: "meet" }, { level: 8, mode: "para" }, { level: 6, mode: "home", fin: "fcourse" }, { level: 7, mode: "tri" }, { level: 1, mode: "line" }, { level: 5, mode: "bread" }];
  const all: string[] = [];
  for (const c of cases) {
    const ex = await startAt(page, c.level, c.mode, c.fin);
    await miss(page, ex, 1);
    await answering(page);
    await miss(page, ex, 2);
    await answering(page);
    await page.waitForTimeout(600);
    const bad = await labelClashes(page);
    all.push(`${c.mode}${c.fin ? `-${c.fin}` : ""}: ${bad.join("; ") || "ok"}`);
    await page.getByTestId("ln-diagram").first().screenshot({ path: `${REVIEW}/labels-${c.mode}${c.fin ? `-${c.fin}` : ""}.png` });
    expect.soft(bad, `${c.mode} model labels`).toEqual([]);
  }
  writeFileSync(`${REVIEW}/labels.txt`, all.join("\n"));
});

test("QA keyboard only: after a first miss, typing the answer and pressing Enter submits it (focus was moved onto the '1' key)", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one keyboard project");
  test.setTimeout(180_000);
  const ln = await startAt(page, 1, "line");
  if (ln.answer.kind !== "number") throw new Error("number");
  await page.locator("body").press("Tab"); // keyboard user
  await page.keyboard.type("999");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await page.waitForTimeout(400);
  const f = await focused(page);
  await page.keyboard.type(String(ln.answer.value));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  const shown = (await page.getByTestId("ln-display").textContent()) ?? "";
  writeFileSync(`${REVIEW}/kbd-keypad-enter.txt`, `focus after miss: ${f}\ntyped ${ln.answer.value} + Enter → display "${shown}"\n`);
  await page.screenshot({ path: `${REVIEW}/kbd-keypad-enter.png` });
  await expect(screen(page), `typed ${ln.answer.value} + Enter with focus on ${f}: display shows "${shown}"`).not.toHaveAttribute("data-phase", "answering", { timeout: 5_000 });
});
