import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @keyframes names are global across the whole bundle: when two stylesheets define the same name, the one that
 * loads last silently replaces the other everywhere. This broke the onboarding bubble pop when a library host
 * (Ripple) added its own `bubble-rise`. Prefix keyframes with the game/character id (e.g. `ripple-bubble-rise`).
 */
const ROOT = join(__dirname, "../../src");

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return cssFiles(p);
    return p.endsWith(".css") ? [p] : [];
  });
}

describe("CSS @keyframes", () => {
  it("every keyframes name is defined once across all stylesheets", () => {
    const where = new Map<string, string[]>();
    for (const file of cssFiles(ROOT)) {
      const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const m of css.matchAll(/@keyframes\s+([\w-]+)/g)) {
        where.set(m[1]!, [...(where.get(m[1]!) ?? []), relative(ROOT, file)]);
      }
    }
    const dupes = [...where].filter(([, files]) => files.length > 1).map(([name, files]) => `${name}: ${files.join(", ")}`);
    expect(dupes).toEqual([]);
    expect(where.size).toBeGreaterThan(20); // the scan really found the stylesheets
  });
});
