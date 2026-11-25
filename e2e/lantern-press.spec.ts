import { type Page, expect, test } from "@playwright/test";
import { ARTICLES, ENOUGH, STRONGEST } from "../src/games/lantern-press/articles";
import { TUTORIAL_ITEM, optId } from "../src/games/lantern-press/logic";
import { COMBINE, CONCISE, CONNECTIVES, CUTS, MODIFIERS, ORDERS, PRONOUNS, PURPOSES, SHIFTS } from "../src/games/lantern-press/sentences";
import { CONNOTE, DEVICE_LABEL, FIG_LINES, WORD_GROUPS } from "../src/games/lantern-press/words";
import { collectErrors, press, reviewDir, screen, seed, whenReady } from "./helpers";

/**
 * The Lantern Press: story (boathouse beat + Sarah/Hoot DialogueScene) → rounds by tap, drag and keyboard (REAL Tab
 * and Enter presses, focus never lost) → miss ladder (Hoot's strategy + grey-out, then the worked steps + the marked
 * answer) → outro → Editor's Pen + level up; every level playable; layout at the four viewports with an overlap
 * check (screenshots in reviewDir("lantern-press")). The solver reads what the editor sees (the board's mode, the
 * cards) plus the content banks, never the answer key.
 */
type How = "tap" | "drag" | "keyboard";
const REVIEW = reviewDir("lantern-press");
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "915x412", width: 915, height: 412 },
  { name: "1024x1366", width: 1024, height: 1366 },
  { name: "1280x800", width: 1280, height: 800 },
];
const progressAt = (level: number) => ({ v: 1, stickers: [], roundsCompleted: 0, skills: {}, levels: { "lantern-press": level } });
const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
const helperGone = (page: Page) => page.getByTestId("helper").waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
const choice = (v: string) => `[data-testid="choice"][data-value="${v}"]`;
const touchy = (page: Page) => page.evaluate(() => matchMedia("(pointer: coarse)").matches);

async function skipStory(page: Page) {
  const begin = page.getByTestId("story-begin");
  const skip = page.locator('[data-testid="story-skip"], [data-testid="start-game"]').first();
  await begin.or(skip).first().waitFor({ state: "visible", timeout: 20_000 });
  if (await begin.isVisible()) await begin.click({ force: true });
  await skip.waitFor({ state: "visible", timeout: 20_000 });
  await skip.click({ force: true });
}
async function start(page: Page, level?: number) {
  await seed(page, level === undefined ? { muted: true, ageBand: "ages-12-14" } : { muted: true, ageBand: "ages-12-14", progress: progressAt(level) });
  await page.goto("/play/lantern-press");
  await skipStory(page);
}
async function goLevel(page: Page, level: number) {
  await page.evaluate((lv) => {
    const s = JSON.parse(localStorage.getItem("bz.v1")!);
    s.progress.levels = { "lantern-press": lv };
    s.round = null;
    localStorage.setItem("bz.v1", JSON.stringify(s));
  }, level);
  await page.reload();
  await skipStory(page);
  await answering(page);
  await helperGone(page);
}

