import { type Locator, type Page, expect, test } from "@playwright/test";
import { collectErrors, press, screen, seed, whenReady } from "./helpers";

/** Cookie Kitchen: share cookies onto plates (drag, tap-tap, keyboard), check fairness, answer "N each". */

async function params(page: Page) {
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 30_000 });
  const [total, groups] = (await page.getByTestId("prompt").innerText()).match(/\d+/g)!.map(Number) as [number, number];
  return { total, groups, each: total / groups };
}

async function helperGone(page: Page) {
  await page.getByTestId("helper").waitFor({ state: "detached", timeout: 15_000 }).catch(() => undefined);
}

async function drag(page: Page, from: Locator, to: Locator) {
  await whenReady(from);
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(a.x + a.width / 2 + ((b.x + b.width / 2 - (a.x + a.width / 2)) * i) / 8, a.y + a.height / 2 + ((b.y + b.height / 2 - (a.y + a.height / 2)) * i) / 8);
  await page.mouse.up();
}

const counts = (page: Page) => page.getByTestId("plate").evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.count)));

async function nextExercise(page: Page, prev: string) {
  await expect
    .poll(async () => ((await screen(page).count()) === 0 ? "round-over" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 40_000 })
    .not.toBe(prev);
}

test("child shares cookies fairly by drag, tap and keyboard, and the matching pill lights up", async ({ page }, info) => {
  const errors = collectErrors(page);
  await seed(page, { muted: true });
  await page.goto("/play/cookie-kitchen");
  await press(page, '[data-testid="story-begin"]');
  await press(page, '[data-testid="story-skip"]');

  const { total, groups, each } = await params(page);
  expect({ total, groups }).toEqual({ total: 4, groups: 2 }); // tutorial
  await expect(page.getByTestId("tray-cookie")).toHaveCount(4);
  await expect(page.getByTestId("plate")).toHaveCount(2);
  await helperGone(page);

  const touch = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  const plates = page.getByTestId("plate");
  // 1) pointer drag (mouse projects only; touch projects use tap-tap)
  if (!touch) await drag(page, page.getByTestId("tray-cookie").first(), plates.nth(0));
  else {
    await press(page, '[data-testid="tray-cookie"]');
    await press(page, '[data-testid="plate"][data-plate="0"]');
  }
  await expect.poll(() => counts(page)).toEqual([1, 0]);
  // 2) tap a cookie, then tap a plate
  await press(page, '[data-testid="tray-cookie"]');
  await expect(page.locator('[data-testid="tray-cookie"][aria-pressed="true"]')).toHaveCount(1);
  await press(page, '[data-testid="plate"][data-plate="1"]');
  await expect.poll(() => counts(page)).toEqual([1, 1]);
  // 3) tapping a plate with nothing picked up sends one back to the tray
  await press(page, '[data-testid="plate"][data-plate="1"]');
  await expect.poll(() => counts(page)).toEqual([1, 0]);
  await expect(page.getByTestId("tray-cookie")).toHaveCount(3);
  // 4) keyboard: Enter on a cookie moves focus to the plates; Enter on a plate puts it there
  await page.getByTestId("tray-cookie").first().focus();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-testid="plate"][data-plate="0"]')).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect.poll(() => counts(page)).toEqual([1, 1]);
  await expect(page.locator('[data-testid="tray-cookie"][tabindex="0"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.locator('[data-testid="tray-cookie"]').first().focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect.poll(() => counts(page)).toEqual([2, 2]);

  // self-check: every plate equal → board marks fair, matching pill glows (not a submission)
  await expect(page.getByTestId("cookie-board")).toHaveAttribute("data-fair", String(each));
  await expect(page.locator(`[data-testid="choice"][data-value="${each}"]`)).toHaveClass(/ck-match/);
  await expect(screen(page)).toHaveAttribute("data-phase", "answering");
  await page.screenshot({ path: `test-results/screens/${info.project.name}-ck-fair.png` });

  // wrong answer: gentle feedback, wrong pill greyed, then a worked example deals the cookies round and round
  const id = (await screen(page).getAttribute("data-exercise"))!;
  const wrong = await page.locator(`[data-testid="choice"]:not([data-value="${each}"])`).first().getAttribute("data-value");
  await press(page, `[data-testid="choice"][data-value="${wrong}"]`);
  await expect(page.getByTestId("cookie-board")).toHaveClass(/is-wrong/);
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 40_000 });
  await expect(page.locator(`[data-testid="choice"][data-value="${wrong}"]`)).toHaveClass(/is-out/);
  await expect.poll(() => counts(page)).toEqual([2, 2]);

  await press(page, `[data-testid="choice"][data-value="${each}"]`);
  await expect(page.locator(`[data-testid="choice"][data-value="${each}"]`)).toHaveClass(/is-right/);
  await expect(page.getByTestId("cookie-board")).toHaveClass(/is-celebrating/);
  await nextExercise(page, id);
  expect(errors).toEqual([]);
});

test("a full round can be played without dragging, ending with the Fair Sharer sticker", async ({ page }) => {
  const errors = collectErrors(page);
  await seed(page, { muted: true });
  await page.goto("/play/cookie-kitchen");
  await press(page, '[data-testid="story-begin"]');
  await press(page, '[data-testid="story-skip"]');
  for (let i = 0; i < 8; i++) {
    const { each, total, groups } = await params(page);
    await expect(page.getByTestId("tray-cookie")).toHaveCount(total);
    await expect(page.getByTestId("plate")).toHaveCount(groups);
    const id = (await screen(page).getAttribute("data-exercise"))!;
    await press(page, `[data-testid="choice"][data-value="${each}"]`);
    // correct without sharing: the board deals the fair share to show why
    await expect.poll(() => counts(page)).toEqual(Array.from({ length: groups }, () => each));
    await nextExercise(page, id);
  }
  // outro story, then the sticker
  await press(page, '[data-testid="outro-skip"]').catch(() => undefined);
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Fair Sharer" })).toBeVisible();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("fair-sharer");
  expect(errors).toEqual([]);
});
