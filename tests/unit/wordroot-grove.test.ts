import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildRound, generateBand } from "../../src/engine/round";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import { lintExercise, validateAnswer } from "../../src/engine/validation";
import type { Exercise } from "../../src/engine/types";
import { getSkill, getWorld } from "../../src/content/registry";
import { isBlocked } from "../../src/games/paper-boat-post/blocklist";
import { REAL_WORDS } from "../../src/games/paper-boat-post/words";
import { APOSTROPHE_SENTENCES, CONFUSED_ITEMS, OWNER_PICTURES } from "../../src/games/wordroot-grove/grammar";
import { wordrootGrove, wordrootTutorial } from "../../src/games/wordroot-grove/definition";
import { LEVEL_SKILL, WG_MAX_LEVEL, generateWordroot, isReview } from "../../src/games/wordroot-grove/generator";
import { explainFor, hintFor, praiseFor } from "../../src/games/wordroot-grove/hints";
import {
  affixWordOf, chainOf, distractorsOf, modeOf, modelSteps, passageOf, slug, stretchOf, tagOf, twoAffixOf,
} from "../../src/games/wordroot-grove/logic";
import {
  AFFIX, AMBIGUOUS, BUILD_DECOYS, CLASS_WORDS, FAMILY_ITEMS, FIT_ITEMS, PREFIX_WORDS, SORTABLE, SUFFIX_WORDS, TWO_AFFIX_WORDS,
} from "../../src/games/wordroot-grove/morphology";
import { ACROSS_SENTENCES, ALL_PASSAGES, INVENTED_WORDS, ONE_SENTENCE, passageText, wordCount } from "../../src/games/wordroot-grove/passages";
import { GREEK, GREEK_WORDS, ROOT, ROOTS, ROOT_CONTEXT, WORD_FOR } from "../../src/games/wordroot-grove/roots";
import { allLines } from "../../src/games/wordroot-grove/voice-lines";

const voice = JSON.parse(readFileSync("src/games/wordroot-grove/voice.json", "utf8")) as { lines: Record<string, { text: string; vary?: Record<string, string[]>; speaker?: string }> };
const L = voice.lines;
const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 11);
const band = (level: number, seed: number) => generateBand(wordrootGrove, level, seed, 8);
const ITEMS: Exercise[] = [];
for (let lv = 0; lv <= WG_MAX_LEVEL; lv++) for (const s of SEEDS) ITEMS.push(...band(lv, s));
ITEMS.push(wordrootTutorial);
const keyOf = (ex: Exercise) => ex.id.replace(/-(r\d-)?l\dn\d$|-tutorial$/, "");
const NAMES = ["Ana", "Kofi", "Mei", "Raj", "Lena", "Omar", "Zara", "Tomás", "Aiyana", "Sami", "Priya", "Jonah", "Nia", "Kenji"];

