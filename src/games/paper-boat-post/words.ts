/**
 * Paper Boat Post — the word bank (DATA only, no React). Spec: docs/worlds/paper-boat-post.md §3.1.
 *
 * Every word is written as its graphemes ("sh i p", "c a p e"), so the board can light a digraph as one unit,
 * build tiles can be one grapheme each, and the level a word belongs to can be computed (grapheme gating, §3.2):
 *   L0–L3 single consonants + short vowels · L4 sh ch th ck ll ss · L5 consonant blends · L6 final -e ·
 *   L7 vowel teams ai ay ee ea oa · L8 two-syllable words, compounds and plurals.
 * US spelling throughout; no word in the bank has a common UK spelling variant (UK notes: docs/worlds §3.3).
 * Every PICTURED word has one original drawing in pictures.tsx (tested).
 */

export interface Word {
  w: string;
  /** Graphemes, in order. A final "e" in a magic-e word is its own grapheme (the quiet e). */
  g: readonly string[];
  /** Final -e word (cape, cube). */
  magic?: boolean;
  /** Spoken parts of a long word (nap·kin), for the "one part at a time" hint. */
  parts?: readonly string[];
}

const DIGRAPHS = new Set(["sh", "ch", "th", "ck", "ll", "ss", "ff"]);
const TEAMS = new Set(["ai", "ay", "ee", "ea", "oa"]);
const VOWELS = new Set(["a", "e", "i", "o", "u"]);

/** "sh i p" → { w: "ship", g: ["sh","i","p"] }. A trailing "+e" marks a magic-e word ("c a p +e"). */
function W(spec: string, parts?: string): Word {
  const toks = spec.split(" ");
  const magic = toks[toks.length - 1] === "+e";
  const g = toks.map((t) => (t === "+e" ? "e" : t));
  const w: Word = { w: g.join(""), g };
  if (magic) w.magic = true;
  if (parts) w.parts = parts.split(" ");
  return w;
}

// ---------------------------------------------------------------------------------------------------- words
const LIST: Word[] = [
  // CVC (L0–L3)
  ...["c a t", "h a t", "b a t", "r a t", "m a t", "f a n", "v a n", "c a n", "p a n", "c a p", "m a p", "c a b", "b a g", "h a m",
    "b u g", "r u g", "m u g", "j u g", "s u n", "b u n", "b u s", "c u p", "c u b", "t u b", "h u t",
    "m o p", "t o p", "p o t", "d o t", "d o g", "l o g", "b o x", "f o x",
    "p i g", "w i g", "p i n", "f i n", "b i n", "f i g", "b i b", "j e t", "n e t", "h e n", "p e n", "w e b", "l e g", "b e d"].map((s) => W(s)),
  // digraphs (L4)
  ...["ch i p", "sh i p", "sh o p", "ch i n", "ch i ck", "f i sh", "d i sh", "sh e d", "sh e ll", "b a th", "p a th", "d u ck", "s o ck", "r o ck", "d o ck", "m o th",
    "b e ll"].map((s) => W(s)),
  // blends (L5)
  ...["f r o g", "f o g", "c r a b", "c r i b", "n e s t", "v e s t", "p l u m", "p l u g", "s l u g", "d r u m", "t w i g", "b e l t", "t e n t"].map((s) => W(s)),
  // final -e (L6)
  ...["c a p +e", "c u b +e", "t u b +e", "c a n +e", "c o n +e", "b o n +e", "b i k +e", "k i t +e", "r o p +e", "r o s +e", "n o s +e",
    "c a k +e", "l a k +e", "p l a t +e", "p l a n +e", "s n a k +e"].map((s) => W(s)),
  // vowel teams (L7)
  ...["sh ee p", "l ea f", "l oa f", "c oa t", "g oa t", "b oa t", "s ea l", "s ai l", "n ai l", "t ai l", "s n ai l", "r ai n", "t r ai n", "t r ay", "h ay",
    "t r ee", "b ee", "f ee t", "s ee d", "p ea ch", "b ea ch", "t oa d", "r oa d", "s oa p"].map((s) => W(s)),
  // two-syllable words (L8)
  W("n a p k i n", "nap kin"), W("p u m p k i n", "pump kin"), W("p i c n i c", "pic nic"), W("p u pp e t", "pup pet"), W("k i tt e n", "kit ten"),
  W("m i tt e n", "mit ten"), W("m u ff i n", "muf fin"), W("m a g n e t", "mag net"), W("b a s k e t", "bas ket"), W("r a bb i t", "rab bit"),
  W("r o b o t", "ro bot"), W("c a c t u s", "cac tus"),
  // compounds (L8): drawn as one picture, built from two word cards
  W("c u p c a k +e", "cup cake"), W("p a n c a k +e", "pan cake"), W("b a ck p a ck", "back pack"), W("s a n d b o x", "sand box"),
  W("r ai n c oa t", "rain coat"), W("s ai l b oa t", "sail boat"), W("m ai l b o x", "mail box"), W("b a th t u b", "bath tub"), W("c a t f i sh", "cat fish"),
  // keyword pictures for letter tiles (never targets; §3.1)
  ...["a pp l e", "e gg", "i g l oo", "o c t o p u s", "u m b r e ll a", "c ow", "f ea th er", "h or s e", "j e ll y", "p a n d a", "t i g er", "v i o l i n",
    "w or m", "z e b r a", "m oo n"].map((s) => W(s)),
];

