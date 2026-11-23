import type { ContentPack } from "../../types";

/**
 * English path, band B (ages 6–8): Paper Boat Post with Sarah (host) and Zuzu (helper).
 * Adds the phonics, reading and sentence topics/skills of docs/curriculum/ENGLISH_PATH.md §2.2 to the existing
 * `english` library (declared in packs/library-english; `english.phon` comes from packs/english-rhyme-lanterns).
 * Spec: docs/worlds/paper-boat-post.md. Metadata only — game code and data load lazily.
 */
const pack: ContentPack = {
  id: "english-paper-boat-post",
  title: "English: Paper Boat Post (ages 6–8)",
  topics: [
    { id: "english.phonics", subject: "english", title: "Phonics", description: "Decoding and spelling: word families, short vowels, digraphs, blends, final -e, vowel teams and longer words." },
    { id: "english.read", subject: "english", title: "Reading sentences", description: "Reading short decodable sentences for meaning." },
    { id: "english.sentence", subject: "english", title: "Building sentences", description: "Ordering words into a sentence with a capital letter and an end mark." },
  ],
  skills: [
    { id: "english.phonics.onset-rime", title: "Word families", topic: "english.phonics", ages: [5, 6], prerequisites: ["english.phon.rhyme"], objective: "Change the first letter of a word-family word to make a named word (cat → hat)." },
    { id: "english.phonics.cvc", title: "Short-vowel words", topic: "english.phonics", ages: [5, 7], prerequisites: ["english.phonics.onset-rime"], objective: "Read and spell consonant-vowel-consonant words and tell them from words one letter away." },
    { id: "english.phonics.digraph", title: "Digraphs", topic: "english.phonics", ages: [6, 7], prerequisites: ["english.phonics.cvc"], objective: "Read and spell words with sh, ch, th and ck, two letters that make one sound." },
    { id: "english.phonics.blend", title: "Blends", topic: "english.phonics", ages: [6, 7], prerequisites: ["english.phonics.cvc"], objective: "Read and spell words that start or end with two consonant sounds, such as frog and nest." },
    { id: "english.phonics.magic-e", title: "Final -e", topic: "english.phonics", ages: [6, 8], prerequisites: ["english.phonics.cvc"], objective: "Read words with a quiet final e and tell them from their short-vowel partner (cap, cape)." },
    { id: "english.phonics.vowel-team", title: "Vowel teams", topic: "english.phonics", ages: [7, 8], prerequisites: ["english.phonics.magic-e"], objective: "Read and sort words spelled with ai, ay, ee, ea and oa." },
    { id: "english.phonics.multisyllable", title: "Longer words", topic: "english.phonics", ages: [6, 8], prerequisites: ["english.phonics.digraph", "english.phonics.blend"], objective: "Read two-syllable words and plurals, and build compound words from two smaller words." },
    { id: "english.read.sentence", title: "Reading a sentence", topic: "english.read", ages: [6, 8], prerequisites: ["english.phonics.cvc"], objective: "Read a short decodable sentence and choose the picture it describes." },
    { id: "english.sentence.build", title: "Building a sentence", topic: "english.sentence", ages: [6, 8], prerequisites: [], objective: "Put word cards in order to make a sentence with a capital letter and an end mark." },
  ],
  worlds: [
    {
      id: "paper-boat-post",
      subject: "english",
      topic: "english.phonics",
      skills: [
        "english.phonics.onset-rime", "english.phonics.cvc", "english.phonics.digraph", "english.phonics.blend", "english.phonics.magic-e",
        "english.phonics.vowel-team", "english.phonics.multisyllable", "english.read.sentence", "english.sentence.build",
      ],
      ages: [6, 8],
      maxLevel: 9,
      title: "Paper Boat Post",
      gameType: "phonics and reading game",
      blurb: "Read the words on Sarah's paper boats and send each one home!",
      parentDescription:
        "Children read the word printed on a paper boat's sail and send the boat to the matching picture, or hear a word and build it from letter tiles. Levels grow from changing the first letter of a word (cat to hat) through short-vowel words, sh/ch/th, blends, final -e and vowel teams to two-syllable words and short sentences. The word on the boat is never read aloud before your child answers.",
      characters: ["sarah", "zuzu"],
      load: () => import("../../../games/paper-boat-post/PaperBoatPost"),
      loadDefinition: () => import("../../../games/paper-boat-post/definition").then((m) => m.paperBoatPost),
      voice: "src/games/paper-boat-post/voice.json",
    },
  ],
};

export default pack;
