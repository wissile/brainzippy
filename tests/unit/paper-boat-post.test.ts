import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createRng } from "../../src/engine/rng";
import { buildRound, generateBand } from "../../src/engine/round";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import { lintExercise, validateAnswer } from "../../src/engine/validation";
import type { Exercise } from "../../src/engine/types";
import { getSkill, getWorld } from "../../src/content/registry";
import { BLOCKLIST, isBlocked } from "../../src/games/paper-boat-post/blocklist";
import { COMPOUNDS, CVC, FAMILIES, NOTES_BUILD, NOTES_READ, PLURALS, READ_SETS, SORTS, TAGS, buildText, isTricky } from "../../src/games/paper-boat-post/content";
import { paperBoatPost, paperBoatTutorial } from "../../src/games/paper-boat-post/definition";
import { LEVEL_SKILL, NEAR_TARGETS, PB_MAX_LEVEL, SWAP_PAIRS, buildDecoys, generatePaperBoat, targetsOf } from "../../src/games/paper-boat-post/generator";
import { explainFor, hintFor, praiseFor } from "../../src/games/paper-boat-post/hints";
import { classify, modeOf, modelSteps, oneGraphemeApart, pictureWord, sailWord, safeTiles, tileStrings } from "../../src/games/paper-boat-post/logic";
import { KEYWORDS, REAL_WORDS, WORDS, graphemes, word, wordLevel } from "../../src/games/paper-boat-post/words";

const voice = JSON.parse(readFileSync("src/games/paper-boat-post/voice.json", "utf8")) as { lines: Record<string, { text: string; vary?: Record<string, string[]>; speaker?: string }> };
const L = voice.lines;
const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7919 + 3);
const band = (level: number, seed: number) => generateBand(paperBoatPost, level, seed, 8);
const allItems = (): Exercise[] => {
  const out: Exercise[] = [];
  for (let lv = 0; lv <= PB_MAX_LEVEL; lv++) for (const s of SEEDS) out.push(...band(lv, s));
  return [...out, paperBoatTutorial];
};
const ITEMS = allItems();
const oneLetterApart = (a: string, b: string) => a.length === b.length && [...a].filter((c, i) => c !== b[i]).length === 1;
const textOf = (ex: Exercise, id: string) => (ex.answer.kind === "sequence" ? ex.answer.pieces.find((p) => p.id === id)?.text ?? id : id);

