import type { Tag } from "./sentences";

/**
 * The Lantern Press — argument banks for levels 8–9 (docs/worlds/lantern-press.md §3, §3.1). Every article is an
 * original, fictional island issue (library hours, the school garden, the ferry timetable, the bake-off, recycling
 * bins, the skate ramp, the lunch menu, the tide pools…). Numbers are fictional and plausible; every article page
 * says "Fictional article for practice." No partisan politics, religion, health advice, brands or real people.
 * Each article has exactly one claim, two pieces of evidence (things someone could check), one reasoning sentence
 * with an explicit link ("So…", "This means…") and one sentence that doesn't support the claim: a true but
 * irrelevant fact, or a loud opinion offered as if it were evidence.
 */
export type Role = "claim" | "evidence" | "reasoning" | "none";
export const ROLES: readonly Role[] = ["claim", "evidence", "reasoning", "none"];
export const ROLE_LABEL: Readonly<Record<Role, string>> = { claim: "Claim", evidence: "Evidence", reasoning: "Reasoning", none: "Doesn't support" };
export const ROLE_WHY: Readonly<Record<Role, string>> = {
  claim: "what the writer wants you to believe",
  evidence: "a fact someone could check",
  reasoning: "links the evidence to the claim",
  none: "doesn't back the claim",
};
export interface Sentence { text: string; role: Role; off?: "irrelevant" | "opinion" }
export interface Article { id: string; headline: string; sentences: readonly Sentence[]; fictional: true }
const c = (text: string): Sentence => ({ text, role: "claim" });
const e = (text: string): Sentence => ({ text, role: "evidence" });
const r = (text: string): Sentence => ({ text, role: "reasoning" });
const x = (text: string): Sentence => ({ text, role: "none", off: "irrelevant" });
const o = (text: string): Sentence => ({ text, role: "none", off: "opinion" });
const A = (id: string, headline: string, ...sentences: Sentence[]): Article => ({ id, headline, sentences, fictional: true });

