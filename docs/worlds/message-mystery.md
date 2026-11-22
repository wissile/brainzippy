# Fenn's Message Mystery (`message-mystery`)

Ages 7–11 · digital safety library (`cyber`, "Safety Lookout"), topic `cyber.scam` · host **Fenn**, helper **Hoot** · music `meadow`.
Spec: `docs/curriculum/cyber.md` §4. Code: `src/games/message-mystery/`. Registry: `src/content/packs/library-cyber/` (library now `live`).

## Objective
"Child can spot clues that a message is a trick and choose a safe action." The child is a detective in Byteberry Town's post office. They inspect one message at a time. They magnify the sender, links and files, hear the message read aloud, and post it into **Safe** (the mailbag) or **Ask a grown-up** (the help desk). Later levels add circling every clue, choosing what to do, checking another way, and sorting a whole inbox.

| Skill | Ages | Levels | Child can… |
|---|---|---|---|
| `cyber.scam.clues` | 7–11 | 0–6 | spot clues: asks for a secret, a prize too good to be true, rushing, "don't tell", gift cards, a sender or link that doesn't match, an unexpected file |
| `cyber.scam.action` | 7–11 | 7, 9 | choose a safe action: don't tap or reply, show a trusted grown-up |
| `cyber.scam.verify` | 8–14 | 8 | check a surprising message another way, with a grown-up, instead of replying |

The spec puts the world at 8–11. The owner's brief says 7+, so levels 0–3 are written for slow 7-year-old readers: bodies of 16 words or fewer, and every message read aloud. `cyber.scam.clues` has no prerequisite yet. Its spec prerequisite, `cyber.privacy.personal-info`, gets an id when Secret Keeper Sort is built, which lets the planner unlock this world now.

## What it teaches (and what it never does)
- **Recognition and protective action only.** The world never shows how a trick is made, how to guess a password or how to attack anything. Each trick is shown only from the receiver's side.
- **Safe responses, repeated:**
  - tell a trusted grown-up (the trick bin is literally "Ask a grown-up");
  - don't tap the link or reply;
  - never share passwords or secret codes;
  - check with the sender another way (level 8).
- **Asking is never wrong.** If a child puts a safe message in "Ask a grown-up", it still counts as a miss for levelling on the sort levels, because the skill is telling the two apart. On level 8 ("check another way") "Check another way, with a grown-up" is **accepted on every message**, safe or not (content review M2, 2026-11-22); a unit test asserts that `check` is accepted wherever it is offered. The feedback, though, starts with Hoot saying "Asking a grown-up is always OK! But look: this one asks for nothing secret." Spec improvement: the spec's "Trick" bin became "Ask a grown-up", following the owner's brief, so the right action is built into the bin.
- **No guarantees.** No line says a check makes a message safe. The bin is called "Safe" because the brief names it so, and the outro ends on "you know who to ask". The safe tag on a worked answer only states facts: "Real town address" and "Asks for nothing secret".
- **Not frightening.** Threats stay mild (a game closes, stars or levels are lost, a game pet is hungry). There are no strangers asking to meet, no photos of the child, no violence, and no words like "hacker" or "virus". The fog in the story is soft and thins as the round goes on. A unit test blocks a list of fear words.
- **Fictional everything.** Every town, person, game and address is made up:
  - All addresses use the reserved `.example` top-level domain (RFC 2606), checked by a unit test, which also rejects `.com`, `.org`, `http` and `www`.
  - Townsfolk are the Critter Crew. Organisations are "Byteberry Library / School / Pool" and "Mayor Maple".
  - Trick senders have generic names ("Gem Team", "Prize Wizard", "Game Helper").
  - Links are never clickable. They are buttons that magnify.

## Levels (0-based; the screen shows level + 1)
Each band has 8 messages, played in index order. Within a band the trick/safe pattern is fixed per level, and the rng picks the message from that slot's bucket. Buckets are disjoint, so a message never repeats within a band. Every pattern has at least 2 safe messages and never 3 tricks in a row.

