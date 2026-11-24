/**
 * Wordroot Grove — morphology banks (levels 0–3). DATA only; every gloss is written for BrainZippy in our own words
 * (no dictionary definitions copied). Spec: docs/worlds/wordroot-grove.md §3 and §3.1.
 *
 * A gloss is the meaning a child should recognise. Distractor glosses apply a DIFFERENT affix to the same base (the
 * affix mix-up misconception) or ignore the affix (`base-only`); every one carries a misconception tag, and none is
 * an acceptable meaning of the word (reviewer check, docs §3.2).
 */

export type WordClass = "noun" | "verb" | "adjective" | "adverb";

/** Misconception tags for distractors (hints key off them; ENGLISH_PATH §6.6). */
export type Tag =
  // affixes: the meaning another affix would give the same base
  | "un" | "re" | "dis" | "pre" | "ful" | "less" | "er" | "able" | "ness" | "ly"
  // ignoring the affix: only the base's meaning
  | "base-only"
  // word class
  | "noun" | "verb" | "adjective" | "adverb"
  // roots, families, context, apostrophes, confused words (see the other banks)
  | "root-swap" | "look-alike" | "opposite" | "topic" | "familiar" | "literal"
  | "plural-apostrophe" | "singular-owner" | "plural-owner" | "no-apostrophe" | "its-contraction" | "its-possessive" | "contraction"
  | "irregular" | "there" | "their" | "theyre" | "to" | "too" | "two" | "your" | "youre" | "than" | "then";

export interface Gloss {
  text: string;
  tag: Tag;
}

export interface AffixWord {
  word: string;
  /** Morphemes in order; they concatenate exactly to `word` when `spellingChange` is false. */
  parts: readonly string[];
  /** The affix this word teaches (key of AFFIX). */
  affix: string;
  gloss: string;
  cls: WordClass;
  spellingChange: boolean;
  distractors: readonly [Gloss, Gloss];
}

/** What each affix means (part-meaning cards `wg.part.<id>`; text shown on the card). */
export const AFFIX: Readonly<Record<string, { label: string; meaning: string }>> = {
  un: { label: "un-", meaning: "not, or undo" },
  re: { label: "re-", meaning: "again" },
  dis: { label: "dis-", meaning: "not, or the opposite" },
  pre: { label: "pre-", meaning: "before" },
  ful: { label: "-ful", meaning: "full of" },
  less: { label: "-less", meaning: "without" },
  er: { label: "-er", meaning: "a person who" },
  or: { label: "-or", meaning: "a person who" },
  able: { label: "-able", meaning: "able to be" },
  ness: { label: "-ness", meaning: "makes a thing (noun)" },
  ment: { label: "-ment", meaning: "makes a thing (noun)" },
  en: { label: "-en", meaning: "to make (verb)" },
  ly: { label: "-ly", meaning: "in a way (often an adverb)" },
};

const g = (text: string, tag: Tag): Gloss => ({ text, tag });
const w = (word: string, parts: string[], affix: string, gloss: string, cls: WordClass, d: [Gloss, Gloss], spellingChange = false): AffixWord =>
  ({ word, parts, affix, gloss, cls, spellingChange, distractors: d });

