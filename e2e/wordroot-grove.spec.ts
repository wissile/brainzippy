import { type Page, expect, test } from "@playwright/test";
import { APOSTROPHE_SENTENCES, CONFUSED_ITEMS, OWNER_PICTURES, ownerPhrases } from "../src/games/wordroot-grove/grammar";
import { slug } from "../src/games/wordroot-grove/logic";
import { CLASS_WORDS, FAMILY_ITEMS, FIT_ITEMS, PREFIX_WORDS, SUFFIX_WORDS, TWO_AFFIX_WORDS } from "../src/games/wordroot-grove/morphology";
import { ALL_PASSAGES } from "../src/games/wordroot-grove/passages";
import { GREEK_WORDS, ROOT, ROOT_CONTEXT, WORD_FOR } from "../src/games/wordroot-grove/roots";
import { collectErrors, press, reviewDir, screen, seed, whenReady } from "./helpers";

/**
 * Wordroot Grove: story (cinematic beat + Sarah/Gloop DialogueScene) → rounds by tap, drag and keyboard → miss
 * ladder (Gloop's hint + grey-out + the word stretched into parts, then the worked chain + glowing answer) → outro →
 * Root Reader badge + level up; every level playable; layout at the four viewports with an overlap check
 * (screenshots in reviewDir("wordroot-grove")). The solver reads what a child sees (the leaf, the cards) plus the
 * content banks; never the answer key.
 */
type How = "tap" | "drag" | "keyboard";
const REVIEW = reviewDir("wordroot-grove");
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];
const progressAt = (level: number) => ({ v: 1, stickers: [], roundsCompleted: 0, skills: {}, levels: { "wordroot-grove": level } });
const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
const helperGone = (page: Page) => page.getByTestId("helper").waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
const choice = (v: string) => `[data-testid="choice"][data-value="${v}"]`;

