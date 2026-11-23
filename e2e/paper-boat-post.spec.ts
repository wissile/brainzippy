import { type Page, expect, test } from "@playwright/test";
import { COMPOUNDS, NOTES_BUILD, NOTES_READ, PLURALS, SORTS, sceneId } from "../src/games/paper-boat-post/content";
import { graphemes } from "../src/games/paper-boat-post/words";
import { collectErrors, press, reviewDir, screen, seed, whenReady } from "./helpers";

/**
 * Paper Boat Post: story (cinematic beat + Sarah/Zuzu DialogueScene) → rounds by tap, drag and keyboard → miss ladder
 * (Zuzu's hint + grey-out, then the modelled answer) → outro conversation → River Reader sticker + level up; every
 * level playable; layout at the four viewports (screenshots in reviewDir("paper-boat-post")).
 * The solver reads what a child sees (the sail, the prompt, the cards) plus the bank for spelling; never the answer key.
 */
type How = "tap" | "drag" | "keyboard";
const REVIEW = reviewDir("paper-boat-post");
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];
const progressAt = (level: number) => ({ v: 1, stickers: [], roundsCompleted: 0, skills: {}, levels: { "paper-boat-post": level } });
const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
const helperGone = (page: Page) => page.getByTestId("helper").waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
const exId = async (page: Page) => (await screen(page).getAttribute("data-exercise"))!;

async function start(page: Page, level?: number, ageBand = "ages-6-8") {
  await seed(page, level === undefined ? { muted: true, ageBand } : { muted: true, ageBand, progress: progressAt(level) });
  await page.goto("/play/paper-boat-post");
  await skipStory(page);
}
async function skipStory(page: Page) {
  const begin = page.getByTestId("story-begin");
  const skip = page.locator('[data-testid="story-skip"], [data-testid="start-game"]').first();
  await begin.or(skip).first().waitFor({ state: "visible", timeout: 20_000 });
  if (await begin.isVisible()) await begin.click({ force: true });
  await skip.waitFor({ state: "visible", timeout: 20_000 });
  await skip.click({ force: true });
}

async function dragTo(page: Page, from: string, to: string) {
  const src = page.locator(from).first();
  await whenReady(src);
  const a = (await src.boundingBox())!;
  const b = (await page.locator(to).first().boundingBox())!;
  const [sx, sy, tx, ty] = [a.x + a.width / 2, a.y + a.height / 2, b.x + b.width / 2, b.y + b.height / 2];
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(sx + ((tx - sx) * k) / 12, sy + ((ty - sy) * k) / 12);
  await page.mouse.up();
}
async function key(page: Page, selector: string, k = "Enter") {
  const loc = page.locator(selector).first();
  await whenReady(loc);
  await loc.focus();
  await page.keyboard.press(k);
}
const choice = (v: string) => `[data-testid="choice"][data-value="${v}"]`;

