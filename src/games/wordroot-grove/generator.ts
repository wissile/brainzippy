import type { AnswerOption, Exercise, ExerciseGenerator } from "../../engine/types";
import type { Rng } from "../../engine/rng";
import { APOSTROPHE_SENTENCES, CONFUSED_ITEMS, OWNER_PICTURES, ownerPhrases } from "./grammar";
import { MODE, slug } from "./logic";
import { BUILD_DECOYS, FAMILY_ITEMS, FIT_ITEMS, PREFIX_WORDS, SORTABLE, SUFFIX_WORDS, TWO_AFFIX_WORDS, type WordClass } from "./morphology";
import { ACROSS_SENTENCES, ONE_SENTENCE, passageText } from "./passages";
import { GREEK, GREEK_WORDS, ROOT, ROOT_CONTEXT, WORD_FOR } from "./roots";

/**
 * Wordroot Grove — procedural exercises. PURE and deterministic: same (level, rng, index) → same exercise.
 * Spec: docs/worlds/wordroot-grove.md §3. Modes alternate by index % 2 (even · odd); time is never a parameter.
 *   0 prefixes      meaning of a word (3 meanings) · build a word for a meaning (parts + 2 decoy prefixes)
 *   1 suffixes      meaning · build (decoys never share the suffix's meaning: no -er beside -or)
 *   2 word class    sort 4 words into noun/verb/adjective/adverb (-ly adjectives from slot 2) · choose the form that fits
 *   3 two affixes   build from a meaning (3 parts + 2 decoys) · meaning of a word related to a known word
 *   4 Greek roots   match 4 roots to 4 meanings · meaning of a word from its roots
 *   5 Latin roots   which word means … · a root in context
 *   6 context (1)   meaning of an invented word · tap the clue
 *   7 context (2+)  meaning · tap both clues
 *   8 apostrophes   owner picture · sentence
 *   9 confused      choose the word that fits · every odd item reviews levels 0–8
 * From level 3, items with index % 4 === 3 come from an earlier level, stamped with that level's skill (ENGLISH_PATH
 * §3.2). Content is spread over a band by index (one bucket per slot), so a band never repeats an item.
 */
export const SKILLS = {
  affix: "english.vocab.affix",
  wordClass: "english.grammar.word-class",
  roots: "english.vocab.roots",
  context: "english.vocab.context",
  apostrophe: "english.grammar.apostrophe",
  confused: "english.grammar.confused-words",
} as const;
export const LEVEL_SKILL = [
  SKILLS.affix, SKILLS.affix, SKILLS.wordClass, SKILLS.affix, SKILLS.roots, SKILLS.roots, SKILLS.context, SKILLS.context, SKILLS.apostrophe, SKILLS.confused,
] as const;
export const WG_MAX_LEVEL = LEVEL_SKILL.length - 1;
export const WG_AGES = [9, 11] as const;

type Gen = Omit<Exercise, "difficulty">;

/** Pick from the slot's share of `list` (slot 0..slots-1); lists shorter than `slots` wrap. */
export function bucketPick<T>(list: readonly T[], slot: number, slots: number, rng: Rng): { item: T; index: number } {
  const n = list.length;
  if (n <= slots) return { item: list[slot % n]!, index: slot % n };
  const lo = Math.floor((slot * n) / slots);
  const hi = Math.floor(((slot + 1) * n) / slots) - 1;
  const index = rng.int(lo, Math.max(lo, hi));
  return { item: list[index]!, index };
}
const choices = (rng: Rng, right: string, wrong: readonly string[]): { correct: string; options: AnswerOption[] } => ({
  correct: slug(right),
  options: rng.shuffle([right, ...wrong]).map((t) => ({ id: slug(t), text: t })),
});
const listed = (o: readonly AnswerOption[]) => o.map((x) => x.text).join("; ");
const plain = (s: string) => s.replace(/\*/g, "");