// ---------------------------------------------------------------- reading the board
const keyOf = (id: string) => id.replace(/^lp-[a-z]+-/, "").replace(/-(r\d-)?l\dn\d$|-tutorial$/, "");
/** What the right answer is, worked out from the board's mode, the cards on screen and the content banks. */
async function readBoard(page: Page) {
  await answering(page);
  const id = (await screen(page).getAttribute("data-exercise"))!;
  const mode = (await page.getByTestId("lp-board").getAttribute("data-mode"))!;
  const k = keyOf(id);
  const find = <T extends { id: string }>(bank: readonly T[]) => bank.find((x) => x.id === k)!;
  const v = (t: string) => ({ id, mode, value: optId(t) });
  switch (mode) {
    case "connective": return v(id.endsWith("-tutorial") ? TUTORIAL_ITEM.answer : find(CONNECTIVES).answer);
    case "combine": return v(find(COMBINE).answer);
    case "modFix": return v(find(MODIFIERS).fix);
    case "pronFix": return v(find(PRONOUNS).fix);
    case "concise": return v(find(CONCISE).answer);
    case "connote": {
      const n = find(CONNOTE);
      return v(WORD_GROUPS.find((g) => g.id === n.group)![n.want]);
    }
    case "device": return v(DEVICE_LABEL[find(FIG_LINES).device]);
    case "figMeaning": return v(find(FIG_LINES).meaning);
    case "purpose": return v(find(PURPOSES).answer);
    case "shift": return v(find(SHIFTS).answer);
    case "strongest": return v(find(STRONGEST).answer);
    case "enough": return v(find(ENOUGH).answer);
    case "order": return { id, mode, texts: [...find(ORDERS).cards] };
    case "modTap": return { id, mode, chunks: [`c${find(MODIFIERS).wrong}`] };
    case "pronTap": return { id, mode, chunks: find(PRONOUNS).vague.map((i) => `c${i}`) };
    case "cutTap": return { id, mode, chunks: find(CUTS).cut.map((i) => `c${i}`) };
    case "evidenceTap": return { id, mode, chunks: find(ARTICLES).sentences.flatMap((s, i) => (s.role === "evidence" ? [`s${i}`] : [])) };
    case "offTap": return { id, mode, chunks: [`s${find(ARTICLES).sentences.findIndex((s) => s.role === "none")}`] };
    case "claimSort": return { id, mode, pairs: find(ARTICLES).sentences.map((s, i) => [`s${i}`, s.role] as const) };
    default: {
      // feelSort: each word card to its feeling
      const cards = await page.locator('.lp-cards [data-testid="choice"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-value")!));
      const feel = (w: string) => {
        const g = WORD_GROUPS.find((x) => [x.positive, x.neutral, x.negative].includes(w))!;
        return g.positive === w ? "positive" : g.negative === w ? "negative" : "neutral";
      };
      return { id, mode, pairs: cards.map((c) => [c, feel(c)] as const) };
    }
  }
}
type Board = Awaited<ReturnType<typeof readBoard>>;

// ---------------------------------------------------------------- acting on it
async function dragTo(page: Page, from: string, to: string) {
  const src = page.locator(from).first();
  await whenReady(src);
  const a = (await src.boundingBox())!;
  const b = (await page.locator(to).first().boundingBox())!;
  const [sx, sy, tx, ty] = [a.x + a.width / 2, a.y + a.height / 2, b.x + b.width / 2, b.y + b.height / 2];
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(sx + ((tx - sx) * i) / 12, sy + ((ty - sy) * i) / 12);
  await page.mouse.up();
}
/** Where the focus is (QA standard: never on <body>, never hidden, never outside the game). */
const active = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return {
      tag: el?.tagName ?? "", testid: el?.getAttribute("data-testid") ?? "", value: el?.getAttribute("data-value") ?? "", text: el?.getAttribute("data-text") ?? "",
      disabled: el?.getAttribute("aria-disabled") === "true", inCards: !!el?.closest(".lp-cards"), label: el?.getAttribute("data-label") ?? "",
      visible: !!el && el !== document.body && el.checkVisibility({ visibilityProperty: true } as never),
    };
  });
type Active = Awaited<ReturnType<typeof active>>;
/** Press the REAL Tab key until the focus satisfies `ok`. */
async function tabTo(page: Page, ok: (a: Active) => boolean, max = 70) {
  for (let i = 0; i < max; i++) {
    const a = await active(page);
    if (ok(a)) return a;
    await page.keyboard.press("Tab");
  }
  throw new Error(`never reached by Tab; last: ${JSON.stringify(await active(page))}`);
}
const live = (a: Active) => a.visible && !a.disabled;

async function tileIds(page: Page, texts: readonly string[]) {
  const tiles = await page.locator('.lp-tiles [data-testid="choice"]').evaluateAll((els) => els.map((e) => ({ id: e.getAttribute("data-value")!, text: e.getAttribute("data-text")! })));
  return texts.map((t) => tiles.find((x) => x.text === t)!.id);
}

