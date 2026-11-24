import { type Page, expect, test } from "@playwright/test";
import { APOSTROPHE_SENTENCES, CONFUSED_ITEMS, OWNER_PICTURES, ownerPhrases } from "../src/games/wordroot-grove/grammar";
import { slug } from "../src/games/wordroot-grove/logic";
import { CLASS_WORDS, FAMILY_ITEMS, FIT_ITEMS, PREFIX_WORDS, SUFFIX_WORDS, TWO_AFFIX_WORDS } from "../src/games/wordroot-grove/morphology";
import { ALL_PASSAGES } from "../src/games/wordroot-grove/passages";
import { GREEK_WORDS, ROOT, ROOT_CONTEXT, WORD_FOR } from "../src/games/wordroot-grove/roots";
import { screen, seed } from "./helpers";

/**
 * QA review (independent): Wordroot Grove played with REAL Tab / Enter presses only (no programmatic .focus() between
 * steps, unlike wordroot-grove.spec.ts), recording every moment focus is lost (on <body>, hidden, or outside the game).
 */
const progressAt = (level: number) => ({ v: 1, stickers: [], roundsCompleted: 0, skills: {}, levels: { "wordroot-grove": level } });
const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
const active = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return {
      tag: el?.tagName ?? "", testid: el?.getAttribute("data-testid") ?? "", value: el?.getAttribute("data-value") ?? "", text: el?.getAttribute("data-text") ?? "",
      disabled: el?.getAttribute("aria-disabled") === "true", inCards: !!el?.closest(".wg-cards"),
      visible: !!el && el !== document.body && el.checkVisibility({ visibilityProperty: true } as never),
    };
  });
type Active = Awaited<ReturnType<typeof active>>;
async function tabTo(page: Page, ok: (a: Active) => boolean, max = 60) {
  for (let i = 0; i < max; i++) {
    const a = await active(page);
    if (ok(a)) return a;
    await page.keyboard.press("Tab");
  }
  throw new Error(`never reached by Tab; last: ${JSON.stringify(await active(page))}`);
}
async function start(page: Page, level: number) {
  await seed(page, { muted: true, ageBand: "ages-9-11", progress: progressAt(level) });
  await page.goto("/play/wordroot-grove");
  const begin = page.getByTestId("story-begin");
  const skip = page.locator('[data-testid="story-skip"], [data-testid="start-game"]').first();
  await begin.or(skip).first().waitFor({ state: "visible", timeout: 20_000 });
  if (await begin.isVisible()) {
    await begin.focus();
    await page.keyboard.press("Enter");
  }
  await skip.waitFor({ state: "visible", timeout: 20_000 });
  await tabTo(page, (a) => a.testid === "story-skip" || a.testid === "start-game");
  await page.keyboard.press("Enter");
}
async function board(page: Page) {
  await answering(page);
  await page.getByTestId("helper").waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
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
    case "sort":
    case "rootmatch": {
      const cards = await page.locator('.wg-cards [data-testid="choice"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-value")!));
      return { id, mode, pairs: cards.map((c) => [c, mode === "sort" ? CLASS_WORDS.find((w) => w.word === c)!.cls : slug(ROOT[c]!.meaning)] as const) };
    }
    case "owner": {
      const [owner, n] = k.split("-") as [string, string];
      return { id, mode, value: slug(ownerPhrases(OWNER_PICTURES.find((o) => o.id === owner)!, n === "many")[0].text) };
    }
    case "apostrophe": return { id, mode, value: slug(APOSTROPHE_SENTENCES.find((x) => x.id === k)!.answer) };
    case "confused": return { id, mode, value: slug(CONFUSED_ITEMS.find((x) => x.id === k)!.answer) };
    default: return { id, mode };
  }
}
type B = Awaited<ReturnType<typeof board>>;

