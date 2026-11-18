#!/usr/bin/env node
/**
 * Prerender the public content pages into the client build (runs after `vite build`).
 *
 *   dist/client/landing.html            served at /   (via a _redirects 200 rewrite; index.html stays the SPA shell)
 *   dist/client/<path>.html             served at /<path> (Workers Static Assets html_handling: auto-trailing-slash)
 *   dist/client/sitemap.xml
 *   dist/client/llms.txt                generated from the registry + editorial copy (src/site/llms.ts)
 *   dist/client/assets/site-<hash>.js   the only script on content pages
 *   dist/client/assets/<font>-<hash>.woff2
 *
 * Rendering itself lives in src/site/build.tsx (pure, unit-tested); this script only does file I/O.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist/client");
if (!existsSync(join(out, "index.html"))) {
  console.error("prerender: dist/client/index.html not found; run `vite build` first.");
  process.exit(1);
}

const hash = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);
function emitAsset(name, ext, buf) {
  const file = `assets/${name}-${hash(buf)}.${ext}`;
  mkdirSync(join(out, "assets"), { recursive: true });
  writeFileSync(join(out, file), buf);
  return `/${file}`;
}

const { module: site } = await runnerImport(join(root, "src/site/build.tsx"), { configFile: false, logLevel: "error" });

// Self-hosted fonts (Latin subset, same families as the game). font-display: swap; one weight preloaded.
const FONTS = [
  { family: "Baloo 2", weight: 800, file: "@fontsource/baloo-2/files/baloo-2-latin-800-normal.woff2", name: "baloo2-800" },
  { family: "Nunito", weight: 400, file: "@fontsource/nunito/files/nunito-latin-400-normal.woff2", name: "nunito-400" },
  { family: "Nunito", weight: 700, file: "@fontsource/nunito/files/nunito-latin-700-normal.woff2", name: "nunito-700" },
];
const LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const fontUrls = FONTS.map((f) => ({ ...f, url: emitAsset(f.name, "woff2", readFileSync(join(root, "node_modules", f.file))) }));
const fontCss = fontUrls
  .map((f) => `@font-face{font-family:"${f.family}";font-style:normal;font-weight:${f.weight};font-display:swap;src:url(${f.url}) format("woff2");unicode-range:${LATIN}}`)
  .join("");

const assets = {
  css: fontCss + site.minifyCss(site.SITE_CSS),
  js: emitAsset("site", "js", Buffer.from(site.SITE_JS.trim() + "\n")),
  preloadFont: fontUrls[0].url,
};

const { pages, sitemap, llms } = site.renderSite(assets);
for (const p of pages) {
  const dest = join(out, p.file);
  if (existsSync(dest)) throw new Error(`prerender: ${p.file} already exists in the build (a public/ file would be shadowed)`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, p.html);
}
writeFileSync(join(out, "sitemap.xml"), sitemap);
for (const generated of ["llms.txt"]) {
  if (existsSync(join(out, generated))) throw new Error(`prerender: ${generated} is generated; delete public/${generated}`);
}
writeFileSync(join(out, "llms.txt"), llms);

// Merge our routing rules ahead of any rules copied from public/_redirects.
const redirectsPath = join(out, "_redirects");
const existing = existsSync(redirectsPath) ? readFileSync(redirectsPath, "utf8") : "";
writeFileSync(redirectsPath, `${site.REDIRECT_RULES}\n${existing}`);

// The SPA shell must never be indexed (it is served for /hello, /map, /play/* and unknown paths).
const shell = readFileSync(join(out, "index.html"), "utf8");
if (!/name="robots" content="noindex/.test(shell)) throw new Error("prerender: dist/client/index.html is missing <meta name=robots content=noindex>");

const kb = (n) => (n / 1024).toFixed(1);
const sizes = pages.map((p) => Buffer.byteLength(p.html));
console.log(`prerender: ${pages.length} pages (HTML ${kb(Math.min(...sizes))}–${kb(Math.max(...sizes))} KB), sitemap.xml, llms.txt, _redirects, site js ${kb(Buffer.byteLength(site.SITE_JS))} KB`);
