import { APOSTROPHE_SENTENCES, CONFUSED_ITEMS, type GapItem } from "./grammar";
import { passageLine, partLine, sentenceLine, spellLine, wordLine } from "./logic";
import { AFFIX, CLASS_WORDS, FAMILY_ITEMS, FIT_ITEMS, PREFIX_WORDS, SUFFIX_WORDS, TWO_AFFIX_WORDS } from "./morphology";
import { ALL_PASSAGES, passageText } from "./passages";
import { GREEK_WORDS, ROOTS, ROOT_CONTEXT, WORD_FOR } from "./roots";

/**
 * Wordroot Grove — the source of src/games/wordroot-grove/voice.json (prefix `wg.`). Not bundled: the game reads
 * voice.json; tests/unit/wordroot-grove.test.ts checks that voice.json holds exactly these lines, so content and
 * clips can't drift. Regenerate voice.json from this module after editing a bank (see docs §12), then render only
 * the new clips: python3 scripts/gen_voice.py --model-dir <kokoro> --only wg.
 * Speakers: sarah (host), gloop (helper), narrator (story beats and read-aloud of item text).
 */
export interface Line { text: string; speaker?: "sarah" | "gloop"; vary?: Record<string, string[]> }
const S = (text: string): Line => ({ text, speaker: "sarah" });
const G = (text: string): Line => ({ text, speaker: "gloop" });
const N = (text: string): Line => ({ text });

const BUILD_GLOSSES = [...PREFIX_WORDS, ...SUFFIX_WORDS, ...TWO_AFFIX_WORDS].map((w) => w.gloss);