// ---------------------------------------------------------------- L0 prefixes un-, re-, dis-, pre-
export const PREFIX_WORDS: readonly AffixWord[] = [
  w("unlock", ["un", "lock"], "un", "open the lock", "verb", [g("lock it again", "re"), g("lock it ahead of time", "pre")]),
  w("unpack", ["un", "pack"], "un", "take things out of a bag", "verb", [g("pack the bag again", "re"), g("pack the bag ahead of time", "pre")]),
  w("untie", ["un", "tie"], "un", "undo a knot", "verb", [g("tie the knot again", "re"), g("tie the knot ahead of time", "pre")]),
  w("unsafe", ["un", "safe"], "un", "not safe", "adjective", [g("safe again", "re"), g("completely safe", "base-only")]),
  w("unkind", ["un", "kind"], "un", "not kind", "adjective", [g("kind again", "re"), g("very kind", "base-only")]),
  w("unfair", ["un", "fair"], "un", "not fair", "adjective", [g("fair again", "re"), g("very fair", "base-only")]),
  w("refill", ["re", "fill"], "re", "fill it again", "verb", [g("empty it out", "un"), g("fill it ahead of time", "pre")]),
  w("reread", ["re", "read"], "re", "read it again", "verb", [g("not read it", "dis"), g("read it ahead of time", "pre")]),
  w("repaint", ["re", "paint"], "re", "paint it again", "verb", [g("take the paint off", "un"), g("paint it ahead of time", "pre")]),
  w("retell", ["re", "tell"], "re", "tell it again", "verb", [g("not tell it", "dis"), g("tell it ahead of time", "pre")]),
  w("rebuild", ["re", "build"], "re", "build it again", "verb", [g("take it apart", "un"), g("build it ahead of time", "pre")]),
  w("reheat", ["re", "heat"], "re", "heat it again", "verb", [g("cool it down", "un"), g("heat it ahead of time", "pre")]),
  w("dislike", ["dis", "like"], "dis", "not like it", "verb", [g("like it again", "re"), g("like it ahead of time", "pre")]),
  w("disagree", ["dis", "agree"], "dis", "not agree", "verb", [g("agree again", "re"), g("agree ahead of time", "pre")]),
  w("disobey", ["dis", "obey"], "dis", "not do what you are told", "verb", [g("obey again", "re"), g("obey ahead of time", "pre")]),
  w("dishonest", ["dis", "honest"], "dis", "not honest", "adjective", [g("honest again", "re"), g("very honest", "base-only")]),
  w("preheat", ["pre", "heat"], "pre", "heat it ahead of time", "verb", [g("heat it again", "re"), g("cool it down", "un")]),
  w("preview", ["pre", "view"], "pre", "see some of it before it starts", "verb", [g("see it again", "re"), g("not see it", "dis")]),
  w("prepay", ["pre", "pay"], "pre", "pay ahead of time", "verb", [g("pay again", "re"), g("not pay", "dis")]),
];

// ---------------------------------------------------------------- L1 suffixes -ful, -less, -er/-or, -able
export const SUFFIX_WORDS: readonly AffixWord[] = [
  w("careful", ["care", "ful"], "ful", "full of care", "adjective", [g("without care", "less"), g("a person who cares", "er")]),
  w("careless", ["care", "less"], "less", "without care", "adjective", [g("full of care", "ful"), g("a person who cares", "er")]),
  w("hopeful", ["hope", "ful"], "ful", "full of hope", "adjective", [g("without hope", "less"), g("a person who hopes", "er")]),
  w("hopeless", ["hope", "less"], "less", "without hope", "adjective", [g("full of hope", "ful"), g("a person who hopes", "er")]),
  w("helpful", ["help", "ful"], "ful", "giving lots of help", "adjective", [g("without any help", "less"), g("a person who helps", "er")]),
  w("helpless", ["help", "less"], "less", "not able to manage without help", "adjective", [g("giving lots of help", "ful"), g("a person who helps", "er")]),
  w("fearless", ["fear", "less"], "less", "without fear", "adjective", [g("full of fear", "ful"), g("able to be feared", "able")]),
  w("harmless", ["harm", "less"], "less", "causing no harm", "adjective", [g("causing lots of harm", "ful"), g("a person who harms", "er")]),
  w("restful", ["rest", "ful"], "ful", "calm and full of rest", "adjective", [g("without any rest", "less"), g("a person who rests", "er")]),
  w("thankful", ["thank", "ful"], "ful", "full of thanks", "adjective", [g("without thanks", "less"), g("a person who thanks", "er")]),
  w("teacher", ["teach", "er"], "er", "a person who teaches", "noun", [g("able to be taught", "able"), g("without teaching", "less")]),
  w("painter", ["paint", "er"], "er", "a person who paints", "noun", [g("able to be painted", "able"), g("without paint", "less")]),
  w("farmer", ["farm", "er"], "er", "a person who farms", "noun", [g("able to be farmed", "able"), g("without a farm", "less")]),
  w("builder", ["build", "er"], "er", "a person who builds", "noun", [g("able to be built", "able"), g("full of buildings", "ful")]),
  w("singer", ["sing", "er"], "er", "a person who sings", "noun", [g("able to be sung", "able"), g("without a song", "less")]),
  w("sailor", ["sail", "or"], "or", "a person who sails", "noun", [g("able to be sailed", "able"), g("without a sail", "less")]),
  w("actor", ["act", "or"], "or", "a person who acts in plays", "noun", [g("able to be acted", "able"), g("full of action", "ful")]),
  w("visitor", ["visit", "or"], "or", "a person who visits", "noun", [g("able to be visited", "able"), g("without visits", "less")]),
  w("washable", ["wash", "able"], "able", "able to be washed", "adjective", [g("a person who washes", "er"), g("without washing", "less")]),
  w("readable", ["read", "able"], "able", "able to be read", "adjective", [g("a person who reads", "er"), g("full of reading", "ful")]),
  w("breakable", ["break", "able"], "able", "able to be broken", "adjective", [g("a person who breaks things", "er"), g("never breaking", "less")]),
  w("drinkable", ["drink", "able"], "able", "safe to drink", "adjective", [g("a person who drinks", "er"), g("without a drink", "less")]),
];

