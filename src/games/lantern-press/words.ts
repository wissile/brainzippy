/**
 * The Lantern Press — vocabulary banks for levels 5 (connotation) and 6 (figurative language). All original.
 * docs/worlds/lantern-press.md §3.1: near-synonym groups with an agreed polarity (no words about bodies: the
 * slender/thin/skinny set from the proposal is left out), and ≥ 6 original lines per device.
 */

// ---------------------------------------------------------------- L5 connotation
export type Feeling = "positive" | "neutral" | "negative";
export const FEELINGS: readonly Feeling[] = ["positive", "neutral", "negative"];
export const FEELING_MARK: Readonly<Record<Feeling, string>> = { positive: "+", neutral: "0", negative: "−" };
/** Near-synonyms with the same core meaning and a clear-cut polarity (teacher review pending; docs §11). */
export interface WordGroup { id: string; positive: string; neutral: string; negative: string; core: string }
const G = (id: string, positive: string, neutral: string, negative: string, core: string): WordGroup => ({ id, positive, neutral, negative, core });
export const WORD_GROUPS: readonly WordGroup[] = [
  G("smell", "aroma", "smell", "stench", "a smell"),
  G("sure", "confident", "sure", "arrogant", "sure of yourself"),
  G("curious", "curious", "interested", "nosy", "wanting to know"),
  G("firm", "determined", "firm", "stubborn", "not changing your mind"),
  G("young", "youthful", "young", "childish", "like a young person"),
  G("known", "famous", "well-known", "notorious", "known by many people"),
  G("old", "vintage", "old", "outdated", "not new"),
  G("small", "cozy", "small", "cramped", "not much space"),
  G("unusual", "unique", "unusual", "weird", "not like the others"),
];

/** Choose the word whose feeling fits the writer's purpose. The sentence states the feeling (praised, complained…). */
export interface ConnoteItem { id: string; text: string; group: string; want: Exclude<Feeling, "neutral">; cue: string }
const N = (id: string, text: string, group: string, want: "positive" | "negative", cue: string): ConnoteItem => ({ id, text, group, want, cue });
export const CONNOTE: readonly ConnoteItem[] = [
  N("cafe", "The review praised the island café: its kitchen was full of the ___ of fresh bread.", "smell", "positive", "praised"),
  N("market", "Holding his nose, Kenji complained that the fish market had a ___.", "smell", "negative", "complained"),
  N("debate", "Proud of her brother, Zara said he sounded ___ in the debate.", "sure", "positive", "proud"),
  N("boast", "Tired of his bragging, the team called the new player ___.", "sure", "negative", "tired of his bragging"),
  N("questions", "Kenji's grandmother loves his questions and calls him ___.", "curious", "positive", "loves"),
  N("neighbor", "The neighbor complained that the cat was ___ about everything.", "curious", "negative", "complained"),
  N("never", "Admiring how she never gave up, the coach called Nia ___.", "firm", "positive", "admiring"),
  N("refused", "Annoyed that he refused to listen, Raj called his brother ___.", "firm", "negative", "annoyed"),
  N("energy", "The article praised the ninety-year-old dancer for his ___ energy.", "young", "positive", "praised"),
  N("sulking", "Teasing her brother for sulking, Mei called him ___.", "young", "negative", "teasing"),
  N("lighthouse", "Proud of the island's lighthouse, the tour guide called it ___.", "known", "positive", "proud"),
  N("pirate", "The museum sign warned visitors about a ___ pirate who stole from every port.", "known", "negative", "warned"),
  N("jacket", "The shop wanted shoppers to love the jacket, so it called the style ___.", "old", "positive", "wanted shoppers to love"),
  N("phone", "Frustrated with his slow phone, Omar called it ___.", "old", "negative", "frustrated"),
  N("cottage", "The travel article invited readers to stay in a ___ seaside cottage.", "small", "positive", "invited readers"),
  N("closet", "Fed up with the cluttered hall closet, Omar called it ___.", "small", "negative", "fed up"),
  N("dish", "The menu wanted diners to try the new dish, so it described the flavor as ___.", "unusual", "positive", "wanted diners to try"),
  N("smoothie", "Making a face at the bitter smoothie, Sami called the taste ___.", "unusual", "negative", "making a face"),
];