// ---------------------------------------------------------------- L0–L1 affix words
function genMeaning(b: 0 | 1, rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const bank = b === 1 ? SUFFIX_WORDS : PREFIX_WORDS;
  const { item: w, index } = bucketPick(bank, slot, 4, rng);
  const a = choices(rng, w.gloss, w.distractors.map((d) => d.text));
  return {
    ...base,
    id: `wg-meaning-${w.word}-${tag}`,
    objective: `Use the ${b === 1 ? "suffix" : "prefix"} to work out what ${w.word} means`,
    answer: { kind: "choice", ...a },
    objectKind: "leaf",
    params: { m: MODE.meaning, b, k: index },
    prompt: { line: "wg.prompt.meaning", text: "What does this word mean?" },
    a11yDescription: `A leaf shows the word ${w.word}. Three meanings: ${listed(a.options)}. Choose what the word means.`,
  } as Gen;
}

function genBuild(b: 0 | 1, rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const bank = b === 1 ? SUFFIX_WORDS : PREFIX_WORDS;
  const { item: w, index } = bucketPick(bank, slot, 4, rng);
  const decoys = rng.shuffle(BUILD_DECOYS[w.affix]!).slice(0, 2);
  const pieces = rng.shuffle([...w.parts.map((t, i) => ({ id: `p${i}`, text: t })), ...decoys.map((t, i) => ({ id: `x${i}`, text: t }))]);
  return {
    ...base,
    id: `wg-build-${w.word}-${tag}`,
    objective: `Build the word that means "${w.gloss}" from a base and a${b === 1 ? " suffix" : " prefix"}`,
    answer: { kind: "sequence", order: w.parts.map((_, i) => `p${i}`), pieces },
    objectKind: "leaf",
    params: { m: MODE.build, b, k: index },
    prompt: { line: "wg.prompt.build", vars: { gloss: w.gloss }, text: `Build a word that means "${w.gloss}".` },
    a11yDescription: `A branch with ${w.parts.length} empty places. Word parts: ${pieces.map((p) => p.text).join(", ")}. Put parts on the branch, in order, to build a word that means ${w.gloss}. Then press Grow.`,
  } as Gen;
}

// ---------------------------------------------------------------- L2 word class
const CLASSES: readonly WordClass[] = ["noun", "verb", "adjective", "adverb"];
function genSort(rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const pick = (cls: WordClass, trap?: boolean) => {
    const list = SORTABLE.filter((x) => x.cls === cls && (trap === undefined || !!x.trap === trap));
    return bucketPick(list, trap === undefined ? slot : slot % 2, trap === undefined ? 4 : 2, rng).item.word;
  };
  // from slot 2 on, the adjective is an -ly adjective (friendly, lovely, lonely) beside a real -ly adverb: the named trap
  const words = { noun: pick("noun"), verb: pick("verb"), adjective: pick("adjective", slot >= 2), adverb: pick("adverb") };
  const items = rng.shuffle(CLASSES.map((c) => words[c])).map((w) => ({ id: w, text: w }));
  const pairs = Object.fromEntries(CLASSES.map((c) => [words[c], c]));
  return {
    ...base,
    id: `wg-sort-${CLASSES.map((c) => words[c]).join("-")}-${tag}`,
    objective: "Sort four words by their job: noun, verb, adjective or adverb",
    answer: { kind: "match", items, targets: CLASSES.map((c) => ({ id: c, text: c })), pairs },
    objectKind: "leaf",
    params: { m: MODE.sort, k: slot },
    prompt: { line: "wg.prompt.sort", text: "Sort the words by their job." },
    a11yDescription: `Four word leaves: ${items.map((i) => i.text).join(", ")}. Four branches: noun, verb, adjective, adverb. Put each word on the branch for its job, then press Grow.`,
  } as Gen;
}

function genFit(rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const { item: f, index } = bucketPick(FIT_ITEMS, slot, 4, rng);
  const a = choices(rng, f.answer, f.distractors.map((d) => d.text));
  return {
    ...base,
    id: `wg-fit-${f.id}-${tag}`,
    objective: `Choose the ${f.cls} that fits the sentence (same base word, different classes)`,
    answer: { kind: "choice", ...a },
    objectKind: "leaf",
    params: { m: MODE.fit, k: index },
    prompt: { line: "wg.prompt.fit", text: "Which word fits the sentence?" },
    a11yDescription: `A sentence with a gap: ${f.text.replace("___", "blank")} Three words: ${listed(a.options)}. Choose the word that fits.`,
  } as Gen;
}