/** Build-item decoy affixes for a target affix: never one with the same meaning (un/dis "not", er/or "a person who"). */
export const BUILD_DECOYS: Readonly<Record<string, readonly string[]>> = {
  un: ["re", "pre"], dis: ["re", "pre"], re: ["un", "pre"], pre: ["re", "un"],
  ful: ["less", "er"], less: ["ful", "er"], er: ["ful", "less", "able"], or: ["ful", "less", "able"], able: ["er", "less", "ful"],
};

// ---------------------------------------------------------------- L2 word class
export interface ClassWord {
  word: string;
  cls: WordClass;
  /** The ending that signals the class (shown on the hint card). */
  ending: string;
  /** A -ly word that is NOT an adverb (the named trap). */
  trap?: boolean;
  /** Class depends on use in a sentence (e.g. "fast", "kindly"): never used in a sort without a sentence. */
  classByUse?: boolean;
}
const c = (word: string, cls: WordClass, ending: string, extra: Partial<ClassWord> = {}): ClassWord => ({ word, cls, ending, ...extra });
export const CLASS_WORDS: readonly ClassWord[] = [
  c("kindness", "noun", "ness"), c("darkness", "noun", "ness"), c("softness", "noun", "ness"), c("fairness", "noun", "ness"),
  c("payment", "noun", "ment"), c("movement", "noun", "ment"), c("agreement", "noun", "ment"), c("enjoyment", "noun", "ment"),
  c("brighten", "verb", "en"), c("soften", "verb", "en"), c("darken", "verb", "en"), c("sharpen", "verb", "en"), c("tighten", "verb", "en"), c("shorten", "verb", "en"),
  c("hopeful", "adjective", "ful"), c("careless", "adjective", "less"), c("thankful", "adjective", "ful"), c("breakable", "adjective", "able"),
  c("fearless", "adjective", "less"), c("washable", "adjective", "able"),
  c("friendly", "adjective", "ly", { trap: true }), c("lovely", "adjective", "ly", { trap: true }), c("lonely", "adjective", "ly", { trap: true }),
  c("softly", "adverb", "ly"), c("quickly", "adverb", "ly"), c("loudly", "adverb", "ly"), c("slowly", "adverb", "ly"), c("bravely", "adverb", "ly"), c("gently", "adverb", "ly"),
  // listed so the rule is explicit and tested: these change class with use, so a sort never shows them
  c("kindly", "adverb", "ly", { classByUse: true }), c("fast", "adverb", "", { classByUse: true }), c("daily", "adverb", "ly", { classByUse: true }),
];
export const SORTABLE = CLASS_WORDS.filter((x) => !x.classByUse);

/** Frames for the second-miss frame test (docs §4): the class whose frame a word fits. */
export const FRAMES: Readonly<Record<WordClass, string>> = {
  noun: "The ___ is here.",
  verb: "I can ___ it.",
  adjective: "It is a ___ day.",
  adverb: "She sang ___.",
};

