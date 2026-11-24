/**
 * The Lantern Press — authored sentence banks for levels 0–4 and 7 (docs/worlds/lantern-press.md §3).
 * Every sentence is original, set on Monster Island, with fictional first names only. Each item asks which version
 * says what the writer means; grammar terms appear only in hints. Every distractor carries a misconception tag, and
 * no item judges a usage that guides disagree on (split infinitives, which/that, sentence-initial and/but, singular
 * "they", data is/are: see EXCLUDED_USAGE, unit-tested).
 */

/** Misconception tags (docs §3.2). A teacher confirms each tagged error against mainstream usage guides. */
export type Tag =
  | "reversed" | "wrong-relation" | "comma-splice" | "run-on" | "meaning-shift" | "info-loss"
  | "still-misplaced" | "still-ambiguous" | "wordy" | "wrong-connotation" | "neutral"
  | "wrong-device" | "literal" | "misread" | "wrong-focus" | "shift"
  | "irrelevant" | "anecdote" | "opinion" | "small-sample" | "too-strict";
export const TAGS: readonly Tag[] = [
  "reversed", "wrong-relation", "comma-splice", "run-on", "meaning-shift", "info-loss", "still-misplaced", "still-ambiguous", "wordy",
  "wrong-connotation", "neutral", "wrong-device", "literal", "misread", "wrong-focus", "shift", "irrelevant", "anecdote", "opinion",
  "small-sample", "too-strict",
];
/** Usages that guides disagree on: never tagged as an error (docs §3.2). */
export const EXCLUDED_USAGE = ["split-infinitive", "which-that", "initial-conjunction", "singular-they", "data-plural"] as const;

export interface Tagged { text: string; tag: Tag }

// ---------------------------------------------------------------- L0 connectives
export type Relation = "cause" | "result" | "contrast" | "time" | "condition" | "purpose";
export const RELATION_LABEL: Readonly<Record<Relation, string>> = {
  cause: "a reason", result: "a result", contrast: "a surprise (contrast)", time: "a time", condition: "a condition", purpose: "a purpose",
};
export interface ConnectiveItem { id: string; text: string; answer: string; relation: Relation; distractors: readonly Tagged[]; why: string }
const C = (id: string, text: string, answer: string, relation: Relation, d: [string, Tag][], why: string): ConnectiveItem =>
  ({ id, text, answer, relation, distractors: d.map(([t, tag]) => ({ text: t, tag })), why });

/** "___" marks the gap. Exactly one connective makes sense; "and" is never offered (it is always grammatical). */
export const CONNECTIVES: readonly ConnectiveItem[] = [
  C("fog", "The ferry left late ___ the fog was thick.", "because", "cause", [["although", "wrong-relation"], ["so", "reversed"]], "The thick fog is the reason the ferry left late."),
  C("tent", "The bake-off tent was packed, ___ Kofi set up his table outside.", "so", "result", [["because", "reversed"], ["although", "wrong-relation"]], "Setting up outside is the result of the packed tent."),
  C("exams", "The library is staying open late ___ exams start next week.", "because", "cause", [["although", "wrong-relation"], ["so", "reversed"]], "Exams next week are the reason for the late hours."),
  C("steep", "___ the path was steep, the walkers reached the lighthouse before dark.", "Although", "contrast", [["Because", "wrong-relation"], ["Until", "wrong-relation"]], "A steep path would slow them down, so reaching it before dark is a surprise."),
  C("drum", "Mei kept practicing the drum part ___ she could play it with her eyes closed.", "until", "time", [["although", "wrong-relation"], ["unless", "wrong-relation"]], "She practiced up to the time she could play it with her eyes closed."),
  C("wheel", "Students can use the pottery wheel ___ they sign the safety sheet first.", "if", "condition", [["unless", "reversed"], ["because", "wrong-relation"]], "Signing the sheet is the condition for using the wheel."),
  C("ducks", "Please don't feed the ducks ___ the ranger says it's okay.", "unless", "condition", [["because", "wrong-relation"], ["so", "wrong-relation"]], "The ranger's okay is the only condition that changes the rule."),
  C("boots", "Zara wore her heavy boots ___ the trail was dry.", "although", "contrast", [["because", "wrong-relation"], ["so", "reversed"]], "Heavy boots on a dry trail are a surprise."),
  C("race", "The bike race was moved to Sunday ___ the roads were flooded on Saturday.", "because", "cause", [["so", "reversed"], ["although", "wrong-relation"]], "The flooded roads are the reason for the move."),
  C("tide", "The tide was coming in, ___ the survey team packed up their clipboards.", "so", "result", [["because", "reversed"], ["although", "wrong-relation"]], "Packing up is the result of the rising tide."),
  C("crossword", "Raj finished the crossword ___ the bus reached his stop.", "before", "time", [["because", "wrong-relation"], ["unless", "wrong-relation"]], "One thing happened earlier than the other: a time link."),
  C("market", "___ it rained all morning, the market still opened at ten.", "Although", "contrast", [["Because", "wrong-relation"], ["Unless", "wrong-relation"]], "Rain would keep a market closed, so opening anyway is a surprise."),
  C("choir", "The choir sang without microphones, ___ everyone in the hall could hear them.", "but", "contrast", [["so", "reversed"], ["unless", "wrong-relation"]], "No microphones, yet everyone heard: a surprise."),
  C("bins", "The new bins are labeled with pictures ___ younger children know where things go.", "so", "purpose", [["although", "wrong-relation"], ["unless", "wrong-relation"]], "The pictures are there for a purpose: helping younger children."),
  C("puzzle", "The puzzle looked easy, ___ it took the whole class an hour.", "but", "contrast", [["so", "reversed"], ["because", "wrong-relation"]], "An easy-looking puzzle taking an hour is a surprise."),
  C("lemon", "The bakery sold out by noon ___ Priya's lemon bread was so popular.", "because", "cause", [["although", "wrong-relation"], ["so", "reversed"]], "The popular bread is the reason it sold out."),
  C("picnic", "The picnic will be on the beach ___ it rains, in which case it moves to the hall.", "unless", "condition", [["if", "reversed"], ["because", "wrong-relation"]], "Rain is the condition that moves the picnic."),
  C("jam", "Jonah wrote the date on every jar ___ nobody would eat old jam.", "so", "purpose", [["although", "wrong-relation"], ["unless", "wrong-relation"]], "The dates have a purpose: keeping old jam from being eaten."),
  C("bridge", "The bridge was repaired last spring, ___ the ferry still carries most of the bikes.", "but", "contrast", [["so", "reversed"], ["because", "wrong-relation"]], "A repaired bridge should take the bikes, so the ferry still carrying them is a surprise."),
  C("debate", "Nia's team won the debate ___ they had less time to prepare.", "although", "contrast", [["because", "wrong-relation"], ["so", "reversed"]], "Less time should make winning harder: a surprise."),
  C("lamp", "The lighthouse lamp turns on ___ the sun goes down.", "when", "time", [["although", "wrong-relation"], ["unless", "wrong-relation"]], "The lamp and the sunset happen at the same time."),
  C("steps", "Tomás read the instructions slowly ___ he wouldn't miss a step.", "so", "purpose", [["although", "wrong-relation"], ["unless", "wrong-relation"]], "Reading slowly has a purpose: not missing a step."),
  C("fridays", "The museum is free on Fridays, ___ it is busiest then.", "so", "result", [["because", "reversed"], ["unless", "wrong-relation"]], "The crowds are the result of free entry."),
  C("coach", "Sami couldn't hear the coach ___ the crowd was cheering so loudly.", "because", "cause", [["although", "wrong-relation"], ["so", "reversed"]], "The loud crowd is the reason he couldn't hear."),
];

