import type { ContentPack } from "../../types";

/**
 * English path, band D (ages 12–14): The Lantern Press with Sarah (editor, host) and Hoot (fact-checker, helper).
 * Adds the band-D topics and skills of docs/curriculum/ENGLISH_PATH.md §2.4 to the existing `english` library
 * (declared in packs/library-english; the vocab and grammar topics come from packs/english-wordroot-grove).
 * Spec: docs/worlds/lantern-press.md. Metadata only — game code and data load lazily.
 */
const pack: ContentPack = {
  id: "english-lantern-press",
  title: "English: The Lantern Press (ages 12–14)",
  topics: [
    { id: "english.style", subject: "english", title: "Style", description: "Writing that says exactly what the writer means: concise wording and active or passive voice chosen for an effect." },
    { id: "english.argue", subject: "english", title: "Claims and evidence", description: "Telling claims from evidence and reasoning, and judging whether evidence is relevant and sufficient." },
  ],
  skills: [
    { id: "english.grammar.combine", title: "Combining sentences", topic: "english.grammar", ages: [11, 14], prerequisites: ["english.grammar.word-class"], objective: "Combine short sentences with the connective that signals the intended relationship, without comma splices or run-ons." },
    { id: "english.grammar.modifier", title: "Misplaced modifiers", topic: "english.grammar", ages: [12, 14], prerequisites: ["english.grammar.combine"], objective: "Find and fix misplaced and dangling modifiers." },
    { id: "english.grammar.pronoun-ref", title: "Clear pronouns", topic: "english.grammar", ages: [11, 13], prerequisites: ["english.grammar.combine"], objective: "Find vague pronouns and choose a rewrite that makes clear who or what each one means." },
    { id: "english.style.concise", title: "Concise wording", topic: "english.style", ages: [12, 14], prerequisites: ["english.grammar.combine"], objective: "Remove redundancy and wordiness without losing any meaning." },
    { id: "english.vocab.connotation", title: "Connotation", topic: "english.vocab", ages: [11, 14], prerequisites: ["english.vocab.context"], objective: "Choose between words with the same meaning by the feeling they carry, to fit a writer's purpose." },
    { id: "english.vocab.figurative", title: "Figurative language", topic: "english.vocab", ages: [10, 14], prerequisites: ["english.vocab.context"], objective: "Identify and interpret simile, metaphor, personification, hyperbole, idiom, verbal irony and puns in context." },
    { id: "english.style.voice", title: "Active and passive voice", topic: "english.style", ages: [12, 14], prerequisites: ["english.grammar.combine"], objective: "Choose active or passive voice for an effect, and fix inappropriate shifts between them." },
    { id: "english.argue.claim-evidence", title: "Claims and evidence", topic: "english.argue", ages: [12, 14], prerequisites: ["english.vocab.context"], objective: "Tell claims from evidence and reasoning in a short article." },
    { id: "english.argue.evaluate", title: "Evaluating evidence", topic: "english.argue", ages: [12, 14], prerequisites: ["english.argue.claim-evidence"], objective: "Judge whether evidence is relevant and sufficient, and spot irrelevant evidence and opinion offered as fact." },
  ],
  worlds: [
    {
      id: "lantern-press",
      subject: "english",
      topic: "english.grammar",
      skills: ["english.grammar.combine", "english.vocab.figurative", "english.grammar.modifier", "english.grammar.pronoun-ref", "english.style.concise", "english.vocab.connotation", "english.style.voice", "english.argue.claim-evidence", "english.argue.evaluate"],
      ages: [12, 14],
      maxLevel: 9,
      title: "The Lantern Press",
      gameType: "writing and editing game",
      blurb: "Edit the island's evening paper with Sarah and Hoot, one sentence at a time.",
      parentDescription:
        "Young teens act as copy editor of a fictional island newspaper. They choose the connective or combined sentence that says what the writer means, fix misplaced modifiers and unclear pronouns, cut repeated words, pick words by their connotation, interpret figurative language including irony and puns, choose active or passive voice for a purpose, and tell claims from evidence and judge whether the evidence is relevant and enough.",
      characters: ["sarah", "hoot"],
      load: () => import("../../../games/lantern-press/LanternPress"),
      loadDefinition: () => import("../../../games/lantern-press/definition").then((m) => m.lanternPress),
      voice: "src/games/lantern-press/voice.json",
    },
  ],
};

export default pack;
