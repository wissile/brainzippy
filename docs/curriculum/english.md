# English library (`ela`)

Ages 3–14. **Hosts:** Hoot (reading, existing) and Zuzu (spelling, existing). Cameos: Gloop (word shapes), Puff (word counting).
**Aligned with:** Common Core State Standards for English Language Arts & Literacy (CCSS-ELA): Reading Foundational Skills (RF), Language (L), Reading Literature/Informational (RL/RI), Writing (W). Ages 3–4 are pre-kindergarten; CCSS starts at K, so band A skills are mapped to their kindergarten counterparts as "precursor to".

## 1. Topics by age band

| Band | Topic id | Topic | Skills (ids below) |
|---|---|---|---|
| A 3–5 | `ela.phon` | Phonological awareness (sounds in spoken words) | rhyme, syllables, first sound |
| A 3–5 | `ela.letters` | Letter knowledge | recognise, upper-lower match, letter-sound |
| B 6–8 | `ela.phonics` | Decoding and spelling patterns | CVC, digraphs, blends, magic e, vowel teams |
| B 6–8 | `ela.words` | High-frequency and compound words | sight words, compound words |
| B 6–8 | `ela.sentence` | Sentences | build a sentence, end punctuation |
| B 6–8 | `ela.read` | Comprehension | story order, who/what/where |
| C 9–11 | `ela.vocab` | Word meaning | affixes, Greek/Latin roots, context clues, figurative language |
| C 9–11 | `ela.grammar` | Grammar and punctuation | sentence types, fragments and run-ons, apostrophes |
| C 9–11 | `ela.read` | Comprehension | main idea and details |
| D 12–14 | `ela.argue` | Argument | claim, evidence, reasoning; evaluating support |
| D 12–14 | `ela.grammar` | Advanced grammar | misplaced modifiers, pronoun reference |
| D 12–14 | `ela.vocab` | Connotation | shades of meaning |

## 2. Skills