// ---------------------------------------------------------------- L1 combining
export interface CombineItem { id: string; notes: readonly string[]; answer: string; distractors: readonly Tagged[]; why: string }
const K = (id: string, notes: string[], answer: string, d: [string, Tag][], why: string): CombineItem =>
  ({ id, notes, answer, distractors: d.map(([t, tag]) => ({ text: t, tag })), why });

/** Choose the one sentence that keeps every idea and links them correctly. Each distractor has a definite error. */
export const COMBINE: readonly CombineItem[] = [
  K("bakeoff", ["The bake-off starts at noon.", "Ovens are provided.", "Bring your own apron."], "The bake-off starts at noon; ovens are provided, but bring your own apron.", [
    ["The bake-off starts at noon, ovens are provided, bring your own apron.", "comma-splice"],
    ["The bake-off starts at noon ovens are provided bring your own apron.", "run-on"],
    ["The bake-off starts at noon, but bring your own apron.", "info-loss"],
  ], "Three ideas stay: noon, ovens, apron. A semicolon joins two full sentences; but marks the contrast."),
  K("concert", ["The concert was moved indoors.", "The forecast said heavy rain."], "The concert was moved indoors because the forecast said heavy rain.", [
    ["The concert was moved indoors, so the forecast said heavy rain.", "reversed"],
    ["The concert was moved indoors, the forecast said heavy rain.", "comma-splice"],
    ["Although the forecast said heavy rain, the concert was moved indoors.", "meaning-shift"],
  ], "The forecast is the reason for the move: because."),
  K("chain", ["Kenji fixed the bike chain.", "He used a borrowed tool.", "The shop was closed."], "Because the shop was closed, Kenji fixed the bike chain with a borrowed tool.", [
    ["Kenji fixed the bike chain with a borrowed tool, the shop was closed.", "comma-splice"],
    ["Kenji fixed the bike chain with a borrowed tool, so the shop was closed.", "reversed"],
    ["Because the shop was closed, Kenji fixed the bike chain.", "info-loss"],
  ], "The closed shop is the reason; the borrowed tool must stay."),
  K("garden", ["The garden needs water.", "It hasn't rained for two weeks."], "The garden needs water because it hasn't rained for two weeks.", [
    ["The garden needs water, it hasn't rained for two weeks.", "comma-splice"],
    ["The garden needs water it hasn't rained for two weeks.", "run-on"],
    ["The garden needs water unless it hasn't rained for two weeks.", "meaning-shift"],
  ], "No rain is the reason the garden needs water: because."),
  K("museum", ["The museum opens at nine.", "The café opens at ten."], "The museum opens at nine, but the café opens at ten.", [
    ["The museum opens at nine, the café opens at ten.", "comma-splice"],
    ["The museum opens at nine because the café opens at ten.", "meaning-shift"],
    ["The museum and the café open at nine.", "info-loss"],
  ], "Two different times: but shows the difference, and both times stay."),
  K("bus", ["Ana missed the bus.", "She walked to school.", "She was only five minutes late."], "Ana missed the bus and walked to school, but she was only five minutes late.", [
    ["Ana missed the bus, she walked to school, she was only five minutes late.", "comma-splice"],
    ["Ana missed the bus because she walked to school, but she was only five minutes late.", "reversed"],
    ["Ana missed the bus, but she was only five minutes late.", "info-loss"],
  ], "Missing the bus came first, then the walk; being only a little late is the surprise."),
  K("closed", ["The bridge was closed.", "Drivers took the ferry."], "The bridge was closed, so drivers took the ferry.", [
    ["The bridge was closed drivers took the ferry.", "run-on"],
    ["The bridge was closed because drivers took the ferry.", "reversed"],
    ["The bridge was closed, drivers took the ferry.", "comma-splice"],
  ], "Taking the ferry is the result of the closed bridge: so."),
  K("ramp", ["The skate ramp is open again.", "Helmets are required.", "The lights go off at eight."], "The skate ramp is open again; helmets are required, and the lights go off at eight.", [
    ["The skate ramp is open again helmets are required the lights go off at eight.", "run-on"],
    ["The skate ramp is open again, helmets are required, the lights go off at eight.", "comma-splice"],
    ["The skate ramp is open again, and helmets are required.", "info-loss"],
  ], "Three facts stay; a semicolon and and join the full sentences."),
  K("crabs", ["The tide-pool survey found 14 crabs.", "Last year it found 30."], "The tide-pool survey found 14 crabs, but last year it found 30.", [
    ["The tide-pool survey found 14 crabs, last year it found 30.", "comma-splice"],
    ["The tide-pool survey found 14 crabs because last year it found 30.", "meaning-shift"],
    ["The tide-pool survey found fewer crabs than last year.", "info-loss"],
  ], "Two numbers to compare: but shows the change, and both numbers stay."),
  K("drum", ["Rumble wanted to join the band.", "He didn't own an instrument.", "He borrowed a drum."], "Rumble wanted to join the band but didn't own an instrument, so he borrowed a drum.", [
    ["Rumble wanted to join the band, he didn't own an instrument, he borrowed a drum.", "comma-splice"],
    ["Rumble wanted to join the band because he didn't own an instrument, so he borrowed a drum.", "meaning-shift"],
    ["Rumble wanted to join the band, so he borrowed a drum.", "info-loss"],
  ], "No instrument is the problem (but); borrowing a drum is the result (so)."),
  K("cans", ["The recycling bins are full.", "Collection is on Monday.", "Please keep your cans at home until then."], "The recycling bins are full, and collection is on Monday, so please keep your cans at home until then.", [
    ["The recycling bins are full, collection is on Monday, please keep your cans at home until then.", "comma-splice"],
    ["Although the recycling bins are full, collection is on Monday, so please keep your cans at home until then.", "meaning-shift"],
    ["The recycling bins are full, so please keep your cans at home until then.", "info-loss"],
  ], "Keep every fact (full bins, Monday); keeping cans at home is the result: so."),
  K("spelling", ["Priya won the spelling bee.", "She had practiced every evening."], "Priya won the spelling bee because she had practiced every evening.", [
    ["Priya won the spelling bee, she had practiced every evening.", "comma-splice"],
    ["Priya won the spelling bee, so she had practiced every evening.", "reversed"],
    ["Priya won the spelling bee although she had practiced every evening.", "wrong-relation"],
  ], "Practicing is the reason for the win: because."),
];