// ---------------------------------------------------------------- L3 two affixes and families
function genBuild2(rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const { item: w, index } = bucketPick(TWO_AFFIX_WORDS, slot, 4, rng);
  const pieces = rng.shuffle([...w.parts.map((t, i) => ({ id: `p${i}`, text: t })), ...w.decoys.map((t, i) => ({ id: `x${i}`, text: t }))]);
  return {
    ...base,
    id: `wg-build2-${w.word}-${tag}`,
    objective: `Build the word that means "${w.gloss}" from a base and two affixes`,
    answer: { kind: "sequence", order: w.parts.map((_, i) => `p${i}`), pieces },
    objectKind: "leaf",
    params: { m: MODE.build2, k: index },
    prompt: { line: "wg.prompt.build", vars: { gloss: w.gloss }, text: `Build a word that means "${w.gloss}".` },
    a11yDescription: `A branch with 3 empty places. Word parts: ${pieces.map((p) => p.text).join(", ")}. Put three parts on the branch, in order, to build a word that means ${w.gloss}. Then press Grow.`,
  } as Gen;
}

function genFamily(rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const { item: f, index } = bucketPick(FAMILY_ITEMS, slot, 4, rng);
  const a = choices(rng, f.answer, f.distractors.map((d) => d.text));
  return {
    ...base,
    id: `wg-family-${f.id}-${tag}`,
    objective: `Use the known word ${f.known} to work out what ${f.target} means`,
    answer: { kind: "choice", ...a },
    objectKind: "leaf",
    params: { m: MODE.family, k: index },
    prompt: { line: "wg.prompt.family", text: "Use the word you know. What does the new word mean?" },
    a11yDescription: `To ${f.known} means ${f.knownMeaning}. New word: ${f.target}. Three meanings: ${listed(a.options)}. Choose the closest meaning.`,
  } as Gen;
}

// ---------------------------------------------------------------- L4 Greek roots
/** Root blocks: a match item takes 2 roots from block k and 2 from block k+1, so two slots never get the same set. */
const BLOCKS = [GREEK.slice(0, 3), GREEK.slice(3, 6), GREEK.slice(6, 9), GREEK.slice(9, 12)] as const;
function genRootMatch(rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const roots = [...rng.shuffle(BLOCKS[slot % 4]!).slice(0, 2), ...rng.shuffle(BLOCKS[(slot + 1) % 4]!).slice(0, 2)];
  const items = rng.shuffle(roots).map((r) => ({ id: r.id, text: r.label }));
  const targets = rng.shuffle(roots).map((r) => ({ id: slug(r.meaning), text: r.meaning }));
  return {
    ...base,
    id: `wg-rootmatch-${roots.map((r) => r.id).sort().join("-")}-${tag}`,
    objective: "Match four Greek roots to their meanings",
    answer: { kind: "match", items, targets, pairs: Object.fromEntries(roots.map((r) => [r.id, slug(r.meaning)])) },
    objectKind: "root",
    params: { m: MODE.rootmatch, k: slot },
    prompt: { line: "wg.prompt.rootmatch", text: "Match each root to its meaning." },
    a11yDescription: `Four root leaves: ${items.map((i) => i.text).join(", ")}. Four branches: ${targets.map((t) => t.text).join(", ")}. Put each root on the branch with its meaning, then press Grow.`,
  } as Gen;
}

function genRootMeaning(rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const { item: w, index } = bucketPick(GREEK_WORDS, slot, 4, rng);
  const a = choices(rng, w.answer, w.distractors.map((d) => d.text));
  return {
    ...base,
    id: `wg-rootmeaning-${w.word}-${tag}`,
    objective: `Use the Greek roots in ${w.word} to work out its meaning`,
    answer: { kind: "choice", ...a },
    objectKind: "root",
    params: { m: MODE.rootmeaning, k: index },
    prompt: { line: "wg.prompt.rootmeaning", text: "Use the roots. What does this word mean?" },
    a11yDescription: `A leaf shows the word ${w.word}. Three meanings: ${listed(a.options)}. Choose what the word means.`,
  } as Gen;
}

