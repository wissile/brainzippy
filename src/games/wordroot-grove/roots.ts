import type { Gloss, Tag } from "./morphology";

/**
 * Wordroot Grove — Greek (level 4) and Latin (level 5) roots. DATA only. Meanings follow the usual classroom glosses
 * for these roots; a teacher checks every one against a standard dictionary's etymology before release (docs §3.1).
 * No two roots in one match item share a meaning (graph/scrib "write", scope/spect "look": different languages,
 * never in the same item; tested).
 */
export interface Root {
  id: string;
  /** How the root is written on cards. */
  label: string;
  meaning: string;
  lang: "greek" | "latin";
}
const r = (id: string, meaning: string, lang: Root["lang"], label = id): Root => ({ id, label, meaning, lang });
export const ROOTS: readonly Root[] = [
  r("tele", "far", "greek"), r("graph", "write", "greek"), r("phon", "sound", "greek"), r("photo", "light", "greek"),
  r("micro", "small", "greek"), r("scope", "look at", "greek"), r("auto", "self", "greek"), r("bio", "life", "greek"),
  r("meter", "measure", "greek"), r("therm", "heat", "greek"), r("geo", "earth", "greek"), r("hydr", "water", "greek"),
  r("port", "carry", "latin"), r("rupt", "break", "latin"), r("struct", "build", "latin"), r("spect", "look", "latin"),
  r("dict", "say", "latin"), r("aud", "hear", "latin"), r("vis", "see", "latin"), r("ject", "throw", "latin"),
  r("tract", "pull", "latin"), r("scrib", "write", "latin", "scrib / script"),
];
export const ROOT = Object.fromEntries(ROOTS.map((x) => [x.id, x])) as Readonly<Record<string, Root>>;
export const GREEK = ROOTS.filter((x) => x.lang === "greek");
export const LATIN = ROOTS.filter((x) => x.lang === "latin");

// ---------------------------------------------------------------- L4 meaning of a word from its Greek roots
export interface RootWord {
  word: string;
  /** Word parts in order; `roots` names which parts are roots (others are known words or endings). */
  parts: readonly string[];
  roots: readonly string[];
  /** Meanings for parts that are a shortened root (microbe: "be" from bio). */
  notes?: Readonly<Record<string, string>>;
  answer: string;
  distractors: readonly [Gloss, Gloss];
}
const g = (text: string, tag: Tag): Gloss => ({ text, tag });
const rw = (word: string, parts: string[], roots: string[], answer: string, d: [Gloss, Gloss], notes?: Record<string, string>): RootWord => ({ word, parts, roots, answer, distractors: d, ...(notes ? { notes } : {}) });
/** Distractors put the right roots together with the wrong meanings, or swap one root's meaning (the swap misconception). */
export const GREEK_WORDS: readonly RootWord[] = [
  rw("microscope", ["micro", "scope"], ["micro", "scope"], "a tool for looking at very small things", [g("a tool for hearing far-off sounds", "root-swap"), g("a small drawing", "root-swap")]),
  rw("telescope", ["tele", "scope"], ["tele", "scope"], "a tool for looking at faraway things", [g("a tool for looking at tiny things", "root-swap"), g("a letter sent far away", "root-swap")]),
  rw("telephone", ["tele", "phon", "e"], ["tele", "phon"], "a tool that carries sound far away", [g("a tool for seeing far away", "root-swap"), g("a small speaker", "root-swap")]),
  rw("photograph", ["photo", "graph"], ["photo", "graph"], "a picture made with light", [g("a sound that is written down", "root-swap"), g("writing about your own life", "root-swap")]),
  rw("autograph", ["auto", "graph"], ["auto", "graph"], "a person's name, written by that person", [g("a picture of yourself", "root-swap"), g("a machine that draws", "literal")]),
  rw("microbe", ["micro", "be"], ["micro"], "a very small living thing", [g("a very small rock", "root-swap"), g("a living thing far away", "root-swap")], { be: "life (from bio)" }),
  rw("biography", ["bio", "graph", "y"], ["bio", "graph"], "the written story of a person's life", [g("the study of the earth", "root-swap"), g("a photo of a living thing", "root-swap")]),
  rw("autobiography", ["auto", "bio", "graph", "y"], ["auto", "bio", "graph"], "the story of your life, written by you", [g("a life story written by someone else", "root-swap"), g("a book written by a machine", "literal")]),
  rw("thermometer", ["therm", "o", "meter"], ["therm", "meter"], "a tool that measures heat", [g("a tool that keeps things hot", "root-swap"), g("a tool that measures water", "root-swap")]),
  rw("geography", ["geo", "graph", "y"], ["geo", "graph"], "writing about the earth and its places", [g("the story of a person's life", "root-swap"), g("a photo of rocks", "root-swap")]),
  rw("telegraph", ["tele", "graph"], ["tele", "graph"], "a machine that sends writing far away", [g("a tool for hearing sounds far away", "root-swap"), g("a drawing of a faraway place", "literal")]),
  rw("speedometer", ["speed", "o", "meter"], ["meter"], "a tool that measures speed", [g("a tool that makes you go faster", "literal"), g("a tool that measures heat", "root-swap")]),
  rw("autopilot", ["auto", "pilot"], ["auto"], "a system that flies a plane by itself", [g("a pilot who flies far away", "root-swap"), g("a small plane", "root-swap")]),
  rw("headphones", ["head", "phon", "es"], ["phon"], "speakers you wear to hear sound", [g("a light you wear on your head", "root-swap"), g("a phone for your head", "literal")]),
  rw("geothermal", ["geo", "therm", "al"], ["geo", "therm"], "heat from deep inside the earth", [g("water from deep inside the earth", "root-swap"), g("a map of hot places", "literal")]),
  rw("hydrant", ["hydr", "ant"], ["hydr"], "a pipe on the street where firefighters get water", [g("a pipe that carries heat", "root-swap"), g("a light on the street", "root-swap")]),
  rw("microchip", ["micro", "chip"], ["micro"], "a very small part inside a computer", [g("a chip that measures heat", "root-swap"), g("a faraway computer", "root-swap")]),
  rw("photocopy", ["photo", "copy"], ["photo"], "a copy made using light", [g("a copy written by hand", "root-swap"), g("a copy of a sound", "root-swap")]),
];

