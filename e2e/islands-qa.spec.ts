import { type Page, expect, test } from "@playwright/test";
import { ONBOARDED, press, seed } from "./helpers";

/**
 * QA review of D-041 (ocean map + journey islands): regression tests for the defects found by the independent review
 * (all fixed). QA-4 and QA-5 check the fix chosen (an honest label; a scrim that picks the island under a tap).
 * Production-like (no dev override: English live, Pilot in fog). Synthetic test data only.
 */
const DAY = "2026-11-25";
const caption = (page: Page) => page.getByTestId("live-caption");

async function start(page: Page, extra: Record<string, unknown> = {}) {
  await page.clock.install({ time: new Date(`${DAY}T10:00:00`) });
  await seed(page, { muted: true, profile: ONBOARDED, ageBand: "ages-6-8", dailyLimit: 5, ...extra });
}

async function passGate(page: Page) {
  const q = (await page.locator('label[for="pa-gate-answer"]').textContent()) ?? "";
  const [a, b] = q.match(/\d+/g)!.map(Number);
  await page.getByTestId("pa-gate-answer").fill(String(a! * b!));
  await press(page, '[data-testid="pa-gate-ok"]');
}

test("QA-1: speech from a previously tapped island does not play over the newly chosen one", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "timing check runs once");
  await start(page);
  await page.goto("/paths");
  await expect(page.getByTestId("path-picker")).toBeVisible();
  // record every caption change (the caption mirrors exactly what is being spoken)
  await page.evaluate(() => {
    const w = window as unknown as { __caps: string[] };
    w.__caps = [];
    const el = document.querySelector('[data-testid="live-caption"]')!;
    new MutationObserver(() => w.__caps.push(el.textContent ?? "")).observe(el, { childList: true, subtree: true, characterData: true });
  });
  await press(page, '[data-testid="path-card-english"]'); // title now, the pitch after it
  await press(page, '[data-testid="ocean-home"]'); // the child changes their mind at once
  await expect(page.getByTestId("ocean-card")).toHaveAttribute("data-island", "home");
  await page.waitForTimeout(4_000); // muted: the first island's title "ends" after ~1.8 s and its pitch followed
  const caps = await page.evaluate(() => (window as unknown as { __caps: string[] }).__caps);
  const after = caps.slice(caps.indexOf("Monster Island! Your home, with a mix of games picked for you today."));
  expect(after, JSON.stringify(caps)).not.toContain("Play with sounds and words with Sarah.");
});

test("QA-2: keyboard focus is not dropped to <body> when Sail starts the boat ride", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "keyboard check runs once");
  await start(page);
  await page.goto("/paths");
  await press(page, '[data-testid="path-card-english"]');
  await expect(page.getByTestId("path-go")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("ocean-boat-sailing")).toBeVisible();
  // the Sail button is gone; focus should land on Skip (the only control of the ride), not on <body>
  expect(await page.evaluate(() => document.activeElement === document.body || document.activeElement === null)).toBe(false);
});

test("QA-3: after the parent gate, focus goes to the currently selected age, not the first choice", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "keyboard check runs once");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await page.goto("/paths");
  await press(page, '[data-testid="age-badge"]');
  await passGate(page);
  await expect(page.getByTestId("age-choice-ages-6-8")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("age-choice-ages-6-8")).toBeFocused();
});

test("QA-4: a done stop says it replays the game (no level it does not open) and opens that game", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "runs once");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page, {
    ageBand: "ages-3-5",
    progress: { v: 1, stickers: [], roundsCompleted: 3, skills: {}, levels: { "rhyme-lanterns": 2 } },
    paths: { v: 1, cur: "english", at: "english", seen: ["english"], by: { english: { w: "rhyme-lanterns", easy: 0, hard: 0, n: 2, dn: null, warm: null } }, run: null, offered: null },
  });
  await page.goto("/path");
  await expect(page.getByTestId("path-view")).toHaveAttribute("data-level", "2");
  const first = page.getByTestId("path-stop-0");
  await expect(first).toHaveAttribute("aria-label", /^Stop 1: .+, done\. Play this game again$/);
  await press(page, '[data-testid="path-stop-0"]');
  await expect(page).toHaveURL(/\/play\/rhyme-lanterns$/);
});