/**
 * Clause cards: put the cards in order to combine the notes into one sentence. Only the first card has a capital and
 * only the last has the period, so exactly one order works (authored alternatives: none). One extra card is a wrong
 * connective (the misconception: reversed or wrong relationship).
 */
/** `alternatives`: other accepted orders. Always empty (tested): the cards are written so only one order works. */
export interface OrderItem { id: string; notes: readonly string[]; cards: readonly string[]; decoy: Tagged; why: string; alternatives: readonly (readonly string[])[] }
const O = (id: string, notes: string[], cards: string[], decoy: string, tag: Tag, why: string): OrderItem => ({ id, notes, cards, decoy: { text: decoy, tag }, why, alternatives: [] });
export const ORDERS: readonly OrderItem[] = [
  O("lighthouse", ["The path was steep.", "The walkers still reached the lighthouse before dark."], ["The walkers reached the lighthouse", "before dark,", "although", "the path was steep."], "because", "wrong-relation", "The steep path is a surprise, so the link is although."),
  O("kites", ["The wind was too strong.", "The kite festival moved into the gym."], ["The kite festival moved", "into the gym", "because", "the wind was too strong."], "so", "reversed", "The strong wind is the reason, so the link is because."),
  O("lawn", ["The hall was booked.", "The choir practiced on the lawn."], ["The choir practiced", "on the lawn", "because", "the hall was booked."], "unless", "wrong-relation", "The booked hall is the reason, so the link is because."),
  O("sunrise", ["Kofi set his alarm for six.", "He wanted to see the sunrise."], ["Kofi set his alarm", "for six", "because", "he wanted to see the sunrise."], "although", "wrong-relation", "Seeing the sunrise is his reason, so the link is because."),
  O("canoe", ["Wear a life jacket.", "Then you can take the canoe out on the bay."], ["You can take the canoe", "out on the bay", "if", "you wear a life jacket."], "unless", "reversed", "The life jacket is the condition, so the link is if."),
  O("final", ["Zara's team lost the first game.", "They still won the final on Saturday."], ["Zara's team won the final", "on Saturday", "although", "they lost the first game."], "because", "wrong-relation", "Losing first makes the win a surprise, so the link is although."),
  O("gate", ["Someone left the gate open.", "The goats got into the garden last night."], ["The goats got into the garden", "last night", "because", "someone left the gate open."], "so", "reversed", "The open gate is the reason, so the link is because."),
  O("bench", ["The museum was crowded.", "Nia still found a quiet bench near the fossils."], ["Nia found a quiet bench", "near the fossils", "although", "the museum was crowded."], "because", "wrong-relation", "A quiet bench in a crowd is a surprise, so the link is although."),
  O("dry", ["The skate ramp stays closed this week.", "It will open when the wood is dry."], ["The skate ramp stays closed", "this week", "until", "the wood is dry."], "because", "wrong-relation", "It stays closed up to a time: until."),
  O("ferry", ["Omar checked the timetable twice.", "He still missed the early ferry on Monday."], ["Omar missed the early ferry", "on Monday", "although", "he checked the timetable twice."], "because", "wrong-relation", "Checking twice and still missing it is a surprise: although."),
  O("power", ["The power went out.", "The lighthouse keeper lit an oil lamp."], ["The lighthouse keeper lit", "an oil lamp", "because", "the power went out."], "unless", "wrong-relation", "The power cut is the reason, so the link is because."),
  O("window", ["Lena moved the plant to the window.", "She wanted it to get more light."], ["Lena moved the plant", "to the window", "so", "it would get more light."], "although", "wrong-relation", "More light is her purpose, so the link is so."),
];