describe("paper boat post: structure", () => {
  it("is registered under the English library with every skill declared", () => {
    const w = getWorld("paper-boat-post")!;
    expect(w.subject).toBe("english");
    expect(w.maxLevel).toBe(9);
    expect([...w.ages]).toEqual([6, 8]);
    for (const s of paperBoatPost.skillIds) expect(getSkill(s), s).toBeDefined();
    expect(paperBoatPost.progression.maxLevel).toBe(PB_MAX_LEVEL);
  });

  it("has exactly one tutorial (level 0, difficulty 1) with a pointing target that is the right tile", () => {
    const tutorials = buildRound(paperBoatPost, { level: 0, seed: 1 }).exercises.filter((e) => e.tutorial);
    expect(tutorials).toHaveLength(1);
    expect(tutorials[0]!.difficulty).toBe(1);
    expect(tutorials[0]!.answer).toMatchObject({ kind: "choice", correct: "h" });
  });

  it("levels 0–9 × 60 seeds: every item lints, has a declared skill and exactly one right answer", () => {
    for (const ex of ITEMS) {
      expect(lintExercise({ ...ex, difficulty: ex.difficulty ?? 1 }), ex.id).toEqual([]);
      expect(paperBoatPost.skillIds, ex.id).toContain(ex.skillId);
      const a = ex.answer;
      if (a.kind === "choice") {
        expect(a.options.filter((o) => validateAnswer(a, o.id).correct), ex.id).toHaveLength(1);
        expect(new Set(a.options.map((o) => o.art ?? o.text)).size, `${ex.id} duplicate options`).toBe(a.options.length);
      }
      if (a.kind === "sequence") expect(validateAnswer(a, a.order).correct).toBe(true);
      if (a.kind === "match") expect(validateAnswer(a, a.pairs).correct).toBe(true);
    }
  });

  it("is deterministic and never repeats a target inside one level's band", () => {
    for (let lv = 0; lv <= PB_MAX_LEVEL; lv++) {
      for (const s of SEEDS.slice(0, 20)) {
        const a = band(lv, s);
        expect(a).toEqual(band(lv, s));
        const keys = a.map((e) => e.id.replace(/-(r\d-)?l\dn\d$/, ""));
        expect(new Set(keys).size, `level ${lv} seed ${s}: ${keys.join(" ")}`).toBe(keys.length);
      }
    }
  });

  it("each level has at least 16 distinct items over many seeds, and the modes rotate as specified", () => {
    for (let lv = 0; lv <= PB_MAX_LEVEL; lv++) {
      const ids = new Set<string>();
      for (const s of SEEDS) for (const e of band(lv, s)) ids.add(e.id.replace(/-l\dn\d$/, "").replace(/-r\d$/, ""));
      expect(ids.size, `level ${lv}`).toBeGreaterThanOrEqual(16);
    }
    const modes = (lv: number) => band(lv, 5).map((e) => modeOf(e));
    expect(modes(0).every((m) => m === "swap")).toBe(true);
    expect(modes(1).every((m) => m === "read")).toBe(true);
    expect(modes(2)[2]).toBe("tag");
    expect(modes(3).filter((_, i) => i % 2 === 1).every((m) => m === "build")).toBe(true);
    expect(modes(7)[1]).toBe("sort");
    expect(modes(8)[0]).toBe("read");
    expect(modes(8)[2]).toBe("plural");
    expect(modes(8)[1]).toBe("compound");
    expect(modes(9)[0]).toBe("noteRead");
    expect(modes(9)[1]).toBe("noteBuild");
  });

  it("from level 4, items 3 and 7 are review items from an earlier level with that level's skill", () => {
    for (let lv = 4; lv <= PB_MAX_LEVEL; lv++) for (const s of SEEDS.slice(0, 10)) {
      const b = band(lv, s);
      for (const i of [3, 7]) {
        const src = Number(/-r(\d)-/.exec(b[i]!.id)?.[1]);
        expect(src, b[i]!.id).toBeLessThan(lv);
        expect(src).toBeGreaterThanOrEqual(1);
        expect(LEVEL_SKILL[src] === b[i]!.skillId || (src === 9 && b[i]!.skillId === "english.sentence.build")).toBe(true);
      }
      for (const i of [0, 1, 2, 4, 5, 6]) expect(b[i]!.id, b[i]!.id).not.toMatch(/-r\d-/);
    }
  });
});

describe("paper boat post: reading is reading", () => {
  const reads = ITEMS.filter((e) => ["read", "plural", "noteRead"].includes(modeOf(e)));
  it("the prompt line, its vars and the caption never contain the target word or note", () => {
    expect(reads.length).toBeGreaterThan(100);
    for (const ex of reads) {
      const w = modeOf(ex) === "noteRead" ? NOTES_READ[ex.params!.s!]!.text : sailWord(ex)!;
      expect(w, ex.id).toBeTruthy();
      expect(ex.prompt!.line).toBe(modeOf(ex) === "noteRead" ? "pb.prompt.note.read" : "pb.prompt.read");
      expect(Object.values(ex.prompt!.vars ?? {}).map(String)).not.toContain(w);
      expect(ex.prompt!.text.toLowerCase().split(/\W+/), ex.id).not.toContain(w.toLowerCase());
      expect(L[ex.prompt!.line]!.text.toLowerCase().split(/\W+/)).not.toContain(w.toLowerCase());
      expect(ex.objectKind, `${ex.id} prompt icon`).toMatch(/^(boat|note)$/);
    }
  });
  it("the screen-reader description spells the word letter by letter (not the whole word first)", () => {
    for (const ex of reads.filter((e) => modeOf(e) !== "noteRead")) {
      const w = sailWord(ex)!;
      expect(ex.a11yDescription, ex.id).toContain(`sail: ${w.split("").join(", ")}.`);
    }
    for (const ex of reads.filter((e) => modeOf(e) === "noteRead")) expect(ex.a11yDescription, ex.id).toContain("Word by word:");
  });
  it("praise speaks the word only after a right answer, and every praise/hint/help line exists", () => {
    for (const ex of ITEMS) {
      for (const id of praiseFor(ex)) expect(L[id], `${ex.id} praise ${id}`).toBeDefined();
      expect(L[explainFor(ex)], explainFor(ex)).toBeDefined();
      const st = initExercise(ex);
      const a = ex.answer;
      const wrong = a.kind === "choice" ? a.options.find((o) => o.id !== a.correct)!.id : a.kind === "sequence" ? [...a.order].reverse() : Object.fromEntries(Object.keys(a.kind === "match" ? a.pairs : {}).map((k) => [k, a.kind === "match" ? a.targets.find((t) => t.id !== a.pairs[k])!.id : ""]));
      const after = exerciseReducer(st, { type: "SUBMIT", value: wrong });
      expect(L[hintFor(after)], `${ex.id} hint ${hintFor(after)}`).toBeDefined();
    }
  });
});