export const ARTICLES: readonly Article[] = [
  A("sundays", "Open the library on Sundays",
    c("The library should open on Sundays."),
    e("Last term's sign-in sheets show about 40 visitors every Saturday."),
    x("The library also has bright blue doors."),
    e("A survey at the desk found that 25 of those visitors work on weekdays."),
    r("So a Sunday opening would serve people who can't come in during the week.")),
  A("barrel", "The school garden needs a second rain barrel",
    c("The school garden needs a second rain barrel."),
    e("The garden log shows the one barrel ran dry on 9 of the last 12 dry days."),
    e("On those days, volunteers carried water from the kitchen in buckets."),
    r("This means one barrel can't store enough rain for the whole garden."),
    x("Rain barrels come in green, black and gray.")),
  A("ferry", "Add an earlier ferry",
    c("The ferry should add a trip at 6:30 a.m."),
    o("Everyone knows the ferry is the best way to see the island."),
    e("Ticket records show the 7:30 trip was full on 18 of 20 weekdays last month."),
    e("The ferry office counted 35 riders turned away from that trip in one week."),
    r("So an earlier trip would carry riders who now can't get on.")),
  A("savory", "A savory category for the bake-off",
    c("The island bake-off should add a savory category."),
    e("Last year, 12 of the 40 entries were breads or pies with no sugar."),
    e("The judges' notes show they had trouble comparing those entries with cakes."),
    x("The bake-off tent was first put up in the town square."),
    r("This means a separate savory category would make the judging fairer.")),
  A("bins", "More recycling bins for Harbor Park",
    c("Harbor Park needs more recycling bins."),
    e("Cleanup volunteers collected 60 cans from the grass in one weekend."),
    e("The park has two recycling bins, both near the main gate."),
    r("So people far from the gate have nowhere close to put their cans."),
    x("The park's fountain was repaired last spring.")),
  A("lights", "Keep the skate ramp lights on",
    c("The skate ramp lights should stay on until 8 p.m."),
    o("Skating is obviously the coolest sport on the island."),
    e("A youth club count found 15 skaters still on the ramp at 6:30 most evenings."),
    e("The lights switch off at 6:30, and the ramp has no other lighting."),
    r("This means skaters are riding in the dark, which is unsafe.")),
  A("soup", "Bring back soup at lunch",
    c("The school should bring back a soup option at lunch."),
    e("In a survey, 120 of 200 students chose soup as their favorite winter lunch."),
    x("The cafeteria was painted yellow two years ago."),
    e("Kitchen records show soup cost less per serving than sandwiches."),
    r("So soup would be both popular and affordable.")),
  A("boardwalk", "A boardwalk for the tide pools",
    c("The island should build a boardwalk to the tide pools."),
    e("Rangers report that most visitors step right onto the rocks to reach the pools."),
    e("Last year's survey counted far fewer sea stars beside the path than in the far pools."),
    r("This means a boardwalk could protect the animals by keeping feet off the rocks."),
    x("Sea stars can be orange, purple or brown.")),
  A("rack", "A bike rack for the community hall",
    c("The community hall needs a bike rack."),
    e("During one week of events, staff counted 22 bikes leaning against the walls."),
    x("The hall can hold 150 people for a concert."),
    e("Two of those bikes blocked the fire door."),
    r("So a rack would keep the doors clear and the bikes tidy.")),
  A("musicroom", "Open the music room at lunch",
    c("The music room should be open at lunchtime."),
    e("A sign-up sheet collected 31 names of students who want to practice at lunch."),
    e("The room schedule shows the room is empty from 12:00 to 12:45 every day."),
    o("Music is far more fun than any other subject."),
    r("This means students could practice without taking space from any class.")),
  A("crosswalk", "Paint a crosswalk by the market",
    c("The town should paint a crosswalk outside the market."),
    e("A traffic count found 300 people crossing the road there on one Saturday."),
    e("The nearest crosswalk is 400 meters away."),
    r("So most shoppers cross where there is no safe place to do it."),
    x("The market sells fruit from six different farms.")),
  A("bookswap", "A book swap shelf at the ferry dock",
    c("The ferry dock should have a book swap shelf."),
    e("Ferry staff timed an average wait of 25 minutes before each trip."),
    x("The dock was rebuilt with wood from the old pier."),
    e("A rider survey found that 70 of 100 riders read while they wait."),
    r("This means a shelf of books would be used by many waiting riders.")),
  A("evenings", "Open the community garden in the evening",
    c("The community garden should open on weekday evenings."),
    e("A members' survey found 45 of 60 members can't visit between 9 and 3."),
    e("Plots left unweeded for a month rose from 5 to 18 this year."),
    o("Gardening is the most relaxing hobby there is."),
    r("So evening hours would let members look after their plots.")),
  A("shade", "Plant shade trees at the playground",
    c("The playground needs shade trees."),
    e("Rangers measured the slide at 140°F on three July afternoons."),
    e("The playground has no shade between noon and 4 p.m."),
    x("The playground's swings were painted red last year."),
    r("This means children have nowhere cool to play on summer afternoons.")),
  A("lostfound", "Move the lost-and-found box",
    c("The lost-and-found box should move to the front office."),
    e("Right now the box is in the gym storeroom, which is locked after 3 p.m."),
    e("Only 8 of the 50 items left last term were ever collected."),
    r("So a place that stays open longer would help more items get back to their owners."),
    x("Most of the lost items were blue water bottles.")),
  A("benchstop", "A bench for the lighthouse bus stop",
    c("The lighthouse bus stop needs a bench."),
    o("The lighthouse is clearly the prettiest building on the island."),
    e("The timetable shows gaps of up to 40 minutes between buses at that stop."),
    e("Drivers report that older riders often sit on the curb while they wait."),
    r("This means a bench would give waiting riders a safe place to sit.")),
];

