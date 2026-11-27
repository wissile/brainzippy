import { mkdirSync } from "node:fs";
import { type Page, expect, test } from "@playwright/test";
import { buildRound } from "../src/engine/round";
import type { Exercise } from "../src/engine/types";
import { bubbleBath } from "../src/games/bubble-bath/definition";
import { BAND, modeOf, type Mode } from "../src/games/bubble-bath/generator";
import { collectErrors, press, reviewDir, screen } from "./helpers";

/**
 * Gloop's Bubble Bath: five inner games in one bathtub — Shape Splash (sort toys into holes; find a shape on the wall),
 * Quick Look (how many bubbles at a glance), More or Fewer (compare two tubs of ducks by pairing), Size Line (smallest →
 * biggest) and the Bubble Parade finale (pop 1…n in order). Whole rounds by drag, tap and keyboard; first miss →
 * Bobbo's diagnosed hint, second miss → the worked model; reward and level-up; every control on screen and uncovered
 * at five viewports in every inner game and state. Synthetic state only.
 */
const REVIEW = reviewDir("bubble-bath");
mkdirSync(REVIEW, { recursive: true });
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "863x360", width: 863, height: 360 }, // a phone on its side (Pixel 7 landscape)
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];
const PROFILE = { monster: { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" }, monsterName: "Kiki", kidName: "Testkid", step: "done", parentSignup: "skipped" };
type Way = "tap" | "drag" | "keyboard";
const SEED = 777;

const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
const board = (page: Page) => page.getByTestId("gb-board");
const sel = (testid: string, v: string) => `[data-testid="${testid}"][data-value="${v}"]`;
const isTouch = (page: Page) => page.evaluate(() => matchMedia("(pointer: coarse)").matches);

async function setState(page: Page, level: number, round: unknown = null) {
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(({ lv, profile, round }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("bz.v1", JSON.stringify({ muted: true, ageBand: "ages-3-5", profile, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "bubble-bath": lv } }, round }));
    sessionStorage.setItem("seeded", "1");
  }, { lv: level, profile: PROFILE, round });
}
/** Start a round at `level` whose current exercise is the band's first item of `mode` (resume snapshot, fixed seed). */
async function startAt(page: Page, level: number, mode: Mode, pick: (e: Exercise) => boolean = () => true, seed = SEED) {
  const round = buildRound(bubbleBath, { level, seed });
  const ex = round.exercises.find((e) => e.difficulty === level + 1 && modeOf(e) === mode && !e.tutorial && pick(e));
  if (!ex) throw new Error(`no ${mode} item at level ${level} (seed ${seed})`);
  // the parade is a closer: it is served on the last slot, so resume it with seven results already in
  const results = ex.closer
    ? round.exercises.filter((e) => e.difficulty === level + 1 && !e.closer).slice(0, BAND - 1).map((e) => ({ exerciseId: e.id, skillId: e.skillId, difficulty: e.difficulty, attempts: 1, firstTry: true, hintsShown: 0 }))
    : [];
  await setState(page, level, { v: 1, gameId: "bubble-bath", progression: { difficulty: level + 1, streak: 0, played: results.map((r) => r.exerciseId), results }, currentId: ex.id, savedAt: Date.now(), level, seed });
  await page.goto("/play/bubble-bath");
  await press(page, '[data-testid="start-game"]');
  await ready(page);
  return ex;
}
async function helperGone(page: Page) {
  await page.getByTestId("helper").waitFor({ state: "detached", timeout: 25_000 }).catch(() => undefined);
}
async function ready(page: Page) {
  await answering(page);
  await helperGone(page);
  await answering(page);
}
/** The exercise on screen, rebuilt from the saved round (level + seed) the way the app builds it. */
async function current(page: Page): Promise<Exercise> {
  await answering(page);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  const r = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!).round as { level: number; seed: number });
  const ex = buildRound(bubbleBath, { level: r.level, seed: r.seed }).exercises.find((e) => e.id === id);
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
async function dragTo(page: Page, from: string, to: string) {
  const src = page.locator(from).first();
  await expect(src).not.toHaveAttribute("aria-disabled", "true");
  const a = (await src.boundingBox())!;
  const b = (await page.locator(to).first().boundingBox())!;
  const [ax, ay, bx, by] = [a.x + a.width / 2, a.y + a.height / 2, b.x + b.width / 2, b.y + b.height / 2];
  await page.mouse.move(ax, ay);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(ax + ((bx - ax) * i) / 12, ay + ((by - ay) * i) / 12);
  await page.mouse.up();
}
/** Quick Look: the choices wake up once the bubbles have been shown. */
async function lookSeen(page: Page) {
  await expect(board(page)).toHaveAttribute("data-seen", "true", { timeout: 20_000 });
}