export interface FitItem {
  id: string;
  /** The sentence; "___" marks the gap. */
  text: string;
  answer: string;
  cls: WordClass;
  /** Same base, other classes. */
  distractors: readonly [Gloss, Gloss];
  /** One reasoning line for the worked model. */
  why: string;
}
const fit = (id: string, text: string, answer: string, cls: WordClass, d: [Gloss, Gloss], why: string): FitItem => ({ id, text, answer, cls, distractors: d, why });
/**
 * Adverb gaps sit BEFORE the verb, so a "flat adverb" (talk loud, go slow) can never be a second right answer
 * (ENGLISH_PATH R4). Adjective gaps take -ful/-ly adjectives against an -ly adverb and a -ness noun.
 */
export const FIT_ITEMS: readonly FitItem[] = [
  fit("eggs", "Omar ___ carried the eggs to the kitchen.", "carefully", "adverb", [g("careful", "adjective"), g("care", "noun")], "How did he carry them? A word that tells how is an adverb: carefully."),
  fit("kitten", "Mei ___ lifted the sleepy kitten.", "gently", "adverb", [g("gentle", "adjective"), g("gentleness", "noun")], "How did she lift it? A word that tells how is an adverb: gently."),
  fit("path", "Nia ___ climbed down the rocky path.", "bravely", "adverb", [g("brave", "adjective"), g("bravery", "noun")], "How did she climb? A word that tells how is an adverb: bravely."),
  fit("song", "The twins ___ sang the birthday song.", "happily", "adverb", [g("happy", "adjective"), g("happiness", "noun")], "How did they sing? A word that tells how is an adverb: happily."),
  fit("baby", "Lena ___ closed the door so the baby kept sleeping.", "softly", "adverb", [g("soft", "adjective"), g("softness", "noun")], "How did she close it? A word that tells how is an adverb: softly."),
  fit("bus", "Kofi ___ packed his bag before the bus came.", "quickly", "adverb", [g("quick", "adjective"), g("quickness", "noun")], "How did he pack? A word that tells how is an adverb: quickly."),
  fit("thanks", "Everyone thanked Zara for her ___.", "kindness", "noun", [g("kind", "adjective"), g("kindly", "adverb")], "Her what? After 'her' we need a thing, a noun: kindness."),
  fit("stars", "The ___ made the stars easy to see.", "darkness", "noun", [g("darken", "verb"), g("darkly", "adverb")], "The what? After 'the' we need a thing, a noun: darkness."),
  fit("bike", "Priya made the last ___ for her new bike.", "payment", "noun", [g("paid", "verb"), g("payable", "adjective")], "The last what? After 'the last' we need a thing, a noun: payment."),
  fit("hands", "The two teams shook hands to show their ___.", "agreement", "noun", [g("agree", "verb"), g("agreeable", "adjective")], "Their what? After 'their' we need a thing, a noun: agreement."),
  fit("puppets", "Jonah laughed with ___ at the puppet show.", "enjoyment", "noun", [g("enjoy", "verb"), g("enjoyable", "adjective")], "With what? After 'with' we need a thing, a noun: enjoyment."),
  fit("dance", "Every ___ in the dance matched the music.", "movement", "noun", [g("move", "verb"), g("movable", "adjective")], "Every what? After 'every' we need a thing, a noun: movement."),
  fit("sunrise", "The sunrise will ___ the whole sky.", "brighten", "verb", [g("bright", "adjective"), g("brightness", "noun")], "The sunrise will do what? After 'will' we need an action, a verb: brighten."),
  fit("butter", "Let the butter ___ before you mix it.", "soften", "verb", [g("soft", "adjective"), g("softness", "noun")], "Let the butter do what? An action word, a verb: soften."),
  fit("clouds", "Gray clouds began to ___ the sky.", "darken", "verb", [g("dark", "adjective"), g("darkness", "noun")], "Began to do what? After 'to' we need an action, a verb: darken."),
  fit("pencil", "Can you ___ my pencil, please?", "sharpen", "verb", [g("sharp", "adjective"), g("sharpness", "noun")], "Can you do what? An action word, a verb: sharpen."),
  fit("strap", "Ana pulled the strap to ___ it.", "tighten", "verb", [g("tight", "adjective"), g("tightness", "noun")], "To do what? After 'to' we need an action, a verb: tighten."),
  fit("beach", "It was a ___ afternoon at the beach.", "restful", "adjective", [g("restfully", "adverb"), g("restfulness", "noun")], "What kind of afternoon? A describing word, an adjective: restful."),
  fit("dog", "The ___ dog let Tomás pat its head.", "friendly", "adjective", [g("friendliness", "noun"), g("friend", "noun")], "What kind of dog? A describing word, an adjective, and friendly is one even though it ends in -ly."),
  fit("owl", "The ___ owl hooted from the tall pine.", "lonely", "adjective", [g("loneliness", "noun"), g("alone", "adverb")], "What kind of owl? A describing word, an adjective: lonely, even with -ly at the end."),
  fit("garden", "Aiyana planted a ___ row of tulips.", "lovely", "adjective", [g("loveliness", "noun"), g("love", "verb")], "What kind of row? A describing word, an adjective: lovely, even with -ly at the end."),
  fit("note", "Sami wrote a ___ note to his aunt.", "thankful", "adjective", [g("thankfully", "adverb"), g("thanks", "noun")], "What kind of note? A describing word, an adjective: thankful."),
];

