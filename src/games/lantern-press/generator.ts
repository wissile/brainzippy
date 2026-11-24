import type { AnswerOption, Exercise, ExerciseGenerator, GeneratorBand } from "../../engine/types";
import { type Rng, createRng, hashSeed } from "../../engine/rng";
import { ARTICLES, type Article, ENOUGH, ROLES, ROLE_LABEL, STRONGEST } from "./articles";
import { MODE, TUTORIAL_ITEM, answerTextOf, claimIndex, optId, spoken } from "./logic";
import { COMBINE, CONCISE, CONNECTIVES, CUTS, MODIFIERS, ORDERS, PRONOUNS, PURPOSES, SHIFTS, type Tagged } from "./sentences";
import { CONNOTE, DEVICES, DEVICE_DISTRACTORS, DEVICE_LABEL, FEELINGS, FIG_LINES, SORT_GROUPS, WORD_GROUPS } from "./words";

/**
 * The Lantern Press — procedural rounds. PURE and deterministic: same (level, rng, index, band) → same exercise.
 * Spec: docs/worlds/lantern-press.md §3. Time is never a parameter.
 *   0 connectives    choose the connective that signals the relationship (one mode)
 *   1 combining      choose the best single sentence (4) · order clause cards (+1 decoy connective card)
 *   2 modifiers      tap the misplaced phrase · choose the clear rewrite
 *   3 pronouns       tap the unclear pronoun(s) (count stated) · choose the clear rewrite (writer's meaning stated)
 *   4 concise        tap the parts that repeat an idea (count stated) · choose the concise version that keeps every fact
 *   5 connotation    choose the word for the writer's feeling · sort 6 words into positive / neutral / negative
 *   6 figurative     name the device · choose what it means here
 *   7 voice          choose active or passive for a stated purpose · fix a shift
 *   8 claims         tap the 2 pieces of evidence · sort an article's sentences (claim / evidence / reasoning / doesn't support)
 *   9 evaluating     strongest evidence · tap the sentence that doesn't support · is it enough? · every odd item is review
 * Modes alternate by index % 2. From level 3, items with index % 4 === 3 are interleaved review from an earlier level,
 * stamped with that level's skill (ENGLISH_PATH §3.2). At level 9 the two questions of a pair read one article
 * (L9: items 2+3 and 6+7: "which sentence doesn't support?", then the evidence question as level-8 review; at L8 every
 * item reads its own article, so a labelling item never follows a question that gives its answers away). Banks are
 * shuffled once per band (band.seed), so a band never repeats an item.
 */
export const SKILLS = {
  combine: "english.grammar.combine",
  modifier: "english.grammar.modifier",
  pronoun: "english.grammar.pronoun-ref",
  concise: "english.style.concise",
  connotation: "english.vocab.connotation",
  figurative: "english.vocab.figurative",
  voice: "english.style.voice",
  claim: "english.argue.claim-evidence",
  evaluate: "english.argue.evaluate",
} as const;
export const LEVEL_SKILL = [
  SKILLS.combine, SKILLS.combine, SKILLS.modifier, SKILLS.pronoun, SKILLS.concise, SKILLS.connotation, SKILLS.figurative, SKILLS.voice, SKILLS.claim, SKILLS.evaluate,
] as const;
export const LP_MAX_LEVEL = LEVEL_SKILL.length - 1;
export const LP_AGES = [12, 14] as const;

type Gen = Omit<Exercise, "difficulty">;
interface Ctx { rng: Rng; band: GeneratorBand; tag: string; base: Partial<Gen> }

