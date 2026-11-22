/**
 * Fenn's Message Mystery — the authored message bank (DATA only). Spec: docs/curriculum/cyber.md §4.4,
 * pedagogy and sources: docs/worlds/message-mystery.md.
 *
 * House rules (checked by tests/unit/message-mystery.test.ts):
 *  - Every sender, town, game and web address is fictional. Addresses use the reserved `.example` top-level
 *    domain (RFC 2606), so nothing points at a real site. Links are never clickable.
 *  - Byteberry Town's own mail always comes from `@byteberry.example`; a safe message comes from there, asks for
 *    nothing secret, and its link (if any) really goes there. Every trick carries at least one clue.
 *  - Threats stay mild (a game account, stars, levels). No fear, no violence, nothing about strangers meeting up.
 *  - Bodies are short (≤ 16 words), about a grade-2/3 reading level, and every message has a read-aloud line
 *    `mm.msg.<id>` in voice.json whose text is `sayOf(msg)`.
 *  - Message ids are kebab-case WITHOUT dots (they appear in exercise ids and voice ids).
 */

/** Clue types (CISA "recognise phishing", FTC "how to recognise phishing"). */
export type ClueId = "secret" | "prize" | "urgent" | "keepSecret" | "giftCard" | "sender" | "lookAlike" | "link" | "file";
export const CLUES: readonly ClueId[] = ["secret", "prize", "urgent", "keepSecret", "giftCard", "sender", "lookAlike", "link", "file"];
/** Short on-screen label for each clue (also its voice line `mm.clue.<id>`). */
export const CLUE_LABEL: Record<ClueId, string> = {
  secret: "Asks for a secret",
  prize: "Too good to be true",
  urgent: "Tries to rush you",
  keepSecret: "Says don't tell",
  giftCard: "Wants a gift card",
  sender: "Name and address don't match",
  lookAlike: "A letter is changed",
  link: "Link goes somewhere else",
  file: "A file you didn't expect",
};

/** Fictional mail domains (all `<key>.example`). `byteberry` is the town's real one. */
export const DOMAINS = ["byteberry", "bytebery", "byteberrry", "byteberry-prize", "byteberry-login", "free-gems", "quick-prize", "game-helper"] as const;
export type Domain = (typeof DOMAINS)[number];
export const TOWN: Domain = "byteberry";
export const host = (d: Domain) => `${d}.example`;

export interface Part {
  text: string;
  clue?: ClueId;
}
export interface Msg {
  id: string;
  /** Display name. */
  from: string;
  /** Mailbox name before the @. */
  user: string;
  domain: Domain;
  /** The sender line itself is a clue (a town name on a non-town address, or a look-alike spelling). */
  senderClue?: "sender" | "lookAlike";
  /** Body, split into parts the child can tap (clue mode marks the parts that are clues). */
  body: readonly Part[];
  /** Link line: the words shown, and where it really goes. A clue when they differ. */
  link?: { text: string; to: Domain };
  /** Attachment chip. `clue` = nobody expected it (e.g. a program file). */
  file?: { name: string; spoken: string; clue?: boolean };
  safe: boolean;
}

export const addressOf = (m: Msg) => `${m.user}@${host(m.domain)}`;
/** The domain a link's words point at (`library.byteberry.example/x` → `byteberry`). */
export function linkTextDomain(text: string): Domain | null {
  const h = text.split("/")[0]!;
  return DOMAINS.find((d) => h === host(d) || h.endsWith(`.${host(d)}`)) ?? null;
}
export const linkIsClue = (m: Msg) => !!m.link && linkTextDomain(m.link.text) !== m.link.to;

/** Every clue in a message, in reading order (sender → body → link → file). */
export function cluesOf(m: Msg): ClueId[] {
  const out: ClueId[] = [];
  if (m.senderClue) out.push(m.senderClue);
  for (const p of m.body) if (p.clue) out.push(p.clue);
  if (linkIsClue(m)) out.push("link");
  if (m.file?.clue) out.push("file");
  return out;
}
/** The clue the hints point at first: the one the level is about, else the first in reading order. */
const PRIORITY: readonly ClueId[] = ["sender", "lookAlike", "link", "file", "giftCard", "keepSecret", "urgent", "prize", "secret"];
export function mainClue(m: Msg, focus?: readonly ClueId[]): ClueId | null {
  const all = cluesOf(m);
  if (!all.length) return null;
  const f = focus?.find((c) => all.includes(c));
  return f ?? PRIORITY.find((c) => all.includes(c)) ?? all[0]!;
}