// ---------------------------------------------------------------- L2 modifiers
/**
 * A sentence whose describing phrase sits next to the wrong word, read literally it says something absurd. `chunks`
 * split it for tapping (`wrong` = the misplaced phrase); `literal` is Hoot's literal reading; `fix` is the clear
 * rewrite, with a rewrite that keeps the wrong attachment and one that changes who does what.
 */
export interface ModifierItem { id: string; chunks: readonly string[]; wrong: number; literal: string; target: string; fix: string; distractors: readonly Tagged[] }
const M = (id: string, chunks: string[], wrong: number, literal: string, target: string, fix: string, d: [string, Tag][]): ModifierItem =>
  ({ id, chunks, wrong, literal, target, fix, distractors: d.map(([t, tag]) => ({ text: t, tag })) });
export const MODIFIERS: readonly ModifierItem[] = [
  M("barking", ["Barking at the mail cart,", "Kenji walked his dog", "to the beach."], 0, "Kenji was barking at the mail cart.", "the dog", "Kenji walked his dog to the beach while it barked at the mail cart.", [
    ["Kenji, barking at the mail cart, walked his dog to the beach.", "still-misplaced"], ["Barking at the mail cart, the dog walked Kenji to the beach.", "meaning-shift"]]),
  M("plates", ["Ana served cupcakes", "to the guests", "on paper plates."], 2, "The guests were sitting on paper plates.", "the cupcakes", "Ana served cupcakes on paper plates to the guests.", [
    ["Ana, on paper plates, served cupcakes to the guests.", "still-misplaced"], ["The guests served cupcakes to Ana on paper plates.", "meaning-shift"]]),
  M("lanterns", ["Hanging from the ceiling,", "Mei admired", "the paper lanterns."], 0, "Mei was hanging from the ceiling.", "the lanterns", "Mei admired the paper lanterns hanging from the ceiling.", [
    ["Mei, hanging from the ceiling, admired the paper lanterns.", "still-misplaced"], ["Hanging from the ceiling, the paper lanterns admired Mei.", "meaning-shift"]]),
  M("shell", ["Raj found", "a shiny shell", "walking along the shore."], 2, "The shell was walking along the shore.", "Raj", "Walking along the shore, Raj found a shiny shell.", [
    ["A shiny shell, walking along the shore, was found by Raj.", "still-misplaced"], ["Walking along the shore, a shiny shell found Raj.", "meaning-shift"]]),
  M("cold", ["The coach handed out water bottles", "to the players", "that were ice cold."], 2, "The players were ice cold.", "the water bottles", "The coach handed out ice-cold water bottles to the players.", [
    ["The coach, ice cold, handed out water bottles to the players.", "still-misplaced"], ["The players handed out ice-cold water bottles to the coach.", "meaning-shift"]]),
  M("wrapped", ["Wrapped in shiny paper,", "Zara gave her brother", "the gift."], 0, "Zara was wrapped in shiny paper.", "the gift", "Zara gave her brother the gift wrapped in shiny paper.", [
    ["Zara, wrapped in shiny paper, gave her brother the gift.", "still-misplaced"], ["Wrapped in shiny paper, her brother gave Zara the gift.", "meaning-shift"]]),
  M("binoculars", ["Omar saw", "a pod of dolphins", "looking through his binoculars."], 2, "The dolphins were looking through his binoculars.", "Omar", "Looking through his binoculars, Omar saw a pod of dolphins.", [
    ["A pod of dolphins, looking through his binoculars, was seen by Omar.", "still-misplaced"], ["Looking through his binoculars, a pod of dolphins saw Omar.", "meaning-shift"]]),
  M("sandwich", ["Running late for the ferry,", "Nia's sandwich was left", "on the kitchen table."], 0, "The sandwich was running late for the ferry.", "Nia", "Running late for the ferry, Nia left her sandwich on the kitchen table.", [
    ["Nia's sandwich, running late for the ferry, was left on the kitchen table.", "still-misplaced"], ["Nia's sandwich made her late for the ferry.", "meaning-shift"]]),
  M("bell", ["Mina bought a bike", "from a neighbor", "with a squeaky bell."], 2, "The neighbor had a squeaky bell.", "the bike", "Mina bought a bike with a squeaky bell from a neighbor.", [
    ["Mina, with a squeaky bell, bought a bike from a neighbor.", "still-misplaced"], ["A neighbor bought a bike with a squeaky bell from Mina.", "meaning-shift"]]),
  M("bed", ["Tomás read", "about the shipwreck", "lying in bed."], 2, "The shipwreck was lying in bed.", "Tomás", "Lying in bed, Tomás read about the shipwreck.", [
    ["The shipwreck, lying in bed, was read about by Tomás.", "still-misplaced"], ["Tomás read about the shipwreck before lying in bed.", "meaning-shift"]]),
  M("box", ["After finishing the puzzle,", "the box was put away", "by Lena."], 0, "The box finished the puzzle.", "Lena", "After finishing the puzzle, Lena put the box away.", [
    ["The box, after finishing the puzzle, was put away by Lena.", "still-misplaced"], ["After Lena put the box away, she finished the puzzle.", "meaning-shift"]]),
  M("flashlight", ["The ranger showed the children", "a turtle", "using a flashlight."], 2, "The turtle was using a flashlight.", "the ranger", "Using a flashlight, the ranger showed the children a turtle.", [
    ["The ranger showed the children, using a flashlight, a turtle.", "still-misplaced"], ["Using a flashlight, the children showed the ranger a turtle.", "meaning-shift"]]),
  M("blue", ["Painted bright blue,", "Kofi parked his boat", "by the dock."], 0, "Kofi was painted bright blue.", "the boat", "Kofi parked his boat, which was painted bright blue, by the dock.", [
    ["Kofi, painted bright blue, parked his boat by the dock.", "still-misplaced"], ["Painted bright blue, the dock was where Kofi parked his boat.", "meaning-shift"]]),
  M("melted", ["Melted by the sun,", "Jonah threw away", "the chocolate bar."], 0, "Jonah was melted by the sun.", "the chocolate bar", "Jonah threw away the chocolate bar melted by the sun.", [
    ["Jonah, melted by the sun, threw away the chocolate bar.", "still-misplaced"], ["Jonah melted the chocolate bar in the sun and threw it away.", "meaning-shift"]]),
  M("sandals", ["Aiyana noticed", "a crab on the rocks", "wearing her new sandals."], 2, "The crab was wearing her new sandals.", "Aiyana", "Wearing her new sandals, Aiyana noticed a crab on the rocks.", [
    ["A crab on the rocks, wearing her new sandals, was noticed by Aiyana.", "still-misplaced"], ["Wearing her new sandals, a crab noticed Aiyana on the rocks.", "meaning-shift"]]),
  M("loaf", ["The baker gave a loaf", "to the boy", "still warm from the oven."], 2, "The boy was still warm from the oven.", "the loaf", "The baker gave the boy a loaf still warm from the oven.", [
    ["Still warm from the oven, the baker gave a loaf to the boy.", "still-misplaced"], ["The boy gave the baker a loaf still warm from the oven.", "meaning-shift"]]),
];

