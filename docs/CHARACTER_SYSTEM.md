# Character System — the Critter Crew

Source: the owner's character sketch sheet and cards (project files: Bobbo, Zuzu, Gloop, Hoot, Rumble, Puff, pose roughs). Implemented as SVG components in `src/characters/`.

## Shared shape kit
- **Round and chunky**: pears, beans, blobs, eggs. No sharp corners or skinny limbs.
- **Big friendly eyes** sit high and wide with a white shine; pink cheeks below.
- **One signature thing** readable at thumbnail size.
- 5–5.5 px ink outline (#2B2140) at 200-unit viewBox; soft white highlight stroke on the upper-left.

## Cast
| # | Name | Type | Subject buddy | Colour | Signature | Personality / voice direction |
|---|---|---|---|---|---|---|
| 01 | **Bobbo** | monster | Counting | #FF9F43 | wings too tiny to fly, 3 horns, freckles, fang grin | pear-shaped worrier who double-checks everything (bio only — gameplay lines never say "count twice", D-013); warm, eager, slightly breathless; flaps wings hard when excited |
| 02 | Zuzu | monster | Spelling | #8E6CEF | three eyes ("typo eye") + pencil | tall, floppy, a little dramatic; ears droop at a misspelling |
| 03 | Gloop | monster | Shapes | #2EC4B6 | one giant curious eye; idea bubbles | wobbly jelly that squishes into shapes; curious, playful |
| 04 | Hoot | animal | Reading | #6BCB77 | big reading specs, leaf tufts | mossy owl storyteller; funny voices |
| 05 | Rumble | animal | Measuring | #4D96FF | soft yellow star horn, sleepy lids | gentle, slow, sleepy; measures in naps |
| 06 | Puff | monster | Times tables | #FF8FB1 | cloud head, 5 wiggly arms | drifts in when sums get tricky; counts in fives; leaves sparkles |

Milestone 1 animates **Bobbo** fully; the others appear on menus with idle motion (Puff's arms wiggle).

## Bobbo state set (implemented)
| State | When | Body | Face |
|---|---|---|---|
| idle | waiting for the child | slow breathe 2.8 s, wing flick every ~6 s, random blink 2.4–5 s | fang grin |
| greeting | intro, home | hop + right-arm wave, wings flap | big laugh |
| talking | while any line is spoken/captioned | state pose + mouth alternates every 150 ms | o / grin |
| encouraging | prompt, after a hint | gentle nod, arm raised | grin |
| thinking | "How many?" question | tilt −4°, pupils up-left, hand to chin | little o |
| celebrating | correct answer, round end | squash-and-stretch jump 0.75 s, wings flap 0.09 s (never takes off), arms up | big laugh |
| retry | wrong answer | soft sway, pupils down, wings droop — never shakes | wobble mouth |
| reduced motion | `prefers-reduced-motion` | no loops; pose + face only | per state |

## Rules for new characters
Same outline weight and eye construction; silhouette test at 48 px; each needs the 7 states above; voice identity brief before recording; no resemblance to existing commercial characters (creative-director sign-off).

## Library hosts (implemented, D-028)
One recurring host per subject library (concepts: `docs/curriculum/CHARACTERS.md`). SVG components in `src/characters/library/<Name>.tsx`, all exported from `src/characters/library/index.ts` as `LIBRARY_HOSTS` (id → component). The content pack `src/content/packs/library-hosts` declares the same ids, so worlds can list them in `World.characters`; `src/daily/critters.tsx` draws them on the map and cards.

- **Same API as Bobbo:** `state: MascotState`, `talking`, `size` (number → height = 1.15 × size, or a CSS string), `className`. `role="img"` + an `aria-label` that starts with the name, plus `data-character="<id>"`.
- **Same build:** the shared kit (`kit.tsx`) gives Bobbo's eye (white ball, ink pupil, shine), his mouth set (smile / laugh / o / wobble, plus a sleepy mouth), the random blink, and the 150 ms mouth flap while talking. Asleep, the eyes become closed lid lines. Each host has a 5–5.5 outline, pink cheeks, a white highlight stroke on the upper left and one signature thing.
- **Motion:** the shared state motion (`characters.css`) plus each host's signature motion (`library-characters.css`). Reduced motion stops every loop and holds a readable pose per state (raised arm, perked ears, popped hat, lit bulb).
- **Checks:** `node scripts/screenshot-characters.mjs` (inside `flock /tmp/bz-e2e.lock`) renders every host in every state at 64 and 240 px, the whole cast side by side, and a 48 px silhouette sheet, saved to `/home/claude/review/characters/`. `tests/unit/library-characters.test.tsx` renders all states and checks the accessible names and registry ids.

| Host | Library | Colour | Silhouette (one line) | Personality | Voice notes (Bella-voiced lines) |
|---|---|---|---|---|---|
| **Toggle** (was "Loopi") | Computer science `cs` | lime #A8D83F, sparkle bulb | a big squircle head on a staircase of three rounded command blocks, with an antenna bulb on top | cheerful, literal-minded, methodical; does exactly what the cards say and finds bugs funny, never frustrating | bright, crisp, a bouncy rhythm. Short sentences in step order ("First… then…"). A happy "beep!" now and then as a tic, never robot speech. Treats a mistake as a puzzle: "Ooh, a bug! Let's find it." |
| **Zephy** | Pilot ground school `pilot` | cream #FFF1D0, signal-red scarf #E5484D, grey wing tips | a fluffy egg with stubby wings held out like a little plane, goggles up top, a scarf streaming to one side | brave dreamer and careful planner; loves checklists ("check it twice, fly it once" is her bio motto only, not a gameplay line) | warm, steady, confident, like a calm instructor. Even pace; stays calm in tricky moments. Uses "Let's check…" and plain flight words, each explained the first time. |
| **Budge** | Money `money` | golden mustard #E9A93B, cream face stripe, brown mask bands | a gumdrop badger with round ears and a satchel slung across her, its rolled-up list peeking out | practical, encouraging planner; loves lists and saving for a big dream (a telescope) | friendly, clear, unhurried; never salesy and never says "buy". Says amounts slowly ("three dollars and fifty cents") and praises the plan, not the money. |
| **Fenn** | Digital safety `cyber` | indigo #4F5BD5, lavender ears | a round ball under two huge, wide-splayed fennec ears, with a gold monocle ring over one eye | sharp-eared, calm and kind; never scary or suspicious of the child; celebrates "telling a grown-up" as a detective move | quick, curious, reassuring. Drops slightly quieter for "look closer…" moments, but never spooky or whispery. No fear words. "Good detective work!" for asking an adult. |
| **Dabble** | Science `sci` | coral #FF6B6B, peach belly, coral-pink crest | a short egg topped by a scalloped frill crest, with a wide one-piece visor and a spiral tail curling out | endlessly curious, a little messy; always asks "what if we test it?"; treats surprises as data | enthusiastic and clear; slows down for explanations. Asks a question before she gives an answer ("What do you think will happen?"). A surprise is "Ooh, interesting!", never "wrong". |
| **Yonder** (was "Pico") | Geography and cultures `geo` | warm brown #A8714A, ocean #4FA3E3 + land #8CCB5E globe | a crab body peeking from a big sticker-covered globe shell, with two eyes on stalks and round claws at the sides | adventurous homebody who loves pen pals and asking people about their lives; respectful and curious | friendly and wondering. Says place names carefully (every name gets a recorded pronunciation check). Talks about people with respect, with no stereotypes and no "weird". "I wonder what it's like to live there!" |
| **Snug** | Social and emotional `sel` | soft peach #FFBE98, plum #7A3E6B nose and ear insides | a low, wide loaf with big soft rounded ears and a pouch of calm stones at the front | gentle, patient, a good listener; names feelings without judging; laughs easily. **Her colour never changes with emotion** | soft, warm, slow, with pauses. Never sing-song about sad feelings. Names a feeling, then normalises it ("It's OK to feel cross. Let's take a slow breath together."). |
| **Brix** | Engineering `engr` | steel navy #34557A, hard hat #FFD43B, tan ruler tail | a round body under a domed hard hat with a flat brim, a ruler-marked paddle tail sticking out behind | builder who loves testing things until they break, then fixing them better; proud of improvements, not perfection | hearty, practical, encouraging. Loves "Let's test it!" and "What could make it stronger?" A broken build is "Now we know where to fix it!" |
| **Ripple** | Nature, oceans, environment `nature` | seafoam #8EE3C8, cream face, kelp-green hat | an egg-shaped otter sitting back in a band of waves, a kelp leaf draped over her head and feet poking up from the water | caring, observant, hopeful; loves noticing tiny things; turns worry into action | calm and bright, like a guide at an aquarium. Notices details ("Look at the tiny stripes!"). Hopeful framing: says what we can do and never uses doom words. |

### Host state notes
| Host | greeting | thinking | encouraging | celebrating | retry (never shakes) | sleeping |
|---|---|---|---|---|---|---|
| Toggle | arm wave, bulb lit, antenna wobble | bulb pulses slowly (1.8 s) | bulb lit | blocks ripple like a wave | blocks sit down in a neat row | bulb off |
| Zephy | wing salute + flap, tuft bounce | wing up to her goggles | wing half-raised | hop, wings flap, scarf flutters fast | wings fold down | wings folded |
| Budge | arm wave | hand to chin | nod, satchel swings | jump, list wiggles | scratches her head and smiles | — |
| Fenn | ears spring | ears swivel | monocle glints | ears spring up | ears lower gently and perk back up | ears folded flat |
| Dabble | arm wave | crest puffs up | nod | crest fans out, two sparkles | goggles fog, then clear | visor over closed eyes |
| Yonder | claw wave, globe turns slowly | eye stalks tilt | claw raised | globe spins, stickers twinkle | eyes duck and pop back up | stalks droop |
| Snug | arm wave | head tilt | offers a calm stone | gentle bounce (smaller than the others) | head tilt, kind smile | — |
| Brix | hat tip | tail lifts to measure | nod | hard hat pops up | taps the weak part and nods | — |
| Ripple | bobbing hop | looks up with a tilt | kelp sways | twirls in the water, bubbles rise | floats, thinks, smiles | slow float |

Similarity notes: Zephy has twin round brass goggles pushed up, and Dabble has a single clear visor worn over her eyes, so they never share a goggle shape. Snug's ears are soft and rounded and sit on the sides of a wide loaf; she is not a mouse or a koala. Brix uses yellow with navy, never yellow with black (the tool-brand look). Ripple's seafoam is lighter and greener than Gloop's teal, and her water band separates them in silhouette. The names still need a formal trademark search before launch.

## Path hosts: Ziggy and Sarah (drawn, awaiting owner approval)
The owner named two new hosts for the learning paths "Learn to fly with Ziggy" (replaces Zephy as pilot host) and "Learn English with Sarah" (replaces Hoot as English host). Zephy and Hoot stay in the cast unchanged. Both new hosts use the library kit (`kit.tsx`: 200×230 viewBox, ground shadow at y 218, 5–5.5 ink outline, Bobbo's eye and mouth set, random blink, 150 ms mouth flap while `talking`) and are registered in `LIBRARY_HOSTS` and `packs/library-hosts`. They are **not yet wired** as the host of any library; the integrator swaps `library-pilot` / `library-english` after approval.

### Ziggy — Pilot path (ages 6–14) · `src/characters/library/Ziggy.tsx`
- **Species:** capybara. Chosen because capybaras are famously unflappable (the calm-under-pressure pilot), they are well liked from age 6 into the early teens, and no famous cartoon pilot is a capybara. Deliberately **not** a dog, bear cub, raccoon, flying squirrel, mouse, elephant or bird (all have famous pilot or flier characters, and Zephy is already a bird).
- **Silhouette:** a tall, chunky barrel with a flat, boxy top; a big blunt snout; two small round ears; a headband arcing over the head with two round ear cups bulging out at the sides; a thin mast with a little striped windsock flying off to the right. At 48 px it reads as "a barrel with headphones and a flag".
- **Palette:** fur cinnamon #C7774E, feet and inner ears #9C5634, snout sand #F2C9A5, headset cups sky blue #4FB3E8, band and kneeboard charcoal #4A4F63, windsock safety orange #FF7A2F with white, wings pin and mast cap gold #FFD43B (`--sparkle`). The cinnamon is warmer and redder than Yonder's brown (and Yonder reads as his blue-green globe); the blue appears only on small accents.
- **Proportions:** body 132 wide × 156 tall (wider and boxier than Zephy's egg); eyes r 16 at y 96; the snout covers the lower third of the face; legs are just feet.
- **Signature thing:** the windsock on his headset ("so I always know which way the wind is blowing"). Supporting kit: boom mic, kneeboard checklist with two ticks, gold wings pin. Modern pilot on purpose, with no goggles, scarf or leather helmet, so he never looks like Zephy's vintage flying gear or a classic cartoon aviator.
- **Personality:** calm, methodical, warmly curious. Loves checklists, clouds, wind and maps; treats every surprise like weather, something to read and plan around. Unflappable but never cold; he enjoys the view.
- **Catchphrase style:** short, steady, radio-tidy sentences. "Let's run the checklist." "Wind check: from the left." "Steady hands. Let's look again." A mistake is "a bit of turbulence", never a failure. Flight words are explained the first time (same rule as Zephy). Bio-only motto (not a gameplay line): "Calm air or bumpy air, we fly it the same way: one step at a time."
- **Motion:** slow and economical. The body uses the shared state motion; his windsock carries the mood: gentle flutter at idle (2.4 s), brisk in greeting (0.9 s), a fast tailwind when celebrating (0.4 s), slow side-to-side "wind check" while thinking (2.6 s), and limp (calm air) on retry and asleep.

| State | Ziggy |
|---|---|
| idle | breathes, blinks; windsock flutters gently |
| greeting | hop and arm wave; windsock streams; big laugh |
| talking | state pose + mouth flap; the boom mic sits just beside his mouth |
| thinking | tilt, eyes up, arm up; windsock swings slowly as he checks the wind |
| encouraging | nod, arm half raised |
| celebrating | jump, both arms up, windsock in a brisk tailwind |
| retry (never shakes) | soft sway, eyes down, windsock goes limp: "calm air, let's try again" |
| sleeping | closed lids, windsock limp |
| reduced motion | no loops: windsock held streaming (greeting/celebrating), angled (thinking) or limp (retry/sleeping) |

**Voice notes for the audio designer (Ziggy):** feels like a friendly older teen or young adult (about 18–25), male-leaning but gentle. Medium-low pitch, never gruff. Energy: calm and warm, a smile in the voice, a notch less bouncy than Bobbo. Pace: steady and unhurried, clean pauses between steps, like reading a checklist over the radio. Brightens on discoveries about weather and maps. Accent: neutral, clear English. No radio-static effects on the voice itself, no "captain announcement" parody, and no imitation of any real pilot, actor or performer.

### Sarah — English path (ages 3–14) · `src/characters/library/Sarah.tsx`
- **Species:** porcupine. Chosen for the wordplay (a porcupine who writes with a quill), a silhouette nobody else in the cast has, and because a round, soft-quilled critter is cuddly for a 3-year-old while the pun-loving writer personality suits a 13-year-old. Deliberately **not** an owl (Hoot), duck (the "Sarah & Duck" show), mouse, rabbit, bear, cat, pig, elephant, octopus or caterpillar (all strongly tied to famous picture books or reading characters). Not a hedgehog-style racer either: no swept-back spikes, no shoes, not blue.
- **Silhouette:** a round egg body in front of a fan of seven soft, round-tipped quills (deep berry with blush tips), small round ears at the sides, one long cream quill pen poking out behind her right ear, and an open book held at her middle. At 48 px it reads as "a round critter with a spiky crown holding a book".
- **Palette:** body berry #D2558A, quills deep berry #9C3168, quill tips blush #FFD9E6, face cream #FFEBDD, quill pen cream #FFF6DA (`--cream`) with berry bands and an ink nib, book cover teal #33A99E, book picture sun #FFD43B (`--sparkle`). Berry is darker and more magenta than Puff's pink, redder than Zuzu's violet and pinker than Dabble's coral; the berry and teal pairing belongs to no one else.
- **Proportions:** body 120 wide × 142 tall; the quill fan adds about 30 above and 15 each side. Eyes r 16 at y 122 sit inside a heart-shaped face mask; the book covers the lower body.
- **Signature thing:** the quill crown, plus the quill pen behind her ear. Supporting prop: the open picture book, held towards the child as at story time. Its pages show a sun, a hill and squiggle lines, never real words. No glasses (Hoot's signature) and no bow.
- **Personality:** a word-lover and storyteller. Delighted by sounds, rhymes, funny words and a good ending. For the youngest she is a playful story-time friend who claps out rhythms and loves silly rhymes; for older children she is the witty older-sister type who swaps book recommendations, collects favourite words, notices clever sentences and cannot resist a pun. She never shows off her vocabulary; she shares it.
- **Catchphrase style:** warm and playful, scaled to the age band. Ages 3–5: "Ooh, listen: cat, hat! They rhyme!" Ages 6–8: "Let's sound it out together." Ages 9–14: "Great word choice. Can we make that sentence even stronger?" A wrong answer is "Nearly! Let's listen to it again." Bio-only motto: "Every word is a tiny story."
- **Motion:** bouncy but soft. Her quills fluff up when she is happy and smooth down when she is being gentle; her page turns now and then even at idle (every 8 s) because she is always reading.

| State | Sarah |
|---|---|
| idle | breathes, blinks; a page of her book turns every 8 s |
| greeting | hop, waves her free arm (still holding the book), quills fluff |
| talking | state pose + mouth flap |
| thinking | taps her cheek, eyes up, quills tilt, quill pen lifts a little |
| encouraging | nod, tilts the book towards the child |
| celebrating | jump, free arm up, quills fan out, pages flip quickly |
| retry (never shakes) | soft sway, quills smooth down, book lowers a little, kind smile |
| sleeping | closed lids, quills settled, book drooping |
| reduced motion | no loops, no page turns: quills held fluffed (greeting) or fanned (celebrating), arm raised, book tilted per state |

**Voice notes for the audio designer (Sarah):** feels like a friendly older sister or young storyteller (about 16–24), female-leaning. Medium pitch, bright and warm. Energy: expressive and playful, with clear smiles and gentle drama in stories, but never shrill or babyish, so older children don't feel talked down to. Pace: slower and very clear for phonics and rhymes (crisp consonants, sounds said cleanly as sounds, e.g. /k/ not "kuh"), conversational for older-child lines. Accent: neutral, clear English. Phonics clips must be checked against the curriculum's sound list. No imitation of any real narrator, actor or performer, and no character "funny voices" (those belong to Hoot).

## Rive migration (planned)
Keep the `MascotState` contract (`src/engine/types.ts`). Replace `Bobbo.tsx` internals with a Rive state machine whose inputs match the states; keep the SVG as the reduced-motion/fallback.