// ---------------------------------------------------------------- L9 strongest evidence
/** Three pieces of evidence for a claim: one relevant, systematic and checkable; the others an anecdote or opinion, or off-topic. */
export interface StrongestItem { id: string; claim: string; answer: string; distractors: readonly { text: string; tag: Tag }[] }
const T = (id: string, claim: string, answer: string, weak: string, weakTag: Tag, off: string): StrongestItem =>
  ({ id, claim, answer, distractors: [{ text: weak, tag: weakTag }, { text: off, tag: "irrelevant" }] });
export const STRONGEST: readonly StrongestItem[] = [
  T("pool", "The town pool should open an hour earlier.", "Sign-in sheets show 30 swimmers waiting at the door on most summer mornings.", "My cousin says she would like to swim earlier.", "anecdote", "The pool was built in the same year as the library."),
  T("art", "The art club needs a bigger room.", "The club has 28 members, but its room has 16 seats.", "The art teacher feels the room is a bit small.", "opinion", "The art club's posters are very colorful."),
  T("trash", "The beach needs more trash cans.", "Volunteers picked up 200 wrappers in one weekend, most of them far from the two cans.", "One visitor said the beach looked messy.", "anecdote", "The beach has golden sand and calm water."),
  T("bikes", "The noon ferry should allow bikes.", "A survey found 48 of 120 noon riders would bring a bike if they could.", "Kofi thinks bikes on ferries are fun.", "opinion", "The ferry was painted white last spring."),
  T("graphic", "The library should buy more graphic novels.", "Checkout records show graphic novels are borrowed three times as often as other books.", "Two friends told me they love graphic novels.", "small-sample", "Graphic novels have pictures and speech bubbles."),
  T("chess", "The school should start a chess club.", "A sign-up sheet in the hall collected 34 names in two days.", "Chess is the best game ever invented.", "opinion", "Chess pieces can be made of wood or plastic."),
  T("grip", "The skate ramp needs fresh grip paint.", "A youth club check found worn, slippery patches on 6 of the ramp's 8 panels.", "Sami slipped there once last month.", "anecdote", "The ramp is next to the basketball court."),
  T("late", "The market should stay open until 7 p.m.", "A count found 90 shoppers arriving in the last half hour before the 5 p.m. close.", "The fruit seller says she isn't tired at 5.", "anecdote", "The market has 24 stalls."),
  T("roof", "The ferry dock needs a covered waiting area.", "The weather station recorded rain on 14 of 30 mornings last month, while riders waited outside.", "A rider said waiting in the rain is annoying.", "anecdote", "The dock is made of wood and stone."),
  T("thursday", "The museum should open late on Thursdays.", "In a visitor survey, 140 of 300 people said they could only come after work.", "My uncle prefers museums at night.", "anecdote", "The museum has a whale skeleton in its main hall."),
  T("guard", "The crossing outside the school needs a crossing guard.", "A morning count found 180 students crossing there between 8:00 and 8:20.", "One parent felt nervous crossing there.", "anecdote", "The school's front door is painted green."),
  T("tomatoes", "The school garden should grow more tomatoes next year.", "Harvest logs show the tomatoes sold out at every market stall this summer.", "Mei says tomatoes are her favorite food.", "opinion", "Tomato plants have yellow flowers."),
];

// ---------------------------------------------------------------- L9 sufficiency
/** Is the evidence enough for the conclusion? Some answers are yes (a fair, large check), so "no" is never a safe guess. */
export interface EnoughItem { id: string; text: string; question: string; answer: string; distractors: readonly { text: string; tag: Tag }[]; why: string }
const Y = (id: string, text: string, question: string, answer: string, d: [string, Tag][], why: string): EnoughItem =>
  ({ id, text, question, answer, distractors: d.map(([t, tag]) => ({ text: t, tag })), why });
