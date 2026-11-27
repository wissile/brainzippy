import { type Page, expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { buildRound } from "../src/engine/round";
import type { Exercise } from "../src/engine/types";
import { bakery } from "../src/games/bakery/definition";
import { type Kind, barSlots, buildCode, decode } from "../src/games/bakery/logic";
import { collectErrors, press, reviewDir, screen } from "./helpers";

/**
 * Independent QA probe for Bobbo's Bakery (2026-11-27). Synthetic state only.
 * Complements e2e/bakery.spec.ts with: non-control content (story card, worked-model steps, readouts, notes, prompt,
 * helper) fully visible and not clipped by the board's overflow:hidden; no inner scrolling; Tab-only keyboard
 * completion with a visible focus ring; feedback reaching the live region; reduced motion; a contrast scan.
 */
const REVIEW = reviewDir("bakery-qa");
mkdirSync(REVIEW, { recursive: true });
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "863x360", width: 863, height: 360 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];
const PROFILE = { monster: { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" }, monsterName: "Ziggy", kidName: "Testkid", step: "done", parentSignup: "skipped" };
const SEED = 1357;
const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 30_000 });

async function startAt(page: Page, level: number, kind: Kind, seed = SEED) {
  const round = buildRound(bakery, { level, seed });
  const ex = round.exercises.find((e) => e.difficulty === level + 1 && decode(e).kind === kind && !e.tutorial);
  if (!ex) throw new Error(`no ${kind} at level ${level}`);
  const results = ex.closer
    ? round.exercises.filter((e) => e.difficulty === level + 1 && !e.closer && !e.tutorial).slice(0, 7).map((e) => ({ exerciseId: e.id, skillId: e.skillId, difficulty: e.difficulty, attempts: 1, firstTry: true, hintsShown: 0 }))
    : [];
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(({ lv, profile, round }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("bz.v1", JSON.stringify({ muted: true, ageBand: "ages-9-11", profile, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { bakery: lv } }, round }));
    sessionStorage.setItem("seeded", "1");
  }, { lv: level, profile: PROFILE, round: { v: 1, gameId: "bakery", progression: { difficulty: level + 1, streak: 0, played: results.map((r) => r.exerciseId), results }, currentId: ex.id, savedAt: Date.now(), level, seed } });
  await page.goto("/play/bakery");
  await press(page, '[data-testid="start-game"]');
  await answering(page);
  return ex;
}

const num = (ex: Exercise) => (ex.answer as { value: number }).value;
async function keypad(page: Page, n: number) {
  for (const d of String(n)) await press(page, `[data-testid="key"][data-value="${d}"]`);
}
/** A wrong answer by tap (miss 1 / miss 2 differ). */
async function miss(page: Page, ex: Exercise, n: 1 | 2) {
  const s = decode(ex);
  const a = ex.answer;
  if (a.kind === "choice") {
    const wrong = a.options.filter((o) => o.id !== a.correct)[n - 1]!.id;
    return press(page, `[data-testid="choice"][data-value="${wrong}"]`);
  }
  const right = num(ex);
  if (s.kind === "build") {
    // nudge rows up (or down at the max) until the tray differs from the answer
    await press(page, `[data-testid="bk-rows-${n === 1 ? "up" : "up"}"]`);
    if ((await page.getByTestId("bk-board").getAttribute("data-rows")) === String(Math.floor(right / 100)) && (await page.getByTestId("bk-board").getAttribute("data-cols")) === String(right % 100)) await press(page, '[data-testid="bk-cols-up"]');
    return press(page, '[data-testid="done"]');
  }
  if (s.kind === "equiv") {
    const target = right === n ? n + 1 : n; // 1 or 2 iced slices, never the answer
    for (let g = 0; g < 30; g++) {
      const v = Number(await page.getByTestId("bk-value-value").innerText());
      if (v === target) break;
      await press(page, `[data-testid="bk-value-${v < target ? "up" : "down"}"]`);
    }
    return press(page, '[data-testid="done"]');
  }
  if (["pw", "cmpb", "mulb", "timesb", "fracb"].includes(s.kind) && n === 1) {
    for (const sl of barSlots(s)) {
      await press(page, `[data-testid="bk-tag"][data-value="${sl.id}"]`);
      await press(page, `[data-testid="bk-slot"][data-value="${sl.id}"]`);
    }
  }
  if (s.kind === "order") await press(page, '[data-testid="bk-line"][data-value="total"]');
  await keypad(page, right + n);
  return press(page, '[data-testid="done"]');
}

