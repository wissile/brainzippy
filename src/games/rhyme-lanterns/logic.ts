import type { AnswerKey, Exercise } from "../../engine/types";
import { MODES, type Mode } from "./generator";
import { isWord, rhymes } from "./words";

/**
 * Board-independent logic for Hoot's Rhyme Lanterns (pure, unit-tested): reads an exercise back into
 * lanterns, and decides which words are spoken when (naming the pictures, the slow-ending model).
 */
export interface Lanterns {
  mode: Mode;
  /** Hoot's lantern (null in odd-one-out). */
  target: string | null;
  /** yesno: the second lantern. */
  candidate: string | null;
  /** The picture lanterns the child can move (empty for yesno). */
  words: string[];
  /** chain: lanterns on the finished string, Hoot's included. */
  links: number;
}

export function lanternsOf(ex: Exercise): Lanterns {
  const mode = MODES[ex.params?.mode ?? 1] ?? "pick";
  const a = ex.prompt?.vars?.a;
  const b = ex.prompt?.vars?.b;
  const words = mode === "yesno" || (ex.answer.kind !== "choice" && ex.answer.kind !== "set") ? [] : ex.answer.options.map((o) => o.id);
  return {
    mode,
    target: mode === "odd" ? null : typeof a === "string" ? a : ex.objectKind,
    candidate: mode === "yesno" && typeof b === "string" ? b : null,
    words,
    links: ex.params?.links ?? 3,
  };
}

/** Correct option ids as a list (choice → one id, set → several). */
export function correctIds(ex: Exercise): string[] {
  const a = ex.answer;
  if (a.kind === "choice") return [a.correct];
  if (a.kind === "set") return [...a.correct];
  return [];
}

/**
 * Words Hoot says slowly in the modelled answer (second miss), in order:
 * yesno → both words · pick → Hoot's word, then its rhyme · chain → Hoot's word, then every rhyme ·
 * odd → the three rhyming words, then the one that does not rhyme.
 */
export function modelWords(ex: Exercise): string[] {
  const l = lanternsOf(ex);
  const right = correctIds(ex);
  switch (l.mode) {
    case "yesno":
      return [l.target!, l.candidate!];
    case "pick":
    case "chain":
      return [l.target!, ...right];
    case "odd":
      return [...l.words.filter((w) => !right.includes(w)), ...right];
  }
}

/** Count-along steps for the model: two runner beats (≈1.4 s) per slow word. */
export const modelSteps = (ex: Exercise) => modelWords(ex).length * 2;
/** The word to say at count-along step `i` (even steps only), else null. */
export const modelWordAt = (ex: Exercise, i: number): string | null => (i % 2 === 0 ? (modelWords(ex)[i / 2] ?? null) : null);

/** Words named aloud when an exercise starts (and after a miss): Hoot's word(s) first, then each picture still in play. */
export function namingWords(ex: Exercise, eliminated: readonly AnswerKey[] = [], placed: readonly string[] = []): string[] {
  const l = lanternsOf(ex);
  const first = [l.target, l.candidate, ...placed].filter((w): w is string => !!w);
  return [...first, ...l.words.filter((w) => !eliminated.includes(w) && !placed.includes(w))];
}

/** Voice-line ids for a word: normal and slowed (whole-word clips; the slowed one is rendered at lower speed). */
export const wordLine = (w: string) => `rl.w.${w}`;
export const slowLine = (w: string) => `rl.slow.${w}`;

/** Sanity check used by tests: every word on the board is in the bank, and the answer is right by the rhyme rule. */
export function answerIsConsistent(ex: Exercise): boolean {
  const l = lanternsOf(ex);
  const right = correctIds(ex);
  const all = [l.target, l.candidate, ...l.words].filter((w): w is string => !!w);
  if (!all.every(isWord)) return false;
  switch (l.mode) {
    case "yesno":
      return right[0] === (rhymes(l.target!, l.candidate!) ? "yes" : "no");
    case "pick":
      return l.words.filter((w) => rhymes(l.target!, w)).join() === right.join();
    case "chain": {
      const r = l.words.filter((w) => rhymes(l.target!, w));
      return r.length === l.links - 1 && r.every((w) => right.includes(w)) && right.length === r.length;
    }
    case "odd": {
      const [odd] = right;
      const rest = l.words.filter((w) => w !== odd);
      return rest.length === 3 && rest.every((w) => rest.every((v) => v === w || rhymes(v, w))) && rest.every((w) => !rhymes(w, odd!));
    }
  }
}
