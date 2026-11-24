import type { Gloss, Tag } from "./morphology";

/**
 * Wordroot Grove — context-clue passages (levels 6–7), written for BrainZippy. DATA only.
 *
 * Each passage is pre-chunked into phrases (the clue-tapping items toggle these); `chunks.join(" ")` is the passage.
 * The mystery word is wrapped in *asterisks* (shown bold, never a real word). `clues` are the chunk indexes that
 * explain it; every other chunk is setting or a name, never a second clue (reviewer check, docs §3.2).
 * Distractor meanings fit the passage's topic but not the clue (`topic`), are the opposite (`opposite`, contrast
 * items) or pick the most familiar idea in the passage (`familiar`).
 * Invented words: not in an English dictionary and not one letter away from a dictionary word or a blocklisted word
 * (tested against hunspell en_US where it is installed, and against the blocklist always). Several proposal
 * examples failed that check and were replaced: glimber (climber, glimmer), plorn (one letter from a rude word),
 * tamble (table, tumble), frosket, vindle (kindle).
 */
export type ClueType = "definition" | "synonym" | "example" | "restatement" | "cause" | "contrast" | "multi";

export interface Passage {
  id: string;
  word: string;
  chunks: readonly string[];
  clues: readonly number[];
  type: ClueType;
  answer: string;
  distractors: readonly [Gloss, Gloss];
  /** One reasoning line for the worked model (docs §4: clue + reasoning → meaning). */
  why: string;
}
const g = (text: string, tag: Tag): Gloss => ({ text, tag });
const p = (word: string, type: ClueType, chunks: string[], clues: number[], answer: string, d: [Gloss, Gloss], why: string): Passage =>
  ({ id: word, word, type, chunks, clues, answer, distractors: d, why });

