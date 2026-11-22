import { type Page, expect, test } from "@playwright/test";
import { ACTIONS, SCENARIOS, type Scenario, TUTORIAL, isAction } from "../src/games/feelings-garden/bank";
import { collectErrors, press, screen, seed } from "./helpers";

/**
 * Snug's Feelings Garden: story → rounds by tap-tap, drag and keyboard → "not yet" ladder (Rumble's clue, then the
 * modelled answer with every fitting flower glowing) → outro → Bloom Badge + level up. Also: a less kind idea gets
 * a gentle question, two-friend items keep the right flower, and the optional breathing flower works by hold, tap
 * and keyboard. Screenshots of intro / play / reward at the four viewports go to /home/claude/review/feelings-garden/.
 */
type How = "tap" | "drag" | "keyboard";
const REVIEW = "/home/claude/review/feelings-garden";
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];
const progressAt = (level: number) => ({ v: 1, stickers: [], roundsCompleted: 0, skills: {}, levels: { "feelings-garden": level } });
const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
/** The helper's words: in its own bubble on large screens, in the prompt pill on small ones (captionInPrompt). */
const helperSays = (page: Page, re: RegExp) =>
  expect
    .poll(() => page.evaluate(() => ["helper", "prompt"].map((id) => document.querySelector(`[data-testid="${id}"]`)?.textContent ?? "").join(" ")), { timeout: 15_000 })
    .toMatch(re);
const helperGone = (page: Page) => page.getByTestId("helper").waitFor({ state: "detached", timeout: 25_000 }).catch(() => undefined);

async function start(page: Page, level?: number) {
  await seed(page, level === undefined ? { muted: true } : { muted: true, progress: progressAt(level) });
  await page.goto("/play/feelings-garden");
  await press(page, '[data-testid="story-begin"]');
  await expect(page.getByTestId("story")).toBeVisible();
  await press(page, '[data-testid="story-skip"]');
}

/** The scenario on screen, read from the exercise id (fg-<scenario>-l<level>n<index>) and the authored bank. */
async function current(page: Page): Promise<{ id: string; sc: Scenario }> {
  await answering(page);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  const sid = id.replace(/^fg-/, "").replace(/-(tutorial|l\d+n\d+)$/, "");
  const sc = sid === TUTORIAL.id ? TUTORIAL : SCENARIOS.find((s) => s.id === sid)!;
  expect(sc, id).toBeDefined();
  return { id, sc };
}
const notFitting = (sc: Scenario) => sc.options.filter((o) => !sc.accepted.includes(o) && !((sc.second?.accepted ?? []) as readonly string[]).includes(o));

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

/** Bring one flower / idea card to a friend, the chosen way. */
async function give(page: Page, value: string, friend: string, how: How) {
  const item = `[data-testid="choice"][data-value="${value}"]`;
  const target = `[data-testid="friend"][data-friend="${friend}"]`;
  if (how === "drag") return dragTo(page, item, target);
  if (how === "keyboard") {
    await page.locator(item).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(target)).toBeFocused();
    await page.keyboard.press("Enter");
    return;
  }
  await press(page, item);
  await expect(page.locator(item)).toHaveAttribute("aria-pressed", "true");
  await press(page, target);
}

async function solve(page: Page, how: How, pickAlso = false) {
  const { sc } = await current(page);
  const pick = (acc: readonly string[]) => (pickAlso && acc.length > 1 ? acc[acc.length - 1]! : acc[0]!);
  await give(page, pick(sc.accepted), sc.friend, how);
  if (sc.second) await give(page, pick(sc.second.accepted!), sc.second.friend, how);
  return sc;
}

async function nextExercise(page: Page, prev: string) {
  await expect
    .poll(async () => ((await screen(page).count()) === 0 ? "round-over" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 40_000 })
    .not.toBe(prev);
}