/** Solve the board. Keyboard = Tab + Enter only; `lost` collects any moment the focus is lost. */
async function give(page: Page, b: Board, how: How, lost: string[] = []) {
  const note = async (where: string) => {
    if (how !== "keyboard") return;
    await page.waitForTimeout(150);
    const a = await active(page);
    if (!a.visible) lost.push(`${b.id} ${where}: ${JSON.stringify(a)}`);
  };
  if ("value" in b && b.value) {
    if (how === "keyboard") {
      await whenReady(page.locator(choice(b.value)));
      await tabTo(page, (a) => live(a) && a.testid === "choice" && a.value === b.value);
      await page.keyboard.press("Enter");
    } else if (how === "drag") await dragTo(page, choice(b.value), '[data-testid="proof"]');
    else await press(page, choice(b.value));
    return;
  }
  if ("texts" in b && b.texts) {
    const ids = await tileIds(page, b.texts);
    for (let i = 0; i < ids.length; i++) {
      if (how === "keyboard") {
        await tabTo(page, (a) => live(a) && a.testid === "choice" && a.value === ids[i]);
        await page.keyboard.press("Enter");
        await note(`after card ${i}`);
      } else if (how === "drag") await dragTo(page, choice(ids[i]!), `[data-testid="slot"][data-slot="${i}"]`);
      else await press(page, choice(ids[i]!));
      await expect(page.locator(`[data-testid="slot"][data-slot="${i}"]`)).toHaveAttribute("data-filled", "true");
    }
  } else if ("chunks" in b && b.chunks) {
    for (const c of b.chunks) {
      if (how === "keyboard") {
        await tabTo(page, (a) => live(a) && a.testid === "choice" && a.value === c);
        await page.keyboard.press("Enter");
        await note(`after part ${c}`);
      } else await press(page, choice(c));
      await expect(page.locator(choice(c))).toHaveAttribute("aria-pressed", "true");
    }
  } else if ("pairs" in b && b.pairs) {
    for (const [c, bin] of b.pairs) {
      if (how === "keyboard") {
        await tabTo(page, (a) => live(a) && a.testid === "choice" && a.inCards && a.value === c);
        await page.keyboard.press("Enter");
        await note(`after picking ${c}`);
        await tabTo(page, (a) => a.testid === "dock" && a.value === bin);
        await page.keyboard.press("Enter");
        await note(`after labelling ${c}`);
      } else if (how === "drag") await dragTo(page, choice(c), `[data-testid="dock"][data-value="${bin}"]`);
      else {
        await press(page, choice(c));
        await press(page, `[data-testid="dock"][data-value="${bin}"]`);
      }
      await expect(page.locator(choice(c))).toHaveAttribute("data-label", bin);
    }
  }
  if (how === "keyboard") {
    await tabTo(page, (a) => a.testid === "done" && !a.disabled);
    await page.keyboard.press("Enter");
  } else await press(page, '[data-testid="done"]');
}

async function nextExercise(page: Page, prev: string) {
  await expect
    .poll(async () => ((await screen(page).count()) === 0 ? "round-over" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 40_000 })
    .not.toBe(prev);
}
async function solve(page: Page, how: How, lost: string[] = [], strict = false) {
  const b = await readBoard(page);
  if (how === "keyboard") {
    await helperGone(page);
    await page.waitForTimeout(250);
    // after the first keyboard answer, every new item must start with the focus on a visible control
    const a = await active(page);
    if (strict && !a.visible) lost.push(`${b.id} at start: ${JSON.stringify(a)}`);
  }
  await give(page, b, how, lost);
  await expect(screen(page)).toHaveAttribute("data-phase", /feedback|solved/, { timeout: 15_000 });
  await nextExercise(page, b.id);
  return b;
}
async function playRest(page: Page, how: How, from = 0, lost: string[] = []) {
  const modes: string[] = [];
  for (let i = from; i < 8; i++) {
    if (i === 0) await helperGone(page);
    modes.push((await solve(page, how, lost, i > from)).mode);
  }
  return modes;
}
async function finish(page: Page) {
  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Editor's Pen" })).toBeVisible();
}
/** A wrong answer for the current board: a distractor slip, a wrong part, or wrong labels. */
async function missOnce(page: Page, b: Board) {
  if ("value" in b && b.value) {
    const wrong = await page.locator(`[data-testid="choice"]:not([data-value="${b.value}"]):not([aria-disabled="true"])`).first().getAttribute("data-value");
    await press(page, choice(wrong!));
    return wrong!;
  }
  if ("chunks" in b && b.chunks) {
    const wrong = await page.locator('[data-testid="choice"]:not([aria-disabled="true"])').evaluateAll((els, right) => els.map((e) => e.getAttribute("data-value")!).filter((x) => !right.includes(x)), b.chunks);
    for (const c of b.chunks) if ((await page.locator(choice(c)).getAttribute("aria-pressed")) === "true") await press(page, choice(c));
    await press(page, choice(wrong[0]!));
    await press(page, '[data-testid="done"]');
    return wrong[0]!;
  }
  if ("pairs" in b && b.pairs) {
    const targets = [...new Set(b.pairs.map(([, t]) => t))];
    for (const [c, t] of b.pairs) {
      if ((await page.locator(choice(c)).getAttribute("data-label")) === t) continue; // kept from an earlier miss
      await press(page, choice(c));
      await press(page, `[data-testid="dock"][data-value="${targets.find((x) => x !== t)}"]`);
    }
    await press(page, '[data-testid="done"]');
    return "";
  }
  throw new Error(`no miss helper for ${b.mode}`);
}
/** Play until a mode is on screen (one miss on each item first, so the round never steps up past the wanted level). */
async function toMode(page: Page, mode: string, tries = 10) {
  for (let i = 0; i < tries; i++) {
    const b = await readBoard(page);
    if (b.mode === mode) return b;
    if (!("texts" in b && b.texts)) {
      await missOnce(page, b);
      await answering(page);
      await helperGone(page);
    }
    await give(page, b, "tap");
    await nextExercise(page, b.id);
    if ((await screen(page).count()) === 0) return null;
  }
  return null;
}