describe("wordroot grove: structure", () => {
  it("is registered under the English library (ages 9–11, maxLevel 9) with every skill declared", () => {
    const w = getWorld("wordroot-grove")!;
    expect(w.subject).toBe("english");
    expect([...w.ages]).toEqual([9, 11]);
    expect(w.maxLevel).toBe(9);
    expect(wordrootGrove.progression.maxLevel).toBe(WG_MAX_LEVEL);
    for (const s of wordrootGrove.skillIds) expect(getSkill(s), s).toBeDefined();
    expect(w.characters[0]).toBe("sarah");
  });

  it("has exactly one tutorial (level 0, difficulty 1): unlock → open the lock", () => {
    const tutorials = buildRound(wordrootGrove, { level: 0, seed: 1 }).exercises.filter((e) => e.tutorial);
    expect(tutorials).toHaveLength(1);
    expect(tutorials[0]!.difficulty).toBe(1);
    expect(affixWordOf(wordrootTutorial).word).toBe("unlock");
    const a = wordrootTutorial.answer;
    expect(a.kind === "choice" && a.options.find((o) => o.id === a.correct)?.text).toBe("open the lock");
    expect(wordrootTutorial.answer.kind === "choice" && wordrootTutorial.answer.options.map((o) => o.id)).toEqual(expect.arrayContaining(["open-the-lock"]));
  });

  it("levels 0–9 × 50 seeds: every item lints, has a declared skill and exactly one right answer; every distractor is tagged", () => {
    expect(ITEMS.length).toBeGreaterThan(4000);
    for (const ex of ITEMS) {
      expect(lintExercise({ ...ex, difficulty: ex.difficulty ?? 1 }), ex.id).toEqual([]);
      expect(wordrootGrove.skillIds, ex.id).toContain(ex.skillId);
      const a = ex.answer;
      if (a.kind === "choice") {
        expect(a.options.filter((o) => validateAnswer(a, o.id).correct), ex.id).toHaveLength(1);
        expect(new Set(a.options.map((o) => o.text)).size, `${ex.id} duplicate texts`).toBe(a.options.length);
        for (const o of a.options) if (o.id !== a.correct) expect(tagOf(ex, o.id), `${ex.id} ${o.id} untagged`).toBeTruthy();
        expect(distractorsOf(ex).length, ex.id).toBe(a.options.length - 1);
      }
      if (a.kind === "sequence") {
        expect(validateAnswer(a, a.order).correct).toBe(true);
        // no other ordering of the pieces is accepted (identical texts aside)
        const texts = a.order.map((id) => a.pieces.find((p) => p.id === id)!.text);
        expect(new Set(texts).size, ex.id).toBe(texts.length);
      }
      if (a.kind === "match") expect(validateAnswer(a, a.pairs).correct).toBe(true);
      if (a.kind === "set") expect(validateAnswer(a, a.correct).correct).toBe(true);
    }
  });

  it("is deterministic and never repeats an item inside one level's band", () => {
    for (let lv = 0; lv <= WG_MAX_LEVEL; lv++) {
      for (const s of SEEDS.slice(0, 25)) {
        const b = band(lv, s);
        expect(b).toEqual(band(lv, s));
        const keys = b.map(keyOf);
        expect(new Set(keys).size, `level ${lv} seed ${s}: ${keys.join(" ")}`).toBe(keys.length);
      }
    }
  });

  it("modes alternate by index and each level offers at least 8 distinct items per mode (banks ≥ 16)", () => {
    const expected: Record<number, [string, string]> = {
      0: ["meaning", "build"], 1: ["meaning", "build"], 2: ["sort", "fit"], 3: ["build2", "family"], 4: ["rootmatch", "rootmeaning"],
      5: ["wordfor", "rootcontext"], 6: ["clueMeaning", "clueTap"], 7: ["clueMeaning", "clueTap"], 8: ["owner", "apostrophe"], 9: ["confused", "confused"],
    };
    for (let lv = 0; lv <= WG_MAX_LEVEL; lv++) {
      const perMode = new Map<string, Set<string>>();
      for (const s of SEEDS) {
        band(lv, s).forEach((e, i) => {
          if (isReview(lv, i)) return;
          expect(modeOf(e), `${e.id}`).toBe(expected[lv]![i % 2]);
          const m = modeOf(e);
          perMode.set(m, (perMode.get(m) ?? new Set()).add(keyOf(e)));
        });
      }
      for (const [m, ids] of perMode) expect(ids.size, `level ${lv} ${m}`).toBeGreaterThanOrEqual(8);
    }
    for (const bank of [PREFIX_WORDS, SUFFIX_WORDS, FIT_ITEMS, TWO_AFFIX_WORDS, FAMILY_ITEMS, GREEK_WORDS, WORD_FOR, ROOT_CONTEXT]) expect(bank.length).toBeGreaterThanOrEqual(16);
    for (const bank of [ONE_SENTENCE, ACROSS_SENTENCES, CONFUSED_ITEMS]) expect(bank.length).toBeGreaterThanOrEqual(24);
    expect(APOSTROPHE_SENTENCES.length + OWNER_PICTURES.length * 2).toBeGreaterThanOrEqual(24);
  });

  it("interleaved review: from level 3, items at index % 4 === 3 (and every odd item at level 9) come from an earlier level with its skill", () => {
    for (let lv = 0; lv <= WG_MAX_LEVEL; lv++) for (const s of SEEDS.slice(0, 20)) {
      band(lv, s).forEach((e, i) => {
        const src = /-r(\d)-/.exec(e.id)?.[1];
        if (isReview(lv, i)) {
          expect(src, e.id).toBeDefined();
          expect(Number(src)).toBeLessThan(lv);
          expect(e.skillId).toBe(LEVEL_SKILL[Number(src)]);
        } else {
          expect(src, e.id).toBeUndefined();
          expect(e.skillId).toBe(LEVEL_SKILL[lv]);
        }
      });
    }
    expect(isReview(2, 3)).toBe(false);
    expect(isReview(3, 3)).toBe(true);
    expect(isReview(9, 1)).toBe(true);
  });
});

