import type { Exercise } from "../../engine/types";
import { isBlocked } from "./blocklist";
import { NOTES_BUILD, NOTES_READ, PLURALS } from "./content";
import { KEYWORDS, WORDS, graphemes, word } from "./words";

/**
 * Paper Boat Post — pure helpers shared by the generator, the board and the tests (no React, no I/O).
 */

/** Board modes (exercise.params.m). */
export const MODE = { swap: 0, read: 1, tag: 2, build: 3, sort: 4, compound: 5, noteRead: 6, noteBuild: 7, plural: 8 } as const;
export type ModeName = keyof typeof MODE;
export const modeOf = (ex: Exercise): ModeName => {
  const m = ex.params?.m ?? 1;
  return (Object.keys(MODE) as ModeName[]).find((k) => MODE[k] === m) ?? "read";
};
export const isReadMode = (m: ModeName) => m === "read" || m === "plural" || m === "noteRead";

// ---------------------------------------------------------------- distractor classification (§3, ENGLISH_PATH §6.6)
export type Misconception =
  | "far" | "vowel-swap" | "final-swap" | "onset-swap" | "digraph-swap" | "dropped-consonant" | "blend-swap" | "short-partner"
  | "team-swap" | "syllable-swap" | "singular" | "look-alike" | "other";

const DIGRAPH = new Set(["sh", "ch", "th", "ck", "ll"]);
const VOWEL_LIKE = (g: string) => /^[aeiou]/.test(g) && g.length <= 2;

/** What a reading decoy tests: how `decoy` differs from `target` (both words in the bank). */
export function classify(target: string, decoy: string): Misconception {
  if (!WORDS.has(target) || !WORDS.has(decoy)) return "other";
  const t = word(target);
  const d = word(decoy);
  // the short-vowel partner (cap / cape), or a word that starts with it (kitten for kite)
  if (t.magic && !d.magic && (target === decoy + "e" || decoy.startsWith(target.slice(0, -1)))) return "short-partner";
  if (!t.magic && d.magic && decoy === target + "e") return "short-partner";
  const tg = t.g;
  const dg = d.g;
  if (!tg.some((x) => dg.includes(x))) return "far";
  // dropped consonant: the decoy is the target with one consonant grapheme removed (frog → fog, bath → bat)
  if (dg.length === tg.length - 1) {
    for (let i = 0; i < tg.length; i++) if (tg.filter((_, k) => k !== i).join("") === d.w) return DIGRAPH.has(tg[i]!) ? "digraph-swap" : "dropped-consonant";
  }
  // …or the target with one consonant added (rain → train): the same blend misconception, the other way round
  if (dg.length === tg.length + 1) {
    for (let i = 0; i < dg.length; i++) if (dg.filter((_, k) => k !== i).join("") === t.w) return "dropped-consonant";
  }
  if (tg.length === dg.length) {
    const diff = tg.map((x, i) => (x === dg[i] ? -1 : i)).filter((i) => i >= 0);
    if (diff.length === 1) {
      const i = diff[0]!;
      const a = tg[i]!;
      const b = dg[i]!;
      if (VOWEL_LIKE(a) && VOWEL_LIKE(b)) return a.length === 2 || b.length === 2 ? "team-swap" : "vowel-swap";
      if (DIGRAPH.has(a) || DIGRAPH.has(b)) return "digraph-swap";
      if (i === tg.length - 1) return "final-swap";
      if (i === 0) return "onset-swap";
      return i === 1 && !VOWEL_LIKE(a) ? "blend-swap" : "other";
    }
    if (diff.length === 2 && diff[0] === 0 && diff[1] === 1 && !VOWEL_LIKE(tg[1]!)) return "blend-swap";
  }
  if (t.parts && d.parts) return "syllable-swap";
  // a vowel team against a final -e spelling of the same sound (soap / rope)
  const team = (g: readonly string[]) => g.some((x) => x.length === 2 && VOWEL_LIKE(x));
  if ((t.magic && team(dg)) || (d.magic && team(tg))) return "team-swap";
  return "other";
}

