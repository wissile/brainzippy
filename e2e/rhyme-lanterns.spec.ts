import { type Page, expect, test } from "@playwright/test";
import { rhymes } from "../src/games/rhyme-lanterns/words";
import { collectErrors, press, screen, seed } from "./helpers";

/**
 * Hoot's Rhyme Lanterns: story → rounds played by tap-tap, drag and keyboard → miss ladder (helper, then the
 * slow-word model) → outro → Lantern Keeper sticker + level up. Screenshots of intro / play / reward at the
 * four standard viewports go to /home/claude/review/rhyme-lanterns/ (and test-results/screens/).
 */
type How = "tap" | "drag" | "keyboard";
const REVIEW = "/home/claude/review/rhyme-lanterns";
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];

const progressAt = (level: number) => ({ v: 1, stickers: [], roundsCompleted: 0, skills: {}, levels: { "rhyme-lanterns": level } });
const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
const helperGone = (page: Page) => page.getByTestId("helper").waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
const board = (page: Page) => page.getByTestId("rl-board");

async function start(page: Page, level?: number) {
  await seed(page, level === undefined ? { muted: true } : { muted: true, progress: progressAt(level) });
  await page.goto("/play/rhyme-lanterns");
  await press(page, '[data-testid="story-begin"]');
  await expect(page.getByTestId("story")).toBeVisible();
  await press(page, '[data-testid="story-skip"]');
}

/** Read the board and work out the answer from the rhyme rule (never from hidden attributes). */
async function readBoard(page: Page) {
  await answering(page);
  const mode = (await board(page).getAttribute("data-mode"))!;
  const target = (await page.getByTestId("target").count()) ? await page.getByTestId("target").getAttribute("data-word") : null;
  const words = await page.locator('[data-testid="choice"][data-word]').evaluateAll((els) => els.map((e) => e.getAttribute("data-word")!));
  if (mode === "yesno") {
    const cand = (await page.getByTestId("candidate").getAttribute("data-word"))!;
    return { mode, target, words, answers: [rhymes(target!, cand) ? "yes" : "no"], wrong: [rhymes(target!, cand) ? "no" : "yes"] };
  }
  if (mode === "odd") {
    const odd = words.filter((w) => words.filter((v) => v !== w && rhymes(v, w)).length === 0);
    return { mode, target, words, answers: odd, wrong: words.filter((w) => !odd.includes(w)) };
  }
  const answers = words.filter((w) => rhymes(target!, w));
  return { mode, target, words, answers, wrong: words.filter((w) => !answers.includes(w)) };
}

async function dragTo(page: Page, from: string, to: string) {
  const a = (await page.locator(from).first().boundingBox())!;
  const b = (await page.locator(to).first().boundingBox())!;
  const sx = a.x + a.width / 2;
  const sy = a.y + a.height / 2;
  const tx = b.x + b.width / 2;
  const ty = b.y + b.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(sx + ((tx - sx) * k) / 12, sy + ((ty - sy) * k) / 12);
  await page.mouse.up();
}

const zoneFor = (mode: string) => (mode === "odd" ? '[data-testid="basket"]' : mode === "chain" ? '[data-testid="slot"][data-filled="false"]' : '[data-testid="slot"]');

/** Move one lantern (or answer yes/no) the chosen way. */
async function give(page: Page, mode: string, value: string, how: How) {
  const item = `[data-testid="choice"][data-value="${value}"]`;
  if (mode === "yesno") {
    if (how === "drag") await dragTo(page, '[data-testid="candidate"]', item);
    else if (how === "keyboard") {
      await page.locator(item).focus();
      await page.keyboard.press("Enter");
    } else await press(page, item);
    return;
  }
  if (how === "drag") return dragTo(page, item, zoneFor(mode));
  if (how === "keyboard") {
    await page.locator(item).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(zoneFor(mode)).first()).toBeFocused();
    await page.keyboard.press("Enter");
    return;
  }
  await press(page, item);
  await expect(page.locator(item)).toHaveAttribute("aria-pressed", "true");
  await press(page, zoneFor(mode));
}

async function solve(page: Page, how: How) {
  const b = await readBoard(page);
  for (const v of b.answers) await give(page, b.mode, v, how);
  return b;
}

async function nextExercise(page: Page, prev: string) {
  await expect
    .poll(async () => ((await screen(page).count()) === 0 ? "round-over" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 40_000 })
    .not.toBe(prev);
}

async function playRound(page: Page, how: How, onEach?: (i: number, mode: string) => Promise<void>) {
  const modes: string[] = [];
  for (let i = 0; i < 8; i++) {
    await answering(page);
    if (i === 0) await helperGone(page);
    const id = (await screen(page).getAttribute("data-exercise"))!;
    const b = await solve(page, how);
    modes.push(b.mode);
    await expect(screen(page)).toHaveAttribute("data-phase", /feedback|solved/);
    await onEach?.(i, b.mode);
    await nextExercise(page, id);
  }
  return modes;
}

async function finish(page: Page) {
  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Lantern Keeper" })).toBeVisible();
}

