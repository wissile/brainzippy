import type { ContentPack } from "../../types";

/**
 * English path, band C (ages 9–11): Wordroot Grove with Sarah (host) and Gloop (helper).
 * Adds the vocabulary and grammar topics/skills of docs/curriculum/ENGLISH_PATH.md §2.3 to the existing `english`
 * library (declared in packs/library-english; phonics and sentence skills come from packs/english-paper-boat-post).
 * Spec: docs/worlds/wordroot-grove.md. Metadata only — game code and data load lazily.
 */
const pack: ContentPack = {
  id: "english-wordroot-grove",
  title: "English: Wordroot Grove (ages 9–11)",
  topics: [
    { id: "english.vocab", subject: "english", title: "Vocabulary", description: "Working out word meanings from word parts (prefixes, suffixes, Greek and Latin roots) and from context clues." },
    { id: "english.grammar", subject: "english", title: "Grammar and usage", description: "Word classes, apostrophes and commonly confused words, always chosen in a sentence." },
  ],
  skills: [
    { id: "english.vocab.affix", title: "Prefixes and suffixes", topic: "english.vocab", ages: [8, 10], prerequisites: ["english.phonics.multisyllable"], objective: "Work out a word's meaning from a known base plus prefixes and suffixes, and build a word for a meaning." },
    { id: "english.grammar.word-class", title: "Word classes", topic: "english.grammar", ages: [8, 10], prerequisites: ["english.vocab.affix"], objective: "Tell nouns, verbs, adjectives and adverbs apart by their suffix and their job in a sentence." },
    { id: "english.vocab.roots", title: "Greek and Latin roots", topic: "english.vocab", ages: [9, 11], prerequisites: ["english.vocab.affix"], objective: "Use Greek and Latin roots to work out what a word means." },
    { id: "english.vocab.context", title: "Context clues", topic: "english.vocab", ages: [9, 12], prerequisites: ["english.read.sentence"], objective: "Work out an unknown word's meaning from clues in one or more sentences." },
    { id: "english.grammar.apostrophe", title: "Apostrophes", topic: "english.grammar", ages: [8, 10], prerequisites: ["english.sentence.build"], objective: "Choose apostrophes for contractions and for singular and plural owners, and none for plain plurals." },
    { id: "english.grammar.confused-words", title: "Commonly confused words", topic: "english.grammar", ages: [9, 11], prerequisites: ["english.grammar.apostrophe"], objective: "Choose the right word of pairs and triples that sound alike (there/their/they're, to/too/two, your/you're, its/it's, than/then) in a sentence." },
  ],
  worlds: [
    {
      id: "wordroot-grove",
      subject: "english",
      topic: "english.vocab",
      skills: ["english.vocab.affix", "english.grammar.word-class", "english.vocab.roots", "english.vocab.context", "english.grammar.apostrophe", "english.grammar.confused-words"],
      ages: [9, 11],
      maxLevel: 9,
      title: "Wordroot Grove",
      gameType: "vocabulary and word-parts game",
      blurb: "Take words apart with Sarah and Gloop and put the smudged leaves back!",
      parentDescription:
        "Children work out what words mean from their parts and from the sentences around them. They match prefixes, suffixes and Greek and Latin roots to meanings and build words from parts, sort words into nouns, verbs, adjectives and adverbs, find the clues that explain a made-up word, and choose apostrophes and commonly confused words (their, there, they're) in sentences.",
      characters: ["sarah", "gloop"],
      load: () => import("../../../games/wordroot-grove/WordrootGrove"),
      loadDefinition: () => import("../../../games/wordroot-grove/definition").then((m) => m.wordrootGrove),
      voice: "src/games/wordroot-grove/voice.json",
    },
  ],
};

export default pack;
