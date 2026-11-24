import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildRound, generateBand } from "../../src/engine/round";
import { exerciseReducer, initExercise } from "../../src/engine/session";
import { lintExercise, validateAnswer } from "../../src/engine/validation";
import type { Exercise, GameDefinition, GeneratorBand } from "../../src/engine/types";
import { EXERCISE_PREFIX } from "../../src/analytics/schema";
import { getSkill, getWorld } from "../../src/content/registry";
import { isBlocked } from "../../src/games/paper-boat-post/blocklist";
import { ARTICLES, ENOUGH, STRONGEST } from "../../src/games/lantern-press/articles";
import { lanternPress, lanternTutorial } from "../../src/games/lantern-press/definition";
import { LEVEL_SKILL, LP_MAX_LEVEL, generateLanternPress, isReview } from "../../src/games/lantern-press/generator";
import { explainFor, hintFor, praiseFor } from "../../src/games/lantern-press/hints";
import {
  answerTextOf, articleOf, chainOf, combineOf, connectiveOf, cutOf, distractorsOf, figOf, modeOf, modelSteps, modifierOf, optId, orderOf, pronounOf, sortGroupsOf, tagOf,
} from "../../src/games/lantern-press/logic";
import {
  COMBINE, CONCISE, CONNECTIVES, CUTS, EXCLUDED_USAGE, MODIFIERS, ORDERS, PRONOUNS, PURPOSES, SHIFTS, TAGS,
} from "../../src/games/lantern-press/sentences";
import { ALSO_FITS, CONNOTE, DEVICES, DEVICE_DISTRACTORS, DEVICE_LABEL, FIG_LINES, WORD_GROUPS, type Device } from "../../src/games/lantern-press/words";
import { allLines } from "../../src/games/lantern-press/voice-lines";

const voice = JSON.parse(readFileSync("src/games/lantern-press/voice.json", "utf8")) as { lines: Record<string, { text: string; vary?: Record<string, string[]>; speaker?: string }> };
const L = voice.lines;
const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 11);
const band = (level: number, seed: number) => generateBand(lanternPress, level, seed, 8);
const ITEMS: Exercise[] = [];
for (let lv = 0; lv <= LP_MAX_LEVEL; lv++) for (const s of SEEDS) ITEMS.push(...band(lv, s));
ITEMS.push(lanternTutorial);
const keyOf = (ex: Exercise) => ex.id.replace(/-(r\d-)?l\dn\d$|-tutorial$/, "");
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
/** Every printed string of every bank (for the blocklist, names, brands and length checks). */
const BANK_TEXT: string[] = [
  ...CONNECTIVES.flatMap((c) => [c.text, c.why, c.answer, ...c.distractors.map((d) => d.text)]),
  ...COMBINE.flatMap((c) => [...c.notes, c.answer, c.why, ...c.distractors.map((d) => d.text)]),
  ...ORDERS.flatMap((o) => [...o.notes, ...o.cards, o.decoy.text, o.why]),
  ...MODIFIERS.flatMap((m) => [m.chunks.join(" "), m.literal, m.fix, ...m.distractors.map((d) => d.text)]),
  ...PRONOUNS.flatMap((p) => [p.chunks.join(" "), p.means, p.fix, ...p.distractors.map((d) => d.text)]),
  ...CUTS.flatMap((c) => [c.chunks.join(" "), ...c.why]),
  ...CONCISE.flatMap((c) => [c.text, c.answer, c.why, ...c.distractors.map((d) => d.text)]),
  ...CONNOTE.map((c) => c.text),
  ...WORD_GROUPS.flatMap((g) => [g.positive, g.neutral, g.negative, g.core]),
  ...FIG_LINES.flatMap((f) => [f.text, f.meaning, f.literal, f.misread, f.how]),
  ...PURPOSES.flatMap((p) => [p.purpose, p.answer, ...p.distractors.map((d) => d.text)]),
  ...SHIFTS.flatMap((s) => [s.text, s.answer, ...s.distractors.map((d) => d.text)]),
  ...ARTICLES.flatMap((a) => [a.headline, ...a.sentences.map((s) => s.text)]),
  ...STRONGEST.flatMap((s) => [s.claim, s.answer, ...s.distractors.map((d) => d.text)]),
  ...ENOUGH.flatMap((y) => [y.text, y.question, y.answer, y.why, ...y.distractors.map((d) => d.text)]),
];

