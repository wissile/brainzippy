# Digital safety and cybersecurity library (`cyber`)

Ages 7–14. **Host:** Fenn (new; a round indigo fennec-monster detective with huge listening ears and a magnifier monocle, see `CHARACTERS.md`). Cameos: Loopi (CS), Snug (kindness online), Hoot (checking sources), Budge (money scams).
**Aligned with:**
- **CISA "Secure Our World"**, four steps: recognise and report phishing; use strong passwords (at least 16 characters, random, unique; a password manager helps); turn on multifactor authentication; update software (https://www.cisa.gov/sites/default/files/2024-09/Secure-Our-World-4-Easy-Ways-Stay-Safe-Online-Tip-Sheet.pdf).
- **FTC** consumer guidance on phishing and scams (https://consumer.ftc.gov/consumer-alerts/2025/04/protect-yourself-phishing-scams; how to recognise phishing: https://www.consumer.ftc.gov/sites/www.consumer.ftc.gov/files/articles/design-files/how_to_recognize_and_avoid_phishing_scams_tl-508.pdf).
- **Common Sense Education Digital Citizenship** curriculum topics (K–12): privacy and security, digital footprint and identity, relationships and communication, cyberbullying and online harms, news and media literacy, media balance (https://www.commonsense.org/education/digital-citizenship). We align with topics; we don't reuse its lessons.
- **CSTA**: 2017 `1A-NI-04` (passwords), `1B-NI-05` (protecting personal information), `2-NI-05` (physical and digital security measures), `2-IC-23` (public vs private trade-offs); 2026 `MS-SYS-SE-32` (effects of not using the CIA triad).

**House rules:** recognition and protective action only, never instructions that enable harm (no how-to for making scams, guessing passwords, bypassing controls or hacking). All names, towns, domains and messages are fictional; domains use the reserved `.example` top-level domain (RFC 2606) so nothing points to a real site. Links in games are never clickable.

## 1. Topics by age band

| Ages | Topic id | Topic | Framework link |
|---|---|---|---|
| 7–9 | `cyber.privacy` | Personal information: what stays private, who to ask | Common Sense privacy & security; 1B-NI-05 |
| 7–9 | `cyber.pass` | Passwords are secret; long passphrases | 1A-NI-04; CISA |
| 7–11 | `cyber.kind` | Unkind messages and asking for help | Common Sense cyberbullying & online harms |
| 7–10 | `cyber.contact` | When someone online asks for secrets, photos or to meet | Common Sense relationships & communication |
| 8–11 | `cyber.scam` | Phishing and scam clues; what to do | CISA; FTC |
| 9–12 | `cyber.footprint` | Digital footprint; public vs private | 2-IC-23; Common Sense footprint & identity |
| 9–13 | `cyber.media` | Misinformation: check sources, edited images | Common Sense news & media literacy |
| 9–14 | `cyber.ai` | Safe AI use: AI can be wrong; never share personal info; label AI images | Common Sense AI literacy; CSTA 2026 AI-tagged standards |
| 10–13 | `cyber.device` | Updates, app permissions | CISA; 2-NI-05 |
| 11–14 | `cyber.security` | MFA, password managers, the CIA triad | CISA; MS-SYS-SE-32 |

## 2. Skills

| skill_id | Objective (child can…) | Ages | Prereqs | Misconceptions targeted | Lowest-level example | Highest-level example | Aligned with |
|---|---|---|---|---|---|---|---|
| `cyber.privacy.personal-info` | sort information into private and OK-to-share | 7–9 | — | first name + school + photo together is harmless; online friends count as people you know | address vs favourite colour | a photo that shows a school badge and street sign | 1B-NI-05 |
| `cyber.pass.secret` | keep passwords secret except with a trusted grown-up | 7–8 | — | best friends can know your password | who may know your password? | a "game helper" asks for it | 1A-NI-04 |
| `cyber.pass.strong` | build a long, unique passphrase and never reuse it | 8–11 | pass.secret | short with symbols beats long; one strong password for everything; personal facts make good passwords | pick the longer passphrase | build a 4-word, 16+ character passphrase that uses no personal info | 1A-NI-04; CISA |
| `cyber.scam.clues` | spot clues in phishing messages | 8–11 | privacy.personal-info | good spelling or a logo means it's real; using my name means it's real | "Send your password" | look-alike sender and mismatched link in a polished message | CISA; FTC |
| `cyber.scam.action` | choose safe actions: don't click or reply, tell a trusted adult, report/delete together | 8–11 | scam.clues | reply to say "stop"; click to check | what do you do? (3 choices) | rank 4 actions | CISA; FTC |
| `cyber.scam.verify` | check a surprising message another way (known contact, typing a known address) | 10–14 | scam.action | reply to the message to check it | a friend's account asks for gift cards | an urgent message from "school" with a new link | FTC; 2-NI-05 |
| `cyber.contact.tell` | stop and tell a trusted adult when someone online asks for secrets, photos, personal info or to meet | 7–10 | privacy.personal-info | it's OK if they're nice or the same age; you'll get in trouble for telling | game friend asks your school | "don't tell your parents" + gift offer | Common Sense relationships & communication |
| `cyber.kind.respond` | respond to unkind messages: don't reply, save, block, tell; support a target | 7–11 | sel.feel.basic (soft) | fighting back fixes it; telling is tattling | mean message: what first? | bystander chooses a supportive action | Common Sense cyberbullying |
| `cyber.footprint.permanent` | predict who can see and copy a post and decide before posting | 9–12 | privacy.personal-info | deleting removes all copies; private means private forever | will this post be seen by…? | screenshot chain shows spread | 2-IC-23 |
| `cyber.media.source` | check a claim by looking for other trustworthy sources | 9–13 | ela.read.main-idea (soft) | lots of shares = true; looks professional = true | real or prank headline? | lateral check across 3 sources | Common Sense news & media literacy |
| `cyber.media.images` | recognise that images can be edited or generated, and check before sharing | 10–13 | media.source | photos are proof | spot an edited shadow | decide what to do with an unlabelled AI-looking image | Common Sense; CSTA 2026 AI-tagged |
| `cyber.ai.safe-use` | use AI helpers safely: check answers, keep personal info out, ask a grown-up | 9–14 | media.source | AI is always right; AI is a person/friend; AI keeps secrets | should you tell the helper your address? | AI answer conflicts with a book: what next? | Common Sense AI literacy; MS-ALG-PS-05 (context) |
| `cyber.device.update` | explain that updates fix security problems | 10–13 | — | updates only add features; updates are risky | update now or later? | update prompt vs fake "update" pop-up | CISA |
| `cyber.device.permissions` | allow only the permissions an app needs | 10–13 | privacy.personal-info | apps need everything to work | drawing app wants location | choose minimal permissions for 3 apps | 2-IC-23 |
| `cyber.security.mfa` | explain multifactor authentication | 11–14 | pass.strong | MFA codes can be shared with support staff | two locks on a door | a caller asks for your code | CISA |
| `cyber.security.cia` | use the CIA triad to describe what an attack harms | 12–14 | security.mfa | security = passwords only | match scenario to C/I/A | effects of a leaked password file | MS-SYS-SE-32, 2-NI-05 |

## 3. World concepts (prioritised)

### 1. Fenn's Message Mystery — **first world** (ages 8–11)
- **Host:** Fenn · **Helper:** Hoot · **Scene:** the post office of Byteberry Town, a cosy virtual town.
- **Hook:** A strange fog of fake messages has rolled into Byteberry Town, and Fenn needs a junior detective to sort the real mail from the tricks.
- **Interaction:** drag messages into Safe / Trick bins; magnify sender and links; tap clues. **Answer kind:** set-matching; choice.
- **Levels:** see §4 (9 levels).
- **Hints:** magnifier highlights the area holding the clue; Hoot names the clue type. **A11y:** messages read aloud; bins are buttons.

### 2. Password Locksmith (ages 7–10)
- **Host:** Fenn · **Cameo:** Brix · **Scene:** locksmith shop with doors to each friend's treehouse.
- **Hook:** Every treehouse door needs its own strong secret phrase, and the Sneaky Squirrel tries easy guesses.
- **Interaction:** build passphrases from word tiles; the squirrel's "guess meter" shows how long it would take (illustrative). **Answer kind:** set-matching (rule check: ≥4 words, ≥16 characters, no personal-info tiles, not used on another door).
- **Levels:**
  1. secret or share?
  2. longer is stronger
  3. no names or birthdays
  4. 3-word phrase
  5. 4-word phrase ≥16 characters
  6. each door different
  7. a grown-up's password manager remembers them (concept)
- **Hints:** tile shows "personal" badge. **A11y:** tiles read aloud. The meter is labelled "pretend"; no real strength algorithm claims.

### 3. Secret Keeper Sort (ages 7–9)
- **Host:** Fenn · **Cameo:** Snug · **Scene:** a treehouse with a locked "private" box and an open noticeboard.
- **Hook:** Snug is making a club poster, and some facts belong on the board while others go in the private box.
- **Interaction:** drag fact cards. **Answer kind:** set-matching.
- **Levels:**
  1. address vs favourite food
  2. passwords
  3. school name
  4. photos with clues
  5. combinations of harmless facts
  6. who can know (trusted grown-up)
  7. game friend asks
- **Hints:** "Could a stranger find you with this?" **A11y:** cards read aloud.

### 4. Footprint Beach (ages 9–12)
- **Host:** Fenn · **Scene:** sandy beach where every post leaves footprints others can follow and copy.
- **Hook:** Byteberry's beach keeps every footprint, even after the tide, and Fenn's cousin is about to post something.
- **Interaction:** choose post, audience and decide; watch the footprint trail (copies, screenshots). **Answer kind:** choice / set-matching.
- **Levels:**
  1. public vs friends
  2. who can copy
  3. deleting doesn't erase copies
  4. posting about others needs permission
  5. future-you test
  6. fix a footprint with a grown-up's help
- **A11y:** spread shown as a list too.

### 5. Fact Lighthouse (ages 9–13)
- **Host:** Hoot · **Cameo:** Fenn · **Scene:** a lighthouse that shines on rumours.
- **Hook:** A rumour that "the bridge is made of jelly" is spreading through town, and the lighthouse must check it.
- **Interaction:** open other sources (in-game), compare, decide share / don't share / check more. **Answer kind:** choice / set-matching.
- **Levels:**
  1. joke vs news
  2. who made it?
  3. check a second source
  4. lots of shares ≠ true
  5. edited photo clues
  6. AI-generated label missing
  7. lateral reading across 3 sources
  8. correct a rumour kindly
- All sources fictional.

### 6. Robot Helper Rules (safe AI use) (ages 9–14)
- **Host:** Fenn · **Cameo:** Loopi · **Scene:** the town library's AI helper kiosk.
- **Hook:** The town's new AI helper answers questions instantly, but sometimes it's confidently wrong.
- **Interaction:** decide what to ask, what not to share, and how to check answers. **Answer kind:** choice / set-matching.
- **Levels:**
  1. AI is a tool, not a person
  2. don't share personal info
  3. check facts in a book
  4. AI can make things up
  5. AI images need labels
  6. use AI help honestly for homework (follow your teacher's rules)
  7. when to ask a grown-up
- The kiosk is scripted; **no real AI model is used**, so no child input leaves the device.

### 7. App Permission Gate (ages 10–13)
- **Host:** Fenn · **Scene:** town gate where apps ask for keys (camera, location, contacts).
- **Hook:** New apps arrive at the gate asking for keys, and some ask for far too many.
- **Interaction:** grant/deny each key per app. **Answer kind:** set-matching (minimal required set).
- **Levels:**
  1. drawing app vs camera
  2. maps need location
  3. a torch app asking for contacts
  4. "only while using"
  5. review old permissions
  6. updates fix holes
  7. fake update pop-up

### 8. Kind Words Patrol (ages 7–11)
- **Host:** Snug · **Cameo:** Fenn · **Scene:** the town message board.
- **Hook:** Someone posted a mean message about Bobbo, and the patrol decides what to do.
- **Interaction:** choose responses and order steps. **Answer kind:** sequence / choice.
- **Levels:**
  1. unkind or kind?
  2. don't reply in anger
  3. save and tell
  4. block/report with a grown-up
  5. support the target
  6. bystander steps in order
- Shares SEL skills; see `social-emotional.md` safety notes.

### 9. Town Shield (ages 12–14)
- **Host:** Fenn · **Scene:** Byteberry's control room (power, water, library records).
- **Hook:** The town's systems need protecting from leaks, tampering and outages.
- **Interaction:** match scenarios to Confidentiality / Integrity / Availability; choose defences (MFA, updates, backups). **Answer kind:** set-matching.
- **Levels:**
  1. C/I/A sort
  2. MFA
  3. updates
  4. backups
  5. leaked passwords
  6. layered defences
  7. incident report
- Descriptions stay at the level of effects and defences; no attack techniques.

## 4. First world to build: **Fenn's Message Mystery**

**Why first:** recognising and reporting phishing is CISA's first step, it matches the owner's "digital detective protecting a virtual town" example, and the sort-and-magnify interaction is reused by Fact Lighthouse and App Permission Gate.

### 4.1 Objective and skills
"Child can spot clues that a message is a trick and choose a safe action." L0–L6 `cyber.scam.clues` (Lm 4); L7 `cyber.scam.action` (Lm 7); L8–L9 `cyber.scam.verify` (Lm 8).

### 4.2 Story
| Beat | Line (`mm.`) |
|---|---|
| intro1 | "Welcome to Byteberry Town, where messages zip from house to house." |
| intro2 | "But today a grey fog rolled in, full of trick messages." |
| intro3 | "Fenn the detective can hear a trick from a mile away. She needs a partner." |
| intro4 | "Sort the mail: safe messages to the town, tricks into the fog jar." |
| between2 | "Good sorting! The fog is getting thinner." |
| between4 | "Use the magnifier. Tricks love to hide in the details." |
| between6 | "Some messages sound urgent but are really fine. Look closely!" |
| outro1 | "The fog is gone!" |
| outro2 | "You looked for clues and chose safe steps every time." |
| outro3 | "Here's your Detective Badge!" |

### 4.3 Board
- A message card in the centre: sender name, sender address, subject, short body (≤35 words, reading level ≈ grade 3), optional link line or attachment chip.
- Two bins: **Safe** (town mailbag) and **Trick** (fog jar). Drag, or press the bin buttons.
- **Magnifier** (L4+): tap the sender or the link to reveal the real address (an `.example` domain).
- **Clue mode** (L6): tap every suspicious part of the message (each part is a button), then "Done".
- **Action mode** (L7): choose the best action card.
- Every message has a voice clip read by the narrator (not Fenn) so non-readers can play.

### 4.4 Message bank and generator
Messages are **authored** (not generated) so each has a voice clip and an expert check. Bank ≈ 72 messages, each tagged `{ level, safe | trick, clues[], expectedAction }`.

Clue types (from CISA/FTC guidance):
| Clue id | Description | Example (fictional) |
|---|---|---|
| `asks-secret` | asks for a password, code or personal info | "Reply with your password so we can fix your game." |
| `prize` | prize or offer too good to be true | "You won 1,000,000 gems! Claim now!" |
| `urgent` | rush or threat | "Your account closes in 1 hour!" |
| `keep-secret` | asks to hide it from grown-ups | "Don't tell your parents about this gift." |
| `gift-card` | asks for payment by gift card (FTC: a sign of a scam) | "Buy a gift card and send the code." |
| `sender-mismatch` | name says one thing, address another | "Byteberry Library" `<prizes@b1teberry-library.example>` |
| `link-mismatch` | link text differs from real destination | text `library.byteberry.example` → real `byteberry-login.example` |
| `look-alike` | familiar name with a changed letter | "Byteberry Libary" |
| `unexpected-file` | attachment nobody expected | "open_me_now.exe" shown as a file chip |

Safe messages: from known townsfolk at matching addresses (`@byteberry.example`), about expected things, asking for nothing secret (e.g. "Library books due Friday. See you soon!").

| Level | Mix per round (8) | Clues per trick | Mode | Notes |
|---|---|---|---|---|
| 0 tutorial | 1 | `asks-secret` | sort | pointing hand to Trick |
| 1 | 4 trick / 4 safe | 1: `asks-secret` or `prize` | sort | very obvious |
| 2 | 4/4 | 1: + `urgent` | sort | |
| 3 | 4/4 | 1: + `keep-secret`, `gift-card` | sort | |
| 4 | 4/4 | 1: `sender-mismatch` or `look-alike` (body otherwise polished) | sort + magnifier | defeats "good spelling = safe" |
| 5 | 4/4 | 1: `link-mismatch` | sort + magnifier | |
| 6 | 6 trick / 2 safe | 2–3 per message | clue mode | answer = exact set of clue parts |
| 7 | 5 trick / 3 safe | any | action mode | best action: trick → "Don't click or reply. Tell a trusted grown-up." Safe → "Read it and reply if you want." |
| 8 | 3 trick / 5 safe | 1 subtle | sort + choose reason | includes **urgent-but-safe** messages (e.g. swim class moved today, from the known coach's address, asks nothing) and friend-account tricks (a friend's real address asks for gift cards → "check another way") |
| 9 | 5-message inbox | mixed | sort all, then explain one | |

Selection: seeded draw from the bank by level without repeats in a round; at least 2 safe messages per round (avoid teaching "everything is a scam"); never the same clue type 3 times in a row.

### 4.5 Misconceptions → feedback
| Misconception | Where tested | First-miss explanation (Hoot) |
|---|---|---|
| "Good spelling and logos mean it's real" | L4–L5 polished tricks | `mm.hint.polish` "Tricks can look very neat. Check who really sent it." |
| "If it uses my name, it's real" | L3–L5 | `mm.hint.name` "Anyone can type your name. What is it asking for?" |
| "A friend's account is always my friend" | L8 | `mm.hint.friend` "Accounts can be borrowed or stolen. Ask your friend another way." |
| "Everything urgent is a trick" | L8 safe-urgent | `mm.hint.expected` "Was this expected? Does it ask for anything secret?" |
| "Reply to say stop" | L7 | `mm.hint.reply` "Replying tells the tricker you're there. Tell a grown-up instead." |

### 4.6 Hint ladder
- **First miss:** the message returns; the magnifier glows over the region with the clue (without naming it); Hoot gives the concept line.
- **Second miss (model):** the clue is circled and labelled ("Asks for a password"), Fenn explains, the right bin glows; the child drags it (errorless).

### 4.7 Helper explanations (Hoot)
- `mm.help.start` "Real friends and helpers never ask for your password."
- `mm.help.prize` "If a prize seems too good to be true, it's probably a trick."
- `mm.help.rush` "Tricks try to rush you. Slow down and check."
- `mm.help.secret` "If a message says 'don't tell your grown-up', tell your grown-up."
- `mm.help.sender` "Look at the real address, not just the name."
- `mm.help.link` "The words on a link can say one place and go to another."
- `mm.help.action` "Don't click, don't reply. Show a trusted grown-up."

### 4.8 Voice lines (prefix `mm.`; ≈50 ids + message clips)
Prompts: `mm.prompt.sort` "Safe or trick?" · `mm.prompt.magnify` "Use the magnifier to check." · `mm.prompt.clues` "Tap every clue you can find." · `mm.prompt.action` "What's the safest thing to do?" · `mm.prompt.reason` "Why did you decide that?"
Praise: `mm.praise.1` "You checked the real address!" · `mm.praise.2` "You found every clue." · `mm.praise.3` "Telling a grown-up is a detective move." · `mm.praise.4` "You noticed it was expected and asked for nothing secret."
Retry: `mm.retry.1` "Let's look closer." · Idle: `mm.idle` "Drag the message to a bin."
Story 10, helper 7, hints 5, clue labels 9. Message read-alouds ≈ 72. **Estimate ≈ 50 ids, ≈ 125 clips.**

### 4.9 Reward
Sticker **"Detective Badge"**: a round indigo badge with Fenn's ears and a magnifier.

### 4.10 Accessibility
Message parts are focusable in reading order; magnifier and clue taps are buttons; bins are buttons; the revealed address is announced; text scalable to 200% without overlap.

## 5. Accuracy notes (expert review recommended)
- Guidance must match CISA Secure Our World and FTC consumer advice current at release; re-check yearly. A cybersecurity educator reviews all items, especially passwords (current CISA guidance favours long, random, unique passwords and password managers over complex short ones).
- The password-strength "guess meter" is illustrative and labelled pretend; it doesn't estimate real cracking times.
- Use only `.example` domains and fictional names; check that no fictional name matches a real brand or service.
- Gift-card demands, urgency and secrecy are taught as red flags per FTC guidance.

## 6. Age-appropriateness and safety
- No harmful instructions; the curriculum covers spotting, protecting and reporting only.
- Online-contact skills (`cyber.contact.tell`) use non-graphic, age-appropriate wording ("asks you to keep a secret, send photos or meet up") and always end with "tell a trusted grown-up; you won't be in trouble". A child-safety specialist reviews this topic before release.
- Threats in messages stay mild (closing a game account); no violence, sexual content or fear tactics.
- The product itself has no chat, so children practise these skills only on fictional content; parent notes suggest talking about real devices together.