// ---------------------------------------------------------------- L5 Latin: which word means…, and a root in context
export interface WordForItem {
  id: string;
  meaning: string;
  answer: string;
  /** The answer's root (the hint names it). */
  root: string;
  /** Words from OTHER root families, with the same affix where one exists, so the root is the skill. */
  distractors: readonly [string, string];
}
const wf = (id: string, meaning: string, answer: string, root: string, d: [string, string]): WordForItem => ({ id, meaning, answer, root, distractors: d });
export const WORD_FOR: readonly WordForItem[] = [
  wf("portable", "able to be carried", "portable", "port", ["visible", "audible"]),
  wf("visible", "able to be seen", "visible", "vis", ["portable", "audible"]),
  wf("audible", "able to be heard", "audible", "aud", ["visible", "portable"]),
  wf("spectator", "a person who watches a game", "spectator", "spect", ["projector", "tractor"]),
  wf("tractor", "a machine that pulls heavy loads", "tractor", "tract", ["projector", "spectator"]),
  wf("projector", "a machine that throws a picture onto a screen", "projector", "ject", ["tractor", "spectator"]),
  wf("eject", "to throw or push something out", "eject", "ject", ["erupt", "export"]),
  wf("erupt", "to burst out, as if breaking open", "erupt", "rupt", ["eject", "export"]),
  wf("export", "to carry goods out of a country", "export", "port", ["eject", "erupt"]),
  wf("import", "to carry goods into a country", "import", "port", ["inject", "inspect"]),
  wf("inject", "to push medicine in with a needle", "inject", "ject", ["import", "inspect"]),
  wf("inspect", "to look closely at something", "inspect", "spect", ["import", "inject"]),
  wf("construct", "to build something", "construct", "struct", ["subtract", "describe"]),
  wf("subtract", "to take one number away from another", "subtract", "tract", ["construct", "predict"]),
  wf("predict", "to say what will happen before it happens", "predict", "dict", ["describe", "construct"]),
  wf("describe", "to write or tell what something is like", "describe", "scrib", ["predict", "subtract"]),
  wf("dictionary", "a book that tells what words mean", "dictionary", "dict", ["auditorium", "structure"]),
  wf("auditorium", "a big room where people listen to a show", "auditorium", "aud", ["dictionary", "structure"]),
  wf("interrupt", "to break in while someone is talking", "interrupt", "rupt", ["inspect", "construct"]),
  wf("script", "the written words of a play", "script", "scrib", ["vision", "audience"]),
];