/** Tappable parts of a message: `from`, `b0`, `b1`…, `link`, `file`. */
export type PartId = string;
export function partsOf(m: Msg): { id: PartId; text: string; clue: ClueId | null }[] {
  return [
    { id: "from", text: m.from, clue: m.senderClue ?? null },
    ...m.body.map((p, i) => ({ id: `b${i}`, text: p.text, clue: p.clue ?? null })),
    ...(m.link ? [{ id: "link", text: m.link.text, clue: linkIsClue(m) ? ("link" as const) : null }] : []),
    ...(m.file ? [{ id: "file", text: m.file.name, clue: m.file.clue ? ("file" as const) : null }] : []),
  ];
}
export const cluePartIds = (m: Msg) => partsOf(m).filter((p) => p.clue).map((p) => p.id);

/** The read-aloud text (the narrator reads the whole message, so non-readers can play). */
export function sayOf(m: Msg): string {
  const body = m.body.map((p) => p.text).join(" ");
  const link = m.link ? " It has a link." : "";
  const file = m.file ? ` It has a file called ${m.file.spoken}.` : "";
  return `${m.from} says: ${body}${link}${file}`;
}
export const msgLine = (m: Msg) => `mm.msg.${m.id}`;

const B = (...parts: (string | Part)[]): Part[] => parts.map((p) => (typeof p === "string" ? { text: p } : p));
const c = (text: string, clue: ClueId): Part => ({ text, clue });

// ---------------------------------------------------------------- bank

/** Level 0 tutorial: the most obvious trick there is. */
export const TUTORIAL: Msg = { id: "tut-password", from: "Game Helper", user: "help", domain: "game-helper", body: B(c("Please send me your password.", "secret")), safe: false };

/** Level 0 (Lv 1): asks for a password or personal information, said plainly. */
const L0: Msg[] = [
  { id: "hat-password", from: "Game Helper", user: "help", domain: "game-helper", body: B(c("Send me your password", "secret"), "and I will give you a cool hat."), safe: false },
  { id: "fix-password", from: "Mystery Pal", user: "pal", domain: "free-gems", body: B(c("What is your password?", "secret"), "Tell me and I'll fix your game."), safe: false },
  { id: "secret-code", from: "Gem Team", user: "team", domain: "free-gems", body: B(c("Reply with your secret code", "secret"), "to get your gems."), safe: false },
  { id: "home-address", from: "New Pal", user: "hi", domain: "quick-prize", body: B("Hi!", c("What is your home address?", "secret"), "I want to send you something."), safe: false },
  { id: "type-password", from: "Game Helper", user: "help", domain: "game-helper", body: B("Your game needs a check.", c("Type your password here, please.", "secret")), safe: false },
  { id: "club-school", from: "Club Bot", user: "bot", domain: "game-helper", body: B(c("Tell me your full name and school", "secret"), "to join the club."), safe: false },
  { id: "tag-park", from: "Bobbo", user: "bobbo", domain: "byteberry", body: B("Want to play tag at the park after lunch?"), safe: true },
  { id: "books-due", from: "Byteberry Library", user: "library", domain: "byteberry", body: B("Your library books are due on Friday.", "See you soon!"), safe: true },
  { id: "thanks-drawing", from: "Puff", user: "puff", domain: "byteberry", body: B("Thank you for the picture you drew me.", "I love it!"), safe: true },
  { id: "story-time", from: "Hoot", user: "hoot", domain: "byteberry", body: B("Story time is at the library today at three."), safe: true },
];