// ---------------------------------------------------------------- L5 Latin roots
function genWordFor(rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const { item: w, index } = bucketPick(WORD_FOR, slot, 4, rng);
  const a = choices(rng, w.answer, w.distractors);
  return {
    ...base,
    id: `wg-wordfor-${w.id}-${tag}`,
    objective: `Use Latin roots to find the word that means "${w.meaning}"`,
    answer: { kind: "choice", ...a },
    objectKind: "root",
    params: { m: MODE.wordfor, k: index },
    prompt: { line: "wg.prompt.wordfor", vars: { meaning: w.meaning }, text: `Which word means "${w.meaning}"?` },
    a11yDescription: `Three words: ${listed(a.options)}. Choose the word that means ${w.meaning}.`,
  } as Gen;
}

function genRootContext(rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const { item: r, index } = bucketPick(ROOT_CONTEXT, slot, 4, rng);
  const a = choices(rng, r.answer, r.distractors.map((d) => d.text));
  const root = ROOT[r.root]!;
  return {
    ...base,
    id: `wg-rootcontext-${r.id}-${tag}`,
    objective: `Use the root ${root.id} (${root.meaning}) to understand a word in a sentence`,
    answer: { kind: "choice", ...a },
    objectKind: "root",
    params: { m: MODE.rootcontext, k: index },
    prompt: { line: "wg.prompt.rootcontext", text: "Use the root's meaning to answer the question." },
    a11yDescription: `${plain(r.text)} ${root.id} means ${root.meaning}. ${r.ask} Three answers: ${listed(a.options)}.`,
  } as Gen;
}

// ---------------------------------------------------------------- L6–L7 context clues
function genClueMeaning(b: 0 | 1, rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const { item: x, index } = bucketPick(b === 1 ? ACROSS_SENTENCES : ONE_SENTENCE, slot, 4, rng);
  const a = choices(rng, x.answer, x.distractors.map((d) => d.text));
  return {
    ...base,
    id: `wg-clue-${x.word}-${tag}`,
    objective: `Use ${b === 1 ? "clues across sentences" : "a clue in the sentence"} to work out what the made-up word ${x.word} means`,
    answer: { kind: "choice", ...a },
    objectKind: "leaf",
    params: { m: MODE.clueMeaning, b, k: index },
    prompt: { line: "wg.prompt.clue", text: "Use the clues. What does the mystery word mean?" },
    a11yDescription: `${passageText(x)} The mystery word is ${x.word}, spelled ${x.word.split("").join(" ")}. Three meanings: ${listed(a.options)}. Choose what the mystery word means.`,
  } as Gen;
}

function genClueTap(b: 0 | 1, rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const { item: x, index } = bucketPick(b === 1 ? ACROSS_SENTENCES : ONE_SENTENCE, slot, 4, rng);
  const options = x.chunks.map((c, i) => ({ id: `c${i}`, text: plain(c) }));
  const two = x.clues.length === 2;
  return {
    ...base,
    id: `wg-tap-${x.word}-${tag}`,
    objective: `Find the ${two ? "two clues" : "clue"} that explain the made-up word ${x.word}`,
    answer: { kind: "set", correct: x.clues.map((i) => `c${i}`), options },
    objectKind: "leaf",
    params: { m: MODE.clueTap, b, k: index },
    prompt: { line: two ? "wg.prompt.tap.two" : "wg.prompt.tap.one", text: two ? "Tap both clues, then press Grow." : "Tap the clue, then press Grow." },
    a11yDescription: `A passage in ${options.length} parts: ${options.map((o) => o.text).join(" / ")}. The mystery word is ${x.word}. Select the ${two ? "two parts that explain it" : "part that explains it"}, then press Grow.`,
  } as Gen;
}

// ---------------------------------------------------------------- L8 apostrophes
function genOwner(rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const { item: o, index } = bucketPick(OWNER_PICTURES, slot, 4, rng);
  const many = rng.int(0, 1) === 1;
  const [right, ...wrong] = ownerPhrases(o, many);
  const a = choices(rng, right.text, wrong.map((d) => d.text));
  return {
    ...base,
    id: `wg-owner-${o.id}-${many ? "many" : "one"}-${tag}`,
    objective: `Choose the ${many ? "plural" : "singular"} possessive that matches the picture`,
    answer: { kind: "choice", ...a },
    objectKind: "leaf",
    params: { m: MODE.owner, k: index, v: many ? 1 : 0 },
    prompt: { line: "wg.prompt.owner", text: "Which words match the picture?" },
    a11yDescription: `A picture: ${many ? `three ${o.owners}, each with one ${o.thing}` : `one ${o.owner} with three ${o.things}`}. Three ways to write it: ${a.options.map((x) => (x.text ?? "").replace(/'/g, " apostrophe ")).join("; ")}. Choose the one that matches the picture.`,
  } as Gen;
}