/** A bank shuffled once per band (and per bank), so positions 0..n-1 in one band are distinct items. */
function bandPick<T>(bank: readonly T[], band: GeneratorBand, salt: string, pos: number): { item: T; index: number } {
  const order = createRng(hashSeed(band.seed, salt)).shuffle(bank.map((_, i) => i));
  const index = order[pos % order.length]!;
  return { item: bank[index]!, index };
}
const choices = (rng: Rng, right: string, wrong: readonly Tagged[] | readonly string[]): { correct: string; options: AnswerOption[] } => ({
  correct: optId(right),
  options: rng.shuffle([right, ...wrong.map((w) => (typeof w === "string" ? w : w.text))]).map((t) => ({ id: optId(t), text: t })),
});
const listed = (o: readonly AnswerOption[]) => o.map((x) => x.text).join(" / ");
const wrongTexts = (d: readonly Tagged[]) => d.map((x) => x.text);

// ---------------------------------------------------------------- L0–L1
function genConnective(c: Ctx, pos: number): Gen {
  const { item, index } = bandPick(CONNECTIVES, c.band, "connective", pos);
  const a = choices(c.rng, item.answer, item.distractors);
  return {
    ...c.base, id: `lp-connective-${item.id}-${c.tag}`,
    objective: "Choose the connective that signals how two ideas are linked (cause, result, contrast, time, condition, purpose)",
    answer: { kind: "choice", ...a }, objectKind: "proof", params: { m: MODE.connective, k: index },
    prompt: { line: "lp.prompt.connective", text: "Which connective fits?" },
    a11yDescription: `A sentence with a gap: ${spoken(item.text)} Three connectives: ${listed(a.options)}. Choose the one that shows the link the writer means.`,
  } as Gen;
}
function genCombine(c: Ctx, pos: number): Gen {
  const { item, index } = bandPick(COMBINE, c.band, "combine", pos);
  const a = choices(c.rng, item.answer, item.distractors);
  return {
    ...c.base, id: `lp-combine-${item.id}-${c.tag}`,
    objective: "Combine short sentences into one that keeps every idea, without a comma splice or run-on",
    answer: { kind: "choice", ...a }, objectKind: "proof", params: { m: MODE.combine, k: index },
    prompt: { line: "lp.prompt.combine", text: "Which sentence says it best?" },
    a11yDescription: `Notes: ${item.notes.join(" ")} Four sentences: ${listed(a.options)}. Choose the one sentence that keeps every idea and links them correctly.`,
  } as Gen;
}
function genOrder(c: Ctx, pos: number): Gen {
  const { item, index } = bandPick(ORDERS, c.band, "order", pos);
  const texts = c.rng.shuffle([...item.cards, item.decoy.text]);
  const pieces = texts.map((t, i) => ({ id: `t${i}`, text: t }));
  const used = new Set<number>();
  const order = item.cards.map((card) => {
    const i = texts.findIndex((t, j) => t === card && !used.has(j));
    used.add(i);
    return `t${i}`;
  });
  return {
    ...c.base, id: `lp-order-${item.id}-${c.tag}`,
    objective: "Build one sentence from clause cards, choosing the connective that says what the notes mean",
    answer: { kind: "sequence", order, pieces }, objectKind: "proof", params: { m: MODE.order, k: index },
    prompt: { line: "lp.prompt.order", text: "Put the cards in order to make one sentence. Then press Check." },
    a11yDescription: `Notes: ${item.notes.join(" ")} ${item.cards.length} empty places. Cards: ${texts.join(" / ")}. One card is not needed. Put the cards in order to make one sentence, then press Check.`,
  } as Gen;
}