describe("paper boat post: content rules", () => {
  it("grapheme gating: no target uses a grapheme taught above its level", () => {
    for (let lv = 0; lv <= 8; lv++) for (const w of targetsOf(lv)) {
      const lvOf = PLURALS[w] || COMPOUNDS[w] ? 8 : wordLevel(w);
      expect(lvOf, `${w} at level ${lv}`).toBeLessThanOrEqual(lv);
    }
    expect(wordLevel("ship")).toBe(4);
    expect(wordLevel("frog")).toBe(5);
    expect(wordLevel("cape")).toBe(6);
    expect(wordLevel("boat")).toBe(7);
    expect(wordLevel("napkin")).toBe(8);
    expect(wordLevel("cat")).toBe(0);
  });

  it("level-0 swaps: the other tile makes a real, safe word; never b/d/p together; keyword pictures exist", () => {
    expect(SWAP_PAIRS.length).toBeGreaterThan(30);
    for (const ex of ITEMS.filter((e) => modeOf(e) === "swap")) {
      const a = ex.answer;
      if (a.kind !== "choice") throw new Error("swap is a choice");
      const to = String(ex.prompt!.vars!.to);
      const rime = to.slice(1);
      const other = a.options.find((o) => o.id !== a.correct)!.id;
      expect(REAL_WORDS.has(other + rime), `${other}${rime}`).toBe(true);
      expect(isBlocked(other + rime)).toBe(false);
      expect(["b", "d", "p", "q"].filter((l) => a.options.some((o) => o.id === l)).length).toBeLessThanOrEqual(1);
      for (const o of a.options) expect(o.art).toBe(KEYWORDS[o.id]);
      expect(FAMILIES[rime], rime).toContain(to);
    }
  });

  it("minimal pairs: from level 2, every reading item has a decoy one grapheme away; no e/i swap before m/n", () => {
    for (const ex of ITEMS.filter((e) => modeOf(e) === "read" && e.difficulty >= 3 && !/-r1-/.test(e.id))) {
      const a = ex.answer;
      if (a.kind !== "choice") continue;
      const w = a.correct;
      const decoys = a.options.filter((o) => o.id !== w).map((o) => o.id);
      if (word(w).parts) continue; // two-syllable sets differ by a syllable (tested by classify below)
      expect(decoys.some((d) => oneGraphemeApart(w, d) || oneLetterApart(w, d) || classify(w, d) === "dropped-consonant" || classify(w, d) === "short-partner" || ["digraph-swap", "blend-swap", "team-swap"].includes(classify(w, d))), `${ex.id}: ${decoys}`).toBe(true);
      for (const d of decoys) {
        const [x, y] = [graphemes(w), graphemes(d)];
        if (x.length === 3 && y.length === 3 && ["m", "n"].includes(x[2]!) && x[2] === y[2]) expect([x[1], y[1]].sort().join(""), `${w}/${d}`).not.toBe("ei");
      }
    }
    // L2 near misses: one vowel-only and one final-only decoy
    for (const ex of ITEMS.filter((e) => modeOf(e) === "read" && (e.difficulty === 3 || e.difficulty === 4) && /-l[23]n/.test(e.id))) {
      const a = ex.answer;
      if (a.kind !== "choice") continue;
      const kinds = a.options.filter((o) => o.id !== a.correct).map((o) => classify(a.correct, o.id)).sort();
      expect(kinds, ex.id).toEqual(["final-swap", "vowel-swap"]);
    }
  });

  it("no two pictures in one item could be named the same word (one picture per word)", () => {
    const SAME = [["sack", "bag"], ["pup", "dog"], ["kitten", "cat"], ["plate", "dish"], ["boat", "sailboat"], ["tub", "bathtub"], ["fish", "catfish"]];
    for (const ex of ITEMS) {
      const a = ex.answer;
      if (a.kind !== "choice") continue;
      const arts = a.options.map((o) => (o.art ?? "").split("*")[0]);
      for (const [x, y] of SAME) expect(arts.includes(x!) && arts.includes(y!), `${ex.id}: ${x}/${y}`).toBe(false);
    }
  });

  it("blocklist: every word, decoy, tag, card and every string a tile set can spell is clean", () => {
    for (const w of WORDS.keys()) expect(isBlocked(w), w).toBe(false);
    for (const [, name, a, b] of TAGS) for (const t of [name, a, b]) {
      expect(isBlocked(t), t).toBe(false);
      expect(REAL_WORDS.has(t), `${t} must not be a real word`).toBe(false);
    }
    for (const ex of ITEMS) {
      const a = ex.answer;
      if (a.kind === "choice") for (const o of a.options) expect(isBlocked((o.text ?? o.art ?? o.id).split("*")[0]!), `${ex.id} ${o.id}`).toBe(false);
      if (a.kind === "sequence" && modeOf(ex) === "build") {
        const tiles = a.pieces.map((p) => p.text!);
        for (const s of tileStrings(tiles, a.order.length)) expect(isBlocked(s), `${ex.id}: ${s}`).toBe(false);
        if (ex.params?.e === 1) for (const s of tileStrings(tiles, a.order.length - 1)) expect(isBlocked(s), `${ex.id}: ${s}`).toBe(false);
      }
      if (a.kind === "sequence" && modeOf(ex) === "compound") for (const s of tileStrings(a.pieces.map((p) => p.text!), 2)) expect(isBlocked(s), s).toBe(false);
    }
    for (const n of [...NOTES_READ.map((x) => x.text), ...NOTES_BUILD.map(buildText)]) for (const w of n.split(/\W+/).filter(Boolean)) expect(isBlocked(w), `${n}: ${w}`).toBe(false);
    // the checker itself works (dropped-consonant forms of excluded words are caught)
    expect(isBlocked("cock") && isBlocked("fag") && isBlocked("Fart!")).toBe(true);
    expect(safeTiles(["s", "h", "i", "t"], 4)).toBe(false);
    expect(BLOCKLIST.size).toBeGreaterThan(50);
    expect([...WORDS.keys()]).not.toEqual(expect.arrayContaining(["flag", "clock", "flap"]));
  });

  it("spelling decoys target the named misconception", () => {
    const rng = createRng(4);
    expect(buildDecoys("fish", 4, rng).sort()).toEqual(["h", "s"]); // sh split into s + h can't fit 3 slots
    expect(buildDecoys("duck", 4, rng)).not.toContain("k"); // never offer k where ck is the only spelling
    expect(buildDecoys("pin", 3, rng)).not.toContain("e"); // no e/i before n (pin/pen)
    expect(buildDecoys("cape", 6, rng)).toHaveLength(1);
    expect(buildDecoys("nest", 5, rng)).toHaveLength(2);
  });

  it("a digraph target never validates with separate letters", () => {
    for (const ex of ITEMS.filter((e) => modeOf(e) === "build" && graphemes(String(e.prompt!.vars!.word)).some((g) => g.length === 2))) {
      const a = ex.answer;
      if (a.kind !== "sequence") continue;
      const singles = a.pieces.filter((p) => p.text!.length === 1).map((p) => p.id);
      const w = String(ex.prompt!.vars!.word);
      // any arrangement of single-letter tiles that spells the word letter by letter is not accepted
      const spelled = w.split("").map((ch) => singles.find((id) => textOf(ex, id) === ch));
      if (spelled.every(Boolean) && new Set(spelled).size === spelled.length) expect(validateAnswer(a, spelled as string[]).correct, ex.id).toBe(false);
      expect(a.order.every((id) => textOf(ex, id).length >= 1)).toBe(true);
    }
  });

  it("sentence builds: alternatives authored empty, first card capitalised, otherwise only names, end mark rule holds", () => {
    expect(NOTES_READ.length).toBeGreaterThanOrEqual(24);
    expect(NOTES_BUILD.length).toBeGreaterThanOrEqual(24);
    for (const n of NOTES_BUILD) {
      expect(n.alternatives, n.id).toEqual([]);
      expect(n.cards.length, n.id).toBeLessThanOrEqual(8);
      expect(n.cards[0]![0], n.id).toMatch(/[A-Z]/);
      for (const c of n.cards.slice(1)) if (/[A-Z]/.test(c[0]!)) expect(["Bobbo", "Zuzu"], `${n.id} ${c}`).toContain(c);
      const mark = n.cards[n.cards.length - 1]!;
      expect([".", "?"]).toContain(mark);
      // "?" and "." are offered together only for questions (where "." can't make a valid sentence)
      if (n.extra === "." || n.extra === "?") expect(mark, n.id).toBe("?");
      if (/^[a-z]+$/.test(n.extra) && ["bobbo", "zuzu"].includes(n.extra)) expect(n.cards.map((c) => c.toLowerCase())).toContain(n.extra);
      expect(n.cards.slice(1).filter((c) => /^[A-Z]/.test(c) && !["Bobbo", "Zuzu"].includes(c))).toEqual([]);
    }
    for (const n of NOTES_READ) {
      expect(n.words.length, n.id).toBeLessThanOrEqual(7);
      for (const d of n.decoys) {
        const diff = (["who", "rel", "what"] as const).filter((k) => d[k] !== n.scene[k]);
        expect(diff, `${n.id} decoy differs by one word`).toHaveLength(1);
      }
      for (const w of n.words) if (!isTricky(w) && !["Bobbo", "Zuzu", "has", "in", "on"].includes(w)) expect(WORDS.has(w.toLowerCase()) || CVC.includes(w.toLowerCase()), `${n.id}: ${w}`).toBe(true);
    }
  });

  it("US spelling: no word in the bank has a common UK variant", () => {
    const UK = /colour|favour|grey|tyre|jewellery|mum\b|aeroplane|nappy|pyjama|centre|theatre|ise$/;
    for (const w of WORDS.keys()) expect(UK.test(w), w).toBe(false);
  });

  it("sort items put every boat at the dock with its spelling", () => {
    for (const ex of ITEMS.filter((e) => modeOf(e) === "sort")) {
      const a = ex.answer;
      if (a.kind !== "match") continue;
      for (const [w, bin] of Object.entries(a.pairs)) {
        const s = SORTS[ex.params!.p!]!;
        expect(bin === s.a ? s.aWords : s.bWords, `${w}→${bin}`).toContain(w);
        expect(bin === "o_e" ? word(w).magic : w.includes(bin), `${w} spelled with ${bin}`).toBeTruthy();
      }
    }
  });

  it("compound cards: exactly one ordered pair of cards is a compound in the bank", () => {
    for (const [w, cards] of Object.entries(COMPOUNDS)) {
      const pairs = cards.flatMap((x) => cards.filter((y) => y !== x).map((y) => x + y)).filter((p) => p in COMPOUNDS);
      expect(pairs, w).toEqual([w]);
    }
  });
});

