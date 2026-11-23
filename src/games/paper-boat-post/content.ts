/**
 * Paper Boat Post — authored item banks per level (DATA only). Spec: docs/worlds/paper-boat-post.md §3.
 * Distractors carry no tags here: logic.ts classifies each one against the target (vowel swap, final swap,
 * dropped consonant, digraph swap…), and the hints key off that classification.
 */

// ---------------------------------------------------------------- L0: word families (onset swap)
/** Rime → pictured family words (all can be "from" or "to"). Other real family words are in REAL_WORDS. */
export const FAMILIES: Readonly<Record<string, readonly string[]>> = {
  at: ["cat", "hat", "bat", "rat", "mat"],
  an: ["fan", "van", "can", "pan"],
  ap: ["cap", "map"],
  ug: ["bug", "rug", "mug", "jug"],
  un: ["sun", "bun"],
  ub: ["tub", "cub"],
  op: ["mop", "top"],
  ot: ["pot", "dot"],
  og: ["dog", "log"],
  ig: ["pig", "wig"],
  in: ["pin", "fin", "bin"],
  et: ["jet", "net"],
  en: ["hen", "pen", "ten"],
};
/** Onsets a distractor tile may use (each has a keyword picture). */
export const SWAP_ONSETS = ["b", "c", "d", "f", "h", "j", "l", "m", "n", "p", "r", "s", "t", "v", "w"] as const;

// ---------------------------------------------------------------- L1–L3: CVC pictures
export const CVC: readonly string[] = [
  "cat", "hat", "bat", "rat", "mat", "fan", "van", "can", "pan", "cap", "map", "cab", "bag", "ham",
  "bug", "rug", "mug", "jug", "sun", "bun", "bus", "cup", "cub", "tub", "hut",
  "mop", "top", "pot", "dot", "dog", "log", "box", "fox",
  "pig", "wig", "pin", "fin", "bin", "fig", "bib", "jet", "net", "hen", "pen", "ten", "web", "leg", "bed",
];

// ---------------------------------------------------------------- L2: critter tags (printed pseudo-words)
/** [rhyme word (spoken), the critter's name (rhymes), vowel-swap decoy, vowel-swap decoy]. Never spoken. */
export const TAGS: readonly (readonly [string, string, string, string])[] = [
  ["cat", "zat", "zot", "zut"],
  ["bug", "zug", "zeg", "zog"],
  ["top", "zop", "zep", "zup"],
  ["can", "zan", "zon", "zun"],
  ["pot", "vot", "vit", "vut"],
  ["cap", "vap", "vop", "vup"],
  ["tub", "zub", "zab", "zib"],
  ["sun", "zun", "zan", "zin"],
  ["jet", "zet", "zat", "zot"],
];

// ---------------------------------------------------------------- L4–L8 reading sets: [target, decoy, decoy]
export const READ_SETS: Readonly<Record<number, readonly (readonly [string, string, string])[]>> = {
  4: [
    ["chip", "ship", "chin"], ["ship", "chip", "shop"], ["shop", "ship", "chip"], ["chin", "chip", "chick"], ["chick", "chin", "chip"],
    ["fish", "dish", "fin"], ["dish", "fish", "duck"], ["shed", "bed", "shell"], ["shell", "shed", "bell"], ["bath", "bat", "path"],
    ["path", "bath", "pan"], ["duck", "dock", "sock"], ["sock", "rock", "duck"], ["rock", "sock", "dock"], ["dock", "duck", "sock"], ["moth", "mop", "mat"],
  ],
  5: [
    ["frog", "fog", "log"], ["crab", "cab", "crib"], ["crib", "crab", "bib"], ["nest", "net", "vest"], ["vest", "nest", "net"], ["plum", "plug", "drum"],
    ["plug", "plum", "slug"], ["slug", "plug", "bug"], ["drum", "plum", "mug"], ["twig", "wig", "pig"], ["belt", "bell", "bat"], ["tent", "ten", "net"],
  ],
  6: [
    ["cape", "cap", "cake"], ["cube", "cub", "tube"], ["tube", "tub", "cube"], ["cane", "can", "cone"], ["cone", "cane", "bone"], ["bone", "cone", "bun"],
    ["kite", "bike", "kitten"], ["rope", "rose", "cone"], ["rose", "nose", "rope"], ["nose", "rose", "bone"], ["cake", "cape", "lake"],
    ["lake", "cake", "snake"], ["plate", "plane", "plum"], ["plane", "plate", "pan"], ["snake", "lake", "snail"],
  ],
  7: [
    ["sheep", "ship", "shop"], ["leaf", "loaf", "leg"], ["loaf", "leaf", "log"], ["coat", "cat", "goat"], ["goat", "coat", "boat"], ["boat", "bat", "coat"],
    ["seal", "sail", "seed"], ["sail", "seal", "nail"], ["nail", "sail", "tail"], ["rain", "train", "sail"], ["train", "rain", "tray"], ["tray", "train", "tree"],
    ["tree", "tray", "bee"], ["bee", "bed", "tree"], ["peach", "beach", "sheep"], ["beach", "peach", "bee"], ["toad", "road", "coat"],
    ["road", "toad", "rock"], ["soap", "rope", "sock"], ["hay", "hat", "tray"],
  ],
  8: [
    ["napkin", "pumpkin", "picnic"], ["pumpkin", "napkin", "puppet"], ["picnic", "napkin", "pumpkin"], ["puppet", "pumpkin", "picnic"],
    ["kitten", "mitten", "magnet"], ["mitten", "kitten", "muffin"], ["muffin", "mitten", "napkin"], ["magnet", "basket", "mitten"],
    ["basket", "magnet", "rabbit"], ["rabbit", "robot", "basket"], ["cactus", "catfish", "basket"],
  ],
};

