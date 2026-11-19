import type { ContentPack } from "../../types";

/**
 * English library — first world: Hoot's Rhyme Lanterns (ages 3–5).
 * The `english` library is declared in packs/library-english; this pack adds the `english.phon` topic, which
 * later English worlds reuse without redefining it. Spec: docs/curriculum/english.md §2–3 (library id `ela`
 * there; the registry subject id is `english`, so skill ids are `english.<topic>.<skill>`).
 * Metadata only — game code and data load lazily.
 */
const pack: ContentPack = {
  id: "english-rhyme-lanterns",
  title: "English: Hoot's Rhyme Lanterns (ages 3–5)",
  topics: [
    { id: "english.phon", subject: "english", title: "Sounds in words", description: "Phonological awareness: hearing rhymes, syllables and first sounds in spoken words." },
  ],
  skills: [
    {
      id: "english.phon.rhyme",
      title: "Hearing rhymes",
      topic: "english.phon",
      ages: [3, 5],
      prerequisites: [],
      objective: "Tell whether two spoken words rhyme, pick a word that rhymes, spot the word that does not rhyme, and build a chain of rhyming words.",
    },
  ],
  worlds: [
    {
      id: "rhyme-lanterns",
      subject: "english",
      topic: "english.phon",
      skills: ["english.phon.rhyme"],
      ages: [3, 5],
      maxLevel: 7,
      title: "Hoot's Rhyme Lanterns",
      gameType: "rhyming game",
      blurb: "Light Hoot's lanterns by finding words that rhyme!",
      parentDescription:
        "Children listen to the names of pictures and match words that rhyme, like cat and hat, by moving picture lanterns. Levels grow from 'do these two rhyme?' to picking a rhyme among near-miss words, finding the word that does not rhyme, and building rhyme chains. No reading is needed: every picture is spoken.",
      characters: ["hoot", "zuzu"],
      load: () => import("../../../games/rhyme-lanterns/RhymeLanterns"),
      loadDefinition: () => import("../../../games/rhyme-lanterns/definition").then((m) => m.rhymeLanterns),
      voice: "src/games/rhyme-lanterns/voice.json",
    },
  ],
};

export default pack;
