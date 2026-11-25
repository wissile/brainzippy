import type { Exercise } from "../../engine/types";
import { hashSeed } from "../../engine/rng";
import { ARTICLES, type Article, ENOUGH, type EnoughItem, ROLE_LABEL, ROLE_WHY, type Role, STRONGEST, type StrongestItem } from "./articles";
import {
  COMBINE, CONCISE, CONNECTIVES, CUTS, type CombineItem, type ConciseItem, type ConnectiveItem, type CutItem, MODIFIERS, type ModifierItem,
  ORDERS, type OrderItem, PRONOUNS, PURPOSES, type PronounItem, type PurposeItem, RELATION_LABEL, SHIFTS, type ShiftItem, type Tag, type Tagged,
} from "./sentences";
import { CONNOTE, type ConnoteItem, DEVICE_DEF, DEVICE_LABEL, type Device, FEELING_MARK, FIG_LINES, type Feeling, type FigLine, WORD_GROUPS, type WordGroup } from "./words";

/**
 * The Lantern Press — pure helpers shared by the generator, the board, the hints and the tests (no React, no I/O).
 * An exercise carries its mode in params.m and its bank index in params.k (params.v: the second word group of a
 * sort), so everything on screen is read back from the banks.
 */
export const MODE = {
  connective: 0, combine: 1, order: 2, modTap: 3, modFix: 4, pronTap: 5, pronFix: 6, cutTap: 7, concise: 8, connote: 9, feelSort: 10,
  device: 11, figMeaning: 12, purpose: 13, shift: 14, evidenceTap: 15, claimSort: 16, strongest: 17, offTap: 18, enough: 19,
} as const;
export type ModeName = keyof typeof MODE;
export const modeOf = (ex: Exercise): ModeName => {
  const m = ex.params?.m ?? 0;
  return (Object.keys(MODE) as ModeName[]).find((k) => MODE[k] === m) ?? "connective";
};
const k = (ex: Exercise) => ex.params?.k ?? 0;

// ---------------------------------------------------------------- ids and lines
/** Option id from its text: short, stable and answer-neutral (the DOM never says which option is right). */
export const optId = (text: string): string => `o${hashSeed("lp", text).toString(36)}`;
/** Read-aloud voice lines for item text (all in voice.json; the unit test checks every one exists). */
export const itemLine = (bank: string, id: string) => `lp.s.${bank}.${id}`;
export const articleLine = (id: string) => `lp.a.${id}`;
export const noteLine = (id: string) => `lp.s.note.${id}`;

// ---------------------------------------------------------------- bank lookups
export const connectiveOf = (ex: Exercise): ConnectiveItem => (ex.tutorial ? TUTORIAL_ITEM : CONNECTIVES[k(ex)]!);
export const combineOf = (ex: Exercise): CombineItem => COMBINE[k(ex)]!;
export const orderOf = (ex: Exercise): OrderItem => ORDERS[k(ex)]!;
export const modifierOf = (ex: Exercise): ModifierItem => MODIFIERS[k(ex)]!;
export const pronounOf = (ex: Exercise): PronounItem => PRONOUNS[k(ex)]!;
export const cutOf = (ex: Exercise): CutItem => CUTS[k(ex)]!;
export const conciseOf = (ex: Exercise): ConciseItem => CONCISE[k(ex)]!;
export const connoteOf = (ex: Exercise): ConnoteItem => CONNOTE[k(ex)]!;
export const groupById = (id: string): WordGroup => WORD_GROUPS.find((g) => g.id === id)!;
export const sortGroupsOf = (ex: Exercise): [WordGroup, WordGroup] => [WORD_GROUPS[k(ex)]!, WORD_GROUPS[ex.params?.v ?? 0]!];
export const figOf = (ex: Exercise): FigLine => FIG_LINES[k(ex)]!;
export const purposeOf = (ex: Exercise): PurposeItem => PURPOSES[k(ex)]!;
export const shiftOf = (ex: Exercise): ShiftItem => SHIFTS[k(ex)]!;
export const articleOf = (ex: Exercise): Article => ARTICLES[k(ex)]!;
export const strongestOf = (ex: Exercise): StrongestItem => STRONGEST[k(ex)]!;
export const enoughOf = (ex: Exercise): EnoughItem => ENOUGH[k(ex)]!;
export const claimIndex = (a: Article) => a.sentences.findIndex((s) => s.role === "claim");

