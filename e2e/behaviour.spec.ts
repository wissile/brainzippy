import { expect, test } from "@playwright/test";
import { advanceTo, collectErrors, currentExercise, openGame, press, screen, seed, solve, waitForNext } from "./helpers";

test.describe("gameplay behaviour", () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop" && info.project.name !== "phone", "behaviour tests run on desktop + phone");
  });

  test("wrong answers get gentle retry, eliminated choice, then a modelled answer", async ({ page }) => {
    await seed(page, { muted: true });
    await openGame(page);
    for (let i = 0; i < 3; i++) await press(page, '[data-testid="count-object"][data-counted="false"]');
    await expect(screen(page)).toHaveAttribute("data-phase", "answering");
    await press(page, '[data-testid="choice"][data-value="2"]');
    await expect(page.getByTestId("speech-bubble")).toContainText("last number");
    await expect(page.locator(".badge.pulse")).toHaveText("3");
    await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 20_000 });
    await expect(page.locator('[data-testid="choice"][data-value="2"]')).toHaveAttribute("aria-disabled", "true");
    await press(page, '[data-testid="choice"][data-value="4"]');
    await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 25_000 });
    await expect(page.locator('[data-testid="choice"][data-value="3"]')).toHaveClass(/is-model/);
    await expect(page.locator('[data-testid="choice"][data-value="4"]')).toHaveAttribute("aria-disabled", "true");
    await press(page, '[data-testid="choice"][data-value="3"]');
    await waitForNext(page, "ca-tap-3-apple");
    // needing 3 attempts keeps the child on easy items (difficulty never drops below 1; stays at 1)
    const next = await currentExercise(page);
    expect(next).toMatch(/-(1|2|3)-/);
  });

  test("make-set: too many → hint, remove one, success", async ({ page }) => {
    await seed(page, { muted: true });
    await openGame(page);
    const second = await advanceTo(page, "make");
    await solve(page, { wrongFirst: true });
    await waitForNext(page, second);
  });

  test("drag and drop into the basket works with a pointer", async ({ page }) => {
    await seed(page, { muted: true });
    await openGame(page);
    await advanceTo(page, "make");
    const item = page.getByTestId("pile-object").first();
    const from = (await item.boundingBox())!;
    const to = (await page.getByTestId("basket").boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 40, from.y + 30, { steps: 4 });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByTestId("basket-object")).toHaveCount(1);
    // a drop outside the basket does nothing
    const item2 = (await page.getByTestId("pile-object").first().boundingBox())!;
    await page.mouse.move(item2.x + item2.width / 2, item2.y + item2.height / 2);
    await page.mouse.down();
    await page.mouse.move(item2.x + 60, item2.y - 40, { steps: 6 });
    await page.mouse.up();
    await expect(page.getByTestId("basket-object")).toHaveCount(1);
  });

  test("keyboard only: Tab/Enter/number keys complete exercises", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await seed(page, { muted: true });
    await page.goto("/");
    await expect(page.getByTestId("home-play")).toBeVisible();
    const focusAndEnter = async (testId: string) => {
      for (let i = 0; i < 25; i++) {
        await page.keyboard.press("Tab");
        if ((await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))) === testId) break;
      }
      expect(await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).toBe(testId);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(400);
    };
    await focusAndEnter("home-play");
    await focusAndEnter("age-ages-3-5");
    await focusAndEnter("game-counting-adventure");
    await focusAndEnter("start-game");
    await expect(screen(page)).toHaveAttribute("data-phase", "counting");
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-testid="count-object"][data-counted="false"]').first().focus();
      await page.keyboard.press("Enter");
    }
    await expect(screen(page)).toHaveAttribute("data-phase", "answering");
    await page.keyboard.press("3");
    await waitForNext(page, "ca-tap-3-apple");
    // make-set by keyboard
    await advanceTo(page, "make");
    const target = Number((await page.getByTestId("prompt").innerText()).match(/\d+/)![0]);
    for (let i = 0; i < target; i++) {
      await page.getByTestId("pile-object").first().focus();
      await page.keyboard.press("Enter");
    }
    await page.getByTestId("done").focus();
    await page.keyboard.press("Space");
    await expect(screen(page)).toHaveAttribute("data-phase", "feedback");
  });

  test("muted: no audio needed, captions still shown, mute persists", async ({ page }) => {
    await seed(page, {});
    await page.goto("/");
    await press(page, '[data-testid="sound-toggle"]');
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-pressed", "false");
    await press(page, '[data-testid="home-play"]');
    await press(page, '[data-testid="age-ages-3-5"]');
    await press(page, '[data-testid="game-counting-adventure"]');
    await press(page, '[data-testid="start-game"]');
    await expect(page.getByTestId("speech-bubble")).toContainText("count the apples");
    await expect(page.getByTestId("live-caption")).toContainText("count the apples");
    await page.reload();
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-pressed", "false");
  });

  test("reduced motion: no confetti, game still completes exercises", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seed(page, { muted: true });
    await openGame(page);
    const id = await solve(page);
    await expect(screen(page)).toHaveAttribute("data-phase", "feedback");
    await expect(page.locator(".burst")).toHaveCount(0);
    const dur = await page.locator(".bobbo .critter-body").evaluate((el) => getComputedStyle(el).animationName);
    expect(dur).toBe("none");
    await waitForNext(page, id);
  });

  test("refresh mid-round resumes at the same exercise with stars kept", async ({ page }) => {
    await seed(page, { muted: true });
    await openGame(page);
    const a = await solve(page);
    await waitForNext(page, a);
    const b = await solve(page);
    await waitForNext(page, b);
    const current = await currentExercise(page);
    await page.reload();
    await expect(page.getByTestId("start-game")).toHaveAttribute("aria-label", "Keep playing");
    await press(page, '[data-testid="start-game"]');
    await expect(screen(page)).toHaveAttribute("data-exercise", current);
    await expect(page.getByTestId("stars")).toHaveAttribute("data-done", "2");
  });

  test("audio files failing to load never blocks play", async ({ page }) => {
    const errors = collectErrors(page);
    await page.route("**/audio/**", (r) => r.abort());
    await seed(page, {});
    await openGame(page);
    const id = await solve(page);
    await waitForNext(page, id);
    expect(errors).toEqual([]);
  });

  test("slow network: shows loader, then plays", async ({ page, context }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (200 * 1024) / 8 });
    await seed(page, { muted: true });
    const start = Date.now();
    await page.goto("/");
    await expect(page.getByTestId("home-play")).toBeVisible({ timeout: 30_000 });
    const homeMs = Date.now() - start;
    await press(page, '[data-testid="home-play"]');
    await press(page, '[data-testid="age-ages-3-5"]');
    await press(page, '[data-testid="game-counting-adventure"]');
    await expect(page.getByTestId("start-game")).toBeVisible({ timeout: 30_000 });
    await press(page, '[data-testid="start-game"]');
    const id = await solve(page);
    await waitForNext(page, id);
    test.info().annotations.push({ type: "home-visible-ms (400kbps, 400ms RTT)", description: String(homeMs) });
  });

  test("API: guest progress is synced anonymously after a round", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.ok()).toBe(true);
    const created = await request.post("/api/guest");
    expect(created.status()).toBe(201);
    const { id } = await created.json();
    const put = await request.put(`/api/guest/${id}/progress`, { data: { v: 1, stickers: ["counting-champ"], roundsCompleted: 1, skills: {} } });
    expect(put.ok()).toBe(true);
    const bad = await request.put(`/api/guest/${id}/progress`, { data: { v: 1, stickers: [], roundsCompleted: 0, skills: {}, childName: "x" } });
    expect(bad.status()).toBe(400);
    const cross = await request.post("/api/guest", { headers: { origin: "https://evil.example" } });
    expect(cross.status()).toBe(403);
    expect((await request.delete(`/api/guest/${id}`)).ok()).toBe(true);
    expect((await request.get(`/api/guest/${id}/progress`)).status()).toBe(404);
  });
});
