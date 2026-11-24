import { type Page, expect, test } from "@playwright/test";
import { ARTICLES, ENOUGH, STRONGEST } from "../src/games/lantern-press/articles";
import { TUTORIAL_ITEM, optId } from "../src/games/lantern-press/logic";
import { COMBINE, CONCISE, CONNECTIVES, CUTS, MODIFIERS, ORDERS, PRONOUNS, PURPOSES, SHIFTS } from "../src/games/lantern-press/sentences";
import { CONNOTE, DEVICE_LABEL, FIG_LINES, WORD_GROUPS } from "../src/games/lantern-press/words";
import { collectErrors, press, reviewDir, screen, seed, whenReady } from "./helpers";

/**
 * QA review (independent). Helpers copied from lantern-press.spec.ts. Adds REAL Tab/Enter rounds on the levels the
 * builder's spec doesn't play by keyboard (1, 4, 6, 7, 8, 10) and a keyboard miss → miss → model path on every
 * interaction kind (focus after each miss must sit on a visible, live control; the model must be announced).
 * Original header: The Lantern Press: story (boathouse beat + Sarah/Hoot DialogueScene) → rounds by tap, drag and keyboard (REAL Tab
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


// ================================================================ QA tests
for (const level of [0, 3, 5, 6, 7, 9]) {
  test(`QA keyboard only (real Tab + Enter): a whole level-${level + 1} round, focus never lost`, async ({ page }) => {
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

/** Miss by keyboard only: a distractor slip, a wrong part, or a wrong label for every card. */
async function kbMiss(page: Page, b: Board) {
  const live2 = (a: Active) => a.visible && !a.disabled;
  if ("value" in b && b.value) {
    const wrong = await page.locator(`[data-testid="choice"]:not([data-value="${b.value}"]):not([aria-disabled="true"])`).first().getAttribute("data-value");
    await tabTo(page, (a) => live2(a) && a.testid === "choice" && a.value === wrong);
    await page.keyboard.press("Enter");
    return;
  }
  if ("chunks" in b && b.chunks) {
    const wrong = await page.locator('[data-testid="choice"]:not([aria-disabled="true"])').evaluateAll((els, right) => els.map((e) => e.getAttribute("data-value")!).filter((x) => !right.includes(x)), b.chunks);
    await tabTo(page, (a) => live2(a) && a.testid === "choice" && a.value === wrong[0]);
    await page.keyboard.press("Enter");
    await tabTo(page, (a) => a.testid === "done" && !a.disabled);
    await page.keyboard.press("Enter");
    return;
  }
  if ("texts" in b && b.texts) {
    // reversed order of the right cards
    const ids = await tileIds(page, [...b.texts].reverse());
    for (const id of ids) {
      if ((await page.locator(`.lp-tiles ${choice(id)}`).getAttribute("aria-disabled")) === "true") continue;
      await tabTo(page, (a) => live2(a) && a.testid === "choice" && a.value === id);
      await page.keyboard.press("Enter");
    }
    await tabTo(page, (a) => a.testid === "done" && !a.disabled);
    await page.keyboard.press("Enter");
    return;
  }
  if ("pairs" in b && b.pairs) {
    const targets = [...new Set(b.pairs.map(([, t]) => t))];
    for (const [c, t] of b.pairs) {
      if ((await page.locator(choice(c)).getAttribute("data-label")) === t) continue;
      await tabTo(page, (a) => live2(a) && a.testid === "choice" && a.inCards && a.value === c);
      await page.keyboard.press("Enter");
      await tabTo(page, (a) => a.testid === "dock" && a.value === targets.find((x) => x !== t));
      await page.keyboard.press("Enter");
    }
    await tabTo(page, (a) => a.testid === "done" && !a.disabled);
    await page.keyboard.press("Enter");
  }
}

for (const [level, want] of [[0, "connective"], [1, "order"], [3, "pronTap"], [5, "feelSort"], [8, "claimSort"]] as const) {
  test(`QA keyboard miss → miss → model (${want}): focus stays on a live control and the model is announced`, async ({ page }) => {
    test.skip(test.info().project.name !== "desktop", "keyboard path");
    test.setTimeout(240_000);
    await start(page, level);
    await answering(page);
    await helperGone(page);
    const b = await toMode(page, want);
    test.skip(!b, `${want} not reached`);
    const lost: string[] = [];
    for (let r = 0; r < 2; r++) {
      await kbMiss(page, b!);
      await answering(page);
      await helperGone(page);
      await page.waitForTimeout(300);
      const a = await active(page);
      if (!a.visible || a.disabled) lost.push(`after miss ${r + 1}: ${JSON.stringify(a)}`);
    }
    // the model must be named to screen readers somewhere on the board
    const names = await page.locator('[data-testid="lp-board"] button').evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""));
    const announced = names.some((n) => /the answer|one to tap|the next card|label it/i.test(n));
    await page.screenshot({ path: `${REVIEW}/qa-kb-model-${want}.png` });
    expect(lost).toEqual([]);
    expect(announced, `model named in aria-labels: ${names.join(" | ")}`).toBe(true);
  });
}