// ---------------------------------------------------------------- L2–L3 (both modes share one bank: positions = index)
function genModTap(c: Ctx, pos: number): Gen {
  const { item, index } = bandPick(MODIFIERS, c.band, "modifier", pos);
  const options = item.chunks.map((t, i) => ({ id: `c${i}`, text: t }));
  return {
    ...c.base, id: `lp-modtap-${item.id}-${c.tag}`,
    objective: "Find the describing phrase that sits next to the wrong word",
    answer: { kind: "set", correct: [`c${item.wrong}`], options }, objectKind: "proof", params: { m: MODE.modTap, k: index },
    prompt: { line: "lp.prompt.modTap", text: "Tap the phrase that's in the wrong place. Then press Check." },
    a11yDescription: `A sentence in ${options.length} parts: ${listed(options)}. Select the one phrase that is in the wrong place, then press Check.`,
  } as Gen;
}
function genModFix(c: Ctx, pos: number): Gen {
  const { item, index } = bandPick(MODIFIERS, c.band, "modifier", pos);
  const a = choices(c.rng, item.fix, item.distractors);
  return {
    ...c.base, id: `lp-modfix-${item.id}-${c.tag}`,
    objective: "Choose the rewrite that puts the describing phrase next to the word it describes, without changing who does what",
    answer: { kind: "choice", ...a }, objectKind: "proof", params: { m: MODE.modFix, k: index },
    prompt: { line: "lp.prompt.modFix", text: "Which rewrite says what the writer means?" },
    a11yDescription: `Sentence: ${item.chunks.join(" ")} Three rewrites: ${listed(a.options)}. Choose the rewrite that says what the writer means.`,
  } as Gen;
}
function genPronTap(c: Ctx, pos: number): Gen {
  const { item, index } = bandPick(PRONOUNS, c.band, "pronoun", pos);
  const options = item.chunks.map((t, i) => ({ id: `c${i}`, text: t }));
  const n = item.vague.length;
  return {
    ...c.base, id: `lp-prontap-${item.id}-${c.tag}`,
    objective: "Find the pronouns that could point to more than one person or thing",
    answer: { kind: "set", correct: item.vague.map((i) => `c${i}`), options }, objectKind: "proof", params: { m: MODE.pronTap, k: index },
    prompt: n === 2 ? { line: "lp.prompt.pronTap.2", text: "Tap the 2 unclear words. Then press Check." } : { line: "lp.prompt.pronTap.1", text: "Tap the unclear word. Then press Check." },
    a11yDescription: `A sentence in ${options.length} parts: ${listed(options)}. Select the ${n === 2 ? "2 words that are" : "word that is"} unclear, then press Check.`,
  } as Gen;
}
function genPronFix(c: Ctx, pos: number): Gen {
  const { item, index } = bandPick(PRONOUNS, c.band, "pronoun", pos);
  const a = choices(c.rng, item.fix, item.distractors);
  return {
    ...c.base, id: `lp-pronfix-${item.id}-${c.tag}`,
    objective: "Choose the rewrite that makes every pronoun point to one clear person or thing, as the writer means",
    answer: { kind: "choice", ...a }, objectKind: "proof", params: { m: MODE.pronFix, k: index },
    prompt: { line: "lp.prompt.pronFix", text: "Which rewrite makes it clear?" },
    a11yDescription: `Sentence: ${item.chunks.join(" ")} The writer means: ${item.means} Three rewrites: ${listed(a.options)}. Choose the clear one.`,
  } as Gen;
}

// ---------------------------------------------------------------- L4
function genCutTap(c: Ctx, pos: number): Gen {
  const { item, index } = bandPick(CUTS, c.band, "cut", pos);
  const options = item.chunks.map((t, i) => ({ id: `c${i}`, text: t }));
  const n = item.cut.length;
  return {
    ...c.base, id: `lp-cuttap-${item.id}-${c.tag}`,
    objective: "Find the words that repeat an idea, and keep every word that adds one",
    answer: { kind: "set", correct: item.cut.map((i) => `c${i}`), options }, objectKind: "proof", params: { m: MODE.cutTap, k: index },
    prompt: n === 2 ? { line: "lp.prompt.cutTap.2", text: "Tap the 2 parts that repeat an idea. Then press Check." } : { line: "lp.prompt.cutTap.1", text: "Tap the part that repeats an idea. Then press Check." },
    a11yDescription: `A sentence in ${options.length} parts: ${listed(options)}. Select the ${n === 2 ? "2 parts" : "part"} that repeat an idea, then press Check.`,
  } as Gen;
}
function genConcise(c: Ctx, pos: number): Gen {
  const { item, index } = bandPick(CONCISE, c.band, "concise", pos);
  const a = choices(c.rng, item.answer, item.distractors);
  return {
    ...c.base, id: `lp-concise-${item.id}-${c.tag}`,
    objective: "Choose the version that keeps every fact in the fewest words",
    answer: { kind: "choice", ...a }, objectKind: "proof", params: { m: MODE.concise, k: index },
    prompt: { line: "lp.prompt.concise", text: "Which version keeps every fact in the fewest words?" },
    a11yDescription: `Sentence: ${item.text} Three versions: ${listed(a.options)}. Choose the one that keeps every fact in the fewest words.`,
  } as Gen;
}