test("level 1: tutorial, first miss shows the helper, a whole round by tap-tap, sticker and level up", async ({ page }, info) => {
  const errors = collectErrors(page);
  await start(page);
  await answering(page);
  await expect(screen(page)).toHaveAttribute("data-exercise", "rl-yesno-cat-hat-tutorial");
  // tutorial: the pointing hand shows where to answer (after Hoot's prompt and Zuzu's explanation)
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await helperGone(page);
  await expect(page.getByTestId("hand-pointer")).toBeVisible({ timeout: 15_000 });
  // first miss: never punished — Zuzu explains the strategy and the wrong lantern greys out
  await press(page, '[data-testid="choice"][data-value="no"]');
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator('[data-testid="choice"][data-value="no"]')).toHaveAttribute("aria-disabled", "true");
  await press(page, '[data-testid="choice"][data-value="yes"]');
  await nextExercise(page, "rl-yesno-cat-hat-tutorial");
  // the rest of the round by tap-tap (7 more)
  for (let i = 1; i < 8; i++) {
    const id = (await screen(page).getAttribute("data-exercise"))!;
    await solve(page, "tap");
    await nextExercise(page, id);
  }
  await finish(page);
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  await page.screenshot({ path: `test-results/screens/${info.project.name}-rl-reward.png` });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("lantern-keeper");
  expect(stored.progress.levels["rhyme-lanterns"]).toBe(1);
  expect(stored.progress.skills["english.phon.rhyme"].completed).toBe(8);
  expect(errors).toEqual([]);
});

test("level 3: second miss models the answer; a whole round by drag (tap-tap on touch)", async ({ page }, info) => {
  const errors = collectErrors(page);
  await start(page, 2);
  const touch = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  const how: How = touch ? "tap" : "drag";
  await answering(page);
  await helperGone(page);
  // first item: two misses → helper, then Hoot's slow model with the rhyme shining
  const b = await readBoard(page);
  expect(b.mode).toBe("pick");
  expect(b.words).toHaveLength(3);
  const id0 = (await screen(page).getAttribute("data-exercise"))!;
  await give(page, b.mode, b.wrong[0]!, how);
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(`[data-testid="choice"][data-value="${b.wrong[0]}"]`)).toHaveClass(/is-out/);
  await give(page, b.mode, b.wrong[1]!, how);
  await answering(page);
  await expect(page.locator(`[data-testid="choice"][data-value="${b.answers[0]}"]`)).toHaveClass(/is-model/);
  await page.screenshot({ path: `test-results/screens/${info.project.name}-rl-model.png` });
  await give(page, b.mode, b.answers[0]!, how);
  await nextExercise(page, id0);
  for (let i = 1; i < 8; i++) {
    const id = (await screen(page).getAttribute("data-exercise"))!;
    await solve(page, how);
    await nextExercise(page, id);
  }
  await finish(page);
  expect(errors).toEqual([]);
});

test("levels 7–8: rhyme chains, a whole round by keyboard", async ({ page }) => {
  const errors = collectErrors(page);
  await start(page, 6);
  await answering(page);
  await helperGone(page);
  const modes = await playRound(page, "keyboard");
  expect(modes).toContain("chain");
  await finish(page);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.levels["rhyme-lanterns"]).toBe(7);
  expect(errors).toEqual([]);
});

test("layout: every lantern is ≥64px and on screen at the four viewports; screenshots for review", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewports are set explicitly");
  const errors = collectErrors(page);
  const { mkdirSync } = await import("node:fs");
  mkdirSync(REVIEW, { recursive: true });
  const check = async (label: string) => {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(450);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1);
      expect(overflow, `${label} ${vp.name} overflow`).toBe(false);
      for (const loc of await page.locator('[data-testid="choice"], [data-testid="slot"], [data-testid="target"], [data-testid="candidate"], [data-testid="basket"]').all()) {
        const box = (await loc.boundingBox())!;
        expect(Math.min(box.width, box.height), `${label} ${vp.name} tap size`).toBeGreaterThanOrEqual(63.5);
        expect(box.x, `${label} ${vp.name} left`).toBeGreaterThanOrEqual(-1);
        expect(box.y, `${label} ${vp.name} top`).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width, `${label} ${vp.name} right`).toBeLessThanOrEqual(vp.width + 1);
        expect(box.y + box.height, `${label} ${vp.name} bottom`).toBeLessThanOrEqual(vp.height + 1);
      }
      await page.screenshot({ path: `${REVIEW}/${label}-${vp.name}.png` });
    }
    await page.setViewportSize({ width: 1280, height: 800 });
  };

  // intro card (resume a level so the intro shows instead of the story)
  await seed(page, { muted: true, progress: progressAt(7) });
  await page.goto("/play/rhyme-lanterns");
  await press(page, '[data-testid="story-begin"]');
  await expect(page.getByTestId("story")).toBeVisible();
  await page.screenshot({ path: `${REVIEW}/story-1280x800.png` });
  await press(page, '[data-testid="story-skip"]');
  // every mode at every viewport: level 8 (chain of 4, 6 lanterns) is the densest board
  await answering(page);
  await helperGone(page);
  await check("play-chain4");
  // walk a level-0..7 sample by reloading at each level
  for (const [level, label] of [[0, "play-yesno"], [1, "play-pick2"], [5, "play-pick4"], [4, "play-odd"]] as const) {
    await page.evaluate((lv) => {
      const s = JSON.parse(localStorage.getItem("bz.v1")!);
      s.progress.levels = { "rhyme-lanterns": lv };
      s.round = null;
      localStorage.setItem("bz.v1", JSON.stringify(s));
    }, level);
    await page.reload();
    await press(page, '[data-testid="story-begin"]').catch(() => undefined);
    await press(page, '[data-testid="story-skip"], [data-testid="start-game"]');
    await answering(page);
    await helperGone(page);
    await check(label);
  }
  // reward screen after a round of odd-one-out (level 5) played by tap-tap
  const modes = await playRound(page, "tap");
  expect(modes).toContain("odd");
  await finish(page);
  await page.waitForTimeout(800);
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${REVIEW}/reward-${vp.name}.png` });
  }
  // intro (resume card) at each viewport: start a round, leave, come back
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
