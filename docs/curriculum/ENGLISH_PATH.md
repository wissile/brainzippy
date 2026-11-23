# English path: "Learn English with Sarah" (ages 3–14)

Owner: curriculum-designer. Status: **proposal (2026-11-23)**. No external educator, literacy specialist or lawyer has reviewed it yet.
It extends `README.md` (framework, mastery M1–M3, review S1–S4, planner), `english.md` (English library skills and world concepts), `docs/DAILY_LEARNING.md` (the shipped planner P1–P11) and `docs/GAME_AUTHORING.md` (answer kinds, generators, boards).
As everywhere in this folder, the learning rules here are **hypotheses informed by research**, not validated outcomes (D-020). Standards mappings say **"aligned with"**. BrainZippy is not certified or endorsed by any standards body.

## 0. Summary

| Band | Ages | Path game | World doc | Core skills | Status |
|---|---|---|---|---|---|
| A | 3–5 | **Hoot's Rhyme Lanterns** (`rhyme-lanterns`) | `docs/worlds/rhyme-lanterns.md` | rhyme | implemented |
| B | 6–8 | **Paper Boat Post** (`paper-boat-post`) | `docs/worlds/paper-boat-post.md` | onset swap → CVC decoding → digraphs, blends, final -e, vowel teams → two-syllable words → reading and building simple sentences | proposed |
| C | 9–11 | **Wordroot Grove** (`wordroot-grove`) | `docs/worlds/wordroot-grove.md` | prefixes and suffixes → word class from suffixes → Greek and Latin roots → context clues → apostrophes and commonly confused words | proposed |
| D | 12–14 | **The Lantern Press** (`lantern-press`) | `docs/worlds/lantern-press.md` | sentence combining → modifiers and pronoun reference → concise wording → connotation → figurative language → active/passive voice → claims and evidence | proposed |

**Host.** Sarah hosts the whole path. She is a new animal character who loves stories, words and wordplay. Creative-director owns her species and art. Each world also has a helper from the Critter Crew: Zuzu in Paper Boat Post, Gloop in Wordroot Grove and Hoot in The Lantern Press. Hoot keeps hosting Rhyme Lanterns, so a child meets Sarah at the hand-over to Paper Boat Post (§4.4).

**Ids.** The registry library id is `english`, so skill ids are `english.<topic>.<skill>`. `english.md` writes the same skills as `ela.<topic>.<skill>`, and `ela.x` means the same skill as `english.x`. New ids are introduced here only where `english.md` has no equivalent (marked *new*).

**How the three new games relate to `english.md` §3.** Paper Boat Post covers the content of *Zuzu's Word Train* and *Sentence Bridge*, Wordroot Grove covers *Zuzu's Word Workshop* and *Hoot's Mystery Words*, and The Lantern Press covers *Modifier Mix-up* and *Claim Court*. Those concepts can still be built later as extra practice worlds for the same skill ids (that is what M3 evidence variety is for), but the path does not depend on them (owner question Q2).

---

## 1. Standards used (verified 2026-11-23)

Every code below was checked against the publisher's text this session. CCSS codes come from thecorestandards.org grade pages (RF K/1/2; L 1–8; RI 6–8). The repo writes the sub-letter in upper case (`RF.1.3.B`), while the CCSS site writes `RF.1.3.b`. UK references come from the Department for Education programmes of study (KS1–2 English, July 2014; KS3 English) on assets.publishing.service.gov.uk.