/** Grapheme-level edit distance 1? (minimal pair rule, §9 test 4) */
export function oneGraphemeApart(a: string, b: string): boolean {
  const x = graphemes(a);
  const y = graphemes(b);
  if (x.length !== y.length) return false;
  return x.filter((g, i) => g !== y[i]).length === 1;
}

// ---------------------------------------------------------------- tiles and safety
/** Every string the tiles can spell when filling `slots` slots (ordered, no tile used twice). */
export function tileStrings(tiles: readonly string[], slots: number): Set<string> {
  const out = new Set<string>();
  const used = tiles.map(() => false);
  const walk = (acc: string, depth: number) => {
    if (depth === slots) {
      out.add(acc);
      return;
    }
    for (let i = 0; i < tiles.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      walk(acc + tiles[i], depth + 1);
      used[i] = false;
    }
  };
  walk("", 0);
  return out;
}

/** A tile set is safe when nothing it can spell (in the slots, or one short for a quiet-e word) is blocked. */
export function safeTiles(tiles: readonly string[], slots: number, magic = false): boolean {
  for (const s of tileStrings(tiles, slots)) if (isBlocked(s)) return false;
  if (magic) for (const s of tileStrings(tiles, slots - 1)) if (isBlocked(s)) return false;
  return true;
}

// ---------------------------------------------------------------- reading the exercise back (board + tests)
/** The word printed on the boat's sail for reading items (never spoken before the answer). */
export function sailWord(ex: Exercise): string | null {
  const m = modeOf(ex);
  const a = ex.answer;
  if (m === "read" && a.kind === "choice") return a.correct;
  if (m === "plural") return pluralOf(ex);
  return null;
}
export function pluralOf(ex: Exercise): string | null {
  const a = ex.answer;
  if (a.kind !== "choice") return null;
  const [w, n] = a.correct.split("*") as [string, string];
  if (n !== "3") return null;
  return Object.keys(PLURALS).find((p) => PLURALS[p]![0] === w) ?? null;
}
export const noteOf = (ex: Exercise) => NOTES_READ[ex.params?.s ?? 0]!;
export const buildNoteOf = (ex: Exercise) => NOTES_BUILD[ex.params?.s ?? 0]!;

/** The word the child spells / hears in spelling items (also safe to speak). */
export function spokenWord(ex: Exercise): string | null {
  const v = ex.prompt?.vars?.word ?? ex.prompt?.vars?.to;
  return typeof v === "string" ? v : null;
}

/** Letters to light one by one in the modelled answer (grapheme groups; words of a note). */
export function modelUnits(ex: Exercise): readonly string[] {
  const m = modeOf(ex);
  if (m === "noteRead") return noteOf(ex).words;
  if (m === "noteBuild") return buildNoteOf(ex).cards;
  const w = sailWord(ex) ?? spokenWord(ex);
  if (m === "plural" && w) return [...graphemes(PLURALS[w]![0]), w.endsWith("es") ? "es" : "s"];
  return w && WORDS.has(w) ? graphemes(w) : [];
}

/** Runner count-along steps for the second-miss model: one per unit, plus one to say the whole word. */
export function modelSteps(ex: Exercise): number {
  const m = modeOf(ex);
  if (m === "sort" || m === "swap" || m === "tag") return 0;
  if (m === "build" || m === "compound" || m === "noteBuild") return ex.answer.kind === "sequence" ? ex.answer.order.length : 0;
  return modelUnits(ex).length + 1;
}

/** Spoken name of a picture option ("fox*3" → foxes). */
export function pictureWord(art: string): string {
  const [w, n] = art.split("*") as [string, string | undefined];
  if (n === "3") return Object.keys(PLURALS).find((p) => PLURALS[p]![0] === w) ?? w;
  return w;
}

/** Voice-line ids. */
export const wordLine = (w: string) => `pb.w.${w}`;
export const slowLine = (w: string) => `pb.slow.${w}`;
export const gotLine = (w: string) => `pb.got.${w}`;
export const keywordLine = (letter: string) => `pb.k.${letter}`;
export const sentenceLine = (id: string) => `pb.s.${id}`;
export const trickyLine = (w: string) => `pb.t.${w.toLowerCase()}`;
export const keywordOf = (letter: string): string | undefined => KEYWORDS[letter];
