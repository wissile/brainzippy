import { type Page, expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { collectErrors, press, screen, seed, whenReady } from "./helpers";
import { reviewDir } from "./helpers";

/** Fenn's Message Mystery: story → sort by drag, tap-tap, keyboard and tap → outro → Detective Badge + level up; every mode. */
const REVIEW = reviewDir("message-mystery");
mkdirSync(REVIEW, { recursive: true });
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];
const PROFILE = { monster: { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" }, monsterName: "Ziggy", kidName: "Testkid", step: "done", parentSignup: "skipped" };
const atLevel = (level: number) => ({ muted: true, ageBand: "ages-6-8", progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "message-mystery": level } } });

const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 30_000 });
const bin = (b: string) => `[data-testid="choice"][data-value="${b}"]`;
type Way = "tap" | "drag" | "taptap" | "keyboard";

async function exId(page: Page) {
  await answering(page);
  return (await screen(page).getAttribute("data-exercise"))!;
}
async function nextExercise(page: Page, id: string) {
  await expect
    .poll(async () => ((await screen(page).count()) === 0 ? "done" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 45_000 })
    .not.toBe(id);
}
async function key(page: Page, sel: string) {
  await whenReady(page.locator(sel).first());
  await page.locator(sel).first().focus();
  await page.keyboard.press("Enter");
}
async function dragTo(page: Page, from: string, to: string) {
  const a = (await page.locator(from).boundingBox())!;
  const b = (await page.locator(to).boundingBox())!;
  // grab the card by its body text area (not a button edge) and move in steps so the drag registers
  const sx = a.x + a.width / 2, sy = a.y + a.height - 14, tx = b.x + b.width / 2, ty = b.y + b.height / 2;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let k = 1; k <= 14; k++) await page.mouse.move(sx + ((tx - sx) * k) / 14, sy + ((ty - sy) * k) / 14);
  await page.mouse.up();
}
const isSafe = async (page: Page) => (await page.getByTestId("mm-card").getAttribute("data-safe")) === "true";

/** Post the message on screen into its right bin. */
async function sortOne(page: Page, way: Way) {
  const target = bin((await isSafe(page)) ? "safe" : "ask");
  if (way === "drag") await dragTo(page, '[data-testid="mm-card"]', target);
  else if (way === "taptap") {
    await press(page, '[data-testid="mm-lift"]');
    await expect(page.getByTestId("mm-lift")).toHaveAttribute("aria-pressed", "true");
    await press(page, target);
  } else if (way === "keyboard") await key(page, target);
  else await press(page, target);
}

async function noOverflow(page: Page) {
  const vp = page.viewportSize()!;
  const over = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
  expect(over.w).toBeLessThanOrEqual(vp.width + 1);
  expect(over.h).toBeLessThanOrEqual(vp.height + 1);
  for (const sel of ['[data-testid="choice"]', '[data-testid="mm-part"]', '[data-testid="mm-read"]', '[data-testid="mm-lift"]', '[data-testid="done"]', '[data-testid="mm-envelope"]', '[data-testid="mm-say"]', '[data-testid="mm-card"]']) {
    for (const box of await Promise.all((await page.locator(sel).all()).map((c) => c.boundingBox()))) {
      if (!box) continue;
      if (sel !== '[data-testid="mm-card"]') expect(Math.min(box.width, box.height), sel).toBeGreaterThanOrEqual(43.5);
      expect(box.x, sel).toBeGreaterThanOrEqual(-1);
      expect(box.y, sel).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width, sel).toBeLessThanOrEqual(vp.width + 1);
      expect(box.y + box.height, sel).toBeLessThanOrEqual(vp.height + 1);
    }
  }
}
async function enter(page: Page) {
  await page.goto("/play/message-mystery");
  const begin = page.locator('[data-testid="story-begin"], [data-testid="start-game"]').first();
  await begin.waitFor({ state: "visible", timeout: 20_000 });
  const resumed = (await begin.getAttribute("data-testid")) === "start-game";
  await begin.click({ force: true });
  if (!resumed) await press(page, '[data-testid="story-skip"]');
}
async function reset(page: Page, level: number) {
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(({ lv, profile }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("bz.v1", JSON.stringify({ muted: true, ageBand: "ages-6-8", profile, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "message-mystery": lv } }, round: null }));
    sessionStorage.setItem("seeded", "1");
  }, { lv: level, profile: PROFILE });
}

