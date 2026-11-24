# Wordroot Grove (`wordroot-grove`)

English path, band C · ages 9–11 · host **Sarah**, helper **Gloop** · music `meadow` · prefix `wg.`
Status: **built (2026-11-24)**, pending independent review (game-design-review, qa-accessibility) and an ELA teacher. What was built and every deviation from this proposal: **§11** below. Path context: `docs/curriculum/ENGLISH_PATH.md` (skill map §2.3, hand-over §4). "Aligned with" CCSS L/RF codes verified on thecorestandards.org on 2026-11-23.

## 1. What it teaches

**Objective.** The child works out what unfamiliar words mean from their parts (prefixes, suffixes, Greek and Latin roots) and from clues in the surrounding sentences. They use suffixes and sentence position to tell nouns, verbs, adjectives and adverbs apart, and they choose correct apostrophes and commonly confused words in context.

| Level (0-based) | Skill id | Lm | Aligned with |
|---|---|---|---|
| L0 prefixes · L1 suffixes · L3 two affixes and root families | `english.vocab.affix` | 1 | L.2.4.B, L.3.4.B, L.3.4.C, RF.2.3.D · UK Y3–4 word reading (root words, prefixes, suffixes) |
| L2 word class | `english.grammar.word-class` | 2 | L.3.1.A, L.2.1.E |
| L4 Greek roots · L5 Latin roots | `english.vocab.roots` | 5 | L.4.4.B, L.5.4.B, L.6.4.B |
| L6 one-sentence clues · L7 multi-sentence, cause/effect and contrast clues | `english.vocab.context` | 7 | L.3.4.A, L.4.4.A, L.5.4.A |
| L8 apostrophes | `english.grammar.apostrophe` | 8 | L.2.2.C, L.3.2.D · UK Y3–4 (possessive apostrophe with plural nouns) |
| L9 confused words (plus mixed review) | `english.grammar.confused-words` | 9 | L.4.1.G |

**Why morphology and context together.** Word parts and context are the two strategies a reader has for an unknown word. The world teaches each one on its own (L0–L5, L6–L7), then mixes them through interleaved review: from L3 up, items with `index % 4 === 3` come from earlier levels (ENGLISH_PATH §3.2). Suffixes double as the bridge to grammar, because -ness, -ful, -ly and -en signal word class (L2).

## 2. Story

Wordroot Grove is a quiet wood on Monster Island where each tree grows from one word root. Its branches sprout prefixes and suffixes, and its leaves are whole words. Sarah keeps the Grove's Leaf Library, where islanders borrow words for their stories. Last night a gentle storm shook leaves loose and smudged their labels. Gloop, who can stretch into any shape, helps pull words apart into their parts and press them back together.

| Beat | Line (`wg.story.*`) | Scene |
|---|---|---|
| intro1 | "Welcome to Wordroot Grove. Every tree here grows words." | Sarah under a great tree; leaves show words |
| intro2 | "Roots hold the meaning. Branches add beginnings and endings." | the camera follows a root up to a leaf |
| intro3 | "Last night's storm shook leaves loose and smudged their labels." | leaves scattered on moss |
| intro4 | "Gloop and I need a word detective. Shall we start?" | Gloop stretches into a magnifying-glass shape |
| between2 | "Two leaves back on their branches." | |
| between4 | "Half the grove is labeled again." | |
| between6 | "Nearly done. Check every part of each word." | |
| outro1 | "The Leaf Library is open again!" | islanders borrow leaves |
| outro2 | "You took words apart and used each part's meaning." | |
| outro3 | "Here's your Root Reader badge." | |

The first visit adds `wg.story.handover`, where Sarah introduces Gloop. Every beat is skippable, and the story register is a little older than band B (fewer exclamation marks). **Reward:** the **Root Reader** badge, an oak leaf with a word root carved in its vein.

## 3. Levels and exercises

