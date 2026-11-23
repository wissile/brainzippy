#!/usr/bin/env node
/**
 * Character screenshot sheet (dev only). Serves the gallery (src/characters/library/gallery) with a bare Vite
 * dev server (no Worker), then captures with Playwright Chromium:
 *   grid-64.png / grid-240-<id>.png   every library host in every state (reduced motion = held poses)
 *   motion-240-<id>.png               same, animations running (a mid-motion frame)
 *   lineup.png                        whole cast side by side at 120 px
 *   silhouette-48.png                 whole cast as solid shapes at 48 px
 * Usage: flock /tmp/bz-e2e.lock node scripts/screenshot-characters.mjs [outDir] (PW_PORT, default 4201)
 */
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { chromium } from "@playwright/test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] ?? (process.env.BZ_REVIEW_DIR ? `${process.env.BZ_REVIEW_DIR}/characters` : "test-results/review/characters"));
const port = Number(process.env.PW_PORT ?? 4201);
mkdirSync(out, { recursive: true });

const server = await createServer({ root, configFile: false, plugins: [react()], logLevel: "warn", server: { port, strictPort: true } });
await server.listen();
const base = `http://localhost:${port}/scripts/character-gallery/index.html`;
const ids = ["toggle", "zephy", "budge", "fenn", "dabble", "yonder", "snug", "brix", "ripple", "ziggy", "sarah"];

const browser = await chromium.launch();
try {
  const shoot = async (query, file, { reduced = true, width = 1400 } = {}) => {
    const ctx = await browser.newContext({ viewport: { width, height: 400 }, reducedMotion: reduced ? "reduce" : "no-preference" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(`${base}?${query}`);
    await page.getByTestId("gallery").waitFor({ state: "attached" });
    await page.waitForTimeout(reduced ? 300 : 450);
    await page.screenshot({ path: `${out}/${file}`, fullPage: true });
    await ctx.close();
    if (errors.length) throw new Error(`${file}: ${errors.join("\n")}`);
    console.log(`saved ${out}/${file}`);
  };
  await shoot("view=grid&size=64", "grid-64.png", { width: 900 });
  for (const id of ids) {
    await shoot(`view=grid&size=240&only=${id}`, `grid-240-${id}.png`, { width: 2300 });
    await shoot(`view=grid&size=240&only=${id}`, `motion-240-${id}.png`, { width: 2300, reduced: false });
  }
  await shoot("view=lineup&size=120", "lineup.png", { width: 1000 });
  await shoot("view=silhouette&size=48", "silhouette-48.png", { width: 600 });
} finally {
  await browser.close();
  await server.close();
}