// ---------------------------------------------------------------- L3 pronoun reference
/**
 * A sentence with one or two pronouns that could point to two people or things. `vague` = chunk indices of the
 * unclear pronouns; clear pronouns (including singular "they" with one antecedent) are never marked. Rewrites need
 * the writer's meaning (`means`), because without it two clear rewrites could both be right.
 */
export interface PronounItem { id: string; chunks: readonly string[]; vague: readonly number[]; could: readonly string[]; means: string; fix: string; distractors: readonly Tagged[] }
const P = (id: string, chunks: string[], vague: number[], could: string[], means: string, fix: string, d: [string, Tag][]): PronounItem =>
  ({ id, chunks, vague, could, means, fix, distractors: d.map(([t, tag]) => ({ text: t, tag })) });
export const PRONOUNS: readonly PronounItem[] = [
  P("map", ["When Mina met Lucia", "at the library,", "she", "gave", "her", "a map."], [2, 4], ["Mina", "Lucia"], "Mina gave Lucia the map.", "When Mina met Lucia at the library, Mina gave her a map.", [
    ["When Mina met Lucia at the library, she gave a map to her.", "still-ambiguous"], ["When Mina met Lucia at the library, Lucia gave her a map.", "meaning-shift"]]),
  P("bag", ["The bus driver", "told Omar that", "his", "bag was still on the seat."], [2], ["the driver", "Omar"], "The bag is Omar's.", "The bus driver told Omar, \"Your bag is still on the seat.\"", [
    ["The bus driver told Omar his bag was still on the seat.", "still-ambiguous"], ["The bus driver told Omar that the driver's own bag was still on the seat.", "meaning-shift"]]),
  P("bike", ["Kofi asked Raj if", "he", "could borrow", "his", "bike."], [1, 3], ["Kofi", "Raj"], "Kofi wants to borrow Raj's bike.", "Kofi asked Raj, \"Can I borrow your bike?\"", [
    ["Kofi asked Raj whether he could borrow his bike.", "still-ambiguous"], ["Kofi asked Raj, \"Can you borrow my bike?\"", "meaning-shift"]]),
  P("vase", ["Lena put the vase", "on the shelf, and then", "it", "fell."], [2], ["the vase", "the shelf"], "The vase fell.", "Lena put the vase on the shelf, and then the vase fell.", [
    ["Lena put the vase on the shelf, and then that fell.", "still-ambiguous"], ["Lena put the vase on the shelf, and then the shelf fell.", "meaning-shift"]]),
  P("poster", ["Zara told", "her", "sister that", "she", "had won the poster contest."], [3], ["Zara", "her sister"], "The sister won.", "Zara told her sister, \"You won the poster contest!\"", [
    ["Zara told her sister she had won the poster contest.", "still-ambiguous"], ["Zara told her sister, \"I won the poster contest!\"", "meaning-shift"]]),
  P("dock", ["When the ferry", "hit the dock,", "it", "was badly scratched."], [2], ["the ferry", "the dock"], "The ferry was scratched.", "The ferry was badly scratched when it hit the dock.", [
    ["When the ferry hit the dock, it got badly scratched.", "still-ambiguous"], ["When the ferry hit the dock, the dock was badly scratched.", "meaning-shift"]]),
  P("list", ["Nia and Mei", "went to the market, but", "she", "forgot the shopping list."], [2], ["Nia", "Mei"], "Mei forgot the list.", "Nia and Mei went to the market, but Mei forgot the shopping list.", [
    ["Nia and Mei went to the market, but she had forgotten the shopping list.", "still-ambiguous"], ["Nia and Mei went to the market, but Nia forgot the shopping list.", "meaning-shift"]]),
  P("fair", ["The teachers met", "with the students after", "they", "finished the science fair."], [2], ["the teachers", "the students"], "The students had finished the science fair.", "After the students finished the science fair, the teachers met with them.", [
    ["The teachers met with the students once they had finished the science fair.", "still-ambiguous"], ["After the teachers finished the science fair, they met with the students.", "meaning-shift"]]),
  P("speaker", ["Tomás put", "his", "phone on the speaker, and then", "it", "stopped working."], [3], ["the phone", "the speaker"], "The speaker stopped working.", "Tomás put his phone on the speaker, and then the speaker stopped working.", [
    ["Tomás put his phone on the speaker, and then that stopped working.", "still-ambiguous"], ["Tomás put his phone on the speaker, and then the phone stopped working.", "meaning-shift"]]),
  P("idea", ["The coach told Sami that", "his", "idea would help the team."], [1], ["the coach", "Sami"], "It was Sami's idea.", "The coach told Sami, \"Your idea will help the team.\"", [
    ["The coach told Sami that his idea was going to help the team.", "still-ambiguous"], ["The coach told Sami, \"My idea will help the team.\"", "meaning-shift"]]),
  P("cousin", ["Jonah emailed", "his", "cousin after", "he", "moved to the island."], [3], ["Jonah", "his cousin"], "The cousin moved to the island.", "After his cousin moved to the island, Jonah emailed him.", [
    ["After he moved to the island, Jonah emailed his cousin.", "still-ambiguous"], ["After Jonah moved to the island, he emailed his cousin.", "meaning-shift"]]),
  P("vacation", ["Kenji wrote to Omar while", "he", "was on vacation."], [1], ["Kenji", "Omar"], "Omar was on vacation.", "While Omar was on vacation, Kenji wrote to him.", [
    ["Kenji wrote to Omar when he was on vacation.", "still-ambiguous"], ["While Kenji was on vacation, he wrote to Omar.", "meaning-shift"]]),
  P("table", ["When the cat", "jumped onto the table,", "it", "wobbled."], [2], ["the cat", "the table"], "The table wobbled.", "The table wobbled when the cat jumped onto it.", [
    ["When the cat jumped onto the table, it started to wobble.", "still-ambiguous"], ["When the cat jumped onto the table, the cat wobbled.", "meaning-shift"]]),
  P("painting", ["Ana told Mei that", "her", "painting was in the show."], [1], ["Ana", "Mei"], "The painting is Ana's.", "Ana told Mei, \"My painting is in the show.\"", [
    ["Ana told Mei her painting would be in the show.", "still-ambiguous"], ["Ana told Mei, \"Your painting is in the show.\"", "meaning-shift"]]),
  P("music", ["The new student said", "they", "liked the art room, but Mina told Lena that", "she", "preferred the music room."], [3], ["Mina", "Lena"], "Mina prefers the music room.", "The new student said they liked the art room, but Mina told Lena, \"I prefer the music room.\"", [
    ["The new student said they liked the art room, but Mina told Lena she preferred the music room.", "still-ambiguous"], ["The new student said they liked the art room, but Mina told Lena, \"You prefer the music room.\"", "meaning-shift"]]),
  P("puppy", ["The puppy chased", "the kitten until", "it", "got tired."], [2], ["the puppy", "the kitten"], "The puppy got tired.", "The puppy chased the kitten until the puppy got tired.", [
    ["The puppy chased the kitten until it was tired.", "still-ambiguous"], ["The puppy chased the kitten until the kitten got tired.", "meaning-shift"]]),
];

