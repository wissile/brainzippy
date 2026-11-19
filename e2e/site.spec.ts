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
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Story-based learning games for kids");
    const play = page.getByTestId("site-play");
    await expect(play).toBeVisible();
    await expect(play).toHaveAttribute("href", "/hello");
    // the big Play button is reachable without scrolling on the device's first screen
    const box = (await play.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    expect(box.height).toBeGreaterThanOrEqual(64);
    await expect(page.getByRole("heading", { name: "What is BrainZippy?" })).toBeVisible();
    // stand-alone links children may tap are at least 44px tall
    for (const link of [page.getByRole("link", { name: "Grown-ups, start here" }), page.locator(".game-card a.text-link").first()]) {
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
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
    // today's trail may visit a world twice (new + practice), so take the next glowing stop
    await page.locator('.trail-stop[data-state="next"] [data-testid^="stop-"]').first().click({ force: true });
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

  test("old /subjects/* URLs redirect permanently to /libraries/*", async ({ request }) => {
    for (const id of ["math", "english"]) {
      const r = await request.get(`/subjects/${id}`, { maxRedirects: 0 });
      expect(r.status(), id).toBe(301);
      expect(r.headers()["location"]).toMatch(new RegExp(`/libraries/${id}$`));
      const page = await request.get(`/libraries/${id}`);
      expect(page.status()).toBe(200);
      expect(await page.text()).toContain(`<link rel="canonical" href="https://brainzippy.com/libraries/${id}"`);
    }
  });

  test("llms.txt is generated at build time and lists every game page in the sitemap", async ({ request }) => {
    const res = await request.get("/llms.txt");
    expect(res.status()).toBe(200);
    const llms = await res.text();
    expect(llms.startsWith("# BrainZippy\n")).toBe(true);
    expect(llms).toContain("$6.99 per month");
    const games = (await sitemapPaths(request)).filter((p) => p.startsWith("/games/"));
    expect(games.length).toBeGreaterThan(0);
    for (const g of games) expect(llms, g).toContain(`https://brainzippy.com${g})`);
    expect(llms).toContain("https://brainzippy.com/libraries/math)");
    for (const t of ["Computer science", "Pilot ground school", "Digital safety"]) expect(llms).not.toContain(`### ${t}`);
  });

  test("library and age pages list their games with working Play links", async ({ page, request }) => {
    const all = await sitemapPaths(request);
    expect(all.some((p) => p.startsWith("/subjects/"))).toBe(false);
    const hubs = all.filter((p) => p.startsWith("/libraries/") || p.startsWith("/ages/"));
    expect(hubs).toContain("/libraries/english");
    expect(hubs).toContain("/libraries/math");
    // coming-soon libraries have no public page
    for (const id of ["cs", "pilot", "money", "cyber", "sci", "geo", "sel", "engr", "nature"]) expect(hubs).not.toContain(`/libraries/${id}`);
    for (const path of hubs) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const plays = page.locator("main .game-card a.play");
      expect(await plays.count(), `${path} lists games`).toBeGreaterThan(0);
      for (const href of await plays.evaluateAll((as) => as.map((a) => a.getAttribute("href")))) expect(href).toMatch(/^\/play\/[a-z0-9-]+$/);
    }
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
