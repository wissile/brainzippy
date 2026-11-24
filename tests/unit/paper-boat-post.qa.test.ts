/**
 * QA review (independent) — Paper Boat Post defects captured as tests. These are EXPECTED TO FAIL until fixed.
 * 1. A reading target must never be spoken before the answer: the round-start helper line counts too.
 * 2. Two pictures a 6-year-old would name the same way (or can't tell apart) must never be the contrast in one item.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateBand } from "../../src/engine/round";
import type { Exercise } from "../../src/engine/types";
import { NOTES_READ, parseScene } from "../../src/games/paper-boat-post/content";
import { paperBoatPost } from "../../src/games/paper-boat-post/definition";
import { PB_MAX_LEVEL } from "../../src/games/paper-boat-post/generator";
import { explainFor } from "../../src/games/paper-boat-post/hints";
import { modeOf, sailWord } from "../../src/games/paper-boat-post/logic";

const voice = JSON.parse(readFileSync("src/games/paper-boat-post/voice.json", "utf8")) as { lines: Record<string, { text: string }> };
const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 3);
const ITEMS: Exercise[] = [];
for (let lv = 0; lv <= PB_MAX_LEVEL; lv++) for (const s of SEEDS) ITEMS.push(...generateBand(paperBoatPost, lv, s, 8));
const wordsOf = (t: string) => t.toLowerCase().split(/[^a-z]+/).filter(Boolean);

describe("paper boat post QA: reading is reading", () => {
  it("the round-start helper line never contains a word printed on a reading item's sail or docks", () => {
    const leaks = new Set<string>();
    for (const ex of ITEMS) {
      const m = modeOf(ex);
      if (m !== "read" && m !== "plural") continue;
      const line = voice.lines[explainFor(ex)]!.text;
      const w = sailWord(ex)!;
      if (wordsOf(line).includes(w)) leaks.add(`${explainFor(ex)} says "${w}" before ${ex.id}`);
    }
    expect([...leaks].slice(0, 5)).toEqual([]);
  });
});

/** Pairs a 6-year-old names the same, or that are drawn near-identically (see the picture review). */
const SAME = [["cup", "mug"], ["mat", "rug"]] as const;
const same = (a: string, b: string) => SAME.some(([x, y]) => (a === x && b === y) || (a === y && b === x));

describe("paper boat post QA: one picture, one name", () => {
  it("no reading item offers two pictures that are named the same way", () => {
    const bad = new Set<string>();
    for (const ex of ITEMS) {
      const a = ex.answer;
      if (a.kind !== "choice" || modeOf(ex) !== "read") continue;
      const arts = a.options.map((o) => o.art ?? o.id);
      for (const x of arts) for (const y of arts) if (same(x, y)) bad.add(`${ex.id}: ${arts.join("/")}`);
    }
    expect([...bad].slice(0, 5)).toEqual([]);
  });
  it("no note's decoy scene differs from the right scene only by a same-name object", () => {
    const bad: string[] = [];
    for (const n of NOTES_READ) for (const d of n.decoys) {
      const r = n.scene;
      if (r.who === d.who && r.rel === d.rel && same(r.what, d.what)) bad.push(`${n.id} "${n.text}": ${r.what} vs ${d.what}`);
    }
    expect(bad).toEqual([]);
    expect(parseScene("bug-in-cup").what).toBe("cup");
  });
});