| skill_id | Objective (child can…) | Ages | Prereqs | Misconceptions targeted | Example: lowest level | Example: highest level | Aligned with |
|---|---|---|---|---|---|---|---|
| `ela.phon.rhyme` | tell whether two spoken words rhyme and pick a rhyming word | 3–5 | — | rhyme = same first sound (cat/cup); rhyme = same meaning | "Cat… hat. Rhyme?" (yes/no) | Pick the rhyme for "frog" from log / fresh / fog-horn picture set | RF.K.2.A |
| `ela.phon.syllables` | count syllables in a spoken word | 4–6 | — | counting letters or words instead of beats | "sun" → 1 drum tap | "caterpillar" → 4 | RF.K.2.B |
| `ela.phon.first-sound` | isolate the first sound of a spoken CVC word | 4–6 | rhyme (soft) | letter name ≠ sound ("double-u" for /w/) | Which starts like "sun": sock / map? | Which starts like "chin": chop / cat / ship? | RF.K.2.D |
| `ela.letters.recognise` | name and find all 26 lowercase letters | 3–5 | — | mirror letters b/d, p/q; n/u rotation | Find "m" among m, o | Find "b" among b, d, p, q | RF.K.1.D |
| `ela.letters.case-match` | match upper- and lowercase forms | 4–6 | recognise | shapes that differ (A/a, G/g) | match S–s (same shape) | match G–g, Q–q, R–r | RF.K.1.D |
| `ela.letters.sound` | link each consonant and short vowel to its most common sound | 4–6 | first-sound, recognise | names vs sounds; c/k/s confusion | Which letter says /m/? m / t | Which says short /ĭ/? i / e / a | RF.K.3.A, RF.K.3.B |
| `ela.phonics.cvc` | blend and spell consonant-vowel-consonant words | 5–7 | letters.sound | dropping the middle vowel ("ct"); vowel swaps a/e, o/u | Pick first letter of "sun" (u, n given) | Spell "jet" from j, e, i, t, d | RF.1.2.B, RF.K.3.B |
| `ela.phonics.digraph` | read and spell sh, ch, th, ck as one sound | 6–7 | cvc | sh spelled "s"+"h" sounded separately; ck vs k | "fi__" + sh / ch | Spell "chick" with ch, i, ck tiles + distractors | RF.1.3.A |
| `ela.phonics.blend` | read and spell words with consonant blends | 6–7 | cvc | dropping the second blend consonant (frog → "fog") | "_rog" pick f | Spell "plum" from 6 tiles | RF.1.2.B |
| `ela.phonics.magic-e` | read and spell CVCe words with a long vowel | 6–8 | cvc | e is "pronounced"; long vowel without e | cap or cape for the picture? | Spell "kite" from k, i, t, e, a, c | RF.1.3.C |
| `ela.phonics.vowel-team` | read and spell common vowel teams (ai, ay, ee, ea, oa) | 7–8 | magic-e | one spelling per sound | rain: ai or ay? | sort words by long-e spelling ee/ea | RF.2.3.B |
| `ela.words.sight` | read high-frequency words automatically | 5–7 | letters.recognise | sounding out irregular words ("said" as /sayd/) | find "the" among 2 words | find "said" among said, sad, sand, side | RF.K.3.C |
| `ela.words.compound` | build and explain compound words | 6–8 | sight (soft) | any two words make a compound | sun + flower → ? | pick the meaning of "bookworm" | L.2.4.D |
| `ela.sentence.build` | order words into a sentence with a capital and end mark | 6–8 | sight | capital anywhere; period optional | 3 word planks: "I see Bobbo." | 7 planks + choose . or ? | L.1.2.B |
| `ela.read.sequence` | order 3–5 events of a short story | 5–8 | — | order = picture position on screen | 3 panels | 5 panels, one distractor panel from another story | RL.1.2 |
| `ela.vocab.affix` | work out meaning when a known affix is added | 8–10 | compound | "re-" always means again (real); un-/dis- mix-ups | un + happy → ? | pick the word that means "able to be read again" | L.3.4.B |
| `ela.vocab.roots` | use Greek/Latin roots to infer meaning | 9–11 | affix | root = whole word meaning | "tele" = far: telescope means… | define "biograph" from bio + graph | L.4.4.B |
| `ela.vocab.context` | infer an unknown word's meaning from context | 9–12 | — | picking the most familiar-looking option | invented word, one strong clue | invented word, clues spread over 3 sentences | L.4.4.A |
| `ela.vocab.figurative` | interpret similes and metaphors | 9–11 | context | literal reading | "as quiet as a mouse" means… | "the classroom was a zoo" means… | L.5.5.A |
| `ela.grammar.sentence-types` | build simple, compound and complex sentences | 8–10 | sentence.build | comma splice to join clauses | join two short sentences with "and" | combine with "because", "although" | L.3.1.I |
| `ela.grammar.fragments` | fix fragments and run-ons | 9–11 | sentence-types | long = run-on; short = fragment | Is "Ran to the park." complete? | split a run-on in two places | L.4.1.F |
| `ela.grammar.apostrophe` | use apostrophes for contractions and possessives | 7–9 | sentence.build | plural with apostrophe ("apple's") | do + not → don't | Zuzu's / Zuzus' / Zuzus for the picture | L.2.2.C |
| `ela.read.main-idea` | find the main idea and two supporting details | 9–11 | read.sequence | first sentence = main idea; interesting detail = main idea | 3-sentence paragraph | 2 paragraphs, distractor = vivid detail | RI.4.2 |
| `ela.argue.claim-evidence` | separate claims from supporting evidence and judge support | 12–14 | main-idea | opinion stated strongly = evidence | sort 4 statements claim / evidence | which evidence does NOT support the claim? | RI.6.8, W.6.1 |
| `ela.grammar.modifier` | find and fix misplaced modifiers | 12–14 | fragments | modifier attaches to nearest noun by meaning | pick the clear sentence of two | rewrite by moving the phrase (sequence) | L.7.1.C |
| `ela.vocab.connotation` | choose words by connotation | 12–14 | context | synonyms are interchangeable | thrifty vs stingy for a kind sentence | rank 4 words from negative to positive | L.7.5.C |

## 3. World concepts (prioritised)

