import { type Page, expect } from "@playwright/test";

/** Seed local state before the app boots (e.g. muted for faster, quieter runs). Contains no personal data. */
/** A finished-onboarding profile (synthetic test data only). */
export const ONBOARDED = {
  monster: { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" },
  monsterName: "Ziggy",
  kidName: "Testkid",
  step: "done",
  parentSignup: "skipped",
};

export async function seed(page: Page, state: Record<string, unknown> = {}, opts: { fresh?: boolean } = {}) {
  if (!opts.fresh && !("profile" in state)) state = { profile: ONBOARDED, ageBand: "ages-3-5", ...state };
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("bz.v1", JSON.stringify(s));
      sessionStorage.setItem("seeded", "1");
    }
  }, state);
}

/** Tap/click. `force` because breathing/drop-in animations never settle for Playwright's stability check. */
export async function press(page: Page, selector: string) {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible" });
  const touch = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  if (touch) await loc.tap({ force: true });
  else await loc.click({ force: true });
}

export async function openGame(page: Page) {
  await page.goto("/");
  await press(page, '[data-testid="home-play"]');
  await press(page, '[data-testid="stop-counting-adventure"]');
  await press(page, '[data-testid="start-game"]');
}

export const screen = (page: Page) => page.locator('[data-testid="game-screen"]');

export async function currentExercise(page: Page) {
  await expect(screen(page)).toHaveAttribute("data-phase", /counting|answering/);
  return (await screen(page).getAttribute("data-exercise"))!;
}

/** Solve the current exercise the way a child would: count what is on screen. */
export async function solve(page: Page, opts: { wrongFirst?: boolean } = {}) {
  const id = await currentExercise(page);
  if (id.includes("-make-")) {
    const target = Number((await page.getByTestId("prompt").innerText()).match(/\d+/)![0]);
    const extra = opts.wrongFirst ? 1 : 0;
    for (let i = 0; i < target + extra; i++) await press(page, '[data-testid="pile-object"]');
    await expect(page.getByTestId("basket-object")).toHaveCount(target + extra);
    if (opts.wrongFirst) {
      await press(page, '[data-testid="done"]');
      await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 20_000 });
      await press(page, '[data-testid="basket-object"]');
    }
    await press(page, '[data-testid="done"]');
  } else {
    const n = await page.getByTestId("count-object").count();
    if (id.includes("-tap-")) {
      for (let i = 0; i < n; i++) await press(page, '[data-testid="count-object"][data-counted="false"]');
      await expect(screen(page)).toHaveAttribute("data-phase", "answering");
    }
    if (opts.wrongFirst) {
      const wrong = await page.locator(`[data-testid="choice"]:not([data-value="${n}"])`).first().getAttribute("data-value");
      await press(page, `[data-testid="choice"][data-value="${wrong}"]`);
      await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 20_000 });
    }
    await press(page, `[data-testid="choice"][data-value="${n}"]`);
  }
  return id;
}

export async function waitForNext(page: Page, prevId: string) {
  await expect
    .poll(
      async () => {
        if ((await screen(page).count()) === 0) return "round-over";
        return screen(page).getAttribute("data-exercise", { timeout: 1000 }).catch(() => null);
      },
      { timeout: 30_000 },
    )
    .not.toBe(prevId);
}

/** Play correctly until an exercise of the given interaction type is on screen. */
export async function advanceTo(page: Page, kind: "make" | "tap" | "choose") {
  for (let i = 0; i < 8; i++) {
    const id = await currentExercise(page);
    if (id.includes(`-${kind}-`)) return id;
    await solve(page);
    await waitForNext(page, id);
  }
  throw new Error(`no ${kind} exercise reached`);
}

export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !m.text().includes("Failed to load resource") && errors.push(m.text()));
  return errors;
}