export interface RootContextItem {
  id: string;
  /** Sentence; the root word is wrapped in *asterisks* for bold. */
  text: string;
  root: string;
  /** The question after the root's meaning, e.g. "What happened?" */
  ask: string;
  answer: string;
  distractors: readonly [Gloss, Gloss];
  why: string;
}
const rc = (id: string, text: string, root: string, ask: string, answer: string, d: [Gloss, Gloss], why: string): RootContextItem => ({ id, text, root, ask, answer, distractors: d, why });
export const ROOT_CONTEXT: readonly RootContextItem[] = [
  rc("volcano", "The volcano began to *erupt*.", "rupt", "What happened?", "it burst out", [g("it went quiet", "opposite"), g("it grew taller", "topic")], "rupt means break, and e- means out: the volcano broke out, it burst out."),
  rc("bell", "The bell *interrupted* the story.", "rupt", "What did the bell do?", "it broke into the story", [g("it finished the story", "topic"), g("it told the story", "topic")], "rupt means break, and inter- means between: the bell broke into the story."),
  rc("bike", "Kofi will *inspect* his bike before the ride.", "spect", "What will he do?", "look at it closely", [g("fix it", "topic"), g("ride it fast", "familiar")], "spect means look, and in- means into: he will look into it closely."),
  rc("crowd", "The *spectators* cheered from the stands.", "spect", "Who cheered?", "people who were watching", [g("people who were playing", "familiar"), g("people who were selling snacks", "topic")], "spect means look: spectators are people who look, the people watching."),
  rc("voice", "Mei's whisper was barely *audible*.", "aud", "What does that tell you?", "it could only just be heard", [g("it could not be seen", "root-swap"), g("it was very loud", "opposite")], "aud means hear and -ible means able to be: it could only just be heard."),
  rc("fog", "The fog made the hills *invisible*.", "vis", "What happened to the hills?", "nobody could see them", [g("they got very wet", "topic"), g("they looked bigger", "literal")], "vis means see and in- means not: the hills could not be seen."),
  rc("bridge", "Workers will *construct* a new bridge.", "struct", "What will they do?", "build it", [g("paint it", "topic"), g("take it down", "opposite")], "struct means build: they will build the bridge."),
  rc("token", "The game machine *ejected* a shiny token.", "ject", "What did the machine do?", "it pushed the token out", [g("it swallowed the token", "opposite"), g("it painted the token", "topic")], "ject means throw and e- means out: it threw the token out."),
  rc("magnet", "The magnet *attracted* the paper clips.", "tract", "What did the magnet do?", "it pulled them toward it", [g("it pushed them away", "opposite"), g("it bent them", "topic")], "tract means pull: the magnet pulled the clips toward it."),
  rc("drivers", "Please don't *distract* the drivers.", "tract", "What should you not do?", "pull their attention away", [g("help them drive", "opposite"), g("wash their cars", "topic")], "tract means pull and dis- means away: don't pull their attention away."),
  rc("teacher", "The coach *dictated* a list to the team.", "dict", "What did the coach do?", "said it aloud for them to write down", [g("wrote it on the board", "root-swap"), g("read it silently", "opposite")], "dict means say: the coach said the list aloud."),
  rc("pet", "Omar wrote a *description* of his pet.", "scrib", "What did he write?", "words that tell what his pet is like", [g("a photo of his pet", "literal"), g("a toy for his pet", "topic")], "script means write and de- means down: he wrote down what his pet is like."),
  rc("apples", "The farm will *export* its apples.", "port", "What will the farm do?", "carry the apples out of the country", [g("grow the apples", "topic"), g("eat the apples", "familiar")], "port means carry and ex- means out: the apples are carried out of the country."),
  rc("plants", "The class will *transport* the plants to the garden.", "port", "What will the class do?", "carry the plants there", [g("plant new seeds", "topic"), g("water the plants", "familiar")], "port means carry and trans- means across: they carry the plants across to the garden."),
  rc("drawing", "Zara will *project* her drawing onto the wall.", "ject", "What will she do?", "throw its image onto the wall with light", [g("hang it up with tape", "familiar"), g("paint it on the wall", "topic")], "ject means throw: a projector throws the picture onto the wall."),
  rc("show", "The *audience* clapped at the end.", "aud", "Who clapped?", "the people listening to the show", [g("the people in the show", "familiar"), g("the people who built the stage", "topic")], "aud means hear: the audience is the people who hear the show."),
  rc("glasses", "Nia wears glasses to help her *vision*.", "vis", "What do the glasses help?", "how well she can see", [g("how well she can hear", "root-swap"), g("how fast she can run", "topic")], "vis means see: vision is how well you can see."),
  rc("weather", "The forecast *predicts* rain for tomorrow.", "dict", "What does the forecast do?", "it says what will happen ahead of time", [g("it makes the rain fall", "literal"), g("it says what happened yesterday", "opposite")], "dict means say and pre- means before: it says what will happen before it does."),
];