### 1.1 Common Core ELA (US)
| Code | What it asks (short paraphrase) | Used in |
|---|---|---|
| RF.K.2.A | recognise and produce rhyming words | Rhyme Lanterns |
| RF.K.2.C | blend and segment onsets and rimes of single-syllable spoken words | Paper Boat Post L0 |
| RF.K.2.E | add or substitute individual sounds in simple one-syllable words to make new words | Paper Boat Post L0 |
| RF.K.3.A · RF.K.3.B | one-to-one letter-sound correspondences for consonants; short and long sounds for the five major vowels | Paper Boat Post L0–L3 |
| RF.K.3.C | read common high-frequency words by sight | Paper Boat Post L9 (tricky words) |
| RF.K.3.D | tell similarly spelled words apart by the sounds of the letters that differ | Paper Boat Post L2 distractor design |
| RF.1.1.A | features of a sentence (first word, capitalisation, end punctuation) | Paper Boat Post L9 |
| RF.1.2.B | orally blend sounds into single-syllable words, including consonant blends | Paper Boat Post hints (phase B audio) |
| RF.1.3.A | spelling-sound correspondences for common consonant digraphs | Paper Boat Post L4 |
| RF.1.3.B | decode regularly spelled one-syllable words | Paper Boat Post L1–L5 |
| RF.1.3.C | final -e and common vowel-team conventions for long vowels | Paper Boat Post L6–L7 |
| RF.1.3.E | decode two-syllable words by breaking them into syllables | Paper Boat Post L8 |
| RF.1.3.F | read words with inflectional endings | Paper Boat Post L8 |
| RF.1.3.G | read grade-appropriate irregularly spelled words | Paper Boat Post L9 |
| RF.1.4.A · RF.2.4.A | read grade-level text with purpose and understanding | Paper Boat Post L9 |
| RF.2.3.A | distinguish long and short vowels when reading one-syllable words | Paper Boat Post L6 |
| RF.2.3.B | additional common vowel teams | Paper Boat Post L7 |
| RF.2.3.D | decode words with common prefixes and suffixes | Wordroot Grove L0–L1 (bridge) |
| L.1.1.J | produce and expand complete simple and compound sentences (several types) | Paper Boat Post L9 |
| L.1.2.A · L.1.2.B | capitalise names of people; end punctuation | Paper Boat Post L9 |
| L.2.1.E | choose between adjectives and adverbs depending on what is modified | Wordroot Grove L2 |
| L.2.2.C | apostrophes for contractions and frequent possessives | Wordroot Grove L8 |
| L.2.4.B | meaning of a known word plus a prefix (happy/unhappy) | Wordroot Grove L0 |
| L.2.4.D | predict the meaning of compound words from their parts | Paper Boat Post L8 |
| L.3.1.A | function of nouns, pronouns, verbs, adjectives, adverbs | Wordroot Grove L2 |
| L.3.1.H · L.3.1.I | coordinating and subordinating conjunctions; simple, compound and complex sentences | Lantern Press L0 (bridge) |
| L.3.2.D | form and use possessives | Wordroot Grove L8 |
| L.3.4.A | sentence-level context as a clue to meaning | Wordroot Grove L6 |
| L.3.4.B | meaning of a known word plus a known affix | Wordroot Grove L0–L3 |
| L.3.4.C | a known root word as a clue to an unknown word with the same root | Wordroot Grove L3 |
| L.4.1.G | frequently confused words (to/too/two; there/their) | Wordroot Grove L9 |
| L.4.4.A | context (definitions, examples, restatements) as a clue to meaning | Wordroot Grove L6 |
| L.4.4.B · L.5.4.B · L.6.4.B · L.7.4.B | grade-appropriate Greek and Latin affixes and roots as clues to meaning | Wordroot Grove L4–L5 |
| L.4.5.A · L.5.5.A | similes and metaphors in context | Lantern Press L6 (entry items) |
| L.5.3.A | expand, combine and reduce sentences for meaning, interest and style | Lantern Press L1, L4 |
| L.5.4.A | context (cause/effect, comparisons) as a clue to meaning | Wordroot Grove L7 |
| L.6.1.D | recognise and correct vague pronouns | Lantern Press L3 |
| L.6.3.A | vary sentence patterns for meaning, interest and style | Lantern Press L1 |
| L.6.5.A · L.7.5.A · L.8.5.A | interpret figures of speech in context (personification; allusion; verbal irony, puns) | Lantern Press L6 |
| L.6.5.C · L.7.5.C · L.8.5.C | distinguish connotations of words with similar denotations | Lantern Press L5 |
| L.7.1.B | choose among simple, compound, complex and compound-complex sentences to signal relationships | Lantern Press L0–L1 |
| L.7.1.C | place phrases and clauses; correct misplaced and dangling modifiers | Lantern Press L2 |
| L.7.3.A | precise and concise language; eliminate wordiness and redundancy | Lantern Press L4 |
| L.8.1.B · L.8.1.D · L.8.3.A | active and passive voice; correct inappropriate shifts; use voice for effect | Lantern Press L7 |
| RI.6.8 | trace and evaluate claims; tell supported claims from unsupported ones | Lantern Press L8 |
| RI.7.8 · RI.8.8 | judge whether reasoning is sound and evidence relevant and sufficient; notice irrelevant evidence | Lantern Press L9 |

### 1.2 National Curriculum in England (UK), where helpful
The 2014 programmes of study are still statutory. The government has said a revised national curriculum will be taught from **September 2028**, and the English programme is due for a full overhaul. Re-check this mapping when the final text appears (expected spring 2027).

| Programme of study (statutory requirement, paraphrased) | Used in |
|---|---|
| Y1 word reading: apply phonics as the route to decode; blend sounds in unfamiliar words with taught GPCs; read words with -s, -es, -ing, -ed, -er, -est; read common exception words | Paper Boat Post L0–L8 |
| Y2 word reading: read accurately words of two or more syllables with taught graphemes; read words with common suffixes | Paper Boat Post L8 |
| Y3–4 word reading: apply knowledge of root words, prefixes and suffixes (etymology and morphology) | Wordroot Grove L0–L5 |
| Y3–4 vocabulary, grammar and punctuation: possessive apostrophe with plural nouns; a wider range of conjunctions | Wordroot Grove L8; Lantern Press L0 |
| Y5–6 reading comprehension: distinguish statements of fact and opinion; evaluate how authors use language, including figurative language | Lantern Press L6, L8–L9 |
| Y5–6 vocabulary, grammar and punctuation: passive verbs to change how information is presented; vocabulary and structures for formal writing | Lantern Press L7 |
| KS3 reading: how figurative language, vocabulary choice, grammar and text structure present meaning; inferences that refer to evidence in the text | Lantern Press L5–L9 |
| KS3 grammar and vocabulary: study the effect of grammatical features; formal and informal registers | Lantern Press L1–L7 |