// ---------------------------------------------------------------- L4–L6 word lists: every word is both read (READ_SETS) and built
// (L3 uses the CVC words with near misses, generator NEAR_TARGETS)
export const BUILD_WORDS: Readonly<Record<number, readonly string[]>> = {
  4: ["chip", "ship", "shop", "chin", "chick", "fish", "dish", "shed", "shell", "bath", "path", "duck", "sock", "rock", "dock", "moth"],
  5: ["frog", "crab", "crib", "nest", "vest", "plum", "plug", "slug", "drum", "twig", "belt", "tent"],
  6: ["cape", "cube", "tube", "cane", "cone", "bone", "kite", "rope", "rose", "nose", "cake", "lake", "plate", "plane", "snake"],
};

// ---------------------------------------------------------------- L7 sort: same sound, different spelling
export const SORTS: readonly { a: string; b: string; aWords: readonly string[]; bWords: readonly string[] }[] = [
  { a: "ee", b: "ea", aWords: ["bee", "tree", "sheep", "feet", "seed"], bWords: ["leaf", "seal", "peach", "beach"] },
  { a: "ai", b: "ay", aWords: ["rain", "tail", "snail", "sail", "nail", "train"], bWords: ["hay", "tray"] },
  { a: "oa", b: "o_e", aWords: ["boat", "coat", "goat", "toad", "soap", "road"], bWords: ["bone", "rope", "rose", "nose", "cone"] },
];

// ---------------------------------------------------------------- L8 plurals and compounds
/** Plural → [singular, look-alike singular]. Plural pictures show three of the thing. */
export const PLURALS: Readonly<Record<string, readonly [string, string]>> = {
  cats: ["cat", "hat"], hats: ["hat", "cat"], dogs: ["dog", "log"], logs: ["log", "dog"], bugs: ["bug", "rug"], rugs: ["rug", "bug"],
  pigs: ["pig", "wig"], wigs: ["wig", "pig"], foxes: ["fox", "box"], boxes: ["box", "fox"], buses: ["bus", "bun"], dishes: ["dish", "fish"],
};
/** Compound → [first card, second card, decoy card, decoy card]. No other ordered pair of cards is a compound here. */
export const COMPOUNDS: Readonly<Record<string, readonly [string, string, string, string]>> = {
  cupcake: ["cup", "cake", "tub", "fish"],
  pancake: ["pan", "cake", "box", "coat"],
  backpack: ["back", "pack", "cake", "tub"],
  sandbox: ["sand", "box", "boat", "cup"],
  raincoat: ["rain", "coat", "boat", "cup"],
  sailboat: ["sail", "boat", "coat", "fish"],
  mailbox: ["mail", "box", "tub", "cake"],
  bathtub: ["bath", "tub", "box", "coat"],
  catfish: ["cat", "fish", "tub", "coat"],
};

// ---------------------------------------------------------------- L9 notes (authored sentences)
/** A picture scene: who · where (in / on) or has · what. Names (Bobbo, Zuzu) draw the Critter Crew. */
export interface Scene { who: string; rel: "in" | "on" | "has"; what: string }
export const sceneId = (s: Scene) => `${s.who}-${s.rel}-${s.what}`;
export function parseScene(id: string): Scene {
  const [who, rel, what] = id.split("-") as [string, Scene["rel"], string];
  return { who, rel, what };
}