/** Solve whatever mode is on screen, the right way, by the given input. */
async function solve(page: Page, way: Way) {
  const mode = await page.getByTestId("mm-board").getAttribute("data-mode");
  if (mode === "sort") return sortOne(page, way);
  if (mode === "action" || mode === "verify") {
    const safe = await isSafe(page);
    const id = mode === "action" ? (safe ? "read" : "tell") : safe ? "ok" : "check";
    return way === "keyboard" ? key(page, bin(id)) : press(page, bin(id));
  }
  if (mode === "clues") {
    const clues = page.locator('[data-testid="choice"][data-clue]:not([data-clue=""])');
    const n = await clues.count();
    if (n === 0) await (way === "keyboard" ? key(page, bin("none")) : press(page, bin("none")));
    for (let i = 0; i < n; i++) {
      const sel = `[data-testid="choice"][data-part="${await clues.nth(i).getAttribute("data-part")}"]`;
      if ((await page.locator(sel).getAttribute("aria-pressed")) === "true") continue;
      await (way === "keyboard" ? key(page, sel) : press(page, sel));
      await expect(page.locator(sel)).toHaveAttribute("aria-pressed", "true");
    }
    return way === "keyboard" ? key(page, '[data-testid="done"]') : press(page, '[data-testid="done"]');
  }
  // inbox: open each envelope and post it
  const n = await page.getByTestId("mm-envelope").count();
  for (let i = 0; i < n; i++) {
    const env = page.getByTestId("mm-envelope").nth(i);
    if ((await env.getAttribute("data-bin")) !== "") continue;
    await whenReady(env);
    await (way === "keyboard" ? env.focus().then(() => page.keyboard.press("Enter")) : env.click({ force: true }));
    await expect(page.getByTestId("mm-card")).toHaveAttribute("data-msg", (await env.getAttribute("data-msg"))!);
    await sortOne(page, way);
    await expect(env).not.toHaveAttribute("data-bin", "");
  }
  return way === "keyboard" ? key(page, '[data-testid="done"]') : press(page, '[data-testid="done"]');
}

test("detective sorts a whole round by drag, tap-tap, keyboard and tap, and levels up", async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  await seed(page, { muted: true, ageBand: "ages-6-8" });
  const shot = (name: string) => page.screenshot({ path: `${REVIEW}/${info.project.name}-${name}.png` });

  await page.goto("/play/message-mystery");
  await press(page, '[data-testid="story-begin"]');
  await expect(page.getByTestId("story")).toBeVisible();
  await page.waitForTimeout(700);
  await shot("01-story");
  await press(page, '[data-testid="story-skip"]');

  expect(await exId(page)).toBe("mm-tutorial-password");
  await expect(page.getByTestId("hand-pointer")).toBeVisible({ timeout: 20_000 }); // the tutorial hand points at Ask a grown-up
  await shot("02-play-tutorial");
  await noOverflow(page);
  // reading aloud on tap: the speaker shows the message as a caption
  await press(page, '[data-testid="mm-read"]');

  const ways: Way[] = ["tap", "drag", "taptap", "keyboard", "tap", "drag", "taptap", "keyboard", "tap"];
  for (let i = 0; i < 9; i++) {
    if ((await screen(page).count()) === 0) break;
    const id = await exId(page);
    let way = ways[i]!;
    if (way === "drag" && info.project.name !== "desktop") way = "taptap"; // pointer drag is covered on desktop
    if (i === 3) await shot("03-play-sort");
    await solve(page, way);
    await expect(screen(page)).toHaveAttribute("data-phase", /feedback|solved/, { timeout: 20_000 });
    await expect(page.getByTestId("mm-board")).toHaveClass(/is-solved/);
    await nextExercise(page, id);
  }

  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Detective Badge" })).toBeVisible();
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  await page.waitForTimeout(1200);
  await shot("05-reward");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("detective-badge");
  expect(stored.progress.levels["message-mystery"]).toBe(1);
  if (info.project.name === "desktop") {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-reward.png` });
    }
  }
  expect(errors).toEqual([]);
});

test("sort miss: Hoot explains, the clue is circled and named, the right bin glows; asking about a safe one is OK", async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await seed(page, atLevel(2));
  await enter(page);
  // find a trick and a safe message in the round, miss each once
  const seenModes = new Set<string>();
  for (let k = 0; k < 4 && seenModes.size < 2; k++) {
    const id = await exId(page);
    const safe = await isSafe(page);
    const kind = safe ? "safe" : "trick";
    if (seenModes.has(kind)) {
      await solve(page, "tap");
      await nextExercise(page, id);
      continue;
    }
    seenModes.add(kind);
    await press(page, bin(safe ? "ask" : "safe")); // the wrong bin
    await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
    await answering(page);
    await expect(page.locator(`${bin(safe ? "ask" : "safe")}`)).toHaveClass(/is-out/);
    await expect(page.locator(`${bin(safe ? "safe" : "ask")}`)).toHaveClass(/is-model/);
    await expect(page.getByTestId("mm-tag").first()).toBeVisible();
    if (!safe) await expect(page.locator(".mm-part.is-model")).toHaveCount(1);
    await page.screenshot({ path: `${REVIEW}/${info.project.name}-06-miss-${kind}.png` });
    await solve(page, "tap");
    await expect(page.getByTestId("mm-board")).toHaveClass(/is-solved/, { timeout: 20_000 });
    await nextExercise(page, id);
  }
  expect(seenModes.size).toBe(2);
  expect(errors).toEqual([]);
});

test("clue and action modes: first miss glows (helper), second miss circles and names the clue", async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  // clue mode (level 7 on screen): circle one harmless part, then miss again
  await reset(page, 6);
  await enter(page);
  await answering(page);
  if ((await page.getByTestId("mm-card").getAttribute("data-safe")) === "true") throw new Error("level 6 starts with a trick by design");
  const harmless = page.locator('[data-testid="choice"][data-clue=""]').first();
  const clue = page.locator('[data-testid="choice"][data-clue]:not([data-clue=""])').first();
  const clueSel = `[data-testid="choice"][data-part="${await clue.getAttribute("data-part")}"]`;
  await press(page, `[data-testid="choice"][data-part="${await harmless.getAttribute("data-part")}"]`);
  await press(page, '[data-testid="done"]');
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(".mm-part.is-glow").first()).toBeVisible();
  await expect(page.getByTestId("mm-tag")).toHaveCount(0); // glow only, not named yet
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-07-clue-first-miss.png` });
  // second miss: one clue only
  await press(page, clueSel);
  const others = await page.locator('[data-testid="choice"][data-clue]:not([data-clue=""])').count();
  if (others > 1) {
    await press(page, '[data-testid="done"]');
    await expect(page.locator(".mm-part.is-model").first()).toBeVisible({ timeout: 20_000 });
    await answering(page);
    await expect(page.getByTestId("mm-tag")).toHaveCount(others);
    await page.screenshot({ path: `${REVIEW}/${info.project.name}-08-clue-model.png` });
  }
  await solve(page, "tap");
  await expect(page.getByTestId("mm-board")).toHaveClass(/is-solved/, { timeout: 20_000 });

  // action mode: two wrong cards, then the modelled one
  await reset(page, 7);
  await enter(page);
  await answering(page);
  const safe = (await page.getByTestId("mm-card").getAttribute("data-safe")) === "true";
  const wrong = safe ? ["stop", "tell"] : ["stop", "read"];
  await press(page, bin(wrong[0]!));
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(bin(wrong[0]!))).toHaveClass(/is-out/);
  await press(page, bin(wrong[1]!));
  await expect(page.locator(bin(safe ? "read" : "tell"))).toHaveClass(/is-model/, { timeout: 20_000 });
  await answering(page);
  await page.screenshot({ path: `${REVIEW}/${info.project.name}-09-action-model.png` });
  await press(page, bin(safe ? "read" : "tell"));
  await expect(page.getByTestId("mm-board")).toHaveClass(/is-solved/, { timeout: 20_000 });
  expect(errors).toEqual([]);
});