async function start(page: Page, level?: number, extra: Record<string, unknown> = {}) {
  await seed(page, level === undefined ? { muted: true, ageBand: "ages-9-11", ...extra } : { muted: true, ageBand: "ages-9-11", progress: progressAt(level), ...extra });
  await page.goto("/play/wordroot-grove");
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
async function goLevel(page: Page, level: number) {
  await page.evaluate((lv) => {
    const s = JSON.parse(localStorage.getItem("bz.v1")!);
    s.progress.levels = { "wordroot-grove": lv };
    s.round = null;
    localStorage.setItem("bz.v1", JSON.stringify(s));
  }, level);
  await page.reload();
  await skipStory(page);
  await answering(page);
  await helperGone(page);
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

/** What the right answer is, worked out from what is on screen and the content banks. */
async function readBoard(page: Page) {
  await answering(page);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  const mode = (await page.getByTestId("wg-board").getAttribute("data-mode"))!;
  const k = id.replace(/^wg-[a-z0-9]+-/, "").replace(/-(r\d-)?l\dn\d$|-tutorial$/, "");
  const word = (w: string) => [...PREFIX_WORDS, ...SUFFIX_WORDS].find((x) => x.word === w)!;
  switch (mode) {
    case "meaning": return { id, mode, value: slug(word(k).gloss) };
    case "build": return { id, mode, texts: [...word(k).parts] };
    case "build2": return { id, mode, texts: [...TWO_AFFIX_WORDS.find((x) => x.word === k)!.parts] };
    case "fit": return { id, mode, value: slug(FIT_ITEMS.find((x) => x.id === k)!.answer) };
    case "family": return { id, mode, value: slug(FAMILY_ITEMS.find((x) => x.id === k)!.answer) };
    case "rootmeaning": return { id, mode, value: slug(GREEK_WORDS.find((x) => x.word === k)!.answer) };
    case "wordfor": return { id, mode, value: slug(WORD_FOR.find((x) => x.id === k)!.answer) };
    case "rootcontext": return { id, mode, value: slug(ROOT_CONTEXT.find((x) => x.id === k)!.answer) };
    case "clueMeaning": return { id, mode, value: slug(ALL_PASSAGES.find((x) => x.word === k)!.answer) };
    case "clueTap": return { id, mode, chunks: ALL_PASSAGES.find((x) => x.word === k)!.clues.map((i) => `c${i}`) };
    case "owner": {
      const [owner, n] = k.split("-") as [string, string];
      return { id, mode, value: slug(ownerPhrases(OWNER_PICTURES.find((o) => o.id === owner)!, n === "many")[0].text) };
    }
    case "apostrophe": return { id, mode, value: slug(APOSTROPHE_SENTENCES.find((x) => x.id === k)!.answer) };
    case "confused": return { id, mode, value: slug(CONFUSED_ITEMS.find((x) => x.id === k)!.answer) };
    default: {
      // sort / rootmatch: each card to the branch for its class or meaning
      const cards = await page.locator('.wg-cards [data-testid="choice"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-value")!));
      const pairs = cards.map((c) => [c, mode === "sort" ? CLASS_WORDS.find((w) => w.word === c)!.cls : slug(ROOT[c]!.meaning)] as const);
      return { id, mode, pairs };
    }
  }
}
type Board = Awaited<ReturnType<typeof readBoard>>;

async function tileIds(page: Page, texts: readonly string[]) {
  const tiles = await page.locator('.wg-tiles [data-testid="choice"]').evaluateAll((els) => els.map((e) => ({ id: e.getAttribute("data-value")!, text: e.getAttribute("data-text")! })));
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
    if (how === "drag") return dragTo(page, target, '[data-testid="leaf"]');
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
  if ("chunks" in b && b.chunks) {
    for (const c of b.chunks) {
      if (how === "keyboard") await key(page, choice(c));
      else await press(page, choice(c));
      await expect(page.locator(choice(c))).toHaveAttribute("aria-pressed", "true");
    }
    if (how === "keyboard") await key(page, '[data-testid="done"]');
    else await press(page, '[data-testid="done"]');
    return;
  }
  if ("pairs" in b && b.pairs) {
    for (const [c, bin] of b.pairs) {
      if (how === "keyboard") {
        await key(page, choice(c));
        await expect(page.locator('[data-testid="dock"]').first()).toBeFocused();
        await key(page, `[data-testid="dock"][data-value="${bin}"]`);
      } else if (how === "drag") await dragTo(page, choice(c), `[data-testid="dock"][data-value="${bin}"]`);
      else {
        await press(page, choice(c));
        await press(page, `[data-testid="dock"][data-value="${bin}"]`);
      }
      await expect(page.locator(`[data-testid="docked"][data-value="${c}"]`)).toBeVisible();
    }
    if (how === "keyboard") {
      await expect(page.getByTestId("done")).toBeFocused();
      await page.keyboard.press("Enter");
    } else await press(page, '[data-testid="done"]');
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
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Root Reader" })).toBeVisible();
}
const touchy = (page: Page) => page.evaluate(() => matchMedia("(pointer: coarse)").matches);
/** A wrong answer for the current board (a distractor leaf, a decoy tile, a non-clue chunk, a wrong branch). */
async function missOnce(page: Page, b: Board) {
  if ("value" in b && b.value) {
    const wrong = await page.locator(`[data-testid="choice"]:not([data-value="${b.value}"]):not([aria-disabled="true"])`).first().getAttribute("data-value");
    await press(page, choice(wrong!));
    return wrong!;
  }
  if ("chunks" in b && b.chunks) {
    const wrong = await page.locator('[data-testid="choice"]:not([aria-disabled="true"])').evaluateAll((els, right) => els.map((e) => e.getAttribute("data-value")!).filter((v) => !right.includes(v)), b.chunks);
    await press(page, choice(wrong[0]!));
    await press(page, '[data-testid="done"]');
    return wrong[0]!;
  }
  throw new Error(`no miss helper for ${b.mode}`);
}

test("story: storm beat, then Sarah introduces Gloop on the first visit; Skip skips it all", async ({ page }) => {
  const errors = collectErrors(page);
  await seed(page, { muted: true, ageBand: "ages-9-11" });
  await page.goto("/play/wordroot-grove");
  const begin = page.getByTestId("story-begin");
  await begin.or(page.getByTestId("story-skip")).first().waitFor({ timeout: 20_000 });
  if (await begin.isVisible()) await begin.click({ force: true });
  await expect(page.getByTestId("story")).toHaveAttribute("data-beat", "0");
  await page.getByTestId("story").click({ force: true });
  const talk = page.getByTestId("dialogue-scene");
  await expect(talk).toBeVisible();
  await expect(talk.locator('.dlg-actor[data-speaker="gloop"]')).toBeVisible();
  await expect(talk.locator('.dlg-actor[data-speaker="sarah"]')).toBeVisible();
  await expect(page.getByTestId("dialogue-caption")).toContainText(/Sarah|Gloop/, { timeout: 15_000 });
  await press(page, '[data-testid="dialogue-next"]');
  await expect(page.getByTestId("dialogue-caption")).toContainText("Gloop", { timeout: 15_000 });
  await press(page, '[data-testid="story-skip"]');
  await answering(page);
  expect(errors).toEqual([]);
});

test("level 1: tutorial with the pointing hand; first miss stretches the word into parts, second miss shows the worked chain; a round by tap, badge and level up", async ({ page }, info) => {
  const errors = collectErrors(page);
  await start(page);
  await answering(page);
  await expect(screen(page)).toHaveAttribute("data-exercise", "wg-meaning-unlock-tutorial");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await helperGone(page);
  await expect(page.getByTestId("hand-pointer")).toBeVisible({ timeout: 15_000 });
  // first miss: Gloop's hint, the wrong leaf greys out, the word stretches into un + lock with meaning cards
  await press(page, choice("lock-it-again"));
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(choice("lock-it-again"))).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(choice("lock-it-again"))).toHaveClass(/is-out/);
  await expect(page.getByTestId("parts")).toContainText("un-");
  await expect(page.getByTestId("parts")).toContainText("not, or undo");
  // second miss: the chain un + lock → not, or undo + lock → unlock: open the lock, and the right leaf glows
  await press(page, choice("lock-it-ahead-of-time"));
  await answering(page);
  await expect(page.getByTestId("model-chain")).toContainText("un + lock");
  await expect(page.getByTestId("model-chain")).toContainText("open the lock");
  await expect(page.locator(choice("open-the-lock"))).toHaveClass(/is-model/);
  await page.screenshot({ path: `test-results/screens/${info.project.name}-wg-model.png` });
  await press(page, choice("open-the-lock"));
  await nextExercise(page, "wg-meaning-unlock-tutorial");
  const modes = await playRest(page, "tap", 1);
  expect(modes).toEqual(expect.arrayContaining(["meaning", "build"]));
  await finish(page);
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("root-reader");
  expect(stored.progress.levels["wordroot-grove"]).toBe(1);
  expect(errors).toEqual([]);
});

test("level 3: word-class sorting and fitting, then two-affix building, a whole round by drag (tap-tap on touch)", async ({ page }) => {
  const errors = collectErrors(page);
  await start(page, 2);
  const how: How = (await touchy(page)) ? "tap" : "drag";
  await answering(page);
  const modes = await playRest(page, how);
  expect(modes).toEqual(expect.arrayContaining(["sort", "fit"]));
  await finish(page);
  expect(errors).toEqual([]);
});

test("level 1 build by drag, and level 7 and 9: context clues and apostrophes, whole rounds by keyboard", async ({ page }) => {
  const errors = collectErrors(page);
  await start(page, 6);
  await answering(page);
  const clues = await playRest(page, "keyboard");
  expect(clues).toEqual(expect.arrayContaining(["clueMeaning", "clueTap"]));
  await finish(page);
  await goLevel(page, 8);
  const marks = await playRest(page, "keyboard");
  expect(marks).toEqual(expect.arrayContaining(["owner", "apostrophe"]));
  await finish(page);
  // word building by drag at level 1 (part tiles onto the branch)
  if (!(await touchy(page))) {
    await goLevel(page, 0);
    let b = await readBoard(page);
    for (let i = 0; i < 6 && b.mode !== "build"; i++) {
      await give(page, b, "tap");
      await nextExercise(page, b.id);
      b = await readBoard(page);
    }
    expect(b.mode).toBe("build");
    await give(page, b, "drag");
    await nextExercise(page, b.id);
  }
  expect(errors).toEqual([]);
});

test("clue tapping: a wrong chunk is marked and greyed with the clue type named; the second miss lights the clues to finish", async ({ page }) => {
  const errors = collectErrors(page);
  await start(page, 6);
  await answering(page);
  await helperGone(page);
  let b = await readBoard(page);
  for (let i = 0; i < 6 && b.mode !== "clueTap"; i++) {
    await give(page, b, "tap");
    await nextExercise(page, b.id);
    b = await readBoard(page);
  }
  expect(b.mode).toBe("clueTap");
  const wrong = await missOnce(page, b);
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(choice(wrong))).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByTestId("rule")).toContainText("clue");
  await missOnce(page, b);
  await answering(page);
  for (const c of "chunks" in b ? b.chunks! : []) await expect(page.locator(choice(c))).toHaveClass(/is-model/);
  await expect(page.getByTestId("model-chain")).toBeVisible();
  await give(page, b, "tap");
  await nextExercise(page, b.id);
  expect(errors).toEqual([]);
});