// ---------------------------------------------------------------- L5
function genConnote(c: Ctx, pos: number): Gen {
  const { item, index } = bandPick(CONNOTE, c.band, "connote", pos);
  const g = WORD_GROUPS.find((x) => x.id === item.group)!;
  const right = g[item.want];
  const a = choices(c.rng, right, [item.want === "positive" ? g.negative : g.positive, g.neutral]);
  return {
    ...c.base, id: `lp-connote-${item.id}-${c.tag}`,
    objective: "Choose the word whose feeling (connotation) fits the writer's purpose",
    answer: { kind: "choice", ...a }, objectKind: "pen", params: { m: MODE.connote, k: index },
    prompt: { line: "lp.prompt.connote", text: "Which word fits the writer's purpose?" },
    a11yDescription: `A sentence with a gap: ${spoken(item.text)} Three words with the same meaning: ${listed(a.options)}. Choose the one whose feeling fits.`,
  } as Gen;
}
function genFeelSort(c: Ctx, pos: number): Gen {
  // only clear-cut groups are sorted out of context (QA/content review); a band uses distinct pairs of them
  const ids = SORT_GROUPS.map((g) => WORD_GROUPS.findIndex((w) => w.id === g));
  const pairs = ids.flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b] as const));
  const [p1, p2] = createRng(hashSeed(c.band.seed, "groups")).shuffle(pairs)[pos % pairs.length]!;
  const [i1, i2] = c.rng.chance(0.5) ? [p1, p2] : [p2, p1];
  const groups = [WORD_GROUPS[i1]!, WORD_GROUPS[i2]!];
  const words = groups.flatMap((g) => FEELINGS.map((f) => [g[f], f] as const));
  const items = c.rng.shuffle(words.map(([w]) => ({ id: w, text: w })));
  return {
    ...c.base, id: `lp-feelsort-${groups[0]!.id}-${groups[1]!.id}-${c.tag}`,
    objective: "Sort near-synonyms by feeling: positive, neutral or negative",
    answer: { kind: "match", items, targets: FEELINGS.map((f) => ({ id: f, text: f })), pairs: Object.fromEntries(words) },
    objectKind: "pen", params: { m: MODE.feelSort, k: i1, v: i2 },
    prompt: { line: "lp.prompt.feelSort", text: "Sort the words: positive, neutral or negative? Then press Check." },
    a11yDescription: `Six words: ${items.map((i) => i.text).join(", ")}. Three labels: positive, neutral, negative. Give each word the label for its feeling, then press Check.`,
  } as Gen;
}