export const STATIC_LINES: Readonly<Record<string, Line>> = {
  // story (cinematic beats: narrator) and conversations (DialogueScene)
  "wg.story.storm": N("Last night, a gentle storm blew through Wordroot Grove."),
  "wg.story.open": N("By evening, every leaf in the Leaf Library had its label back."),
  "wg.dlg.in.1": S("Welcome to Wordroot Grove. Every tree here grows words."),
  "wg.dlg.in.2": G("Roots hold the meaning. Branches add beginnings and endings!"),
  "wg.dlg.in.3": S("Last night's storm shook leaves loose and smudged their labels."),
  "wg.dlg.in.4": G("I can stretch a word apart, so we can see its parts."),
  "wg.dlg.in.5": S("Gloop and I need a word detective. Shall we start?"),
  "wg.dlg.handover.1": S("This is Gloop. Gloop can stretch into any shape at all."),
  "wg.dlg.handover.2": G("Even a magnifying glass. Watch!"),
  "wg.dlg.out.1": S("The Leaf Library is open again!"),
  "wg.dlg.out.2": G("You took words apart and used each part's meaning."),
  "wg.dlg.out.3": S("Here's your Root Reader badge."),
  "wg.intro": S("Welcome to the Leaf Library. Will you help me relabel the leaves?"),
  "wg.back": S("Welcome back. More smudged leaves are waiting for a word detective."),
  "wg.mid.1": S("Two leaves back on their branches."),
  "wg.mid.2": S("Half the grove is labeled again."),
  "wg.mid.3": S("Nearly done. Check every part of each word."),
  "wg.idle": S("Take your time. Read it again and look for parts or clues."),
  // prompts (every instruction is spoken and captioned)
  "wg.prompt.meaning": S("What does this word mean?"),
  "wg.prompt.build": { text: "Build a word that means {gloss}.", speaker: "sarah", vary: { gloss: BUILD_GLOSSES } },
  "wg.prompt.sort": S("Sort the words by their job."),
  "wg.prompt.fit": S("Which word fits the sentence?"),
  "wg.prompt.family": S("Use the word you know. What does the new word mean?"),
  "wg.prompt.rootmatch": S("Match each root to its meaning."),
  "wg.prompt.rootmeaning": S("Use the roots. What does this word mean?"),
  "wg.prompt.wordfor": { text: "Which word means {meaning}?", speaker: "sarah", vary: { meaning: WORD_FOR.map((x) => x.meaning) } },
  "wg.prompt.rootcontext": S("Use the root's meaning to answer the question."),
  "wg.prompt.clue": S("Use the clues. What does the mystery word mean?"),
  "wg.prompt.tap.one": S("Tap the clue, then press Grow."),
  "wg.prompt.tap.two": S("Tap both clues, then press Grow."),
  "wg.prompt.owner": S("Which words match the picture?"),
  "wg.prompt.apostrophe": S("Which one is written correctly?"),
  "wg.prompt.confused": S("Which one fits the sentence?"),
  // round start (Gloop explains the concept)
  "wg.help.prefix": G("Big words are made of smaller parts. Look at the beginning first."),
  "wg.help.suffix": G("Big words are made of smaller parts. This time, check the ending."),
  "wg.help.parts": G("Find the base word first, then its beginning and its ending."),
  "wg.help.class": G("A word's job tells you its class. Endings give clues too."),
  "wg.help.greek": G("Many science words grow from Greek roots. Each root has a meaning."),
  "wg.help.latin": G("Lots of words grow from Latin roots. Find the root, then use its meaning."),
  "wg.help.context": G("The words around a mystery word often explain it."),
  "wg.help.apostrophe": G("Ask: who owns it? Or is it two words squeezed together?"),
  "wg.help.confused": G("These words sound alike but mean different things. Test each one."),
  // first miss (Gloop; keyed by the misconception)
  "wg.hint.prefix": G("Check the beginning. Which prefix is really there, and what does it mean?"),
  "wg.hint.suffix": G("Check the ending. Which suffix is really there, and what does it add?"),
  "wg.hint.base": G("Don't skip the first part. It changes what the base word means."),
  "wg.hint.build": G("Check each part's meaning. Does it match the meaning you need?"),
  "wg.hint.build2": G("Find the base word first. Then add a beginning and an ending, in order."),
  "wg.hint.family": G("Find the word you know inside the new word. Then check what its ending adds."),
  "wg.hint.sort.noun": G("Endings like -ness and -ment often make a noun. Does it name a thing?"),
  "wg.hint.sort.verb": G("The ending -en often makes a verb. Is it something you can do?"),
  "wg.hint.sort.adjective": G("Endings like -ful, -less and -able often make an adjective. Does it describe?"),
  "wg.hint.sort.adverb": G("The ending -ly often makes an adverb. Does it tell how?"),
  "wg.hint.sort.trap": G("Careful: not every -ly word is an adverb. In a costly gift, costly describes."),
  "wg.hint.fit.noun": G("The gap needs a thing. Which word names a thing?"),
  "wg.hint.fit.verb": G("The gap needs an action. Which word is something you can do?"),
  "wg.hint.fit.adjective": G("The gap describes something. Which word describes?"),
  "wg.hint.fit.adverb": G("The gap tells how something was done. Which word tells how?"),
  "wg.hint.rootmatch": G("Think of a word you know with that root. What does the root do there?"),
  "wg.hint.roots": G("Put the meanings of the roots together, in order."),
  "wg.hint.literal": G("That one just looks like the word. Use the roots and their meanings."),
  "wg.hint.wordfor": G("Find the root in each word. Which root means what you need?"),
  "wg.hint.rootcontext": G("Use the root's meaning in the sentence. What would that make happen?"),
  "wg.hint.clue.definition": G("Words right after a comma, or after is, often explain the mystery word."),
  "wg.hint.clue.synonym": G("Or can give another name for the mystery word."),
  "wg.hint.clue.example": G("Such as and like give examples. What do the examples have in common?"),
  "wg.hint.clue.restatement": G("In other words, that is, and which means say it again more simply."),
  "wg.hint.clue.cause": G("Because and so link what happened to why. What would cause that?"),
  "wg.hint.clue.contrast": G("But, unlike, although, however and while signal an opposite."),
  "wg.hint.clue.multi": G("The other sentences show what the word is like. What do they point to?"),
  "wg.hint.owners": G("Count the owners. One owner, or more than one?"),
  "wg.hint.own": G("The things belong to someone. That needs an apostrophe."),
  "wg.hint.its": G("Try it is in the gap. If it works, use it's. If not, its."),
  "wg.hint.plural": G("Does anything belong to them, or is it just more than one?"),
  "wg.hint.irregular": G("This plural has no s at the end. Add apostrophe s to show the owners."),
  "wg.hint.contraction": G("Which letters are missing? The apostrophe goes in their place."),
  "wg.hint.they": G("Try they are in the gap. Does it still make sense?"),
  "wg.hint.to": G("Is it a number? Does it mean also, or too much? Or does it point somewhere?"),
  "wg.hint.you": G("Try you are in the gap. Does it still make sense?"),
  "wg.hint.than": G("Are you comparing two things, or telling what came next?"),
  "wg.hint.test": G("Try each word in the sentence and read it again."),
  // second miss (Sarah models; the board shows the worked chain)
  "wg.hint.show": S("Let's work it out together, step by step."),
  "wg.hint.model": S("Now you finish it. The answer is glowing."),
  "wg.retry.1": S("Not yet. Let's look at the parts."),
  // praise (process, never ability)
  "wg.praise.1": S("You split the word into parts and used each meaning."),
  "wg.praise.2": S("You checked the word's job in the sentence."),
  "wg.praise.3": S("You found the clues in the other sentences."),
  "wg.praise.4": S("You noticed the signal word and flipped the meaning."),
  "wg.praise.5": S("You counted the owners before placing the apostrophe."),
  "wg.praise.6": S("You tested it with they are. Good checking."),
  "wg.praise.you": S("You tested it with you are. Good checking."),
  "wg.praise.it": S("You tested it with it is. Good checking."),
  "wg.praise.test": S("You tried each word in the sentence. Good checking."),
  "wg.praise.family": S("You found the word you know inside the new one."),
  "wg.praise.roots": S("You used the root's meaning to work it out."),
  "wg.praise.clue": S("You found the clue and used it."),
  "wg.praise.plural": S("You checked that nothing belongs to them, so no apostrophe."),
  "wg.praise.squeeze": S("You checked which letters were squeezed out."),
};