async function playRound(page: Page, how: How, from = 0) {
  const cues: string[] = [];
  for (let i = from; i < 8; i++) {
    const { id } = await current(page);
    if (i === 0) await helperGone(page);
    const sc = await solve(page, how, i % 2 === 1); // odd items: answer with another fitting feeling (several are right)
    cues.push(sc.cue);
    await expect(screen(page)).toHaveAttribute("data-phase", /feedback|solved/);
    await nextExercise(page, id);
  }
  return cues;
}

async function finish(page: Page) {
  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Bloom Badge" })).toBeVisible();
}

test("level 1: tutorial hand, first 'not yet' brings Rumble (no punishment), a whole round by tap-tap, badge and level up", async ({ page }, info) => {
  const errors = collectErrors(page);
  await start(page);
  const { id } = await current(page);
  expect(id).toBe("fg-gift-tutorial");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await helperGone(page);
  await expect(page.getByTestId("hand-pointer")).toBeVisible({ timeout: 15_000 });
  // first "not yet": Rumble points to the clue; the chosen flower dims; the friend and the garden stay as they are
  await give(page, "sad", "puff", "tap");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await helperSays(page, /Eyes and mouths|clues/);
  await answering(page);
  await expect(page.locator('[data-testid="choice"][data-value="sad"]')).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByTestId("garden-row")).toHaveAttribute("data-done", "0");
  await give(page, "happy", "puff", "tap");
  await expect(page.locator('[data-testid="friend"].is-bloom')).toHaveCount(1);
  await nextExercise(page, id);
  await playRound(page, "tap", 1);
  await finish(page);
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  await page.screenshot({ path: `test-results/screens/${info.project.name}-fg-reward.png` });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("bloom-badge");
  expect(stored.progress.levels["feelings-garden"]).toBe(1);
  expect(stored.progress.skills["sel.feel.basic"].completed).toBeGreaterThanOrEqual(6);
  expect(errors).toEqual([]);
});

test("level 5: body clues; second 'not yet' models the answer with every fitting flower glowing; a whole round by drag (tap-tap on touch)", async ({ page }, info) => {
  const errors = collectErrors(page);
  await start(page, 4);
  const touch = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  const how: How = touch ? "tap" : "drag";
  const { id, sc } = await current(page);
  await helperGone(page);
  expect(sc.cue).toBe("body");
  await expect(page.locator('[data-testid="friend"] .fg-critter.is-back')).toHaveCount(1); // turned away: body clues only
  const wrong = notFitting(sc);
  await give(page, wrong[0]!, sc.friend, how);
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await helperSays(page, /Bodies show feelings/);
  await answering(page);
  await expect(page.locator(`[data-testid="choice"][data-value="${wrong[0]}"]`)).toHaveClass(/is-out/);
  await give(page, wrong[1]!, sc.friend, how);
  await answering(page);
  for (const a of sc.accepted) await expect(page.locator(`[data-testid="choice"][data-value="${a}"]`)).toHaveClass(/is-model/);
  for (const w of wrong) await expect(page.locator(`[data-testid="choice"][data-value="${w}"]`)).toHaveAttribute("aria-disabled", "true");
  await page.screenshot({ path: `test-results/screens/${info.project.name}-fg-model.png` });
  await give(page, sc.accepted[sc.accepted.length - 1]!, sc.friend, how); // errorless: any fitting flower
  await nextExercise(page, id);
  await playRound(page, how, 1);
  await finish(page);
  expect(errors).toEqual([]);
});

test("levels 6–9 by keyboard: idea cards, calm ideas, more feeling words and two friends; a less kind idea gets a gentle question", async ({ page }) => {
  const errors = collectErrors(page);
  await start(page, 5);
  const { id, sc } = await current(page);
  await helperGone(page);
  expect(sc.cue).toBe("help");
  // a less kind idea: no wrong buzzer, Rumble asks how the friend might feel
  const unkind = sc.options.find((o) => isAction(o) && !ACTIONS[o].kind)!;
  await give(page, unkind, sc.friend, "keyboard");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await helperSays(page, /How might .+ feel if we did that/);
  await answering(page);
  await give(page, sc.accepted[0]!, sc.friend, "keyboard");
  await expect(page.locator(".fg-critter.fg-face-content")).toHaveCount(1); // the kind idea helped
  await nextExercise(page, id);
  const cues = ["help", ...(await playRound(page, "keyboard", 1))];
  expect(cues).toEqual(expect.arrayContaining(["help", "calm", "more", "two"]));
  await finish(page);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.levels["feelings-garden"]).toBe(6);
  expect(stored.progress.skills["sel.persp.two-sides"].completed).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});