test("magnifier, clue, action, check-another-way and inbox levels play by every input", async ({ page }, info) => {
  test.setTimeout(240_000);
  const errors = collectErrors(page);
  const desk = info.project.name === "desktop";
  const cases: { level: number; way: Way }[] = [
    { level: 4, way: "keyboard" },
    { level: 5, way: desk ? "drag" : "taptap" },
    { level: 6, way: "keyboard" },
    { level: 7, way: "tap" },
    { level: 8, way: "keyboard" },
    { level: 9, way: desk ? "drag" : "taptap" },
    { level: 9, way: "keyboard" },
  ];
  for (const c of cases) {
    await reset(page, c.level);
    await enter(page);
    await answering(page);
    if (c.level === 4) {
      // the magnifier reveals the real address (hidden until checked on these levels)
      await expect(page.getByTestId("mm-addr").first()).toContainText("tap to check");
      await key(page, '[data-testid="mm-part"][data-part="from"]');
      await expect(page.getByTestId("mm-addr").first()).toContainText(".example");
      await expect(page.getByTestId("mm-say-live")).toContainText("really comes from");
    }
    await page.screenshot({ path: `${REVIEW}/${info.project.name}-10-level${c.level}-${c.way}.png` });
    await solve(page, c.way);
    await expect(page.getByTestId("mm-board")).toHaveClass(/is-solved/, { timeout: 25_000 });
  }
  expect(errors).toEqual([]);
});

test("the mailbox fits every viewport at every kind of level", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "viewport sweep runs once (it resizes through all four sizes)");
  test.setTimeout(240_000);
  for (const level of [0, 4, 5, 6, 7, 8, 9]) {
    await reset(page, level);
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.goto("/play/message-mystery");
      const begin = page.locator('[data-testid="story-begin"], [data-testid="start-game"]').first();
      await begin.waitFor({ state: "visible", timeout: 20_000 });
      const resumed = (await begin.getAttribute("data-testid")) === "start-game";
      if (level === 0) {
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-${resumed ? "intro" : "story"}.png` });
      }
      await begin.click({ force: true });
      if (!resumed) await press(page, '[data-testid="story-skip"]');
      await answering(page);
      await page.waitForTimeout(500);
      await noOverflow(page);
      await page.screenshot({ path: `${REVIEW}/vp-${vp.name}-play-l${level}.png` });
    }
  }
});
