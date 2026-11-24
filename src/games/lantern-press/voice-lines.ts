import { ARTICLES, ENOUGH, STRONGEST } from "./articles";
import { TUTORIAL_ITEM, articleLine, itemLine, noteLine, spoken } from "./logic";
import { COMBINE, CONCISE, CONNECTIVES, CUTS, MODIFIERS, ORDERS, PRONOUNS, PURPOSES, SHIFTS } from "./sentences";
import { CONNOTE, FIG_LINES } from "./words";

/**
 * The Lantern Press — the source of src/games/lantern-press/voice.json (prefix `lp.`). Not bundled: the game reads
 * voice.json; tests/unit/lantern-press.test.ts checks that voice.json holds exactly these lines, so content and
 * clips can't drift. After editing a bank, regenerate voice.json (npx tsx -e, see docs §12) and render only the
 * new clips: python3 scripts/gen_voice.py --model-dir <kokoro> --only lp.
 * Speakers: sarah (editor, host), hoot (fact-checker, helper), narrator (story beats and read-aloud of item text).
 */
export interface Line { text: string; speaker?: "sarah" | "hoot"; vary?: Record<string, string[]> }
const S = (text: string): Line => ({ text, speaker: "sarah" });
const H = (text: string): Line => ({ text, speaker: "hoot" });
const N = (text: string): Line => ({ text });