// ---------------------------------------------------------------- L6 figurative language
export type Device = "simile" | "metaphor" | "personification" | "hyperbole" | "idiom" | "irony" | "pun";
export const DEVICES: readonly Device[] = ["simile", "metaphor", "personification", "hyperbole", "idiom", "irony", "pun"];
export const DEVICE_LABEL: Readonly<Record<Device, string>> = {
  simile: "simile", metaphor: "metaphor", personification: "personification", hyperbole: "hyperbole", idiom: "idiom", irony: "verbal irony", pun: "pun",
};
export const DEVICE_DEF: Readonly<Record<Device, string>> = {
  simile: "Simile: compares two things using like or as.",
  metaphor: "Metaphor: says one thing is another, without like or as.",
  personification: "Personification: gives human actions or feelings to a thing.",
  hyperbole: "Hyperbole: exaggerates on purpose to make a point.",
  idiom: "Idiom: a set phrase whose meaning isn't the meaning of its words.",
  irony: "Verbal irony: saying the opposite of what you mean.",
  pun: "Pun: a joke that plays on two meanings or two sound-alike words.",
};
/**
 * Labels that may appear beside each device in a "name the device" item. Pairs where one line could be both are
 * never offered together (docs §3: personification is a kind of metaphor; hyperbole and idiom overlap; similes and
 * metaphors can exaggerate; many puns are built on idioms). OVERLAPS lists the pairs the unit test checks.
 */
export const DEVICE_DISTRACTORS: Readonly<Record<Device, readonly Device[]>> = {
  simile: ["metaphor", "personification", "irony", "pun"],
  metaphor: ["simile", "irony", "pun"],
  personification: ["simile", "irony", "pun"],
  hyperbole: ["simile", "personification", "pun"],
  idiom: ["simile", "personification", "pun"],
  irony: ["simile", "personification", "metaphor"],
  pun: ["simile", "personification", "hyperbole"],
};
export const OVERLAPS: readonly (readonly [Device, Device])[] = [
  ["personification", "metaphor"], ["hyperbole", "idiom"], ["simile", "hyperbole"], ["metaphor", "hyperbole"], ["metaphor", "idiom"],
  ["pun", "idiom"], ["personification", "hyperbole"], ["irony", "hyperbole"], ["irony", "pun"],
];

/** One original line: what it means here, its literal reading, and a misreading. `how` explains the device in this line. */
export interface FigLine { id: string; device: Device; text: string; meaning: string; literal: string; misread: string; how: string }
const F = (id: string, device: Device, text: string, meaning: string, literal: string, misread: string, how: string): FigLine =>
  ({ id, device, text, meaning, literal, misread, how });