test("two friends: the right flower stays after a 'not yet', the other floats back; then the round goes on by tap-tap", async ({ page }) => {
  const errors = collectErrors(page);
  await start(page, 8);
  const { id, sc } = await current(page);
  await helperGone(page);
  expect(sc.cue).toBe("two");
  const second = sc.second!;
  const wrongForSecond = sc.options.find((o) => !(second.accepted as readonly string[]).includes(o))!;
  await give(page, sc.accepted[0]!, sc.friend, "tap");
  await expect(page.locator(`[data-testid="friend"][data-friend="${sc.friend}"]`)).toHaveAttribute("data-filled", "true");
  await give(page, wrongForSecond, second.friend, "tap");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await helperSays(page, /feel different/);
  await answering(page);
  await expect(page.locator(`[data-testid="friend"][data-friend="${sc.friend}"]`)).toHaveAttribute("data-filled", "true");
  await expect(page.locator(`[data-testid="friend"][data-friend="${second.friend}"]`)).toHaveAttribute("data-filled", "false");
  await give(page, second.accepted![0]!, second.friend, "tap");
  await nextExercise(page, id);
  await playRound(page, "tap", 1);
  await finish(page);
  expect(errors).toEqual([]);
});

test("breathing flower: optional, works by hold, by tap-tap and by keyboard, never blocks play", async ({ page }) => {
  const errors = collectErrors(page);
  await start(page, 6);
  await current(page);
  await helperGone(page);
  await press(page, '[data-testid="breath-open"]');
  const flower = page.getByTestId("breath-flower");
  await expect(flower).toBeFocused();
  // keyboard: Enter = breathe in, Enter again = breathe out
  await page.keyboard.press("Enter");
  await expect(flower).toHaveAttribute("data-phase", "in");
  await page.keyboard.press("Enter");
  await expect(flower).toHaveAttribute("data-phase", "out");
  await expect(flower).toHaveAttribute("data-breaths", "1", { timeout: 8000 });
  // hold: press and hold = breathe in, let go = breathe out
  const box = (await flower.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(flower).toHaveAttribute("data-phase", "in");
  await page.waitForTimeout(700);
  await page.mouse.up();
  await expect(flower).toHaveAttribute("data-phase", "out");
  await expect(flower).toHaveAttribute("data-breaths", "2", { timeout: 8000 });
  // tap-tap: a quick tap starts breathing in, the next tap breathes out (no holding needed)
  await flower.click();
  await expect(flower).toHaveAttribute("data-phase", "in");
  await page.waitForTimeout(300);
  await flower.click();
  await expect(flower).toHaveAttribute("data-phase", "out");
  await expect(flower).toHaveAttribute("data-breaths", "3", { timeout: 8000 });
  await expect(page.getByTestId("breath")).toContainText("Your flower is open");
  await press(page, '[data-testid="breath-close"]');
  await expect(page.getByTestId("breath")).toHaveCount(0);
  // play continues
  const { id } = await current(page);
  await solve(page, "tap");
  await nextExercise(page, id);
  expect(errors).toEqual([]);
});

test("reduced motion: critters and flowers hold still; the breathing flower does not grow", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors = collectErrors(page);
  await start(page, 3);
  await current(page);
  await helperGone(page);
  const anim = await page.locator(".fg-move").first().evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe("none");
  await press(page, '[data-testid="breath-open"]');
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("breath-flower")).toHaveAttribute("data-phase", "in");
  const t = await page.locator(".fg-breath-grow").evaluate((el) => getComputedStyle(el).transform);
  expect(t).toBe("none");
  expect(errors).toEqual([]);
});