export const STATIC_LINES: Readonly<Record<string, Line>> = {
  // story: cinematic beats (narrator) and conversations (DialogueScene); restrained, older register
  "lp.story.open": N("Evening on Monster Island. In the old boathouse, the Lantern Press warms up."),
  "lp.story.print": N("The lanterns glow as tonight's paper rolls off the press."),
  "lp.dlg.in.1": S("Welcome to the Lantern Press. I'm Sarah, the editor."),
  "lp.dlg.in.2": S("Hoot checks every fact. You'll help every sentence say what it means."),
  "lp.dlg.in.3": H("Bring me any claim that needs checking."),
  "lp.dlg.in.4": S("Tonight's first page is on your desk."),
  "lp.dlg.handover.1": S("This is Hoot, our fact-checker. He reads every line twice."),
  "lp.dlg.handover.2": H("Three times, if it makes a claim."),
  "lp.dlg.out.1": S("Page approved. Off to the press."),
  "lp.dlg.out.2": H("You weighed each choice against what the writer meant."),
  "lp.dlg.out.3": S("Your Editor's Pen is ready."),
  "lp.intro": S("The press is ready whenever you are. Tonight's pages are on your desk."),
  "lp.back": S("Welcome back, editor. A fresh page is waiting."),
  "lp.mid.1": S("Two stories proofed. On to the next."),
  "lp.mid.2": S("Halfway through tonight's edition."),
  "lp.mid.3": S("Last stories on the page. The press waits for you."),
  "lp.idle": S("Take your time. Read it once more and ask what the writer means."),
  // prompts (every instruction is spoken and captioned)
  "lp.prompt.connective": S("Which connective fits?"),
  "lp.prompt.combine": S("Which sentence says it best?"),
  "lp.prompt.order": S("Put the cards in order to make one sentence. Then press Check."),
  "lp.prompt.modTap": S("Tap the phrase that's in the wrong place. Then press Check."),
  "lp.prompt.modFix": S("Which rewrite says what the writer means?"),
  "lp.prompt.pronTap.1": S("Tap the unclear word. Then press Check."),
  "lp.prompt.pronTap.2": S("Tap the 2 unclear words. Then press Check."),
  "lp.prompt.pronFix": S("Which rewrite makes it clear?"),
  "lp.prompt.cutTap.1": S("Tap the part that repeats an idea. Then press Check."),
  "lp.prompt.cutTap.2": S("Tap the 2 parts that repeat an idea. Then press Check."),
  "lp.prompt.concise": S("Which version keeps every fact in the fewest words?"),
  "lp.prompt.connote": S("Which word fits the writer's purpose?"),
  "lp.prompt.feelSort": S("Sort the words: positive, neutral or negative? Then press Check."),
  "lp.prompt.device": S("Which kind of figurative language is this?"),
  "lp.prompt.figMeaning": S("What does this mean here?"),
  "lp.prompt.purpose": S("Which version fits the writer's purpose?"),
  "lp.prompt.shift": S("Which version fixes the switch in voice?"),
  "lp.prompt.evidenceTap": S("Tap the 2 sentences that are evidence for the claim. Then press Check."),
  "lp.prompt.claimSort": S("Label each sentence. Then press Check."),
  "lp.prompt.strongest": S("Which evidence is strongest?"),
  "lp.prompt.offTap": S("Tap the sentence that doesn't support the claim. Then press Check."),
  "lp.prompt.enough": S("Is that enough evidence?"),
  // round start (Hoot explains the idea)
  "lp.help.combine": H("Connectives carry meaning: cause, contrast, time, condition."),
  "lp.help.modifier": H("A describing phrase attaches to the nearest noun."),
  "lp.help.pronoun": H("A pronoun should point to one clear person or thing."),
  "lp.help.concise": H("Cut words that repeat an idea, never words that add one."),
  "lp.help.connotation": H("Words with the same meaning can carry different feelings."),
  "lp.help.figurative": H("Figurative language means more than the words say."),
  "lp.help.voice": H("Active puts the doer first. Passive puts the thing done to first."),
  "lp.help.claim": H("Evidence is something someone could check."),
  "lp.help.evaluate": H("Good evidence is relevant, enough, and checkable."),
  // first miss (Hoot; keyed by the misconception)
  "lp.hint.relation": H("Is the second idea a reason, a surprise, a result, a time or a condition?"),
  "lp.hint.reversed": H("Check the direction. Which idea causes the other?"),
  "lp.hint.splice": H("Two full sentences need more than a comma."),
  "lp.hint.runon": H("Two full sentences can't just run together."),
  "lp.hint.meaning": H("Check the connective. Does it say what really happened?"),
  "lp.hint.infoloss": H("Shorter isn't always better. Did every fact stay?"),
  "lp.hint.order": H("Read both notes. Which connective links them, and where does each card go?"),
  "lp.hint.literalmod": H("Read it literally. Who or what does each phrase describe?"),
  "lp.hint.stillmod": H("The phrase still sits next to the wrong word. Read it literally."),
  "lp.hint.who": H("Check who does what. Does it match what the writer means?"),
  "lp.hint.pronoun": H("Could a word point to two people or things? Then it's unclear."),
  "lp.hint.stillamb": H("That version is still unclear. Who does the pronoun point to?"),
  "lp.hint.cut": H("Read it without each part. Did any meaning disappear?"),
  "lp.hint.wordy": H("That version still uses extra words for one idea."),
  "lp.hint.feeling": H("Is the writer praising or complaining? Pick the word with that feeling."),
  "lp.hint.neutral": H("That word is neutral. The writer has a feeling here."),
  "lp.hint.sort": H("Does the word sound like praise, a complaint, or a plain description?"),
  "lp.hint.device": H("Check each kind. Which one matches how this line works?"),
  "lp.hint.literal": H("That's the literal meaning. What does the writer really mean?"),
  "lp.hint.misread": H("Read the whole line again. What picture is the writer making?"),
  "lp.hint.focus": H("What does the writer want to focus on: the doer or the thing?"),
  "lp.hint.shift": H("Keep one doer in charge all the way through."),
  "lp.hint.check": H("Could someone check this sentence, or is it an opinion?"),
  "lp.hint.relevant": H("Is it about the claim? Is it more than one person's view?"),
  "lp.hint.sample": H("How many were checked? Could they speak for everyone?"),
  "lp.hint.strict": H("Evidence doesn't have to be perfect. Is there enough to be fair?"),
  "lp.hint.off": H("Does each sentence back the claim, or just sit beside it?"),
  // second miss (Sarah models; the board shows the worked steps)
  "lp.hint.show": S("Let's work through it together."),
  "lp.hint.model": S("Now you finish it. The answer is marked."),
  "lp.retry.1": S("Not yet. What does the writer mean?"),
  "lp.retry.2": S("Close. Check it against the claim."),
  // praise (terse, process, never ability)
  "lp.praise.1": S("You matched the connective to the relationship."),
  "lp.praise.2": S("You read it literally and caught the misplaced phrase."),
  "lp.praise.3": S("You checked who each pronoun points to."),
  "lp.praise.4": S("You cut the repeat and kept every fact."),
  "lp.praise.5": S("You matched the word's feeling to the writer's purpose."),
  "lp.praise.6": S("You looked past the literal words."),
  "lp.praise.7": S("You chose the voice for the writer's focus."),
  "lp.praise.8": S("You asked whether it could be checked. That's fact-checking."),
  "lp.praise.combine": S("You kept every idea and linked them clearly."),
  "lp.praise.order": S("You built one clear sentence from the notes."),
  "lp.praise.fix": S("You put the phrase next to the word it describes."),
  "lp.praise.shift": S("You kept one doer in charge."),
  "lp.praise.sort": S("You heard the feeling in each word."),
  "lp.praise.device": S("You named how the line works."),
  "lp.praise.off": S("You spotted the sentence that doesn't back the claim."),
  "lp.praise.evaluate": S("You weighed the evidence: relevant, enough and checkable."),
};

