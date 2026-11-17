import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { VOICE_LINES, renderLine } from "../../src/audio/voiceLines";

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}

describe("voice lines", () => {
  it("every voice-line id referenced in source exists in the catalogue", () => {
    const ids = new Set<string>();
    for (const file of sources("src")) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/(?:speak|voiceId\s*=|id:)\s*\(?\s*"([a-z]+\.[A-Za-z0-9.-]+)"/g)) ids.add(m[1]!);
    }
    for (const m of readFileSync("src/game/GameRunner.tsx", "utf8").matchAll(/"(prompt\.[a-z-]+)"/g)) if (m[1] !== "prompt.") ids.add(m[1]!);
    expect(ids.size).toBeGreaterThan(10);
    const missing = [...ids].filter((id) => !VOICE_LINES[id]);
    expect(missing).toEqual([]);
  });

  it("renders templates with object names and number words", () => {
    expect(renderLine("prompt.make-set", { kind: "berry", n: 4 })).toBe("Put four strawberries in my basket!");
    expect(renderLine("prompt.make-set", { kind: "apple", n: 1 })).toBe("Put one apple in my basket!");
    expect(renderLine("correct.3", { n: 7 })).toBe("Seven! You did it!");
    expect(renderLine("nope")).toBe("");
  });

  it("praise lines praise process, not ability", () => {
    for (const id of ["correct.1", "correct.2", "correct.3", "correct.4"]) {
      expect(VOICE_LINES[id]!.text.toLowerCase()).not.toMatch(/smart|genius|clever|brilliant/);
    }
  });
});

import { existsSync, readFileSync as read } from "node:fs";
import { voiceKey } from "../../src/audio/voiceLines";
describe("voice clip coverage", () => {
  const manifest = JSON.parse(read("public/audio/voice/manifest.json", "utf8")) as { clips: Record<string, string> };
  it("every line and every pre-rendered variant has an audio file on disk", () => {
    const missing: string[] = [];
    for (const [id, line] of Object.entries(VOICE_LINES)) {
      const vary = line.vary;
      const combos = vary ? Object.keys(vary).reduce<Record<string, string | number>[]>((acc, k) => acc.flatMap((c) => vary[k]!.map((v) => ({ ...c, [k]: v }))), [{}]) : [{}];
      for (const vars of combos) {
        const f = manifest.clips[voiceKey(id, vars)];
        if (!f || !existsSync(`public/audio/voice/${f}`)) missing.push(voiceKey(id, vars));
      }
    }
    expect(missing).toEqual([]);
  });
  it("keys include only the variables that change wording", () => {
    expect(voiceKey("prompt.make-set", { kind: "berry", n: 4, extra: 1 })).toBe("prompt.make-set__kind-berry__n-4");
    expect(voiceKey("retry.1", { n: 3 })).toBe("retry.1");
  });
});
