// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LANDING_FILE, SITE_CSS, renderSite } from "../../src/site/build";
import { GAMES } from "../../src/site/catalog";
import { AGE_BANDS } from "../../src/site/content/curriculum";
import { FAQ } from "../../src/site/content/faq";
import { GUIDES } from "../../src/site/content/guides";
import { SITE } from "../../src/site/entity";
import { isAppRoute } from "../../src/site/routes";

const root = join(__dirname, "../..");
const ASSETS = { css: SITE_CSS, js: "/assets/site-test.js", preloadFont: "/assets/font-test.woff2" };
const { pages, sitemap } = renderSite(ASSETS);
const docs = pages.map((p) => ({ ...p, doc: new DOMParser().parseFromString(p.html, "text/html") }));
const paths = new Set(pages.map((p) => p.path));
const publicFile = (url: string) => existsSync(join(root, "public", url));

describe("prerendered public pages", () => {
  it("builds the expected page set", () => {
    expect(pages.length).toBeGreaterThanOrEqual(20);
    expect(paths.size).toBe(pages.length);
    for (const p of ["/", "/how-it-works", "/research", "/for-parents", "/for-teachers", "/faq", "/about", "/games", "/guides", "/subjects/math"]) expect(paths).toContain(p);
    for (const g of GAMES) expect(paths).toContain(`/games/${g.id}`);
    expect(GUIDES.length).toBeGreaterThanOrEqual(6);
    expect(GUIDES.length).toBeLessThanOrEqual(10);
    for (const g of GUIDES) expect(paths).toContain(`/guides/${g.slug}`);
    expect(pages.find((p) => p.path === "/")?.file).toBe(LANDING_FILE);
  });

  it("only creates age pages that have games (no thin pages)", () => {
    const agePages = pages.filter((p) => p.path.startsWith("/ages/"));
    expect(agePages.length).toBeGreaterThan(0);
    for (const p of agePages) {
      const band = AGE_BANDS.find((b) => `/ages/${b.slug}` === p.path)!;
      expect(GAMES.some((g) => Math.min(g.ages[1], band.max) - Math.max(g.ages[0], band.min) + 1 >= 2)).toBe(true);
    }
    expect(paths.has("/ages/12-14")).toBe(false);
  });

  it.each(docs.map((d) => [d.path, d] as const))("%s has unique title, description, canonical and one h1", (path, { doc }) => {
    const title = doc.querySelector("title")?.textContent ?? "";
    const desc = doc.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
    expect(title.length).toBeGreaterThan(10);
    expect(title.length).toBeLessThanOrEqual(90);
    expect(desc.length).toBeGreaterThanOrEqual(70);
    expect(desc.length).toBeLessThanOrEqual(170);
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(path === "/" ? "https://brainzippy.com/" : `https://brainzippy.com${path}`);
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelector('meta[name="robots"]')).toBeNull();
    expect(doc.documentElement.getAttribute("lang")).toBe("en");
    for (const prop of ["og:title", "og:description", "og:url", "og:image", "og:type"]) expect(doc.querySelector(`meta[property="${prop}"]`)?.getAttribute("content")).toBeTruthy();
    expect(doc.querySelector('meta[name="twitter:card"]')?.getAttribute("content")).toBe("summary_large_image");
    const og = doc.querySelector('meta[property="og:image"]')!.getAttribute("content")!;
    expect(publicFile(og.replace(SITE.origin, ""))).toBe(true);
  });

  it("titles and descriptions are unique across the site", () => {
    const titles = docs.map((d) => d.doc.title);
    const descs = docs.map((d) => d.doc.querySelector('meta[name="description"]')!.getAttribute("content"));
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descs).size).toBe(descs.length);
  });

  it.each(docs.map((d) => [d.path, d] as const))("%s has valid JSON-LD and breadcrumbs", (path, { doc }) => {
    const blocks = [...doc.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent ?? ""));
    for (const b of blocks) {
      expect(b["@context"]).toBe("https://schema.org");
      expect(typeof b["@type"]).toBe("string");
    }
    const types = blocks.map((b) => b["@type"]);
    if (path === "/") {
      expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite"]));
      expect(types).not.toContain("BreadcrumbList");
    } else {
      expect(types).not.toContain("Organization");
      const bc = blocks.find((b) => b["@type"] === "BreadcrumbList");
      expect(bc).toBeTruthy();
      expect(bc.itemListElement.at(-1).item).toBe(`https://brainzippy.com${path}`);
      expect(doc.querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]')).not.toBeNull();
    }
    if (path.startsWith("/guides/")) {
      const art = blocks.find((b) => b["@type"] === "Article");
      expect(art.headline).toBe(doc.querySelector("h1")!.textContent);
      expect(art.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("FAQPage JSON-LD matches the visible questions and answers", () => {
    const faq = docs.find((d) => d.path === "/faq")!.doc;
    const ld = [...faq.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent!)).find((b) => b["@type"] === "FAQPage");
    const visibleQ = [...faq.querySelectorAll(".faq-item h3")].map((h) => h.textContent);
    expect(ld.mainEntity.map((q: { name: string }) => q.name)).toEqual(visibleQ);
    expect(visibleQ).toHaveLength(FAQ.flatMap((g) => g.items).length);
    const body = faq.body.textContent ?? "";
    for (const q of ld.mainEntity) expect(body).toContain(q.acceptedAnswer.text);
  });

  it.each(docs.map((d) => [d.path, d] as const))("%s has a sane heading outline", (_path, { doc }) => {
    let prev = 0;
    for (const h of doc.querySelectorAll("main h1, main h2, main h3, main h4")) {
      const level = Number(h.tagName[1]);
      expect(level - prev, `heading "${h.textContent}" skips a level`).toBeLessThanOrEqual(1);
      prev = level;
    }
  });

  it.each(docs.map((d) => [d.path, d] as const))("%s links only to real pages, app routes or files", (_path, { doc }) => {
    const ids = new Set([...doc.querySelectorAll("[id]")].map((e) => e.id));
    for (const a of doc.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href")!;
      if (href.startsWith("#")) {
        expect(ids.has(href.slice(1)), `missing anchor ${href}`).toBe(true);
      } else if (href.startsWith("/")) {
        const p = href.split("#")[0]!.split("?")[0]!;
        expect(paths.has(p) || isAppRoute(p) || publicFile(p), `broken internal link ${href}`).toBe(true);
      } else {
        expect(href).toMatch(/^https:\/\//);
      }
    }
    for (const img of doc.querySelectorAll("img")) {
      expect(img.getAttribute("alt")).toBeTruthy();
      expect(img.getAttribute("width")).toBeTruthy();
      expect(img.getAttribute("height")).toBeTruthy();
      expect(publicFile(img.getAttribute("src")!), `missing image ${img.getAttribute("src")}`).toBe(true);
    }
  });

  it("ships at most one small script per content page and a Play link to the game", () => {
    for (const { doc } of docs) {
      const scripts = [...doc.querySelectorAll("script")].filter((s) => s.getAttribute("type") !== "application/ld+json");
      expect(scripts).toHaveLength(1);
      expect(scripts[0]!.getAttribute("src")).toBe(ASSETS.js);
      expect(doc.querySelector("a[data-play]")?.getAttribute("href")).toBe("/hello");
    }
    const home = docs.find((d) => d.path === "/")!.doc;
    expect(home.querySelector('[data-testid="site-play"]')?.getAttribute("href")).toBe("/hello");
    expect(Buffer.byteLength(readFileSync(join(root, "src/site/client.js")))).toBeLessThan(2048);
  });

  it("game pages link to the real play route", () => {
    for (const g of GAMES) {
      const d = docs.find((x) => x.path === `/games/${g.id}`)!.doc;
      expect(d.querySelector('[data-testid="game-play"]')?.getAttribute("href")).toBe(`/play/${g.id}`);
    }
  });
});

describe("content quality", () => {
  // Efficacy claims must not be made without evidence (docs/CONTENT_QUALITY.md). Negated or
  // question sentences ("not proven", "Is it proven?") are allowed.
  const BANNED = /\b(proven|guarantee[sd]?|clinically|scientifically (validated|proven)|evidence-based results|boosts? (iq|grades))\b/i;
  it.each(docs.map((d) => [d.path, d] as const))("%s makes no unsupported efficacy claims", (_path, { doc }) => {
    doc.querySelectorAll("script, style").forEach((e) => e.remove());
    const text = (doc.body.textContent ?? "").replace(/\s+/g, " ");
    const sentences = text.split(/(?<=[.!?])\s+/);
    for (const s of sentences) {
      if (!BANNED.test(s)) continue;
      expect(/\b(not|never|no)\b|n['’]t\b|\?$|“proven”|"proven"/i.test(s), `unsupported claim: "${s}"`).toBe(true);
    }
    expect(text).not.toMatch(/lorem ipsum|TODO|TBD|undefined|NaN/);
  });

  it("every guide cites at least two sources and every citation resolves", () => {
    for (const g of GUIDES) {
      expect(g.refs.length).toBeGreaterThanOrEqual(2);
      const d = docs.find((x) => x.path === `/guides/${g.slug}`)!.doc;
      const cited = new Set([...d.querySelectorAll("a.cite")].map((a) => a.getAttribute("href")!.slice(5)));
      for (const k of cited) expect(g.refs, `${g.slug} cites ${k} but does not list it`).toContain(k);
      for (const k of g.refs) expect(cited.has(k), `${g.slug} lists ${k} but never cites it`).toBe(true);
      const words = (d.querySelector(".prose")?.textContent ?? "").split(/\s+/).length;
      expect(words, `${g.slug} is thin`).toBeGreaterThan(450);
    }
  });
});

describe("sitemap, robots and llms.txt", () => {
  it("sitemap lists exactly the generated pages with lastmod", () => {
    const doc = new DOMParser().parseFromString(sitemap, "application/xml");
    const urls = [...doc.querySelectorAll("url")].map((u) => ({ loc: u.querySelector("loc")!.textContent!, lastmod: u.querySelector("lastmod")!.textContent! }));
    expect(new Set(urls.map((u) => u.loc))).toEqual(new Set(pages.map((p) => (p.path === "/" ? "https://brainzippy.com/" : `https://brainzippy.com${p.path}`))));
    expect(urls).toHaveLength(pages.length);
    for (const u of urls) expect(u.lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("robots.txt allows crawling and points at the sitemap", () => {
    const robots = readFileSync(join(root, "public/robots.txt"), "utf8");
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).not.toMatch(/^Disallow: \/$/m);
    expect(robots).toContain("Sitemap: https://brainzippy.com/sitemap.xml");
  });

  it("llms.txt states the same entity facts and links only to real pages", () => {
    const llms = readFileSync(join(root, "public/llms.txt"), "utf8");
    expect(llms.startsWith(`# ${SITE.name}\n`)).toBe(true);
    expect(llms).toContain(SITE.definition);
    expect(llms).toContain(`${SITE.agesNow.min}–${SITE.agesNow.max}`);
    const links = [...llms.matchAll(/https:\/\/brainzippy\.com(\/[^)\s]*)/g)].map((m) => m[1]!);
    expect(links.length).toBeGreaterThan(10);
    for (const l of links) expect(paths.has(l), `llms.txt links to missing page ${l}`).toBe(true);
    for (const g of GAMES) expect(llms).toContain(`/games/${g.id}`);
    for (const g of GUIDES) expect(llms).toContain(`/guides/${g.slug}`);
  });

  it("the SPA shell is noindex and has no canonical", () => {
    const shell = readFileSync(join(root, "index.html"), "utf8");
    expect(shell).toMatch(/<meta name="robots" content="noindex"/);
    expect(shell).not.toMatch(/rel="canonical"/);
  });
});