// ---------------------------------------------------------------- L3 two affixes (build) and root families (choice)
export interface TwoAffixWord {
  word: string;
  parts: readonly string[];
  gloss: string;
  /** Decoy parts: affixes that would change the meaning. */
  decoys: readonly [string, string];
}
const t = (word: string, parts: string[], gloss: string, decoys: [string, string]): TwoAffixWord => ({ word, parts, gloss, decoys });
/** No spelling changes, and no word whose meaning depends on how the affixes attach (see AMBIGUOUS). */
export const TWO_AFFIX_WORDS: readonly TwoAffixWord[] = [
  t("unhelpful", ["un", "help", "ful"], "not giving any help", ["less", "re"]),
  t("unbreakable", ["un", "break", "able"], "not able to be broken", ["re", "er"]),
  t("unreadable", ["un", "read", "able"], "not able to be read", ["re", "er"]),
  t("unfairly", ["un", "fair", "ly"], "in a way that is not fair", ["re", "ness"]),
  t("unsafely", ["un", "safe", "ly"], "in a way that is not safe", ["re", "ness"]),
  t("unkindness", ["un", "kind", "ness"], "behavior that is not kind", ["re", "ly"]),
  t("unfairness", ["un", "fair", "ness"], "the state of being not fair", ["re", "ly"]),
  t("disagreement", ["dis", "agree", "ment"], "a time when people do not agree", ["re", "able"]),
  t("repayment", ["re", "pay", "ment"], "paying money back", ["pre", "able"]),
  t("carelessness", ["care", "less", "ness"], "the habit of acting without care", ["ful", "ly"]),
  t("helplessness", ["help", "less", "ness"], "the feeling of being without help", ["ful", "ly"]),
  t("hopelessly", ["hope", "less", "ly"], "in a way that is without hope", ["ful", "ness"]),
  t("carefully", ["care", "ful", "ly"], "in a way that is full of care", ["less", "ness"]),
  t("fearlessly", ["fear", "less", "ly"], "in a way that is without fear", ["ful", "ness"]),
  t("painlessly", ["pain", "less", "ly"], "in a way that causes no pain", ["ful", "ness"]),
  t("thankfulness", ["thank", "ful", "ness"], "the feeling of being full of thanks", ["less", "ly"]),
];
/** Words whose meaning depends on how the affixes attach (un-lockable vs unlock-able): never generated (docs §3, §9.4). */
export const AMBIGUOUS: readonly string[] = ["unlockable", "undoable", "untieable", "unpackable", "refillable", "unlovable"];

export interface FamilyItem {
  id: string;
  /** The known word and what it means (shown first). */
  known: string;
  knownMeaning: string;
  /** The related word the child works out. */
  target: string;
  /** Letters the two words share (highlighted on the first miss). */
  root: string;
  answer: string;
  /** A meaning of a look-alike or sibling word, and one more misconception. */
  distractors: readonly [Gloss, Gloss];
  why: string;
}
const f = (id: string, known: string, knownMeaning: string, target: string, root: string, answer: string, d: [Gloss, Gloss], why: string): FamilyItem =>
  ({ id, known, knownMeaning, target, root, answer, distractors: d, why });
