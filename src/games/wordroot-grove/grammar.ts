import type { Gloss, Tag } from "./morphology";

/**
 * Wordroot Grove — apostrophes (level 8) and commonly confused words (level 9). DATA only, written for BrainZippy.
 * Every item is chosen IN CONTEXT (a picture or a sentence), never as an isolated label (docs §10, Writing Next).
 * Sentences are built so only one option is standard written English; items that usage guides dispute are avoided
 * (ENGLISH_PATH R4).
 */

// ---------------------------------------------------------------- L8 apostrophes
/** Picture items: one owner with several things, or several owners with one thing each (owner icons on screen). */
export interface OwnerPicture {
  id: string;
  owner: string;
  owners: string;
  thing: string;
  things: string;
}
const op = (owner: string, thing: string, owners = `${owner}s`, things = `${thing}s`): OwnerPicture => ({ id: owner, owner, owners, thing, things });
/** Owners and things are drawn in Paper Boat Post's picture style (reused art). */
export const OWNER_PICTURES: readonly OwnerPicture[] = [
  op("dog", "bone"), op("hen", "egg"), op("cat", "hat"), op("pig", "cap"), op("fox", "sock", "foxes"), op("duck", "bell"), op("goat", "bell"), op("frog", "drum"),
];

/** The three printed versions for a picture item with `many` owners. The first is right. */
export function ownerPhrases(o: OwnerPicture, many: boolean): [Gloss, Gloss, Gloss] {
  const one = `the ${o.owner}'s ${o.things}`;
  const pl = o.owners.endsWith("s") ? `the ${o.owners}' ${o.things}` : `the ${o.owners}'s ${o.things}`;
  const none = `the ${o.owners} ${o.things}`;
  return many
    ? [{ text: pl, tag: "plural-owner" }, { text: one, tag: "singular-owner" }, { text: none, tag: "no-apostrophe" }]
    : [{ text: one, tag: "singular-owner" }, { text: pl, tag: "plural-owner" }, { text: none, tag: "no-apostrophe" }];
}

export interface GapItem {
  id: string;
  /** "___" marks the gap. */
  text: string;
  answer: string;
  /** What the right answer shows (drives the first-miss strategy and praise). */
  kind: Tag;
  distractors: readonly Gloss[];
  why: string;
}
const g = (text: string, tag: Tag): Gloss => ({ text, tag });
const gap = (id: string, text: string, answer: string, kind: Tag, d: Gloss[], why: string): GapItem => ({ id, text, answer, kind, distractors: d, why });

export const APOSTROPHE_SENTENCES: readonly GapItem[] = [
  gap("chicks", "The bird fed ___ chicks.", "its", "its-possessive", [g("it's", "its-contraction"), g("its'", "plural-apostrophe")], "The chicks belong to the bird: its, with no apostrophe. It's would mean it is."),
  gap("raining", "___ raining again, so bring a coat.", "It's", "its-contraction", [g("Its", "its-possessive"), g("Its'", "plural-apostrophe")], "It is raining: it's, with the apostrophe standing in for the missing i."),
  gap("apples", "We bought six ___ at the market.", "apples", "no-apostrophe", [g("apple's", "plural-apostrophe"), g("apples'", "plural-apostrophe")], "Nothing belongs to the apples; there are just more than one: apples, no apostrophe."),
  gap("horses", "Three ___ are sleeping in the barn.", "horses", "no-apostrophe", [g("horse's", "plural-apostrophe"), g("horses'", "plural-apostrophe")], "Just more than one horse, nothing owned: horses, no apostrophe."),
  gap("puppies", "Four ___ played in the park.", "puppies", "no-apostrophe", [g("puppy's", "plural-apostrophe"), g("puppies'", "plural-apostrophe")], "Just more than one puppy, nothing owned: puppies, no apostrophe."),
  gap("coats", "The ___ coats hung in a long row.", "children's", "irregular", [g("childrens'", "irregular"), g("childrens", "irregular")], "Children is already plural without an s, so add 's: children's."),
  gap("relay", "The ___ team won the relay race.", "women's", "irregular", [g("womens'", "irregular"), g("womens", "irregular")], "Women is already plural without an s, so add 's: women's."),
  gap("cheese", "The ___ cheese was gone by morning.", "mice's", "irregular", [g("mices'", "irregular"), g("mices", "irregular")], "Mice is already plural without an s, so add 's: mice's."),
  gap("shoes", "The ___ shoes were lined up by the door.", "people's", "irregular", [g("peoples'", "irregular"), g("peoples", "irregular")], "People is already plural without an s, so add 's: people's."),
  gap("shoe", "I ___ find my left shoe.", "can't", "contraction", [g("cant", "no-apostrophe"), g("ca'nt", "contraction")], "Cannot squeezed together: can't. The apostrophe sits where the letters are missing."),
  gap("music", "Nia ___ like loud music.", "doesn't", "contraction", [g("doesnt", "no-apostrophe"), g("does'nt", "contraction")], "Does not squeezed together: doesn't. The apostrophe sits where the o is missing."),
  gap("beach", "___ going to the beach tomorrow.", "We're", "contraction", [g("Were", "no-apostrophe"), g("Wer'e", "contraction")], "We are squeezed together: we're. The apostrophe sits where the a is missing."),
  gap("hats", "Both ___ hats blew off in the wind.", "girls'", "plural-owner", [g("girl's", "singular-owner"), g("girls", "no-apostrophe")], "Both means two owners: girls already ends in s, so add ' after it: girls'."),
  gap("nests", "The two ___ wings were bright blue.", "birds'", "plural-owner", [g("bird's", "singular-owner"), g("birds", "no-apostrophe")], "Two owners: birds already ends in s, so add ' after it: birds'."),
  gap("bike", "___ bike has a bell and a basket.", "Kofi's", "singular-owner", [g("Kofis'", "plural-owner"), g("Kofis", "no-apostrophe")], "One owner, Kofi: add 's to show the bike is his: Kofi's."),
  gap("book", "This is ___ book, not mine.", "Sami's", "singular-owner", [g("Samis'", "plural-owner"), g("Samis", "no-apostrophe")], "One owner, Sami: add 's: Sami's."),
];

