#!/usr/bin/env node
/**
 * Override variables for `vite preview` ONLY (local e2e). The Cloudflare Vite plugin copies .dev.vars into
 * dist/<worker>/.dev.vars at build time and `vite preview` reads that copy; this rewrites keys in the copy, so the
 * checkout's own .dev.vars is never touched. `wrangler deploy` never reads .dev.vars.
 *
 *   node scripts/preview-vars.mjs ACCOUNTS_ENABLED=false BILLING_ENABLED=false FRIENDS_ENABLED=false
 *
 * Used by `npm run e2e:launch` (playwright.config.ts, BZ_E2E_FLAGS=launch) to serve production's guest-only flags.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const pairs = process.argv.slice(2).map((a) => {
  const m = /^([A-Z][A-Z0-9_]*)=([A-Za-z0-9_.:-]*)$/.exec(a);
  if (!m) throw new Error(`preview-vars: expected KEY=value (letters, digits, _ . : -), got ${JSON.stringify(a)}`);
  return [m[1], m[2]];
});
const workers = existsSync(dist) ? readdirSync(dist, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(dist, d.name, "wrangler.json"))) : [];
if (workers.length !== 1) throw new Error(`preview-vars: expected one built worker in dist/, found ${workers.length}; run npm run build first`);
const file = join(dist, workers[0].name, ".dev.vars");
const lines = existsSync(file) ? readFileSync(file, "utf8").split("\n").filter((l) => l.trim() !== "") : [];
for (const [k, v] of pairs) {
  const i = lines.findIndex((l) => l.startsWith(`${k}=`));
  const line = `${k}='${v}'`;
  if (i >= 0) lines[i] = line;
  else lines.push(line);
}
writeFileSync(file, lines.join("\n") + "\n");
console.log(`preview-vars: ${pairs.map(([k, v]) => `${k}=${v}`).join(" ")} → ${file.slice(root.length + 1)}`);
