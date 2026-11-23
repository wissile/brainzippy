/**
 * Content-safety blocklist for generated English strings (ENGLISH_PATH §6.5; docs/worlds/paper-boat-post.md §8).
 *
 * World-local for now: no shared English blocklist exists yet. When a second English world needs one, lift this
 * file to a shared module. It is applied to every target and distractor word, every dropped-consonant and
 * vowel-swap distractor, every critter-tag pseudo-word, and every string a tile set can spell (generator at run
 * time + unit test). Entries are lower case. It lists rude words, slurs and body/toilet words in English, plus
 * common words in other languages that read as rude to speakers of those languages. Kept here only so the game
 * can never show them.
 */
export const BLOCKLIST: ReadonlySet<string> = new Set([
  // English: rude, sexual, toilet, slurs
  "ass", "arse", "butt", "bum", "poo", "poop", "pee", "wee", "fart", "crap", "damn", "hell", "piss", "shit", "shat", "fuck", "fuk", "cock", "dick",
  "tit", "tits", "titty", "cum", "jizz", "fag", "fags", "nob", "knob", "twat", "cunt", "slut", "whore", "ho", "hoe", "sex", "sexy", "nude", "porn",
  "boob", "boobs", "puss", "pussy", "wank", "bitch", "bastard", "dyke", "homo", "spaz", "retard", "nazi", "pube", "anus", "anal", "rape",
  "kill", "die", "dead", "gun", "guns", "puke", "barf", "snot", "turd", "dung", "sod", "git", "coon", "gook", "chink", "spic", "kike",
  "wop", "jap", "paki", "nig", "nigga", "nigger", "negro", "tard", "shag", "slag", "tosser", "prat", "dork", "suck", "sucks", "bong", "weed",
  "drug", "drugs", "beer", "rum", "gin", "wine", "booze", "meth",
  // other languages (reads as rude): Spanish, French, German, Dutch, Italian, Portuguese
  "puta", "puto", "caca", "culo", "coño", "pene", "teta", "mierda", "pute", "merde", "cul", "chier", "fick", "kacke", "arsch",
  "kut", "lul", "pik", "neuk", "cazzo", "merda", "figa", "foda", "porra", "cona",
]);

/** Strong words: also blocked when they appear INSIDE a longer string (e.g. a 5-tile build). */
export const BLOCK_INSIDE: readonly string[] = ["fuck", "shit", "cunt", "cock", "dick", "twat", "slut", "whore", "porn", "nigg", "fag", "piss", "tits", "rape", "nazi", "kike", "spic", "coon"];

export function isBlocked(s: string): boolean {
  const t = s.toLowerCase().replace(/[^a-zñ]/g, "");
  if (!t) return false;
  if (BLOCKLIST.has(t)) return true;
  return BLOCK_INSIDE.some((b) => t.includes(b));
}