/**
 * Content a child must read (not only controls): fully inside the viewport and not cut by an overflow:hidden/auto
 * ancestor; and no element inside the game screen scrolls.
 */
async function hiddenContent(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const bad: string[] = [];
    const sels = [".bk-story", ".bk-model", ".bk-model li.is-on", ".bk-readout", ".bk-note", ".bk-question", ".bk-cakefig figcaption", '[data-testid="prompt"]', '[data-testid="helper"]', ".bk-line-text", ".bk-sheet-title", ".bk-tray", ".bk-grid", ".bk-cake", ".bk-bars"];
    for (const s of sels)
      for (const e of Array.from(document.querySelectorAll<HTMLElement>(s))) {
        if (!e.closest('[data-testid="game-screen"]')) continue;
        const r = e.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (getComputedStyle(e).visibility === "hidden" || getComputedStyle(e).display === "none") continue;
        if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) { bad.push(`${s}: off screen (y ${Math.round(r.top)}–${Math.round(r.bottom)} of ${innerHeight}, x ${Math.round(r.left)}–${Math.round(r.right)} of ${innerWidth})`); continue; }
        for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
          const ar = a.getBoundingClientRect();
          if (r.top < ar.top - 2 || r.bottom > ar.bottom + 2 || r.left < ar.left - 2 || r.right > ar.right + 2) { bad.push(`${s}: clipped by ${a.tagName.toLowerCase()}.${String(a.className).split(" ")[0]} (${Math.round(r.top)}–${Math.round(r.bottom)} vs ${Math.round(ar.top)}–${Math.round(ar.bottom)})`); break; }
        }
        // text that overflows its own box (ellipsis / cut lines)
        if (e.scrollHeight > e.clientHeight + 2 && getComputedStyle(e).overflowY !== "visible") bad.push(`${s}: own text cut (${e.scrollHeight} > ${e.clientHeight})`);
      }
    for (const e of Array.from(document.querySelectorAll<HTMLElement>('[data-testid="game-screen"] *'))) {
      const cs = getComputedStyle(e);
      if ((cs.overflowY === "auto" || cs.overflowY === "scroll") && e.scrollHeight > e.clientHeight + 1) bad.push(`scrolls: ${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]}`);
    }
    if (document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1) bad.push(`page scrolls (${document.documentElement.scrollWidth}×${document.documentElement.scrollHeight})`);
    return bad;
  });
}
/** Every control: on screen, ≥44 px, uncovered at its centre. */
async function badControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const bad: string[] = [];
    for (const e of Array.from(document.querySelectorAll<HTMLElement>('[data-testid="game-screen"] button'))) {
      const r = e.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const cs = getComputedStyle(e);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const name = `${e.dataset.testid ?? e.className.split(" ")[0]}${e.dataset.value ? `[${e.dataset.value}]` : ""}`;
      if (Math.min(r.width, r.height) < 43.5) bad.push(`${name}: ${Math.round(r.width)}×${Math.round(r.height)}`);
      if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) { bad.push(`${name}: off screen`); continue; }
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!hit || !(hit === e || e.contains(hit))) bad.push(`${name}: covered by ${hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).split(" ")[0]}` : "nothing"}`);
    }
    return bad;
  });
}

const PROBE: { level: number; kind: Kind }[] = [
  { level: 1, kind: "build" }, { level: 8, kind: "missing" }, { level: 0, kind: "count" },
  { level: 7, kind: "make" }, { level: 8, kind: "lshape" }, { level: 3, kind: "perim" },
  { level: 5, kind: "equiv" }, { level: 4, kind: "of" }, { level: 7, kind: "cmp" },
  { level: 6, kind: "pw" }, { level: 7, kind: "mulb" }, { level: 8, kind: "fracb" },
  { level: 8, kind: "order" },
];

for (const vp of VIEWPORTS) {
  test(`QA ${vp.name}: content and controls visible, no scrolling — start, helper, model`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "viewport set explicitly");
    test.setTimeout(600_000);
    const errors = collectErrors(page);
    await page.setViewportSize(vp);
    const out: Record<string, string[]> = {};
    for (const c of PROBE) {
      const tag = `L${c.level}-${c.kind}`;
      const ex = await startAt(page, c.level, c.kind);
      await page.waitForTimeout(400);
      out[`${tag} start`] = [...(await badControls(page)), ...(await hiddenContent(page))];
      await page.screenshot({ path: `${REVIEW}/${vp.name}-${tag}-a.png` });
      await miss(page, ex, 1);
      await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(800);
      out[`${tag} helper`] = [...(await badControls(page)), ...(await hiddenContent(page))];
      await page.screenshot({ path: `${REVIEW}/${vp.name}-${tag}-b.png` });
      await answering(page);
      await miss(page, ex, 2);
      await expect(page.locator('[data-testid="model-steps"]:visible, .is-model:visible').first()).toBeVisible({ timeout: 20_000 });
      await answering(page);
      await page.waitForTimeout(700);
      out[`${tag} model`] = [...(await badControls(page)), ...(await hiddenContent(page))];
      await page.screenshot({ path: `${REVIEW}/${vp.name}-${tag}-c.png` });
    }
    writeFileSync(`${REVIEW}/layout-${vp.name}.json`, JSON.stringify(out, null, 1));
    const failing = Object.fromEntries(Object.entries(out).filter(([, v]) => v.length));
    expect.soft(failing, `${vp.name}: hidden content / controls`).toEqual({});
    expect(errors).toEqual([]);
  });
}

// ---------------------------------------------------------------- keyboard only (Tab / Shift+Tab / Enter / keys)

interface Focused { id: string; ring: boolean }
async function focused(page: Page): Promise<Focused> {
  return page.evaluate(() => {
    const e = document.activeElement as HTMLElement | null;
    if (!e || e === document.body) return { id: "body", ring: false };
    const cs = getComputedStyle(e);
    const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2) || (cs.boxShadow !== "none" && cs.boxShadow !== "");
    return { id: `${e.dataset.testid ?? e.tagName.toLowerCase()}${e.dataset.value ? `[${e.dataset.value}]` : ""}${e.getAttribute("aria-label") ? ` "${e.getAttribute("aria-label")}"` : ""}`, ring };
  });
}
/** Press Tab (or Shift+Tab) until the focused element matches; records the path and any element without a ring. */
async function tabTo(page: Page, selector: string, log: Focused[], back = false, max = 60) {
  for (let i = 0; i < max; i++) {
    if (await page.evaluate((s) => !!document.activeElement?.matches(s), selector)) return;
    await page.keyboard.press(back ? "Shift+Tab" : "Tab");
    log.push(await focused(page));
  }
  throw new Error(`Tab never reached ${selector}; path: ${log.slice(-12).map((f) => f.id).join(" → ")}`);
}
async function nextExercise(page: Page, id: string) {
  await expect.poll(async () => ((await screen(page).count()) === 0 ? "done" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 45_000 }).not.toBe(id);
}
async function tabPress(page: Page, sel: string, log: Focused[], back = false) {
  await tabTo(page, sel, log, back);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
}
async function tabSteps(page: Page, id: string, target: number, log: Focused[]) {
  for (let g = 0; g < 30; g++) {
    const v = Number(await page.getByTestId(`bk-${id}-value`).innerText());
    if (v === target) return;
    await tabPress(page, `[data-testid="bk-${id}-${v < target ? "up" : "down"}"]`, log, v >= target);
  }
}
async function tabKeypad(page: Page, n: number, log: Focused[]) {
  for (const d of String(n)) await tabPress(page, `[data-testid="key"][data-value="${d}"]`, log, true);
}

const KB: { level: number; kind: Kind }[] = [
  { level: 1, kind: "build" }, { level: 3, kind: "missing" }, { level: 2, kind: "area" }, { level: 3, kind: "make" },
  { level: 5, kind: "equiv" }, { level: 4, kind: "of" }, { level: 4, kind: "cmp" }, { level: 6, kind: "pw" }, { level: 7, kind: "timesb" }, { level: 2, kind: "order" },
];
test("QA keyboard: every inner game completes with Tab/Shift+Tab + Enter only, focus always visible", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "keyboard on desktop");
  test.setTimeout(600_000);
  const errors = collectErrors(page);
  const report: Record<string, { path: string[]; noRing: string[] }> = {};
  for (const c of KB) {
    const ex = await startAt(page, c.level, c.kind);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const log: Focused[] = [];
    const s = decode(ex);
    const a = ex.answer;
    if (a.kind === "choice") await tabPress(page, `[data-testid="choice"][data-value="${a.correct}"]`, log);
    else if (s.kind === "build") {
      const v = num(ex);
      await tabSteps(page, "rows", Math.floor(v / 100), log);
      await tabSteps(page, "cols", v % 100, log);
      expect(buildCode(Number(await page.getByTestId("bk-rows-value").innerText()), Number(await page.getByTestId("bk-cols-value").innerText()))).toBe(v);
      await tabPress(page, '[data-testid="done"]', log);
    } else if (s.kind === "equiv" || (s.kind === "missing" && num(ex) <= 12) || (s.kind === "make" && num(ex) <= 12)) {
      await tabSteps(page, "value", num(ex), log);
      await tabPress(page, '[data-testid="done"]', log);
    } else if (["pw", "cmpb", "mulb", "timesb", "fracb"].includes(s.kind)) {
      for (const sl of barSlots(s)) {
        await tabPress(page, `[data-testid="bk-tag"][data-value="${sl.id}"]`, log);
        await tabPress(page, `[data-testid="bk-slot"][data-value="${sl.id}"]`, log, true); // slots come before the tags
      }
      await tabKeypad(page, num(ex), log);
      await tabPress(page, '[data-testid="done"]', log);
    } else if (s.kind === "order") {
      await tabPress(page, '[data-testid="bk-line"][data-value="total"]', log);
      await tabKeypad(page, num(ex), log);
      await tabPress(page, '[data-testid="done"]', log);
    } else {
      await tabKeypad(page, num(ex), log);
      await tabPress(page, '[data-testid="done"]', log);
    }
    await page.screenshot({ path: `${REVIEW}/kb-L${c.level}-${c.kind}.png` });
    await nextExercise(page, ex.id);
    report[`L${c.level}-${c.kind}`] = { path: [...new Set(log.map((f) => f.id))], noRing: [...new Set(log.filter((f) => !f.ring && f.id !== "body").map((f) => f.id))] };
  }
  writeFileSync(`${REVIEW}/keyboard.json`, JSON.stringify(report, null, 1));
  for (const [k, r] of Object.entries(report)) expect.soft(r.noRing, `${k}: focused without a visible ring`).toEqual([]);
  expect(errors).toEqual([]);
});

// After a keyboard user picks a number tag, focus should move to (or near) the bars; today Tab goes on to the keypad.
test("QA keyboard: picking a bar-model tag with Enter, the next Tab reaches a bar slot (not the keypad)", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "keyboard on desktop");
  const ex = await startAt(page, 6, "pw");
  const sl = barSlots(decode(ex))[0]!;
  await page.locator(`[data-testid="bk-tag"][data-value="${sl.id}"]`).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  const f = await focused(page);
  expect(f.id, "focus after picking a tag").toMatch(/^bk-slot|^bk-tag/);
});

// ---------------------------------------------------------------- live region, captions

test("QA live region: a miss's diagnosed hint reaches the polite live region (muted)", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one project");
  const ex = await startAt(page, 2, "area");
  const s = decode(ex);
  await keypad(page, 2 * (s.a + s.b)); // the perimeter: Puff names it
  await press(page, '[data-testid="done"]');
  const hint = "That's the ribbon round the edge";
  await expect(page.locator('[data-testid="helper"], [data-testid="prompt"]').filter({ hasText: hint }).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("live-caption")).toContainText(hint, { timeout: 10_000 });
});

// The bar-slot labels ("Extra", "One tray") must not break inside a word on a phone.
test("QA 390x844: bar-model slot labels never split a word across lines", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport set explicitly");
  await page.setViewportSize({ width: 390, height: 844 });
  await startAt(page, 7, "mulb");
  const split = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>(".bk-slot-name")).filter((e) => {
      const words = (e.textContent ?? "").trim().split(/\s+/);
      const lines = new Set<number>();
      const range = document.createRange();
      const t = e.firstChild!;
      for (let i = 0; i < (t.textContent ?? "").length; i++) {
        range.setStart(t, i); range.setEnd(t, i + 1);
        const r = range.getBoundingClientRect();
        if (r.width > 0) lines.add(Math.round(r.top));
      }
      return lines.size > words.length;
    }).map((e) => e.textContent));
  await page.screenshot({ path: `${REVIEW}/regress-slot-label-390.png` });
  expect(split).toEqual([]);
});

test("QA live region: bar-model slip note and order-sheet marks are announced (region present before the text)", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one project");
  // the slip note: a polite region must exist before its text changes, else most screen readers stay silent
  const ex = await startAt(page, 6, "pw");
  const slots = barSlots(decode(ex));
  const before = await page.locator('.bk-panel [aria-live]').count();
  await press(page, `[data-testid="bk-tag"][data-value="${slots[1]!.id}"]`);
  await press(page, `[data-testid="bk-slot"][data-value="${slots[2]!.id}"]`);
  await expect(page.getByTestId("bk-note")).toBeVisible();
  const after = await page.locator('.bk-panel [aria-live]').count();
  expect.soft(before, `a live region for the slip note exists before the slip (before ${before}, after ${after})`).toBeGreaterThanOrEqual(after);

  // order sheet: after a miss the line marks (✓ / ?) must be in the line button's accessible name
  const ord = await startAt(page, 6, "order");
  const o = decode(ord);
  const l0 = o.lines[0]!;
  const v0 = l0.k === 4 ? (l0.c / l0.b) * l0.a : l0.k === 5 ? l0.a * l0.b + l0.c : l0.a * l0.b;
  await press(page, '[data-testid="bk-line"][data-value="0"]');
  await keypad(page, v0 + 1); // a wrong line value
  await press(page, '[data-testid="bk-line"][data-value="total"]');
  await keypad(page, num(ord) + 1);
  await press(page, '[data-testid="done"]');
  await answering(page);
  await expect(page.locator(".bk-line.is-off")).toHaveCount(1);
  const name = await page.locator('[data-testid="bk-line"][data-value="0"]').getAttribute("aria-label");
  expect.soft(name ?? "", "line 0 accessible name carries its 'check again' mark").toMatch(/check again|not right|wrong/i);
});

// ---------------------------------------------------------------- reduced motion

test("QA reduced motion: no looping or nudging animation on the board, the worked model or the background", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one project");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const ex = await startAt(page, 4, "cmp");
  await miss(page, ex, 1);
  await answering(page);
  await miss(page, ex, 2);
  await expect(page.locator(".bk-opt.is-model")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  const anims = await page.evaluate(() => {
    const out: string[] = [];
    for (const e of Array.from(document.querySelectorAll<Element>('[data-testid="game-screen"] *'))) {
      const cs = getComputedStyle(e);
      if (cs.animationName !== "none" && cs.animationPlayState === "running" && cs.animationDuration !== "0s" && cs.animationIterationCount === "infinite") out.push(`${e.tagName.toLowerCase()}.${String(e.getAttribute("class") ?? "").split(" ")[0]}: ${cs.animationName}`);
    }
    return out;
  });
  await page.screenshot({ path: `${REVIEW}/reduced-cmp-model.png` });
  writeFileSync(`${REVIEW}/reduced.json`, JSON.stringify(anims, null, 1));
  expect(anims).toEqual([]);
});

// ---------------------------------------------------------------- contrast scan (approximate; flagged items reviewed by hand)

test("QA contrast scan of board text (writes contrast.json)", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "one project");
  const found: Record<string, string[]> = {};
  for (const c of [{ level: 1, kind: "build" as Kind }, { level: 3, kind: "make" as Kind }, { level: 5, kind: "equiv" as Kind }, { level: 6, kind: "pw" as Kind }, { level: 6, kind: "order" as Kind }]) {
    await startAt(page, c.level, c.kind);
    found[c.kind] = await page.evaluate(() => {
      const lum = (rgb: number[]) => { const [r, g, b] = rgb.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }) as [number, number, number]; return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const parse = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
      const bgOf = (e: Element | null): number[] | null => {
        for (let a = e; a; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (cs.backgroundImage !== "none" && !a.classList.contains("bk-sheet")) return null; // gradient: unknown
          const c = parse(cs.backgroundColor);
          if (c.length >= 3 && (c[3] ?? 1) > 0.6) return c.slice(0, 3);
        }
        return [255, 255, 255];
      };
      const out: string[] = [];
      for (const e of Array.from(document.querySelectorAll<HTMLElement>(".bk-stage *"))) {
        const text = Array.from(e.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent ?? "").join("").trim();
        if (!text || e.closest("svg")) continue;
        const cs = getComputedStyle(e);
        if (cs.visibility === "hidden" || e.getBoundingClientRect().width === 0) continue;
        if (e.closest('[aria-disabled="true"]')) continue;
        const fg = parse(cs.color), bg = bgOf(e);
        if (!bg) continue;
        let opacity = 1;
        for (let a: Element | null = e; a; a = a.parentElement) opacity *= Number(getComputedStyle(a).opacity);
        const f = fg.slice(0, 3).map((v, i) => v * opacity * (fg[3] ?? 1) + bg[i]! * (1 - opacity * (fg[3] ?? 1)));
        const L1 = lum(f), L2 = lum(bg);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const px = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
        const need = px >= 24 || (px >= 18.66 && bold) ? 3 : 4.5;
        if (ratio < need || px < 14) out.push(`${e.className || e.tagName} "${text.slice(0, 24)}": ${ratio.toFixed(2)}:1 at ${px}px`);
      }
      return out;
    });
  }
  writeFileSync(`${REVIEW}/contrast.json`, JSON.stringify(found, null, 1));
});