/** Level 1: prizes that are too good to be true (plus a request for something private). */
const L1: Msg[] = [
  { id: "million-gems", from: "Prize Wizard", user: "win", domain: "quick-prize", body: B(c("You won a million gems!", "prize"), c("Send your password to get them.", "secret")), safe: false },
  { id: "free-tablet", from: "Lucky Spin", user: "spin", domain: "quick-prize", body: B(c("You won a free tablet!", "prize"), c("Tell us your address to get it.", "secret")), safe: false },
  { id: "free-gems", from: "Gem Team", user: "gems", domain: "free-gems", body: B(c("Free gems, just for you!", "prize"), c("Just tell us your password.", "secret")), safe: false },
  { id: "big-winner", from: "Super Prize", user: "prize", domain: "quick-prize", body: B(c("You are our big winner!", "prize"), c("Reply with your phone number.", "secret")), safe: false },
  { id: "real-pony", from: "Pet Prize", user: "pets", domain: "free-gems", body: B(c("Win a real pony!", "prize"), c("Tell us your full name and school.", "secret")), safe: false },
  { id: "all-free", from: "Game Shop", user: "shop", domain: "free-gems", body: B(c("Everything is free today!", "prize"), c("Just send your secret code.", "secret")), safe: false },
  { id: "spelling-book", from: "Zuzu", user: "zuzu", domain: "byteberry", body: B("I finished my spelling book!", "Do you want to borrow it?"), safe: true },
  { id: "picture-day", from: "Byteberry School", user: "school", domain: "byteberry", body: B("Picture day is next Monday.", "Wear a big smile!"), safe: true },
  { id: "lost-mitten", from: "Rumble", user: "rumble", domain: "byteberry", body: B("I found your mitten by the pond.", "I'll bring it tomorrow."), safe: true },
  { id: "jelly-shape", from: "Gloop", user: "gloop", domain: "byteberry", body: B("Look! I made a star out of jelly.", "Come and see!"), safe: true },
];

/** Level 2: tries to rush you. */
const L2: Msg[] = [
  { id: "one-hour", from: "Game Guard", user: "guard", domain: "game-helper", body: B(c("Hurry! Your game closes in one hour.", "urgent"), c("Send your password now!", "secret")), safe: false },
  { id: "five-minutes", from: "Quick Prize", user: "now", domain: "quick-prize", body: B(c("Only five minutes left!", "urgent"), c("Tell us your address to win.", "secret")), safe: false },
  { id: "lose-stars", from: "Star Team", user: "team", domain: "game-helper", body: B(c("Act now or lose all your stars!", "urgent"), c("Type your password here.", "secret")), safe: false },
  { id: "last-chance", from: "Gem Team", user: "gems", domain: "free-gems", body: B(c("Last chance! Reply in ten minutes", "urgent"), c("with your secret code.", "secret")), safe: false },
  { id: "hungry-pet", from: "Pet Club", user: "club", domain: "free-gems", body: B(c("Quick! Your game pet is hungry.", "urgent"), c("Send your password to feed it!", "secret")), safe: false },
  { id: "keep-levels", from: "Level Helper", user: "help", domain: "game-helper", body: B(c("Fast! Today only!", "urgent"), c("Tell us your password to keep your levels.", "secret")), safe: false },
  { id: "town-fair", from: "Mayor Maple", user: "mayor", domain: "byteberry", body: B("The town fair is on Saturday.", "Everyone is welcome!"), safe: true },
  { id: "birthday", from: "Puff", user: "puff", domain: "byteberry", body: B("Can you come to my birthday party next week?"), safe: true },
  { id: "swim-towel", from: "Byteberry Pool", user: "pool", domain: "byteberry", body: B("Swim class is on Tuesday.", "Bring a towel!"), safe: true },
  { id: "cookies", from: "Bobbo", user: "bobbo", domain: "byteberry", body: B("I baked cookies for the class.", "I hope you like them!"), safe: true },
];