// ---------------------------------------------------------------- L6 (devices spread over the band)
function figAt(c: Ctx, pos: number) {
  const devices = createRng(hashSeed(c.band.seed, "devices")).shuffle([...DEVICES]);
  const device = devices[pos % devices.length]!;
  const lines = FIG_LINES.map((l, i) => ({ l, i })).filter((x) => x.l.device === device);
  const pick = createRng(hashSeed(c.band.seed, "fig", device)).shuffle(lines)[Math.floor(pos / devices.length) % lines.length]!;
  return { item: pick.l, index: pick.i };
}
function genDevice(c: Ctx, pos: number): Gen {
  const { item, index } = figAt(c, pos);
  const wrong = c.rng.shuffle([...DEVICE_DISTRACTORS[item.device]]).slice(0, 2).map((d) => DEVICE_LABEL[d]);
  const a = choices(c.rng, DEVICE_LABEL[item.device], wrong);
  return {
    ...c.base, id: `lp-device-${item.id}-${c.tag}`,
    objective: "Name the kind of figurative language a line uses",
    answer: { kind: "choice", ...a }, objectKind: "pen", params: { m: MODE.device, k: index },
    prompt: { line: "lp.prompt.device", text: "Which kind of figurative language is this?" },
    a11yDescription: `A line: ${item.text} Three kinds: ${listed(a.options)}. Choose the kind of figurative language it uses.`,
  } as Gen;
}
function genFigMeaning(c: Ctx, pos: number): Gen {
  const { item, index } = figAt(c, pos);
  const a = choices(c.rng, item.meaning, [item.literal, item.misread]);
  return {
    ...c.base, id: `lp-figmeaning-${item.id}-${c.tag}`,
    objective: "Interpret figurative language in context (simile, metaphor, personification, hyperbole, idiom, verbal irony, pun)",
    answer: { kind: "choice", ...a }, objectKind: "pen", params: { m: MODE.figMeaning, k: index },
    prompt: { line: "lp.prompt.figMeaning", text: "What does this mean here?" },
    a11yDescription: `A line: ${item.text} Three meanings: ${listed(a.options)}. Choose what the writer means here.`,
  } as Gen;
}

// ---------------------------------------------------------------- L7
function genPurpose(c: Ctx, pos: number): Gen {
  const { item, index } = bandPick(PURPOSES, c.band, "purpose", pos);
  const a = choices(c.rng, item.answer, item.distractors);
  return {
    ...c.base, id: `lp-purpose-${item.id}-${c.tag}`,
    objective: "Choose active or passive voice to fit what the writer wants to focus on",
    answer: { kind: "choice", ...a }, objectKind: "proof", params: { m: MODE.purpose, k: index },
    prompt: { line: "lp.prompt.purpose", text: "Which version fits the writer's purpose?" },
    a11yDescription: `The writer's purpose: ${item.purpose} Three versions: ${listed(a.options)}. Choose the one that fits the purpose.`,
  } as Gen;
}
function genShift(c: Ctx, pos: number): Gen {
  const { item, index } = bandPick(SHIFTS, c.band, "shift", pos);
  const a = choices(c.rng, item.answer, item.distractors);
  return {
    ...c.base, id: `lp-shift-${item.id}-${c.tag}`,
    objective: "Fix a sentence that switches between active and passive voice for no reason",
    answer: { kind: "choice", ...a }, objectKind: "proof", params: { m: MODE.shift, k: index },
    prompt: { line: "lp.prompt.shift", text: "Which version fixes the switch in voice and keeps every fact?" },
    a11yDescription: `Sentence: ${item.text} Three versions: ${listed(a.options)}. Choose the one that keeps one doer in charge.`,
  } as Gen;
}

