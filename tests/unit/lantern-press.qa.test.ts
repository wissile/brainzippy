import { describe, expect, it } from "vitest";
import { generateBand } from "../../src/engine/round";
import type { Exercise } from "../../src/engine/types";
import { lanternPress } from "../../src/games/lantern-press/definition";
import { modeOf } from "../../src/games/lantern-press/logic";
import { CONNECTIVES, MODIFIERS } from "../../src/games/lantern-press/sentences";
import { WORD_GROUPS } from "../../src/games/lantern-press/words";

/**
 * QA review (independent): items with a second defensible answer (docs §3.2 "exactly one acceptable option") and
 * answer-length tells. These fail on purpose until the content is changed; see the QA report.
 */
const SEEDS = Array.from({ length: 80 }, (_, i) => i * 104729 + 3);
const all = (level: number): Exercise[] => SEEDS.flatMap((s) => generateBand(lanternPress, level, s, 8));

describe("lantern press QA: one defensible answer", () => {
  it("connective 'drum': 'Mei kept practicing the drum part although she could play it with her eyes closed' is a sensible contrast (she kept going despite mastery), so 'although' must not be a distractor", () => {
    const c = CONNECTIVES.find((x) => x.id === "drum")!;
    expect(c.distractors.map((d) => d.text)).not.toContain("although");
  });

  it("modTap 'scarf' / 'bell' / 'loaf': the authored fix moves the MIDDLE phrase, so under the prompt 'Tap the phrase that's in the wrong place' the middle phrase is also defensible", () => {
    const tap = all(2).find((e) => modeOf(e) === "modTap")!;
    const promptNamesTheDescriber = /describ/i.test(tap.prompt?.text ?? "");
    const strip = (s: string) => s.replace(/[,.]$/, "").toLowerCase();
    const bad = ["scarf", "bell", "loaf"].filter((id) => {
      const m = MODIFIERS.find((x) => x.id === id)!;
      // the clause and the middle phrase stay together in the fix only if the marked phrase is the one that moved
      const keptTogether = m.fix.toLowerCase().includes(`${strip(m.chunks[0]!)} ${strip(m.chunks[1]!)}`);
      return !keptTogether && !promptNamesTheDescriber;
    });
    expect(bad).toEqual([]);
  });

  it("feelSort: groups whose positive/neutral split is a fine shade (curious/interested, famous/well-known, determined/firm, confident/sure) are never sorted (docs §3: sorts use only clear-cut words)", () => {
    const fine = new Set(["curious", "known", "firm", "sure"]);
    const used = new Set<string>();
    for (const e of all(5)) if (modeOf(e) === "feelSort") for (const g of [e.params!.k!, e.params!.v!]) used.add(WORD_GROUPS[g]!.id);
    expect([...used].filter((g) => fine.has(g))).toEqual([]);
  });
});

describe("lantern press QA: no answer-length tell", () => {
  // Scan of 80 bands: the right option is the shortest in 39/39 distinct shift items and the longest in 12/12
  // strongest-evidence and 12/12 sufficiency items, so 'pick the shortest/longest' scores 100% on those modes.
  for (const [mode, level] of [["shift", 7], ["strongest", 9], ["enough", 9]] as const) {
    it(`${mode}: the right option is not always the shortest or always the longest`, () => {
      const items = all(level).filter((e) => modeOf(e) === mode && e.answer.kind === "choice");
      expect(items.length).toBeGreaterThan(5);
      let shortest = 0, longest = 0;
      for (const e of items) {
        if (e.answer.kind !== "choice") continue;
        const lens = e.answer.options.map((o) => (o.text ?? "").length);
        const right = e.answer.options.find((o) => o.id === (e.answer as { correct: string }).correct)!.text!.length;
        if (right === Math.min(...lens)) shortest++;
        if (right === Math.max(...lens)) longest++;
      }
      expect(shortest, "always shortest").toBeLessThan(items.length);
      expect(longest, "always longest").toBeLessThan(items.length);
    });
  }
});