describe("paper boat post: hints and model", () => {
  it("first-miss hints key off the misconception", () => {
    const at = (ex: Exercise, value: string | string[]) => hintFor(exerciseReducer(initExercise(ex), { type: "SUBMIT", value }));
    const read = (t: string, d: string[]): Exercise => ({ ...paperBoatTutorial, id: "x", params: { m: 1 }, answer: { kind: "choice", correct: t, options: [t, ...d].map((id) => ({ id, art: id })) } });
    expect(at(read("cap", ["cup", "cat"]), "cup")).toBe("pb.hint.vowel");
    expect(at(read("cap", ["cup", "cat"]), "cat")).toBe("pb.hint.final");
    expect(at(read("frog", ["fog", "log"]), "fog")).toBe("pb.hint.dropped");
    expect(at(read("chip", ["ship", "chin"]), "ship")).toBe("pb.hint.digraph");
    expect(at(read("cape", ["cap", "cake"]), "cap")).toBe("pb.hint.e.1");
    expect(at(read("leaf", ["loaf", "leg"]), "loaf")).toBe("pb.hint.team");
    const fish = generatePaperBoat(4, createRng(1), 1);
    const fishEx = { ...fish, id: "pb-build-fish-x", difficulty: 5, prompt: { line: "pb.prompt.build", vars: { word: "fish" }, text: "Build fish!" }, answer: { kind: "sequence" as const, order: ["t0", "t1", "t2"], pieces: [{ id: "t0", text: "f" }, { id: "t1", text: "i" }, { id: "t2", text: "sh" }, { id: "x0", text: "s" }, { id: "x1", text: "h" }] }, params: { m: 3, n: 3, e: 0 } };
    expect(at(fishEx, ["t0", "t1", "x0"])).toBe("pb.hint.split");
  });

  it("the modelled answer has one step per unit plus the spoken word (reading), or one per slot (building)", () => {
    const r = ITEMS.find((e) => modeOf(e) === "read" && sailWord(e) === "cap")!;
    expect(modelSteps(r)).toBe(4);
    const b = ITEMS.find((e) => modeOf(e) === "build")!;
    expect(modelSteps(b)).toBe(b.answer.kind === "sequence" ? b.answer.order.length : -1);
    expect(modelSteps(ITEMS.find((e) => modeOf(e) === "sort")!)).toBe(0);
  });
});