test("QA-5: with a card open, the visible part of another island picks it (no tap meant for an island lands on the card)", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await page.goto("/paths");
  await press(page, '[data-testid="path-card-english"]');
  await expect(page.getByTestId("ocean-card")).toBeVisible();
  // a point of Monster Island that the card does not cover
  const pt = await page.getByTestId("ocean-home").evaluate((el) => {
    const r = el.getBoundingClientRect();
    const card = document.querySelector('[data-testid="ocean-card"]')!.getBoundingClientRect();
    for (let fy = 0.3; fy <= 0.7; fy += 0.1) for (let fx = 0.2; fx <= 0.8; fx += 0.1) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (x < card.left || x > card.right || y < card.top || y > card.bottom) return { x, y };
    }
    return null;
  });
  expect(pt, `Monster Island fully under the card on ${info.project.name}`).not.toBeNull();
  await page.mouse.click(pt!.x, pt!.y);
  await expect(page.getByTestId("ocean-card")).toHaveAttribute("data-island", "home");
  // open water closes the card
  await page.mouse.click(5, (page.viewportSize()!.height * 0.6) | 0);
  await expect(page.getByTestId("ocean-card")).toHaveCount(0);
});

test("QA-6: at 390×844 the top bar's monster pill is not squeezed narrower than the monster (age badge added to the bar)", async ({ page }) => {
  test.skip(test.info().project.name !== "desktop", "viewport check runs once");
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page, { dailyLimit: 10 });
  await page.goto("/paths");
  await expect(page.getByTestId("path-picker")).toBeVisible();
  const r = await page.locator(".map-hello").evaluate((el) => {
    const pill = el.getBoundingClientRect();
    const mon = (el.querySelector(".mini-monster svg") ?? el.querySelector(".mini-monster"))!.getBoundingClientRect();
    const chip = document.querySelector('[data-testid="today-progress"]')!.getBoundingClientRect();
    return { pillW: pill.width, pillH: pill.height, monL: mon.left, monR: mon.right, pillL: pill.left, pillR: pill.right, chipL: chip.left };
  });
  expect(r.monR, JSON.stringify(r)).toBeLessThanOrEqual(r.pillR + 1); // the monster stays inside its pill
  await page.screenshot({ path: "test-results/qa-390-topbar.png", clip: { x: 0, y: 0, width: 390, height: 90 } });
  expect(r.monR, JSON.stringify(r)).toBeLessThanOrEqual(r.chipL); // and does not overlap "0 of 10"
  // every top-bar control stays a real target on the narrowest phone
  for (const id of ["age-badge", "map-grown-ups", "sound-toggle"]) {
    const b = (await page.getByTestId(id).boundingBox())!;
    expect(Math.min(b.width, b.height), `${id} ${b.width}x${b.height}`).toBeGreaterThanOrEqual(44);
  }
});

test("QA-7: keyboard focus on the journey island is never hidden under the plaque, top bar or caption band (WCAG 2.4.11)", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await page.goto("/paths");
  await press(page, '[data-testid="path-card-english"]');
  await press(page, '[data-testid="path-go"]');
  await expect(page.getByTestId("path-view")).toBeVisible();
  await page.waitForTimeout(300);
  const n = await page.locator(".journey-wrap button").count();
  const hidden: string[] = [];
  const seen = new Set<string>();
  // real Tab presses from the heading (focus starts there), like a keyboard user
  for (let i = 0; i < 40 && seen.size < n; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(80);
    const res = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || !el.closest(".journey-wrap")) return null;
      const r = el.getBoundingClientRect();
      const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const covered = !t || !!t.closest(".journey-plaque, .map-top, .view-tabs, .map-caption-band");
      return { id: el.dataset.testid ?? "", msg: covered ? `${el.dataset.testid} centre at ${Math.round(r.left + r.width / 2)},${Math.round(r.top + r.height / 2)} under ${t ? t.className || t.tagName : "nothing (off screen)"}` : "" };
    });
    if (!res) continue;
    seen.add(res.id);
    if (res.msg) hidden.push(res.msg);
  }
  expect(seen.size).toBe(n);
  await page.screenshot({ path: `test-results/qa-journey-${info.project.name}.png` });
  expect(hidden, `focused but covered on ${info.project.name}`).toEqual([]);
});