/** Read notes: "sentence | right scene | decoy scene | decoy scene" (each decoy differs by one word). */
const READ_NOTES = [
  "The hen is in the box.|hen in box|hen on box|fox in box",
  "The cat is on the bed.|cat on bed|cat in bed|rat on bed",
  "The dog is on the rug.|dog on rug|dog on bed|frog on rug",
  "A fox is in the bag.|fox in bag|fox on bag|fox in tub",
  "Zuzu is on the bus.|zuzu on bus|zuzu on van|bobbo on bus",
  "Bobbo is in the tub.|bobbo in tub|bobbo on tub|bobbo in box",
  "The bug is in a cup.|bug in cup|bug on cup|pig in cup",
  "The frog is on a log.|frog on log|frog on box|dog on log",
  "The goat is in the boat.|goat in boat|goat in box|goat in tub",
  "A duck is on the sled.|duck on sled|duck on rug|dog on sled",
  "The cat has a hat.|cat has hat|cat has bag|rat has hat",
  "The pig has a bag.|pig has bag|pig has bug|pig in bag",
  "My cat is in the bag.|cat in bag|cat on bag|cat in box",
  "The hen was on the log.|hen on log|hen on rug|fox on log",
  "A rat is on the hat.|rat on hat|rat on rug|cat on hat",
  "The dog has a bone.|dog has bone|dog has bun|frog has bone",
  "Zuzu has a drum.|zuzu has drum|zuzu has plum|bobbo has drum",
  "Bobbo has a kite.|bobbo has kite|bobbo has bike|zuzu has kite",
  "The bug is on the cake.|bug on cake|bug on cup|slug on cake",
  "The duck is in the tub.|duck in tub|duck in box|frog in tub",
  "A goat is on the rock.|goat on rock|goat on log|coat on rock",
  "The fox is in the box.|fox in box|fox on box|fox in bag",
  "The pig is in the tub.|pig in tub|pig on tub|wig in tub",
  "The frog is in the jug.|frog in jug|frog in cup|dog in jug",
  "Bobbo is on the bed.|bobbo on bed|bobbo in bed|zuzu on bed",
];

/** Build notes: "word cards (space-separated, end mark last) | scene | extra card". Exactly one valid order (§3.3). */
const BUILD_NOTES = [
  "The bug is on a rug .|bug on rug|cat",
  "The cat is in the box .|cat in box|fox",
  "Bobbo is in the tub .|bobbo in tub|bobbo",
  "Zuzu is on the bus .|zuzu on bus|zuzu",
  "The hen is on the bed .|hen on bed|pen",
  "A pig is in the bag .|pig in bag|wig",
  "The dog has a bone .|dog has bone|log",
  "Is the cat in the box ?|cat in box|.",
  "Is the frog on the log ?|frog on log|.",
  "The fox has a hat .|fox has hat|box",
  "The duck is on a sled .|duck on sled|dock",
  "A goat is in the boat .|goat in boat|coat",
  "The rat is on the hat .|rat on hat|cat",
  "Zuzu has a kite .|zuzu has kite|zuzu",
  "Bobbo has a drum .|bobbo has drum|bobbo",
  "The bug is in the cup .|bug in cup|jug",
  "Is Zuzu in the tub ?|zuzu in tub|zuzu",
  "The pig has a bag .|pig has bag|bug",
  "My dog is on the rug .|dog on rug|frog",
  "The hen was in the box .|hen in box|fox",
  "A frog is on the rock .|frog on rock|sock",
  "The cat has a cap .|cat has cap|map",
  "Bobbo is on the bus .|bobbo on bus|bobbo",
  "The goat is on the log .|goat on log|boat",
  "Is the duck in the tub ?|duck in tub|.",
];

const scene = (s: string): Scene => {
  const [who, rel, what] = s.trim().split(" ") as [string, Scene["rel"], string];
  return { who, rel, what };
};

export interface ReadNote { id: string; text: string; words: readonly string[]; scene: Scene; decoys: readonly [Scene, Scene] }
export interface BuildNote {
  id: string;
  /** Word cards in the one valid order (end mark last). */
  cards: readonly string[];
  scene: Scene;
  extra: string;
  /** Other valid orders of these cards that match the picture. Authored and reviewed: always empty (§3.3). */
  alternatives: readonly (readonly string[])[];
}

export const NOTES_READ: readonly ReadNote[] = READ_NOTES.map((row, i) => {
  const [text, a, b, c] = row.split("|") as [string, string, string, string];
  return { id: `r${String(i + 1).padStart(2, "0")}`, text, words: text.replace(/[.?]$/, "").split(" "), scene: scene(a), decoys: [scene(b), scene(c)] };
});
export const NOTES_BUILD: readonly BuildNote[] = BUILD_NOTES.map((row, i) => {
  const [cards, s, extra] = row.split("|") as [string, string, string];
  return { id: `b${String(i + 1).padStart(2, "0")}`, cards: cards.split(" "), scene: scene(s), extra, alternatives: [] };
});
/** The note as it is read aloud / shown: "The bug is on a rug." */
export const buildText = (n: BuildNote) => n.cards.join(" ").replace(/ ([.?])$/, "$1");

/** Pictures a 6-year-old could name the same way or not tell apart: never offered together (QA review). */
export const CONFUSABLE: readonly (readonly [string, string])[] = [["cup", "mug"], ["mat", "rug"], ["dot", "pin"], ["pot", "pan"], ["hat", "cap"], ["tube", "pen"], ["hut", "house"]];
export const confusable = (a: string, b: string) => CONFUSABLE.some(([x, y]) => (a === x && b === y) || (a === y && b === x));

/** Tricky words (RF.1.3.G): dotted underline, tap to hear (not "assisted"). */
export const TRICKY = ["the", "a", "is", "to", "i", "was", "said", "he", "she", "we", "my", "you"] as const;
export const NAMES = ["Bobbo", "Zuzu"] as const;
/** Pictured who/what words a scene may use. */
export const isTricky = (w: string) => (TRICKY as readonly string[]).includes(w.toLowerCase());