test("every level is playable: three items at each of levels 1–10", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "one project is enough for the level sweep");
  const errors = collectErrors(page);
  const seen = new Set<string>();
  await seed(page, { muted: true, ageBand: "ages-9-11", progress: progressAt(0) });
  await page.goto("/play/wordroot-grove");
  for (let level = 0; level <= 9; level++) {
    await goLevel(page, level);
    await expect(page.getByTestId("level")).toContainText(String(level + 1));
    for (let i = 0; i < 3; i++) seen.add((await solve(page, "tap")).mode);
  }
  expect([...seen]).toEqual(expect.arrayContaining(["meaning", "sort", "build2", "rootmatch", "wordfor", "clueMeaning", "owner", "confused"]));
  expect(errors).toEqual([]);
});

test("layout: targets ≥ 44px, on screen and never overlapping at the four viewports, every mode; screenshots for review", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "viewports are set explicitly");
  test.setTimeout(480_000);
  const errors = collectErrors(page);
  const { mkdirSync } = await import("node:fs");
  mkdirSync(REVIEW, { recursive: true });
  const check = async (label: string) => {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(450);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1);
      expect(overflow, `${label} ${vp.name} overflow`).toBe(false);
      const sel = '[data-testid="choice"]:visible, [data-testid="slot"], [data-testid="done"], [data-testid="dock"], [data-testid="docked"], [data-testid="hear"], .wg-part';
      const boxes: { what: string; x: number; y: number; width: number; height: number }[] = [];
      for (const loc of await page.locator(sel).all()) {
        const box = await loc.boundingBox();
        if (!box || !(await loc.isVisible())) continue;
        const what = `${label} ${vp.name} ${await loc.getAttribute("data-testid")} ${await loc.getAttribute("data-value")}`;
        expect(Math.min(box.width, box.height), `${what} tap size`).toBeGreaterThanOrEqual(43.5);
        expect(box.x, `${what} left`).toBeGreaterThanOrEqual(-1);
        expect(box.y, `${what} top`).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width, `${what} right`).toBeLessThanOrEqual(vp.width + 1);
        expect(box.y + box.height, `${what} bottom`).toBeLessThanOrEqual(vp.height + 1);
        boxes.push({ what, ...box });
      }
      // nothing interactive overlaps anything else interactive, nor the mascot
      const mascot = await page.locator(".mascot-slot .critter, .mascot-slot svg").first().boundingBox().catch(() => null);
      if (mascot) boxes.push({ what: `${label} ${vp.name} mascot`, x: mascot.x + mascot.width * 0.15, y: mascot.y + mascot.height * 0.15, width: mascot.width * 0.7, height: mascot.height * 0.7 });
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const [a, b] = [boxes[i]!, boxes[j]!];
          const overlap = a.x < b.x + b.width - 2 && b.x < a.x + a.width - 2 && a.y < b.y + b.height - 2 && b.y < a.y + a.height - 2;
          expect(overlap, `${a.what} overlaps ${b.what}`).toBe(false);
        }
      // the board never covers the prompt pill, and the leaf never covers the answers
      const pill = await page.getByTestId("prompt").boundingBox();
      const top = await page.locator(".wg-top").boundingBox();
      const lower = await page.locator(".wg-lower").boundingBox();
      if (pill && top && top.x < pill.x + pill.width && top.x + top.width > pill.x) expect(top.y, `${label} ${vp.name} board under the prompt`).toBeGreaterThanOrEqual(pill.y + pill.height - 4);
      if (top && lower) {
        const ov = top.x < lower.x + lower.width - 2 && lower.x < top.x + top.width - 2 && top.y < lower.y + lower.height - 2 && lower.y < top.y + top.height - 2;
        expect(ov, `${label} ${vp.name} leaf overlaps answers`).toBe(false);
      }
      await page.screenshot({ path: `${REVIEW}/${label}-${vp.name}.png` });
    }
    await page.setViewportSize({ width: 1280, height: 800 });
  };
  /** Play correctly until the mode is on screen (the in-round order follows difficulty, not index). */
  const toMode = async (mode: string) => {
    for (let i = 0; i < 7; i++) {
      const b = await readBoard(page);
      if (b.mode === mode) return b;
      // one miss first on choice items, so the round doesn't step up a level before the wanted mode (R2)
      if ("value" in b && b.value) {
        await missOnce(page, b);
        await answering(page);
      }
      await give(page, b, "tap");
      await nextExercise(page, b.id);
      if ((await screen(page).count()) === 0) return null;
    }
    return null;
  };

  // story beats at each viewport
  await seed(page, { muted: true, ageBand: "ages-9-11", progress: progressAt(0) });
  await page.goto("/play/wordroot-grove");
  const begin = page.getByTestId("story-begin");
  await begin.or(page.getByTestId("story-skip")).first().waitFor({ timeout: 20_000 });
  if (await begin.isVisible()) await begin.click({ force: true });
  await page.waitForTimeout(900);
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${REVIEW}/story-${vp.name}.png` });
  }
  await page.setViewportSize({ width: 1280, height: 800 });
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
  await check("play-L1-meaning");
  // first miss (stretch) and second miss (chain) on the tutorial
  await press(page, choice("lock-it-again"));
  await answering(page);
  await helperGone(page);
  await check("miss1-L1-meaning");
  await press(page, choice("lock-it-ahead-of-time"));
  await answering(page);
  await check("miss2-L1-meaning");
  for (const [level, mode] of [[0, "build"], [1, "meaning"], [2, "sort"], [2, "fit"], [3, "build2"], [3, "family"], [4, "rootmatch"], [4, "rootmeaning"], [5, "wordfor"], [5, "rootcontext"], [6, "clueMeaning"], [7, "clueTap"], [7, "clueMeaning"], [8, "owner"], [8, "apostrophe"], [9, "confused"]] as const) {
    await goLevel(page, level);
    const b = await toMode(mode);
    if (!b) continue;
    await check(`play-L${level + 1}-${mode}`);
    if (level === 7 && mode === "clueMeaning" && "value" in b) {
      await missOnce(page, b);
      await answering(page);
      await helperGone(page);
      await check(`miss1-L${level + 1}-${mode}`);
    }
    if (level === 2 && mode === "sort" && "pairs" in b && b.pairs) {
      // a wrong sort, then the model (frames)
      for (let r = 0; r < 2; r++) {
        for (const [i, [c]] of b.pairs.entries()) {
          if (!(await page.locator(choice(c)).count())) continue; // right after the first miss: stays on its branch
          await press(page, choice(c));
          await press(page, `[data-testid="dock"][data-value="${b.pairs[(i + 1) % b.pairs.length]![1]}"]`);
        }
        await press(page, '[data-testid="done"]');
        await answering(page);
        await helperGone(page);
      }
      await check(`miss2-L${level + 1}-${mode}`);
    }
  }
  // reward after a level-2 round by tap
  await goLevel(page, 1);
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
  await start(page);
  await answering(page);
  await helperGone(page);
  await press(page, choice("lock-it-again"));
  await answering(page);
  const anim = await page.locator(".wg-part").first().evaluate((el) => getComputedStyle(el).animationName);
  expect(anim).toBe("none");
  await press(page, choice("lock-it-ahead-of-time"));
  await answering(page);
  const model = page.locator(choice("open-the-lock"));
  expect(await model.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  expect(await model.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(REVIEW, { recursive: true });
  await page.screenshot({ path: `${REVIEW}/reduced-motion-1280x800.png` });
});
