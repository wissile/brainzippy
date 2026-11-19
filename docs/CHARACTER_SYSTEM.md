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

## Rive migration (planned)
Keep the `MascotState` contract (`src/engine/types.ts`). Replace `Bobbo.tsx` internals with a Rive state machine whose inputs match the states; keep the SVG as the reduced-motion/fallback.