describe("lantern press: structure", () => {
  it("is registered under the English library (ages 12–14, maxLevel 9), hosted by Sarah with Hoot, every skill declared", () => {
    const w = getWorld("lantern-press")!;
    expect(w.subject).toBe("english");
    expect([...w.ages]).toEqual([12, 14]);
    expect(w.maxLevel).toBe(9);
    expect(lanternPress.progression).toEqual({ roundLength: 8, maxLevel: 9, stepUpAfter: 2, stepDownAtAttempts: 3 });
    for (const s of lanternPress.skillIds) expect(getSkill(s), s).toBeDefined();
    expect([...w.characters]).toEqual(["sarah", "hoot"]);
    expect(EXERCISE_PREFIX["lantern-press"]).toBe("lp");
    for (const ex of ITEMS) expect(ex.id.startsWith("lp-"), ex.id).toBe(true);
  });

  it("has exactly one tutorial (level 0, difficulty 1): the café sentence, answer because", () => {
    const tutorials = buildRound(lanternPress, { level: 0, seed: 1 }).exercises.filter((e) => e.tutorial);
    expect(tutorials).toHaveLength(1);
    expect(tutorials[0]!.difficulty).toBe(1);
    const a = lanternTutorial.answer;
    expect(a.kind === "choice" && a.options.find((o) => o.id === a.correct)?.text).toBe("because");
    // the tutorial sentence is not in the bank, so a round never shows it twice
    expect(CONNECTIVES.some((c) => c.text === connectiveOf(lanternTutorial).text)).toBe(false);
  });

  it("levels 0–9 × 50 seeds: every item lints, has its level's (or its review source's) skill and exactly one right answer; every distractor carries a known tag", () => {
    expect(ITEMS.length).toBeGreaterThan(4000);
    for (const ex of ITEMS) {
      expect(lintExercise({ ...ex, difficulty: ex.difficulty ?? 1 }), ex.id).toEqual([]);
      expect(lanternPress.skillIds, ex.id).toContain(ex.skillId);
      const a = ex.answer;
      if (a.kind === "choice") {
        expect(a.options.filter((o) => validateAnswer(a, o.id).correct), ex.id).toHaveLength(1);
        expect(new Set(a.options.map((o) => o.text)).size, `${ex.id} duplicate texts`).toBe(a.options.length);
        expect(new Set(a.options.map((o) => o.id)).size, `${ex.id} duplicate ids`).toBe(a.options.length);
        expect(a.options.find((o) => o.id === a.correct)!.text, ex.id).toBe(answerTextOf(ex));
        for (const o of a.options) {
          if (o.id === a.correct) continue;
          const tag = tagOf(ex, o.id);
          expect(tag, `${ex.id} ${o.text} untagged`).toBeTruthy();
          expect(TAGS, `${ex.id} ${tag}`).toContain(tag);
        }
        expect(distractorsOf(ex).length, ex.id).toBe(a.options.length - 1);
        // option ids never reveal the answer
        for (const o of a.options) expect(o.id).toMatch(/^o[0-9a-z]+$/);
      }
      if (a.kind === "sequence") expect(validateAnswer(a, a.order).correct, ex.id).toBe(true);
      if (a.kind === "match") expect(validateAnswer(a, a.pairs).correct, ex.id).toBe(true);
      if (a.kind === "set") {
        expect(validateAnswer(a, a.correct).correct, ex.id).toBe(true);
        // any other selection is wrong (exactly one defensible set)
        expect(validateAnswer(a, a.options.map((o) => o.id)).correct, ex.id).toBe(false);
      }
    }
  });

  it("is deterministic and never repeats an item inside one level's band", () => {
    for (let lv = 0; lv <= LP_MAX_LEVEL; lv++) {
      for (const s of SEEDS.slice(0, 25)) {
        const b = band(lv, s);
        expect(b).toEqual(band(lv, s));
        const keys = b.map(keyOf);
        expect(new Set(keys).size, `level ${lv} seed ${s}: ${keys.join(" ")}`).toBe(keys.length);
      }
    }
  });

  it("modes alternate by index, and every level's banks hold at least 24 items (3 rounds without repeats)", () => {
    const expected: Record<number, readonly string[]> = {
      0: ["connective", "connective"], 1: ["combine", "order"], 2: ["modTap", "modFix"], 3: ["pronTap", "pronFix"], 4: ["cutTap", "concise"],
      5: ["connote", "feelSort"], 6: ["device", "figMeaning"], 7: ["purpose", "shift"],
    };
    for (let lv = 0; lv <= 7; lv++) for (const s of SEEDS.slice(0, 20)) band(lv, s).forEach((e, i) => !isReview(lv, i) && expect(modeOf(e), e.id).toBe(expected[lv]![i % 2]));
    const L8 = ["evidenceTap", "claimSort", "evidenceTap", null, "evidenceTap", "claimSort", "claimSort", null];
    const L9 = ["strongest", null, "offTap", null, "enough", null, "offTap", null];
    for (const s of SEEDS.slice(0, 20)) {
      band(8, s).forEach((e, i) => L8[i] && expect(modeOf(e), e.id).toBe(L8[i]));
      band(9, s).forEach((e, i) => L9[i] && expect(modeOf(e), e.id).toBe(L9[i]));
    }
    const perLevel = [CONNECTIVES.length, COMBINE.length + ORDERS.length, MODIFIERS.length * 2, PRONOUNS.length * 2, CUTS.length + CONCISE.length, CONNOTE.length + 18, FIG_LINES.length * 2, PURPOSES.length + SHIFTS.length];
    perLevel.forEach((n, lv) => expect(n, `level ${lv}`).toBeGreaterThanOrEqual(24));
    for (const bank of [COMBINE, ORDERS, CUTS, CONCISE, PURPOSES, SHIFTS, STRONGEST, ENOUGH]) expect(bank.length).toBeGreaterThanOrEqual(12);
    expect(ARTICLES.length).toBeGreaterThanOrEqual(16);
  });

  it("levels 8–9: the two questions of a pair read the same article (L8 items 0+1 and 4+5; L9 items 2+3 and 6+7)", () => {
    for (const s of SEEDS) {
      const b8 = band(8, s);
      for (const [i, j] of [[0, 1], [4, 5]] as const) expect(articleOf(b8[i]!).id, `${b8[i]!.id} / ${b8[j]!.id}`).toBe(articleOf(b8[j]!).id);
      expect(new Set([0, 2, 4, 6].map((i) => articleOf(b8[i]!).id)).size).toBe(4);
      const b9 = band(9, s);
      for (const [i, j] of [[2, 3], [6, 7]] as const) expect(articleOf(b9[i]!).id, `${b9[i]!.id} / ${b9[j]!.id}`).toBe(articleOf(b9[j]!).id);
    }
  });

  it("interleaved review: from level 3, items at index % 4 === 3 (and every odd item at level 9) come from an earlier level with its skill", () => {
    for (let lv = 0; lv <= LP_MAX_LEVEL; lv++) for (const s of SEEDS.slice(0, 20)) {
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

  it("engine: generateBand gives every index of a band the same band seed, different per round seed and level", () => {
    const seen: Record<string, number[]> = {};
    const game: GameDefinition = {
      ...lanternPress,
      generate: (level, rng, index, b?: GeneratorBand) => {
        (seen[`${level}`] ??= []).push(b!.seed);
        return generateLanternPress(level, rng, index, b);
      },
    };
    generateBand(game, 3, 42, 8);
    generateBand(game, 4, 42, 8);
    expect(new Set(seen["3"]).size).toBe(1);
    expect(seen["3"]![0]).not.toBe(seen["4"]![0]);
    seen["3"] = [];
    generateBand(game, 3, 43, 8);
    expect(seen["3"]!.every((x) => x === seen["3"]![0])).toBe(true);
    // a generator called without a band (older call sites) still works deterministically
    expect(generateLanternPress(8, { next: () => 0.5, int: (a: number) => a, pick: <T,>(x: readonly T[]) => x[0]!, shuffle: <T,>(x: readonly T[]) => [...x], chance: () => false }, 0).id).toMatch(/^lp-evidencetap-/);
  });
});

describe("lantern press: content rules", () => {
  it("clause cards: no alternative orders; exactly one capitalised card; only the last card has the period; the decoy is a lowercase connective", () => {
    for (const o of ORDERS) {
      expect(o.alternatives, o.id).toEqual([]);
      expect(o.cards.filter((c) => /^[A-Z]/.test(c)), o.id).toHaveLength(1);
      expect(/^[A-Z]/.test(o.cards[0]!), o.id).toBe(true);
      expect(o.cards[o.cards.length - 1]!.endsWith("."), o.id).toBe(true);
      for (const c of o.cards.slice(0, -1)) expect(c.endsWith("."), `${o.id}: ${c}`).toBe(false);
      expect(o.decoy.text, o.id).toMatch(/^[a-z]+$/);
      expect(o.notes.length).toBeLessThanOrEqual(3);
    }
    // the validator accepts the authored order only (every other order of the right cards is wrong)
    for (const ex of ITEMS.filter((e) => modeOf(e) === "order")) {
      const a = ex.answer;
      if (a.kind !== "sequence") continue;
      for (const p of permutations([...a.order])) expect(validateAnswer(a, p).correct, `${ex.id} ${p.join(",")}`).toBe(p.join() === a.order.join());
      expect(a.order.map((id) => a.pieces.find((x) => x.id === id)!.text).join(" "), ex.id).toBe(orderOf(ex).cards.join(" "));
    }
  });

  it("tap items: the prompt states the count, which equals the answer; parts rebuild the sentence or article", () => {
    for (const ex of ITEMS.filter((e) => e.answer.kind === "set")) {
      const a = ex.answer;
      if (a.kind !== "set") continue;
      const n = a.correct.length;
      const m = modeOf(ex);
      if (m === "pronTap" || m === "cutTap") expect(ex.prompt!.text, ex.id).toMatch(n === 2 ? /Tap the 2 / : /Tap the (unclear word|part)/);
      if (m === "evidenceTap") expect([n, ex.prompt!.text.includes("Tap the 2 sentences")]).toEqual([2, true]);
      if (m === "modTap" || m === "offTap") expect([n, /Tap the (phrase|sentence)/.test(ex.prompt!.text)]).toEqual([1, true]);
      const source = m === "modTap" ? modifierOf(ex).chunks : m === "pronTap" ? pronounOf(ex).chunks : m === "cutTap" ? cutOf(ex).chunks : articleOf(ex).sentences.map((s) => s.text);
      expect(a.options.map((o) => o.text), ex.id).toEqual([...source]);
      expect(a.options.length).toBeGreaterThanOrEqual(3);
    }
    for (const m of MODIFIERS) expect(m.wrong).toBeLessThan(m.chunks.length);
    for (const c of CUTS) {
      expect(c.why).toHaveLength(c.cut.length);
      expect(c.cut.length).toBeLessThanOrEqual(2);
      for (const i of c.cut) expect(i).toBeLessThan(c.chunks.length);
    }
  });

  it("pronouns: only pronouns are marked unclear, singular 'they' is never marked, and every rewrite item states the writer's meaning", () => {
    const PRON = new Set(["he", "she", "it", "they", "him", "her", "his", "them", "their", "this", "that"]);
    for (const p of PRONOUNS) {
      expect(p.vague.length).toBeGreaterThanOrEqual(1);
      for (const i of p.vague) {
        expect(PRON.has(p.chunks[i]!.toLowerCase()), `${p.id}: ${p.chunks[i]}`).toBe(true);
        // EXCLUDED_USAGE: singular they is never marked; a plural "they" is unclear only between two plural groups
        if (p.chunks[i]!.toLowerCase() === "they") for (const c of p.could) expect(c, p.id).toMatch(/s$/);
      }
      expect(p.could.length).toBe(2);
      expect(p.means.length).toBeGreaterThan(5);
    }
  });

  it("excluded usage: no item judges which/that, split infinitives, singular they, sentence-initial and/but or data is/are", () => {
    const tags = new Set<string>(TAGS);
    for (const u of EXCLUDED_USAGE) expect(tags.has(u)).toBe(false);
    for (const ex of ITEMS) {
      const a = ex.answer;
      if (a.kind !== "choice") continue;
      const right = (a.options.find((o) => o.id === a.correct)!.text ?? "").toLowerCase();
      for (const o of a.options) {
        if (o.id === a.correct) continue;
        const t = (o.text ?? "").toLowerCase();
        expect(t.replace(/\bwhich\b/g, "that"), `${ex.id}: which/that only`).not.toBe(right.replace(/\bwhich\b/g, "that"));
        expect(t.replace(/\b(he or she|he|she)\b/g, "they"), `${ex.id}: they only`).not.toBe(right.replace(/\b(he or she|he|she)\b/g, "they"));
      }
    }
  });

  it("figurative language: ≥ 6 lines per device, and option sets never hold two labels that could both fit", () => {
    for (const d of DEVICES) expect(FIG_LINES.filter((f) => f.device === d).length, d).toBeGreaterThanOrEqual(6);
    // the declared overlap list: personification/metaphor and hyperbole/idiom must be in it
    expect(ALSO_FITS.personification).toContain("metaphor");
    expect(ALSO_FITS.hyperbole).toContain("idiom");
    for (const [d, list] of Object.entries(DEVICE_DISTRACTORS) as [Device, readonly Device[]][]) for (const x of list) expect(ALSO_FITS[d], `${d}/${x}`).not.toContain(x);
    for (const ex of ITEMS.filter((e) => modeOf(e) === "device")) {
      const a = ex.answer;
      if (a.kind !== "choice") continue;
      const ds = a.options.map((o) => (Object.keys(DEVICE_LABEL) as Device[]).find((k) => DEVICE_LABEL[k] === o.text)!);
      expect(ds.every(Boolean), ex.id).toBe(true);
      const d = figOf(ex).device;
      for (const x of ds) if (x !== d) expect(ALSO_FITS[d], `${ex.id}: ${d}/${x}`).not.toContain(x);
      expect(DEVICE_LABEL[figOf(ex).device]).toBe(answerTextOf(ex));
    }
    // a simile uses like or as; a metaphor and a personification don't
    for (const f of FIG_LINES) {
      if (f.device === "simile") expect(f.text, f.id).toMatch(/\b(like|as)\b/);
      if (f.device === "metaphor" || f.device === "personification") expect(f.text, f.id).not.toMatch(/\blike\b|\bas \w+ as\b/);
    }
  });

  it("connotation: one gap per sentence, the three words of one group, and sorts give each feeling exactly two words", () => {
    for (const c of CONNOTE) {
      expect(c.text.split("___"), c.id).toHaveLength(2);
      expect(WORD_GROUPS.some((g) => g.id === c.group), c.id).toBe(true);
    }
    for (const g of WORD_GROUPS) expect(new Set([g.positive, g.neutral, g.negative]).size).toBe(3);
    expect(WORD_GROUPS.flatMap((g) => [g.positive, g.neutral, g.negative])).not.toEqual(expect.arrayContaining(["skinny", "slender", "thin"]));
    for (const ex of ITEMS.filter((e) => modeOf(e) === "feelSort")) {
      const a = ex.answer;
      if (a.kind !== "match") continue;
      const [g1, g2] = sortGroupsOf(ex);
      expect(g1.id).not.toBe(g2.id);
      const counts = Object.values(a.pairs).reduce<Record<string, number>>((m, f) => ({ ...m, [f]: (m[f] ?? 0) + 1 }), {});
      expect(counts).toEqual({ positive: 2, neutral: 2, negative: 2 });
    }
  });

  it("articles: 4–7 sentences, ≤ 120 words, fictional, exactly one claim, two evidence, one reasoning with an explicit link, one that doesn't support", () => {
    for (const a of ARTICLES) {
      expect(a.fictional).toBe(true);
      expect(a.sentences.length).toBeGreaterThanOrEqual(4);
      expect(a.sentences.length).toBeLessThanOrEqual(7);
      expect(words(a.sentences.map((s) => s.text).join(" ")), a.id).toBeLessThanOrEqual(120);
      const roles = a.sentences.map((s) => s.role).sort();
      expect(roles, a.id).toEqual(["claim", "evidence", "evidence", "none", "reasoning"]);
      expect(a.sentences.find((s) => s.role === "reasoning")!.text, a.id).toMatch(/^(So |This means )/);
      expect(a.sentences.find((s) => s.role === "none")!.off, a.id).toMatch(/irrelevant|opinion/);
    }
    // sufficiency is not always "no": some evidence is enough
    expect(ENOUGH.filter((y) => y.answer.startsWith("Yes")).length).toBeGreaterThanOrEqual(4);
    expect(ENOUGH.filter((y) => y.answer.startsWith("No")).length).toBeGreaterThanOrEqual(4);
  });

  it("length caps: level 0–7 sentences ≤ 28 words; notes ≤ 3 sentences", () => {
    const sentences = [
      ...CONNECTIVES.map((c) => c.text), ...COMBINE.flatMap((c) => [c.answer, ...c.distractors.map((d) => d.text)]), ...ORDERS.map((o) => o.cards.join(" ")),
      ...MODIFIERS.flatMap((m) => [m.chunks.join(" "), m.fix, ...m.distractors.map((d) => d.text)]), ...PRONOUNS.flatMap((p) => [p.chunks.join(" "), p.fix, ...p.distractors.map((d) => d.text)]),
      ...CUTS.map((c) => c.chunks.join(" ")), ...CONCISE.flatMap((c) => [c.text, c.answer, ...c.distractors.map((d) => d.text)]), ...CONNOTE.map((c) => c.text),
      ...FIG_LINES.map((f) => f.text), ...PURPOSES.flatMap((p) => [p.purpose, p.answer, ...p.distractors.map((d) => d.text)]), ...SHIFTS.flatMap((s) => [s.text, s.answer, ...s.distractors.map((d) => d.text)]),
    ];
    for (const s of sentences) expect(words(s), s).toBeLessThanOrEqual(28);
    for (const c of COMBINE) expect(c.notes.length).toBeLessThanOrEqual(3);
  });

  it("content safety: the blocklist, banned topics, real brands and real people never appear; names are fictional first names", () => {
    const bad = BANK_TEXT.flatMap((s) => s.split(/[^A-Za-zñá']+/).filter((t) => t && isBlocked(t)).map((t) => `${t} in "${s}"`));
    expect([...new Set(bad)]).toEqual([]);
    const text = BANK_TEXT.join(" \n ").toLowerCase();
    const TOPICS = /\b(election|vote for|democrat|republican|president|senator|church|mosque|temple|prayer|god|bible|quran|vaccine|medicine|doctor said|diet|weight loss|calories|pill|drug|alcohol|cigarette|vape|gun|shooting|war)\b/;
    expect(text.match(TOPICS)?.[0]).toBeUndefined();
    // real brands and real people (a reviewer can extend the list): never reused in passages
    const REAL = ["lego", "nike", "disney", "pokemon", "google", "apple", "amazon", "netflix", "youtube", "tiktok", "instagram", "facebook", "roblox", "minecraft", "fortnite", "nintendo", "playstation", "xbox", "starbucks", "mcdonald", "coca", "pepsi", "oreo", "barbie", "marvel", "tesla", "toyota", "ikea", "walmart", "target", "spotify", "shakespeare", "einstein", "obama", "trump", "biden", "beyonce", "taylor swift", "messi", "ronaldo", "lincoln", "washington", "newton", "darwin", "edison", "curie", "mozart", "picasso", "harry potter", "godfather", "batman", "superman", "mickey", "elsa", "shrek", "nemo", "dora", "bluey"];
    for (const r of REAL) expect(text.includes(r), r).toBe(false);
    const NAMES = ["Ana", "Kofi", "Mei", "Raj", "Lena", "Omar", "Zara", "Tomás", "Aiyana", "Sami", "Priya", "Jonah", "Nia", "Kenji", "Mina", "Lucia", "Rumble"];
    const OK = ["I", "Harbor", "Park", "Monster", "Island", "Lantern", "Press", "Monday", "Tuesday", "Thursdays", "Friday", "Fridays", "Saturday", "Saturdays", "Sunday", "Sundays", "July", "June", "Grandpa", "Check"];
    const caps = new Set(BANK_TEXT.flatMap((s) => s.match(/(?<!^|[.!?:→]\s|["“]|\(|^\s*)\b[A-Z][a-zá']+/g) ?? []).map((w) => w.replace(/'s$/, "")));
    for (const c of caps) expect([...NAMES, ...OK], c).toContain(c);
    // US spelling
    expect(text).not.toMatch(/colour|favour|neighbour|grey\b|realise|organise|centre|metre\b|theatre|practise\b/);
  });
});

describe("lantern press: hints and the model", () => {
  const miss = (ex: Exercise, value: string | string[] | Record<string, string>) => exerciseReducer(initExercise(ex), { type: "SUBMIT", value });
  const choiceItem = (mode: string, tag: string) => ITEMS.find((e) => modeOf(e) === mode && e.answer.kind === "choice" && e.answer.options.some((o) => tagOf(e, o.id) === tag))!;
  const optWithTag = (ex: Exercise, tag: string) => (ex.answer.kind === "choice" ? ex.answer.options.find((o) => tagOf(ex, o.id) === tag)!.id : "");
  it("first-miss hints key off the misconception", () => {
    const c = choiceItem("combine", "comma-splice");
    expect(hintFor(miss(c, optWithTag(c, "comma-splice")))).toBe("lp.hint.splice");
    const r = choiceItem("connective", "reversed");
    expect(hintFor(miss(r, optWithTag(r, "reversed")))).toBe("lp.hint.reversed");
    const m = choiceItem("modFix", "meaning-shift");
    expect(hintFor(miss(m, optWithTag(m, "meaning-shift")))).toBe("lp.hint.who");
    const n = choiceItem("connote", "neutral");
    expect(hintFor(miss(n, optWithTag(n, "neutral")))).toBe("lp.hint.neutral");
    const f = choiceItem("figMeaning", "literal");
    expect(hintFor(miss(f, optWithTag(f, "literal")))).toBe("lp.hint.literal");
    const y = choiceItem("enough", "too-strict");
    expect(hintFor(miss(y, optWithTag(y, "too-strict")))).toBe("lp.hint.strict");
    const tap = ITEMS.find((e) => modeOf(e) === "pronTap")!;
    expect(hintFor(miss(tap, ["c0"]))).toBe("lp.hint.pronoun");
  });

  it("every item has a round-start line, a first-miss line and praise that exist in voice.json, spoken by the right character", () => {
    for (const ex of ITEMS) {
      expect(L[explainFor(ex)]?.speaker, `${ex.id} explain ${explainFor(ex)}`).toBe("hoot");
      for (const id of praiseFor(ex)) expect(L[id]?.speaker, `${ex.id} praise ${id}`).toBe("sarah");
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

  it("the worked model has one step per chain line (labelling: one per card) and never just repeats the answer", () => {
    for (const ex of ITEMS) {
      if (ex.answer.kind === "match") expect(modelSteps(ex)).toBe(ex.answer.items.length);
      else {
        expect(chainOf(ex).length, ex.id).toBeGreaterThan(0);
        expect(modelSteps(ex)).toBe(chainOf(ex).length);
      }
      if (ex.answer.kind === "choice" && modeOf(ex) !== "connective") for (const line of chainOf(ex)) expect(line, ex.id).not.toBe(answerTextOf(ex));
    }
    expect(chainOf(lanternTutorial)).toEqual(["The coming storm is the reason the café closed early.", "a reason → because"]);
    const c = ITEMS.find((e) => modeOf(e) === "combine")!;
    expect(chainOf(c)).toEqual([combineOf(c).why]);
  });
});

describe("lantern press: voice", () => {
  it("voice.json holds exactly the lines generated from the banks (content and clips can't drift)", () => {
    const want = allLines();
    expect(Object.keys(L).sort()).toEqual(Object.keys(want).sort());
    for (const [id, l] of Object.entries(want)) {
      expect(L[id]!.text, id).toBe(l.text);
      expect(L[id]!.speaker, id).toBe(l.speaker);
      expect(L[id]!.vary, id).toEqual(l.vary);
    }
  });

  it("every line is prefixed, captioned, short and spoken by sarah, hoot or the narrator; praise names process", () => {
    for (const [id, line] of Object.entries(L)) {
      expect(id.startsWith("lp."), id).toBe(true);
      expect(line.text.trim().length, id).toBeGreaterThan(0);
      expect(["sarah", "hoot", undefined], id).toContain(line.speaker);
      if (!/^lp\.(s|a)\./.test(id)) expect(words(line.text), id).toBeLessThanOrEqual(16);
      expect(line.text.toLowerCase(), id).not.toMatch(/\b(smart|genius|clever|brilliant|gifted|hurry|quick|fast|deadline)\b/);
      for (const t of line.text.split(/[^A-Za-zñá']+/).filter(Boolean)) expect(isBlocked(t), `${id}: ${t}`).toBe(false);
    }
    for (const id of Object.keys(L).filter((k) => k.startsWith("lp.dlg."))) expect(L[id]!.text.length, id).toBeLessThanOrEqual(72);
    for (const id of Object.keys(L).filter((k) => k.startsWith("lp.praise."))) expect(L[id]!.text, id).toMatch(/^You /);
  });

  it("prompts and read-aloud lines exist for every item (the proof's text, never the options)", () => {
    const READ: Partial<Record<string, (ex: Exercise) => string[]>> = {
      connective: (ex) => [`lp.s.connective.${connectiveOf(ex).id}`],
      combine: (ex) => [`lp.s.combine.${combineOf(ex).id}`],
      order: (ex) => [`lp.s.order.${orderOf(ex).id}`],
      modTap: (ex) => [`lp.s.modifier.${modifierOf(ex).id}`],
      modFix: (ex) => [`lp.s.modifier.${modifierOf(ex).id}`],
      pronTap: (ex) => [`lp.s.pronoun.${pronounOf(ex).id}`],
      pronFix: (ex) => [`lp.s.pronoun.${pronounOf(ex).id}`, `lp.s.note.${pronounOf(ex).id}`],
      cutTap: (ex) => [`lp.s.cut.${cutOf(ex).id}`],
      device: (ex) => [`lp.s.fig.${figOf(ex).id}`],
      figMeaning: (ex) => [`lp.s.fig.${figOf(ex).id}`],
      evidenceTap: (ex) => [`lp.a.${articleOf(ex).id}`],
      claimSort: (ex) => [`lp.a.${articleOf(ex).id}`],
      offTap: (ex) => [`lp.a.${articleOf(ex).id}`],
    };
    for (const ex of ITEMS) {
      expect(L[ex.prompt!.line], ex.prompt!.line).toBeDefined();
      expect(L[ex.prompt!.line]!.text, ex.id).toBe(ex.prompt!.text);
      for (const id of READ[modeOf(ex)]?.(ex) ?? []) expect(L[id], `${ex.id} needs ${id}`).toBeDefined();
    }
    for (const x of [...CONCISE.map((c) => `lp.s.concise.${c.id}`), ...CONNOTE.map((c) => `lp.s.connote.${c.id}`), ...PURPOSES.map((p) => `lp.s.purpose.${p.id}`), ...SHIFTS.map((s) => `lp.s.shift.${s.id}`), ...STRONGEST.map((s) => `lp.s.strongest.${s.id}`), ...ENOUGH.map((y) => `lp.s.enough.${y.id}`)]) expect(L[x], x).toBeDefined();
  });

  it("option ids are stable hashes of their text", () => {
    expect(optId("because")).toBe(optId("because"));
    expect(optId("because")).not.toBe(optId("although"));
  });
});

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}