export const ENOUGH: readonly EnoughItem[] = [
  Y("timetable", "Two people on the bus said the timetable is confusing.", "Is that enough to say most riders find it confusing?", "No: two people may not speak for most riders.", [["Yes: they ride the bus.", "small-sample"], ["No: the bus is not mentioned.", "misread"]], "Checked: two riders. Claim: most riders. Two can't speak for most."),
  Y("butter", "The bake-off judges tasted all 40 entries, and 31 of them used butter.", "Is that enough to say most entries used butter?", "Yes: every entry was checked, and 31 of 40 is most.", [["No: you would need to ask every baker.", "too-strict"], ["No: butter has nothing to do with baking.", "misread"]], "Checked: all 40 entries. 31 of 40 is more than half."),
  Y("crab", "Kofi saw one crab at the tide pools today.", "Is that enough to say the crab numbers are shrinking?", "No: one visit can't show a change over time.", [["Yes: he only saw one crab.", "small-sample"], ["No: crabs live in the sea.", "misread"]], "Checked: one visit. Claim: a change over time. That needs counts over time."),
  Y("lunch", "A survey of 250 of the school's 300 students found that 200 want a longer lunch.", "Is that enough to say most students want a longer lunch?", "Yes: most students were asked, and most of them said yes.", [["No: 50 students weren't asked.", "too-strict"], ["No: the survey was about lunch.", "misread"]], "200 of 300 is most, even if every student not asked said no."),
  Y("playground", "Mina's three friends all prefer the new playground.", "Is that enough to say the whole town prefers it?", "No: three friends may not speak for the whole town.", [["Yes: all three agreed.", "small-sample"], ["No: the old playground is gone.", "misread"]], "Checked: three friends. Claim: the whole town. Three can't speak for everyone."),
  Y("saturday", "The library counted visitors every day for a year: Saturday was the busiest day in 50 of the 52 weeks.", "Is that enough to say Saturday is usually its busiest day?", "Yes: a full year of counts shows the same pattern almost every week.", [["No: two weeks were different.", "too-strict"], ["No: libraries are open on weekdays too.", "misread"]], "Checked: every day for a year. Usually doesn't mean always."),
  Y("monday", "One rainy Monday, the ferry ran late.", "Is that enough to say the ferry is usually late?", "No: one day can't show what usually happens.", [["Yes: it was late that day.", "small-sample"], ["No: the ferry runs on water.", "misread"]], "Checked: one day. Claim: usually. That needs many days."),
  Y("muffins", "A café owner says her muffins are the best on the island.", "Is that enough to say they are the best?", "No: the owner's own opinion isn't a fair test.", [["Yes: she bakes them every day.", "opinion"], ["No: muffins are not bread.", "misread"]], "Checked: one opinion, from the person selling them. A fair test needs more."),
  Y("seastars", "Rangers counted the sea stars in every tide pool each spring for five years, and the count fell every year.", "Is that enough to say the number of sea stars has gone down?", "Yes: careful counts over five years all show a drop.", [["No: you would need to count for fifty years.", "too-strict"], ["No: the rangers might like sea stars.", "irrelevant"]], "Checked: every pool, five years in a row. Every count shows a drop."),
  Y("meeting", "At the town meeting, the five people who spoke all wanted a new skate park.", "Is that enough to say most of the town wants one?", "No: five speakers may not speak for the whole town.", [["Yes: everyone who spoke agreed.", "small-sample"], ["No: the meeting was about parks.", "misread"]], "Checked: five speakers. Claim: most of the town. Five can't speak for most."),
  Y("cars", "A count of every car at the market crossing for two weeks found about 900 cars a day.", "Is that enough to say the crossing is busy?", "Yes: two weeks of counting every car is solid evidence.", [["No: you would need to count for a whole year.", "too-strict"], ["No: some of the cars were blue.", "irrelevant"]], "Checked: every car for two weeks. 900 a day is busy."),
  Y("mathbook", "One student said the new math book is too hard.", "Is that enough to say the book is too hard for the whole class?", "No: one student's view may not match the whole class.", [["Yes: the student read the book.", "small-sample"], ["No: math books are long.", "misread"]], "Checked: one student. Claim: the whole class. One can't speak for all."),
];