### 1. Zuzu's Word Train — **first world** (ages 5–7)
- **Host:** Zuzu · **Helper:** Hoot · **Scene:** Monster Island station, a little steam train with letter cars.
- **Hook:** A storm shook the letters off the Word Train, and the crates can't be delivered until each word is rebuilt.
- **Interaction:** drag letter tiles onto train cars (tap tile → fills next empty car; keyboard). **Answer kind:** sequence (exact spelling).
- **Levels:** see full spec in §4 (9 levels: first sound → last sound → middle vowel → whole CVC → digraphs → blends → magic e).
- **Hints:** stretch the word slowly; Hoot points to the mouth picture for the sound; model glides the correct tile. **A11y:** tap and keyboard; tiles labelled by letter.

### 2. Hoot's Rhyme Lanterns (ages 3–5)
- **Host:** Hoot · **Scene:** night forest; lanterns light up when two rhyming words meet.
- **Hook:** Hoot's lanterns only glow when rhyming friends hold hands, and the forest party starts at dark.
- **Interaction:** drag a picture-lantern to the lantern that rhymes. **Answer kind:** choice.
- **Levels:**
  1. yes/no: do these two rhyme? (very different non-rhymes)
  2. pick the rhyme from 2 pictures
  3. pick from 3; distractor shares the first sound (cat → cup)
  4. pick from 3; distractor shares the vowel only (cat → cap)
  5. odd one out of 3 rhyming + 1
  6. pick from 4 with blends (frog → log)
  7. make a rhyme chain of 3
- **Hints:** Hoot says both words slowly, stressing the ending ("c-**at**, h-**at**"). **A11y:** every picture is spoken on focus; no reading needed. TTS-friendly (whole words only), so this is the **fallback first world** if phoneme recordings are not ready.

### 3. Drum Parade Syllables (ages 4–6)
- **Host:** Hoot · **Cameo:** Rumble on the big drum · **Scene:** parade through the meadow.
- **Hook:** The parade needs one drum beat for every word-part, or the marchers trip.
- **Interaction:** tap the drum once per syllable, then press "March". **Answer kind:** number.
- **Levels:**
  1. 1 vs 2 syllables (sun, rabbit)
  2. 1–2
  3. 1–3
  4. 2–3 with similar-looking words
  5. 1–4 (caterpillar)
  6. sort 4 pictures by syllable count (set-matching)
- **Hints:** Rumble claps with chin-drop cue ("put your hand under your chin"). **A11y:** "drum" is a big button; count shown as dots.

### 4. Letter Lagoon (ages 3–5)
- **Host:** Zuzu · **Scene:** lily-pad lagoon, frogs carry letters.
- **Hook:** Baby frogs are lost and each one only answers to its own letter.
- **Interaction:** tap or drag the lily pad with the asked-for letter. **Answer kind:** choice.
- **Levels:**
  1. find a letter among 2 very different
  2. among 3
  3. among 4 including one similar shape (h/n)
  4. mirror pairs b/d
  5. p/q
  6. match uppercase to lowercase
  7. match a letter to its sound
- **Hints:** trace the letter shape with a glowing finger; mnemonic picture for b ("bat then ball"). **A11y:** large tiles; letters in the BrainZippy body font with a single-storey "a" (choice documented with design system).

### 5. Sentence Bridge (ages 6–8)
- **Host:** Zuzu · **Cameo:** Bobbo needs to cross · **Scene:** river with plank bridge.
- **Hook:** Bobbo can cross the river only on a bridge of words that makes a sentence.
- **Interaction:** drag word planks into order; choose the end-mark plank. **Answer kind:** sequence (any grammatical order from the accepted list).
- **Levels:**
  1. 3 words, capital given
  2. 4 words
  3. choose capital vs lowercase start
  4. choose . or ?
  5. 5–6 words
  6. one extra plank that doesn't fit
  7. 7 words with "and"
- **Hints:** Hoot reads the planks aloud in the child's order, then asks "Does that sound right?" **A11y:** keyboard reorder with arrow keys; planks read aloud.

### 6. Hoot's Story Order (ages 5–8)
- **Host:** Hoot · **Scene:** shadow-puppet theatre.
- **Hook:** The wind mixed up the story pictures just before the puppet show starts.
- **Interaction:** drag panels into first/next/last slots. **Answer kind:** sequence (exact).
- **Levels:**
  1. 3 panels with obvious cause
  2. 3 panels with time words
  3. 4 panels
  4. 4 panels from a heard story (no pictures of words)
  5. 5 panels
  6. 5 panels with one panel from another story to leave out