The Y1 **phonics screening check** (DfE assessment framework) mixes 20 real words with 20 pseudo-words. Each pseudo-word comes with a picture of an imaginary creature, because unfamiliar words test decoding without help from visual memory. Paper Boat Post's optional "critter names" items (§3 of its doc) borrow that *principle* but none of the check's items.

---

## 2. Skill map (ages 3–14)

`Lm` is the 0-based world level at which a skill counts toward mastery, i.e. the lowest level that exercises the full objective without scaffolds. N is the mastery count (README §3.3). "Hard" prerequisites gate unlocking (P2); "soft" ones are only recommendations.

### 2.1 Band A 3–5 (Rhyme Lanterns, plus planned worlds outside the path)
| skill_id | Objective (child can…) | Ages | Prereqs | Taught in (levels) | Lm | N | Aligned with |
|---|---|---|---|---|---|---|---|
| `english.phon.rhyme` | tell whether two spoken words rhyme; pick, spot the odd one out and chain rhymes | 3–5 | — | rhyme-lanterns L0–L7 | 3 | 6 | RF.K.2.A |
| `english.phon.syllables` | count syllables in a spoken word | 4–6 | — | *no path game yet* (Drum Parade, planned) | — | — | RF.K.2.B |
| `english.phon.first-sound` | isolate the first sound of a spoken word | 4–6 | rhyme (soft) | Paper Boat Post L0 (on-ramp); Word Train (planned) | — | — | RF.K.2.D |
| `english.letters.sound` | link consonants and short vowels to their common sounds | 4–6 | — | Paper Boat Post L0–L1 (on-ramp, keyword pictures); Letter Lagoon (planned) | — | — | RF.K.3.A, RF.K.3.B |

**Gap note.** No path game teaches letter names, syllables or first-sound isolation on their own. To keep the path continuous, Paper Boat Post L0–L1 serve as an **on-ramp**: onset swaps inside rhyme families, with keyword pictures on every letter tile (§3 of its doc). These skills feed Paper Boat Post's skills as *soft* prerequisites, so they never block. Letter Lagoon, Drum Parade and Word Train (`english.md` §3) would fill the gap properly. Recommended, but not on the critical path.

### 2.2 Band B 6–8 (Paper Boat Post)
| skill_id | Objective | Ages | Prereqs | Levels | Lm | N | Aligned with |
|---|---|---|---|---|---|---|---|
| `english.phonics.onset-rime` *new* | change the first letter of a word-family word to make a named word | 5–6 | phon.rhyme (hard), letters.sound (soft) | L0 | 0 | 4 | RF.K.2.C, RF.K.2.E, RF.K.3.A |
| `english.phonics.cvc` | read and spell consonant-vowel-consonant words | 5–7 | onset-rime (hard) | L1–L3 | 2 | 6 | RF.1.3.B, RF.K.3.B, RF.K.3.D |
| `english.phonics.digraph` | read and spell words with sh, ch, th, ck as one sound | 6–7 | cvc | L4 | 4 | 6 | RF.1.3.A |
| `english.phonics.blend` | read and spell words with initial and final consonant blends | 6–7 | cvc | L5 | 5 | 6 | RF.1.3.B, RF.1.2.B |
| `english.phonics.magic-e` | read CVCe words and tell them apart from their short-vowel partner | 6–8 | cvc | L6 | 6 | 6 | RF.1.3.C, RF.2.3.A |
| `english.phonics.vowel-team` | read and sort words with ai, ay, ee, ea, oa | 7–8 | magic-e | L7 | 7 | 6 | RF.1.3.C, RF.2.3.B |
| `english.phonics.multisyllable` *new* | read two-syllable and compound words and words with -s, -ed, -ing | 6–8 | digraph, blend | L8 | 8 | 6 | RF.1.3.E, RF.1.3.F, L.2.4.D |
| `english.read.sentence` *new* | read a short decodable sentence and pick the picture it describes | 6–8 | cvc, words.sight (soft) | L9 | 9 | 6 | RF.1.4.A, RF.2.4.A, RF.1.3.G |
| `english.sentence.build` | order word cards into a sentence with a capital and an end mark | 6–8 | read.sentence (soft) | L9 | 9 | 6 | L.1.1.J, L.1.2.A, L.1.2.B, RF.1.1.A |