/** Level 3: says "don't tell", or wants a gift card (FTC: only scammers ask for gift-card payment). */
const L3: Msg[] = [
  { id: "secret-gift", from: "Secret Pal", user: "pal", domain: "quick-prize", body: B("I have a gift for you.", c("Don't tell your grown-ups about it!", "keepSecret")), safe: false },
  { id: "card-prize", from: "Game Helper", user: "help", domain: "game-helper", body: B(c("Get a gift card and send me the code.", "giftCard"), c("Then you win a prize!", "prize")), safe: false },
  { id: "our-secret", from: "Mystery Friend", user: "friend", domain: "free-gems", body: B("Let's be friends!", c("Don't tell your family we talk.", "keepSecret")), safe: false },
  { id: "card-numbers", from: "Gem Shop", user: "shop", domain: "free-gems", body: B(c("Get a gift card and send us the numbers on the back.", "giftCard")), safe: false },
  { id: "secret-win", from: "Prize Club", user: "club", domain: "quick-prize", body: B(c("Keep it a secret from your family,", "keepSecret"), c("and tell us your address.", "secret")), safe: false },
  { id: "card-or-lose", from: "Game Guard", user: "guard", domain: "game-helper", body: B(c("Pay with a gift card", "giftCard"), c("in one hour, or lose your game.", "urgent")), safe: false },
  { id: "owl-book", from: "Hoot", user: "hoot", domain: "byteberry", body: B("I saved a book about owls for you.", "It's at the front desk."), safe: true },
  { id: "farm-trip", from: "Byteberry School", user: "school", domain: "byteberry", body: B("Our class trip to the farm is on Thursday.", "Pack a lunch!"), safe: true },
  { id: "spell-banana", from: "Zuzu", user: "zuzu", domain: "byteberry", body: B("Thanks for helping me spell banana.", "It has three a's!"), safe: true },
  { id: "fly-kites", from: "Rumble", user: "rumble", domain: "byteberry", body: B("The wind is perfect today.", "Want to fly kites?"), safe: true },
];

/** Level 4: neat, polite tricks — the clue is WHO really sent it (magnifier reveals the address). */
const L4: Msg[] = [
  { id: "card-sign-in", from: "Byteberry Library", user: "library", domain: "bytebery", senderClue: "lookAlike", body: B("Hello, reader!", c("Please sign in again so your library card keeps working.", "secret")), safe: false },
  { id: "class-page", from: "Byteberry School", user: "office", domain: "byteberrry", senderClue: "lookAlike", body: B("Hello, families.", c("Please reply with your password for the new class page.", "secret")), safe: false },
  { id: "mayor-prize", from: "Mayor Maple", user: "mayor", domain: "byteberry-prize", senderClue: "sender", body: B(c("The town picked you for a special prize!", "prize"), c("Please sign in to get it.", "secret")), safe: false },
  { id: "swim-pass", from: "Byteberry Pool", user: "pool", domain: "bytebery", senderClue: "lookAlike", body: B("Your new swim pass is ready.", c("Please send your password to unlock it.", "secret")), safe: false },
  { id: "libary", from: "Byteberry Libary", user: "help", domain: "byteberry-login", senderClue: "lookAlike", body: B("Dear reader,", c("please sign in today to keep your books.", "secret")), safe: false },
  { id: "not-bobbo", from: "Bobbo", user: "bobbo", domain: "quick-prize", senderClue: "sender", body: B("Hi! It's me, Bobbo.", c("What's your password? I forgot mine.", "secret")), safe: false },
  { id: "new-comics", from: "Byteberry Library", user: "library", domain: "byteberry", body: B("New comic books arrived today.", "Come and pick one!"), safe: true },
  { id: "long-weekend", from: "Byteberry School", user: "school", domain: "byteberry", body: B("Reminder: there is no school on Friday.", "Enjoy the long weekend!"), safe: true },
  { id: "plant-trees", from: "Mayor Maple", user: "mayor", domain: "byteberry", body: B("Thank you for helping plant trees in the park!"), safe: true },
  { id: "left-scarf", from: "Gloop", user: "gloop", domain: "byteberry", body: B("You left your scarf at my house.", "I'll bring it to school."), safe: true },
];