// ---------------------------------------------------------------- L8–L9 articles
const articleText = (a: Article) => a.sentences.map((s) => s.text).join(" ");
function articleAt(band: GeneratorBand, salt: string, slot: number): { item: Article; index: number } {
  return bandPick(ARTICLES, band, salt, slot);
}
function genEvidenceTap(c: Ctx, art: { item: Article; index: number }): Gen {
  const a = art.item;
  const options = a.sentences.map((s, i) => ({ id: `s${i}`, text: s.text }));
  return {
    ...c.base, id: `lp-evidencetap-${a.id}-${c.tag}`,
    objective: "Find the sentences that are evidence for an article's claim (facts someone could check)",
    answer: { kind: "set", correct: a.sentences.flatMap((s, i) => (s.role === "evidence" ? [`s${i}`] : [])), options },
    objectKind: "article", params: { m: MODE.evidenceTap, k: art.index },
    prompt: { line: "lp.prompt.evidenceTap", text: "Tap the 2 sentences that are evidence for the claim. Then press Check." },
    a11yDescription: `A fictional article, "${a.headline}", in ${options.length} sentences: ${articleText(a)} Select the 2 sentences that are evidence for the claim, then press Check.`,
  } as Gen;
}
function genClaimSort(c: Ctx, art: { item: Article; index: number }): Gen {
  const a = art.item;
  const items = a.sentences.map((s, i) => ({ id: `s${i}`, text: s.text }));
  return {
    ...c.base, id: `lp-claimsort-${a.id}-${c.tag}`,
    objective: "Sort an article's sentences into claim, evidence, reasoning and doesn't support",
    answer: { kind: "match", items, targets: ROLES.map((r) => ({ id: r, text: ROLE_LABEL[r] })), pairs: Object.fromEntries(a.sentences.map((s, i) => [`s${i}`, s.role])) },
    objectKind: "article", params: { m: MODE.claimSort, k: art.index },
    prompt: { line: "lp.prompt.claimSort", text: "Label each sentence. Then press Check." },
    a11yDescription: `A fictional article, "${a.headline}": ${articleText(a)} Four labels: claim, evidence, reasoning, doesn't support. Give each sentence a label, then press Check.`,
  } as Gen;
}
function genOffTap(c: Ctx, art: { item: Article; index: number }): Gen {
  const a = art.item;
  const options = a.sentences.map((s, i) => ({ id: `s${i}`, text: s.text }));
  return {
    ...c.base, id: `lp-offtap-${a.id}-${c.tag}`,
    objective: "Spot the sentence that doesn't support the claim (irrelevant, or an opinion offered as fact)",
    answer: { kind: "set", correct: [`s${a.sentences.findIndex((s) => s.role === "none")}`], options },
    objectKind: "article", params: { m: MODE.offTap, k: art.index },
    prompt: { line: "lp.prompt.offTap", text: "Tap the sentence that doesn't support the claim. Then press Check." },
    a11yDescription: `A fictional article, "${a.headline}", in ${options.length} sentences: ${articleText(a)} The claim is: ${a.sentences[claimIndex(a)]!.text} Select the one sentence that doesn't support it, then press Check.`,
  } as Gen;
}
function genStrongest(c: Ctx, pos: number): Gen {
  const { item, index } = bandPick(STRONGEST, c.band, "strongest", pos);
  const a = choices(c.rng, item.answer, wrongTexts(item.distractors));
  return {
    ...c.base, id: `lp-strongest-${item.id}-${c.tag}`,
    objective: "Choose the evidence that is relevant, based on many cases, and checkable",
    answer: { kind: "choice", ...a }, objectKind: "article", params: { m: MODE.strongest, k: index },
    prompt: { line: "lp.prompt.strongest", text: "Which evidence is strongest?" },
    a11yDescription: `Claim: ${item.claim} Three pieces of evidence: ${listed(a.options)}. Choose the strongest.`,
  } as Gen;
}
function genEnough(c: Ctx, pos: number): Gen {
  const { item, index } = bandPick(ENOUGH, c.band, "enough", pos);
  const a = choices(c.rng, item.answer, item.distractors);
  return {
    ...c.base, id: `lp-enough-${item.id}-${c.tag}`,
    objective: "Judge whether evidence is enough (sufficient) for a conclusion",
    answer: { kind: "choice", ...a }, objectKind: "article", params: { m: MODE.enough, k: index },
    prompt: { line: "lp.prompt.enough", text: "Is that enough evidence?" },
    a11yDescription: `${item.text} ${item.question} Three answers: ${listed(a.options)}.`,
  } as Gen;
}