// ================================================================ tests
test("story: boathouse beat, then Sarah introduces Hoot on the first visit; Skip skips it all", async ({ page }) => {
  const errors = collectErrors(page);
  await seed(page, { muted: true, ageBand: "ages-12-14" });
  await page.goto("/play/lantern-press");
  const begin = page.getByTestId("story-begin");
  await begin.or(page.getByTestId("story-skip")).first().waitFor({ timeout: 20_000 });
  if (await begin.isVisible()) await begin.click({ force: true });
  await expect(page.getByTestId("story")).toHaveAttribute("data-beat", "0");
  await page.getByTestId("story").click({ force: true });
  const talk = page.getByTestId("dialogue-scene");
  await expect(talk).toBeVisible();
  await expect(talk.locator('.dlg-actor[data-speaker="hoot"]')).toBeVisible();
  await expect(talk.locator('.dlg-actor[data-speaker="sarah"]')).toBeVisible();
  await expect(page.getByTestId("dialogue-caption")).toContainText("Sarah", { timeout: 15_000 });
  await press(page, '[data-testid="dialogue-next"]');
  await expect(page.getByTestId("dialogue-caption")).toContainText("Hoot, our fact-checker", { timeout: 15_000 });
  await press(page, '[data-testid="story-skip"]');
  await answering(page);
  expect(errors).toEqual([]);
});

test("level 1: tutorial with the pointing hand; first miss greys the pick and shows Hoot's strategy, second miss shows the worked steps; a round by tap, Editor's Pen and level up", async ({ page }, info) => {
  const errors = collectErrors(page);
  await start(page);
  await answering(page);
  await expect(screen(page)).toHaveAttribute("data-exercise", "lp-connective-cafe-tutorial");
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await helperGone(page);
  await expect(page.getByTestId("hand-pointer")).toBeVisible({ timeout: 15_000 });
  // first miss: "so" reverses cause and effect → Hoot's hint, the slip greys out, a strategy note
  await press(page, choice(optId("so")));
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(choice(optId("so")))).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(choice(optId("so")))).toHaveClass(/is-out/);
  await expect(page.getByTestId("rule")).toContainText("direction");
  // second miss: the worked steps (a reason → because) and the marked answer
  await press(page, choice(optId("although")));
  await answering(page);
  await expect(page.getByTestId("model-chain")).toContainText("a reason → because");
  await expect(page.locator(choice(optId("because")))).toHaveClass(/is-model/);
  await page.screenshot({ path: `test-results/screens/${info.project.name}-lp-model.png` });
  await press(page, choice(optId("because")));
  await nextExercise(page, "lp-connective-cafe-tutorial");
  const modes = await playRest(page, "tap", 1);
  expect(modes).toEqual(expect.arrayContaining(["connective"]));
  await finish(page);
  await expect(page.getByTestId("level-up")).toContainText("Level up");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("editors-pen");
  expect(stored.progress.levels["lantern-press"]).toBe(1);
  expect(errors).toEqual([]);
});