// ---------------------------------------------------------------- L4 concise wording
/**
 * Tap the parts that repeat an idea. `cut` = chunk indices; every chunk whose removal keeps both the meaning and the
 * grammar is in `cut` (reviewer check), so no "also acceptable" chunk is left out. `why` gives each cut its reason.
 */
export interface CutItem { id: string; chunks: readonly string[]; cut: readonly number[]; why: readonly string[] }
const X = (id: string, chunks: string[], cut: number[], why: string[]): CutItem => ({ id, chunks, cut, why });
export const CUTS: readonly CutItem[] = [
  X("gifts", ["At 3 p.m.", "in the afternoon,", "the club handed out", "free", "gifts."], [1, 3], ["3 p.m. is already in the afternoon.", "A gift is already free."]),
  X("locker", ["The twins shared one", "single", "locker", "all year."], [1], ["One already means single."]),
  X("returned", ["Raj returned", "back", "the library book", "on Tuesday."], [1], ["Returned already means brought back."]),
  X("opinion", ["In my", "personal", "opinion,", "the new bus timetable", "is easier to read."], [1], ["My opinion is already personal."]),
  X("club", ["The garden club will meet", "together", "at noon", "to plan for spring."], [1], ["Meet already means come together."]),
  X("visitor", ["Each", "and every", "visitor must sign", "the guest book."], [1], ["Each already means every one."]),
  X("outcome", ["The vote's", "final", "outcome was announced", "at 6 p.m.", "tonight."], [1], ["An outcome is already final. (Tonight stays: it says which day.)"]),
  X("salty", ["The soup was too salty,", "so", "as a result", "Mei added more water."], [2], ["So already says it was a result."]),
  X("song", ["We'll repeat", "the song", "again", "at the end of the concert."], [2], ["Repeat already means do again."]),
  X("eye", ["The lighthouse is visible", "to the eye", "from the far end", "of the beach."], [1], ["Visible already means seen by the eye."]),
  X("circle", ["Kofi built a kite", "with a", "round", "circle painted on it."], [2], ["A circle is already round."]),
  X("evening", ["The ferry will return", "back", "to the dock", "at 5 p.m.", "in the evening."], [1, 4], ["Return already means come back.", "5 p.m. is already in the evening."]),
  X("antique", ["Sami said the", "old", "antique clock", "still keeps good time."], [1], ["An antique is already old."]),
  X("jointly", ["Both halves of the class", "worked together", "jointly", "on the mural."], [2], ["Together already means jointly."]),
];