export const WORDS: ReadonlyMap<string, Word> = new Map(LIST.map((w) => [w.w, w]));
export function word(w: string): Word {
  const x = WORDS.get(w);
  if (!x) throw new Error(`paper-boat-post: unknown word ${w}`);
  return x;
}
export const graphemes = (w: string): readonly string[] => word(w).g;

/** Lowest level whose taught graphemes cover the word (§3.2 grapheme gating). */
export function wordLevel(w: string): number {
  const x = word(w);
  if (x.parts && x.parts.length > 1) return 8;
  let lv = 0;
  const g = x.g;
  for (let i = 0; i < g.length; i++) {
    const t = g[i]!;
    if (TEAMS.has(t)) lv = Math.max(lv, 7);
    else if (DIGRAPHS.has(t)) lv = Math.max(lv, 4);
    else if (t.length > 1) lv = Math.max(lv, 9); // a grapheme the path never teaches here (or, er, ow, oo…)
    const next = g[i + 1];
    if (t.length === 1 && !VOWELS.has(t) && next && next.length === 1 && !VOWELS.has(next) && !(x.magic && i + 1 === g.length - 1)) lv = Math.max(lv, 5);
  }
  if (x.magic) lv = Math.max(lv, 6);
  return lv;
}

/** The short vowel (or team / magic-e vowel) a word is built around, for review spacing and hints. */
export function vowelOf(w: string): string {
  const g = word(w).g;
  return g.find((t) => VOWELS.has(t) || TEAMS.has(t)) ?? "";
}

// ---------------------------------------------------------------------------------------------------- keywords
/** Keyword picture for each letter tile (L0–L3; §3.1). A literacy specialist still has to check this list. */
export const KEYWORDS: Readonly<Record<string, string>> = {
  a: "apple", e: "egg", i: "igloo", o: "octopus", u: "umbrella",
  b: "bell", c: "cow", d: "duck", f: "feather", g: "goat", h: "horse", j: "jelly", k: "kite", l: "leaf", m: "moon",
  n: "nest", p: "panda", r: "robot", s: "seal", t: "tiger", v: "violin", w: "worm", z: "zebra",
};

// ---------------------------------------------------------------------------------------------------- real words
/**
 * Common real words used to check L0 swaps (the other tile must make a REAL word) and to make sure critter tags
 * are NOT real words. Not exhaustive; tags are authored and reviewed as well.
 */
export const REAL_WORDS: ReadonlySet<string> = new Set([
  ...LIST.map((w) => w.w),
  "sat", "pat", "vat", "fat", "man", "tan", "ran", "tap", "nap", "lap", "gap", "sap", "hug", "dug", "tug", "fun", "run", "rub", "sub",
  "hop", "pop", "hot", "not", "lot", "rot", "cot", "got", "hog", "jog", "dig", "big", "jig", "tin", "win", "sin", "kin", "wet", "pet", "vet", "let",
  "met", "set", "get", "bet", "ten", "men", "den", "zen", "yen", "red", "led", "fed", "wed", "zap", "zip", "zit", "zig", "zag", "jab", "jam", "jar",
  "jot", "jut", "van", "vet", "vow", "cut", "hit", "fit", "kit", "sit", "pit", "lit", "bit", "wit", "but", "nut", "rut", "gut", "ham", "hum", "him",
  "hem", "dam", "ram", "yam", "bad", "dad", "had", "mad", "pad", "sad", "lad", "rag", "tag", "wag", "nag", "lag", "sag", "gab", "tab", "dab",
  "jug", "lug", "mud", "bud", "cud", "tub", "pub", "nub", "cob", "job", "mob", "rob", "sob", "rib", "fib", "nib", "jet", "web", "beg", "peg", "keg",
  "zed", "vex", "vim", "vug", "veg", "zoo", "vow", "von", "jen", "jed",
]);