test("level 2: combining sentences and clause cards, a whole round by drag (tap-tap on touch)", async ({ page }) => {
  const errors = collectErrors(page);
  await start(page, 1);
  const how: How = (await touchy(page)) ? "tap" : "drag";
  await answering(page);
  const modes = await playRest(page, how);
  expect(modes).toEqual(expect.arrayContaining(["combine", "order"]));
  await finish(page);
  expect(errors).toEqual([]);
});

test("level 9: an article round by drag (labels) and tap (evidence)", async ({ page }) => {
  const errors = collectErrors(page);
  await start(page, 8);
  const how: How = (await touchy(page)) ? "tap" : "drag";
  await answering(page);
  const modes = await playRest(page, how);
  expect(modes).toEqual(expect.arrayContaining(["evidenceTap", "claimSort"]));
  await finish(page);
  expect(errors).toEqual([]);
});

for (const level of [1, 2, 4, 8]) {
  test(`keyboard only (real Tab + Enter): a whole level-${level + 1} round, focus never lost`, async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "keyboard path");
    test.setTimeout(300_000);
    const errors = collectErrors(page);
    await start(page, level);
    const lost: string[] = [];
    const modes = await playRest(page, "keyboard", 0, lost);
    test.info().annotations.push({ type: "modes", description: modes.join(",") });
    await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
    expect(lost).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("tapping parts: a wrong part is greyed with a strategy; the second miss marks the right parts and shows the steps", async ({ page }) => {
  const errors = collectErrors(page);
  await start(page, 2);
  await answering(page);
  await helperGone(page);
  const b = await toMode(page, "modTap");
  expect(b?.mode).toBe("modTap");
  const wrong = await missOnce(page, b!);
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  await answering(page);
  await expect(page.locator(choice(wrong))).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByTestId("rule")).toContainText("next to the word it describes");
  await missOnce(page, b!);
  await answering(page);
  for (const c of "chunks" in b! ? b.chunks! : []) await expect(page.locator(choice(c))).toHaveClass(/is-model/);
  await expect(page.getByTestId("model-chain")).toContainText("Read literally");
  await give(page, b!, "tap");
  await nextExercise(page, b!.id);
  expect(errors).toEqual([]);
});

test("labelling an article: the first miss keeps the right labels and shows what each label means; the second labels all but one", async ({ page }) => {
  const errors = collectErrors(page);
  await start(page, 8);
  await answering(page);
  await helperGone(page);
  const b = await toMode(page, "claimSort");
  expect(b?.mode).toBe("claimSort");
  await missOnce(page, b!);
  await answering(page);
  await helperGone(page);
  await expect(page.locator(".lp-bin-hint").first()).toBeVisible();
  await missOnce(page, b!);
  await answering(page);
  const labeled = await page.locator('.lp-cards [data-testid="choice"][data-label]').count();
  expect(labeled).toBe(4);
  await expect(page.locator(".lp-card.is-model")).toHaveCount(1);
  await expect(page.locator(".lp-bin.is-model")).toHaveCount(1);
  // the model labels every sentence but the last; the editor labels that one
  const [c, t] = "pairs" in b! ? b.pairs![b.pairs!.length - 1]! : ["", ""];
  await press(page, choice(c));
  await press(page, `[data-testid="dock"][data-value="${t}"]`);
  await press(page, '[data-testid="done"]');
  await nextExercise(page, b!.id);
  expect(errors).toEqual([]);
});

test("every level is playable: three items at each of levels 1–10", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "one project is enough for the level sweep");
  const errors = collectErrors(page);
  const seen = new Set<string>();
  await seed(page, { muted: true, ageBand: "ages-12-14", progress: progressAt(0) });
  await page.goto("/play/lantern-press");
  for (let level = 0; level <= 9; level++) {
    await goLevel(page, level);
    await expect(page.getByTestId("level")).toContainText(String(level + 1));
    for (let i = 0; i < 3; i++) seen.add((await solve(page, "tap")).mode);
  }
  expect([...seen]).toEqual(expect.arrayContaining(["connective", "combine", "modTap", "pronTap", "cutTap", "connote", "device", "purpose", "evidenceTap", "strongest"]));
  expect(errors).toEqual([]);
});

