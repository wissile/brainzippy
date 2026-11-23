import { expect, test, type Page } from "@playwright/test";
import { collectErrors, enterGame, ONBOARDED, seed, solve, waitForNext } from "./helpers";

/**
 * Anonymous play statistics (D-033): a real round produces counters, the batch carries no name or id, and the owner's
 * /insights dashboard shows them. Needs ANALYTICS_ENABLED="true" and ANALYTICS_TOKEN in .dev.vars (see .dev.vars.example).
 */
const DEV_TOKEN = "dev-insights-token-0123456789abcdef";

test.beforeEach(async ({ request }) => {
  const flags = await (await request.get("/api/config")).json();
  test.skip(flags.analytics !== true, "needs ANALYTICS_ENABLED=\"true\" in .dev.vars");
});

/** Make the page think it was hidden, as when a child switches app: the batch goes out with sendBeacon. */
async function hidePage(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

/** Server-side count of one counter over the last day (local D1 keeps earlier runs, so tests compare before/after). */
async function serverCount(request: import("@playwright/test").APIRequestContext, match: (r: unknown[]) => boolean): Promise<number> {
  const res = await request.get("/api/insights?days=1", { headers: { authorization: `Bearer ${DEV_TOKEN}` } });
  expect(res.status()).toBe(200);
  const { rows } = (await res.json()) as { rows: unknown[][] };
  return rows.filter(match).reduce((a, r) => a + Number(r[4]), 0);
}
const isQuit = (r: unknown[]) => r[0] === "round_quit" && r[1] === "counting-adventure" && r[2] === "L0" && r[3] === "1-2";
const isMapScreen = (r: unknown[]) => r[0] === "screen" && r[2] === "map";

test("a round is counted anonymously and shows up on the owner's dashboard", async ({ page, request }, info) => {
  const quitsBefore = await serverCount(request, isQuit);
  const mapBefore = await serverCount(request, isMapScreen);
  const errors = collectErrors(page);
  const batches: string[] = [];
  const other: string[] = [];
  // page.route sees the body of sendBeacon requests (page.on("request") does not for Blob bodies)
  await page.route("**/api/play-stats", async (route) => {
    batches.push(route.request().postDataBuffer()?.toString("utf8") ?? "");
    await route.continue();
  });
  page.on("request", (r) => {
    const path = new URL(r.url()).pathname;
    if (path !== "/api/play-stats" && r.method() !== "GET") other.push(path);
  });
  await seed(page, { muted: true });
  await page.goto("/map");
  await expect(page.getByTestId("map")).toBeVisible();
  await page.goto("/play/counting-adventure");
  await enterGame(page);
  let id = await solve(page, { wrongFirst: true });
  await waitForNext(page, id);
  id = await solve(page);
  await waitForNext(page, id);

  const sent = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/play-stats");
  await hidePage(page);
  await sent;
  await expect.poll(() => batches.length).toBeGreaterThan(0);
  const body = batches.join("\n");
  const rows = batches.filter(Boolean).flatMap((b) => (JSON.parse(b) as { rows: unknown[][] }).rows);
  const events = new Set(rows.map((r) => r[0]));
  for (const e of ["session", "setting", "screen", "round_start", "ex_done", "skill_done", "wrong", "think"]) expect(events, e).toContain(e);
  expect(rows.find((r) => r[0] === "round_start")).toEqual(["round_start", "counting-adventure", "L0", "", 1, 0]);
  // privacy: nothing about the child or the device beyond the closed lists
  expect(body).not.toContain(ONBOARDED.kidName);
  expect(body).not.toContain(ONBOARDED.monsterName);
  expect(body).not.toMatch(/Mozilla|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/);
  for (const r of rows) expect(r).toHaveLength(6);
  expect(other).toEqual([]); // no other POST of any kind
  expect(await page.evaluate(() => localStorage.getItem("bz.stats.v1"))).toBeNull(); // handed over, not kept

  // leaving mid-round (reload/close) counts as "left early"; so does the map visit sent when that page closed.
  // (Playwright can't read beacon bodies sent during unload, so check the server's totals.)
  await page.goto("/insights");
  await expect.poll(() => serverCount(request, isQuit), { timeout: 10_000 }).toBe(quitsBefore + 1);
  await expect.poll(() => serverCount(request, isMapScreen), { timeout: 10_000 }).toBeGreaterThan(mapBefore);

  // the owner's dashboard: locked without the key, then shows the counts
  await page.getByTestId("insights-key").fill("wrong-key");
  await page.getByTestId("insights-open").click();
  await expect(page.getByTestId("insights-denied")).toBeVisible();
  await page.getByTestId("insights-key").fill(DEV_TOKEN);
  await page.getByTestId("insights-open").click();
  await expect(page.getByTestId("insights")).toBeVisible();
  await expect(page.getByTestId("insights-games")).toContainText("Bobbo's Breakfast"); // counting-adventure's title
  await expect(page.getByTestId("insights-funnel")).toBeVisible();
  expect(await page.locator('meta[name="robots"]').getAttribute("content")).toBe("noindex");
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(sw).toBeLessThanOrEqual(iw);
  await page.screenshot({ path: info.outputPath("insights.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("a grown-up can switch counting off, and the privacy notice explains it", async ({ page }) => {
  const batches: string[] = [];
  page.on("request", (r) => new URL(r.url()).pathname === "/api/play-stats" && batches.push(r.url()));
  await seed(page, { muted: true });
  await page.goto("/grown-ups");
  const toggle = page.getByTestId("stats-toggle");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => [localStorage.getItem("bz.stats.off"), localStorage.getItem("bz.stats.v1")])).toEqual(["1", null]);
  const box = (await toggle.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  await page.goto("/map");
  await expect(page.getByTestId("map")).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(500);
  expect(batches).toEqual([]);
  await page.goto("/privacy");
  await expect(page.getByTestId("privacy-analytics-optout")).toContainText("Sharing anonymous counts");
});
