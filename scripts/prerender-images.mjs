#!/usr/bin/env node
/**
 * Generate the committed images used by the public pages (run by hand when art or titles change):
 *
 *   node scripts/prerender-images.mjs                      OG cards + logo -> public/og/
 *   node scripts/prerender-images.mjs --shots <baseUrl>    also real game screenshots -> public/og/shots/
 *                                                          (baseUrl = a running `vite preview` of the built app)
 *   ... --wait <ms>                                        settle time before each shot (default 2500)
 *   ... --only <id,id>                                     limit screenshots to these game ids (keeps the other
 *                                                          committed shots byte-identical)
 *
 * Uses Playwright's Chromium (already a dev dependency). Screenshots use synthetic local state only.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { runnerImport } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/og");
const args = process.argv.slice(2);
const shotsBase = args.includes("--shots") ? args[args.indexOf("--shots") + 1] : null;
const settle = args.includes("--wait") ? Number(args[args.indexOf("--wait") + 1]) : 2500;
const only = args.includes("--only") ? new Set(args[args.indexOf("--only") + 1].split(",")) : null;

const font = (family, weight, file) =>
  `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/woff2;base64,${readFileSync(join(root, "node_modules", file)).toString("base64")}) format("woff2")}`;
const fontFace =
  font("Baloo 2", 800, "@fontsource/baloo-2/files/baloo-2-latin-800-normal.woff2") +
  font("Nunito", 700, "@fontsource/nunito/files/nunito-latin-700-normal.woff2");

const { module: og } = await runnerImport(join(root, "src/site/og.tsx"), { configFile: false, logLevel: "error" });
const browser = await chromium.launch();

for (const job of og.ogJobs(fontFace)) {
  const page = await browser.newPage({ viewport: { width: job.width, height: job.height } });
  await page.setContent(job.html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const dest = join(outDir, job.file);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, await page.screenshot({ type: "png" }));
  await page.close();
  console.log("wrote", job.file);
}

if (shotsBase) {
  const { module: catalog } = await runnerImport(join(root, "src/site/catalog.ts"), { configFile: false, logLevel: "error" });
  const state = {
    profile: { monster: { body: "round", color: "purple", eyes: "three", mouth: "smile", arms: "wings", top: "horns" }, monsterName: "Ziggy", kidName: "", step: "done", parentSignup: "skipped" },
    muted: true,
    music: false,
  };
  for (const g of catalog.GAMES) {
    if (only && !only.has(g.id)) continue;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.75, reducedMotion: "reduce" }); // 960×600 output
    const page = await ctx.newPage();
    await page.addInitScript((s) => localStorage.setItem("bz.v1", JSON.stringify(s)), state);
    await page.goto(`${shotsBase}${g.playPath}`);
    // Tap through the story intro (begin / skip / start) until a puzzle is on screen.
    const ready = page.locator('[data-testid="game-screen"][data-phase="counting"], [data-testid="game-screen"][data-phase="answering"]');
    const buttons = page.locator('[data-testid="story-begin"], [data-testid="story-skip"], [data-testid="start-game"]');
    for (let i = 0; i < 20 && !(await ready.count()); i++) {
      if (await buttons.count()) await buttons.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(700);
    }
    await ready.waitFor({ timeout: 20_000 });
    await page.waitForTimeout(settle);
    const dest = join(outDir, "shots", `${g.id}.jpg`);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, await page.screenshot({ type: "jpeg", quality: 78 }));
    await ctx.close();
    console.log("wrote shots/" + g.id + ".jpg");
  }
}
await browser.close();