- **Hints:** Hoot retells with "first… then… last"; model places panel 1. **A11y:** panels have spoken descriptions.

### 7. Hoot's Mystery Words (ages 9–12)
- **Host:** Hoot · **Scene:** library of strange books.
- **Hook:** A book written in half-invented words has to be decoded before the library closes.
- **Interaction:** tap clue words in the passage (set), then choose the meaning. **Answer kind:** set-matching + choice.
- **Levels:**
  1. definition clue in the same sentence
  2. synonym clue
  3. antonym clue ("unlike…")
  4. example clue
  5. clue in the next sentence
  6. clues spread over 3 sentences
  7. two mystery words in one passage
  8. choose the best real word to replace the invented word
- **Hints:** highlight the sentence that holds the clue; then name the clue type. **A11y:** passage text scalable; tap-to-select works by keyboard.
- Uses **invented words** (e.g. "glimber") so prior vocabulary can't answer it.

### 8. Zuzu's Word Workshop (ages 8–11)
- **Host:** Zuzu · **Cameo:** Gloop shapes the parts · **Scene:** workshop with word-part bins.
- **Hook:** Customers order words by meaning, and Zuzu must assemble them from parts.
- **Interaction:** drag prefix/root/suffix parts onto a conveyor. **Answer kind:** sequence.
- **Levels:**
  1. un- + known word
  2. re-
  3. -ful / -less
  4. two affixes (un-help-ful)
  5. Greek roots (tele, graph, phon)
  6. Latin roots (port, rupt, struct)
  7. build from meaning only
  8. spot the fake word that misuses a part
- **Hints:** Hoot gives the part's meaning card. **A11y:** parts read aloud with meanings.

### 9. Claim Court (ages 12–14)
- **Host:** Hoot as judge · **Scene:** a forest courtroom deciding "Should the island build a skate park?"
- **Hook:** Two sides argue, and the court can rule only on statements backed by evidence.
- **Interaction:** sort statements into claim / evidence / reasoning / not relevant; then rate support. **Answer kind:** set-matching.
- **Levels:**
  1. claim vs evidence (2 bins)
  2. add "not relevant"
  3. add reasoning
  4. spot unsupported claim
  5. evidence that contradicts
  6. choose the strongest evidence of 3
  7. build an argument from 6 cards
- **Hints:** "Could someone check this?" test for evidence. **A11y:** text-led with read-aloud.

### 10. Modifier Mix-up (ages 12–14)
- **Host:** Zuzu · **Scene:** a comic-strip printer that draws sentences literally.
- **Hook:** The printer draws exactly what a sentence says, so "I saw a dog in my pyjamas" prints a dog in pyjamas.
- **Interaction:** drag the phrase to a new position until the drawing matches. **Answer kind:** sequence.
- **Levels:** 1 pick the clear sentence · 2 move a prepositional phrase · 3 dangling "-ing" phrase · 4 "only" placement · 5 pronoun with two possible nouns · 6 fix two in a paragraph.
- **Hints:** the literal drawing itself is the hint. **A11y:** drawing has an alt description.

## 4. First world to build: **Zuzu's Word Train**

**Why first:** CVC blending and spelling is the gateway skill for reading (RF.1.2.B, RF.K.3.B), fits the current 5–7 audience and existing Zuzu/Hoot art, and the drag-to-slot board is reusable for Sentence Bridge, Word Workshop and Story Order.
**Blocking dependency:** isolated speech sounds (/s/, /m/, /ă/…) must be **human-recorded** (≈35 clips) and checked by a literacy specialist. Neural TTS mispronounces isolated phonemes (adds "uh": "buh"), which teaches the wrong sound. If recordings are not ready, build **Hoot's Rhyme Lanterns** first (whole words only).

### 4.1 Objective and skills
"Child can blend and spell short words by matching each sound to letters." Level → skill map: L1–L6 `ela.phonics.cvc` (Lm = 5); L7 `ela.phonics.digraph` (Lm = 7); L8 `ela.phonics.blend` (Lm = 8); L9 `ela.phonics.magic-e` (Lm = 9).