/** Solve the exercise on screen the given way (drag where there is something to carry; tap on touch screens). */
async function solve(page: Page, way: Way, ex: Exercise) {
  if (way === "drag" && (await isTouch(page))) way = "tap";
  const a = ex.answer;
  switch (modeOf(ex)) {
    case "sort": {
      if (a.kind !== "match") throw new Error("match");
      for (const it of a.items) {
        const hole = sel("hole", a.pairs[it.id]!);
        if (way === "drag") await dragTo(page, sel("toy", it.id), hole);
        else if (way === "tap") {
          await press(page, sel("toy", it.id));
          await expect(page.locator(sel("toy", it.id))).toHaveAttribute("aria-pressed", "true");
          await press(page, hole);
        } else {
          await activate(page, sel("toy", it.id), "keyboard");
          await expect(page.getByTestId("hole").first()).toBeFocused();
          await activate(page, hole, "keyboard");
        }
        await expect(page.locator(sel("posted", it.id))).toBeVisible();
      }
      return activate(page, '[data-testid="done"]', way === "drag" ? "tap" : way);
    }
    case "size": {
      if (a.kind !== "sequence") throw new Error("sequence");
      for (const [i, id] of a.order.entries()) {
        if (way === "drag") await dragTo(page, sel("piece", id), `[data-testid="slot"] >> nth=${i}`);
        else await activate(page, sel("piece", id), way);
        await expect(page.getByTestId("slot").nth(i)).toHaveAttribute("data-value", id);
      }
      return activate(page, '[data-testid="done"]', way === "drag" ? "tap" : way);
    }
    case "parade": {
      if (a.kind !== "sequence") throw new Error("sequence");
      for (const [i, id] of a.order.entries()) {
        await activate(page, sel("bubble", id), way === "drag" ? "tap" : way);
        await expect(page.getByTestId("strip-slot").nth(i)).toHaveAttribute("data-value", String(i + 1));
      }
      return;
    }
    case "look":
      if (a.kind !== "number") throw new Error("number");
      await lookSeen(page);
      return activate(page, sel("choice", String(a.value)), way === "drag" ? "tap" : way);
    default:
      if (a.kind !== "choice") throw new Error("choice");
      return activate(page, sel("choice", a.correct), way === "drag" ? "tap" : way);
  }
}

/** A typical wrong answer for the exercise on screen (first or second miss). Never blocked: it reaches the engine. */
async function missOnce(page: Page, ex: Exercise, n: 1 | 2) {
  const a = ex.answer;
  switch (modeOf(ex)) {
    case "look":
      if (a.kind !== "number") throw new Error("number");
      await lookSeen(page);
      return press(page, sel("choice", String(a.choices!.filter((c) => c !== a.value)[n - 1])));
    case "sort": {
      if (a.kind !== "match") throw new Error("match");
      for (const it of a.items) {
        if ((await page.locator(sel("toy", it.id)).count()) === 0) continue; // a right toy kept from the first miss
        await press(page, sel("toy", it.id));
        await press(page, sel("hole", a.targets.find((t) => t.id !== a.pairs[it.id])!.id));
      }
      return press(page, '[data-testid="done"]');
    }
    case "size": {
      if (a.kind !== "sequence") throw new Error("sequence");
      // biggest first (the reverse-order mistake); on the second miss the free pieces again go biggest first
      for (const id of [...a.order].reverse()) if ((await page.locator(sel("piece", id)).count()) > 0) await press(page, sel("piece", id));
      return press(page, '[data-testid="done"]');
    }
    case "parade": {
      if (a.kind !== "sequence") throw new Error("sequence");
      for (const id of [...a.order].reverse()) if ((await page.locator(sel("bubble", id)).count()) > 0) await press(page, sel("bubble", id));
      return;
    }
    default:
      if (a.kind !== "choice") throw new Error("choice");
      return press(page, sel("choice", a.options.filter((o) => o.id !== a.correct)[n - 1]!.id));
  }
}