// ---------------------------------------------------------------- the generator
function generateAt(level: number, c: Ctx, index: number): Gen {
  const even = index % 2 === 0;
  const half = index >> 1;
  switch (level) {
    case 0: return genConnective(c, index);
    case 1: return even ? genCombine(c, half) : genOrder(c, half);
    case 2: return even ? genModTap(c, index) : genModFix(c, index);
    case 3: return even ? genPronTap(c, index) : genPronFix(c, index);
    case 4: return even ? genCutTap(c, half) : genConcise(c, half);
    case 5: return even ? genConnote(c, half) : genFeelSort(c, half);
    case 6: return even ? genDevice(c, index) : genFigMeaning(c, index);
    case 7: return even ? genPurpose(c, half) : genShift(c, half);
    case 8: {
      // every level-8 item reads its own article: a labelling item right after an evidence item on the same article
      // would give away two or three labels (QA review)
      const art = articleAt(c.band, "article", index % 8);
      return index % 8 === 6 || index % 2 === 1 ? genClaimSort(c, art) : genEvidenceTap(c, art);
    }
    default: {
      const slot = index % 8 < 4 ? 0 : 1;
      if (index % 4 === 0) return slot === 0 ? genStrongest(c, half) : genEnough(c, half);
      return genOffTap(c, articleAt(c.band, "article9", slot));
    }
  }
}

/** Is item `index` at `level` an interleaved review item? (docs §3: index % 4 === 3 from L3; every odd item at L9) */
export const isReview = (level: number, index: number) => (level >= 3 && index % 4 === 3) || (level === 9 && index % 2 === 1);

export const generateLanternPress: ExerciseGenerator = (level, rng, index, band): Gen => {
  const lv = Math.max(0, Math.min(LP_MAX_LEVEL, level));
  const b: GeneratorBand = band ?? { seed: hashSeed(lv, "lp") };
  const tag = `l${lv}n${index}`;
  const ctx = (src: number, t: string): Ctx => ({ rng, band: b, tag: t, base: { ages: LP_AGES, skillId: LEVEL_SKILL[src], interaction: "choose", seed: rng.int(1, 999_999) } });
  if (isReview(lv, index)) {
    if (lv === 9 && index % 4 === 3) {
      // the second question on the article of item index - 1 ("which sentence doesn't support?"): the evidence
      // question, as level-8 review. A different question type, so the first answer gives little away (QA review)
      return genEvidenceTap(ctx(8, `r8-${tag}`), articleAt(b, "article9", index % 8 < 4 ? 0 : 1));
    }
    const src = lv === 9 ? rng.int(0, 7) : rng.int(Math.max(0, lv - 4), lv - 1);
    const at = rng.int(0, 1) === 0 ? index : index - 1;
    return generateAt(src, ctx(src, `r${src}-${tag}`), at);
  }
  return generateAt(lv, ctx(lv, tag), index);
};

/** The L0 tutorial exercise (authored; pointing hand on "because"). */
export function tutorialExercise(): Exercise {
  const t = TUTORIAL_ITEM;
  const options = [t.distractors[0]!.text, t.answer, t.distractors[1]!.text].map((x) => ({ id: optId(x), text: x }));
  return {
    id: "lp-connective-cafe-tutorial", skillId: SKILLS.combine, objective: "Choose the connective that signals a reason", ages: LP_AGES, difficulty: 1,
    interaction: "choose", answer: { kind: "choice", correct: optId(t.answer), options }, objectKind: "proof", seed: 11, tutorial: true,
    params: { m: MODE.connective, k: 0 }, prompt: { line: "lp.prompt.connective", text: "Which connective fits?" },
    a11yDescription: `A sentence with a gap: ${spoken(t.text)} Three connectives: ${options.map((o) => o.text).join(" / ")}. Choose the one that shows the link the writer means.`,
  };
}
export { answerTextOf };
