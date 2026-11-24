# The Lantern Press (`lantern-press`)

English path, band D · ages 12–14 · host **Sarah** (editor), helper **Hoot** (fact-checker) · music `island` · prefix `lp.`
Status: **built (2026-11-24)**; independent QA/accessibility and English-content reviews done and fixed the same day (§11); pending a secondary ELA teacher. What was built and every deviation from this proposal: **§11** below. Path context: `docs/curriculum/ENGLISH_PATH.md` (skill map §2.4, hand-over §4). "Aligned with" CCSS L/RI codes verified on thecorestandards.org on 2026-11-23; codes, site wording and the Writing Next claim re-verified against official sources by the content review on 2026-11-24.

## 1. What it teaches

**Objective.** The learner makes and judges writers' choices in short original texts. They combine sentences with the connective that says what they mean, fix misplaced modifiers and vague pronouns, cut redundancy, choose words by connotation, interpret figurative language, choose active or passive voice for an effect, and tell claims from evidence and judge whether evidence is relevant and sufficient.

| Level (0-based) | Skill id | Lm | Aligned with |
|---|---|---|---|
| L0 connectives · L1 sentence combining | `english.grammar.combine` | 1 | L.7.1.B, L.5.3.A, L.6.3.A, L.3.1.H · UK Y3–4 (wider range of conjunctions), KS3 grammar (effect of grammatical features) |
| L2 modifiers | `english.grammar.modifier` | 2 | L.7.1.C |
| L3 pronoun reference | `english.grammar.pronoun-ref` | 3 | L.6.1.D |
| L4 concise wording | `english.style.concise` | 4 | L.7.3.A, L.5.3.A |
| L5 connotation | `english.vocab.connotation` | 5 | L.6.5.C, L.7.5.C, L.8.5.C · KS3 reading (vocabulary choice presents meaning) |
| L6 figurative language | `english.vocab.figurative` | 6 | L.4.5.A, L.5.5.A, L.6.5.A, L.8.5.A · UK Y5–6 and KS3 (figurative language) |
| L7 active and passive voice | `english.style.voice` | 7 | L.8.1.B, L.8.1.D, L.8.3.A · UK Y5–6 (passive verbs to affect presentation) |
| L8 claims and evidence | `english.argue.claim-evidence` | 8 | RI.6.8 · UK Y5–6 (fact and opinion) |
| L9 evaluating evidence (plus mixed review) | `english.argue.evaluate` | 9 | RI.7.8, RI.8.8 · KS3 (inferences referring to evidence) |

**Why "editor's choices".** *Writing Next* (Graham & Perin 2007) found sentence combining helped adolescents' writing quality, while traditional grammar instruction did not (small negative effect). So no item asks the learner to label a part of speech for its own sake. Each item asks which version **says what the writer means** or **does what the writer wants**. Grammar terms appear in hints as names for things the learner has just used.

## 2. Story and tone

The Lantern Press is Monster Island's evening newspaper, printed by lantern-light in an old boathouse. Sarah is the editor, and Hoot (from Rhyme Lanterns, now older and wiser in tone) checks facts. The learner joins as the new copy editor. Each round is one page of tonight's edition: the school garden, the ferry timetable, the island bake-off, a tide-pool survey, the library's opening hours.

- **No deadline pressure.** The press waits for the editor ("The press is ready whenever you are"). No countdowns, ever.
- **Older register.** The game keeps the GameRunner and Critter Crew art, but with restrained motion: Sarah and Hoot use calm idle and nod states, with no bouncing celebrations. There is one short intro (3 beats) and a one-line page context per round. Praise is terse and specific (ENGLISH_PATH §6; register guidance as in `TEEN_TRACK.md` §1.2).
- **Story beats** (`lp.story.*`): intro1 "Welcome to the Lantern Press. I'm Sarah, the editor." · intro2 "Hoot checks every fact. You'll help every sentence say what it means." · intro3 "Tonight's first page is on your desk." · outro1 "Page approved. Off to the press." · outro2 "You weighed each choice against what the writer meant." · outro3 "Your Editor's Pen is ready." Between-beats name the page ("Next: the ferry timetable"). The first visit adds `lp.story.handover`, where Sarah introduces Hoot.
- **Reward:** the **Editor's Pen** mark, a brass nib with a lantern flame.