// ---------------------------------------------------------------- L6: one sentence (≤ 20 words), one clue
export const ONE_SENTENCE: readonly Passage[] = [
  p("plimbet", "definition", ["Ana packed a *plimbet*,", "a small bag for carrying a snack,", "before the hike."], [1], "a snack bag", [g("a hiking boot", "topic"), g("a trail map", "topic")], "The words after the comma explain it: a small bag for carrying a snack."),
  p("drinnet", "synonym", ["Kofi filled his *drinnet*,", "or water bottle,", "at the fountain."], [1], "a water bottle", [g("a swimming pool", "topic"), g("a fountain", "familiar")], "Or gives another name for it: a water bottle."),
  p("sorbinet", "definition", ["Mei wore a *sorbinet*,", "a warm hat with flaps over the ears,", "in the snow."], [1], "a warm hat", [g("a pair of boots", "topic"), g("a snowball", "familiar")], "The words after the comma explain it: a warm hat with ear flaps."),
  p("quosset", "example", ["Raj keeps every *quosset*,", "such as apples, pears and plums,", "in a blue bowl."], [1], "a kind of fruit", [g("a kind of bowl", "familiar"), g("a kind of color", "topic")], "Such as gives examples: apples, pears and plums are all fruit."),
  p("morrick", "restatement", ["The trail was *morrick*;", "in other words, it was steep and hard to climb,", "so Lena rested often."], [1], "steep and hard to climb", [g("wet and muddy", "topic"), g("flat and easy", "opposite")], "In other words says the same thing again: steep and hard to climb."),
  p("klendor", "definition", ["Omar fed the *klendor*,", "a tiny fish with orange stripes,", "that lives in his tank."], [1], "a small striped fish", [g("a fish tank", "familiar"), g("a bag of fish food", "topic")], "The words after the comma explain it: a tiny fish with orange stripes."),
  p("bramtock", "synonym", ["Zara swept the *bramtock*,", "or front porch,", "after the storm."], [1], "a front porch", [g("a broom", "topic"), g("a storm cloud", "familiar")], "Or gives another name for it: the front porch."),
  p("brindop", "example", ["Tomás hung each *brindop*,", "like his hammer and his saw,", "on the workshop wall."], [1], "a tool", [g("a picture frame", "topic"), g("a workshop", "familiar")], "Like gives examples: a hammer and a saw are both tools."),
  p("gendrop", "definition", ["Priya used a *gendrop*,", "which is a long spoon for stirring soup,", "to mix dinner."], [1], "a long soup spoon", [g("a soup pot", "familiar"), g("a bowl of soup", "topic")], "Which is explains the word: a long spoon for stirring soup."),
  p("pentrop", "definition", ["A *pentrop* is", "a party held outside in a park,", "and Jonah loves them."], [1], "a party in a park", [g("a park bench", "familiar"), g("a birthday present", "topic")], "Is tells you what it means: a party held outside in a park."),
  p("galdrup", "synonym", ["Nia found a *galdrup*,", "or smooth, flat stone,", "by the river."], [1], "a smooth, flat stone", [g("a river fish", "topic"), g("a little boat", "topic")], "Or gives another name for it: a smooth, flat stone."),
  p("holtip", "example", ["Sami's favorite *holtip*,", "such as soccer or swimming,", "keeps him busy all week."], [1], "a sport", [g("a day of the week", "familiar"), g("a best friend", "topic")], "Such as gives examples: soccer and swimming are sports."),
  p("torvish", "definition", ["The puppy felt *torvish*,", "which means very sleepy,", "after its long walk."], [1], "very sleepy", [g("very hungry", "topic"), g("very excited", "topic")], "Which means tells you exactly: very sleepy."),
  p("lomvish", "synonym", ["Kenji's soup was *lomvish*,", "or warm but not hot,", "so he ate it right away."], [1], "warm but not hot", [g("very salty", "topic"), g("cold and icy", "opposite")], "Or gives another way to say it: warm but not hot."),
  p("valdish", "restatement", ["The room was *valdish*,", "that is, very neat and tidy,", "after Aiyana cleaned it."], [1], "very neat and tidy", [g("very messy", "opposite"), g("very large", "topic")], "That is says it again in other words: very neat and tidy."),
  p("crennish", "definition", ["The bread smelled *crennish*,", "fresh and warm from the oven,", "when Ana opened the door."], [1], "fresh and warm", [g("burnt", "topic"), g("sweet like candy", "topic")], "The words after the comma explain it: fresh and warm from the oven."),
  p("skelvy", "example", ["Raj loves *skelvy* weather,", "like windy days with gray clouds,", "for flying kites."], [1], "windy and cloudy", [g("hot and sunny", "opposite"), g("snowy and icy", "topic")], "Like gives an example: windy days with gray clouds."),
  p("trevvy", "synonym", ["Lena felt *trevvy*,", "or nervous,", "before her piano recital."], [1], "nervous", [g("proud", "topic"), g("bored", "topic")], "Or gives another word for it: nervous."),
  p("prendle", "definition", ["Zara will *prendle* the plants,", "which means give them a little water,", "every morning."], [1], "give them water", [g("pick their flowers", "topic"), g("plant new seeds", "topic")], "Which means tells you exactly: give them a little water."),
  p("ravvle", "synonym", ["Kofi likes to *ravvle*,", "or hum quietly,", "while he draws."], [1], "hum quietly", [g("draw quickly", "familiar"), g("shout loudly", "opposite")], "Or gives another way to say it: hum quietly."),
  p("wezzle", "restatement", ["Mei's cat will *wezzle*,", "in other words, curl up in a ball,", "on any warm blanket."], [1], "curl up in a ball", [g("run away", "topic"), g("scratch the blanket", "familiar")], "In other words says it again: curl up in a ball."),
  p("sprock", "synonym", ["Omar had to *sprock* the tent,", "or fold it up small,", "before the drive home."], [1], "fold it up small", [g("put it up", "opposite"), g("wash it", "topic")], "Or gives another way to say it: fold it up small."),
  p("splott", "definition", ["The baby likes to *splott*,", "which means clap and stamp at the same time,", "when music plays."], [1], "clap and stamp", [g("fall asleep", "topic"), g("sing along", "familiar")], "Which means tells you exactly: clap and stamp at the same time."),
  p("grimvel", "synonym", ["Before the race, Nia *grimveled*,", "or stretched her legs,", "on the grass."], [1], "stretched her legs", [g("ran the race", "familiar"), g("sat on the grass", "familiar")], "Or gives another way to say it: stretched her legs."),
];