const cap = (t: string) => t[0]!.toUpperCase() + t.slice(1);
/** Read-aloud of item text (narrator), from the banks: what is printed on the proof, never the options. */
export function itemLines(): Record<string, Line> {
  const out: [string, Line][] = [
    [itemLine("connective", TUTORIAL_ITEM.id), N(spoken(TUTORIAL_ITEM.text))],
    ...CONNECTIVES.map((x) => [itemLine("connective", x.id), N(spoken(x.text))] as [string, Line]),
    ...COMBINE.map((x) => [itemLine("combine", x.id), N(x.notes.join(" "))] as [string, Line]),
    ...ORDERS.map((x) => [itemLine("order", x.id), N(x.notes.join(" "))] as [string, Line]),
    ...MODIFIERS.map((x) => [itemLine("modifier", x.id), N(x.chunks.join(" "))] as [string, Line]),
    ...PRONOUNS.map((x) => [itemLine("pronoun", x.id), N(x.chunks.join(" "))] as [string, Line]),
    ...PRONOUNS.map((x) => [noteLine(x.id), N(`The writer means: ${x.means}`)] as [string, Line]),
    ...CUTS.map((x) => [itemLine("cut", x.id), N(x.chunks.join(" "))] as [string, Line]),
    ...CONCISE.map((x) => [itemLine("concise", x.id), N(x.text)] as [string, Line]),
    ...CONNOTE.map((x) => [itemLine("connote", x.id), N(spoken(x.text))] as [string, Line]),
    ...FIG_LINES.map((x) => [itemLine("fig", x.id), N(x.text)] as [string, Line]),
    ...PURPOSES.map((x) => [itemLine("purpose", x.id), N(`The writer's purpose: ${x.purpose}`)] as [string, Line]),
    ...SHIFTS.map((x) => [itemLine("shift", x.id), N(x.text)] as [string, Line]),
    ...ARTICLES.map((a) => [articleLine(a.id), N(`${cap(a.headline)}. ${a.sentences.map((s) => s.text).join(" ")}`)] as [string, Line]),
    ...STRONGEST.map((x) => [itemLine("strongest", x.id), N(`Claim: ${x.claim}`)] as [string, Line]),
    ...ENOUGH.map((x) => [itemLine("enough", x.id), N(`${x.text} ${x.question}`)] as [string, Line]),
  ];
  return Object.fromEntries(out);
}

export const allLines = (): Record<string, Line> => ({ ...STATIC_LINES, ...itemLines() });
