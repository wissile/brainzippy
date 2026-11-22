#!/usr/bin/env node
/**
 * Production deploy guard (.github/workflows/deploy.yml, D-030 / D-031). Fails unless production is guest-only:
 * ACCOUNTS_ENABLED, BILLING_ENABLED and FRIENDS_ENABLED must each be exactly "false"
 *   1. under env.production.vars in wrangler.jsonc, and
 *   2. in the built config that `wrangler deploy` uploads (dist/<worker>/wrangler.json), when it exists.
 * A missing flag, a typo or any other value fails too (fail closed).
 *
 *   node scripts/check-guest-flags.mjs                    # guard (exit 1 on any flag that is not "false")
 *   node scripts/check-guest-flags.mjs --allow-features   # explicit override, for after legal review (docs/DEPLOY.md §4)
 *
 * The workflow passes --allow-features only when the person starting "Deploy → production" ticks the
 * "allow_features" input. The post-deploy smoke test (scripts/ci-smoke.sh) still checks the live flags either way.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const GUARDED_FLAGS = ["ACCOUNTS_ENABLED", "BILLING_ENABLED", "FRIENDS_ENABLED"];

/** Strips // and /* *\/ comments outside strings (wrangler.jsonc). Trailing commas are not supported: JSON.parse fails (closed). */
export function stripJsonComments(text) {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      out += c;
      if (c === "\\") out += text[++i] ?? "";
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
      out += c;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i++;
    } else out += c;
  }
  return out;
}

/** Problems with a vars object; empty = guest-only. */
export function flagProblems(vars, where) {
  return GUARDED_FLAGS.filter((k) => vars?.[k] !== "false").map((k) => `${where}: ${k} is ${JSON.stringify(vars?.[k])}, expected "false"`);
}

export function checkGuestFlags({ wranglerJsonc, builtJson }) {
  const cfg = JSON.parse(stripJsonComments(wranglerJsonc));
  const problems = flagProblems(cfg?.env?.production?.vars, "wrangler.jsonc env.production.vars");
  if (builtJson !== undefined) problems.push(...flagProblems(JSON.parse(builtJson)?.vars, "built dist/<worker>/wrangler.json"));
  return problems;
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const allow = process.argv.includes("--allow-features");
  const dist = join(root, "dist");
  const built = existsSync(dist)
    ? readdirSync(dist, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== "client" && existsSync(join(dist, d.name, "wrangler.json")))
    : [];
  if (built.length > 1) {
    console.error(`::error::Expected one built worker in dist/, found ${built.length}`);
    process.exit(1);
  }
  let problems;
  try {
    problems = checkGuestFlags({
      wranglerJsonc: readFileSync(join(root, "wrangler.jsonc"), "utf8"),
      builtJson: built[0] ? readFileSync(join(dist, built[0].name, "wrangler.json"), "utf8") : undefined,
    });
  } catch (e) {
    console.error(`::error::Could not read the production flags: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
  if (problems.length === 0) {
    console.log(`Guest-only production confirmed: ${GUARDED_FLAGS.join(", ")} are "false".`);
    return;
  }
  if (allow) {
    for (const p of problems) console.log(`::warning::${p} (allowed by the allow_features override)`);
    return;
  }
  for (const p of problems) console.error(`::error::${p}`);
  console.error('Production must stay guest-only until legal review (D-030). To deploy with features on, re-run "Deploy → production" with allow_features ticked (docs/DEPLOY.md §4).');
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main();