/** Level 5: the words on a link say one place but it goes to another; files nobody expected. */
const L5: Msg[] = [
  { id: "race-level", from: "Star Racer Game", user: "news", domain: "game-helper", body: B("A new racing level is here!", "Tap the link to play."), link: { text: "byteberry.example/race", to: "byteberry-login" }, safe: false },
  { id: "free-book", from: "Book Club", user: "club", domain: "game-helper", body: B("Your free book is waiting.", "Tap the link to read it."), link: { text: "library.byteberry.example", to: "free-gems" }, safe: false },
  { id: "cat-video", from: "Fun Pics", user: "pics", domain: "quick-prize", body: B("Here is a funny cat video.", "Open the file!"), file: { name: "cat-video.exe", spoken: "cat video dot e x e", clue: true }, safe: false },
  { id: "all-answers", from: "Homework Helper", user: "help", domain: "game-helper", body: B("Here are all the homework answers.", c("Open the file now!", "urgent")), file: { name: "answers.exe", spoken: "answers dot e x e", clue: true }, safe: false },
  { id: "pet-visit", from: "Pet Game", user: "pets", domain: "free-gems", body: B("Your game pet misses you!", "Tap the link to visit."), link: { text: "pets.byteberry.example", to: "byteberry-login" }, safe: false },
  { id: "what-you-won", from: "Prize Hub", user: "hub", domain: "quick-prize", body: B(c("Open the file to see what you won!", "prize")), file: { name: "prize.exe", spoken: "prize dot e x e", clue: true }, safe: false },
  { id: "story-list", from: "Byteberry Library", user: "library", domain: "byteberry", body: B("Here is this month's story list."), link: { text: "byteberry.example/stories", to: "byteberry" }, safe: true },
  { id: "lunch-menu", from: "Byteberry School", user: "school", domain: "byteberry", body: B("Next week's lunch menu is ready."), link: { text: "byteberry.example/lunch", to: "byteberry" }, safe: true },
  { id: "our-poem", from: "Zuzu", user: "zuzu", domain: "byteberry", body: B("Here's the poem we wrote together,", "like you asked!"), file: { name: "our-poem.txt", spoken: "our poem" }, safe: true },
  { id: "fair-photos", from: "Mayor Maple", user: "mayor", domain: "byteberry", body: B("See the photos from the town fair!"), link: { text: "byteberry.example/fair", to: "byteberry" }, safe: true },
];

/** Level 6 (clue mode): tricks with two or three clues; tap every one. Neutral parts are clearly harmless. */
const L6: Msg[] = [
  { id: "gems-hurry", from: "Gem Team", user: "gems", domain: "free-gems", body: B(c("You won 500 gems!", "prize"), c("Hurry, only one hour left!", "urgent"), c("Send your password to get them.", "secret")), safe: false },
  { id: "card-stops", from: "Byteberry Library", user: "library", domain: "bytebery", senderClue: "lookAlike", body: B("Hello, reader!", c("Your card stops working today!", "urgent")), link: { text: "library.byteberry.example", to: "byteberry-login" }, safe: false },
  { id: "drawings-card", from: "Secret Pal", user: "pal", domain: "quick-prize", body: B("Hi, pal!", c("Don't tell your grown-ups.", "keepSecret"), c("Send me a gift card code.", "giftCard")), safe: false },
  { id: "spring-prize", from: "Mayor Maple", user: "mayor", domain: "byteberry-prize", senderClue: "sender", body: B("Happy spring!", c("You won the big town prize!", "prize")), file: { name: "prize.exe", spoken: "prize dot e x e", clue: true }, safe: false },
  { id: "ten-minutes", from: "Game Helper", user: "help", domain: "game-helper", body: B("Thanks for playing!", c("Reply with your password", "secret"), c("in ten minutes, or lose your levels.", "urgent")), safe: false },
  { id: "bobbo-secret", from: "Bobbo", user: "bobbo", domain: "quick-prize", senderClue: "sender", body: B("Hi, it's Bobbo!", c("Keep this a secret.", "keepSecret")), link: { text: "byteberry.example/cookies", to: "free-gems" }, safe: false },
  { id: "book-club", from: "Hoot", user: "hoot", domain: "byteberry", body: B("Hello, friend!", "Book club meets on Wednesday.", "Bring your favourite story!"), safe: true },
  { id: "sports-day", from: "Byteberry School", user: "school", domain: "byteberry", body: B("Hi, families!", "Sports day is next Friday."), link: { text: "byteberry.example/sports", to: "byteberry" }, safe: true },
];