const CONTROLS = ['[data-testid="choice"]', '[data-testid="done"]', '[data-testid="toy"]', '[data-testid="hole"]', '[data-testid="piece"]', '[data-testid="slot"]', '[data-testid="undo"]', '[data-testid="bubble"]', '[data-testid="peek"]', '[data-testid="pair"]', '[data-testid="replay"]'];
/**
 * Every rendered control is fully on screen and pressable where it is drawn: inside the viewport (x and y), at least
 * 64 px (pre-readers), not clipped by a scrolling/overflow-hidden ancestor, and elementFromPoint at its centre is
 * the control or inside it (not under the mascot, the helper or anything else).
 */
async function unreachableControls(page: Page): Promise<string[]> {
  return page.evaluate((sels) => {
    const bad: string[] = [];
    for (const s of sels)
      for (const e of Array.from(document.querySelectorAll<HTMLElement>(s))) {
        const r = e.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        const name = `${s}${e.dataset.value ? `[${e.dataset.value}]` : ""}`;
        const min = s.includes("replay") ? 43.5 : 63.5;
        if (Math.min(r.width, r.height) < min) bad.push(`${name}: ${Math.round(r.width)}×${Math.round(r.height)} px`);
        if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) { bad.push(`${name}: off screen (x ${Math.round(r.left)}–${Math.round(r.right)} of ${innerWidth}, y ${Math.round(r.top)}–${Math.round(r.bottom)} of ${innerHeight})`); continue; }
        let clip: string | null = null;
        for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
          const cs = getComputedStyle(p);
          if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
          const pr = p.getBoundingClientRect();
          if (r.top < pr.top - 1 || r.bottom > pr.bottom + 1 || r.left < pr.left - 1 || r.right > pr.right + 1) { clip = `${p.tagName.toLowerCase()}.${String(p.className).split(" ")[0]}`; break; }
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

async function playRound(page: Page, ways: Way[], shotPrefix?: string) {
  const modes: Mode[] = [];
  for (let i = 0; i < BAND; i++) {
    if ((await screen(page).count()) === 0) break;
    await ready(page);
    const ex = await current(page);
    modes.push(modeOf(ex));
    if (shotPrefix) await page.screenshot({ path: `${REVIEW}/${shotPrefix}-${i}-${modeOf(ex)}.png` });
    await solve(page, ways[i % ways.length]!, ex);
    await nextExercise(page, ex.id);
  }
  return modes;
}

test("a whole round from the tutorial by drag (tap on touch screens): hand, finale last, outro, sticker and level up", async ({ page }, info) => {
  test.setTimeout(300_000);
  const errors = collectErrors(page);
  const desk = info.project.name === "desktop";
  await setState(page, 0);
  await page.goto("/play/bubble-bath");
  await press(page, '[data-testid="story-begin"]');
  if (desk) {
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${REVIEW}/story-1.png` });
  }
  await press(page, '[data-testid="story-skip"]');
  await ready(page);
  // tutorial: two toys (a circle and a square), two holes, the pointing hand on a toy; once it is picked up, a hand on its hole
  const first = await current(page);
  expect(first.tutorial).toBe(true);
  await expect(page.getByTestId("toy")).toHaveCount(2);
  await expect(page.getByTestId("hole")).toHaveCount(2);
  await expect(page.getByTestId("hand-pointer")).toBeVisible({ timeout: 25_000 });
  if (desk) await page.screenshot({ path: `${REVIEW}/tutorial-hand.png` });
  await noOverflow(page, "tutorial");
  await press(page, '[data-testid="toy"] >> nth=0');
  await expect(page.getByTestId("tutorial-hand")).toBeVisible();
  await press(page, '[data-testid="toy"] >> nth=0'); // put it down again; the round below plays it by drag
  const modes = await playRound(page, ["drag", "drag", "tap", "drag"], desk ? "round" : undefined);
  expect(modes[0]).toBe("sort");
  expect(modes.at(-1)).toBe("parade");
  expect(modes.slice(0, -1)).not.toContain("parade");
  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  if (desk) {
    for (let b = 0; b < 3; b++) {
      await page.locator(`[data-testid="outro"][data-beat="${b}"]`).waitFor({ timeout: 30_000 }).catch(() => undefined);
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${REVIEW}/outro-${b}.png` });
    }
  }
  await press(page, '[data-testid="outro-skip"]').catch(() => undefined);
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 40_000 });
  await expect(page.getByRole("heading", { name: "Bubble Buddy" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("bubble-buddy");
  expect(stored.progress.levels["bubble-bath"]).toBe(1);
  if (desk) {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${REVIEW}/reward-${vp.name}.png` });
    }
  }
  expect(errors).toEqual([]);
});

test("a whole round by tap and tap-tap: every inner game (level 4 start)", async ({ page }) => {
  test.setTimeout(300_000);
  const errors = collectErrors(page);
  await setState(page, 3);
  await page.goto("/play/bubble-bath");
  await press(page, '[data-testid="story-begin"]');
  await press(page, '[data-testid="story-skip"]');
  const modes = await playRound(page, ["tap"]);
  expect(modes[0]).toBe("size");
  expect(modes.at(-1)).toBe("parade");
  expect(new Set(modes).size).toBeGreaterThanOrEqual(5);
  expect(errors).toEqual([]);
});

test("a whole round by keyboard only (level 6 start: tipped shapes, 4 sponges, clumps)", async ({ page }) => {
  test.setTimeout(300_000);
  const errors = collectErrors(page);
  await setState(page, 5);
  await page.goto("/play/bubble-bath");
  await press(page, '[data-testid="story-begin"]');
  await press(page, '[data-testid="story-skip"]');
  const modes = await playRound(page, ["keyboard"]);
  expect(modes.at(-1)).toBe("parade");
  expect(new Set(modes).size).toBeGreaterThanOrEqual(4);
  expect(errors).toEqual([]);
});

test("first miss brings Bobbo's diagnosed hint, second miss models the answer, in every inner game", async ({ page }, info) => {
  test.setTimeout(420_000);
  const errors = collectErrors(page);
  const desk = info.project.name === "desktop";
  const three = (e: Exercise) => e.answer.kind !== "choice" || e.answer.options.length >= 3;
  for (const [level, mode] of [[2, "look"], [4, "compare"], [3, "size"], [4, "sort"], [5, "find"], [3, "parade"]] as const) {
    const ex = await startAt(page, level, mode, three);
    await missOnce(page, ex, 1);
    await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
    // the diagnosed hint line is shown (in the helper's bubble or in the prompt pill on small screens)
    await expect(page.locator('[data-testid="speech-bubble"], .helper-bubble').first()).toBeVisible();
    if (desk) await page.screenshot({ path: `${REVIEW}/miss1-${mode}.png` });
    await ready(page);
    // the board's first-miss help
    if (mode === "look") await expect(page.getByTestId("group-ring").first()).toBeVisible();
    if (mode === "compare") await expect(page.getByTestId("pair-lines")).toBeVisible();
    if (mode === "find" && ex.answer.kind === "choice") {
      const correct = ex.answer.correct;
      await expect(page.locator(sel("choice", ex.answer.options.find((o) => o.id !== correct)!.id))).toHaveClass(/is-out/);
    }
    if (mode === "parade") await expect(page.locator(".gb-strip-slot.is-next")).toBeVisible();
    await missOnce(page, ex, 2);
    await answering(page);
    await expect(page.locator(".is-model:visible").first()).toBeVisible({ timeout: 20_000 });
    if (desk) await page.screenshot({ path: `${REVIEW}/model-${mode}.png` });
    // errorless finish: press what glows
    if (mode === "sort" || mode === "size") await press(page, '[data-testid="done"]');
    else if (mode === "parade") {
      if (ex.answer.kind !== "sequence") throw new Error("sequence");
      for (const id of ex.answer.order) await press(page, sel("bubble", id));
    } else await press(page, ".is-model");
    await nextExercise(page, ex.id);
  }
  expect(errors).toEqual([]);
});

test("inner-game tools: Peek shows the bubbles again, Pair up draws partners, Undo takes a piece back; long-line trap", async ({ page }) => {
  test.setTimeout(240_000);
  // Quick Look: the bubbles hide under the foam, Peek brings them back
  await startAt(page, 1, "look");
  await expect(board(page)).toHaveAttribute("data-visible", "false", { timeout: 20_000 });
  await expect(page.getByTestId("foam")).toBeVisible();
  await press(page, '[data-testid="peek"]');
  await expect(board(page)).toHaveAttribute("data-visible", "true");
  // More or Fewer: Pair up toggles partner lines; at level 7 one row is spread out wider than the other
  const cmp = await startAt(page, 6, "compare", (e) => (e.params?.spread ?? 0) > 0);
  await expect(page.getByTestId("pair-lines")).toHaveCount(0);
  await press(page, '[data-testid="pair"]');
  await expect(page.getByTestId("pair-lines")).toBeVisible();
  await expect(page.getByTestId("pair")).toHaveAttribute("aria-pressed", "true");
  await solve(page, "tap", cmp);
  await nextExercise(page, cmp.id);
  // Size Line: tap a piece, Undo returns it
  const sz = await startAt(page, 5, "size");
  if (sz.answer.kind !== "sequence") throw new Error("sequence");
  await press(page, sel("piece", sz.answer.pieces[0]!.id));
  await expect(page.getByTestId("slot").first()).toHaveAttribute("data-value", sz.answer.pieces[0]!.id);
  await press(page, '[data-testid="undo"]');
  await expect(page.getByTestId("slot").first()).toHaveAttribute("data-value", "");
  await expect(page.getByTestId("piece")).toHaveCount(4);
});

// Every inner game at every viewport: on screen and pressable at the start, while Bobbo explains a first miss, and with
// the worked model after a second miss.
const SWEEP: { level: number; mode: Mode }[] = [
  { level: 0, mode: "sort" }, { level: 5, mode: "sort" }, { level: 5, mode: "find" }, { level: 4, mode: "look" }, { level: 6, mode: "compare" },
  { level: 6, mode: "size" }, { level: 5, mode: "parade" },
];
for (const vp of VIEWPORTS) {
  test(`${vp.name}: every control stays on screen and uncovered, before a miss, with the helper and with the model`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "viewport set explicitly");
    test.setTimeout(600_000);
    await page.setViewportSize(vp);
    const three = (e: Exercise) => e.answer.kind !== "choice" || e.answer.options.length >= 3;
    for (const c of SWEEP) {
      const tag = `${vp.name} L${c.level} ${c.mode}`;
      const ex = await startAt(page, c.level, c.mode, three);
      if (c.mode === "look") await lookSeen(page);
      await page.waitForTimeout(500);
      await noOverflow(page, `${tag} start`);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-l${c.level}-${c.mode}.png` });
      await missOnce(page, ex, 1);
      await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(700);
      expect.soft(await unreachableControls(page), `${tag} helper`).toEqual([]);
      await ready(page);
      await missOnce(page, ex, 2);
      await answering(page);
      await page.waitForTimeout(600);
      expect.soft(await unreachableControls(page), `${tag} model`).toEqual([]);
      if (c.mode === "compare" || c.mode === "parade") await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-model-${c.mode}.png` });
    }
  });
}