/** What the right answer is, worked out from the screen. */
async function readBoard(page: Page) {
  await answering(page);
  const id = await exId(page);
  const mode = (await page.getByTestId("pb-board").getAttribute("data-mode"))!;
  const parts = id.replace(/-(r\d-)?l\dn\d$|-tutorial$/, "").split("-");
  if (mode === "read") return { id, mode, value: (await page.locator(".pb-letters").first().innerText()).replace(/\s/g, "") };
  if (mode === "plural") {
    const w = (await page.locator(".pb-letters").first().innerText()).replace(/\s/g, "");
    return { id, mode, value: `${PLURALS[w]![0]}*3` };
  }
  if (mode === "noteRead") return { id, mode, value: sceneId(NOTES_READ.find((n) => n.id === parts[2])!.scene) };
  if (mode === "swap") {
    const to = (await page.getByTestId("prompt").innerText()).match(/make (\w+)\?/)![1]!;
    return { id, mode, value: to[0]! };
  }
  if (mode === "tag") return { id, mode, value: parts[2]! };
  if (mode === "build") return { id, mode, texts: [...graphemes(parts[2]!)] };
  if (mode === "compound") return { id, mode, texts: COMPOUNDS[parts[2]!]!.slice(0, 2) };
  if (mode === "noteBuild") return { id, mode, texts: [...NOTES_BUILD.find((n) => n.id === parts[2])!.cards] };
  // sort: each card to the dock whose spelling it uses
  const words = await page.locator('[data-testid="choice"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-value")!));
  const s = SORTS.find((x) => words.every((w) => x.aWords.includes(w) || x.bWords.includes(w)))!;
  return { id, mode, pairs: words.map((w) => [w, s.aWords.includes(w) ? s.a : s.b] as const) };
}
type Board = Awaited<ReturnType<typeof readBoard>>;

/** The ids of the tiles that spell `texts`, in order (identical tiles are interchangeable). */
async function tileIds(page: Page, texts: readonly string[]) {
  const tiles = await page.locator('.pb-tiles [data-testid="choice"]').evaluateAll((els) => els.map((e) => ({ id: e.getAttribute("data-value")!, text: e.getAttribute("data-text")! })));
  const used = new Set<string>();
  return texts.map((t) => {
    const hit = tiles.find((x) => x.text === t && !used.has(x.id))!;
    used.add(hit.id);
    return hit.id;
  });
}

async function give(page: Page, b: Board, how: How) {
  if ("value" in b && b.value) {
    const target = choice(b.value);
    if (how === "keyboard") return key(page, target);
    if (how === "drag" && b.mode === "read") return dragTo(page, '[data-testid="boat"]', target);
    if (how === "drag" && b.mode === "plural") return dragTo(page, '[data-testid="boat"]', target);
    if (how === "drag" && (b.mode === "swap" || b.mode === "tag")) return dragTo(page, target, '[data-testid="gap"]');
    return press(page, target);
  }
  if ("texts" in b && b.texts) {
    const ids = await tileIds(page, b.texts);
    for (let i = 0; i < ids.length; i++) {
      if (how === "keyboard") await key(page, choice(ids[i]!));
      else if (how === "drag") await dragTo(page, choice(ids[i]!), `[data-testid="slot"][data-slot="${i}"]`);
      else await press(page, choice(ids[i]!));
      await expect(page.locator(`[data-testid="slot"][data-slot="${i}"]`)).toHaveAttribute("data-filled", "true");
    }
    if (how === "keyboard") {
      await expect(page.getByTestId("done")).toBeFocused();
      await page.keyboard.press("Enter");
    } else await press(page, '[data-testid="done"]');
    return;
  }
  if ("pairs" in b && b.pairs) {
    for (const [w, bin] of b.pairs) {
      if (how === "keyboard") {
        await key(page, choice(w));
        await expect(page.locator('[data-testid="dock"]').first()).toBeFocused();
        await key(page, `[data-testid="dock"][data-value="${bin}"]`);
      } else if (how === "drag") await dragTo(page, choice(w), `[data-testid="dock"][data-value="${bin}"]`);
      else {
        await press(page, choice(w));
        await press(page, `[data-testid="dock"][data-value="${bin}"]`);
      }
      await expect(page.locator(`[data-testid="docked"][data-value="${w}"]`)).toBeVisible();
    }
    if (how === "keyboard") await key(page, '[data-testid="done"]');
    else await press(page, '[data-testid="done"]');
  }
}

async function nextExercise(page: Page, prev: string) {
  await expect
    .poll(async () => ((await screen(page).count()) === 0 ? "round-over" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 40_000 })
    .not.toBe(prev);
}
async function solve(page: Page, how: How) {
  const b = await readBoard(page);
  await give(page, b, how);
  await expect(screen(page)).toHaveAttribute("data-phase", /feedback|solved/, { timeout: 15_000 });
  await nextExercise(page, b.id);
  return b;
}
async function playRest(page: Page, how: How, from = 0) {
  const modes: string[] = [];
  for (let i = from; i < 8; i++) {
    if (i === 0) await helperGone(page);
    modes.push((await solve(page, how)).mode);
  }
  return modes;
}
async function finish(page: Page) {
  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("dialogue-scene").or(page.locator(".pb-story-boat").first())).toBeVisible();
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "River Reader" })).toBeVisible();
}
const touchy = (page: Page) => page.evaluate(() => matchMedia("(pointer: coarse)").matches);

test("story: cinematic beat, then Sarah and Zuzu talk (first visit: Hoot hands over); Skip skips it all", async ({ page }) => {
  const errors = collectErrors(page);
  await seed(page, { muted: true, ageBand: "ages-6-8" });
  await page.goto("/play/paper-boat-post");
  const begin = page.getByTestId("story-begin");
  await begin.or(page.getByTestId("story-skip")).first().waitFor({ timeout: 20_000 });
  if (await begin.isVisible()) await begin.click({ force: true });
  await expect(page.getByTestId("story")).toHaveAttribute("data-beat", "0");
  await page.getByTestId("story").click({ force: true }); // tap → next beat: the conversation
  const talk = page.getByTestId("dialogue-scene");
  await expect(talk).toBeVisible();
  await expect(talk.locator('.dlg-actor[data-speaker="hoot"]')).toBeVisible();
  await expect(page.getByTestId("dialogue-caption")).toContainText(/Hoot|Sarah/, { timeout: 15_000 });
  // Next advances one line inside the conversation without leaving the story
  await press(page, '[data-testid="dialogue-next"]');
  await expect(page.getByTestId("story")).toBeVisible();
  await press(page, '[data-testid="story-skip"]');
  await answering(page);
  expect(errors).toEqual([]);
});

