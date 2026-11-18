/**
 * Hoot's Rhyme Lanterns — the picture word bank (DATA only, no React).
 *
 * Rules for a word to be in the bank (docs/worlds/rhyme-lanterns.md §Word bank):
 *  - common for ages 3–5 and drawable as one clear object/animal (each has an original SVG in art.tsx);
 *  - one standard US spelling, no homophone a child might confuse (no pear/pair, night/knight, mail/male);
 *  - one syllable, so the rhyme is the whole ending after the first sound(s);
 *  - every member of a rhyme family shares the same spelled rime (cat/hat, not bear/chair), so the bank
 *    can be reused by later reading worlds.
 *
 * `first` is the first SOUND (phoneme), not the letter: cat and king both start with /k/, knee with /n/.
 * `vowel` groups words with the same vowel sound (used for "same vowel, different ending" distractors).
 */
export interface Word {
  word: string;
  /** Rhyme family = spelled rime ("at", "ock"). Two words rhyme iff they share a family. */
  rime: string;
  /** Vowel sound group: a o u i e (short), A O E (long), oo, ar, ow. */
  vowel: string;
  /** First sound (phoneme) of the word. */
  first: string;
  /** Starts with a consonant blend (fr, cl, sn, sw, sl, tr, st, sp). */
  blend?: boolean;
}

const W = (word: string, rime: string, vowel: string, first: string, blend = false): Word => (blend ? { word, rime, vowel, first, blend } : { word, rime, vowel, first });

export const WORDS: readonly Word[] = [
  // short a
  W("cat", "at", "a", "k"), W("hat", "at", "a", "h"), W("bat", "at", "a", "b"), W("rat", "at", "a", "r"),
  W("fan", "an", "a", "f"), W("pan", "an", "a", "p"), W("van", "an", "a", "v"), W("can", "an", "a", "k"),
  // short o
  W("dog", "og", "o", "d"), W("log", "og", "o", "l"), W("frog", "og", "o", "f", true),
  W("clock", "ock", "o", "k", true), W("sock", "ock", "o", "s"), W("rock", "ock", "o", "r"), W("lock", "ock", "o", "l"),
  W("box", "ox", "o", "b"), W("fox", "ox", "o", "f"),
  // short u
  W("bug", "ug", "u", "b"), W("rug", "ug", "u", "r"), W("mug", "ug", "u", "m"), W("jug", "ug", "u", "j"),
  W("sun", "un", "u", "s"), W("bun", "un", "u", "b"),
  // short i
  W("pig", "ig", "i", "p"), W("wig", "ig", "i", "w"),
  W("ring", "ing", "i", "r"), W("king", "ing", "i", "k"), W("wing", "ing", "i", "w"), W("swing", "ing", "i", "s", true),
  // short e
  W("bed", "ed", "e", "b"), W("sled", "ed", "e", "s", true),
  W("bell", "ell", "e", "b"), W("shell", "ell", "e", "sh"),
  // long a
  W("cake", "ake", "A", "k"), W("snake", "ake", "A", "s", true), W("rake", "ake", "A", "r"), W("lake", "ake", "A", "l"),
  W("snail", "ail", "A", "s", true), W("nail", "ail", "A", "n"), W("tail", "ail", "A", "t"),
  // long o, long e, oo, ar, ow
  W("boat", "oat", "O", "b"), W("goat", "oat", "O", "g"), W("coat", "oat", "O", "k"),
  W("bee", "ee", "E", "b"), W("tree", "ee", "E", "t", true), W("knee", "ee", "E", "n"),
  W("moon", "oon", "oo", "m"), W("spoon", "oon", "oo", "s", true),
  W("car", "ar", "ar", "k"), W("star", "ar", "ar", "s", true), W("jar", "ar", "ar", "j"),
  W("house", "ouse", "ow", "h"), W("mouse", "ouse", "ow", "m"),
];

export const WORD_LIST: readonly string[] = WORDS.map((w) => w.word);
const BY_WORD = new Map(WORDS.map((w) => [w.word, w]));

export function wordInfo(word: string): Word {
  const w = BY_WORD.get(word);
  if (!w) throw new Error(`rhyme-lanterns: unknown word ${word}`);
  return w;
}
export const isWord = (word: string) => BY_WORD.has(word);

/** Two different words rhyme when they share a rhyme family. */
export function rhymes(a: string, b: string): boolean {
  return a !== b && wordInfo(a).rime === wordInfo(b).rime;
}

/** Families (rime → members), in bank order. */
export const FAMILIES: ReadonlyMap<string, readonly string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const w of WORDS) (m.get(w.rime) ?? m.set(w.rime, []).get(w.rime)!).push(w.word);
  return m;
})();
export const familyOf = (word: string): readonly string[] => FAMILIES.get(wordInfo(word).rime)!;

// ---------------------------------------------------------------- distractor kinds

/**
 * Distractor kinds, each aimed at a named misconception (docs/worlds/rhyme-lanterns.md §Distractors):
 *  far    — nothing in common (different first sound, vowel and ending): the easy contrast for beginners.
 *  onset  — same first sound, different ending (cat → cake): "rhyme = starts the same" (alliteration).
 *  vowel  — same vowel, different ending (cat → can, wig → wing): "rhyme = sounds a bit alike" (assonance).
 *           Same first sound AND vowel is preferred: the closest near miss.
 */
export type DistractorKind = "far" | "onset" | "vowel";

/** Candidate distractors of a kind for `target`, never rhyming with any word in `avoidRimesOf`. */
export function candidates(kind: DistractorKind, target: string, avoidRimesOf: readonly string[] = [target]): string[] {
  const t = wordInfo(target);
  const rimes = new Set(avoidRimesOf.map((w) => wordInfo(w).rime));
  const pool = WORDS.filter((w) => !rimes.has(w.rime));
  switch (kind) {
    case "far":
      return pool.filter((w) => w.vowel !== t.vowel && w.first !== t.first).map((w) => w.word);
    case "onset":
      return pool.filter((w) => w.first === t.first && w.vowel !== t.vowel).map((w) => w.word);
    case "vowel": {
      const same = pool.filter((w) => w.vowel === t.vowel);
      const close = same.filter((w) => w.first === t.first);
      return (close.length ? close : same).map((w) => w.word);
    }
  }
}