// ---------------------------------------------------------------- L9 commonly confused words
const cw = (id: string, text: string, answer: string, kind: Tag, d: Gloss[], why: string): GapItem => ({ id, text, answer, kind, distractors: d, why });
export const CONFUSED_ITEMS: readonly GapItem[] = [
  cw("backpacks", "___ backpacks are on the bus.", "Their", "their", [g("There", "there"), g("They're", "theyre")], "The backpacks belong to them: their. Try 'They are backpacks are on the bus.' It doesn't work, so not they're."),
  cw("books", "Put the books over ___.", "there", "there", [g("their", "their"), g("they're", "theyre")], "Over where? A place: there."),
  cw("zoo", "___ going to the zoo on Friday.", "They're", "theyre", [g("Their", "their"), g("There", "there")], "Try 'they are going to the zoo'. It works, so: they're."),
  cw("frog", "___ is a frog in the pond.", "There", "there", [g("Their", "their"), g("They're", "theyre")], "'There is' tells you something exists: there."),
  cw("helmets", "The players put on ___ helmets.", "their", "their", [g("there", "there"), g("they're", "theyre")], "The helmets belong to the players: their."),
  cw("party", "The twins said ___ coming to the party.", "they're", "theyre", [g("their", "their"), g("there", "there")], "Try 'they are coming'. It works, so: they're."),
  cw("park", "Is ___ a park near the school?", "there", "there", [g("their", "their"), g("they're", "theyre")], "'Is there' asks if something exists: there."),
  cw("tickets", "Kofi has ___ tickets for the show.", "two", "two", [g("to", "to"), g("too", "too")], "How many tickets? The number: two."),
  cw("come", "Mei wants to come ___.", "too", "too", [g("to", "to"), g("two", "two")], "Mei wants to come as well: too means also."),
  cw("library", "Lena walked ___ the library.", "to", "to", [g("too", "too"), g("two", "two")], "Toward the library: to."),
  cw("soup", "The soup is ___ hot to eat.", "too", "too", [g("to", "to"), g("two", "two")], "More hot than you want: too means more than enough."),
  cw("gate", "Jonah ran ___ the gate.", "to", "to", [g("two", "two"), g("too", "too")], "Toward the gate: to."),
  cw("apples", "Nia gave ___ apples to each friend.", "two", "two", [g("to", "to"), g("too", "too")], "How many apples? The number: two."),
  cw("box", "This box is heavier ___ that one.", "than", "than", [g("then", "then")], "Heavier than compares two things: than."),
  cw("lunch", "We ate lunch, and ___ we played outside.", "then", "then", [g("than", "than")], "What happened next? Then tells the order."),
  cw("sister", "Raj is taller ___ his sister.", "than", "than", [g("then", "then")], "Taller than compares two people: than."),
  cw("flour", "First we mix the flour, and ___ we add the eggs.", "then", "then", [g("than", "than")], "What comes next? Then."),
  cw("kite", "Ana's kite flew higher ___ the trees.", "than", "than", [g("then", "then")], "Higher than compares: than."),
  cw("jacket", "Is this ___ jacket?", "your", "your", [g("you're", "youre")], "The jacket belongs to you: your. 'Is this you are jacket?' doesn't work."),
  cw("song", "___ going to love this song.", "You're", "youre", [g("Your", "your")], "Try 'you are going to love this song'. It works, so: you're."),
  cw("hands", "Please wash ___ hands before dinner.", "your", "your", [g("you're", "youre")], "The hands belong to you: your."),
  cw("ready", "Tell me when ___ ready.", "you're", "youre", [g("your", "your")], "Try 'when you are ready'. It works, so: you're."),
  cw("paw", "The cat licked ___ paw.", "its", "its-possessive", [g("it's", "its-contraction")], "The paw belongs to the cat: its, no apostrophe."),
  cw("home", "___ time to go home.", "It's", "its-contraction", [g("Its", "its-possessive")], "Try 'it is time to go home'. It works, so: it's."),
  cw("nest", "The bird built ___ nest in the oak.", "its", "its-possessive", [g("it's", "its-contraction")], "The nest belongs to the bird: its."),
  cw("snow", "I think ___ going to snow.", "it's", "its-contraction", [g("its", "its-possessive")], "Try 'I think it is going to snow'. It works, so: it's."),
];