| Lv | Mode | Content | Pattern (T/S) | Skill |
|---|---|---|---|---|
| 0 | sort | asks for a password / personal info, said plainly (+ authored tutorial) | TSTSSTST | clues |
| 1 | sort | prize too good to be true | STTSTSST | clues |
| 2 | sort | tries to rush you | TSSTSTTS | clues |
| 3 | sort | "don't tell your grown-ups" / gift card | STSTTSTS | clues |
| 4 | sort + magnifier | neat, polite tricks; the clue is the real sender (look-alike spelling or a town name on a non-town address) | TSTSSTST | clues |
| 5 | sort + magnifier | the link says one place and goes to another; a file nobody expected | STTSTSST | clues |
| 6 | clue mode | tap every clue (2–3 per trick) or "No clues" | TTSTTSTT | clues |
| 7 | action | three fixed cards: *Don't tap or reply. Show a grown-up* · *Reply and say stop* · *Read it. Reply if you want* (review bank L1–L5) | TSTTSTST | action |
| 8 | check another way | tricks from REAL town addresses (a friend's account asks for a gift card or password) vs safe messages that fit what the child knows (swim class moved, snow day, the book you asked for, chess club like we planned); safe messages never push the child to go somewhere right now. Cards: *It fits what I know and asks for nothing secret. Read it.* · *Check another way, with a grown-up* (always accepted) · *Reply to the message to check* | STSSTSTS | verify |
| 9 | inbox | four messages (2 tricks, 2 safe) from the review bank; open each, post each, then Done (match answer) | — | action |

On levels 4–5 the sender address and the link destination are folded ("Real address: tap to check") until the child magnifies them. This is how many apps show only a display name. The magnifier line names the real address ("It really comes from bytebery.example"), and Hoot's round-start line teaches the one rule needed: "Town mail comes from byteberry.example."

**Bank:** 82 authored messages: a tutorial, 10 per sort level (6 tricks, 4 safe), 8 in clue mode and 13 for check another way. Levels 7 and 9 reuse the level 1–5 bank, already voiced and checked. A message can come back in the same round only if the child steps down several levels into a band that shares it.

## Interaction and why
A detective board, not a quiz:
- The message card has an airmail stripe and a sender block (with a magnifier badge), the body split into tappable parts, a link chip and a file chip.
- **Magnifying** a part zooms it in place with a gold ring and speaks a neutral fact: who it really comes from, where the link really goes, or "Look at the whole file name". Tapping the words or the speaker reads the whole message.
- The message is also read automatically, once the prompt and any helper line have finished, so non-readers can always play.
- **Sorting** works four ways:
  - drag the card onto a bin;
  - tap-tap: tap the envelope to pick it up (the card lifts and the bins glow), then tap a bin;
  - tap a bin directly;
  - keyboard: Tab to a bin, then Enter.
- **Clue mode** works by tapping or pressing Enter on parts to circle them in red, then Done. Circling is how detectives mark evidence, and it makes the child find every clue rather than one.
- The bins differ in shape as well as colour (colour-blind safe). Safe is a round green mailbag with a tick tag. Ask a grown-up is a tall indigo help desk with a grown-up and a child holding hands.

## Hints (spec §4.6, adapted)
- **Sort has only two bins**, so after one miss the engine greys the wrong bin. A second try would be a coin flip, so the **first miss already shows the worked answer**: Hoot gives the concept line, the main clue is circled and named (e.g. "Asks for a secret"), the address unfolds, and the right bin pulses. The child then posts it, which can't go wrong. Spec improvement, found in play-testing.
- **Clue, action and verify modes:**
  - First miss: the magnifier glow sits over the part that holds the clue, without naming it, and Hoot explains the concept.
  - Second miss: every clue is circled and labelled, and the right card or "No clues" pulses.
- **Inbox:** the first miss keeps the right ones locked (green) and sends the wrong ones back to the inbox, glowing. The second miss tags each envelope with its bin.
- **Hoot's first-miss line is diagnosed from the miss** (`hints.ts`):
  - the clue type → `mm.help.*`;
  - a neat look-alike → "Tricks can look very neat. Check who really sent it." (misconception: good spelling means real);
  - "Reply and say stop" → "Replying tells the tricker you're there";
  - a friend's-account trick → "Accounts can be borrowed. Ask your friend another way";
  - a safe message answered with "Reply to check" → "Was this expected? Does it ask for anything secret?";
  - a safe message sent to Ask → `mm.hint.askOk`.

## Misconceptions → where they're tested
| Misconception | Where |
|---|---|
| Good spelling / a polite tone means it's real | L4 (all bodies polished; the clue is the sender) |
| A familiar name means it's real | L4 `not-bobbo`, L6 `bobbo-secret` (name says Bobbo, the address isn't the town's) |
| The link words tell you where it goes | L5, L6, L8 `puff-link` |
| Everything surprising is a trick | L8 safe messages (swim moved, snow day, parade early, picnic moved inside) |
| A friend's account is always my friend | L8 tricks from real town addresses |
| Reply to say stop / reply to check | L7 *Reply and say stop*, L8 *Reply to the message to check* |
| Every message is a scam | ≥ 2 safe messages per band; safe messages are as common as tricks on L0–L5 |

Not covered: "if it uses my name, it's real" (spec `mm.hint.name`). It would need the child's name in a message, and the child's name never leaves the onboarding screens (privacy rule). The spec's "never the same clue type 3 times in a row" rule also conflicts with its own per-level clue focus, so it was dropped for the sort levels. Clue mode and the review levels mix clue types.

## Story
- **Intro (4 beats):** letters zip across Byteberry Town; a grey fog of trick messages rolls in; Fenn ("can hear a trick from far away") needs a partner; "Safe mail goes in the mailbag. Tricks go to a grown-up."
- **Between beats:** "The fog is getting thinner" (2), "Use the magnifier" (4), "Some messages sound urgent but are really fine" (6).
- **Outro:** the fog is gone; "You looked for clues, and you know who to ask"; the **Detective Badge** sticker (an indigo badge with Fenn's ears and a gold magnifier).

## Accessibility
- Every control is a `<button>` with an action-describing label. Parts read in order: sender, body parts, link, file.
- Revealed addresses are announced in an `aria-live` region. The card has a full text description for screen readers, including the real address when it isn't folded.
- Playable muted (captions), by keyboard (Tab and Enter on everything; Enter on the envelope lifts the message) and without drag.
- Tap targets: bins ≥ 72 px, parts ≥ 44 px, speaker and lift ≥ 48 px. Ages 7+ need ≥ 44 px; the e2e checks this at four viewports.
- Reduced motion (`still`): no loops; the card fades instead of flying into the bin; the zoom becomes a ring only.

## Voice
Prefix `mm.`. Ids: story 10, intro 2, prompts 7, bins 2, action cards 6, helper 12, hints 7, retry 1, clue labels 9, magnifier 3 (2 of them vary by 8 domains → 16 clips), praise 9, idle 1, message read-alouds 82. In total 151 ids and 165 clips. Clips are not rendered yet, so the clip-coverage test fails until the lead renders them with Kokoro af_bella. Three read-alouds spell file extensions as "dot e x e": check how those render.

## Sources (consumer guidance the clues follow)
- CISA, *Secure Our World: Recognize and report phishing*: https://www.cisa.gov/secure-our-world/recognize-and-report-phishing
- CISA, *Secure Our World* tip sheet (four easy ways): https://www.cisa.gov/sites/default/files/2024-09/Secure-Our-World-4-Easy-Ways-Stay-Safe-Online-Tip-Sheet.pdf
- FTC consumer alert, *Protect yourself from phishing scams* (2025): https://consumer.ftc.gov/consumer-alerts/2025/04/protect-yourself-phishing-scams
- FTC, *How to recognize and avoid phishing scams* (PDF): https://www.consumer.ftc.gov/sites/www.consumer.ftc.gov/files/articles/design-files/how_to_recognize_and_avoid_phishing_scams_tl-508.pdf
- FTC consumer topic, gift cards (gift-card payment demands as a scam sign): https://consumer.ftc.gov/search-terms/gift-cards
- RFC 2606 reserved top-level domains (`.example`).

Clue ↔ guidance map:
- asks for a password or code, urgency, prizes, unexpected attachments, mismatched sender, deceptive links → CISA phishing page and FTC phishing guidance;
- gift-card payment → FTC;
- "don't tell your grown-ups" → secrecy as a red flag (`cyber.md` §5–6, Common Sense relationships and communication topic);
- "show a trusted grown-up" → CISA "report it" adapted for children.

## Flagged for expert review (before release)
1. **A cybersecurity educator should check all 82 messages and the level-7/8 card wording**, especially:
   - (a) whether "Check another way, with a grown-up" is the best child phrasing of FTC's "contact the company using a number you know";
   - (b) `mm.help.start`, now "Keep your password secret. Only share it with your grown-up." (the earlier absolute "friends and helpers never ask" was dropped after content review: parents and teachers sometimes do).
2. **A child-safety specialist should review** `our-secret` ("Let's be friends! Don't tell your family we talk."), `drawings-card`, `home-address` and `secret-gift`. All four touch online-contact grooming patterns (secrecy, gifts, asking where the child lives), in non-graphic wording, and all resolve to "Ask a grown-up".
3. **Rule simplification:** "Byteberry mail comes from byteberry.example" is a simplified domain rule. Real organisations sometimes use several domains, and real look-alikes can be subtler.
4. **Name check:** "Byteberry", "Gem Team", "Star Racer Game", "Prize Wizard" and the other names need a trademark/brand check, so that none matches a real product.
5. **Yearly re-check:** compare against current CISA/FTC guidance once a year.

## Tests
- `tests/unit/message-mystery.test.ts`:
  - **Bank rules:** `.example` only; safe means a town address, no clue and no secret request; every trick has a clue; sender and link clues agree with the data; ≤ 16 words; fear-word blocklist; every clue type taught.
  - **Generator:** lint at every level × 60 seeds; decode round-trip; no repeats in a band; follows its pattern; daily variety; determinism.
  - **Answers:** all five modes, including "asking about a safe one is a gentle miss".
  - **Lines:** diagnosed first-miss lines; every line exists; process praise; read-aloud text equals `sayOf(msg)`; magnifier lines cover every domain; registry entry.
- `e2e/message-mystery.spec.ts` (desktop + phone):
  - story → a full round by tap, drag, tap-tap and keyboard → outro → Detective Badge + level up;
  - sort misses (trick and safe);
  - clue mode first and second miss; action mode model;
  - levels 4–9 by every input (magnifier reveal checked);
  - viewport sweep (levels 0, 4–9 × four sizes, no overflow, targets ≥ 44 px).
  - Screenshots go to `/home/claude/review/message-mystery/`.