/** The L0 tutorial: its own sentence (not in the bank), so it never repeats a generated item. */
export const TUTORIAL_ITEM: ConnectiveItem = {
  id: "cafe", text: "The harbor café closed early ___ a storm was coming.", answer: "because", relation: "cause",
  distractors: [{ text: "although", tag: "wrong-relation" }, { text: "so", tag: "reversed" }], why: "The coming storm is the reason the café closed early.",
};

// ---------------------------------------------------------------- what is on the proof
export type Seg = { text: string; gap?: boolean };
/** Split "a sentence with a ___ gap" into plain and gap segments. */
export function segments(text: string): Seg[] {
  return text.split(/(___)/).filter(Boolean).map((t) => (t === "___" ? { text: t, gap: true } : { text: t }));
}
/** Sentence text without the gap marker (for read-aloud and screen readers). */
export const spoken = (text: string) => text.replace(/___/g, "blank");
/** The feeling of each word in a group (sorting and connotation). */
export const feelingOf = (g: WordGroup, word: string): Feeling => (g.positive === word ? "positive" : g.negative === word ? "negative" : "neutral");

// ---------------------------------------------------------------- distractors and tags
/** Every distractor of a choice exercise with its misconception tag (unit-tested: each one is tagged). */
export function distractorsOf(ex: Exercise): Tagged[] {
  switch (modeOf(ex)) {
    case "connective": return [...connectiveOf(ex).distractors];
    case "combine": return [...combineOf(ex).distractors];
    case "modFix": return [...modifierOf(ex).distractors];
    case "pronFix": return [...pronounOf(ex).distractors];
    case "concise": return [...conciseOf(ex).distractors];
    case "connote": {
      const n = connoteOf(ex);
      const g = groupById(n.group);
      return [{ text: n.want === "positive" ? g.negative : g.positive, tag: "wrong-connotation" }, { text: g.neutral, tag: "neutral" }];
    }
    case "device": {
      const a = ex.answer;
      if (a.kind !== "choice") return [];
      return a.options.filter((o) => o.id !== a.correct).map((o) => ({ text: o.text ?? "", tag: "wrong-device" as Tag }));
    }
    case "figMeaning": {
      const f = figOf(ex);
      return [{ text: f.literal, tag: "literal" }, { text: f.misread, tag: "misread" }];
    }
    case "purpose": return [...purposeOf(ex).distractors];
    case "shift": return [...shiftOf(ex).distractors];
    case "strongest": return [...strongestOf(ex).distractors];
    case "enough": return [...enoughOf(ex).distractors];
    default: return [];
  }
}
/** The right answer's text for a choice exercise (read back from the bank). */
export function answerTextOf(ex: Exercise): string {
  switch (modeOf(ex)) {
    case "connective": return connectiveOf(ex).answer;
    case "combine": return combineOf(ex).answer;
    case "modFix": return modifierOf(ex).fix;
    case "pronFix": return pronounOf(ex).fix;
    case "concise": return conciseOf(ex).answer;
    case "connote": {
      const n = connoteOf(ex);
      return groupById(n.group)[n.want];
    }
    case "device": return DEVICE_LABEL[figOf(ex).device];
    case "figMeaning": return figOf(ex).meaning;
    case "purpose": return purposeOf(ex).answer;
    case "shift": return shiftOf(ex).answer;
    case "strongest": return strongestOf(ex).answer;
    case "enough": return enoughOf(ex).answer;
    default: return "";
  }
}
/** The misconception tag of a choice option (undefined for the right answer). */
export function tagOf(ex: Exercise, optionId: string): Tag | undefined {
  const a = ex.answer;
  if (a.kind !== "choice" || optionId === a.correct) return undefined;
  return distractorsOf(ex).find((d) => optId(d.text) === optionId)?.tag;
}

