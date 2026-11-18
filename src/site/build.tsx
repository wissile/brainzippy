/**
 * Pure site renderer: turns the route list into static HTML documents and a sitemap. No file system
 * access here, so unit tests can call it directly; scripts/prerender.mjs writes the files.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { absoluteUrl } from "./entity";
import { Document } from "./layout";
import { buildRoutes } from "./routes";
import type { PageDef, RenderedPage, SiteAssets } from "./types";
import siteCss from "./site.css?raw";
import clientJs from "./client.js?raw";

/** The landing page cannot be index.html (that file is the SPA shell used as the fallback for app routes). */
export const LANDING_FILE = "landing.html";

export const fileFor = (path: string) => (path === "/" ? LANDING_FILE : `${path.slice(1)}.html`);

/** Strip comments and collapse whitespace; enough for a few KB of hand-written CSS. */
export const minifyCss = (css: string) =>
  css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{}:;,>])\s*/g, "$1").replace(/;}/g, "}").trim();

export const SITE_CSS = siteCss;
export const SITE_JS = clientJs;

export function renderPage(page: PageDef, assets: SiteAssets): RenderedPage {
  const html = "<!doctype html>" + renderToStaticMarkup(<Document page={page} assets={assets}>{page.render()}</Document>);
  return { path: page.path, file: fileFor(page.path), html, updated: page.updated };
}

export function renderSite(assets: SiteAssets): { pages: RenderedPage[]; sitemap: string } {
  const pages = buildRoutes().map((p) => renderPage(p, assets));
  const sitemap =
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    pages.map((p) => `  <url><loc>${absoluteUrl(p.path)}</loc><lastmod>${p.updated}</lastmod></url>`).join("\n") +
    "\n</urlset>\n";
  return { pages, sitemap };
}

/** _redirects rules the prerendered site needs (merged with any public/_redirects by the prerender script). */
export const REDIRECT_RULES = [
  "# Prerendered landing page: / serves landing.html; /landing must not be a duplicate URL.",
  "/landing / 301",
  "/ /landing 200",
].join("\n");
