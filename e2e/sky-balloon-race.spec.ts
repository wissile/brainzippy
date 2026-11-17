import { expect, test } from "@playwright/test";
import { collectErrors, press, screen, seed } from "./helpers";

/** Sky Balloon Race: story → 8 sums (tap, wrong answer + worked example, drag-and-drop) → outro → Sky Champion. */
const answerOf = async (page: import("@playwright/test").Page) => {
  const text = await page.getByTestId("prompt").innerText();
  const m = text.match(/(\d+)\s*\+\s*(\d+)/);
  expect(m, `prompt "${text}"`).not.toBeNull();
  return Number(m![1]) + Number(m![2]);
};
const answering = (page: import("@playwright/test").Page) => expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 30_000 });

async function dragTo(page: import("@playwright/test").Page, value: number) {
  const ball = (await page.locator(`[data-testid="choice"][data-value="${value}"]`).boundingBox())!;
  const drop = (await page.locator("[data-sb-drop]").boundingBox())!;
  const sx = ball.x + ball.width / 2;
  const sy = ball.y + ball.width / 2;
  const tx = drop.x + drop.width / 2;
  const ty = drop.y + drop.height * 0.55;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(sx + ((tx - sx) * k) / 12, sy + ((ty - sy) * k) / 12);
  await page.mouse.up();
}

test("child races Bobbo's balloon to the finish by adding", async ({ page }, info) => {
  const errors = collectErrors(page);
  await seed(page, { muted: true });
  const shot = (name: string) => page.screenshot({ path: `test-results/screens/${info.project.name}-sky-${name}.png` });

  await page.goto("/play/sky-balloon-race");
  await press(page, '[data-testid="story-begin"]');
  await expect(page.getByTestId("story")).toBeVisible();
  await shot("01-story");
  await press(page, '[data-testid="story-skip"]');

  await answering(page);
  await expect(page.getByTestId("choice")).toHaveCount(3);
  await expect(page.getByTestId("race-track")).toHaveAttribute("data-pos", "0");
  await shot("02-first");

  // layout: every balloon is fully on screen and big enough for small fingers
  const vp = page.viewportSize()!;
  for (const box of await Promise.all((await page.getByTestId("choice").all()).map((c) => c.boundingBox()))) {
    expect(box!.width).toBeGreaterThanOrEqual(64);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1);
  }

  for (let i = 0; i < 8; i++) {
    await answering(page);
    const id = (await screen(page).getAttribute("data-exercise"))!;
    const ans = await answerOf(page);
    if (i === 0) {
      // wrong answer: never punished — the balloon is greyed out and Puff shows counting on in ten frames
      const wrong = await page.locator(`[data-testid="choice"]:not([data-value="${ans}"])`).first().getAttribute("data-value");
      await press(page, `[data-testid="choice"][data-value="${wrong}"]`);
      await expect(page.getByTestId("count-on")).toBeVisible({ timeout: 20_000 });
      await answering(page);
      await expect(page.locator(`[data-testid="choice"][data-value="${wrong}"]`)).toHaveAttribute("aria-disabled", "true");
      await shot("03-count-on");
      await press(page, `[data-testid="choice"][data-value="${ans}"]`);
    } else if (i === 1 && info.project.name === "desktop") {
      await page.waitForTimeout(800); // let the balloons arrive
      await dragTo(page, ans);
    } else if (i === 2) {
      // keyboard: focus the balloon and press Enter
      await page.locator(`[data-testid="choice"][data-value="${ans}"]`).focus();
      await page.keyboard.press("Enter");
    } else {
      await press(page, `[data-testid="choice"][data-value="${ans}"]`);
    }
    await expect(screen(page)).toHaveAttribute("data-phase", /feedback|solved/);
    await expect(page.getByTestId("race-track")).toHaveAttribute("data-pos", String(i + 1));
    if (i === 1) await shot("04-tied");
    await expect
      .poll(async () => ((await screen(page).count()) === 0 ? "done" : await screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null)), { timeout: 40_000 })
      .not.toBe(id);
  }

  await expect(page.getByTestId("outro")).toBeVisible({ timeout: 30_000 });
  await shot("05-outro");
  await press(page, '[data-testid="outro-skip"]');
  await expect(page.getByTestId("achievement")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Sky Champion" })).toBeVisible();
  await shot("06-sticker");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bz.v1")!));
  expect(stored.progress.stickers).toContain("sky-champion");
  expect(stored.progress.skills["math.add.within-20"].completed).toBe(8);
  expect(errors).toEqual([]);
});