`english.words.sight` (RF.K.3.C) is taught inside L9 as a short list of "tricky words" (§3 of the Paper Boat Post doc). It has no level of its own and no mastery evidence (soft prerequisite only).

### 2.3 Band C 9–11 (Wordroot Grove)
| skill_id | Objective | Ages | Prereqs | Levels | Lm | N | Aligned with |
|---|---|---|---|---|---|---|---|
| `english.vocab.affix` | work out a word's meaning from a known base plus prefixes and suffixes, and build a word for a meaning | 8–10 | phonics.multisyllable (hard) | L0, L1, L3 | 1 | 6 | L.2.4.B, L.3.4.B, L.3.4.C, RF.2.3.D |
| `english.grammar.word-class` *new* | tell noun, verb, adjective and adverb apart by suffix and by job in a sentence | 8–10 | vocab.affix | L2 | 2 | 6 | L.3.1.A, L.2.1.E |
| `english.vocab.roots` | use Greek and Latin roots to infer meaning | 9–11 | vocab.affix | L4–L5 | 5 | 6 | L.4.4.B, L.5.4.B, L.6.4.B |
| `english.vocab.context` | infer an unknown word's meaning from clues in one or more sentences | 9–12 | read.sentence (soft) | L6–L7 | 7 | 6 | L.3.4.A, L.4.4.A, L.5.4.A |
| `english.grammar.apostrophe` | choose apostrophes for contractions, singular and plural possessives, and none for plain plurals | 8–10 | sentence.build | L8 | 8 | 6 | L.2.2.C, L.3.2.D |
| `english.grammar.confused-words` *new* | choose the right one of commonly confused words in context | 9–11 | grammar.apostrophe | L9 | 9 | 6 | L.4.1.G |

### 2.4 Band D 12–14 (The Lantern Press)
| skill_id | Objective | Ages | Prereqs | Levels | Lm | N | Aligned with |
|---|---|---|---|---|---|---|---|
| `english.grammar.combine` *new* (supersedes `sentence-types` for 11+) | combine short sentences with the connective that signals the intended relationship, without splices or run-ons | 11–14 | grammar.word-class (hard) | L0–L1 | 1 | 6 | L.7.1.B, L.5.3.A, L.6.3.A, L.3.1.H |
| `english.grammar.modifier` | find and fix misplaced and dangling modifiers | 12–14 | combine | L2 | 2 | 6 | L.7.1.C |
| `english.grammar.pronoun-ref` *new* | find vague pronouns and pick a clear rewrite | 11–13 | combine | L3 | 3 | 6 | L.6.1.D |
| `english.style.concise` *new* | remove redundancy and wordiness without losing meaning | 12–14 | combine | L4 | 4 | 6 | L.7.3.A, L.5.3.A |
| `english.vocab.connotation` | choose words by connotation to fit a writer's purpose | 11–14 | vocab.context | L5 | 5 | 6 | L.6.5.C, L.7.5.C, L.8.5.C |
| `english.vocab.figurative` | identify and interpret simile, metaphor, personification, hyperbole, idiom and verbal irony | 10–14 | vocab.context | L6 | 6 | 6 | L.4.5.A, L.5.5.A, L.6.5.A, L.8.5.A |
| `english.style.voice` *new* | choose active or passive voice for an effect; fix inappropriate shifts | 12–14 | combine | L7 | 7 | 6 | L.8.1.B, L.8.1.D, L.8.3.A |
| `english.argue.claim-evidence` | tell claims from evidence and reasoning in a short passage | 12–14 | vocab.context (soft) | L8 | 8 | 6 | RI.6.8 |
| `english.argue.evaluate` *new* | judge whether evidence is relevant and sufficient; spot irrelevant evidence and opinion offered as fact | 12–14 | argue.claim-evidence | L9 | 9 | 6 | RI.7.8, RI.8.8 |

---

## 3. Mastery criteria

The path keeps README §3 unchanged: M1 (N first-try successes at level ≥ Lm across ≥ 2 local dates), M2 (assisted or modelled answers never subtract), M3 (evidence variety, waived while only one world teaches a skill) and S1–S4 Leitner review. What the path adds:

1. **Per-skill Lm.** `docs/DAILY_LEARNING.md` ("Open") currently uses one mastery level per world, `floor(maxLevel/2)`. Most skills in the three new worlds live on one or two levels, so a world-level threshold would credit `english.argue.evaluate` (L9) as soon as the child reached L4. **Dependency D1:** the pack declares `Lm` per skill per world, and `memory.ts` counts a success toward skill S only when `exercise.skillId === S` and `level ≥ Lm(S)`.
2. **Interleaved review items.** From L3 upward in Wordroot Grove and The Lantern Press, and from L4 upward in Paper Boat Post, items with `index % 4 === 3` (2 of 8 per round) come from an earlier skill of the same world, generated with that earlier level's parameters but stamped with that item's own `skillId`. They give spaced retrieval practice and let a skill keep collecting M1 evidence after the child has moved past its level. Retrieval and distributed practice are rated high-utility by Dunlosky et al. (2013) (README §3.4); the 2-in-8 ratio is a product hypothesis.
3. **Mastery count.** N = 6 for every skill, except `english.phonics.onset-rime` (N = 4: it is an on-ramp and shouldn't hold a child back).
4. **Speed is never an input.** No timers on answers in any band. Reading-rate standards (RF.x.4.B) are out of scope (§5).
5. **Voluntary help.** "Read it to me" on a reading item, and the "Hint" button in bands C–D, record the item as `assisted` (needs ET-5 from `TEEN_TRACK.md`). The help itself is never refused or reduced.

---

## 4. Hand-over between games (rules for the adaptive path engine)

The path order is G1 `rhyme-lanterns` → G2 `paper-boat-post` → G3 `wordroot-grove` → G4 `lantern-press`. Every rule is a pure function of stored events, world levels, the child's age band and today's date (no speed, no randomness). These are proposals. The planner (`src/daily/planner.ts`) is game-engineer code, and none of it is implemented yet.

| Game | Entry skills (hard prereqs) | Exit skills | Hand-over level `Hn` (0-based) | Bridge levels (overlap with next game) |
|---|---|---|---|---|
| G1 Rhyme Lanterns (maxLevel 7) | — | `phon.rhyme` | 5 | L6–L7 (rhyme chains) ↔ G2 L0 (onset swap inside rhyme families) |
| G2 Paper Boat Post (maxLevel 9) | `phon.rhyme` | `phonics.multisyllable`, `read.sentence` | 7 | L8 (compounds, -s/-ed/-ing endings) ↔ G3 L0 (prefix + known word) |
| G3 Wordroot Grove (maxLevel 9) | `phonics.multisyllable` | `vocab.roots`, `vocab.context`, `grammar.word-class` | 7 | L9 (confused words in sentences) ↔ G4 L0 (connective meaning) |
| G4 Lantern Press (maxLevel 9) | `grammar.word-class` | `argue.evaluate`, `vocab.figurative` | — | — |

### 4.1 Rules
| Rule | Definition |
|---|---|
| **H1 start** | A child with no English history starts at level 0 of the game for their age band (3–5 → G1, 6–8 → G2, 9–11 → G3, 12–14 → G4). There is no pretest. Placement happens through play: R2 (step up after 2 first-try answers) and R0 (level + 1 after a round with ≥ 50 % first-try) move a fluent child up about one level per round. |
| **H2 assumed by age** | Games whose band ends before the child's band starts count as **assumed complete**, so their exit skills satisfy P2 for unlocking, exactly as P2 already does ("assumed by age"). They are *not* marked mastered and get no review slots. |
| **H3 hand forward** | The next game unlocks when **any** of these holds: (a) every exit skill of the current game is mastered (M1); (b) the current game's level ≥ `Hn`; (c) H2. Unlocking adds the next game to the planner's "new world" candidates (P4). The current game stays in play for practice and review. |
| **H4 current path game** | The current path game is the lowest-ordered game that is unlocked, not assumed complete, and has an exit skill not yet mastered. P4 gives the current path game priority among English worlds; P11 (≤ 2 stops per library per day) still applies. |
| **H5 step back** | If a child plays **2 consecutive rounds** of the current game at level 0 or 1 with < 50 % first-try, **and** the previous game is assumed complete (H2) or its exit skills are unmastered, then: (1) the previous game's "assumed complete" flag is cleared; (2) the next day's plan includes one round of the previous game, starting at its level `Hn − 1` (bridge content, never level 0); (3) the flag returns when the previous game reaches `Hn` again or its exit skills are mastered. The child never sees this as going back: the stop is labelled as a normal world. The age-band game is never locked. |
| **H6 bridge credit** | Bridge levels practise overlapping content, so evidence earned on a bridge level of either game counts toward the shared skill. Example: compound and -ed/-ing items in G2 L8 count toward `phonics.multisyllable`, which is G3's entry skill. |
| **H7 reviews across games** | Mastered skills enter S1–S4. A review round can run in any world that teaches the skill (S2). In G3 and G4, review also happens through interleaved items (§3.2). |
| **H8 path end** | When G4 is at maxLevel and its exit skills are mastered, the English path for 3–14 is complete. Reviews continue. Band T English (`TEEN_TRACK.md` §2.3) is the later continuation. |
| **H9 parent override** | A parent can pick the starting game per child (the existing U2 per-library override). The override replaces H1 only; H3–H5 still apply. |
| **H10 ties** | Ties are broken by path order, then world id (P10). |

### 4.2 Worked traces (unit-test fixtures)
1. **Age 6, new child.** H1 puts the child in G2 L0. G1 counts as assumed complete (H2: band 3–5 ends before 6), so G2's hard prerequisite `phon.rhyme` is met. After round 1 at 7/8 first-try the child moves to L1, then L2 after round 2. If instead the child scores 2/8 and then 3/8 at L0, H5 fires: the next day includes one G1 round starting at L4 (Rhyme Lanterns level `Hn − 1`).
2. **Age 9 who struggles to decode.** H1 puts the child in G3 L0. Two rounds at L0 with 3/8 and 2/8 first-try trigger H5, so the next day includes one G2 round at L6 (`Hn − 1` = 6, final -e). G3 stays in the plan as well. G2 counts as assumed complete again once it reaches L7 or masters its exit skills.
3. **Age 12, fluent.** The child starts in G4 L0 and climbs. H5 never fires. Reviews draw on G4's own interleaved items.
4. **Age 7 finishing G2.** G2 reaches L7, so H3(b) unlocks G3, and G3 appears as NEW within the D4 cap. G2 stays in the plan until its exit skills are mastered.

### 4.3 Tests to add with the implementation (game-engineer; ideas)
- `tests/unit/english-path.test.ts`: H1 placement for every age 3–14; H2/H3 unlock truth table; H5 trigger and recovery with a fixed clock; H4 picks exactly one current game; the traces in §4.2 as fixtures; determinism (same events give the same plan).
- A property test over ages 3–14 × K 3–10 × synthetic histories: the age-band game is never locked, H5 never schedules level 0 of the previous game, and P11 still holds.
- Per-skill Lm (D1): a success at a level below Lm, or with a different `skillId`, never counts.

### 4.4 Story hand-over (presentation, not rules)
At the first G2 round, Hoot hands over in one beat ("Sarah has boats full of words for you!") and Sarah greets the child. G3 and G4 open with Sarah introducing that world's helper. These beats are skippable and voiced, and they play only once (`seen` flag).

---

## 5. Out of scope, on purpose

| Out of scope | Why |
|---|---|
| Long free-text writing (paragraphs, essays, stories, open answers) | It can't be auto-checked reliably without generative AI, which BrainZippy doesn't use with children. Free text may also contain personal data. Writing skills are practised through component skills (choose, order, combine, fix) instead. |
| Any open text field: typing names, places, answers in free form | Data minimisation (CLAUDE.md, D-016). Spelling is done with letter **tiles** (a physical keyboard may press tiles by letter but never fills a text field). |
| Chat, messaging, sharing writing, comments | Child-safety rules (master instructions §8). |
| Recording a child's voice or speech recognition (reading aloud, fluency, pronunciation) | Recording a child's voice is collecting personal data, and recognition accuracy on children's speech is not proven for this use. RF.x.4.B (reading rate and expression) and the Speaking & Listening standards are therefore not assessed. |
| Reading speed or words-correct-per-minute | Speed is never a mastery signal (README §3). |
| Handwriting (L.1.1.A printing) | Off-device skill; tracing may come later as a separate world. |
| Copyrighted texts (modern books, song lyrics, articles) | Every passage and sentence is written for BrainZippy. Public-domain classics are allowed only if first published before 1929 *and* verified (title, author, first publication year, source edition). None of the three worlds needs one in v1. |
| Partisan politics, religion, current events, real brands, real people | Low-stakes local topics only (`english.md` §6); argument topics are fictional island issues. |
| Dictionary and reference skills (L.x.4.C/D), research and citation (W.x.7–8) | Band T `ela` topics (`TEEN_TRACK.md` §2.3), or later. |
| Pseudo-word decoding with spoken answer options | TTS pronunciation of non-words is unreliable. Pseudo-words appear only as *printed* creature names read against pictures (Paper Boat Post, optional). |

---

## 6. Rules that apply to all English worlds

1. **Audio-first up to age 8.** Every prompt is spoken and captioned. In *reading* items (Paper Boat Post L1–L9), the target word or sentence is **not** spoken before the child answers, because hearing it would turn reading into listening. It is spoken right after the answer, and a "Read it to me" button is always there (recorded as `assisted`, §3.5). The prompt caption never contains the target word.
2. **Text-led from 9, voice on demand.** Bands C and D show text first, with a speaker button on every prompt, sentence, option, hint and passage.
3. **Dialect.** US spelling and pronunciation (CCSS). Avoid words with US/UK spelling variants (colour/color, -ise/-ize, travelled/traveled) in any item where spelling is checked. Avoid minimal pairs that merge in common US dialects (pin/pen; cot/caught; `english.md` §5).
4. **Names.** First names only, from a fictional, culturally varied list (e.g. Ana, Kofi, Mei, Raj, Lena, Omar, Zara, Tomás, Aiyana, Sami, Priya, Jonah, Nia, Kenji). Band B names must be decodable at the level where they appear (Sam, Ben, Kim, Raj, Meg, Tim). Critter Crew names are allowed. No surnames, no real public figures.
5. **Blocklist.** One shared English blocklist (rude words and slurs in English, plus common words in other languages that read as rude) applies to every generated string. That includes words a tile set *could* spell, and "dropped letter" distractors (for example, dropping l from "clock" or "flag" must never be generated). Unit-tested; see each world doc.
6. **Distractors target named misconceptions.** Every distractor carries a tag (e.g. `vowel-swap`, `comma-splice`, `ly-adjective`), and every hint line keys off it.
7. **Hint ladder.** First miss: the helper explains the idea and gives a strategy, and the wrong pick greys out. Second miss: a worked model on the board, which the child completes (errorless). Retries are unlimited. Praise names the process, never ability.
8. **Accessibility.** Every control is a `<button>`, and nothing works by drag only. In reading items, a screen reader announces the printed word **letter by letter** ("Word on the boat: c, a, t"), so the answer isn't handed over in audio. The picture options are named. QA-accessibility should review this. Reduced-motion paths are required, and targets are ≥ 64 px up to age 7 and ≥ 44 px always.

---

## 7. Evidence (path level)

| Design choice | What the research says | Strength / caveat |
|---|---|---|
| Explicit, systematic phonics for 5–8 (Paper Boat Post) | The National Reading Panel meta-analysis, published as Ehri, Nunes, Stahl & Willows (2001, *Review of Educational Research* 71, 393–447), concluded that systematic phonics instruction helped children learn to read better than the comparison instruction. The EEF Teaching and Learning Toolkit rates phonics "+5 months" on average, high evidence strength (228 studies), and says teaching should be explicit, systematic and matched to the child's current knowledge. The IES/WWC practice guide (Foorman et al., 2016, NCEE 2016-4008) rates "teach students to decode words, analyze word parts, and write and recognize words" as **strong** evidence and daily connected-text reading as **moderate**. | Strong overall, but contested at the margins: Bowers (2020, *Educational Psychology Review*, doi:10.1007/s10648-019-09515-y) argues the evidence that *systematic* phonics beats alternatives is weaker than often claimed, and Stuebing et al. (2008, *J. Educ. Psychol.* 100(1), 123–134) argue the NRP effects are practically significant. We present phonics as "built on research", not as proven for our game. |
| Morphology for 8–11 (Wordroot Grove) | Bowers, Kirby & Deacon (2010, *RER* 80(2)): 22 studies, preschool–grade 8. Morphological instruction helped reading, spelling and vocabulary, was particularly helpful for less able readers, worked no less well for younger students, and worked best combined with other literacy instruction. Goodwin & Ahn (2013, *Scientific Studies of Reading* 17(4), 257–285): 30 studies, overall d = 0.32, moderate effects on vocabulary, decoding and spelling, **no significant effect on comprehension or fluency**, larger effects for younger students. | Moderate. Effects were smaller on standardised measures. We claim only word-level outcomes as plausible. |
| Context-clue instruction (Wordroot Grove L6–L7) | Fukkink & de Glopper (1998, *RER* 68(4), 450–469): 21 treatments, mean effect 0.43 SD; clue instruction was more effective than other instruction types or practice alone. Kuhn & Stahl (1998, *J. Literacy Research* 30, 119–138) found that practice-only groups did about as well as strategy groups. | Mixed on *why* it works, so the design combines naming the clue type (hint) with lots of varied practice. |
| Sentence combining rather than isolated grammar drills (Lantern Press) | *Writing Next* (Graham & Perin, 2007, Alliance for Excellent Education): sentence combining effect size 0.50 for adolescents (0.46 for weaker writers). Traditional grammar instruction had a small but statistically significant **negative** effect on writing quality. Saddler & Graham (2005, *J. Educ. Psychol.* 97(1), 43–54, an RCT the WWC rates as meeting standards without reservations) studied peer-assisted sentence combining with younger writers. | Moderate. Those outcomes are *writing quality*, which our choose/order items don't measure. Grammar items are therefore framed as choices with an effect ("which version says what the writer means?"), never as labelling drills. |
| Explicit vocabulary and comprehension-strategy instruction for adolescents (Lantern Press L5–L9) | IES/WWC *Improving Adolescent Literacy* (Kamil et al., 2008): "Provide explicit vocabulary instruction" and "direct and explicit comprehension strategy instruction" are both rated **strong** evidence. | Strong for classroom instruction. Transfer to a self-paced game is an **assumption**. |
| Spaced retrieval, worked examples, errorless completion | Already logged: README §3.4 (Cepeda et al., 2006; Dunlosky et al., 2013) and REFERENCE_RESEARCH.md §4. | As logged there. |

**Assumptions (not evidence).** The 2-in-8 interleave ratio; hand-over levels `Hn`; H5's "2 rounds below 50 %" trigger; keyword-picture letter tiles as a substitute for phoneme audio; that game-based choose/order practice transfers to children's own reading and writing; that a single host character improves return visits. BrainZippy itself has **not** been studied.

---

## 8. Open questions for the owner
1. **Q1 Host swap.** The `english` library host is `hoot` in `packs/library-english`. Should it become Sarah when her art lands, with Hoot staying host of Rhyme Lanterns and helper in The Lantern Press? (Lead/pack owner change; recommended.)
2. **Q2 Older concepts.** Should `english.md` §3 concepts (Word Train, Sentence Bridge, Word Workshop, Mystery Words, Claim Court, Modifier Mix-up) be retired, or kept as optional second worlds for M3 evidence variety? Recommendation: keep Letter Lagoon and Drum Parade as band-A fillers (§2.1 gap) and defer the rest.
3. **Q3 Phoneme recordings.** Paper Boat Post ships in "phase A" without isolated phoneme audio (keyword pictures, slowed whole words). Should we budget a human recording of about 44 phonemes plus a literacy-specialist check for "phase B"?
4. **Q4 Read-aloud for bands C–D.** The authored sentence and passage banks are large (≈ 240 items per world). Pre-render them all with Kokoro, or allow the speech-synthesis fallback for on-demand read-aloud (as ET-7 proposes for the Lab)?
5. **Q5 Quick climb.** Should a perfect round (8/8 first-try, no hints) raise the level by 2 instead of 1, so older or fluent children reach their level faster? This needs an engine change to `levelAfterRound` (accuracy only, never speed).
6. **Q6 Reviewer budget.** A literacy specialist (phonics bank, phoneme audio) and a secondary ELA teacher (grammar keys, passages) should review before release.

## 9. Risks and dependencies
| # | Item | Owner |
|---|---|---|
| D1 | Per-skill `Lm` in packs and `memory.ts` (§3.1) | game-engineer |
| D2 | `PassageBoard`: running text whose words or sentences are toggle buttons, submitting a `set`. Needed by Wordroot Grove L6–L7 and Lantern Press L3–L4, L8–L9. A world-local board first; lift it to `src/game` when the second world needs it | game-engineer |
| D3 | `SortBoard` for `match` answers (bins; tap item, then tap bin; keyboard). Needed by all three worlds. Reuse an existing sorting board if one is shared; otherwise world-local first | game-engineer |
| D4 | **Single valid order:** the `sequence` answer accepts exactly one order. Sentence and clause-ordering items must be authored so that only one order is acceptable; a test enforces an empty `alternatives` list. An optional engine extension (`sequence.alternatives`) would allow natural variety later | game-engineer (extension); curriculum (constraint) |
| D5 | Voluntary help recorded as `assisted` (ET-5) | game-engineer |
| D6 | H1–H10 in the planner | game-engineer |
| R1 | **Name clash:** "Sarah & Duck" is a well-known BBC CBeebies preschool series about a girl named Sarah and her duck. Sarah should **not** be a duck or be paired with a duck, and the name needs the same trademark/similarity check D-028 applied to the other hosts | creative-director, lead |
| R2 | Content volume: ≈ 240 authored items per band C/D world, plus a reviewed phonics bank | curriculum-designer |
| R3 | TTS mispronouncing isolated phonemes or unusual words (pseudo-words, roots such as "-scope") | audio-designer |
| R4 | Grammar keys disputed ("which" vs "that", split infinitives, singular "they") | Avoid items whose correctness is disputed by usage guides; singular "they" is never marked wrong; ELA teacher review |

## Sources checked for this document (2026-11-23)
- CCSS ELA grade pages, thecorestandards.org: RF K, 1, 2; L 1, 2, 3, 4, 5, 6, 7, 8; RI 6, 7, 8 (sub-letters above as published).
- DfE, *English programmes of study: key stages 1 and 2* (July 2014) and *English programmes of study: key stage 3*, assets.publishing.service.gov.uk. DfE, *Assessment framework for the development of the Year 1 phonics screening check*, gov.uk. Schools Week, "New curriculum to be introduced in 2028 as review published" (first teaching September 2028).
- Ehri et al. (2001), cited via Stuebing et al. (2008) PMC3024599. Bowers (2020), Springer. EEF Toolkit "Phonics" page. Foorman et al. (2016) WWC practice guide PDF. Bowers, Kirby & Deacon (2010), via Reading Rockets summary. Goodwin & Ahn (2013), catalogue abstract. Fukkink & de Glopper (1998), catalogue abstract. Kuhn & Stahl (1998), via Reading Rockets. Graham & Perin (2007), *Writing Next* PDF (Reading Rockets host). Saddler & Graham (2005), WWC study page. Kamil et al. (2008), WWC practice guide page.
- "Sarah & Duck" (BBC CBeebies): Wikipedia and Apple TV listings.