## 3. Levels and exercises

`roundLength` 8, `maxLevel` 9, `stepUpAfter` 2, `stepDownAtAttempts` 3. One tutorial at L0 (pointing hand on "because").
Modes alternate by `index % 2`. From L3 up, `index % 4 === 3` items are interleaved review (ENGLISH_PATH §3.2). **At L8–L9, items 2k and 2k+1 share one article**, so the learner reads one passage for two questions.

| L | Modes | Answer kind | Example (all text original) | Distractor rule (misconception) |
|---|---|---|---|---|
| **0** Connectives | choose the connective that signals the relationship | `choice` (3) | "The ferry left late ___ the fog was thick." → *because* · although · so | Reversed cause/effect (so for because); contrast vs cause (although for because); "and" as an all-purpose joiner. |
| **1** Combining | choose the best single sentence for 2–3 short ones · order clause cards into one sentence | `choice` (4) · `sequence` | "The bake-off starts at noon. Bring your own apron. Ovens are provided." → *The bake-off starts at noon; ovens are provided, but bring your own apron.* · The bake-off starts at noon, bring your own apron, ovens are provided. · The bake-off starts at noon and bring your own apron and ovens are provided. · Although the bake-off starts at noon, bring your own apron. Order: `Although the path was steep,` · `the walkers reached the lighthouse` · `before dark.` | Comma splice; run-on with repeated "and"; meaning change from a wrong connective; dropped information. Clause cards carry their punctuation and capital, so only one order is valid. |
| **2** Modifiers | tap the misplaced or dangling phrase · choose the clear rewrite | `set` (1 chunk) · `choice` (3) | "Covered in mud, Rumble washed the puppy." → tap *Covered in mud* → *Rumble washed the puppy, which was covered in mud.* · Rumble, covered in mud, washed the puppy. · Covered in mud, the puppy washed Rumble. | A rewrite that moves the phrase but keeps the wrong attachment; one that changes who does what. |
| **3** Vague pronouns | tap the unclear pronoun(s) (count stated) · choose the clear rewrite | `set` · `choice` | "When Mina met Lucia at the library, she gave her a map." → tap *she*, *her* → *When Mina met Lucia at the library, Mina gave her a map.* | A rewrite that is still ambiguous; one that changes the meaning (Lucia gives Mina). Singular "they" with a clear antecedent is **never** marked vague. |
| **4** Concise wording | tap the redundant words (count stated) · choose the most concise version that keeps all the meaning | `set` · `choice` | "At 3 p.m. in the afternoon, the club handed out free gifts." → tap *in the afternoon*, *free*. "Due to the fact that the hall was booked, the choir practiced outside." → *Because the hall was booked, the choir practiced outside.* | A version that cuts needed information (shorter is not always better); one that stays wordy. |
| **5** Connotation | choose the word that fits the writer's purpose · sort words into positive / neutral / negative | `choice` · `match` (6 → 3 bins) | "The review praised the café: its portions were ___." → *generous* · excessive · large. "The neighbor complained that the cat was ___ about everything." → *nosy* · curious · interested. Sort: thrifty, cheap, economical; confident, arrogant, sure | Same denotation, wrong connotation; the neutral word when the context needs a charged one. Sorts use only words a reviewer agrees are clear-cut (no ranking of fine shades). |
| **6** Figurative language | name the device · choose what it means here | `choice` · `choice` | "The old ferry groaned as it pulled away from the dock." → *personification*. "My backpack weighs a ton." → *it is very heavy* · it is made of metal · it is getting lighter. Top items: "'Great, more rain,' Omar sighed at the soggy picnic." → *he is unhappy about the rain* (verbal irony). Bakery sign "We knead you!" → *a pun on knead and need* | Literal reading; the wrong device. Option sets never contain two labels that both fit (personification is a kind of metaphor, so a personification line never offers "metaphor"). |
| **7** Active and passive voice | choose the version that fits a stated purpose · fix an inappropriate shift | `choice` · `choice` | Purpose "focus on the window, not on who broke it" → *The window was broken during the storm.* · The storm broke the window. Shift: "Tomás painted the fence, and then the gate was painted by him." → *Tomás painted the fence and then the gate.* | "Passive is always wrong" (it never is in these items: purpose decides); wordy passive kept in a shift item. |
| **8** Claims and evidence | sort an article's sentences into claim / evidence / reasoning / doesn't support · tap the sentences that support the claim (count stated) | `match` · `set` | Article (5 sentences, ≤ 110 words): "The library should open on Sundays." (claim) · "Last term's sign-in sheets show about 40 visitors every Saturday." (evidence) · "Many of those visitors are students who work on weekdays." (evidence) · "So a Sunday opening would serve people who can't come in the week." (reasoning) · "The library also has bright blue doors." (doesn't support) | A strongly worded opinion read as evidence ("Everyone knows Sundays are boring"); a true but irrelevant fact. |
| **9** Evaluating evidence + mixed review | choose the strongest evidence of 3 · tap the irrelevant sentence · judge sufficiency (choice with a reason) | `choice` · `set` (1) · `choice` | Claim "The school garden needs a second water butt." → *Logs show the one butt ran dry on 9 of the last 12 dry days.* · My friend thinks the plants look thirsty. · Water butts come in green and black. Sufficiency: "Two people on the bus said the timetable is confusing. Is that enough to say most riders find it confusing?" → *No: two people may not represent most riders.* · Yes: they ride the bus. · No: the bus is not mentioned. | Anecdote vs systematic data; sample size; relevance; opinion offered as fact. Every other item reviews L0–L8. |

### 3.1 Content banks
- **Authored, tagged banks.** ≥ 24 items per level (≥ 3 rounds without repeats), each `{ id, text, options[], correct, tags{option→misconception}, skillId, level, reviewNotes }`. L8–L9 use ≥ 16 articles (each supports 2–4 items).
- **Lengths:** L0–L7 sentences ≤ 28 words; L1 inputs ≤ 3 sentences; L8–L9 articles 4–7 sentences, ≤ 120 words. Short paragraphs, no jargon, US spelling.
- **Connotation word sets** (L5) come from a reviewed table of near-synonym groups with an agreed polarity, e.g. {thrifty +, economical 0, cheap −} · {confident +, sure 0, arrogant −} · {curious +, interested 0, nosy −} · {determined +, firm 0, stubborn −} · {slender +, thin 0, skinny −} · {aroma +, smell 0, stench −}. Items avoid words describing bodies in ways that could hurt. The "slender/skinny" set is a candidate for removal at review.
- **Figurative lines** (L6) are all original, with ≥ 6 per device (simile, metaphor, personification, hyperbole, idiom, verbal irony, pun). Idioms are common American English with a plain meaning. No idiom whose origin or meaning is offensive.
- **Topics:** fictional island issues only (library hours, school garden, ferry timetable, bake-off, recycling bins, skate ramp, lunch menu, tide-pool survey). Never partisan politics, religion, health or medical advice, real brands, real people or current events (`english.md` §6). Numbers in articles are fictional and plausible, and every article page shows "Fictional article for practice."
- **Public domain:** not needed in v1. If a classic line is ever used for figurative language, it must be first published before 1929 and verified (title, author, year, edition) and recorded in the bank's `source` field.

### 3.2 Correct-answer validation and accepted alternatives
- `choice`: exactly one acceptable option. Each distractor carries a definite error tag (`comma-splice`, `run-on`, `meaning-shift`, `info-loss`, `still-ambiguous`, `wordy`, `wrong-connotation`, `literal`, `wrong-device`, `irrelevant`, `anecdote`, `small-sample`). A teacher confirms that each tagged error is real by mainstream usage guides. Items where guides disagree (split infinitives, "which" vs "that", sentence-initial "and/but", singular "they", "data is/are") are **excluded**, not judged.
- `sequence` (L1 clause cards): exact order. Each card carries its punctuation and only the first card has a capital, so exactly one order is valid (authored `alternatives: []`, tested).
- `set`: the prompt states the count; options are pre-chunked phrases or sentences; the correct set equals the authored chunks; `parts` mark each one. For L4 redundancy, every chunk whose removal keeps the meaning *and* grammar is in the correct set, so no "also acceptable" chunk is left out (reviewer check).
- `match`: every sentence or word to its bin. In L8, the "reasoning" bin is used only when the article contains an explicit link sentence ("So…", "This means…").

## 4. Hint ladder (never punishing; voluntary Hint button records `assisted`)

| Skill | Round start (Sarah) | 1st miss (the wrong pick greys out, then a strategy note) | 2nd miss (worked model; the learner completes it) |
|---|---|---|---|
| combine | "Connectives carry meaning: cause, contrast, time, condition." | "Read both ideas. Is the second a *reason*, a *surprise* or a *result*?" plus a comma-splice note when that error is chosen: "Two full sentences need more than a comma." | The relationship is labelled (cause → *because*), the combined sentence is shown clause by clause, and the learner taps it. |
| modifier | "A describing phrase attaches to the nearest noun." | "Who is *covered in mud*? Read it literally." Hoot shows the literal reading: "Rumble was covered in mud." | The phrase is shown attached to the right noun; the learner taps the rewrite. |
| pronoun-ref | "A pronoun should point to one clear person or thing." | "Could *she* mean Mina or Lucia? If both, it's unclear." | Each possible antecedent is linked by an arrow; the fix replaces one pronoun with the name; the learner taps it. |
| concise | "Cut words that repeat an idea, never words that add one." | "*3 p.m.* already says afternoon. What else repeats?" | Redundant chunks are struck through one at a time with their reason; the learner taps Done. |
| connotation | "Words with the same meaning can carry different feelings." | "Is the writer praising or complaining? Pick the word with that feeling." | Each option gets a +/0/− marker and the purpose is restated; the learner taps the match. |
| figurative | "Figurative language means more than the words say." | Device card: "Personification gives human actions to things. Can a ferry really groan?" | The literal meaning and the intended meaning are shown side by side; the learner taps. |
| voice | "Active puts the doer first; passive puts the thing done-to first." | "What does the writer want to focus on: the doer or the thing?" | Both versions are shown with the doer highlighted; the purpose is matched; the learner taps. |
| claim-evidence | Hoot: "Evidence is something someone could check." | "Could someone check this sentence, or is it an opinion?" (the "could someone check?" test) | Each sentence is labelled with a one-line reason; the learner places the cards. |
| evaluate | Hoot: "Good evidence is relevant, enough and checkable." | "Is it about the claim? Is it more than one person's view?" | The three tests are applied to each option in a short table; the learner taps the strongest. |

## 5. Feedback lines (terse process praise; never "smart" or "genius")
`lp.praise.1` "You matched the connective to the relationship." · `lp.praise.2` "You read it literally and caught the misplaced phrase." · `lp.praise.3` "You checked who each pronoun points to." · `lp.praise.4` "You cut the repeat and kept every fact." · `lp.praise.5` "You matched the word's feeling to the writer's purpose." · `lp.praise.6` "You looked past the literal words." · `lp.praise.7` "You chose the voice for the writer's focus." · `lp.praise.8` "You asked whether it could be checked. That's fact-checking." · `lp.retry.1` "Not yet. What does the writer mean?" · `lp.retry.2` "Close. Check it against the claim."

## 6. Voice lines (prefix `lp.`; captioned; text first, voice on demand)
- **Pre-rendered:** ≈ 14 prompts ("Which connective fits?", "Which sentence says it best?", "Tap the phrase that's in the wrong place.", "Tap the unclear word.", "Tap the words that repeat an idea.", "Which word fits the writer's purpose?", "What does this mean here?", "Sort the sentences.", "Which evidence is strongest?"…), 9 round-start lines, 9 strategy hints, 10 praise and retry lines, 9 story lines. About 55 ids.
- **Item text** (≈ 300 sentences and articles): read aloud on demand (owner question Q4). Voice is optional throughout, and the world is fully playable muted.

## 7. Boards and accessibility
- `choice`, `sequence`: the default `OptionBoard` and `SequenceBoard`, skinned as galley proofs and type blocks. Long options wrap; option text is ≥ 18 px.
- `set` (L2–L4, L8–L9): **`PassageBoard` (new; ENGLISH_PATH D2)**, shared with Wordroot Grove. Chunks are toggle buttons inside running text (`aria-pressed`), a Done button, and the stated count shown ("2 to find"). Fallback: chunks as an `OptionBoard` list under the text.
- `match` (L5, L8): `SortBoard` (ENGLISH_PATH D3). Tap a sentence, then a bin; keyboard Enter → arrow keys → Enter.
- **Screen readers:** articles are real paragraphs; each chunk button's accessible name is its text; results are announced ("2 of 2 found").
- Text scalable to 200 % without horizontal overflow at 390×844; line length ≤ 75 characters. Contrast ≥ 4.5:1.
- Reduced motion: page-turn and press animations become cross-fades.
- No timers; unlimited retries; no score loss.

## 8. Content safety
- Every sentence, article and figurative line is original. No textbook, test-prep or news text, and no famous quotations.
- Topics stay low-stakes and local (§3.1); no partisan, religious, health, body-image or brand content. Irony and puns never target a person or group.
- Names are culturally varied first names (ENGLISH_PATH §6.4); roles in articles vary (who coaches, who bakes, who repairs).
- Shared blocklist over every string. A teacher review of argument articles is required (`TEEN_TRACK.md` §5 lists English argument topics as review-gated).

## 9. Automated tests (`tests/unit/lantern-press.test.ts`, `e2e/lantern-press.spec.ts`)
1. Levels 0–9 × 50 seeds: lint, declared skill, exactly one correct option, every distractor tagged with a known tag.
2. Determinism; no repeated item in a round; bank ≥ 24 per level; L8–L9 items 2k and 2k+1 share an article id.
3. Sequence items: authored `alternatives: []`; exactly one capitalised card; punctuation sits on cards.
4. Set items: stated count equals `correct.length`; chunks concatenate back to the source text.
5. Figurative option sets never contain two labels from a declared overlap list (personification/metaphor, hyperbole/idiom where both apply).
6. Excluded-usage list (split infinitive, which/that, singular "they" flagged as error…): no item tags these as errors.
7. Length caps (§3.1); articles carry `fictional: true`; no banned topic keywords (politics, religion, medical terms, brand list).
8. Interleave: from L3, `index % 4 === 3` items come from earlier skills.
9. E2E (no drag, keyboard path): full round; first miss shows the strategy; second miss shows the worked model; Editor's Pen; text at 200 % zoom on the phone project shows no overflow; the four viewports.

## 10. Evidence and assumptions
- **Sentence combining:** *Writing Next* (Graham & Perin 2007, Alliance for Excellent Education) reports an effect size of 0.50 on adolescents' writing quality, and a small but statistically significant *negative* effect for traditional grammar instruction. The 0.46 figure for weaker writers comes from a single study (Saddler & Graham 2005). Saddler & Graham (2005, *J. Educ. Psychol.* 97(1), 43–54), an RCT the WWC rates as meeting standards without reservations, studied peer-assisted sentence combining with younger writers. **Caveat:** those outcomes are learners' own writing. Our items are choose/order tasks, so transfer to the learner's writing is an assumption.
- **Explicit vocabulary and comprehension-strategy instruction** (connotation, figurative language, evaluating claims) is rated **strong** evidence in the WWC adolescent literacy guide (Kamil et al. 2008). That guide covers classroom instruction; a self-paced game is a different setting (assumption).
- **Standards** ask for the same evaluative skills (RI.6.8 → RI.8.8; KS3 "inferences and referring to evidence in the text"). This is alignment, not evidence of effectiveness.
- **Assumptions:** the "could someone check it?" heuristic for evidence; restrained motion for this age; 2-in-8 interleaving; that paired questions on one article reduce reading load without making the answers depend on each other (each item stands alone). BrainZippy itself has not been studied. Full references: ENGLISH_PATH §7.

## 11. As built (2026-11-24)

**Files.** `src/games/lantern-press/`: `sentences.ts` (L0 24 connective items + tutorial sentence; L1 12 combine + 12 clause-card items; L2 16 modifier sentences; L3 16 pronoun sentences; L4 14 redundancy + 12 concise items; L7 12 purpose + 13 shift items; the tag list and the excluded-usage list), `words.ts` (9 connotation groups, 5 of them sortable, 18 connotation sentences, 42 figurative lines = 6 per device, device definitions, distractor and also-fits tables), `articles.ts` (16 fictional articles, 12 strongest-evidence and 12 sufficiency items), `logic.ts` (modes, bank lookups, answer-neutral option ids, worked steps, tags), `generator.ts`, `hints.ts`, `Board.tsx` + `lantern-press.css` (PressBoard), `art.tsx` (boathouse newsroom, boathouse at dusk, prompt icons, Editor's Pen), `story.tsx`, `LanternPress.tsx`, `definition.ts`, `voice-lines.ts` (source of `voice.json`) and `voice.json` (344 lines, speakers sarah / hoot / narrator). Pack `src/content/packs/english-lantern-press` (topics `english.style`, `english.argue`; nine skills). Tests `tests/unit/lantern-press.test.ts`, `e2e/lantern-press.spec.ts`. Site: `src/site/content/games.ts`, `curriculum.ts` (nine skills; CCSS L.3.1.H, L.4.5.A, L.5.3.A, L.5.5.A, L.6.1.D, L.6.3.A, L.6.5.A, L.6.5.C, L.7.1.B, L.7.1.C, L.7.3.A, L.7.5.C, L.8.1.B, L.8.1.D, L.8.3.A, L.8.5.A, L.8.5.C, RI.6.8, RI.7.8, RI.8.8; the English page now covers 12–14), `references.ts` (Graham & Perin 2007). Engine: optional band seed for generators (D-037).

**Levels as built** (modes by `index % 2`; from L3 the items at index 3 and 7 are review from the four levels below, and at L9 every odd item is review):

| L | Even index | Odd index |
|---|---|---|
| 0 | choose the connective (3) | same |
| 1 | choose the one sentence that keeps every idea (4: splice, run-on, reversed/meaning shift, info loss) | clause cards: 4 cards + 1 wrong-connective card onto a composing stick, then Check |
| 2 | tap the misplaced phrase | choose the clear rewrite (still misplaced · who-does-what changed) |
| 3 | tap the unclear pronoun(s), count stated | choose the clear rewrite, with "The writer means…" stated |
| 4 | tap the part(s) that repeat an idea, count stated | choose the version with every fact in the fewest words (cuts a fact · still wordy) |
| 5 | choose the word whose feeling fits (charged opposite · neutral) | label 6 words (two clear-cut groups) positive / neutral / negative |
| 6 | name the device (3 labels, never two that fit) | choose what it means here (literal · misreading) |
| 7 | choose the version for a stated purpose (active or passive) | fix a voice shift |
| 8 | items 0, 2, 4: tap the 2 sentences that are evidence | items 1, 5, 6: label every sentence claim / evidence / reasoning / doesn't support (every item reads its own article) |
| 9 | item 0 strongest evidence · item 4 is it enough? · items 2, 6 tap the sentence that doesn't support | items 3, 7: the evidence question on the article of items 2, 6 (level-8 review); items 1, 5: review L0–L7 |

**Board.** One world-local `PressBoard` serves every mode: a galley proof on top (label, speaker, the text) and slips, type blocks, label stamps or Check below; on wide boards the proof sits left of the answers (sentence answers get the wider column; labelling boards give the article the wider one). Every move works by tap, drag (slip onto the proof, card onto the stick, card onto a label) and keyboard: real Tab and Enter; after placing a card focus moves to the next free card or Check, after picking a sentence to the first label, after labelling to the next unlabelled sentence or Check, after a miss to the first live control; Backspace takes the last card off the stick. Tapped parts are toggle buttons (`aria-pressed`) ≥ 44 × 44 px; placed cards leave the tray. Reduced motion: no sway, nudge or glow; the model is a solid outline.

**Hints as built.** Round start: Hoot's concept line per skill. First miss: Hoot's line keyed by the wrong pick's tag (16 lines), the pick greys out, and the proof shows a strategy note (stage 1 only, so stage 2 has less to read): relation key for connectives, the tag's rule for combining and voice, the literal reading for rewrites, the candidates for pronouns, a cut reason, the writer's feeling, the definitions of the three offered devices, doer and thing, the claim lit in articles, label meanings on the stamps. Second miss: Sarah's "Let's work through it together" and the worked steps one by one; the answer is marked (`is-model`) and the editor completes it (labelling: all but the last sentence are labelled by the model).

**Deviations from the proposal.**
- *Helper voice:* Hoot speaks every round-start and first-miss line (the runner has one helper); Sarah reads prompts, models and praises. The proposal gave some round-start lines to Sarah.
- *L0 distractors:* "and" is never offered, because it is always grammatical and true, so it would be a second defensible answer. The "and" chain misconception is covered by run-ons in L1.
- *L1 clause cards:* each item has 4 cards plus one wrong-connective card, so the editor chooses the connective and the order. With 3 cards the capital and the period alone would fix the order.
- *Pairs and review at L8–L9 (revised after the QA review):* a labelling item right after an evidence question on the same article gave away two or three labels, so every level-8 item now reads its own article. At L9, items 2+3 and 6+7 share an article with different question types: "tap the sentence that doesn't support the claim", then the evidence question as level-8 review (index % 4 = 3), which the first answer barely narrows. Pairs are best effort in play order (the round can step difficulty between them).
- *Evidence tapping* asks for "the 2 sentences that are evidence for the claim" (not "support"), so the reasoning sentence is not a second defensible answer.
- *Sufficiency* items include 5 "yes" answers (a full or large fair check), so "no" is never a safe guess; wrong options for those are tagged `too-strict`.
- *Connotation:* the slender/thin/skinny set is left out (body words); 9 groups instead of 6. *Figurative:* the overlap list is directed (`ALSO_FITS`: for lines of device X, the labels that could also fit).
- *Between-round lines* are generic ("Halfway through tonight's edition") instead of naming a page topic, because items in one round come from many topics.
- *Read-aloud (owner Q4):* the proof text is pre-rendered (sentences, notes, quotes, purposes, articles, claims, sufficiency questions); options are not read, as in Wordroot Grove.
- *Voluntary Hint button / `assisted`:* not built (needs ET-5), as in the other English worlds.
- *200 % text zoom on the phone* (§9.9) is not tested: the board sizes text with container units, so browser zoom halves the layout width; this needs a separate design pass.
- *Blocklist:* reuses Paper Boat Post's `blocklist.ts` (now three worlds use it; it should move to a shared module).

- *Site standards text:* the 20 CCSS codes and their wording, and the Writing Next claim, were verified against official sources by the independent content review on 2026-11-24 (Writing Next link: carnegie.org/publications/writing-next).

**After the independent reviews (2026-11-24).** QA (tests/unit/lantern-press.qa.test.ts, e2e/lantern-press.qa.spec.ts) and content: "drum" no longer offers *although* (a sensible contrast), and weak *although* distractors (tent, bins, jam) became *unless/because/until*; the modifier fixes for scarf, bell, loaf and cold move only the marked phrase (new sentences), so no other chunk is also "in the wrong place"; sorting uses only clear-cut groups (smell, young, old, small, unusual), the others appear only in context; connotation cues are stronger (debate, lighthouse, neighbor, pirate) and the hint quotes the cue; *rang out over the noise like a whistle* (no hidden metaphor); shift items now ask to keep every fact and offer a short doer-less passive, and strongest-evidence and sufficiency items have longer wrong options, so the right option is neither always shortest nor always longest (unit test: ≤ 60 % per mode); the Sundays article's reasoning follows from its evidence; skaters counted at 7:30, "pools away from the path", "Staff counts", "Sales records"; roles vary (the spelling bee and robotics items have new names, a man bakes the bread and jam and owns the café, a woman fixes the chain and the sign); changed facts (museum, map, decision, fair) have their own tag and hint instead of "check the connective"; "A describing phrase should sit next to the word it describes"; "had lost / had checked" on clause cards; the cousin fix names the cousin. Contrast: marked and right answers get a dark ring, crossed-out choices a solid background, example cards full opacity.

**Open.** Secondary ELA-teacher review of every item (one defensible answer, the tagged errors, connotation polarity, idioms, the irony and pun lines) and the review-gated argument articles (TEEN_TRACK §5); creative-director review of the newsroom art and the Editor's Pen; a human listening check of the clips; whether the English path goes live (all ages 3–14 now have a world).
