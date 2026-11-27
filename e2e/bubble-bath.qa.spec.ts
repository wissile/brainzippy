import { mkdirSync, writeFileSync } from "node:fs";
import { type Page, expect, test } from "@playwright/test";
import { buildRound } from "../src/engine/round";
import type { Exercise } from "../src/engine/types";
import { bubbleBath } from "../src/games/bubble-bath/definition";
import { BAND, modeOf, type Mode } from "../src/games/bubble-bath/generator";
import { collectErrors, press, reviewDir, screen } from "./helpers";

/**
 * Independent QA probe for Gloop's Bubble Bath (ages 3–4). Synthetic state only.
 *  - five viewports × every inner game × start / first-miss helper / after helper / worked model: every control (board,
 *    tray AND top bar) fully on screen and uncovered at five points (centre + four inset corners), no page scroll;
 *  - keyboard-only completion with real Tab presses (not element.focus()), visible focus on every stop;
 *  - Quick Look under reduced motion: cover / Peek still work, never timed out, no answer leak while covered;
 *  - hint wording vs. tool state; captions mirror speech while muted; no console errors.
 */
const REVIEW = reviewDir("bubble-bath-qa");
mkdirSync(REVIEW, { recursive: true });
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "863x360", width: 863, height: 360 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];
const PROFILE = { monster: { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" }, monsterName: "Kiki", kidName: "Testkid", step: "done", parentSignup: "skipped" };
const SEED = 4711;
const sel = (testid: string, v: string) => `[data-testid="${testid}"][data-value="${v}"]`;
const board = (page: Page) => page.getByTestId("gb-board");
const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
const helperGone = (page: Page) => page.getByTestId("helper").waitFor({ state: "detached", timeout: 30_000 }).catch(() => undefined);
async function ready(page: Page) {
  await answering(page);
  await helperGone(page);
  await answering(page);
}
const three = (e: Exercise) => e.answer.kind !== "choice" || e.answer.options.length >= 3;

async function startAt(page: Page, level: number, mode: Mode, pick: (e: Exercise) => boolean = () => true) {
  const round = buildRound(bubbleBath, { level, seed: SEED });
  const ex = round.exercises.find((e) => e.difficulty === level + 1 && modeOf(e) === mode && !e.tutorial && pick(e));
  if (!ex) throw new Error(`no ${mode} item at level ${level}`);
  const results = ex.closer
    ? round.exercises.filter((e) => e.difficulty === level + 1 && !e.closer).slice(0, BAND - 1).map((e) => ({ exerciseId: e.id, skillId: e.skillId, difficulty: e.difficulty, attempts: 1, firstTry: true, hintsShown: 0 }))
    : [];
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(({ lv, profile, round }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("bz.v1", JSON.stringify({ muted: true, ageBand: "ages-3-5", profile, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "bubble-bath": lv } }, round }));
    sessionStorage.setItem("seeded", "1");
  }, { lv: level, profile: PROFILE, round: { v: 1, gameId: "bubble-bath", progression: { difficulty: level + 1, streak: 0, played: results.map((r) => r.exerciseId), results }, currentId: ex.id, savedAt: Date.now(), level, seed: SEED } });
  await page.goto("/play/bubble-bath");
  await press(page, '[data-testid="start-game"]');
  await ready(page);
  return ex;
}

async function missOnce(page: Page, ex: Exercise, n: 1 | 2) {
  const a = ex.answer;
  switch (modeOf(ex)) {
    case "look":
      if (a.kind !== "number") throw new Error("number");
      await expect(board(page)).toHaveAttribute("data-seen", "true", { timeout: 20_000 });
      return press(page, sel("choice", String(a.choices!.filter((c) => c !== a.value)[n - 1])));
    case "sort":
      if (a.kind !== "match") throw new Error("match");
      for (const it of a.items) {
        if ((await page.locator(sel("toy", it.id)).count()) === 0) continue;
        await press(page, sel("toy", it.id));
        await press(page, sel("hole", a.targets.find((t) => t.id !== a.pairs[it.id])!.id));
      }
      return press(page, '[data-testid="done"]');
    case "size":
      if (a.kind !== "sequence") throw new Error("sequence");
      for (const id of [...a.order].reverse()) if ((await page.locator(sel("piece", id)).count()) > 0) await press(page, sel("piece", id));
      return press(page, '[data-testid="done"]');
    case "parade":
      if (a.kind !== "sequence") throw new Error("sequence");
      for (const id of [...a.order].reverse()) if ((await page.locator(sel("bubble", id)).count()) > 0) await press(page, sel("bubble", id));
      return;
    default:
      if (a.kind !== "choice") throw new Error("choice");
      return press(page, sel("choice", a.options.filter((o) => o.id !== a.correct)[n - 1]!.id));
  }
}

