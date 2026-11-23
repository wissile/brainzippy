# Paper Boat Post (`paper-boat-post`)

English path, band B · ages 6–8 (L0–L1 also work as an on-ramp for confident 5-year-olds) · host **Sarah**, helper **Zuzu** · music `meadow` · prefix `pb.`
Status: **built (2026-11-23)**, pending independent review (game-design-review, qa-accessibility) and a literacy specialist. What was built and every deviation from this proposal: **§12** below. Path context: `docs/curriculum/ENGLISH_PATH.md` (skill map §2.2, hand-over §4). "Aligned with" CCSS RF/L codes verified on thecorestandards.org on 2026-11-23.

## 1. What it teaches

**Objective.** The child reads (decodes) and spells regular one- and two-syllable words: word families, short-vowel CVC words, digraphs, blends, final -e and vowel teams. At the top level the child reads and builds short sentences with a capital letter and an end mark.

| Level (0-based) | Skill id | Lm? | Aligned with |
|---|---|---|---|
| L0 | `english.phonics.onset-rime` | Lm 0 | RF.K.2.C, RF.K.2.E, RF.K.3.A · UK Y1 word reading |
| L1–L3 | `english.phonics.cvc` | Lm 2 | RF.1.3.B, RF.K.3.B, RF.K.3.D · UK Y1 |
| L4 | `english.phonics.digraph` | Lm 4 | RF.1.3.A · UK Y1 (GPCs) |
| L5 | `english.phonics.blend` | Lm 5 | RF.1.3.B, RF.1.2.B |
| L6 | `english.phonics.magic-e` | Lm 6 | RF.1.3.C, RF.2.3.A |
| L7 | `english.phonics.vowel-team` | Lm 7 | RF.1.3.C, RF.2.3.B |
| L8 | `english.phonics.multisyllable` | Lm 8 | RF.1.3.E, RF.1.3.F, L.2.4.D · UK Y1 (-s/-es endings), Y2 (two or more syllables) |
| L9 | `english.read.sentence` (even index) · `english.sentence.build` (odd index) | Lm 9 | RF.1.4.A, RF.2.4.A, RF.1.3.G, RF.1.1.A, L.1.1.J, L.1.2.A, L.1.2.B |

**Why decoding with pictures.** In a reading item the word is printed on a paper boat and the child sends the boat to the friend whose picture matches. A correct answer can only come from reading the print, never from hearing the word, so the target word is **not spoken until after the answer** (ENGLISH_PATH §6.1). Spelling items work the other way: the child hears the word and builds it from letter tiles. Reading and spelling the same patterns supports both directions (Foorman et al. 2016, recommendation 3: decode, analyse word parts, *write* and recognise words).

## 2. Story

The Paper Boat Post is Sarah's river post office on Monster Island. Every friend has a little dock with a picture flag, and every paper boat carries one word on its sail. A gust tipped the post bag into the river, and the letters floated off the sails. The child helps Sarah read each boat and send it to the right dock, and fold new letters onto sails that lost theirs.

| Beat | Line (`pb.story.*`, ≤ 14 words) | Scene |
|---|---|---|
| intro1 | "Hello! I'm Sarah, and this is my Paper Boat Post." | Sarah on the jetty; boats bob |
| intro2 | "Every boat carries a word to a friend's dock." | a boat drifts to a flag |
| intro3 | "Whoosh! The wind tipped my post bag. The letters floated away!" | letters swirl on the water |
| intro4 | "Zuzu and I need a good reader. Let's send the boats!" | Zuzu waves her pencil |
| between2 | "Two boats home! Listen to that happy toot." | a dock bell rings |
| between4 | "Halfway down the river!" | map with a boat dot |
| between6 | "Nearly there. Read every letter, front to back." | the river bends toward the sea |
| outro1 | "Every boat reached its dock!" | flags wave |
| outro2 | "You read each letter and put the sounds together." | Sarah and Zuzu cheer |
| outro3 | "Here's your River Reader sticker!" | sticker |