export const FAMILY_ITEMS: readonly FamilyItem[] = [
  f("add", "add", "to put together", "additional", "add", "extra, added on", [g("taken away", "opposite"), g("added up wrong", "literal")], "add means put together, so additional means added on: extra."),
  f("create", "create", "to make something new", "creation", "creat", "something that has been made", [g("a person who makes things", "er"), g("able to think of new ideas", "look-alike")], "-ion turns create into a thing: something that has been made."),
  f("protect", "protect", "to keep safe", "protection", "protect", "something that keeps you safe", [g("a person who keeps others safe", "er"), g("being in danger", "opposite")], "-ion turns protect into a thing: something that keeps you safe."),
  f("decide", "decide", "to make up your mind", "decision", "deci", "a choice you have made", [g("a person who decides", "er"), g("not able to choose", "opposite")], "decide becomes decision, a thing: a choice you have made."),
  f("invent", "invent", "to make something new", "inventor", "invent", "a person who invents", [g("something that was invented", "look-alike"), g("full of new ideas", "ful")], "-or means a person who, so an inventor is a person who invents."),
  f("child", "child", "a young person", "childhood", "child", "the time when you are a child", [g("acting like a young child", "look-alike"), g("a group of children", "literal")], "-hood names a time of life: childhood is the time when you are a child."),
  f("friend", "friend", "someone you like and trust", "friendship", "friend", "the bond between friends", [g("acting like a friend", "look-alike"), g("without any friends", "less")], "-ship names a bond: friendship is the bond between friends."),
  f("heal", "heal", "to get better", "health", "heal", "how well your body is", [g("a person who heals others", "er"), g("able to be healed", "able")], "heal and health share a root: health is how well your body is."),
  f("explore", "explore", "to travel and discover", "explorer", "explor", "a person who explores", [g("a trip to discover places", "look-alike"), g("not yet discovered", "opposite")], "-er means a person who: an explorer is a person who explores."),
  f("collect", "collect", "to gather things", "collection", "collect", "a group of things gathered together", [g("a person who gathers things", "er"), g("able to be gathered", "able")], "-ion turns collect into a thing: a group of things gathered together."),
  f("celebrate", "celebrate", "to have fun for a special day", "celebration", "celebrat", "a party for a special day", [g("a very famous person", "look-alike"), g("a person who celebrates", "er")], "-ion turns celebrate into a thing: a party for a special day."),
  f("produce", "produce", "to make", "product", "produc", "something that is made", [g("a person who makes a show", "look-alike"), g("making a lot in a short time", "look-alike")], "produce means make, so a product is something that is made."),
  f("equal", "equal", "the same amount", "equally", "equal", "in the same amount for each", [g("not the same amount", "opposite"), g("the state of being the same", "ness")], "-ly tells how: equally means in the same amount for each."),
  f("imagine", "imagine", "to picture something in your mind", "imaginary", "imagin", "not real, only in your mind", [g("full of new ideas", "look-alike"), g("a photo you can hold", "literal")], "imaginary things live only in your mind, so they are not real."),
  f("compete", "compete", "to try to win", "competition", "compet", "a contest to see who wins", [g("very good at a job", "look-alike"), g("a person who tries to win", "er")], "-ion turns compete into a thing: a contest to see who wins."),
  f("sense", "sense", "good judgment", "sensible", "sens", "showing good judgment", [g("easily upset or hurt", "look-alike"), g("without any judgment", "less")], "sense means good judgment, so sensible means showing good judgment."),
  f("science", "science", "the study of how the world works", "scientist", "scien", "a person who works in science", [g("about science", "look-alike"), g("a book about science", "literal")], "-ist means a person who does something: a scientist works in science."),
  f("act", "act", "to do something", "action", "act", "something that you do", [g("a person who acts in plays", "look-alike"), g("able to be done", "able")], "-ion turns act into a thing: something that you do."),
];