test("layout: every flower, card and friend is ≥64px and on screen at the four viewports; screenshots for review", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewports are set explicitly");
  test.setTimeout(420_000);
  const errors = collectErrors(page);
  const { mkdirSync } = await import("node:fs");
  mkdirSync(REVIEW, { recursive: true });
  const check = async (label: string) => {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(450);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1);
      expect(overflow, `${label} ${vp.name} overflow`).toBe(false);
      for (const loc of await page.locator('[data-testid="choice"], [data-testid="friend"], [data-testid="breath-open"]').all()) {
        const box = (await loc.boundingBox())!;
        expect(Math.min(box.width, box.height), `${label} ${vp.name} tap size`).toBeGreaterThanOrEqual(63.5);
        expect(box.x, `${label} ${vp.name} left`).toBeGreaterThanOrEqual(-1);
        expect(box.y, `${label} ${vp.name} top`).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width, `${label} ${vp.name} right`).toBeLessThanOrEqual(vp.width + 1);
        expect(box.y + box.height, `${label} ${vp.name} bottom`).toBeLessThanOrEqual(vp.height + 1);
      }
      // the options never sit on top of the friend
      const f = (await page.locator('[data-testid="friend"]').first().boundingBox())!;
      for (const loc of await page.locator('[data-testid="choice"]').all()) {
        const b = (await loc.boundingBox())!;
        const overlap = Math.max(0, Math.min(f.x + f.width, b.x + b.width) - Math.max(f.x, b.x)) * Math.max(0, Math.min(f.y + f.height, b.y + b.height) - Math.max(f.y, b.y));
        expect(overlap, `${label} ${vp.name} option over friend`).toBeLessThan(0.05 * b.width * b.height);
      }
      await page.screenshot({ path: `${REVIEW}/${label}-${vp.name}.png` });
    }
    await page.setViewportSize({ width: 1280, height: 800 });
  };

  await seed(page, { muted: true, progress: progressAt(0) });
  await page.goto("/play/feelings-garden");
  await press(page, '[data-testid="story-begin"]');
  await expect(page.getByTestId("story")).toBeVisible();
  await page.waitForTimeout(600);
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${REVIEW}/story-${vp.name}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await press(page, '[data-testid="story-skip"]');
  await current(page);
  await helperGone(page);
  await check("play-l1-tutorial");
  for (const [level, label] of [[2, "play-l3-faces"], [3, "play-l4-situation"], [4, "play-l5-body"], [5, "play-l6-help"], [6, "play-l7-calm"], [7, "play-l8-more"], [8, "play-l9-two"]] as const) {
    await page.evaluate((lv) => {
      const s = JSON.parse(localStorage.getItem("bz.v1")!);
      s.progress.levels = { "feelings-garden": lv };
      s.round = null;
      localStorage.setItem("bz.v1", JSON.stringify(s));
    }, level);
    await page.reload();
    await press(page, '[data-testid="story-begin"]').catch(() => undefined);
    await press(page, '[data-testid="story-skip"], [data-testid="start-game"]');
    await current(page);
    await helperGone(page);
    await check(label);
  }
  // a picked flower + ready friend, and the breathing flower, at each viewport
  const { sc } = await current(page);
  await press(page, `[data-testid="choice"][data-value="${sc.options[0]}"]`);
  await check("play-picked");
  await press(page, `[data-testid="choice"][data-value="${sc.options[0]}"]`);
  await press(page, '[data-testid="breath-open"]');
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(400);
    const box = (await page.getByTestId("breath-flower").boundingBox())!;
    expect(box.y + box.height, `breath ${vp.name}`).toBeLessThanOrEqual(vp.height + 1);
    await page.screenshot({ path: `${REVIEW}/breath-${vp.name}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await press(page, '[data-testid="breath-close"]');
  // reward after a round played by tap-tap (level 9)
  await playRound(page, "tap");
  await finish(page);
  await page.waitForTimeout(800);
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${REVIEW}/reward-${vp.name}.png` });
  }
  // intro (resume card) at each viewport
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