**First visit only:** a hand-over beat from Hoot (ENGLISH_PATH §4.4): `pb.story.handover` "Hoot told me you're great at listening for rhymes. Rhymes help with reading!" The line praises the activity, not the child. Every beat is skippable and is time-capped by StoryPlayer.

**Reward:** the **River Reader** sticker, a folded paper boat with a star on its sail. Level-up follows R0.

## 3. Levels and exercises

`roundLength` 8, `maxLevel` 9, `stepUpAfter` 2, `stepDownAtAttempts` 3. **Exactly one** tutorial (L0, difficulty 1): "This is cat. Make hat!" with a pointing hand on the h tile.
"Index rotation" below means the generator alternates modes by `index % 2`, so every round mixes reading and spelling (and R5 prefers the other answer kind).

| L | Mode(s) | Answer kind | Example (prompt spoken → what is on screen → correct) | Distractor rule (misconception) |
|---|---|---|---|---|
| **0** Word-family swap | change the first letter | `choice` (2 letter tiles, each with a keyword picture) | "This is a cat." (cat picture) → "Can you make **hat**?" → boat sail shows `_at`, tiles **h** (horse) · **m** (moon) → `h` | The second tile makes a real family word for a *different* picture (mat), so the spoken target decides. Never b/d/p/q together; never two tiles that share a keyword sound. |
| **1** Read CVC (easy) | read the boat, choose the picture | `choice` (2 pictures) | sail shows **sun** → pictures sun · pig → sun | Far distractor: no shared letters (first contrast). |
| **2** Read CVC (near misses) | read; on `index % 4 === 2`, a "critter tag" item | `choice` (3 pictures) · tag item: `choice` (3 printed pseudo-words) | sail **cap** → cap · cat · can (one letter differs). Tag: "This critter's name rhymes with **cat**. Which tag?" → **zat** · zot · zut | One distractor differs only in the vowel, one only in the final consonant (RF.K.3.D). Tag distractors differ only in the vowel (the rime is the skill). |
| **3** Read + build CVC | even index: read (3 pictures). Odd index: hear the word, fill 3 sail slots | `choice` · `sequence` | Build: "Build **jet**!" → tiles j · e · t · i · d → `j e t` | Build: one commonly confused vowel (a↔e, o↔u, i↔e, **except** e/i before m/n) plus one visually confusable consonant (b/d, p/q, n/u). |
| **4** Digraphs | read · build with **single** digraph tiles | `choice` · `sequence` | Read **chip** → chip · ship · chin. Build "Build **fish**!" (3 slots) → f · i · sh · s · h → `f i sh` | Read: digraph swap (ch↔sh) and a final-letter swap. Build: separate s and h tiles that can't fit the 3 slots (the sh misconception); never offer k where ck is the only valid spelling (L1–L6 rule from `english.md` §4.5). |
| **5** Blends | read · build (4 slots) | `choice` · `sequence` | Read **frog** → frog · fog · log. Build "Build **nest**!" → n · e · s · t · i · d → `n e s t` | Dropped-consonant word (fog for frog), produced **only** when it isn't on the blocklist (§8). One confused vowel. |
| **6** Final -e | read the pair · build where the picture decides | `choice` · `sequence` | Read **cube** → cube · cub · tube. Build "Build **cape**!" → c · a · p · e · i → `c a p e` (4 slots shown) | The short-vowel partner (cub/cube, cap/cape). Build: the partner's spelling is possible if the e is left out, and the 4th slot then shows empty, so the hint can name it. |
| **7** Vowel teams | read · sort into two docks by spelling | `choice` · `match` | Read **sheep** → sheep · ship · shop. Sort: bee · leaf · tree · seal → dock **ee** / dock **ea** | Read: short-vowel partner (ship) and a team swap (leaf/loaf). Sort: same sound, different spelling (the "one spelling per sound" misconception). |
| **8** Longer words | build a compound from 2 of 4 word cards · read a two-syllable word · read a plural | `sequence` · `choice` | Build: picture of a raincoat → cards rain · coat · boat · cup → `rain coat`. Read **napkin** → napkin · pumpkin · picnic. Plural: **foxes** → three foxes · one fox · one box | Compound: a card that makes a different real compound (rain + boat isn't one; sail + boat is, in another item). Plural: singular and look-alike pictures. |
| **9** Sentences | even index: read a note and choose the picture. Odd index: build the note that matches a picture | `choice` (3 scene pictures) · `sequence` (word cards + end mark) | Read: "The hen is in the box." → hen in box · hen on box · fox in box. Build: picture of a bug on a rug → cards The · bug · is · on · a · rug · . → `The bug is on a rug .` | Read: one-word differences (preposition, noun, verb). Build: a lower-case "sam" card beside "Sam" (names take capitals, L.1.2.A); "?" beside "." only when the cards force a statement (§3.3). |

### 3.1 Word bank (US spelling; every word has one clear picture)
Reuse Rhyme Lanterns pictures wherever the word matches (53 words share spelled rimes on purpose; `docs/worlds/rhyme-lanterns.md`). The lead decides whether art is imported across game folders or copied.

- **L0 families (CVC rimes):** -at (cat, hat, bat, mat, rat) · -an (fan, van, can, pan) · -ap (cap, map) · -ag (bag, rag) · -ug (bug, rug, mug, jug) · -un (sun, bun) · -ub (tub, cub) · -op (mop, top) · -ot (pot, dot) · -og (dog, log, frog *excluded at L0: blend*) · -ig (pig, wig) · -in (pin, fin) · -et (jet, net, vet) · -en (hen, ten, pen) · -ed (bed, sled *excluded: blend*).
- **Keyword pictures for tiles (L0–L1 only; fixed, never a target word in the same item):** b bell · c cow · d duck · f feather · g goat · h horse · j jelly · k kite · l leaf · m moon · n nest · p panda · r robot · s seal · t tiger · v violin · w worm · y yo-yo · z zebra. Short vowels: a apple · e egg · i insect · o octopus · u umbrella. A literacy specialist checks that each keyword starts with the letter's most common sound, with no blend and no letter-name onset.
- **L2 minimal-pair sets (≥ 16 needed; examples):** cat/cap/can · hat/hut/ham · map/mop/man · bug/bag/bun · pot/pod/dot · dog/log/dig · cub/tub/cup · bat/bag/rat · fan/fin/van · box/fox/fog · jam/ham/jet · hen/ten/pen. Each word in a set can be the target, so 12 sets give 36 items.
- **L3 build (CVC):** the `english.md` §4.4 CVC list (40 words), keeping its pin/pen rule.
- **L4 digraph read sets:** chip/ship/chin · fish/dish/fist · shed/bed/shell · bath/bat/path · duck/dock/sock · chop/shop/chip. **Build:** ship, shop, fish, dish, shed, chin, chop, chick, bath, moth, duck, sock, rock, sack.
- **L5 blends:** read frog/fog/log · crab/cab/crib · nest/net/vest · plum/plug/drum · tent/ten/tank. **Build:** frog, crab, drum, plum, slug, twig, tent, desk, lamp, belt, milk, hand, nest, swim. **Excluded:** flag, clock, flap (their dropped-consonant forms are blocklisted, and the generator never even considers them).
- **L6 final -e pairs:** cap/cape · cub/cube · tub/tube · pin/pine · can/cane · man/mane · kit/kite. Singles: bike, bone, rope, cake, lake, nose, rose, cone, gate, mule, flute, plane, snake, grape.
- **L7 vowel teams:** ai rain, tail, snail, sail, nail, train, paint · ay hay, tray, spray · ee bee, tree, feet, sheep, seed · ea leaf, seal, tea, peach, beach · oa boat, coat, goat, toad, soap, road. Read sets: sheep/ship/shop · leaf/loaf/leg · coat/cot/cat · feet/fat/foot. Sort pairs: ee|ea, ai|ay (hint: ay usually ends a word), oa|o_e.
- **L8:** compounds cupcake, pancake, backpack, sandbox, raincoat, sailboat, mailbox, bathtub, catfish. Two-syllable rabbit, napkin, picnic, muffin, basket, kitten, magnet, puppet, insect, cactus, pumpkin. Plurals cats, dogs, foxes, buses, dishes, boxes.
- **L9 sentences:** an authored bank of ≥ 24 read items and ≥ 24 build items, ≤ 7 words each. Only words from L0–L8 patterns, plus these 12 **tricky words** (RF.1.3.G, RF.K.3.C): the, a, is, to, I, was, said, he, she, we, my, you. Tricky words get a dotted underline; tapping one speaks it, and that does **not** count as assisted. Names: Sam, Ben, Kim, Raj, Meg, Tim, plus Bobbo and Zuzu. Examples: "Raj has a red cap." · "Can Bobbo hop?" · "The cake is on a plate." · "Kim and Ben swim in the lake." · "A goat is in the boat."

### 3.2 Generator rules (seeded, pure)
- A word is eligible at level n only if every grapheme in it was taught at level ≤ n. Taught order: L0–L3 single consonants and short vowels; L4 sh ch th ck; L5 blends; L6 final -e; L7 ai ay ee ea oa. Exception: L8 compounds only combine L0–L7 parts.
- A round never repeats a target word. Within a round, no more than 2 consecutive items share a vowel.
- In reading items, options never include two pictures a child could name with the same word (e.g. no "pup" next to "dog").
- Every item has a picture, a normal word clip and a slowed word clip present (tested).
- Each level has ≥ 16 distinct items, so a struggling child's two rounds don't repeat (the quality bar is ≥ 8).
- **Critter tags (L2):** pseudo-words follow CVC shape, share the target's rime and differ in onset (z, v, j). Each one is checked against a real-word list (must not be a real word) and against the blocklist. They are never spoken; the praise line says "Its name rhymes with {word}!" instead.

### 3.3 Correct-answer validation and accepted alternatives
- `choice`: equality with the target id.
- `sequence` (spelling): exact order. Identical letters are interchangeable (engine rule). A digraph is **one** piece, so `s`+`h` can't fill one slot.
- `sequence` (sentences): exact order, **and the bank guarantees exactly one valid order**. Only the first word comes as a capitalised card, so "Can Bobbo hop?" can't also be built as "Bobbo can hop." (there is no lower-case "can"). An end-mark choice is offered only where the other mark can't make a valid sentence. Noun-swap templates ("The rug is on a bug.") are allowed only when the picture rules the swap out, and the prompt always says "matches the picture". A unit test checks that every build item has an empty list of alternative orders, using an authored `alternatives: []` field that reviewers confirm.
- `match` (sort): every item to its bin.
- US spelling only. No word in the bank has a common UK variant.

## 4. Hint ladder (wrong answers are never punished)

Two audio phases. **Phase A** ships with whole-word audio only: Kokoro clips and slowed clips (`speed: 0.6`), as Rhyme Lanterns does. **Phase B** adds human-recorded isolated phonemes (about 44, checked by a literacy specialist; `english.md` §4 warns that TTS adds a schwa to isolated sounds).

| Step | Reading items (`choice`) | Spelling and sentence items (`sequence`) | Sorting (`match`) |
|---|---|---|---|
| Round start (helper) | Zuzu: "Read every letter, front to back, then put them together." | Same | "Same sound, different letters. Look closely!" |
| 1st miss | The wrong picture greys out. Zuzu: `pb.hint.read.1` "Touch each letter, front to back." The sail letters light up left to right. Phase A: each letter's keyword picture pops up (L0–L3) or the letter pulses (L4+). Phase B: each letter's sound plays. | Correct slots stay gold (`is-ok`), wrong tiles return, and the first wrong or distractor tile greys out. Zuzu: `pb.hint.build.1` "Listen slowly: {word}. Which letter comes next?" plays the slowed clip. Sentences: `pb.hint.sentence.1` "A sentence starts with a capital and ends with a mark. Does it match?" | Wrong cards bounce back. `pb.hint.sort.1` "Look at the middle letters. Do you see e-e or e-a?" |
| 2nd miss (model) | Letters highlight one by one in time with the **slowed** word, then the word plays at normal speed, and the right picture pulses (`is-model`). Zuzu: `pb.hint.model` "Your turn. Send the boat!" The child taps it (errorless). | Tiles glide halfway into their slots in order while the slowed word plays. The child taps Send. Sentences: Sarah reads the model sentence once and the cards glide. | Model pairs shown; the child taps Done. |
| Correct | Then the word is spoken, the boat sails to its dock, and a praise line plays. | Same, and the dock bell rings. | Same |

Praise and hints use the helper slot (`skin.helper`) and `hintVoice` mapping (`retry.1` → `pb.hint.*.1`, `hint.show` → `pb.hint.model`).

## 5. Feedback lines (process praise, ≤ 14 words, never "smart" or "genius")
`pb.praise.1` "You read every letter, front to back!" · `pb.praise.2` "You checked the middle sound. That's careful reading." · `pb.praise.3` "S and h together say sh. One tile, one sound!" · `pb.praise.4` "You noticed the quiet e at the end!" · `pb.praise.5` "You split the long word into parts." · `pb.praise.6` "Capital at the start, mark at the end. Your note is ready!" · `pb.retry.1` "Hmm, let's look again." · `pb.retry.2` "Good try. Let's read it slowly."

## 6. Voice lines (prefix `pb.`; all captioned)
| Group | Ids | Notes |
|---|---|---|
| Prompts | `pb.prompt.swap.a` "This is {from}." · `pb.prompt.swap.b` "Can you make {to}?" · `pb.prompt.read` "Read the word on the boat. Who should get it?" · `pb.prompt.build` "Build {word}!" · `pb.prompt.sort` "Sort the boats by their letters." · `pb.prompt.compound` "Make a word for this picture with two cards." · `pb.prompt.note.read` "Read the note. Which picture matches?" · `pb.prompt.note.build` "Build the note that matches the picture." · `pb.prompt.tag` "This critter's name rhymes with {word}. Which tag is it?" | `vary` lists every value. The two swap halves keep combinations < 150 each. The reading prompt never names the word. |
| Word clips | `pb.w.<word>` (≈ 150), `pb.slow.<word>` (≈ 150, `"speed": 0.6`) | Reuse Rhyme Lanterns clips where the words match. |
| Sentences | `pb.s.<id>` (≈ 48, spoken only after the answer or by "Read it to me") | |
| Tricky words | `pb.t.<word>` (12) | |
| Keywords | `pb.k.<letter>` (26), e.g. "horse" | |
| Helper | `pb.help.start`, `.digraph` "Some sounds need two letters: s and h say sh.", `.blend` "In frog, you can hear f and r at the start.", `.e` "A quiet e at the end makes the vowel say its name.", `.team` "Two vowels can team up to make one sound.", `.syllable` "Long words come in parts. Read one part at a time.", `.note` "A note starts with a capital and ends with a mark." | |
| Hints, praise, retry, idle, story | §4, §5, `pb.idle` "Tap a picture to hear its name." (pictures only, never the boat word), 11 story lines | |
| Phase B | `pb.ph.<phoneme>` (≈ 44, human-recorded) | Not part of v1 clip coverage. |

Estimate: ≈ 45 line ids and ≈ 430 clips in phase A. The lead renders them with `gen_voice.py`; the clip-coverage test fails until then.

## 7. Board and accessibility
- **Board:** a world-local `BoatBoard` (skin `Board`). The boat and sail sit at the top, with the printed word or the empty slots on the sail. Below: the dock flags (picture options), a letter-tile tray or word-card tray, two docks for sorting, and a **Send** button (`data-testid="done"`). It follows the default boards' semantics: `choice` = tap one; `sequence` = tap a tile to fill the leftmost empty slot, tap a filled slot to return its tile; `match` = tap a card, then a dock. No drag needed. Drag may be added as an extra way to move pieces. **No new engine kind or shared board is required.** The sort mode can use the shared `SortBoard` if D3 lands (ENGLISH_PATH §9).
- **Keyboard:** Tab to a tile or picture, Enter or Space to choose; Backspace returns the last tile; focus moves to Send when the slots are full (keyboard users only, D-022).
- **Screen readers:** the boat word is announced letter by letter ("Word on the boat: c, a, p"). Pictures carry their names. Example `a11yDescription`: "A boat with three letters on its sail. Three docks with pictures: cap, cat, can. Choose the dock that matches the word." A blind child gets the same reading task through the letter sequence. QA-accessibility to review whether this is the right equivalent.
- **Targets:** ≥ 64 px for tiles, pictures and Send. Letters use the body font with a single-storey "a" (as in Letter Lagoon).
- **Motion:** boats sail with transform/opacity only. Under `prefers-reduced-motion`, boats fade to the dock and no water ripple plays.
- **Muted play:** captions carry every line; the reading task never depends on audio.
- No timers, lives or score loss.

## 8. Content safety
- Every word, sentence and name is original or a common English word. No text comes from reading schemes, phonics programmes or books.
- **Blocklist** (shared, ENGLISH_PATH §6.5) is applied to: every target and distractor word; every dropped-consonant and vowel-swap distractor; every critter-tag pseudo-word; and **every string a tile set can spell**. For ≤ 6 tiles that means checking every ordered subset that fills the slots (≤ 720 permutations per item, cheap in a unit test).
- Names come from a varied, decodable list; scenes show diverse families and settings without stereotypes. No scary content: the "wind" is gentle and nothing is lost for good.
- No text entry anywhere. Physical-keyboard letters only press tiles.

## 9. Automated tests (`tests/unit/paper-boat-post.test.ts`, `e2e/paper-boat-post.spec.ts`)
1. Levels 0–9 × 50 seeds: every item passes `lintExercise`, has a declared skill, and has exactly one correct option or order.
2. Same seed gives the same round; no repeated target word in a round; ≥ 16 distinct items per level.
3. Grapheme gating: no word uses a grapheme taught above its level.
4. Minimal-pair rule: in L2 and above, at least one distractor differs from the target by exactly one grapheme; no e/i swap before m/n.
5. **Reading items never speak the target:** the `prompt.line` and its `vars` don't contain the target word, and `a11yDescription` spells the word letter by letter.
6. Blocklist over all strings and all tile-reachable strings (§8). Critter tags are not real words.
7. Sentence build items: authored `alternatives` is empty; exactly one capitalised card; the end-mark rule holds.
8. Assets: picture, word and slowed clips exist for every word the generator can produce; voice `vary` covers every value.
9. Digraph tiles: a digraph target never validates with separate letters.
10. E2E (muted, no drag): skip the story, play a full round with taps and with the keyboard, get one wrong answer (grey-out and Zuzu hint), get a second wrong answer (model), reach the sticker; no overflow at 390×844, 915×412, 1024×1366 and 1280×800; reduced-motion snapshot.

## 10. Evidence and assumptions
- **Supported by research:** explicit, systematic teaching of sound-spelling links and blending (Ehri et al. 2001; EEF Toolkit "Phonics": +5 months, high evidence strength, "explicit and systematic"); decoding, word parts and writing words, plus reading decodable words in isolation and in connected text (Foorman et al. 2016, WWC: recommendation 3 strong, recommendation 4 moderate). Using pseudo-words to check decoding rather than memory follows the rationale of the DfE Year 1 phonics screening check (20 real + 20 pseudo-words, each pseudo-word with a picture of an imaginary creature). We borrow the principle only. Full references: ENGLISH_PATH §7. Bowers (2020) disputes how much *systematic* phonics beats alternatives, so we claim nothing about outcomes.
- **Assumptions:** keyword pictures plus slowed whole-word audio are an acceptable stand-in for phoneme audio in phase A; the level order (CVC → digraph → blend → final -e → vowel team → multisyllable → sentences) follows the CCSS RF.K–RF.2 progression and Foorman's sequence, but our exact level boundaries are a product choice; 2-in-8 interleaved review from L4 (ENGLISH_PATH §3.2) is a hypothesis.
- BrainZippy itself has not been studied.

## 11. Open items
- Phase B phoneme recordings (owner Q3).
- Literacy-specialist review of the keyword list, minimal-pair sets and tricky-word list.
- Whether art is shared with Rhyme Lanterns (lead).

## 12. As built (2026-11-23)

**Files.** `src/games/paper-boat-post/`: `words.ts` (grapheme bank, gating, keywords, real-word list), `content.ts` (families, reading sets, sort pools, plurals, compounds, 25 + 25 authored notes, tricky words), `generator.ts` (levels, rotation, interleaved review), `logic.ts` (misconception classifier, tile-permutation safety, model steps), `hints.ts` (round-start line, first-miss hint by misconception, praise), `blocklist.ts`, `Board.tsx` + `paper-boat-post.css` (BoatBoard), `art.tsx` + `pictures-a.tsx` + `pictures-b.tsx` (river scene, boat, ~120 new pictures, critter, River Reader sticker), `story.tsx` (cinematic beat + DialogueScene conversations), `PaperBoatPost.tsx` (skin), `definition.ts`, `voice.json` (621 lines, 720 clips, rendered with each speaker's cast voice). Pack: `src/content/packs/english-paper-boat-post`. Tests: `tests/unit/paper-boat-post.test.ts`, `e2e/paper-boat-post.spec.ts`.

**Levels as built** (index rotation per §3; review items at index 3 and 7 from L4 up come from L(n−4)…L(n−1) with that level's skill):

| L | Built |
|---|---|
| 0 | Onset swap in 13 families (68 from→to pairs); 2 keyword-picture tiles; decoy tile always makes a real word |
| 1 | Read CVC (49 words), 2 docks, far decoy |
| 2 | Read 3 docks: one vowel-only and one final-only decoy (12 targets, 19 sets, computed); index 2 and 6: critter name tags (9 authored, vowel-swap decoys, checked not real) |
| 3 | Read as L2 / build the same words (3 slots + confused vowel + look-alike consonant) |
| 4 | 16 digraph words, read sets + build with one digraph tile and its split letters as decoys |
| 5 | 12 blend words (dropped-consonant decoys fog/cab/net/wig/ten), build 4 slots |
| 6 | 15 final -e words, short partner always a decoy; build may be sent without the e (hint names the empty space) |
| 7 | 20 vowel-team read sets / sort 4 boats into ee·ea, ai·ay or oa·o_e docks |
| 8 | Two-syllable read (11) · plural read (12, "three foxes / one fox / one box") · compound build (9) |
| 9 | Read a note, choose 1 of 3 scenes (25) / build a note from cards (25, alternatives: []) |

**Deviations from the proposal.**
- *Voice catalogue location:* lines live in the world's own `src/games/paper-boat-post/voice.json` (with `speaker`), not in `src/audio/voiceLines.json`. That file is the GAME_AUTHORING contract, is globbed by the runtime and `gen_voice.py`, and keeps the 720 clips in the world's offline bundle (the PWA plugin assigns clips by world voice.json; shared-file clips are precached for everyone). No shared entry was edited.
- *Prompts:* the reading prompt is "Read the word. Who should get it?" (the proposal's "Read the word on the boat" would speak *boat*, which is a level-7 target; "sail" is one too). The swap prompt is one line per "from" word (`pb.prompt.swap.cat`, `vary.to`), because a template with both `{from}` and `{to}` would be a 34 × 34 cartesian product.
- *After-answer lines:* the runner's praise slot can't carry string variables, so each target has one `pb.got.<word>` clip ("Cap! You read every letter, front to back.") — the word is spoken for the first time *after* the answer, with process praise for its pattern. Tag praise is `pb.tag.ok.<word>`.
- *Dock naming:* tapping a dock sends the boat (no separate "tap to hear" control). Instead, with sound on, the docks' pictures are named in turn after the prompt (pictures only, never the sail), and keyboard focus names a dock. `pb.idle` says "Take your time. Look at every letter, front to back."
- *Word bank changes:* no pictureless decoys (chop, sack, kit dropped); i keyword is **igloo**, not insect (an insect picture reads as "bug"); bike, seed removed as level-6/7 *reading* targets (no one-grapheme partner with a clear picture); *ten* added for tent; sentences use only Bobbo and Zuzu as names (no human figures drawn yet), so the lower-case-name decoy is "bobbo"/"zuzu".
- *"Read it to me"* (ENGLISH_PATH §6.1) is **not** built: it needs the `assisted` result flag (D5, ET-5); without it a read-aloud would count as a first-try success.
- *Vowel spacing rule* ("no more than 2 consecutive items share a vowel") is not enforced: the runner orders a round by difficulty and answer kind, not by index, so a generator can't guarantee it. A round never repeats a target (bucketed by index; unit-tested).
- *Single-storey "a":* the body font (Nunito) is used as is; no font with a single-storey a is bundled. Open.
- *Art:* pictures shared with Rhyme Lanterns are imported from `src/games/rhyme-lanterns/pictures.tsx` (not copied); the lead may prefer a shared module.
- *Story:* intro = one cinematic beat (letters blowing off the sails) + a Sarah/Zuzu DialogueScene (first visit: Hoot hands over, then Sarah greets; detected by "no stored level and no sticker"); outro = boats home + a short conversation. The conversation runs inside a StoryPlayer beat (empty line, the beat advances when the talk ends); the StoryPlayer's Skip skips all of it, Next/caption-tap advance a line, Escape ends just the talk.
- *Blocklist:* world-local (`blocklist.ts`) until a shared English blocklist exists; applied at generation time to every tile set (all ordered fillings, plus one short for quiet-e words) and tested.

**Open.** Literacy-specialist review (keywords, sets, sentences, tricky words); creative-director review of the ~120 new pictures; Sarah's final design (referenced only via `Sarah`/`sarah`); phase B phoneme audio; human listening check of the cast-voice prompts; "Read it to me" once `assisted` exists.

### 12.1 After the independent QA review (2026-11-23)
- **No target before the answer, including help lines:** `pb.help.blend` no longer says "frog" (now "f and r: fr"); every help/hint/idle/reading-prompt line is checked against every reading target and dock picture (`tests/unit/paper-boat-post.test.ts`, plus the reviewer's `paper-boat-post.qa.test.ts`).
- **One picture, one name:** `CONFUSABLE` pairs in `content.ts` (cup/mug, mat/rug, dot/pin, pot/pan, hat/cap, tube/pen, hut/house) are never offered together; tube and napkin were redrawn.
- **Scenes:** in/on are composed from measured picture bounds: ON rests the figure's feet on the thing's surface, IN redraws the container's front (clipped at its rim) over the figure. Scenes that can't be drawn honestly were replaced (in the bus/van/lake, rat in a bag, coat or bug hidden behind a boat or jug, cap vs hat).
- **Keyboard:** after a tile is placed, focus moves to the next free tile (or Send when full); after a boat is unsorted, focus moves to it in the fleet.
- **Phones:** on tall boards the note scenes wrap two per row and the build/compound picture is up to 40% of the width, with a speaker badge; the prompt says "Tap the picture to hear it".
- **Praise:** builds say what was built (`pb.built.*`), swaps `pb.praise.swap`; the after-answer word line stays for reading items.
- **Other:** Send label in ink; `.still` (reduced motion) also stops the dock nudge, Send pulse and sailing; plural option ids use `fox:3` (allowed by the analytics id pattern); Hoot's hand-over plays only when Rhyme Lanterns progress exists; "This is ten."