// ---------------------------------------------------------------- L7: two or three sentences (≤ 45 words), two clues
export const ACROSS_SENTENCES: readonly Passage[] = [
  p("flimmet", "multi", ["The cave was *flimmet*.", "Omar couldn't see his own hand.", "He switched on his flashlight.", "His friends waited outside."], [1, 2], "very dark", [g("very cold", "topic"), g("full of friends", "familiar")], "Couldn't see + switched on a flashlight → no light → very dark."),
  p("blistom", "contrast", ["Kenji's brother is *blistom*,", "but Kenji is quiet.", "His brother shouts and sings all day long.", "They both like pizza."], [1, 2], "loud", [g("quiet", "opposite"), g("hungry", "familiar")], "But signals the opposite of quiet, and shouting all day agrees → loud."),
  p("snorbit", "cause", ["Because the path was *snorbit*,", "Ana slipped twice.", "She stepped slowly over the icy stones.", "Her friends waited by the gate."], [1, 2], "slippery", [g("very crowded", "topic"), g("closed with a gate", "familiar")], "Because tells you why she slipped, and the stones were icy → slippery."),
  p("fendro", "multi", ["Raj's lunch was *fendro*.", "He took one bite and fanned his mouth.", "Then he gulped down a whole glass of water.", "The cafeteria was busy that day."], [1, 2], "very hot and peppery", [g("very cold", "topic"), g("very busy", "familiar")], "Fanning his mouth + gulping water → his mouth felt on fire → very hot and peppery."),
  p("grevin", "contrast", ["Although the puppy looked *grevin*,", "it was full of energy.", "It had just run, jumped and chased its tail for an hour.", "Sami named it Biscuit."], [1, 2], "tired", [g("full of energy", "opposite"), g("hungry", "topic")], "Although signals a surprise: it looked one way but was full of energy after an hour of play → it looked tired."),
  p("skorvel", "cause", ["The lemonade was so *skorvel*", "that Zara added three spoons of sugar.", "Even then, her lips puckered.", "She sat under a big tree."], [1, 2], "sour", [g("sweet", "familiar"), g("cold", "topic")], "So … that tells the effect: she needed sugar and her lips puckered → sour."),
  p("kerpin", "multi", ["Nia carried the *kerpin* to the lake.", "She climbed in and picked up the paddle.", "Soon she was gliding across the water.", "Ducks swam nearby."], [1, 2], "a small boat", [g("a fishing pole", "topic"), g("a duck", "familiar")], "Climbed in + a paddle + gliding across water → a small boat."),
  p("lumbrit", "contrast", ["Instead of walking, Jonah decided to *lumbrit*.", "He raced down the hill as fast as he could.", "He reached the bottom first.", "His shoes were blue."], [1, 2], "run fast", [g("walk slowly", "opposite"), g("buy new shoes", "familiar")], "Instead of walking + raced as fast as he could + reached the bottom first → run fast."),
  p("zorvel", "multi", ["The thunder was *zorvel*.", "Aiyana covered her ears.", "The windows rattled in their frames.", "Then the rain began."], [1, 2], "very loud", [g("very bright", "topic"), g("very wet", "familiar")], "Covered her ears + rattling windows → a huge sound → very loud."),
  p("quandrel", "multi", ["Priya practices her *quandrel* every evening.", "She plucks its four strings,", "and soft music fills the room.", "Her room is painted green."], [1, 2], "a musical instrument", [g("a paintbrush", "familiar"), g("a pet bird", "topic")], "Strings to pluck + music → a musical instrument."),
  p("fennick", "contrast", ["Most of the class felt *fennick* before the test,", "but Lena felt calm.", "Their hands shook", "as they waited for the papers."], [1, 2], "worried", [g("calm", "opposite"), g("bored", "topic")], "But signals the opposite of calm, and shaking hands agree → worried."),
  p("flaxim", "multi", ["Omar needed a *flaxim* to cross the stream.", "He laid the long wooden board over the water.", "Then he walked across it carefully.", "A frog watched him."], [1, 2], "a plank to walk across", [g("a frog", "familiar"), g("a rope swing", "topic")], "A long wooden board laid over water + walked across it → a plank to walk across."),
  p("nubbick", "cause", ["The kitten was *nubbick*,", "so it hid under the bed.", "It shook whenever the doorbell rang.", "Its fur was gray."], [1, 2], "scared", [g("sleepy", "topic"), g("dirty", "topic")], "So tells the effect: it hid and shook at the doorbell → scared."),
  p("tumvick", "contrast", ["Kofi thought the movie would be *tumvick*,", "but it was exciting from start to finish.", "He had expected to yawn the whole time.", "He shared popcorn with Mei."], [1, 2], "boring", [g("exciting", "opposite"), g("scary", "topic")], "But signals a surprise: it was exciting, though he expected to yawn → he thought it would be boring."),
  p("ulbrin", "multi", ["Grandpa keeps an *ulbrin* by the door.", "When it rains, he opens it", "and holds it over his head.", "He always wears a red coat."], [1, 2], "an umbrella", [g("a raincoat", "familiar"), g("a doormat", "topic")], "Opens it when it rains + holds it over his head → an umbrella."),
  p("mirvane", "cause", ["The old bridge was *mirvane*,", "so the town closed it.", "Its boards were cracked and loose.", "A new bridge will open in May."], [1, 2], "not safe to use", [g("brand new", "familiar"), g("very long", "topic")], "So tells the effect: the town closed it, and its boards were cracked → not safe."),
  p("glantrip", "multi", ["Tomás wanted a *glantrip* after his long swim.", "He stretched out on a soft towel", "and closed his eyes for an hour.", "The pool was busy."], [1, 2], "a rest", [g("another swim", "familiar"), g("a snack", "topic")], "Stretched out on a towel + closed his eyes for an hour → a rest."),
  p("kopwell", "contrast", ["Unlike the *kopwell* old road,", "the new road is smooth.", "The old road is full of bumps and holes.", "Buses use both roads."], [1, 2], "bumpy", [g("smooth", "opposite"), g("busy with buses", "familiar")], "Unlike signals the opposite of smooth, and bumps and holes agree → bumpy."),
  p("crosvin", "cause", ["Zara's shoes were *crosvin*", "after she jumped in every puddle.", "Water squished out with each step.", "She laughed all the way home."], [1, 2], "soaking wet", [g("brand new", "topic"), g("too small", "topic")], "After puddles + water squishing out → soaking wet."),
  p("nalvick", "multi", ["Sami pinned the *nalvick* to the wall.", "It showed every town on the island", "and every road between them.", "He used a red pin."], [1, 2], "a map", [g("a red pin", "familiar"), g("a family photo", "topic")], "It shows every town and every road → a map."),
  p("tolvane", "contrast", ["Ana's old backpack was *tolvane*.", "However, her new one is light and easy to carry.", "The old one hurt her shoulders.", "Both are purple."], [1, 2], "heavy", [g("light", "opposite"), g("purple", "familiar")], "However signals the opposite of light, and sore shoulders agree → heavy."),
  p("umbrick", "cause", ["The soup was *umbrick*,", "so Kenji blew on each spoonful.", "Steam rose from the bowl.", "He ate it with bread."], [1, 2], "very hot", [g("very cold", "opposite"), g("very salty", "topic")], "So tells the effect: blowing on it + steam → very hot."),
  p("wistrop", "multi", ["Mei used a *wistrop* to dig in the garden.", "Its sharp metal end cut through the soil,", "and its long handle saved her back.", "The tulips bloomed in spring."], [1, 2], "a digging tool", [g("a tulip", "familiar"), g("a watering can", "topic")], "A sharp metal end that cuts soil + a long handle → a digging tool."),
  p("crandiv", "contrast", ["While Raj's dog is *crandiv*,", "his cat is lazy.", "The dog runs, fetches and plays all afternoon.", "Both pets sleep at night."], [1, 2], "lively and active", [g("lazy", "opposite"), g("hungry", "topic")], "While signals a contrast with lazy, and running and playing all afternoon agree → lively and active."),
];

export const ALL_PASSAGES: readonly Passage[] = [...ONE_SENTENCE, ...ACROSS_SENTENCES];
export const INVENTED_WORDS: readonly string[] = ALL_PASSAGES.map((x) => x.word);
/** The passage as one string, without the bold markers. */
export const passageText = (x: Passage) => x.chunks.join(" ").replace(/\*/g, "");
export const wordCount = (x: Passage) => passageText(x).split(/\s+/).filter(Boolean).length;