describe("paper boat post: voice and pictures", () => {
  it("every voice line is short, captioned, prefixed and spoken by a known speaker; praise names process", () => {
    for (const [id, line] of Object.entries(L)) {
      expect(id.startsWith("pb."), id).toBe(true);
      expect(line.text.split(/\s+/).length, id).toBeLessThanOrEqual(14);
      expect(["sarah", "zuzu", "hoot", undefined], id).toContain(line.speaker);
      expect(line.text.toLowerCase(), id).not.toMatch(/smart|genius|clever|brilliant/);
    }
    for (const id of Object.keys(L).filter((k) => k.startsWith("pb.dlg."))) expect(L[id]!.text.length, id).toBeLessThanOrEqual(72);
  });

  it("vary lists cover every value the generator can produce; target words have word, slowed and after-answer clips", () => {
    for (const ex of ITEMS) {
      const line = L[ex.prompt!.line];
      expect(line, ex.prompt!.line).toBeDefined();
      for (const [k, values] of Object.entries(line!.vary ?? {})) expect(values, `${ex.id} ${k}`).toContain(String(ex.prompt!.vars![k]));
      const a = ex.answer;
      if (a.kind === "choice" && ["read", "plural"].includes(modeOf(ex))) for (const o of a.options) expect(L[`pb.w.${pictureWord(o.art!)}`], `${ex.id} ${o.art}`).toBeDefined();
    }
    for (let lv = 0; lv <= 8; lv++) for (const w of targetsOf(lv)) {
      expect(L[`pb.slow.${w}`], w).toBeDefined();
      expect(L[`pb.got.${w}`], w).toBeDefined();
      expect(L[`pb.slow.${w}`]!.text).toBe(w);
    }
    for (const n of [...NOTES_READ, ...NOTES_BUILD]) expect(L[`pb.s.${n.id}`], n.id).toBeDefined();
    for (const l of Object.keys(KEYWORDS)) expect(L[`pb.k.${l}`]!.text).toBe(KEYWORDS[l]);
    for (const n of NOTES_READ) for (const w of n.words) if (isTricky(w)) expect(L[`pb.t.${w.toLowerCase()}`], w).toBeDefined();
  });

  it("no reading target has a clip that plays before the answer (no pb.w line is ever a prompt)", () => {
    for (const ex of ITEMS.filter((e) => ["read", "plural", "noteRead"].includes(modeOf(e)))) expect(ex.prompt!.line.startsWith("pb.w.") || ex.prompt!.line.startsWith("pb.s.")).toBe(false);
  });

  it("every picture the game can show is drawn", async () => {
    const { hasPicture } = await import("../../src/games/paper-boat-post/art");
    const words = new Set<string>([...CVC, ...NEAR_TARGETS, ...Object.values(KEYWORDS), ...Object.keys(COMPOUNDS)]);
    for (const lv of [4, 5, 6, 7, 8]) for (const s of READ_SETS[lv]!) s.forEach((w) => words.add(w));
    for (const s of SORTS) [...s.aWords, ...s.bWords].forEach((w) => words.add(w));
    for (const [one, alike] of Object.values(PLURALS)) words.add(one).add(alike);
    for (const n of [...NOTES_READ.flatMap((x) => [x.scene, ...x.decoys]), ...NOTES_BUILD.map((x) => x.scene)]) for (const w of [n.who, n.what]) if (!["bobbo", "zuzu"].includes(w)) words.add(w);
    for (const w of words) expect(hasPicture(w), w).toBe(true);
  });
});