function genGap(mode: "apostrophe" | "confused", rng: Rng, slot: number, tag: string, base: Partial<Gen>): Gen {
  const bank = mode === "confused" ? CONFUSED_ITEMS : APOSTROPHE_SENTENCES;
  const { item: x, index } = bucketPick(bank, slot, 4, rng);
  const a = choices(rng, x.answer, x.distractors.map((d) => d.text));
  return {
    ...base,
    id: `wg-${mode}-${x.id}-${tag}`,
    objective: mode === "confused" ? `Choose the right one of commonly confused words: ${[x.answer, ...x.distractors.map((d) => d.text)].join(", ")}` : "Choose where the apostrophe goes, or whether one is needed",
    answer: { kind: "choice", ...a },
    objectKind: "leaf",
    params: { m: MODE[mode], k: index },
    prompt: mode === "confused" ? { line: "wg.prompt.confused", text: "Which one fits the sentence?" } : { line: "wg.prompt.apostrophe", text: "Which one is written correctly?" },
    a11yDescription: `A sentence with a gap: ${x.text.replace("___", "blank")} Three choices: ${a.options.map((o) => (o.text ?? "").replace(/'/g, " apostrophe ")).join("; ")}. Choose the one that fits.`,
  } as Gen;
}

// ---------------------------------------------------------------- the generator
function generateAt(level: number, rng: Rng, index: number, tag: string): Gen {
  const base: Partial<Gen> = { ages: WG_AGES, skillId: LEVEL_SKILL[level], interaction: "choose", seed: rng.int(1, 999_999) };
  const slot = (index >> 1) % 4;
  const even = index % 2 === 0;
  switch (level) {
    case 0:
    case 1: {
      // meaning slot k and build slot k use different quarters of the bank (k vs k + 2): a band never repeats a word
      const b = level as 0 | 1;
      return even ? genMeaning(b, rng, slot, tag, base) : genBuild(b, rng, (slot + 2) % 4, tag, base);
    }
    case 2:
      return even ? genSort(rng, slot, tag, base) : genFit(rng, slot, tag, base);
    case 3:
      return even ? genBuild2(rng, slot, tag, base) : genFamily(rng, slot, tag, base);
    case 4:
      return even ? genRootMatch(rng, slot, tag, base) : genRootMeaning(rng, slot, tag, base);
    case 5:
      return even ? genWordFor(rng, slot, tag, base) : genRootContext(rng, slot, tag, base);
    case 6:
    case 7: {
      const b = (level - 6) as 0 | 1;
      return even ? genClueMeaning(b, rng, slot, tag, base) : genClueTap(b, rng, (slot + 2) % 4, tag, base);
    }
    case 8:
      return even ? genOwner(rng, slot, tag, base) : genGap("apostrophe", rng, slot, tag, base);
    default:
      return genGap("confused", rng, slot, tag, base);
  }
}

/** Is item `index` at `level` an interleaved review item? (docs §3: index % 4 === 3 from L3; every odd item at L9) */
export const isReview = (level: number, index: number) => (level >= 3 && index % 4 === 3) || (level === 9 && index % 2 === 1);

export const generateWordroot: ExerciseGenerator = (level, rng, index): Gen => {
  const lv = Math.max(0, Math.min(WG_MAX_LEVEL, level));
  const tag = `l${lv}n${index}`;
  if (isReview(lv, index)) {
    // an item from an earlier level, generated with that level's parameters and stamped with its skill; either mode
    const src = lv === 9 ? rng.int(0, 8) : rng.int(Math.max(0, lv - 4), lv - 1);
    const at = rng.int(0, 1) === 0 ? index : index - 1;
    return generateAt(src, rng, at, `r${src}-${tag}`);
  }
  return generateAt(lv, rng, index, tag);
};
