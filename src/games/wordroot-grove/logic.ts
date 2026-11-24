import type { Exercise } from "../../engine/types";
import { APOSTROPHE_SENTENCES, CONFUSED_ITEMS, type GapItem, OWNER_PICTURES, type OwnerPicture, ownerPhrases } from "./grammar";
import {
  AFFIX, type AffixWord, CLASS_WORDS, type ClassWord, FAMILY_ITEMS, FIT_ITEMS, FRAMES, type FamilyItem, type FitItem, PREFIX_WORDS, SUFFIX_WORDS, type Tag,
  TWO_AFFIX_WORDS, type TwoAffixWord, type WordClass,
} from "./morphology";
import { ACROSS_SENTENCES, ONE_SENTENCE, type Passage } from "./passages";
import { GREEK_WORDS, ROOT, ROOT_CONTEXT, type RootContextItem, type RootWord, WORD_FOR, type WordForItem } from "./roots";

/**
 * Wordroot Grove — pure helpers shared by the generator, the board, the hints and the tests (no React, no I/O).
 * An exercise carries its mode in params.m and its bank index in params.k (params.b picks the affix bank, params.v
 * whether an owner picture shows several owners), so everything on screen is read back from the banks.
 */
export const MODE = {
  meaning: 0, build: 1, sort: 2, fit: 3, build2: 4, family: 5, rootmatch: 6, rootmeaning: 7, wordfor: 8, rootcontext: 9,
  clueMeaning: 10, clueTap: 11, owner: 12, apostrophe: 13, confused: 14,
} as const;
export type ModeName = keyof typeof MODE;
export const modeOf = (ex: Exercise): ModeName => {
  const m = ex.params?.m ?? 0;
  return (Object.keys(MODE) as ModeName[]).find((k) => MODE[k] === m) ?? "meaning";
};
const k = (ex: Exercise) => ex.params?.k ?? 0;