`roundLength` 8, `maxLevel` 9, `stepUpAfter` 2, `stepDownAtAttempts` 3. One tutorial at L0: "unlock", with a pointing hand on the meaning "open the lock".
Modes alternate by `index % 2`; review items replace `index % 4 === 3` from L3 up.

| L | Modes | Answer kind | Example | Distractor rule (misconception) |
|---|---|---|---|---|
| **0** Prefixes un-, re-, dis-, pre- | meaning of a word · build a word for a meaning | `choice` (3 meanings) · `sequence` (parts with 1–2 distractor parts) | **unlock** → *open the lock* · lock it again · lock it before. Build "paint again" → parts re · un · paint · pre → `re` `paint` | Distractor meanings apply a *different* prefix to the same base (the prefix-mix-up misconception). Build distractors are other prefixes. |
| **1** Suffixes -ful, -less, -er/-or, -able | meaning · build | `choice` · `sequence` | **fearless** → *without fear* · full of fear · a person who fears. Build "a person who teaches" → teach · er · ful · less → `teach` `er` | Distractors apply other suffixes (-ful vs -less is the classic swap). |
| **2** Word class | sort 4 words into noun / verb / adjective / adverb · choose the form that fits the sentence | `match` (4 items → 4 bins) · `choice` (3 forms) | Sort: kindness · brighten · hopeful · slowly. Choose: "Lena whispered ___ so the baby kept sleeping." → *softly* · soft · softness | Same base, different class. Advanced items include -ly **adjectives** (friendly, lovely, lonely) as a named trap ("-ly always means adverb"). |
| **3** Two affixes; root families | build from a meaning · meaning of a word related to a known root | `sequence` · `choice` | Build "not full of help" → un · help · ful · less · re → `un` `help` `ful`. Root family: "To *add* means to put together. Which is closest to *additional*?" → *extra, added on* · taken away · added up wrong | Build: a wrong-affix part. Root family: a meaning of a look-alike word. **Excluded:** words whose meaning depends on how the affixes attach (unlockable, undoable). |
| **4** Greek roots | match 4 roots to 4 meanings · meaning of a word from its roots | `match` · `choice` | Match: tele → far · micro → small · phon → sound · graph → write. Meaning: **microscope** → *a tool for looking at very small things* · a tool for hearing far sounds · a small drawing | Meaning distractors combine the right roots with the wrong meanings (the swap misconception). Match items never pair two roots with the same meaning. |
| **5** Latin roots | which word fits a meaning · a root in context | `choice` | "Which word means *able to be carried*?" → *portable* · visible · audible. "The volcano began to **erupt**. *Rupt* means break. What happened?" → *it burst out* · it went quiet · it grew taller | Distractors come from **other root families** with the same affix (-able), so the root is the skill. **No odd-one-out etymology items:** look-alike words are often related after all (e.g. sport and port), so they are avoided. |
| **6** Context clues, one sentence | meaning of an **invented** word · tap the clue (the prompt says how many) | `choice` · `set` (phrase chunks) | "Ana packed a **plorn**, a small bag for carrying a snack, before the hike." → *a snack bag* · a hiking boot · a map. Clue: tap *a small bag for carrying a snack* | Definition, restatement ("in other words"), synonym and example clues. Distractors fit the sentence's topic but not the clue (the "sounds plausible" misconception). |
| **7** Context across sentences | meaning · tap both clues | `choice` · `set` | "The cave was **glimber**. Omar couldn't see his own hand. He switched on his flashlight." → *very dark* · very cold · very wet. Contrast: "Unlike his **frosket** brother, who shouted all day, Kenji spoke softly." → *loud* | Cause/effect and contrast clues (L.5.4.A). A distractor picks the most *familiar* idea in the passage. |
| **8** Apostrophes | choose the correctly punctuated phrase for a picture or sentence | `choice` (3 versions) | Picture of one cat with three toys → *the cat's toys* · the cats' toys · the cats toys. "The bird fed ___ chicks." → *its* · it's · its' . "We bought six ___." → *apples* · apple's · apples' | Plural with apostrophe; singular vs plural possessive; it's/its; irregular plurals (children's) at the top. |
| **9** Confused words + mixed review | choose the word that fits | `choice` | "___ backpacks are on the bus." → *Their* · There · They're. "This box is heavier ___ that one." → *than* · then | There/their/they're, to/too/two, your/you're, its/it's, than/then. Every other item reviews L0–L8. |

