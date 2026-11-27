import { type Page, expect, test } from "@playwright/test";
import { buildRound } from "../src/engine/round";
import { flightPlan } from "../src/games/flight-plan/definition";
import { modeOf } from "../src/games/flight-plan/logic";
import { mkdirSync } from "node:fs";
import { ONBOARDED, press, reviewDir, screen } from "./helpers";

/**
 * QA regressions for the Pilot journey (independent review, 2026-11-26). Synthetic state only.
 * Flight Plan, portrait: after a miss, while the helper explains, every answer must stay reachable on screen.
 * (The full sweep over every inner game, state and viewport is in e2e/flight-plan.spec.ts.)
 */
const REVIEW = reviewDir("qa-pilot");
mkdirSync(REVIEW, { recursive: true });
async function startAt(page: Page, level: number, mode: string) {
  const round = buildRound(flightPlan, { level, seed: 4242 });
  const ex = round.exercises.find((e) => e.difficulty === level + 1 && modeOf(e) === mode && !e.closer)!;
  await page.goto("/");
  await page.evaluate(({ lv, profile, round }) => {
    localStorage.clear();
    localStorage.setItem("bz.v1", JSON.stringify({ muted: true, ageBand: "ages-12-14", profile, progress: { v: 1, stickers: [], roundsCompleted: 1, skills: {}, levels: { "flight-plan": lv } }, round }));
    sessionStorage.setItem("seeded", "1");
  }, { lv: level, profile: ONBOARDED, round: { v: 1, gameId: "flight-plan", progression: { difficulty: level + 1, streak: 0, played: [], results: [] }, currentId: ex.id, savedAt: Date.now(), level, seed: 4242 } });
  await page.goto("/play/flight-plan");
  await press(page, '[data-testid="start-game"]');
  await expect(screen(page)).toHaveAttribute("data-phase", "answering", { timeout: 30_000 });
  return ex;
}
/** Choices whose centre is off screen or covered by something else (not pressable where they are drawn). */
const unreachable = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-testid="choice"]')).filter((e) => {
      const r = e.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      if (y < 0 || y > innerHeight || x < 0 || x > innerWidth) return true;
      const hit = document.elementFromPoint(x, y);
      return !hit || !(e === hit || e.contains(hit));
    }).map((e) => e.dataset.value));

for (const vp of [{ width: 1024, height: 1366 }, { width: 390, height: 844 }]) {
  test(`Flight Plan ${vp.width}x${vp.height}: after a miss every remaining choice stays on screen and pressable (with and after the helper)`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "viewport set explicitly");
    await page.setViewportSize(vp);
    const ex = await startAt(page, 1, "speed");
    const a = ex.answer as unknown as { correct: string; options: { id: string }[] };
    expect(await unreachable(page), "before the miss").toEqual([]);
    await press(page, `[data-testid="choice"][data-value="${a.options.find((o) => o.id !== a.correct)!.id}"]`);
    await page.getByTestId("helper").waitFor({ state: "visible", timeout: 15_000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${REVIEW}/regress-fp-helper-${vp.width}x${vp.height}.png` });
    expect(await unreachable(page), "while the helper explains").toEqual([]);
    await page.getByTestId("helper").waitFor({ state: "detached", timeout: 20_000 });
    await page.waitForTimeout(500);
    expect(await unreachable(page), "after the helper").toEqual([]);
  });
}