/** Choose the version that keeps every fact in the fewest words: one cuts a fact, one stays wordy. */
export interface ConciseItem { id: string; text: string; answer: string; distractors: readonly Tagged[]; why: string }
const Q = (id: string, text: string, answer: string, loss: string, wordy: string, why: string): ConciseItem =>
  ({ id, text, answer, distractors: [{ text: loss, tag: "info-loss" }, { text: wordy, tag: "wordy" }], why });
export const CONCISE: readonly ConciseItem[] = [
  Q("hall", "Due to the fact that the hall was booked, the choir practiced outside.", "Because the hall was booked, the choir practiced outside.", "The choir practiced outside.", "Owing to the fact that the hall had been booked, the choir practiced outside.", "Due to the fact that → Because"),
  Q("rain", "In the event that it rains, the market will move into the school gym.", "If it rains, the market will move into the school gym.", "The market will move into the school gym.", "In the case that it should rain, the market will move into the school gym.", "In the event that → If"),
  Q("repairs", "At this point in time, the skate ramp is closed for repairs.", "The skate ramp is now closed for repairs.", "The skate ramp is closed.", "At the present moment in time, the skate ramp is closed for repairs.", "At this point in time → now"),
  Q("engine", "The reason why the ferry was late is because the engine needed fixing.", "The ferry was late because the engine needed fixing.", "The ferry was late.", "The reason the ferry was late is due to the fact that the engine needed fixing.", "The reason why … is because → because"),
  Q("robotics", "Kenji made the decision to join the robotics club.", "Kenji decided to join the robotics club.", "Kenji joined a club.", "Kenji came to the decision that he would join the robotics club.", "made the decision to → decided to"),
  Q("ocean", "The library has a large number of books about the ocean.", "The library has many books about the ocean.", "The library has books.", "The library has a very large number of books on the subject of the ocean.", "a large number of → many"),
  Q("pie", "Mei is of the opinion that the bake-off should have a pie category.", "Mei thinks the bake-off should have a pie category.", "Mei wants a bake-off.", "Mei holds the opinion and belief that the bake-off should have a pie category.", "is of the opinion that → thinks"),
  Q("survey", "The tide-pool survey was conducted by the students for the purpose of counting crabs.", "The students did the tide-pool survey to count crabs.", "The students did a survey.", "The students conducted the tide-pool survey with the purpose and aim of counting crabs.", "for the purpose of counting → to count"),
  Q("belongings", "Please make sure that you take all of your belongings with you when you leave the bus.", "Please take all your belongings when you leave the bus.", "Please leave the bus.", "Please be sure to make certain that you take all of your belongings with you when you leave the bus.", "make sure that you take … with you → take"),
  Q("volunteers", "There are three volunteers who help in the garden on Saturdays.", "Three volunteers help in the garden on Saturdays.", "Volunteers help in the garden.", "There are three of the volunteers who give help in the garden on Saturdays.", "There are three volunteers who help → Three volunteers help"),
  Q("glass", "The new bins are for the purpose of recycling glass.", "The new bins are for recycling glass.", "The bins are new.", "The new bins are there for the purpose and use of recycling glass.", "for the purpose of → for"),
  Q("tides", "Omar gave a presentation in which he explained how the tides work.", "In his presentation, Omar explained how the tides work.", "Omar explained the tides.", "Omar gave a presentation in which he gave an explanation of the way that the tides work.", "gave a presentation in which he explained → in his presentation, explained"),
];

// ---------------------------------------------------------------- L7 active and passive voice
/** Choose the version that fits a stated purpose. Passive is never "always wrong": the purpose decides. */
export interface PurposeItem { id: string; purpose: string; answer: string; passive: boolean; doer: string; thing: string; distractors: readonly Tagged[] }
const V = (id: string, purpose: string, passive: boolean, doer: string, thing: string, answer: string, d: [string, Tag][]): PurposeItem =>
  ({ id, purpose, passive, doer, thing, answer, distractors: d.map(([t, tag]) => ({ text: t, tag })) });