test("layout: targets ≥ 44px, on screen and never overlapping at the four viewports, every mode; screenshots for review", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "viewports are set explicitly");
  test.setTimeout(600_000);
  const errors = collectErrors(page);
  const { mkdirSync } = await import("node:fs");
  mkdirSync(REVIEW, { recursive: true });
  /** While Hoot's bubble shows: it never covers the prompt pill, its speaker button or any control, and the speaker button stays clickable. */
  const helperClear = async (label: string) => {
    const helper = page.getByTestId("helper");
    if (!(await helper.isVisible().catch(() => false))) return false;
    const hb = await helper.boundingBox();
    if (!hb) return false;
    const hit = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
      a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;
    const pill = await page.getByTestId("prompt").boundingBox();
    const replay = await page.getByTestId("replay").boundingBox();
    if (pill) expect.soft(hit(hb, pill), `${label}: helper covers the prompt pill`).toBe(false);
    if (replay) expect.soft(hit(hb, replay), `${label}: helper covers the speaker button`).toBe(false);
    for (const loc of await page.locator('[data-testid="choice"]:visible, [data-testid="done"], [data-testid="dock"], [data-testid="hear"], [data-testid="slot"]').all()) {
      const b = await loc.boundingBox();
      if (b) expect.soft(hit(hb, b), `${label}: helper covers ${await loc.getAttribute("data-testid")} ${await loc.getAttribute("data-value")}`).toBe(false);
    }
    const clickable = await page.getByTestId("replay").evaluate((btn) => {
      const r = btn.getBoundingClientRect();
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!el && (el === btn || btn.contains(el));
    });
    expect.soft(clickable, `${label}: speaker button clickable`).toBe(true);
    return true;
  };
  const check = async (label: string) => {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(450);
      await helperClear(`${label} ${vp.name}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1);
      expect.soft(overflow, `${label} ${vp.name} overflow`).toBe(false);
      const sel = '[data-testid="choice"]:visible, [data-testid="slot"], [data-testid="done"], [data-testid="dock"], [data-testid="hear"]';
      const boxes: { what: string; x: number; y: number; width: number; height: number }[] = [];
      for (const loc of await page.locator(sel).all()) {
        const box = await loc.boundingBox();
        if (!box || !(await loc.isVisible())) continue;
        const what = `${label} ${vp.name} ${await loc.getAttribute("data-testid")} ${await loc.getAttribute("data-value")}`;
        expect.soft(Math.min(box.width, box.height), `${what} tap size`).toBeGreaterThanOrEqual(43.5);
        expect.soft(box.x, `${what} left`).toBeGreaterThanOrEqual(-1);
        expect.soft(box.y, `${what} top`).toBeGreaterThanOrEqual(-1);
        expect.soft(box.x + box.width, `${what} right`).toBeLessThanOrEqual(vp.width + 1);
        expect.soft(box.y + box.height, `${what} bottom`).toBeLessThanOrEqual(vp.height + 1);
        boxes.push({ what, ...box });
      }
      // nothing interactive overlaps anything else interactive, nor the mascot
      const mascot = await page.locator(".mascot-slot .critter, .mascot-slot svg").first().boundingBox().catch(() => null);
      if (mascot) boxes.push({ what: `${label} ${vp.name} mascot`, x: mascot.x + mascot.width * 0.15, y: mascot.y + mascot.height * 0.15, width: mascot.width * 0.7, height: mascot.height * 0.7 });
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const [a, b] = [boxes[i]!, boxes[j]!];
          const overlap = a.x < b.x + b.width - 2 && b.x < a.x + a.width - 2 && a.y < b.y + b.height - 2 && b.y < a.y + a.height - 2;
          expect.soft(overlap, `${a.what} overlaps ${b.what}`).toBe(false);
        }
      // the board never covers the prompt pill, and the proof never covers the answers
      const pill = await page.getByTestId("prompt").boundingBox();
      const top = await page.locator(".lp-top").boundingBox();
      const lower = await page.locator(".lp-lower").boundingBox();
      if (pill && top && top.x < pill.x + pill.width && top.x + top.width > pill.x) expect.soft(top.y, `${label} ${vp.name} board under the prompt`).toBeGreaterThanOrEqual(pill.y + pill.height - 4);
      if (top && lower) {
        const ov = top.x < lower.x + lower.width - 2 && lower.x < top.x + top.width - 2 && top.y < lower.y + lower.height - 2 && lower.y < top.y + top.height - 2;
        expect.soft(ov, `${label} ${vp.name} proof overlaps answers`).toBe(false);
      }
      await page.screenshot({ path: `${REVIEW}/${label}-${vp.name}.png` });
    }
    await page.setViewportSize({ width: 1280, height: 800 });
  };

  // (soft expectations: every viewport and mode is checked and photographed, then all problems are reported)
  // story beats at each viewport
  await seed(page, { muted: true, ageBand: "ages-12-14", progress: progressAt(0) });
  await page.goto("/play/lantern-press");
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
  // Hoot explains at round start: his bubble must leave the prompt and its speaker button clear at every viewport
  await expect(page.getByTestId("helper")).toBeVisible({ timeout: 20_000 });
  let shown = 0;
  for (const vp of VIEWPORTS) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(250);
    if (await helperClear(`helper-start ${vp.name}`)) shown++;
    await page.screenshot({ path: `${REVIEW}/helper-start-${vp.name}.png` });
  }
  expect(shown, "helper seen while checking").toBeGreaterThan(0);
  await page.setViewportSize({ width: 1280, height: 800 });
  await helperGone(page);
  await check("play-L1-connective");
  await press(page, choice(optId("so")));
  await answering(page);
  await helperGone(page);
  await check("miss1-L1-connective");
  await press(page, choice(optId("although")));
  await answering(page);
  await check("miss2-L1-connective");
  const MODES = [
    [1, "combine"], [1, "order"], [2, "modTap"], [2, "modFix"], [3, "pronTap"], [3, "pronFix"], [4, "cutTap"], [4, "concise"], [5, "connote"], [5, "feelSort"],
    [6, "device"], [6, "figMeaning"], [7, "purpose"], [7, "shift"], [8, "evidenceTap"], [8, "claimSort"], [9, "strongest"], [9, "offTap"], [9, "enough"],
  ] as const;
  let missHelpers = 0;
  for (const [level, mode] of MODES) {
    await goLevel(page, level);
    const b = await toMode(page, mode);
    if (!b) continue;
    await check(`play-L${level + 1}-${mode}`);
    if (["order", "claimSort", "combine", "pronFix", "enough", "feelSort", "strongest"].includes(mode)) {
      // first miss (strategy) and second miss (worked steps / model) on the densest boards
      if (mode === "order" && "texts" in b) {
        const ids = await tileIds(page, [...b.texts!].reverse());
        for (const id of ids) await press(page, choice(id));
        await press(page, '[data-testid="done"]');
      } else await missOnce(page, b);
      // Hoot's first-miss strategy on a large landscape screen (the one place his bubble floats)
      if (await page.getByTestId("helper").waitFor({ state: "visible", timeout: 10_000 }).then(() => true).catch(() => false)) {
        await helperClear(`helper-miss1-L${level + 1}-${mode} 1280x800`);
        await page.screenshot({ path: `${REVIEW}/helper-miss1-L${level + 1}-${mode}-1280x800.png` });
        missHelpers++;
      }
      await answering(page);
      await helperGone(page);
      await check(`miss1-L${level + 1}-${mode}`);
      if (mode === "order") {
        // fill the rest wrongly again (reverse of what is free), then check
        const free = await page.locator('.lp-tiles [data-testid="choice"]:not([aria-disabled="true"])').evaluateAll((els) => els.map((e) => e.getAttribute("data-value")!));
        const empty = await page.locator('[data-testid="slot"][data-filled="false"]').count();
        for (const id of free.reverse().slice(0, empty)) await press(page, choice(id));
        if ((await page.locator('[data-testid="slot"][data-filled="false"]').count()) === 0) await press(page, '[data-testid="done"]');
      } else await missOnce(page, b);
      await answering(page);
      await page.waitForTimeout(1500);
      await check(`miss2-L${level + 1}-${mode}`);
    }
  }
  expect(missHelpers, "first-miss helper bubbles checked").toBeGreaterThan(0);
  // reward after a level-1 round by tap
  await goLevel(page, 0);
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
  await press(page, choice(optId("so")));
  await answering(page);
  await press(page, choice(optId("although")));
  await answering(page);
  const model = page.locator(choice(optId("because")));
  expect(await model.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  expect(await model.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("solid");
  const { mkdirSync } = await import("node:fs");
  mkdirSync(REVIEW, { recursive: true });
  await page.screenshot({ path: `${REVIEW}/reduced-motion-1280x800.png` });
});
