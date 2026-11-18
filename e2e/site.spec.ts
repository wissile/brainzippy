import { expect, test } from "@playwright/test";
import { enterGame, seed, beginIfAsked } from "./helpers";

/** Public, prerendered content pages (src/site). Run: PW_PORT=4182 npx playwright test e2e/site.spec.ts --project=desktop --project=phone */

async function sitemapPaths(request: import("@playwright/test").APIRequestContext): Promise<string[]> {
  const xml = await (await request.get("/sitemap.xml")).text();
  return [...xml.matchAll(/<loc>https:\/\/brainzippy\.com([^<]*)<\/loc>/g)].map((m) => m[1] || "/");
}

test.describe("public site", () => {
  test("landing page renders fully without JavaScript", async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Story-based maths games for kids");
    const play = page.getByTestId("site-play");
    await expect(play).toBeVisible();
    await expect(play).toHaveAttribute("href", "/hello");
    // the big Play button is reachable without scrolling on the device's first screen
    const box = (await play.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    expect(box.height).toBeGreaterThanOrEqual(64);
    await expect(page.getByRole("heading", { name: "What is BrainZippy?" })).toBeVisible();
    await expect(page.locator("main a[href='/games/counting-adventure']").first()).toBeVisible();
    await ctx.close();
  });

  test("content pages load no app bundle (JS budget ≤ 30 KB)", async ({ page }) => {
    let jsBytes = 0;
    const scripts: string[] = [];
    page.on("response", async (r) => {
      if (r.request().resourceType() === "script") {
        scripts.push(r.url());
        jsBytes += (await r.body()).byteLength;
      }
    });
    for (const path of ["/", "/games/glow-cave-hops", "/guides/number-lines-for-kids"]) {
      jsBytes = 0;
      scripts.length = 0;
      await page.goto(path, { waitUntil: "networkidle" });
      expect(scripts, `${path} scripts`).toHaveLength(1);
      expect(scripts[0]).toMatch(/\/assets\/site-[0-9a-f]+\.js$/);
      expect(jsBytes).toBeLessThan(30 * 1024);
    }
  });

  test("Play on the landing page starts first-time onboarding", async ({ page }) => {
    await seed(page, { muted: true }, { fresh: true });
    await page.goto("/");
    await page.getByTestId("site-play").click();
    await expect(page).toHaveURL(/\/hello$/);
    // A full page load may need a fresh tap to unlock sound: the app either starts the story or shows a Start tap.
    await beginIfAsked(page);
    await expect(page.getByTestId("onboarding")).toBeVisible();
  });

  test("Play takes a returning player to Monster Island, and on into a game", async ({ page }) => {
    await seed(page, { muted: true });
    await page.goto("/");
    await expect(page.getByTestId("site-play")).toHaveAttribute("href", "/map");
    await page.getByTestId("site-play").click();
    await expect(page.getByTestId("map")).toBeVisible();
    await page.getByTestId("stop-counting-adventure").click({ force: true });
    await enterGame(page);
    await expect(page.getByTestId("game-screen")).toBeVisible();
  });

  test("a game page's Play button opens that game", async ({ page }) => {
    await seed(page, { muted: true });
    await page.goto("/games/cookie-kitchen");
    await page.getByTestId("game-play").click();
    await expect(page).toHaveURL(/\/play\/cookie-kitchen$/);
    await expect(page.locator('[data-testid="story"], [data-testid="game-screen"]').first()).toBeVisible();
  });

  test("app routes still get the SPA shell (noindex) and /landing redirects", async ({ request }) => {
    for (const path of ["/hello", "/map", "/play/glow-cave-hops", "/grown-ups"]) {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(html).toContain('<div id="root">');
      expect(html).toContain('name="robots" content="noindex"');
    }
    const r = await request.get("/landing", { maxRedirects: 0 });
    expect(r.status()).toBe(301);
    expect(r.headers()["location"]).toMatch(/\/$/);
  });

  test("no content page overflows at 390×844", async ({ browser, request }) => {
    const paths = await sitemapPaths(request);
    expect(paths.length).toBeGreaterThan(15);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    for (const path of paths) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(sw, `${path} overflows horizontally`).toBeLessThanOrEqual(iw);
    }
    await ctx.close();
  });
});