describe("wordroot grove: content rules", () => {
  it("affix words: parts concatenate exactly to the word (build items use only words without spelling changes)", () => {
    for (const w of [...PREFIX_WORDS, ...SUFFIX_WORDS]) {
      expect(w.spellingChange, w.word).toBe(false);
      expect(w.parts.join(""), w.word).toBe(w.word);
      expect(w.parts).toContain(w.affix);
      expect(AFFIX[w.affix], w.word).toBeDefined();
    }
    for (const w of TWO_AFFIX_WORDS) {
      expect(w.parts.join(""), w.word).toBe(w.word);
      expect(w.parts).toHaveLength(3);
      for (const d of w.decoys) expect(w.parts, `${w.word} decoy ${d}`).not.toContain(d);
    }
    for (const ex of ITEMS.filter((e) => modeOf(e) === "build" || modeOf(e) === "build2")) {
      const a = ex.answer;
      if (a.kind !== "sequence") continue;
      const word = modeOf(ex) === "build" ? affixWordOf(ex) : twoAffixOf(ex);
      expect(a.order.map((id) => a.pieces.find((p) => p.id === id)!.text).join(""), ex.id).toBe(word.word);
      if (modeOf(ex) === "build") expect(affixWordOf(ex).spellingChange).toBe(false);
    }
  });

  it("build decoys never share the target affix's meaning (no un beside dis for 'not', no -er beside -or)", () => {
    const same: string[][] = [["un", "dis"], ["er", "or"]];
    for (const [affix, decoys] of Object.entries(BUILD_DECOYS)) for (const d of decoys) {
      expect(same.some((g) => g.includes(affix) && g.includes(d)), `${affix}/${d}`).toBe(false);
      expect(AFFIX[d]!.meaning).not.toBe(AFFIX[affix]!.meaning);
    }
    for (const ex of ITEMS.filter((e) => modeOf(e) === "build")) {
      const a = ex.answer;
      if (a.kind !== "sequence") continue;
      const w = affixWordOf(ex);
      const decoyTexts = a.pieces.filter((p) => p.id.startsWith("x")).map((p) => p.text!);
      expect(decoyTexts.length, ex.id).toBe(2);
      for (const d of decoyTexts) expect(BUILD_DECOYS[w.affix], ex.id).toContain(d);
    }
  });

  it("ambiguous-attachment words (unlockable, undoable…) are never generated", () => {
    const all = ITEMS.map((e) => JSON.stringify(e));
    for (const w of AMBIGUOUS) expect(all.some((s) => s.includes(`"${w}"`) || s.includes(`-${w}-`)), w).toBe(false);
    for (const w of TWO_AFFIX_WORDS) expect(AMBIGUOUS).not.toContain(w.word);
  });

  it("word-class sorts use one word per class, never a classByUse word, and include the -ly adjective trap", () => {
    expect(CLASS_WORDS.some((w) => w.classByUse)).toBe(true);
    let traps = 0;
    for (const ex of ITEMS.filter((e) => modeOf(e) === "sort")) {
      const a = ex.answer;
      if (a.kind !== "match") continue;
      expect(Object.values(a.pairs).sort()).toEqual(["adjective", "adverb", "noun", "verb"]);
      for (const [w, cls] of Object.entries(a.pairs)) {
        const cw = SORTABLE.find((x) => x.word === w);
        expect(cw, `${w} sortable`).toBeDefined();
        expect(cw!.classByUse).toBeFalsy();
        expect(cw!.cls).toBe(cls);
        if (cw!.trap) traps++;
      }
    }
    expect(traps).toBeGreaterThan(0);
    // fit items: the answer and its distractors differ in class, adverb gaps sit before the verb (no flat adverbs)
    for (const f of FIT_ITEMS) {
      expect(new Set([f.cls, ...f.distractors.map((d) => d.tag)]).size, f.id).toBe(3);
      expect(f.text.split("___")).toHaveLength(2);
      if (f.cls === "adverb") expect(f.text, f.id).toMatch(/^[A-Z][a-z]+( [a-z]+)? ___ [a-z]+ /);
    }
  });

  it("roots: meanings come from the table; no match item pairs two roots that share a meaning", () => {
    const meanings = new Map(ROOTS.map((r) => [r.id, r.meaning]));
    expect(ROOTS.length).toBe(22);
    for (const ex of ITEMS.filter((e) => modeOf(e) === "rootmatch")) {
      const a = ex.answer;
      if (a.kind !== "match") continue;
      const used = a.items.map((i) => meanings.get(i.id));
      expect(new Set(used).size, ex.id).toBe(4);
      for (const i of a.items) expect(a.targets.find((t) => t.id === a.pairs[i.id])!.text).toBe(ROOT[i.id]!.meaning);
      for (const i of a.items) expect(ROOT[i.id]!.lang, ex.id).toBe("greek");
    }
    for (const w of GREEK_WORDS) {
      expect(w.parts.join(""), w.word).toBe(w.word);
      for (const r of w.roots) expect(GREEK.map((x) => x.id), `${w.word} ${r}`).toContain(r);
    }
    for (const w of WORD_FOR) {
      expect(ROOT[w.root]!.lang).toBe("latin");
      expect(w.answer.includes(w.root === "scrib" ? "scri" : w.root), w.answer).toBe(true);
      for (const d of w.distractors) expect(d.includes(w.root), `${w.id}: ${d} shares the root`).toBe(false);
    }
    for (const r of ROOT_CONTEXT) {
      expect(r.text).toMatch(/\*[a-z]+\*/i);
      const word = /\*([a-z]+)\*/i.exec(r.text)![1]!.toLowerCase();
      expect(word.includes(r.root === "scrib" ? "scri" : r.root), `${r.id}: ${word}`).toBe(true);
    }
  });

  it("set items: the prompt states the number of clues, which equals the answer; chunks rebuild the passage", () => {
    for (const ex of ITEMS.filter((e) => modeOf(e) === "clueTap")) {
      const a = ex.answer;
      if (a.kind !== "set") continue;
      const p = passageOf(ex);
      expect(ex.prompt!.text, ex.id).toMatch(a.correct.length === 2 ? /both clues/ : /Tap the clue/);
      expect(a.options.map((o) => o.text).join(" "), ex.id).toBe(passageText(p));
      expect(a.options.length).toBeGreaterThanOrEqual(3);
      expect(a.options.length).toBeLessThanOrEqual(6);
    }
    for (const p of ALL_PASSAGES) {
      expect(p.chunks.filter((c) => c.includes(`*`)).length, `${p.id}: one chunk holds the mystery word`).toBe(1);
      expect(p.chunks.join(" ").match(/\*/g)!.length).toBe(2);
      for (const i of p.clues) expect(p.chunks[i], p.id).not.toContain("*");
    }
    for (const p of ONE_SENTENCE) expect(p.clues, p.id).toHaveLength(1);
    for (const p of ACROSS_SENTENCES) expect(p.clues, p.id).toHaveLength(2);
  });

  it("readability caps: level 6 passages ≤ 20 words in one sentence; level 7 ≤ 45 words in 2–3 sentences (or 2+ clauses)", () => {
    for (const p of ONE_SENTENCE) {
      expect(wordCount(p), p.id).toBeLessThanOrEqual(20);
      expect(passageText(p).replace(/\.$/, "").includes("."), `${p.id} is one sentence`).toBe(false);
    }
    for (const p of ACROSS_SENTENCES) {
      expect(wordCount(p), p.id).toBeLessThanOrEqual(45);
      const sentences = passageText(p).split(/[.!?](\s|$)/).filter((s) => s.trim().length > 1).length;
      expect(sentences, p.id).toBeGreaterThanOrEqual(2);
      expect(sentences, p.id).toBeLessThanOrEqual(4);
    }
  });

  it("invented words: unique, never a real word in our banks, not on (or one letter from) the blocklist", () => {
    expect(new Set(INVENTED_WORDS).size).toBe(INVENTED_WORDS.length);
    expect(INVENTED_WORDS.length).toBe(48);
    const ours = new Set<string>([...REAL_WORDS]);
    const words = (t: string) => t.toLowerCase().replace(/\*/g, "").split(/[^a-zñá]+/).filter(Boolean);
    for (const t of [...PREFIX_WORDS, ...SUFFIX_WORDS].flatMap((w) => [w.word, w.gloss, ...w.distractors.map((d) => d.text)])) words(t).forEach((x) => ours.add(x));
    for (const p of ALL_PASSAGES) words(p.chunks.join(" ")).filter((x) => x !== p.word && !x.startsWith(p.word)).forEach((x) => ours.add(x));
    const BLOCK = ["porn", "poop", "fart", "shit", "piss", "cunt", "dick", "cock", "turd", "puke", "butt", "boob", "rape", "kill", "dead", "slut"];
    for (const w of INVENTED_WORDS) {
      expect(ours.has(w), `${w} is a real word in our banks`).toBe(false);
      expect(isBlocked(w), w).toBe(false);
      for (const b of BLOCK) expect(editDistance(w, b) <= 1 || w.includes(b), `${w} near ${b}`).toBe(false);
      expect(w).toMatch(/^[a-z]{5,9}$/);
    }
  });

  it.skipIf(!existsSync("/usr/share/hunspell/en_US.dic"))("invented words: not in the hunspell en_US dictionary and not one letter away from any word in it", () => {
    const dict = hunspellWords();
    expect(dict.size).toBeGreaterThan(40_000);
    const problems: string[] = [];
    for (const w of INVENTED_WORDS) {
      if (dict.has(w)) problems.push(`${w} is a word`);
      for (const n of edits1(w)) if (n !== w && dict.has(n)) problems.push(`${w} ~ ${n}`);
    }
    expect(problems).toEqual([]);
  });

  it("blocklist: every string in the banks, the options and the voice lines is clean", () => {
    const strings: string[] = [];
    for (const ex of ITEMS) {
      const a = ex.answer;
      if (a.kind === "choice" || a.kind === "set") strings.push(...a.options.map((o) => o.text ?? ""));
      if (a.kind === "sequence") strings.push(...a.pieces.map((p) => p.text ?? ""));
      if (a.kind === "match") strings.push(...a.items.map((p) => p.text ?? ""), ...a.targets.map((p) => p.text ?? ""));
      strings.push(ex.prompt?.text ?? "", ex.a11yDescription);
    }
    for (const l of Object.values(L)) strings.push(l.text, ...Object.values(l.vary ?? {}).flat());
    const bad = strings.flatMap((s) => s.split(/[^A-Za-zñá']+/).filter((t) => t && isBlocked(t)).map((t) => `${t} in "${s}"`));
    expect([...new Set(bad)]).toEqual([]);
  });

  it("names are first names from the path list; US spelling; no frightening words", () => {
    const text = [...ALL_PASSAGES.map(passageText), ...FIT_ITEMS.map((f) => f.text), ...ROOT_CONTEXT.map((r) => r.text), ...APOSTROPHE_SENTENCES.map((s) => s.text), ...CONFUSED_ITEMS.map((s) => s.text)].join(" ");
    const caps = new Set((text.match(/(?<![.!?]\s|^)\b[A-Z][a-zá]+/g) ?? []).filter((w) => !["I", "Grandpa", "Biscuit", "May", "Friday", "Ducks"].includes(w)));
    for (const c of caps) expect(NAMES, c).toContain(c);
    expect(text).not.toMatch(/colour|favour|neighbour|grey|torch|pavement|realise|organise|centre|metre\b/);
    expect(text.toLowerCase()).not.toMatch(/\b(kill|dead|die|blood|gun|monster attack|scream)\b/);
  });

  it("every distractor meaning differs from the right one, and family/root items carry a reasoning line", () => {
    for (const w of [...PREFIX_WORDS, ...SUFFIX_WORDS]) for (const d of w.distractors) expect(d.text).not.toBe(w.gloss);
    for (const f of FAMILY_ITEMS) {
      expect(f.target.toLowerCase().includes(f.root), `${f.id}: ${f.root} in ${f.target}`).toBe(true);
      expect(f.why.length).toBeGreaterThan(10);
    }
    for (const p of ALL_PASSAGES) expect(p.why.length).toBeGreaterThan(10);
  });
});

describe("wordroot grove: hints and the model", () => {
  const miss = (ex: Exercise, value: string | string[] | Record<string, string>) => exerciseReducer(initExercise(ex), { type: "SUBMIT", value });
  it("first-miss hints key off the misconception", () => {
    const unlock = ITEMS.find((e) => modeOf(e) === "meaning" && affixWordOf(e).word === "unsafe")!;
    const a = unlock.answer;
    if (a.kind !== "choice") throw new Error("choice");
    expect(hintFor(miss(unlock, slug("safe again")))).toBe("wg.hint.prefix");
    expect(hintFor(miss(unlock, slug("completely safe")))).toBe("wg.hint.base");
    const careful = ITEMS.find((e) => modeOf(e) === "meaning" && affixWordOf(e).word === "careful")!;
    expect(hintFor(miss(careful, slug("without care")))).toBe("wg.hint.suffix");
    const sort = ITEMS.find((e) => modeOf(e) === "sort" && e.answer.kind === "match" && Object.keys(e.answer.pairs).some((w) => ["friendly", "lovely", "lonely"].includes(w)))!;
    if (sort.answer.kind !== "match") throw new Error("match");
    const trap = Object.keys(sort.answer.pairs).find((w) => ["friendly", "lovely", "lonely"].includes(w))!;
    const wrong = { ...sort.answer.pairs, [trap]: "adverb" };
    expect(hintFor(miss(sort, wrong))).toBe("wg.hint.sort.trap");
    const tap = ITEMS.find((e) => modeOf(e) === "clueTap")!;
    expect(hintFor(miss(tap, ["c0"]))).toBe(`wg.hint.clue.${passageOf(tap).type}`);
    const they = ITEMS.find((e) => e.id.startsWith("wg-confused-zoo"))!;
    expect(hintFor(miss(they, slug("Their")))).toBe("wg.hint.they");
  });

  it("every item has a round-start line, a first-miss line and praise that exist in voice.json", () => {
    for (const ex of ITEMS) {
      expect(L[explainFor(ex)], `${ex.id} explain ${explainFor(ex)}`).toBeDefined();
      for (const id of praiseFor(ex)) expect(L[id], `${ex.id} praise ${id}`).toBeDefined();
      const a = ex.answer;
      const wrong =
        a.kind === "choice" ? a.options.find((o) => o.id !== a.correct)!.id
        : a.kind === "sequence" ? [...a.order].reverse()
        : a.kind === "set" ? a.options.filter((o) => !a.correct.includes(o.id)).map((o) => o.id).slice(0, 1)
        : a.kind === "match" ? Object.fromEntries(Object.keys(a.pairs).map((k) => [k, a.targets.find((t) => t.id !== a.pairs[k])!.id]))
        : "";
      const s = miss(ex, wrong as string);
      expect(s.attempts, ex.id).toBe(1);
      expect(L[hintFor(s)], `${ex.id} hint ${hintFor(s)}`).toBeDefined();
    }
  });

  it("the worked model has one step per chain line (sorting: one per card), and first misses can stretch word items", () => {
    for (const ex of ITEMS) {
      const m = modeOf(ex);
      if (m === "sort" || m === "rootmatch") expect(modelSteps(ex)).toBe(4);
      else {
        expect(chainOf(ex).length, ex.id).toBeGreaterThan(0);
        expect(modelSteps(ex)).toBe(chainOf(ex).length);
      }
      if (m === "meaning" || m === "rootmeaning") {
        const s = stretchOf(ex)!;
        expect(s.parts.map((p) => p.text.replace(/^-|-$/g, "")).join(""), ex.id).toBe(s.word);
        for (const p of s.parts) if (p.line) expect(L[p.line], p.line).toBeDefined();
      }
    }
    const unsafe = ITEMS.find((e) => modeOf(e) === "meaning" && affixWordOf(e).word === "unsafe")!;
    expect(chainOf(unsafe)).toEqual(["un + safe", "not, or undo + safe", "unsafe: not safe"]);
  });
});

describe("wordroot grove: voice", () => {
  it("voice.json holds exactly the lines generated from the banks (content and clips can't drift)", () => {
    const want = allLines();
    expect(Object.keys(L).sort()).toEqual(Object.keys(want).sort());
    for (const [id, l] of Object.entries(want)) {
      expect(L[id]!.text, id).toBe(l.text);
      expect(L[id]!.speaker, id).toBe(l.speaker);
      expect(L[id]!.vary, id).toEqual(l.vary);
    }
  });

  it("every line is prefixed, captioned, short enough and spoken by sarah, gloop or the narrator; praise names process", () => {
    for (const [id, line] of Object.entries(L)) {
      expect(id.startsWith("wg."), id).toBe(true);
      expect(line.text.trim().length, id).toBeGreaterThan(0);
      expect(["sarah", "gloop", undefined], id).toContain(line.speaker);
      if (!/^wg\.(p|s)\./.test(id)) expect(line.text.split(/\s+/).length, id).toBeLessThanOrEqual(16);
      expect(line.text.toLowerCase(), id).not.toMatch(/\b(smart|genius|clever|brilliant|gifted)\b/);
      const combos = Object.values(line.vary ?? {}).reduce((n, v) => n * v.length, 1);
      expect(combos, id).toBeLessThan(150);
    }
    for (const id of Object.keys(L).filter((k) => k.startsWith("wg.dlg."))) expect(L[id]!.text.length, id).toBeLessThanOrEqual(72);
  });

  it("prompt vary lists cover every value the generator can produce; read-aloud lines exist for every item", async () => {
    const { wordLine, sentenceLine, passageLine, spellLine, familyOf, fitOf, rootContextOf, gapOf, rootWordOf } = await import("../../src/games/wordroot-grove/logic");
    for (const ex of ITEMS) {
      const line = L[ex.prompt!.line];
      expect(line, ex.prompt!.line).toBeDefined();
      for (const [k, values] of Object.entries(line!.vary ?? {})) expect(values, `${ex.id} ${k}`).toContain(String(ex.prompt!.vars![k]));
      const m = modeOf(ex);
      const need =
        m === "meaning" ? [wordLine(affixWordOf(ex).word)]
        : m === "rootmeaning" ? [wordLine(rootWordOf(ex).word)]
        : m === "fit" ? [sentenceLine("fit", fitOf(ex).id)]
        : m === "family" ? [sentenceLine("family", familyOf(ex).id)]
        : m === "rootcontext" ? [sentenceLine("rootcontext", rootContextOf(ex).id)]
        : m === "apostrophe" || m === "confused" ? [sentenceLine(m, gapOf(ex).id)]
        : m === "clueMeaning" || m === "clueTap" ? [passageLine(passageOf(ex).word), spellLine(passageOf(ex).word)]
        : [];
      for (const id of need) expect(L[id], `${ex.id} needs ${id}`).toBeDefined();
    }
    for (const id of Object.keys(AFFIX)) expect(L[`wg.part.${id}`]).toBeDefined();
    for (const r of ROOTS) expect(L[`wg.part.${r.id}`]).toBeDefined();
  });

  it("spelled-out invented words list every letter (TTS is unreliable on non-words)", () => {
    for (const w of INVENTED_WORDS) expect(L[`wg.spell.${w}`]!.text).toContain(w.toUpperCase().split("").join(", "));
  });
});

// ---------------------------------------------------------------- helpers
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}
function edits1(w: string): Set<string> {
  const out = new Set<string>();
  const abc = "abcdefghijklmnopqrstuvwxyz";
  for (let i = 0; i <= w.length; i++) {
    const [a, b] = [w.slice(0, i), w.slice(i)];
    if (b) out.add(a + b.slice(1));
    if (b.length > 1) out.add(a + b[1] + b[0] + b.slice(2));
    for (const c of abc) {
      if (b) out.add(a + c + b.slice(1));
      out.add(a + c + b);
    }
  }
  return out;
}
/** hunspell en_US base forms plus regular inflections (a superset: stricter than "top 10,000 words"). */
function hunspellWords(): Set<string> {
  const out = new Set<string>();
  for (const line of readFileSync("/usr/share/hunspell/en_US.dic", "latin1").split("\n").slice(1)) {
    const [w, flags = ""] = line.split("/");
    if (!w || !/^[a-z]+$/.test(w)) continue;
    out.add(w);
    if (/[SDGRYPMNJZTV]/.test(flags)) for (const s of ["s", "es", "ed", "d", "ing", "er", "ers", "ly", "y", "est", "ness"]) out.add(w + s);
  }
  return out;
}