test("level 1: tutorial with the pointing hand, first miss shows Zuzu's hint and greys the tile, a round by tap, sticker and level up", async ({ page }, info) => {
  const errors = collectErrors(page);
  await start(page);
  await answering(page);
  await expect(screen(page)).toHaveAttribute("data-exercise", "pb-swap-cat-hat-tutorial");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await helperGone(page);
  await expect(page.getByTestId("hand-pointer")).toBeVisible({ timeout: 15_000 });
  await press(page, choice("m"));
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(choice("m"))).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(choice("m"))).toHaveClass(/is-out/);
  await press(page, choice("h"));
  await nextExercise(page, "pb-swap-cat-hat-tutorial");
  const modes = await playRest(page, "tap", 1);
  expect(modes).toContain("swap"); // two first-try answers step up to level-2 reading within the round (R2)
  await finish(page);
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  await page.screenshot({ path: `test-results/screens/${info.project.name}-pb-reward.png` });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("river-reader");
  expect(stored.progress.levels["paper-boat-post"]).toBe(1);
  expect(errors).toEqual([]);
});

test("level 4: second miss models the answer on the board; a whole round of reading and building by drag (tap-tap on touch)", async ({ page }, info) => {
  const errors = collectErrors(page);
  await start(page, 3);
  const how: How = (await touchy(page)) ? "tap" : "drag";
  await answering(page);
  await helperGone(page);
  let b = await readBoard(page);
  if (b.mode !== "read") {
    await give(page, b, how);
    await nextExercise(page, b.id);
    b = await readBoard(page);
  }
  expect(b.mode).toBe("read");
  const word = "value" in b ? b.value! : "";
  const wrong = await page.locator(`[data-testid="choice"]:not([data-value="${word}"])`).evaluateAll((els) => els.map((e) => e.getAttribute("data-value")!));
  // the sail word is printed, and nothing spoken so far contains it
  await expect(page.getByTestId("prompt")).not.toContainText(word);
  await press(page, choice(wrong[0]!));
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(choice(wrong[0]!))).toHaveClass(/is-out/);
  await press(page, choice(wrong[1]!));
  await answering(page);
  await expect(page.locator(choice(word))).toHaveClass(/is-model/);
  await page.screenshot({ path: `test-results/screens/${info.project.name}-pb-model.png` });
  await give(page, b, how);
  await nextExercise(page, b.id);
  const done = (await page.getByTestId("stars").getAttribute("data-done")) ?? "0";
  const modes = await playRest(page, how, Number(done));
  expect(modes).toContain("build");
  await finish(page);
  expect(errors).toEqual([]);
});

test("level 8 and level 10: vowel-team sorting, notes and sentence building, whole rounds by keyboard", async ({ page }) => {
  const errors = collectErrors(page);
  await start(page, 7);
  await answering(page);
  await helperGone(page);
  const modes = await playRest(page, "keyboard");
  expect(modes).toContain("sort");
  await finish(page);
  // level 10 (notes): fresh round by keyboard
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("bz.v1")!);
    s.progress.levels = { "paper-boat-post": 9 };
    s.round = null;
    localStorage.setItem("bz.v1", JSON.stringify(s));
  });
  await page.reload();
  await skipStory(page);
  await answering(page);
  await helperGone(page);
  const notes = await playRest(page, "keyboard");
  expect(notes).toEqual(expect.arrayContaining(["noteRead", "noteBuild"]));
  await finish(page);
  expect(errors).toEqual([]);
});

test("every level is playable: three items at each of levels 1–10", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "one project is enough for the level sweep");
  const errors = collectErrors(page);
  const seen = new Set<string>();
  await seed(page, { muted: true, ageBand: "ages-6-8", progress: progressAt(0) });
  await page.goto("/play/paper-boat-post");
  for (let level = 0; level <= 9; level++) {
    await page.evaluate((lv) => {
      const s = JSON.parse(localStorage.getItem("bz.v1")!);
      s.progress.levels = { "paper-boat-post": lv };
      s.round = null;
      localStorage.setItem("bz.v1", JSON.stringify(s));
    }, level);
    await page.reload();
    await skipStory(page);
    await answering(page);
    await expect(page.getByTestId("level")).toContainText(String(level + 1));
    await helperGone(page);
    for (let i = 0; i < 3; i++) seen.add((await solve(page, "tap")).mode);
  }
  expect([...seen]).toEqual(expect.arrayContaining(["swap", "read", "build", "noteRead", "noteBuild"]));
  expect(errors).toEqual([]);
});