### 4.2 Story beats (each one sentence, voiced)
| Beat | Line (`wt.` ids) | Scene |
|---|---|---|
| intro1 | "Toot toot! Zuzu drives the Word Train around Monster Island." | train rolls in |
| intro2 | "Each crate has a word on its train cars, so it reaches the right friend." | cars with crates |
| intro3 | "Oh no, a big wind blew the letters off!" | letters swirl away |
| intro4 | "Can you put the sounds back in order? Let's roll!" | Zuzu waves; Hoot lands |
| between2 | "Two crates delivered! Bobbo got his hat." | Bobbo in hat |
| between4 | "The train is halfway round the island!" | map with train dot |
| between6 | "Nearly there. Listen for every sound!" | train climbs hill |
| outro1 | "Every crate is home!" | crates open |
| outro2 | "You listened to each sound and found its letter." | Zuzu cheers |
| outro3 | "Here's your Station Star!" | sticker |

### 4.3 Board
- A picture crate (word picture) above 3–4 train cars; some cars may be pre-filled (grey letters, not movable).
- A tile tray with 2–6 letter tiles (≥64 px). Tapping a tile fills the leftmost empty car; tapping a filled car returns its tile. Drag also works. Keyboard: Tab to tile, Enter places; Backspace removes the last tile.
- "Go" button submits when all cars are full (`act CHOOSE` with the joined string). Train toots and rolls on success.
- Speaker button on the crate replays the word; each tile plays its **sound** on press (not its letter name).

### 4.4 Word bank (picturable, one common spelling; US English)
- **CVC:** cat, hat, bat, map, fan, van, can, pan, jam, bag, rat, dog, log, pot, mop, box, fox, sun, bus, cup, bug, rug, nut, hut, tub, bed, web, jet, leg, net, ten*, pen*, hen*, pig, pin*, lid, six, zip, kit, fin*.
- **Digraph (L7):** ship, shop, fish, dish, shed, chin, chop, chick, bath, moth, duck, sock, rock, sack.
- **Blends (L8):** frog, crab, drum, flag, sled, slug, plum, clam, twig, tent, desk, lamp, belt, milk, hand, nest.
- **Magic-e contrast pairs (L9):** cap/cape, kit/kite, hop/hope, cub/cube, tub/tube, pin/pine, can/cane, not/note; plus bike, bone, rope, cake, lake, nose, rose, cone.
- *Words marked * have a vowel before m/n. Many US speakers (pin–pen merger) say "pen" and "pin" alike, so these words are **never** paired with an e/i distractor.

### 4.5 Generator rules per level (seeded; deterministic)
| Level | Cars | Pre-filled | Tiles offered | Distractor rule (misconception) |
|---|---|---|---|---|
| 0 tutorial | 3 | cars 2–3 | 2 | "sun": s vs m, pointing hand |
| 1 First sound | 3 | cars 2–3 | 2 | maximally different consonant (different place and manner: s vs b); no b/d/p/q |
| 2 First sound | 3 | cars 2–3 | 3 | one distractor that shares the vowel's word family (rhyme partner start: hat → c from cat), one random |
| 3 Last sound | 3 | cars 1–2 | 3 | the first letter of the word (child repeats the start sound); one random |
| 4 Middle vowel | 3 | cars 1, 3 | 3 vowels | one commonly confused vowel (a↔e, o↔u, i↔e except before m/n) + one random vowel (vowel-swap error) |
| 5 Whole CVC | 3 | none | exactly 3, scrambled | none; order is the skill (never scramble into the correct order) |
| 6 Whole CVC | 3 | none | 5 | 1 confused vowel + 1 visually confusable consonant (b/d, p/q, n/u) |
| 7 Digraph | 3 | none | 4–5, with digraph tiles (sh, ch, th, ck) as **single** tiles | the separate letters s + h offered as two tiles (car count makes them not fit); ck word offers k as distractor only when k would be invalid there |
| 8 Blend | 4 | none | 5–6 | tile set lets the child build the "dropped consonant" word only incompletely (frog with 4 cars); one confused vowel |
| 9 Magic e | 3 or 4 | none | 5 | picture decides: cape (4 cars incl. e) vs cap (3 cars); distractor = the short-vowel word's spelling |