### 3.1 Content banks
- **Morpheme table (generator data):** `{ word, parts[], gloss, class, spellingChange: boolean, distractorGlosses: { text, tag }[] }`. Glosses are **authored per word**, not produced by a template, so the English stays natural. Distractor glosses may be produced from affix templates ("{base} again", "without {base}") but must be reviewed, because generated glosses can be ungrammatical.
  - Prefix words: unlock, unpack, untie, unsafe, unkind, unfair, refill, reread, repaint, retell, rebuild, reheat, dislike, disagree, disobey, dishonest, preheat, preview, prepay.
  - Suffix words: careful, careless, hopeful, hopeless, helpful, helpless, fearless, harmless, restful, thankful, teacher, painter, farmer, builder, singer, sailor, actor, visitor, washable, readable, breakable, drinkable.
  - Word-class words: kindness, darkness, softness, fairness, brighten, soften, darken, softly, quickly, kindly, loudly, slowly, payment, movement, agreement, enjoyment; traps friendly, lovely, lonely.
  - **Build items use only words with `spellingChange: false`** (no happy → happiness, hope → hoping). Words with spelling changes may appear in meaning items.
- **Roots:** Greek tele far · graph write · phon sound · photo light · micro small · scope look at · auto self · bio life · meter measure · therm heat · geo earth · hydr water. Latin port carry · rupt break · struct build · spect look · dict say · aud hear · vis see · ject throw · tract pull · scrib/script write. Example words: telephone, telescope, photograph, autograph, microphone, microscope, biography, thermometer, geography; transport, portable, export, erupt, interrupt, construct, structure, inspect, spectator, predict, dictionary, audience, audible, visible, vision, eject, project, tractor, subtract, describe, script. A teacher checks every root meaning against a standard dictionary's etymology before release.
- **Invented words (L6–L7):** examples glimber, plorn, tamble, frosket, vindle, morrick. Rules: not in a real-word list; not one letter away from a common word (no "mirrow"); blocklist-checked; manually reviewed for rude readings in common languages (`english.md` §6).
- **Passages:** an authored bank of ≥ 24 items per level for L6–L9 and ≥ 16 per mode for L0–L5 beyond what the generator produces. L6 items are 1 sentence of ≤ 20 words; L7 items are 2–3 sentences, ≤ 45 words. Topics are everyday and gentle (hikes, cooking, pets, weather, sport, school clubs). Names come from the ENGLISH_PATH §6.4 list.
- **US English:** flashlight not torch, sidewalk not pavement. No -our/-or or -ise/-ize words where spelling is checked.

### 3.2 Correct-answer validation and accepted alternatives
- `choice`: exactly one correct option. Every distractor carries a misconception tag, and a reviewer confirms that no distractor is also an acceptable meaning. Meaning options are short paraphrases, and the *idea* is what is tested. Where two phrasings would both be acceptable, only one is ever offered.
- `sequence` (word build): exact part order. Affix order is fixed by the word itself, so alternatives can't arise.
- `match`: every item to its bin. A word whose class depends on use (e.g. "fast" as adjective or adverb) is **never** used in sort items without a sentence.
- `set` (clue tapping): the prompt states the number of clues ("Tap the clue." / "Tap both clues."). Options are pre-chunked phrases (3–6 per passage), and the correct set equals the authored clue chunks. Engine `parts` mark each tapped chunk right or wrong.
- Singular "they" is never marked wrong. Items whose correctness is disputed by usage guides are excluded (ENGLISH_PATH R4).