// ---------------------------------------------------------------- the worked model (second miss)
const short = (s: string, n = 6) => {
  const w = s.replace(/[.,]$/, "").split(/\s+/);
  return w.length <= n ? w.join(" ") : `${w.slice(0, n).join(" ")}…`;
};
/** Reasoning steps shown one by one while the runner counts along (docs §4, second-miss column). */
export function chainOf(ex: Exercise): string[] {
  switch (modeOf(ex)) {
    case "connective": {
      const c = connectiveOf(ex);
      return [c.why, `${RELATION_LABEL[c.relation]} → ${c.answer}`];
    }
    case "combine": {
      return [combineOf(ex).why];
    }
    case "order": {
      return [orderOf(ex).why];
    }
    case "modTap":
    case "modFix": {
      const m = modifierOf(ex);
      return [`Read literally: ${m.literal}`, `"${m.chunks[m.wrong]!.replace(/[,.]$/, "")}" should describe ${m.target}: put it next to ${m.target}.`];
    }
    case "pronTap":
    case "pronFix": {
      const p = pronounOf(ex);
      return [...p.vague.map((i) => `${p.chunks[i]} → ${p.could.join(" or ")}?`), "It could point to either, so it's unclear. Name the one the writer means."];
    }
    case "cutTap": {
      const c = cutOf(ex);
      return c.cut.map((i, n) => `Cut "${c.chunks[i]!.replace(/[,.]$/, "")}": ${c.why[n]}`);
    }
    case "concise": {
      const c = conciseOf(ex);
      return [c.why, "Same facts, fewer words."];
    }
    case "connote": {
      const n = connoteOf(ex);
      const g = groupById(n.group);
      return [`${g.positive} (+) · ${g.neutral} (0) · ${g.negative} (−)`, `Clue: "${n.cue}" → ${n.want === "positive" ? "+" : "−"}: ${g[n.want]}`];
    }
    case "feelSort": return [];
    case "device": {
      const f = figOf(ex);
      return [DEVICE_DEF[f.device], f.how];
    }
    case "figMeaning": {
      const f = figOf(ex);
      return [`Literally: ${f.literal}`, `The writer means: ${f.meaning}`];
    }
    case "purpose": {
      const p = purposeOf(ex);
      return [`Doer: ${p.doer} · Thing: ${p.thing}`, p.passive ? `Focus on ${p.thing} → put it first (passive).` : `Focus on ${p.doer} → put the doer first (active).`];
    }
    case "shift": {
      const s = shiftOf(ex);
      return [`The doer is ${s.doer}.`, `Keep ${s.doer} doing every action, in active voice.`];
    }
    case "evidenceTap": {
      const a = articleOf(ex);
      return a.sentences.filter((s) => s.role === "evidence").map((s) => `"${short(s.text)}" → evidence: ${ROLE_WHY.evidence}`);
    }
    case "claimSort": return [];
    case "strongest": {
      const s = strongestOf(ex);
      const weak = s.distractors.find((d) => d.tag !== "irrelevant")!;
      const off = s.distractors.find((d) => d.tag === "irrelevant")!;
      return [
        `"${short(off.text)}" → not about the claim`,
        `"${short(weak.text)}" → ${weak.tag === "opinion" ? "an opinion, not checkable" : "one person's view"}`,
        `"${short(s.answer)}" → about the claim · many cases · checkable`,
      ];
    }
    case "offTap": {
      const a = articleOf(ex);
      const off = a.sentences.find((s) => s.role === "none")!;
      return [`Claim: ${a.sentences[claimIndex(a)]!.text}`, `"${short(off.text)}" → ${off.off === "opinion" ? "an opinion, not evidence" : "true, but not about the claim"}`];
    }
    case "enough": {
      return [enoughOf(ex).why];
    }
    default:
      return [];
  }
}
/** Runner count-along steps for the second-miss model: one per chain step (sorting: one per card). */
export function modelSteps(ex: Exercise): number {
  if (ex.answer.kind === "match") return ex.answer.items.length;
  return chainOf(ex).length;
}

// ---------------------------------------------------------------- display helpers
export { DEVICE_LABEL, FEELING_MARK, ROLE_LABEL, type Device, type Feeling, type Role };