const CONTROLS = ['[data-testid="choice"]', '[data-testid="done"]', '[data-testid="toy"]', '[data-testid="hole"]', '[data-testid="piece"]', '[data-testid="slot"]', '[data-testid="undo"]', '[data-testid="bubble"]', '[data-testid="peek"]', '[data-testid="pair"]', '[data-testid="replay"]', ".game-top button", ".game-top a"];
/** Controls not fully on screen, too small, or covered at any of five points (centre + inset corners). */
async function problems(page: Page): Promise<string[]> {
  return page.evaluate((sels) => {
    const bad: string[] = [];
    const seen = new Set<Element>();
    for (const s of sels)
      for (const e of Array.from(document.querySelectorAll<HTMLElement>(s))) {
        if (seen.has(e)) continue;
        seen.add(e);
        const r = e.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const name = `${e.dataset.testid ?? e.getAttribute("aria-label") ?? s}${e.dataset.value ? `[${e.dataset.value}]` : ""}`;
        const top = !!e.closest(".game-top") || e.dataset.testid === "replay";
        const min = top ? 43.5 : 63.5;
        if (Math.min(r.width, r.height) < min) bad.push(`${name}: ${Math.round(r.width)}x${Math.round(r.height)}px < ${Math.round(min)}`);
        if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) { bad.push(`${name}: off screen ${Math.round(r.left)},${Math.round(r.top)}–${Math.round(r.right)},${Math.round(r.bottom)}`); continue; }
        const pts: [number, number, string][] = [[0.5, 0.5, "centre"], [0.18, 0.18, "TL"], [0.82, 0.18, "TR"], [0.18, 0.82, "BL"], [0.82, 0.82, "BR"]];
        for (const [fx, fy, label] of pts) {
          const hit = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
          if (!hit || !(hit === e || e.contains(hit))) {
            const by = hit ? `${hit.tagName.toLowerCase()}.${String(hit.getAttribute("class") ?? "").split(" ")[0]}${hit.closest("[data-testid]") ? ` in ${(hit.closest("[data-testid]") as HTMLElement).dataset.testid}` : ""}` : "nothing";
            bad.push(`${name}: ${label} covered by ${by}`);
            break;
          }
        }
      }
    if (document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1) bad.push(`page scrolls: ${document.documentElement.scrollWidth}x${document.documentElement.scrollHeight}`);
    return bad;
  }, CONTROLS);
}

const SWEEP: { level: number; mode: Mode; tag: string; pick?: (e: Exercise) => boolean }[] = [
  { level: 1, mode: "sort", tag: "sort-l1" },
  { level: 4, mode: "sort", tag: "sort-l4-tipped" },
  { level: 5, mode: "find", tag: "find-l5", pick: three },
  { level: 4, mode: "look", tag: "look-l4" },
  { level: 4, mode: "compare", tag: "compare-l4-same", pick: (e) => e.answer.kind === "choice" && e.answer.options.some((o) => o.id === "same") },
  { level: 7, mode: "compare", tag: "compare-l7-trap", pick: (e) => (e.params?.spread ?? 0) > 0 },
  { level: 5, mode: "size", tag: "size-l5-4pc" },
  { level: 5, mode: "parade", tag: "parade-l5-5" },
];

for (const vp of VIEWPORTS) {
  test(`QA ${vp.name}: every control fully visible & uncovered (5 points) in start / helper / after-helper / model`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "viewport set explicitly");
    test.setTimeout(900_000);
    const errors = collectErrors(page);
    await page.setViewportSize(vp);
    const log: Record<string, string[]> = {};
    for (const c of SWEEP) {
      const ex = await startAt(page, c.level, c.mode, c.pick ?? (() => true));
      const shot = async (state: string) => {
        log[`${c.tag} ${state}`] = await problems(page);
        await page.screenshot({ path: `${REVIEW}/${vp.name}-${c.tag}-${state}.png` });
      };
      if (c.mode === "look") {
        await expect(board(page)).toHaveAttribute("data-seen", "true", { timeout: 20_000 });
        await expect(board(page)).toHaveAttribute("data-visible", "false", { timeout: 10_000 });
      }
      await page.waitForTimeout(400);
      await shot("1start");
      await missOnce(page, ex, 1);
      const helper = await page.getByTestId("helper").waitFor({ state: "visible", timeout: 20_000 }).then(() => true, () => false);
      if (!helper) log[`${c.tag} helper`] = ["helper never appeared after the first miss"];
      await page.waitForTimeout(700);
      await shot("2helper");
      await ready(page);
      await page.waitForTimeout(400);
      await shot("3afterhelper");
      await missOnce(page, ex, 2);
      await answering(page);
      await expect(page.locator(".is-model").first()).toBeVisible({ timeout: 25_000 });
      await page.waitForTimeout(600);
      await shot("4model");
    }
    writeFileSync(`${REVIEW}/problems-${vp.name}.json`, JSON.stringify(log, null, 2));
    for (const [k, v] of Object.entries(log)) expect.soft(v, `${vp.name} ${k}`).toEqual([]);
    expect.soft(errors, "console errors").toEqual([]);
  });
}