export const PURPOSES: readonly PurposeItem[] = [
  V("window", "Focus on the window, not on what broke it.", true, "the storm", "the window", "The window was broken during the storm.", [["The storm broke the window.", "wrong-focus"], ["During the storm, something broke the window.", "wrong-focus"]]),
  V("cleanup", "Make it clear that the volunteers did the cleanup.", false, "the volunteers", "the beach", "The volunteers cleaned up the beach on Saturday.", [["The beach was cleaned up on Saturday.", "wrong-focus"], ["Cleaning up the beach happened on Saturday.", "wrong-focus"]]),
  V("map", "Nobody knows who took the map. Report only what happened to it.", true, "an unknown person", "the map", "The old map was taken from the museum last night.", [["A thief from the harbor took the old map from the museum last night.", "meaning-shift"], ["The museum took the old map last night.", "meaning-shift"]]),
  V("decision", "Make it clear who made the decision: the coach.", false, "the coach", "the game", "The coach moved the game to Sunday.", [["The game was moved to Sunday.", "wrong-focus"], ["The game was moved to Sunday by the weather.", "meaning-shift"]]),
  V("samples", "A science report: focus on what was done, not on who did it.", true, "the students", "the water samples", "The water samples were collected at low tide.", [["We collected the water samples at low tide.", "wrong-focus"], ["At low tide, the students collected the water samples.", "wrong-focus"]]),
  V("mural", "Give credit to the student who painted the mural.", false, "Kofi", "the mural", "Kofi painted the mural by the library door.", [["The mural by the library door was painted.", "wrong-focus"], ["A mural appeared by the library door.", "wrong-focus"]]),
  V("gate", "A safety notice: the important thing is the gate, not who locks it.", true, "the caretaker", "the gate", "The gate is locked every night at nine.", [["The caretaker locks the gate every night at nine.", "wrong-focus"], ["Every night at nine, someone locks the gate.", "wrong-focus"]]),
  V("vase", "Report what happened to the vase without blaming anyone.", true, "Rumble", "the vase", "The vase was knocked off the shelf.", [["Rumble knocked the vase off the shelf.", "wrong-focus"], ["Rumble's tail knocked the vase off the shelf.", "wrong-focus"]]),
  V("award", "Make it clear who won the award: Priya's team.", false, "Priya's team", "the award", "Priya's team won the design award.", [["The design award was won.", "wrong-focus"], ["The design award was given out.", "wrong-focus"]]),
  V("bridge", "The news is the bridge, not the builders.", true, "the builders", "the bridge", "The new bridge was finished on Friday.", [["The builders finished the new bridge on Friday.", "wrong-focus"], ["On Friday, the builders finished the new bridge.", "wrong-focus"]]),
  V("fair", "Show that the students organized the fair themselves.", false, "the students", "the fair", "The students organized the science fair themselves.", [["The science fair was organized.", "wrong-focus"], ["The science fair was organized by the school.", "meaning-shift"]]),
  V("bread", "A menu note: what matters is the bread, not the baker.", true, "the baker", "the bread", "All our bread is baked fresh every morning.", [["Our baker bakes all the bread fresh every morning.", "wrong-focus"], ["Every morning, Mei bakes all our bread fresh.", "wrong-focus"]]),
];

/** Fix an inappropriate shift from active to passive (or back) in one sentence. */
export interface ShiftItem { id: string; text: string; answer: string; doer: string; distractors: readonly Tagged[] }
const S = (id: string, text: string, doer: string, answer: string, flipped: string, lost: string): ShiftItem =>
  ({ id, text, doer, answer, distractors: [{ text: flipped, tag: "shift" }, { text: lost, tag: "shift" }] });
export const SHIFTS: readonly ShiftItem[] = [
  S("fence", "Tomás painted the fence, and then the gate was painted by him.", "Tomás", "Tomás painted the fence and then the gate.", "The fence was painted by Tomás, and then he painted the gate.", "Tomás painted the fence, and then the gate was painted."),
  S("poem", "Nia wrote the poem, and it was read aloud by her at the assembly.", "Nia", "Nia wrote the poem and read it aloud at the assembly.", "The poem was written by Nia, and she read it aloud at the assembly.", "Nia wrote the poem, and it was read aloud at the assembly."),
  S("seeds", "The class planted the seeds, and then the beds were watered by them.", "the class", "The class planted the seeds and then watered the beds.", "The seeds were planted by the class, and then they watered the beds.", "The class planted the seeds, and then the beds were watered."),
  S("tent", "Kenji packed the tent, and the stove was carried to the car by him.", "Kenji", "Kenji packed the tent and carried the stove to the car.", "The tent was packed by Kenji, and he carried the stove to the car.", "Kenji packed the tent, and the stove was carried to the car."),
  S("cans", "The volunteers sorted the cans, and the bottles were washed by them.", "the volunteers", "The volunteers sorted the cans and washed the bottles.", "The cans were sorted by the volunteers, and they washed the bottles.", "The volunteers sorted the cans, and the bottles were washed."),
  S("jam", "Mei baked the bread, and the jam was made by her too.", "Mei", "Mei baked the bread and made the jam too.", "The bread was baked by Mei, and she made the jam too.", "Mei baked the bread, and the jam was made too."),
  S("robot", "Our team built the robot, and the code was written by us as well.", "our team", "Our team built the robot and wrote the code as well.", "The robot was built by our team, and we wrote the code as well.", "Our team built the robot, and the code was written as well."),
  S("kitten", "Zara found the lost kitten, and it was carried home by her.", "Zara", "Zara found the lost kitten and carried it home.", "The lost kitten was found by Zara, and she carried it home.", "Zara found the lost kitten, and it was carried home."),
  S("sign", "The ranger checked the trail, and the broken sign was fixed by him.", "the ranger", "The ranger checked the trail and fixed the broken sign.", "The trail was checked by the ranger, and he fixed the broken sign.", "The ranger checked the trail, and the broken sign was fixed."),
  S("pools", "Omar measured the tide pools, and the crabs were counted by him.", "Omar", "Omar measured the tide pools and counted the crabs.", "The tide pools were measured by Omar, and he counted the crabs.", "Omar measured the tide pools, and the crabs were counted."),
  S("poster", "Priya designed the poster, and the copies were printed by her at the library.", "Priya", "Priya designed the poster and printed the copies at the library.", "The poster was designed by Priya, and she printed the copies at the library.", "Priya designed the poster, and the copies were printed at the library."),
  S("song", "The choir learned the song, and it was performed by them at the harbor festival.", "the choir", "The choir learned the song and performed it at the harbor festival.", "The song was learned by the choir, and they performed it at the harbor festival.", "The choir learned the song, and it was performed at the harbor festival."),
  S("letters", "The letters were sorted by the post office, and then the post office delivered them.", "the post office", "The post office sorted the letters and then delivered them.", "The post office sorted the letters, and then they were delivered by it.", "The letters were sorted, and then the post office delivered them."),
];