test("layout: targets ≥64px and on screen at the four viewports, every mode; screenshots for review", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "viewports are set explicitly");
  const errors = collectErrors(page);
  const { mkdirSync } = await import("node:fs");
  mkdirSync(REVIEW, { recursive: true });
  const check = async (label: string) => {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(450);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1);
      expect(overflow, `${label} ${vp.name} overflow`).toBe(false);
      for (const loc of await page.locator('[data-testid="choice"]:visible, [data-testid="slot"], [data-testid="done"], [data-testid="dock"], [data-testid="docked"]').all()) {
        const box = await loc.boundingBox();
        if (!box) continue;
        const what = `${label} ${vp.name} ${await loc.getAttribute("data-testid")} ${await loc.getAttribute("data-value")}`;
        expect(Math.min(box.width, box.height), `${what} tap size`).toBeGreaterThanOrEqual(63.5);
        expect(box.x, `${what} left`).toBeGreaterThanOrEqual(-1);
        expect(box.y, `${what} top`).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width, `${what} right`).toBeLessThanOrEqual(vp.width + 1);
        expect(box.y + box.height, `${what} bottom`).toBeLessThanOrEqual(vp.height + 1);
      }
      await page.screenshot({ path: `${REVIEW}/${label}-${vp.name}.png` });
    }
    await page.setViewportSize({ width: 1280, height: 800 });
  };
  const goLevel = async (level: number) => {
    await page.evaluate((lv) => {
      const s = JSON.parse(localStorage.getItem("bz.v1")!);
      s.progress.levels = { "paper-boat-post": lv };
      s.round = null;
      localStorage.setItem("bz.v1", JSON.stringify(s));
    }, level);
    await page.reload();
    await skipStory(page);
    await answering(page);
    await helperGone(page);
  };
  /** Play correctly until the mode is on screen (the in-round order follows difficulty, not index). */
  const toMode = async (mode: string) => {
    for (let i = 0; i < 7; i++) {
      const b = await readBoard(page);
      if (b.mode === mode) return true;
      // one miss first on picture items, so the round doesn't step up a level before the wanted mode (R2)
      if ("value" in b && b.value && ["read", "plural", "noteRead", "tag"].includes(b.mode)) {
        const wrong = await page.locator(`[data-testid="choice"]:not([data-value="${b.value}"])`).first().getAttribute("data-value");
        await press(page, choice(wrong!));
        await answering(page);
      }
      await give(page, b, "tap");
      await nextExercise(page, b.id);
      if ((await screen(page).count()) === 0) return false;
    }
    return false;
  };

  // story beats (cinematic + conversation) at each viewport
  await seed(page, { muted: true, ageBand: "ages-6-8", progress: progressAt(0) });
  await page.goto("/play/paper-boat-post");
  const begin = page.getByTestId("story-begin");
  await begin.or(page.getByTestId("story-skip")).first().waitFor({ timeout: 20_000 });
  if (await begin.isVisible()) await begin.click({ force: true });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${REVIEW}/story-1280x800.png` });
  await page.getByTestId("story").click({ force: true });
  await expect(page.getByTestId("dialogue-scene")).toBeVisible();
  await page.waitForTimeout(600);
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${REVIEW}/dialogue-${vp.name}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await press(page, '[data-testid="story-skip"]');
  await answering(page);
  await helperGone(page);
  await check("play-swap");
  for (const [level, mode] of [[1, "read"], [2, "tag"], [3, "build"], [5, "build"], [6, "build"], [7, "sort"], [8, "compound"], [8, "plural"], [9, "noteRead"], [9, "noteBuild"]] as const) {
    await goLevel(level);
    if (await toMode(mode)) await check(`play-L${level + 1}-${mode}`);
  }
  // reward after a level-2 round by tap
  await goLevel(1);
  await playRest(page, "tap");
  await finish(page);
  await page.waitForTimeout(800);
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${REVIEW}/reward-${vp.name}.png` });
  }
  // intro (resume card): start a round, leave, come back
  await page.setViewportSize({ width: 1280, height: 800 });
  await press(page, '[data-testid="play-again"]');
  await answering(page);
  await page.reload();
  await expect(page.getByTestId("start-game")).toBeVisible({ timeout: 20_000 });
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${REVIEW}/intro-${vp.name}.png` });
  }
  expect(errors).toEqual([]);
});

test("reduced motion: the board holds still and the model is an outline", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "one project is enough");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page, 1);
  await answering(page);
  await helperGone(page);
  const anim = await page.locator(".pb-boat").first().evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe("none");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(REVIEW, { recursive: true });
  await page.screenshot({ path: `${REVIEW}/reduced-motion-1280x800.png` });
});
