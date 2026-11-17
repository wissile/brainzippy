import { type Page, expect, test } from "@playwright/test";
import { collectErrors, press, screen, seed, waitForNext } from "./helpers";

/**
 * Glow Cave Hops: the child moves Gloop's cart along the number line (Hop button, keyboard, sliding, tapping a stop)
 * and presses Go (data-testid="choice", data-value = cart position). Synthetic state only.
 */
async function current(page: Page) {
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 20_000 });
  const track = page.getByTestId("track");
  const start = Number(await track.getAttribute("data-start"));
  const hops = Number(await track.getAttribute("data-hops-needed"));
  const max = Number(await track.getAttribute("data-max"));
  return { id: (await screen(page).getAttribute("data-exercise"))!, start, hops, max, target: start + hops };
}
const cartAt = (page: Page, n: number) => expect(page.getByTestId("cart")).toHaveAttribute("data-pos", String(n), { timeout: 10_000 });

test("child hops the cart along the number line for a full round and earns the sticker", async ({ page }, info) => {
  const errors = collectErrors(page);
  await seed(page, { muted: true });
  const shot = (name: string) => page.screenshot({ path: `test-results/screens/${info.project.name}-glow-cave-${name}.png` });

  await page.goto("/play/glow-cave-hops");
  await press(page, '[data-testid="story-begin"]');
  await expect(page.getByTestId("story")).toBeVisible();
  await press(page, '[data-testid="story-skip"]');

  for (let i = 0; i < 8; i++) {
    const ex = await current(page);
    await cartAt(page, ex.start);
    if (i === 0) {
      // tutorial: the big Hop button, one hop per press
      expect(ex.hops).toBe(1);
      await press(page, '[data-testid="hop"]');
      await cartAt(page, ex.target);
      await expect(page.getByTestId("hop-count").first()).toHaveAttribute("data-hops", "1");
      await shot("01-hopped");
    } else if (i === 1) {
      // keyboard, with a wrong answer first: the cart rolls back to the start and a hint models the hops
      const wrong = ex.target < ex.max ? ex.target + 1 : ex.hops > 1 ? ex.target - 1 : null;
      if (wrong !== null) {
        for (let k = ex.start; k < wrong; k++) await page.keyboard.press("ArrowRight");
        await cartAt(page, wrong);
        await press(page, '[data-testid="choice"]');
        await expect(screen(page)).toHaveAttribute("data-phase", "feedback");
        await cartAt(page, ex.start);
        await shot("02-rolled-back");
        await current(page);
      }
      for (let k = 0; k < ex.hops; k++) await page.keyboard.press("ArrowRight");
      await cartAt(page, ex.target);
    } else if (i === 2) {
      // slide the cart with a pointer drag; it snaps to the nearest stop
      const a = (await page.locator(`[data-testid="stop"][data-value="${ex.start}"]`).boundingBox())!;
      const b = (await page.locator(`[data-testid="stop"][data-value="${ex.start + 1}"]`).boundingBox())!;
      const c = (await page.getByTestId("cart").boundingBox())!;
      const x = c.x + c.width / 2, y = c.y + c.height * 0.6;
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let k = 1; k <= 8; k++) await page.mouse.move(x + ((b.x - a.x) * ex.hops * k) / 8, y);
      await page.mouse.up();
      await cartAt(page, ex.target);
    } else {
      // tapping a number stop hops the cart there one stop at a time
      await press(page, `[data-testid="stop"][data-value="${ex.target}"]`);
      await cartAt(page, ex.target);
    }
    await expect(page.getByTestId("choice")).toHaveAttribute("data-value", String(ex.target));
    await press(page, '[data-testid="choice"]');
    if (i === 0) {
      await expect(page.locator('[data-testid="stop"].is-right')).toHaveAttribute("data-value", String(ex.target));
      await shot("03-correct");
    }
    await waitForNext(page, ex.id);
  }

  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Cave Explorer" })).toBeVisible();
  await shot("04-sticker");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("cave-explorer");
  expect(errors).toEqual([]);
});

test("number line never overflows and controls meet tap-target sizes", async ({ page }) => {
  await seed(page, { muted: true });
  await page.goto("/play/glow-cave-hops");
  await press(page, '[data-testid="story-begin"]');
  await press(page, '[data-testid="story-skip"]');
  await current(page);
  const vp = page.viewportSize()!;
  for (const id of ["hop", "hop-back", "choice", "cart"]) {
    const box = (await page.getByTestId(id).boundingBox())!;
    expect(box.x, id).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, id).toBeLessThanOrEqual(vp.width + 1);
    expect(box.y + box.height, id).toBeLessThanOrEqual(vp.height + 1);
    if (id !== "cart") expect(Math.min(box.width, box.height), id).toBeGreaterThanOrEqual(64);
  }
  const stop = (await page.locator('[data-testid="stop"]').first().boundingBox())!;
  expect(stop.width).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