const PART_TEXT: Readonly<Record<string, string>> = {
  un: "un means not, or undo.", re: "re means again.", dis: "dis means not, or the opposite.", pre: "pre means before.",
  ful: "ful means full of.", less: "less means without.", er: "er means a person who does something.", or: "or means a person who does something.",
  able: "able means able to be.", ness: "ness turns a word into a thing, a noun.", ment: "ment turns an action into a thing, a noun.",
  en: "en means to make. It makes a verb.", ly: "ly often means in a way. It often makes an adverb.",
};
const spoken = (text: string) => {
  const t = text.replace(/\*/g, "").replace(/___/g, "blank");
  return t[0]!.toUpperCase() + t.slice(1);
};
const gapLines = (mode: "apostrophe" | "confused", items: readonly GapItem[]) => items.map((x) => [sentenceLine(mode, x.id), N(spoken(x.text))] as [string, Line]);

/** Read-aloud of item text (narrator), part-meaning cards (Gloop) and invented-word spellings, from the banks. */
export function itemLines(): Record<string, Line> {
  const out: [string, Line][] = [
    ...Object.keys(AFFIX).map((id) => [partLine(id), G(PART_TEXT[id]!)] as [string, Line]),
    ...ROOTS.map((r) => [partLine(r.id), G(`${r.id === "scrib" ? "scrib or script" : r.id} means ${r.meaning}.`)] as [string, Line]),
    ...[...PREFIX_WORDS, ...SUFFIX_WORDS, ...GREEK_WORDS].map((w) => [wordLine(w.word), N(w.word)] as [string, Line]),
    ...CLASS_WORDS.filter((w) => !w.classByUse).map((w) => [wordLine(w.word), N(w.word)] as [string, Line]),
    ...FIT_ITEMS.map((x) => [sentenceLine("fit", x.id), N(spoken(x.text))] as [string, Line]),
    ...FAMILY_ITEMS.map((x) => [sentenceLine("family", x.id), N(`To ${x.known} means ${x.knownMeaning}. What does ${x.target} mean?`)] as [string, Line]),
    ...ROOT_CONTEXT.map((x) => {
      const r = ROOTS.find((y) => y.id === x.root)!;
      return [sentenceLine("rootcontext", x.id), N(`${spoken(x.text)} ${r.id === "scrib" ? "Scrib or script" : r.id[0]!.toUpperCase() + r.id.slice(1)} means ${r.meaning}. ${x.ask}`)] as [string, Line];
    }),
    ...gapLines("apostrophe", APOSTROPHE_SENTENCES),
    ...gapLines("confused", CONFUSED_ITEMS),
    ...ALL_PASSAGES.map((p) => [passageLine(p.word), N(passageText(p))] as [string, Line]),
    ...ALL_PASSAGES.map((p) => [spellLine(p.word), N(`The mystery word is spelled ${p.word.toUpperCase().split("").join(", ")}.`)] as [string, Line]),
  ];
  return Object.fromEntries(out);
}

export const allLines = (): Record<string, Line> => ({ ...STATIC_LINES, ...itemLines() });