/**
 * Level 8 (check another way): tricks sent from a REAL town address (an account can be borrowed or taken over)
 * and safe messages that fit what the child already knows (a change of plan, something they asked for) and ask
 * for nothing secret. Safe messages never push the child to go somewhere right now. "Check another way, with a
 * grown-up" is accepted on EVERY item: asking is never wrong (docs/worlds/message-mystery.md).
 */
const L8: Msg[] = [
  { id: "zuzu-card", from: "Zuzu", user: "zuzu", domain: "byteberry", body: B("I'm stuck!", c("Can you buy me a gift card and send the code?", "giftCard")), safe: false },
  { id: "gloop-password", from: "Gloop", user: "gloop", domain: "byteberry", body: B(c("Quick,", "urgent"), c("tell me your password.", "secret"), "I want to give you gems!"), safe: false },
  { id: "puff-link", from: "Puff", user: "puff", domain: "byteberry", body: B(c("Don't tell anyone,", "keepSecret"), "but tap this for free stuff!"), link: { text: "byteberry.example/fun", to: "free-gems" }, safe: false },
  { id: "rumble-code", from: "Rumble", user: "rumble", domain: "byteberry", body: B(c("Please send me your secret code.", "secret"), "Don't ask me why."), safe: false },
  { id: "bobbo-file", from: "Bobbo", user: "bobbo", domain: "byteberry", body: B(c("Open this file right now!", "urgent"), "It's a surprise."), file: { name: "surprise.exe", spoken: "surprise dot e x e", clue: true }, safe: false },
  { id: "school-card", from: "Byteberry School", user: "school", domain: "byteberry", body: B(c("Today only!", "urgent"), c("Pay for the class trip with a gift card.", "giftCard")), safe: false },
  { id: "swim-moved", from: "Byteberry Pool", user: "pool", domain: "byteberry", body: B("Swim class moved to four o'clock today.", "See you there!"), safe: true },
  { id: "book-ready", from: "Byteberry Library", user: "library", domain: "byteberry", body: B("The book you asked for is ready.", "Pick it up any day this week."), safe: true },
  { id: "snow-day", from: "Byteberry School", user: "school", domain: "byteberry", body: B("Snow day! School is closed today.", "Stay warm!"), safe: true },
  { id: "early-parade", from: "Mayor Maple", user: "mayor", domain: "byteberry", body: B("The parade starts early today, at nine.", "See you there!"), safe: true },
  { id: "chess-plan", from: "Hoot", user: "hoot", domain: "byteberry", body: B("See you at chess club after school,", "like we planned!"), safe: true },
  { id: "spelling-list", from: "Zuzu", user: "zuzu", domain: "byteberry", body: B("Here's the spelling list you asked me for."), file: { name: "spelling-list.txt", spoken: "spelling list" }, safe: true },
  { id: "picnic-inside", from: "Gloop", user: "gloop", domain: "byteberry", body: B("It's raining, so today's picnic is in the town hall."), safe: true },
];

export const BANK = { l0: L0, l1: L1, l2: L2, l3: L3, l4: L4, l5: L5, l6: L6, l8: L8 } as const;
/** Every message (index = the number stored in exercise params). */
export const ALL_MESSAGES: readonly Msg[] = [TUTORIAL, ...L0, ...L1, ...L2, ...L3, ...L4, ...L5, ...L6, ...L8];
/** Sort levels 1–5 feed the action (L7) and inbox (L9) levels. */
export const REVIEW_BANK: readonly Msg[] = [...L1, ...L2, ...L3, ...L4, ...L5];

export const indexOfMsg = (m: Msg) => ALL_MESSAGES.indexOf(m);
export const msgAt = (i: number): Msg => ALL_MESSAGES[i] ?? TUTORIAL;
export const msgById = (id: string): Msg | undefined => ALL_MESSAGES.find((m) => m.id === id);