## 4. Hint ladder (never punishing; a voluntary Hint button records `assisted`)

| Step | Morphology (L0–L5) | Word class (L2) | Context (L6–L7) | Apostrophes / confused words (L8–L9) |
|---|---|---|---|---|
| Round start | Gloop: "Big words are made of smaller parts. Find the parts first." | "A word's job tells you its class." | "The words around a mystery word often explain it." | "Ask: who owns it? Or is it two words squeezed together?" |
| 1st miss | Wrong option greys out. Gloop stretches the word into parts, and each part shows a meaning card (`un` = not / undo · `help` · `ful` = full of). | Wrong bin marked. A clue card: "-ness often makes a noun. Does it name a thing?" | The sentence that holds the clue is highlighted and the clue type is named: "*Unlike* signals an opposite." | Tag-specific strategy: "Try *they are* in the gap. Does it still make sense?" · "One owner or more than one?" |
| 2nd miss (model) | A worked chain appears: `un + help + ful → not + full of help → not helpful`. The correct option pulses and the child taps it. | Frame test: the word is slotted into "The ___ is here" / "I can ___" / "a ___ day" / "She sang ___", the fitting frame lights, and the child places the card. | The clue chunk is underlined and one reasoning line shown: "Unlike + shouted all day → the opposite of quiet → loud." The child taps the answer. | Owner icons (one cat or several) beside the rule "cat's / cats'", or the substitution shown. The child taps the answer. |

## 5. Feedback lines (process praise)
`wg.praise.1` "You split the word into parts and used each meaning." · `wg.praise.2` "You checked the word's job in the sentence." · `wg.praise.3` "You found the clue in the next sentence." · `wg.praise.4` "You noticed 'unlike' and flipped the meaning." · `wg.praise.5` "You counted the owners before placing the apostrophe." · `wg.praise.6` "You tested it with 'they are'. Good checking." · `wg.retry.1` "Not yet. Let's look at the parts." · `wg.retry.2` "Close. Check the clue again."

## 6. Voice lines (prefix `wg.`; captioned; text-led with voice on demand)
- **Pre-rendered:** about 14 prompts ("What does this word mean?", "Build a word that means…", "Sort the words by their job.", "Tap the clue.", "Tap both clues.", "Which one fits?"…), about 12 hints, 8 praise and retry lines, 6 helper lines, 11 story lines, and **part-meaning cards** `wg.part.<morpheme>` (≈ 45: "un means not, or undo"). Estimate ≈ 95 ids and ≈ 95 clips.
- **Item text** (words, glosses, passages; ≈ 400 strings): read aloud on demand. Whether these are pre-rendered from the bank by a build step or read by the speech-synthesis fallback is owner question Q4. The game is fully playable without audio either way.
- Invented words: read-aloud spells them out letter by letter as well as attempting a pronunciation, because TTS is unreliable on non-words (ENGLISH_PATH R3).