// ---------------------------------------------------------------- ids and lines
/** Option id from its text: lower case, apostrophes become "_", everything else non-alphanumeric "-". */
export function slug(text: string): string {
  const s = text.toLowerCase().replace(/'/g, "_").replace(/[^a-z0-9_]+/g, "-").replace(/^-+|-+$/g, "");
  return /^[a-z]/.test(s) ? s : `o${s}`;
}
/** Voice-line ids (all in voice.json; the unit test checks every one exists). */
export const wordLine = (w: string) => `wg.w.${w}`;
export const sentenceLine = (mode: "fit" | "family" | "rootcontext" | "apostrophe" | "confused", id: string) => `wg.s.${mode}.${id}`;
export const passageLine = (word: string) => `wg.p.${word}`;
export const spellLine = (word: string) => `wg.spell.${word}`;
export const partLine = (id: string) => `wg.part.${id}`;

// ---------------------------------------------------------------- bank lookups
export const affixBank = (b: number): readonly AffixWord[] => (b === 1 ? SUFFIX_WORDS : PREFIX_WORDS);
export const affixWordOf = (ex: Exercise): AffixWord => affixBank(ex.params?.b ?? 0)[k(ex)]!;
export const twoAffixOf = (ex: Exercise): TwoAffixWord => TWO_AFFIX_WORDS[k(ex)]!;
export const fitOf = (ex: Exercise): FitItem => FIT_ITEMS[k(ex)]!;
export const familyOf = (ex: Exercise): FamilyItem => FAMILY_ITEMS[k(ex)]!;
export const rootWordOf = (ex: Exercise): RootWord => GREEK_WORDS[k(ex)]!;
export const wordForOf = (ex: Exercise): WordForItem => WORD_FOR[k(ex)]!;
export const rootContextOf = (ex: Exercise): RootContextItem => ROOT_CONTEXT[k(ex)]!;
export const passageOf = (ex: Exercise): Passage => (ex.params?.b === 1 ? ACROSS_SENTENCES : ONE_SENTENCE)[k(ex)]!;
export const ownerOf = (ex: Exercise): OwnerPicture => OWNER_PICTURES[k(ex)]!;
export const gapOf = (ex: Exercise): GapItem => (modeOf(ex) === "confused" ? CONFUSED_ITEMS : APOSTROPHE_SENTENCES)[k(ex)]!;
export const classWord = (w: string): ClassWord | undefined => CLASS_WORDS.find((x) => x.word === w);

/** Which word every Latin-option word grows from (wordfor first miss shows each option's root). */
export const ROOT_OF: Readonly<Record<string, string>> = {
  ...Object.fromEntries(WORD_FOR.map((x) => [x.answer, x.root])),
  vision: "vis", tract: "tract", structure: "struct",
};

// ---------------------------------------------------------------- what is on the leaf
export type Seg = { text: string; bold?: boolean; gap?: boolean };
/** Split "a *word* in ___ text" into plain, bold and gap segments. */
export function segments(text: string): Seg[] {
  const out: Seg[] = [];
  for (const part of text.split(/(\*[^*]+\*|___)/)) {
    if (!part) continue;
    if (part === "___") out.push({ text: "___", gap: true });
    else if (part.startsWith("*")) out.push({ text: part.slice(1, -1), bold: true });
    else out.push({ text: part });
  }
  return out;
}

/** A word part shown on the first miss: the morpheme and, for affixes and roots, its meaning. */
export interface PartCard { text: string; meaning?: string; line?: string }
const partCard = (p: string): PartCard => {
  if (AFFIX[p]) return { text: AFFIX[p]!.label, meaning: AFFIX[p]!.meaning, line: partLine(p) };
  if (ROOT[p]) return { text: ROOT[p]!.id, meaning: ROOT[p]!.meaning, line: partLine(p) };
  return { text: p };
};

/** The word Gloop stretches apart on a first miss (meaning items), with a card per part. */
export function stretchOf(ex: Exercise): { word: string; parts: PartCard[] } | null {
  const m = modeOf(ex);
  if (m === "meaning") {
    const w = affixWordOf(ex);
    return { word: w.word, parts: w.parts.map(partCard) };
  }
  if (m === "rootmeaning") {
    const w = rootWordOf(ex);
    return { word: w.word, parts: w.parts.map((p) => (w.roots.includes(p) ? partCard(p) : w.notes?.[p] ? { text: p, meaning: w.notes[p] } : { text: p })) };
  }
  return null;
}
/** Meaning cards for build tiles (first miss): what each affix tile adds. */
export const tileMeaning = (text: string): string | undefined => AFFIX[text]?.meaning;

// ---------------------------------------------------------------- the worked model (second miss)
/** Reasoning steps shown one by one while the runner counts along (docs §4, "worked chain"). */
export function chainOf(ex: Exercise): string[] {
  const m = modeOf(ex);
  switch (m) {
    case "meaning":
    case "build": {
      const w = affixWordOf(ex);
      return [w.parts.join(" + "), w.parts.map((p) => (AFFIX[p] ? AFFIX[p]!.meaning : p)).join(" + "), `${w.word}: ${w.gloss}`];
    }
    case "build2": {
      const w = twoAffixOf(ex);
      return [w.parts.join(" + "), w.parts.map((p) => (AFFIX[p] ? AFFIX[p]!.meaning : p)).join(" + "), `${w.word}: ${w.gloss}`];
    }
    case "rootmeaning": {
      const w = rootWordOf(ex);
      return [w.parts.join(" + "), w.parts.map((p) => (ROOT[p] ? ROOT[p]!.meaning : w.notes?.[p] ?? p)).join(" + "), `${w.word}: ${w.answer}`];
    }
    case "wordfor": {
      const w = wordForOf(ex);
      return [w.meaning, `${ROOT[w.root]!.label} = ${ROOT[w.root]!.meaning}`, w.answer];
    }
    case "sort":
      return [];
    case "fit":
      return [fitOf(ex).why];
    case "family": {
      const f = familyOf(ex);
      return [`${f.known} = ${f.knownMeaning}`, f.why];
    }
    case "rootcontext": {
      const r = rootContextOf(ex);
      return [`${ROOT[r.root]!.label} = ${ROOT[r.root]!.meaning}`, r.why];
    }
    case "clueMeaning":
    case "clueTap":
      return [passageOf(ex).why];
    case "owner": {
      const o = ownerOf(ex);
      const many = ex.params?.v === 1;
      return many
        ? [`More than one owner: ${o.owners}`, `${o.owners} already ends in s, so add ' after it`, ownerPhrases(o, true)[0].text]
        : [`One owner: the ${o.owner}`, `${o.owner} + 's`, ownerPhrases(o, false)[0].text];
    }
    case "apostrophe":
    case "confused":
      return [gapOf(ex).why];
    default:
      return [];
  }
}
/** Runner count-along steps for the second-miss model: one per chain step (sort: one per card). */
export function modelSteps(ex: Exercise): number {
  if (modeOf(ex) === "sort" || modeOf(ex) === "rootmatch") return ex.answer.kind === "match" ? ex.answer.items.length : 0;
  return chainOf(ex).length;
}

// ---------------------------------------------------------------- misconceptions
/** The misconception tag of a choice option (undefined for the right answer). */
export function tagOf(ex: Exercise, optionId: string): Tag | undefined {
  const a = ex.answer;
  if (a.kind !== "choice" || optionId === a.correct) return undefined;
  return distractorsOf(ex).find((d) => slug(d.text) === optionId)?.tag;
}
/** Every distractor of a choice exercise with its tag (unit-tested: each one is tagged). */
export function distractorsOf(ex: Exercise): { text: string; tag: Tag }[] {
  switch (modeOf(ex)) {
    case "meaning": return [...affixWordOf(ex).distractors];
    case "fit": return [...fitOf(ex).distractors];
    case "family": return [...familyOf(ex).distractors];
    case "rootmeaning": return [...rootWordOf(ex).distractors];
    case "wordfor": return wordForOf(ex).distractors.map((t) => ({ text: t, tag: "root-swap" as Tag }));
    case "rootcontext": return [...rootContextOf(ex).distractors];
    case "clueMeaning": return [...passageOf(ex).distractors];
    case "owner": return ownerPhrases(ownerOf(ex), ex.params?.v === 1).slice(1);
    case "apostrophe":
    case "confused": return [...gapOf(ex).distractors];
    default: return [];
  }
}

/** The class frame a word fits (second-miss frame test for sorting). */
export const frameFor = (cls: WordClass, word: string) => FRAMES[cls].replace("___", word);
export const CLASS_LABEL: Readonly<Record<WordClass, string>> = { noun: "noun", verb: "verb", adjective: "adjective", adverb: "adverb" };
export const CLASS_JOB: Readonly<Record<WordClass, string>> = { noun: "names a thing", verb: "an action", adjective: "describes", adverb: "tells how" };