export const FIG_LINES: readonly FigLine[] = [
  // simile
  F("handwriting", "simile", "Kenji's handwriting was as neat as a printed page.", "it was very neat", "a machine printed it", "it was hard to read", "As neat as compares his writing to a printed page."),
  F("lake", "simile", "The lake was as smooth as glass this morning.", "it was very calm, with no waves", "the lake was made of glass", "the lake was frozen solid", "As smooth as glass compares the water to glass."),
  F("bear", "simile", "After the long swim, Ana was as hungry as a bear.", "she was very hungry", "she turned into a bear", "she was grumpy", "As hungry as a bear compares her hunger to a bear's."),
  F("moons", "simile", "The lanterns along the dock glowed like a row of tiny moons.", "they shone softly in a line", "there were real moons on the dock", "the lanterns were broken", "Like a row of tiny moons compares the lanterns to moons."),
  F("mouse", "simile", "During his first week, the new student was as quiet as a mouse.", "he spoke very little", "he squeaked and hid in holes", "he was very loud", "As quiet as a mouse compares him to a mouse."),
  F("whistle", "simile", "Her voice cut through the noise like a whistle.", "it was sharp and easy to hear", "she blew a real whistle", "she was whispering", "Like a whistle compares her voice to a whistle."),
  // metaphor
  F("treasure", "metaphor", "The library is a treasure chest of stories.", "it holds many valuable stories", "it is a wooden box full of gold", "it is hard to get into", "It says the library is a treasure chest, with no like or as."),
  F("blackhole", "metaphor", "Omar's backpack is a black hole for lost homework.", "homework disappears in it", "it is a hole in outer space", "it is very neat and tidy", "It says the backpack is a black hole, with no like or as."),
  F("beehive", "metaphor", "The classroom was a beehive before the field trip.", "it was busy and buzzing with activity", "bees lived in the classroom", "the classroom was empty", "It says the classroom was a beehive, with no like or as."),
  F("blanket", "metaphor", "The fog was a thick gray blanket over the harbor.", "it covered everything heavily", "someone spread a blanket over the water", "the fog kept everyone warm", "It says the fog was a blanket, with no like or as."),
  F("rainbow", "metaphor", "Grandpa's garden is a rainbow in June.", "it is full of bright colors", "a rainbow appears over it", "it is wet from rain", "It says the garden is a rainbow, with no like or as."),
  F("diamonds", "metaphor", "The stars were diamonds scattered across the sky.", "they sparkled brightly", "real diamonds were in the sky", "the stars were falling", "It says the stars were diamonds, with no like or as."),
  // personification
  F("groaned", "personification", "The old ferry groaned as it pulled away from the dock.", "it made a low, creaking sound", "it felt pain and complained", "it moved very fast", "A ferry can't really groan: a human action is given to a thing."),
  F("whispered", "personification", "The wind whispered through the tall grass.", "it made a soft rustling sound", "the wind said secret words", "the wind was very strong", "Wind can't really whisper: a human action is given to a thing."),
  F("alarm", "personification", "The alarm clock shouted at six o'clock.", "it rang loudly", "it was angry with someone", "it stopped working", "A clock can't really shout: a human action is given to a thing."),
  F("danced", "personification", "The waves danced in the afternoon sun.", "they moved lightly and sparkled", "the waves learned a dance", "the waves were still and flat", "Waves can't really dance: a human action is given to a thing."),
  F("kettle", "personification", "The kettle sang on the stove.", "it whistled as the water boiled", "it performed a song", "it broke", "A kettle can't really sing: a human action is given to a thing."),
  F("waited", "personification", "The empty playground waited for the bell.", "it was quiet before the students came out", "it was patient and checked the time", "it was closed for good", "A playground can't really wait: a human action is given to a thing."),
  // hyperbole
  F("million", "hyperbole", "I've told you a million times to close the gate.", "I've told you many times", "I've said it exactly a million times", "I've never told you", "Nobody says anything a million times: it exaggerates to make a point."),
  F("ton", "hyperbole", "This backpack weighs a ton.", "it is very heavy", "it weighs exactly 2,000 pounds", "it is getting lighter", "No backpack weighs a ton: it exaggerates to make a point."),
  F("pancakes", "hyperbole", "Raj ate enough pancakes to feed the whole island.", "he ate a lot of pancakes", "the whole island got pancakes", "he wasn't hungry", "One person can't eat that much: it exaggerates to make a point."),
  F("mile", "hyperbole", "The line for the new ride was a mile long.", "the line was very long", "it measured exactly one mile", "the ride was far away", "A line isn't really a mile long: it exaggerates to make a point."),
  F("century", "hyperbole", "Mei's homework took a hundred years last night.", "it took a very long time", "she worked for a whole century", "it was quick", "Homework can't take a hundred years: it exaggerates to make a point."),
  F("town", "hyperbole", "The puppy's bark was loud enough to wake the whole town.", "it was very loud", "everyone in town woke up", "the puppy was sleeping", "One bark can't wake a whole town: it exaggerates to make a point."),
  // idiom
  F("beans", "idiom", "Don't spill the beans about the surprise party.", "don't tell the secret", "don't drop beans on the floor", "don't eat at the party", "Spill the beans is a set phrase: it means tell a secret."),
  F("cake", "idiom", "The math quiz was a piece of cake.", "it was easy", "the quiz was made of cake", "it was long", "A piece of cake is a set phrase: it means easy."),
  F("day", "idiom", "We've painted for hours, so let's call it a day.", "let's stop working for now", "let's give the day a name", "let's start early tomorrow", "Call it a day is a set phrase: it means stop for now."),
  F("fence", "idiom", "Zara was on the fence about joining the choir.", "she couldn't decide", "she sat on a fence", "she had already said yes", "On the fence is a set phrase: it means undecided."),
  F("horses", "idiom", "Hold your horses; the ferry hasn't docked yet.", "wait and be patient", "grab the horses' reins", "hurry up", "Hold your horses is a set phrase: it means wait."),
  F("books", "idiom", "Omar hit the books before the history quiz.", "he studied hard", "he hit his books with his hand", "he lost his books", "Hit the books is a set phrase: it means study."),
  // verbal irony
  F("rain", "irony", "\"Great, more rain,\" Omar sighed at the soggy picnic.", "he is unhappy about the rain", "he thinks the rain is great", "he is glad the picnic is over", "He says great but sighs at a soggy picnic: he means the opposite."),
  F("waiting", "irony", "Stuck in the long line, Lena muttered, \"I just love waiting.\"", "she dislikes waiting", "she enjoys waiting", "she is waiting for a friend", "She mutters it while stuck in line: she means the opposite."),
  F("tire", "irony", "Seeing the flat tire, Kofi said, \"Oh, wonderful.\"", "he is annoyed", "he is delighted", "the tire is fine", "A flat tire isn't wonderful: he means the opposite."),
  F("start", "irony", "When the bus broke down, Raj said, \"Well, this is a perfect start to the trip.\"", "it is a bad start", "the start really is perfect", "the trip is cancelled", "A broken bus isn't a perfect start: he means the opposite."),
  F("relaxing", "irony", "After the power went out for the third time, Mei said, \"What a relaxing evening.\"", "the evening is stressful", "the evening is relaxing", "she wants to go to sleep", "Three power cuts aren't relaxing: she means the opposite."),
  F("weather", "irony", "\"Lovely weather for a beach day,\" Ana joked as the storm rolled in.", "the weather is bad for the beach", "the weather is perfect for the beach", "she is going to the beach anyway", "A storm isn't lovely beach weather: she means the opposite."),
  // pun
  F("knead", "pun", "A bakery sign says, \"We knead you!\"", "a joke on knead (press dough) and need", "the bakery wants to press you like dough", "the bakery is closing", "Knead sounds like need: one word, two meanings."),
  F("draw", "pun", "The art room poster says, \"Let's draw our own conclusions.\"", "a joke on draw (make a picture) and draw a conclusion (decide)", "students sketch the word conclusion", "the class is ending", "Draw means both sketch and decide here."),
  F("shell", "pun", "A sign at the tide pools asks, \"Shell we explore?\"", "a joke on shell and shall", "the shells are going to explore", "visitors may not touch the shells", "Shell sounds like shall: one sound, two meanings."),
  F("rooting", "pun", "The garden club's banner says, \"We're rooting for you!\"", "a joke on plant roots and rooting for (cheering on) someone", "the club digs up roots for you", "the club wants you to leave", "Rooting means both growing roots and cheering."),
  F("anytime", "pun", "The clock repair shop's sign says, \"Come in any time.\"", "a joke on clocks (time) and come whenever you like", "the clocks show every time at once", "the shop is always closed", "Time means both what clocks show and when to visit."),
  F("wheel", "pun", "The skate shop's door sign says, \"Wheel be right back.\"", "a joke on wheel and we'll", "a wheel is coming back", "the shop sells only wheels", "Wheel sounds like we'll: one sound, two meanings."),
];