/** Press Tab until `selector` has focus; returns the stops passed and whether each showed a visible focus indicator. */
async function tabTo(page: Page, selector: string, trail: string[], noRing: string[], max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate((s) => {
      const a = document.activeElement as HTMLElement | null;
      if (!a || a === document.body) return { hit: false, name: "body", ring: true };
      const cs = getComputedStyle(a);
      const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2) || (cs.boxShadow !== "none" && cs.boxShadow !== "");
      return { hit: a.matches(s), name: `${a.dataset.testid ?? a.tagName.toLowerCase()}${a.dataset.value ? `[${a.dataset.value}]` : ""}${a.getAttribute("aria-disabled") === "true" ? "(disabled)" : ""}`, ring: ring && a.matches(":focus-visible") };
    }, selector);
    trail.push(info.name);
    if (!info.ring && info.name !== "body") noRing.push(info.name);
    if (info.hit) return;
  }
  throw new Error(`Tab never reached ${selector}; trail: ${trail.join(" > ")}`);
}

test("QA keyboard only (real Tab/Enter) completes every inner game, with visible focus on every stop", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "keyboard on desktop");
  test.setTimeout(600_000);
  const errors = collectErrors(page);
  const report: Record<string, { trail: string[]; noRing: string[] }> = {};
  for (const [level, mode] of [[4, "sort"], [5, "find"], [4, "look"], [4, "compare"], [5, "size"], [5, "parade"]] as const) {
    const ex = await startAt(page, level, mode, three);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const trail: string[] = [];
    const noRing: string[] = [];
    const a = ex.answer;
    if (mode === "sort" && a.kind === "match") {
      for (const it of a.items) {
        await tabTo(page, sel("toy", it.id), trail, noRing);
        await page.keyboard.press("Enter");
        await tabTo(page, sel("hole", a.pairs[it.id]!), trail, noRing);
        await page.keyboard.press("Enter");
        await expect(page.locator(sel("posted", it.id))).toHaveCount(1);
      }
      await tabTo(page, '[data-testid="done"]', trail, noRing);
      await page.keyboard.press("Enter");
    } else if (mode === "size" && a.kind === "sequence") {
      for (const [i, id] of a.order.entries()) {
        await tabTo(page, sel("piece", id), trail, noRing);
        await page.keyboard.press("Enter");
        await expect(page.getByTestId("slot").nth(i)).toHaveAttribute("data-value", id);
      }
      await tabTo(page, '[data-testid="done"]', trail, noRing);
      await page.keyboard.press("Enter");
    } else if (mode === "parade" && a.kind === "sequence") {
      for (const id of a.order) {
        await tabTo(page, sel("bubble", id), trail, noRing);
        await page.keyboard.press("Enter");
      }
    } else if (mode === "look" && a.kind === "number") {
      await expect(board(page)).toHaveAttribute("data-seen", "true", { timeout: 20_000 });
      await tabTo(page, sel("choice", String(a.value)), trail, noRing);
      await page.keyboard.press("Enter");
    } else if (a.kind === "choice") {
      await tabTo(page, sel("choice", a.correct), trail, noRing);
      await page.keyboard.press("Enter");
    }
    await expect.poll(async () => ((await screen(page).count()) === 0 ? "gone" : await screen(page).getAttribute("data-exercise").catch(() => null)), { timeout: 45_000 }).not.toBe(ex.id);
    report[mode] = { trail, noRing: [...new Set(noRing)] };
  }
  writeFileSync(`${REVIEW}/keyboard.json`, JSON.stringify(report, null, 2));
  for (const [m, r] of Object.entries(report)) expect.soft(r.noRing, `${m}: focus stops without a visible ring`).toEqual([]);
  expect.soft(errors, "console errors").toEqual([]);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("QA Quick Look: cover and Peek work under reduced motion, never timed out, no answer leak while covered, hint matches tools", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop" && info.project.name !== "phone", "desktop + phone");
    test.setTimeout(240_000);
    const errors = collectErrors(page);
    const ex = await startAt(page, 4, "look");
    if (ex.answer.kind !== "number") throw new Error("number");
    const n = ex.answer.value;
    await expect(board(page)).toHaveAttribute("data-seen", "true", { timeout: 20_000 });
    await expect(board(page)).toHaveAttribute("data-visible", "false", { timeout: 10_000 });
    const opacity = () => page.locator(".gb-lb").first().evaluate((e) => Number(getComputedStyle(e).opacity));
    expect(await opacity(), "bubbles hidden while covered").toBe(0);
    await expect(page.getByTestId("foam")).toBeVisible();
    await page.screenshot({ path: `${REVIEW}/rm-${info.project.name}-look-covered.png` });
    // answer leak: what a screen reader can read in the board while the foam covers the bubbles
    const srText = await board(page).evaluate((b) => Array.from(b.querySelectorAll(".sr-only, [aria-label]")).map((e) => (e as HTMLElement).getAttribute("aria-label") ?? e.textContent).join(" | "));
    expect.soft(srText, "screen-reader text while covered must not state the count").not.toMatch(new RegExp(`\\b${n} bubble`));
    // every choice shows a dot picture beside its numeral
    for (const c of ex.answer.choices ?? []) await expect(page.locator(`${sel("choice", String(c))} .numeral`)).toHaveText(String(c));
    expect(await page.locator('[data-testid="choice"] svg').count(), "a dot picture in every number choice").toBe((ex.answer.choices ?? []).length);
    // never timed out: 15 s later, still answerable and Peek still works
    await page.waitForTimeout(15_000);
    await expect(page.locator(sel("choice", String(n)))).not.toHaveAttribute("aria-disabled", "true");
    await expect(page.getByTestId("peek")).not.toHaveAttribute("aria-disabled", "true");
    await press(page, '[data-testid="peek"]');
    await expect(board(page)).toHaveAttribute("data-visible", "true");
    expect(await opacity(), "Peek shows the bubbles under reduced motion").toBe(1);
    await page.screenshot({ path: `${REVIEW}/rm-${info.project.name}-look-peek.png` });
    await expect(board(page)).toHaveAttribute("data-visible", "false", { timeout: 10_000 });
    // first miss: the hint is captioned (muted) and the tool it names is usable
    await press(page, sel("choice", String(ex.answer.choices!.find((c) => c !== n))));
    await page.getByTestId("helper").waitFor({ state: "visible", timeout: 20_000 });
    await expect.poll(() => page.getByTestId("live-caption").innerText(), { timeout: 10_000 }).not.toBe("");
    const hint = await page.getByTestId("live-caption").innerText();
    await page.screenshot({ path: `${REVIEW}/rm-${info.project.name}-look-helper.png` });
    await ready(page);
    const peekDisabled = (await page.getByTestId("peek").getAttribute("aria-disabled")) === "true";
    writeFileSync(`${REVIEW}/rm-${info.project.name}-look.json`, JSON.stringify({ n, srText, hint, peekDisabledAfterMiss: peekDisabled }, null, 2));
    expect.soft(/peek/i.test(hint) && peekDisabled, `hint "${hint}" tells the child to Peek but Peek is disabled`).toBe(false);
    // model under reduced motion: a thick outline, no looping animation on the glowing choice
    await press(page, sel("choice", String(ex.answer.choices!.filter((c) => c !== n)[1])));
    await answering(page);
    const model = page.locator(".is-model").first();
    await expect(model).toBeVisible({ timeout: 25_000 });
    const anim = await model.evaluate((e) => { const cs = getComputedStyle(e); return { it: cs.animationIterationCount, outline: cs.outlineStyle }; });
    expect.soft(anim.it, "model does not loop under reduced motion").not.toBe("infinite");
    await page.screenshot({ path: `${REVIEW}/rm-${info.project.name}-look-model.png` });
    expect.soft(errors, "console errors").toEqual([]);
  });

  test("QA reduced motion: no infinite animations anywhere on the board in each inner game", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "desktop");
    test.setTimeout(300_000);
    const loops: Record<string, string[]> = {};
    for (const [level, mode] of [[4, "sort"], [5, "find"], [4, "compare"], [5, "size"], [5, "parade"]] as const) {
      const ex = await startAt(page, level, mode, three);
      await missOnce(page, ex, 1);
      await ready(page);
      loops[mode] = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement | SVGElement>(".game-top ~ * *, .play-screen *"))
          .filter((e) => { const cs = getComputedStyle(e); return cs.animationName !== "none" && cs.animationIterationCount === "infinite" && parseFloat(cs.animationDuration) > 0.01; })
          .map((e) => `${e.tagName.toLowerCase()}.${String((e as HTMLElement).className?.toString()).split(" ").slice(0, 2).join(".")}`));
    }
    writeFileSync(`${REVIEW}/rm-loops.json`, JSON.stringify(loops, null, 2));
    for (const [m, l] of Object.entries(loops)) expect.soft([...new Set(l)], `${m}: looping animations under reduced motion`).toEqual([]);
  });
});
