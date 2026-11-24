import { describe, expect, it } from "vitest";
import { APOSTROPHE_SENTENCES } from "../../src/games/wordroot-grove/grammar";
import { FIT_ITEMS } from "../../src/games/wordroot-grove/morphology";

/**
 * QA review (independent): items with a second defensible answer (docs §3.2 "exactly one correct option").
 * These fail on purpose until the content is changed; see the QA report.
 */
describe("wordroot grove QA: one defensible answer", () => {
  it("fit 'dance': 'Every move in the dance matched the music' is a correct noun use, so 'move' must not be a distractor", () => {
    const f = FIT_ITEMS.find((x) => x.id === "dance")!;
    // "move" is also a noun (a dance move); a noun-gap item needs a distractor that cannot be a noun
    expect(f.distractors.map((d) => d.text)).not.toContain("move");
  });
  it("apostrophe 'nests': 'two bird's nests' is standard (bird's nest is a compound noun), so the item has two answers", () => {
    const x = APOSTROPHE_SENTENCES.find((s) => s.id === "nests")!;
    expect(/\bnests\b/.test(x.text) && x.distractors.some((d) => d.text === "bird's")).toBe(false);
  });
});