## 7. Boards and accessibility
- `choice` / `sequence`: the default `OptionBoard` / `SequenceBoard`, skinned as leaves on branches. **No new board for L0, L1, L3, L5, L8, L9.**
- `match` (L2 sort, L4 root matching): `SortBoard` (ENGLISH_PATH D3). Tap a card, then a bin; keyboard: Enter on a card, arrow keys to a bin, Enter; every bin is a labelled `<button>`.
- `set` (L6–L7 clue tapping): **`PassageBoard` (new; ENGLISH_PATH D2).** The passage renders as running text whose chunks are toggle buttons (`aria-pressed`), with a Done button. Line-wrapped, scalable to 200 %, focus order follows the reading order. Fallback if PassageBoard isn't ready: the default `OptionBoard` lists the chunks as separate buttons under the passage (less natural, same answer data).
- Targets ≥ 44 px (≥ 64 px for under-7s doesn't apply). Text 18 px minimum, line length ≤ 70 characters.
- Reduced motion: Gloop's stretch becomes a fade-split of the word; no falling-leaf particles.
- No timers; unlimited retries.

## 8. Content safety
- All sentences, passages and glosses are original. No dictionary definitions are copied (glosses are written in our own words), and no textbook items are reused.
- Invented-word checks (§3.1); shared blocklist over every string.
- Names are culturally varied, first names only. Scenes avoid stereotypes (who cooks, who fixes, who plays sport varies). No frightening, violent or brand content.

## 9. Automated tests (`tests/unit/wordroot-grove.test.ts`, `e2e/wordroot-grove.spec.ts`)
1. Levels 0–9 × 50 seeds: lint, declared skill, exactly one correct option or order, every distractor tagged.
2. Determinism; no repeated target in a round; ≥ 8 distinct items per level per mode (bank sizes ≥ 16 per level).
3. Build items use only `spellingChange: false` words, and their parts concatenate exactly to the word.
4. Ambiguous-attachment exclusion list (unlockable, undoable…) is never generated.
5. Roots: no `match` item pairs two roots that share a meaning (spect and vis); every root's meaning comes from the reviewed table.
6. Invented words: not in the real-word list, not within edit distance 1 of a word in the top 10,000 English words, not on the blocklist.
7. Set items: the prompt's stated count equals `correct.length`; chunks concatenate back to the passage.
8. Word-class sort never uses a word marked `classByUse: true`.
9. Interleave: from L3, `index % 4 === 3` items have an earlier skill id and that level's parameters.
10. Readability caps: L6 ≤ 20 words; L7 ≤ 45 words.
11. E2E (no drag, keyboard path): full round, voluntary Hint marks the item assisted (once ET-5 exists), first miss (parts split), second miss (worked chain), badge; no overflow at the four viewports.

## 10. Evidence and assumptions
- **Morphology instruction:** Bowers, Kirby & Deacon (2010, *RER* 80(2)) found benefits for reading, spelling and vocabulary across preschool–grade 8, particularly for less able readers, and more so when combined with other literacy instruction. Goodwin & Ahn (2013, *SSR* 17(4), 257–285) found an overall d = 0.32, with moderate effects on vocabulary (0.34), decoding (0.59) and spelling (0.30), but **no significant effect on comprehension or fluency**, and smaller effects on standardised measures. We therefore expect, at most, word-level gains, and claim none.
- **Context clues:** Fukkink & de Glopper (1998, *RER* 68(4), 450–469) report a mean effect of 0.43 SD for teaching students to derive word meanings from context, with clue instruction ahead of other approaches. Kuhn & Stahl (1998) found practice alone did about as well as strategy instruction. Hence both elements: the hint names the clue type, and the bank provides a lot of varied practice.
- **Explicit vocabulary instruction:** rated strong evidence in the WWC adolescent literacy guide (Kamil et al. 2008).
- **Grammar framing:** *Writing Next* (Graham & Perin 2007) found traditional grammar instruction had a small negative effect on writing quality. Word class (L2) is therefore taught through a word's *job in a sentence* and its suffix, on one level only, and apostrophes and confused words are always chosen in context, never drilled as isolated labels. Whether this transfers to children's own writing is an **assumption**.
- **Assumptions:** the level order; invented words as the best way to isolate context use (they stop prior vocabulary from answering the item, but they may feel artificial); 2-in-8 interleaving. BrainZippy itself has not been studied. Full references: ENGLISH_PATH §7.

## 11. As built (2026-11-24)

**Files.** `src/games/wordroot-grove/`: `morphology.ts` (L0–L3 banks: 19 prefix words, 22 suffix words, 33 word-class words incl. 3 -ly-adjective traps and 3 `classByUse` words, 22 fit sentences, 16 two-affix words, 18 root-family items, affix meanings, build-decoy table, `AMBIGUOUS` list), `roots.ts` (22 roots, 18 Greek words, 20 "which word means" and 18 root-in-context items), `passages.ts` (24 one-sentence + 24 multi-sentence passages, pre-chunked, 48 invented words), `grammar.ts` (8 owner pictures × one/many, 16 apostrophe sentences, 26 confused-word sentences), `logic.ts` (modes, bank lookups, segments, part cards, worked chains, misconception tags), `generator.ts`, `hints.ts`, `Board.tsx` + `wordroot-grove.css` (GroveBoard), `art.tsx` (grove scene, leaves, owner pictures composed from Paper Boat Post's picture bank, Root Reader badge), `story.tsx`, `WordrootGrove.tsx`, `definition.ts`, `voice-lines.ts` (source of `voice.json`) and `voice.json` (410 lines, 485 clips, speakers sarah / gloop / narrator). Pack `src/content/packs/english-wordroot-grove`. Tests `tests/unit/wordroot-grove.test.ts`, `e2e/wordroot-grove.spec.ts`. Site: `src/site/content/games.ts` (page copy), `curriculum.ts` (six skills; CCSS L codes, which now cite the ELA standards), `public/og/games|shots/wordroot-grove.*`.

**Levels as built** (modes by `index % 2`; review items at index 3 and 7 from L3, and every odd index at L9, come from an earlier level with that level's skill, in either of its modes):

| L | Even index | Odd index |
|---|---|---|
| 0 | meaning of a prefix word (3 meanings) | build it from parts (base + prefix + 2 decoy prefixes) |
| 1 | meaning of a suffix word | build it (decoys never share the suffix's meaning: no -er beside -or) |
| 2 | sort 4 words onto noun/verb/adjective/adverb branches (from slot 2 the adjective is an -ly trap) | choose the form that fits a sentence (adverb gaps before the verb, so flat adverbs can't be a second answer) |
| 3 | build a two-affix word (3 parts + 2 decoys) | root family: a known word → the related word's meaning |
| 4 | match 4 Greek roots to 4 meanings (roots in blocks, so two items in a band never get the same set) | meaning of a word from its roots |
| 5 | which word means … (distractors from other root families) | a root in context |
| 6 | meaning of an invented word (one sentence) | tap the clue |
| 7 | meaning (2–3 sentences: cause, contrast, multi) | tap both clues |
| 8 | owner picture: one owner or three → the cat's / cats' / cats | apostrophe in a sentence (its/it's, plain plurals, irregular plurals, contractions) |
| 9 | confused words (there/their/they're, to/too/two, your/you're, its/it's, than/then) | review from L0–L8 |

**Board.** One world-local `GroveBoard` serves every mode: a big leaf on top (word, meaning + branch slots, sentence with a gap, passage, picture) and leaves, tiles, branches or a Grow button below; on wide boards the leaf sits left of the answers, sorting stays a column with four branches in a row. Every move works by tap (choices, tiles, chunks; tap-tap card → branch for sorting), drag (answer leaf onto the big leaf, tile onto a slot, card onto a branch) and keyboard (Enter/Space; focus moves to the next free tile or Grow, to the first branch after picking a card, to the first live answer after a miss; Backspace takes the last part back). Clue chunks are toggle buttons (`aria-pressed`) laid out as inline blocks ≥ 44 px tall. The speaker on the leaf reads its text aloud (voice on demand); passages are followed by the invented word spelled letter by letter.

**Hints as built.** Round start: Gloop's concept line per mode. First miss: Gloop's line keyed by the misconception (prefix/suffix/base-only, the first wrongly sorted card's class or the -ly trap, the gap's class, the clue type, owners/its/they-are tests), the engine greys the pick, and the board shows a strategy: the word stretched into parts with meaning cards (tap to hear `wg.part.*`), tile meanings, endings under each branch, the known root highlighted, each option's Latin root and meaning, the clue chunks lit + the clue type named (meaning items only; tapping items name the type without lighting the answer), owner icons with the 's / s' rule, or a test card. Second miss: Sarah's "Let's work it out together" + the worked chain, one step per runner count-along step (e.g. `un + lock → not, or undo + lock → unlock: open the lock`); sorting shows each word in its class frame; the right answer glows and the child completes it.

**Deviations from the proposal.**
- *Invented words:* the proposal's examples glimber, plorn, tamble, frosket and vindle fail the spec's own check (plorn is one letter from a rude word; the others are one letter from climber/glimmer, table/tumble, frisket, kindle). All 48 words were chosen with that check, which the unit test runs against hunspell en_US (base forms + regular inflections, a superset of the top 10,000 words) where the dictionary is installed; it is skipped on machines without it, while the blocklist and bank checks always run. "spicy" contains a blocklisted substring and was replaced ("hot and peppery", "very salty").
- *Read-aloud (owner Q4):* item text is pre-rendered (words, sentences, passages, spellings), not left to speech synthesis. Answer options are **not** read aloud: for apostrophe and confused-word items they sound identical, and per-option clips would roughly double the catalogue. Prompts and hints are always spoken.
- *Voluntary Hint button / `assisted`:* not built (needs ET-5), as in Paper Boat Post.
- *Boards:* no shared `PassageBoard`/`SortBoard` in `src/game`; both live in `GroveBoard` (ENGLISH_PATH D2/D3 say world-local first).
- *Story:* one cinematic beat + a Sarah/Gloop DialogueScene; on the first visit Sarah introduces Gloop (`wg.dlg.handover.*`) instead of a separate `wg.story.handover` narrator line. Between-round lines are `wg.mid.1–3`; the badge line is spoken in the outro conversation.
- *Banks:* L4 has 18 Greek words and L5 20 + 18 Latin items (≥ 16 each); L8 has 16 owner-picture variants + 16 sentences. Content is shared between the two modes of a level by quarters (meaning slot k ↔ build slot k + 2), so a band never repeats an item.
- *Blocklist:* reuses Paper Boat Post's `blocklist.ts` (imported); it should move to a shared module now that two worlds use it.
- *Standards text* for L.2.2.C, L.3.1.A, L.3.2.D, L.3.4.B, L.4.1.G, L.4.4.A, L.4.4.B on the public site was written from the published wording but could not be re-checked online from this machine; verify before release.

**After the independent reviews (2026-11-24).** Content: the family read-aloud says "Child means a young person" (not "To child…"); microphone → microbe (micro + "be" from bio); describe = write *down*; "Every ___ in the dance" offers *moved*, not the noun *move*; "two birds' wings" replaces "nests" (bird's nest is a compound); level-6 passages end in neutral setting so only one chunk is a clue; "which means" items are restatement clues; holtip, rozzick (was grevin), pentrop, klendor reworded; "Jonah is quiet" replaces a trope-adjacent line; invented words that resemble names or brands (sprock, fennick, ravvle, quosset, splott, grevin) → wobrin, stelvin, pruvel, whindop, tirrow, rozzick, and a proper-noun/brand list is now part of the collision test; frames "I noticed the ___." / "It is very ___."; comma splice and "cannot" fixed; its-praise mapping corrected. Board: the model state is in the aria-labels (", the answer", ", a clue", "goes on the … branch") and the worked chain is a polite live region; the sort model places all cards but the last, which the child places; contrast and an 18 px minimum for every hint label; tall boards spread out (gap, wider leaf, taller answers). Site: L.3.4.C, L.2.1.E, L.5.4.A, L.5.4.B added; the English subject page covers 3–11; the why-text cites Kamil et al. 2008 (grades 4–12) instead of Foorman 2016; the OG card names Greek and Latin roots.

**Open.** ELA-teacher review of every gloss, root meaning (against a dictionary etymology), passage and distractor; creative-director review of the grove art and badge; human listening check of the 485 clips (TTS on invented words and on "ful", "less" in part cards); whether options should get clips after all.
