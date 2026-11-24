import { type Page, expect, test } from "@playwright/test";
import { graphemes } from "../src/games/paper-boat-post/words";
import { press, screen, seed } from "./helpers";

/** QA review (independent): keyboard-only paths with real Tab presses (no programmatic focus between steps). */
const progressAt = (level: number) => ({ v: 1, stickers: [], roundsCompleted: 0, skills: {}, levels: { "paper-boat-post": level } });
const answering = (page: Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
const active = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return { tag: el?.tagName ?? "", testid: el?.getAttribute("data-testid") ?? "", text: el?.getAttribute("data-text") ?? "", visible: !!el && el !== document.body && el.checkVisibility({ visibilityProperty: true } as never) };
  });

async function tabTo(page: Page, ok: (a: Awaited<ReturnType<typeof active>>) => boolean, max = 40) {
  for (let i = 0; i < max; i++) {
    const a = await active(page);
    if (ok(a)) return a;
    await page.keyboard.press("Tab");
  }
  throw new Error(`never reached by Tab; last: ${JSON.stringify(await active(page))}`);
}

test("keyboard: Skip the story with Tab+Enter, then focus lands on an answer (not <body>)", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "keyboard path");
  await seed(page, { muted: true, ageBand: "ages-6-8", progress: progressAt(1) });
  await page.goto("/play/paper-boat-post");
  const begin = page.getByTestId("story-begin");
  await begin.or(page.getByTestId("story-skip")).first().waitFor({ timeout: 20_000 });
  if (await begin.isVisible()) {
    await begin.focus();
    await page.keyboard.press("Enter");
  }
  await page.getByTestId("story-skip").waitFor({ timeout: 20_000 });
  await tabTo(page, (a) => a.testid === "story-skip");
  await page.keyboard.press("Enter");
  await answering(page);
  await page.waitForTimeout(400);
  const a = await active(page);
  test.info().annotations.push({ type: "focus-after-skip", description: JSON.stringify(a) });
  expect(a.visible, JSON.stringify(a)).toBe(true);
});

test("keyboard: building a word with Tab+Enter only keeps focus on a visible control after each tile", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "keyboard path");
  await seed(page, { muted: true, ageBand: "ages-6-8", progress: progressAt(3) });
  await page.goto("/play/paper-boat-post");
  const begin = page.getByTestId("story-begin");
  const skip = page.locator('[data-testid="story-skip"], [data-testid="start-game"]').first();
  await begin.or(skip).first().waitFor({ timeout: 20_000 });
  if (await begin.isVisible()) await begin.click({ force: true });
  await skip.click({ force: true });
  // reach a build item (answer read items correctly by tap)
  for (let i = 0; i < 6; i++) {
    await answering(page);
    await page.getByTestId("helper").waitFor({ state: "detached", timeout: 20_000 }).catch(() => undefined);
    const mode = await page.getByTestId("pb-board").getAttribute("data-mode");
    if (mode === "build") break;
    const id = (await screen(page).getAttribute("data-exercise"))!;
    const w = (await page.locator(".pb-letters").first().innerText()).replace(/\s/g, "");
    await press(page, `[data-testid="choice"][data-value="${w}"]`);
    await expect.poll(async () => screen(page).getAttribute("data-exercise"), { timeout: 30_000 }).not.toBe(id);
  }
  await expect(page.getByTestId("pb-board")).toHaveAttribute("data-mode", "build");
  const id = (await screen(page).getAttribute("data-exercise"))!;
  const letters = [...graphemes(id.split("-")[2]!)];
  const lost: string[] = [];
  for (const [i, ch] of letters.entries()) {
    await tabTo(page, (a) => a.testid === "choice" && a.text === ch && a.visible);
    await page.keyboard.press("Enter");
    await expect(page.locator(`[data-testid="slot"][data-slot="${i}"]`)).toHaveAttribute("data-filled", "true");
    await page.waitForTimeout(120);
    const a = await active(page);
    if (!a.visible) lost.push(`after "${ch}": ${JSON.stringify(a)}`);
  }
  expect(lost).toEqual([]);
});