async function kbSolve(page: Page, b: B, lost: string[]) {
  const note = async (where: string) => {
    await page.waitForTimeout(160);
    const a = await active(page);
    if (!a.visible) lost.push(`${b.id} ${where}: ${JSON.stringify(a)}`);
  };
  const live = (a: Active) => a.visible && !a.disabled;
  if ("value" in b && b.value) {
    await tabTo(page, (a) => live(a) && a.testid === "choice" && a.value === b.value);
    await page.keyboard.press("Enter");
  } else if ("texts" in b && b.texts) {
    for (const t of b.texts) {
      await tabTo(page, (a) => live(a) && a.testid === "choice" && a.text === t);
      await page.keyboard.press("Enter");
      await note(`after tile ${t}`);
    }
    await tabTo(page, (a) => a.testid === "done" && !a.disabled);
    await page.keyboard.press("Enter");
  } else if ("chunks" in b && b.chunks) {
    for (const c of b.chunks) {
      await tabTo(page, (a) => live(a) && a.testid === "choice" && a.value === c);
      await page.keyboard.press("Enter");
      await note(`after chunk ${c}`);
    }
    await tabTo(page, (a) => a.testid === "done" && !a.disabled);
    await page.keyboard.press("Enter");
  } else if ("pairs" in b && b.pairs) {
    for (const [c, bin] of b.pairs) {
      await tabTo(page, (a) => live(a) && a.testid === "choice" && a.inCards && a.value === c);
      await page.keyboard.press("Enter");
      await note(`after picking ${c}`);
      await tabTo(page, (a) => a.testid === "dock" && a.value === bin);
      await page.keyboard.press("Enter");
      await note(`after placing ${c}`);
    }
    await tabTo(page, (a) => a.testid === "done" && !a.disabled);
    await page.keyboard.press("Enter");
  } else throw new Error(`no keyboard solver for ${b.mode}`);
  await expect(screen(page)).toHaveAttribute("data-phase", /feedback|solved/, { timeout: 15_000 });
  await expect.poll(async () => ((await screen(page).count()) === 0 ? "over" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 40_000 }).not.toBe(b.id);
}

async function kbRound(page: Page, level: number) {
  await start(page, level);
  const lost: string[] = [];
  const modes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const b = await board(page);
    await page.waitForTimeout(250);
    const a = await active(page);
    if (!a.visible) lost.push(`${b.id} at start: ${JSON.stringify(a)}`);
    modes.push(b.mode);
    await kbSolve(page, b, lost);
  }
  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  return { lost, modes };
}

for (const level of [2, 3, 6, 7]) {
  test(`keyboard only (Tab + Enter): a whole level-${level + 1} round, focus never lost`, async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "keyboard path");
    test.setTimeout(240_000);
    const { lost, modes } = await kbRound(page, level);
    test.info().annotations.push({ type: "modes", description: modes.join(",") });
    expect(lost).toEqual([]);
  });
}

test("keyboard only: a wrong sort, then the model; focus stays on a visible control", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "keyboard path");
  await start(page, 2);
  const b = await board(page);
  expect(b.mode).toBe("sort");
  const pairs = "pairs" in b ? b.pairs! : [];
  const lost: string[] = [];
  for (let r = 0; r < 2; r++) {
    for (const [i, [c]] of pairs.entries()) {
      if (!(await page.locator(`.wg-cards [data-testid="choice"][data-value="${c}"]`).count())) continue;
      await tabTo(page, (a) => a.visible && !a.disabled && a.inCards && a.value === c);
      await page.keyboard.press("Enter");
      await tabTo(page, (a) => a.testid === "dock" && a.value === pairs[(i + 1) % pairs.length]![1]);
      await page.keyboard.press("Enter");
    }
    await tabTo(page, (a) => a.testid === "done" && !a.disabled);
    await page.keyboard.press("Enter");
    await answering(page);
    await page.getByTestId("helper").waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
    await page.waitForTimeout(300);
    const a = await active(page);
    if (!a.visible) lost.push(`after miss ${r + 1}: ${JSON.stringify(a)}`);
  }
  expect(lost).toEqual([]);
});