**Universal constraints (unit-test over levels × 50 seeds):**
- Never offer a tile that spells the same sound validly in that position (no c and k together for initial /k/; no k for final /ck/ on L1–6).
- Target word never repeats within a round; no more than 2 words with the same vowel in a row.
- Every generated item has its picture asset, word clip and sound clips present.
- Round = 8 items; ≥8 distinct L1 items available for a struggling child.

### 4.6 Hint ladder
| Step | What happens | Voice |
|---|---|---|
| First miss | Wrong tile pops back to tray and greys out (`is-out`). Hoot slides in: the word is played **stretched** (recorded "sssuuunnn"), and the car being asked about pulses. | `wt.hint.stretch` "Let's stretch it slowly: {word}. Which sound do you hear {position}?" |
| Second miss | Model: Hoot's wing points; the correct tile glows and slides halfway to its car; child taps to finish (errorless). Each car sound plays in order while a finger moves under the cars. | `wt.hint.model` "Listen: {sounds}. This one says {sound}. Tap it in!" |
| Correct | Train toots, car lights up, the crate's friend appears. | praise line |

### 4.7 Helper explanations (Hoot, round start and first miss)
- `wt.help.start` "Words are made of sounds. Each car holds one sound."
- `wt.help.order` "Sounds go in order, from the front of the train to the back."
- `wt.help.digraph` "Some sounds need two letters. S and h together say sh."
- `wt.help.blend` "In 'frog' you can hear two sounds at the start: f, r."
- `wt.help.magic-e` "A quiet e at the end makes the vowel say its name: cap, cape."

### 4.8 Voice lines (prefix `wt.`; ≈42 ids)
Prompts: `wt.prompt.first` "What's the first sound in {word}?" · `wt.prompt.last` "What's the last sound in {word}?" · `wt.prompt.middle` "What sound is in the middle of {word}?" · `wt.prompt.build` "Build {word}!" · `wt.prompt.e` "Is this {word}? Does it need a quiet e?"
Praise (process): `wt.praise.1` "You heard every sound in {word}!" · `wt.praise.2` "Front to back, just right!" · `wt.praise.3` "You listened carefully to the middle sound." · `wt.praise.4` "Sh is one sound and you used one car!" · `wt.praise.5` "The quiet e did its job!"
Retry: `wt.retry.1` "Hmm, let's listen again." · `wt.retry.2` "Good try. Let's stretch it."
Idle: `wt.idle` "Tap a letter to hear its sound."
Story: 10 beat lines (§4.2). Helper: 5 lines (§4.7). Hints: 2 lines with vars.
Variable clips: `word` × ≈95 words, `sound` × ≈35 phonemes (human), stretched words × ≈95 (human). **Estimate ≈ 42 line ids, ≈ 330 clips** (≈230 human-recorded).

### 4.9 Reward
Sticker **"Station Star"**: a round brass station badge with Zuzu's pencil as the clock hand. Saved locally. Level-up per R0.

### 4.10 Tests
Unit: generator determinism; lint every level × 50 seeds; universal constraints in §4.5; validation (exact string). E2E: round by drag, tap, keyboard; first miss shows Hoot, second shows model; reward and level-up.

## 5. Accuracy notes
- Phonics content follows the sound-to-spelling sequence implied by RF.K–RF.2 (consonants and short vowels → digraphs and blends → final -e → vowel teams). A literacy specialist should review the word bank and recordings before release.
- Phoneme audio must be clipped (no added schwa). Record continuous sounds (s, m, f, n, l, r) held ~0.6 s; stop sounds (b, d, t) short and unvoiced where appropriate.
- Dialect: US English spelling and pronunciation; avoid minimal pairs that collapse in common US dialects (pin/pen; cot/caught).
- Pictures must name one word unambiguously; the prompt always speaks the word, so "hen" vs "chicken" ambiguity cannot block a child.

## 6. Age-appropriateness and safety
- Passage topics are everyday and gentle; no frightening or violent scenes.
- Invented words are checked so they are not slurs or rude words in English or common other languages.
- Argument topics for 12–14 stay low-stakes and local (parks, school lunches), never partisan politics or religion.
- No free-text entry is sent anywhere; any typing stays on device.
