# Yonder's Postcard Trip (`postcard-trip`)

Ages 5–9 · geography library (`geo`, "Postcard Port"), topics `geo.map` and `geo.world` · host **Yonder** (the spec's "Pico", renamed), helper **Zephy** (postcard pilot) · music `sky`.
Spec: `docs/curriculum/geography.md` §4. Code: `src/games/postcard-trip/`. Registry: `src/content/packs/library-geo/` (library now `live`).

## 1. Objective and skills
"Use compass directions, map keys and grids, and find continents and oceans on a world map." The child steers Yonder around Monster Island, then posts postcards, sails a boat and flies a balloon around an equal-area world map. Every finished mission collects a postcard (the album counter on the board).

| Skill | Ages | Levels | Child can… |
|---|---|---|---|
| `geo.map.directions` | 5–8 | 0–2, 7 (balloon), 9 (trip) | use N/E/S/W with a compass rose, from one step to directions between continents |
| `geo.map.key` | 5–8 | 3 | read symbols with a map key |
| `geo.map.grid` | 6–9 | 4 | give a grid reference, column letter then row number |
| `geo.world.continents` | 6–9 | 5, 9 | locate the 7 continents; a country sits inside a continent ("Kenya, in Africa") |
| `geo.world.oceans` | 6–9 | 6, 7 (ocean on a side), 9 | locate the 5 oceans including Arctic and Southern |
| `geo.world.equator` | 7–10 | 8, 9 | tell north from south of the equator; seasons are opposite |

## 2. National Geography Standards alignment
*Geography for Life*, 2nd ed. (NCGE 2012). Alignments for parents and teachers, not efficacy claims (D-020).

| Level(s) | Practice | Standard |
|---|---|---|
| 0–4 | compass rose, map key, grid references on a map | NGS 1 (maps and spatial tools) |
| 0–2, 9 | follow and plan routes from directions; the same island and world map every time build a mental map | NGS 2 (mental maps) |
| 5–8 | continents, oceans, hemispheres; relative location ("Africa is below Europe") | NGS 1, 4 (physical characteristics of places) |
| 5, 9 | postcards show real landmarks and nature with one respectful fact each (food, festivals, languages) | NGS 4 (physical and human characteristics of places), NGS 10 (Earth's cultural mosaics) |
| 8 | seasons opposite across the equator | NGS 7 (physical processes, simplified) |

## 3. Levels (generator: `generator.ts`, 10 levels, maxLevel 9)
| L | Board | Mission | Answer | Misconception targeted |
|---|---|---|---|---|
| 0 | island | 1 step; direction spoken; postcard visible (tutorial: north to the lighthouse, hand on N) | checkpoints (simulated walk) | north = "up the page" introduced |
| 1 | island | 1 step to a named place, no marker; ≥50% east/west; a decoy place sits the opposite way | checkpoints | east/west swap (walking the wrong way lands on a real place, so Zephy can name it) |
| 2 | island | "Go north 2, then east 1" (2 perpendicular legs, 2–4 steps); postcard revealed on arrival | checkpoints; any order of the same steps arrives and counts | skipping or reversing a leg |
| 3 | island | "Find the cave": tap the square; a look-alike symbol is always on the map | choice | symbols look like the real thing (cave/mountain, lake/beach, house/lighthouse) |
| 4 | island | "Which square is the bridge in?" 3 references | choice | right · off by one column or row · row/column swapped (B5 vs E2) |
| 5 | world | post a postcard to its continent; index rotation covers all 7 in a round (≤2 each); Europe/Asia and the Americas come back to back | choice | adjacent continents; "Africa is a country" (card: "from Kenya, in Africa") |
| 6 | world | sail the boat to a named ocean | choice | Southern vs Indian, Arctic vs Atlantic; drop on land → "Boats sail on the water" |
| 7 | world | balloon: which way from A to B? · which ocean is east of Africa? | choice | opposite direction; ocean on the wrong side |
| 8 | world | north or south of the equator? · in July/December, summer or winter? | choice | "the equator crosses only Africa" (hint names South America and Asia's islands) |
| 9 | world | trip: start continent + 3 spoken arrows; drop 3 of 4 postcards into stops 1–3 (decoy = where the first arrow's opposite leads) · alternating mixed review (3 postcards, ocean side, seasons) | sequence / match | direction swap on the first leg |

Within a round, difficulty steps up after 2 first-try answers (engine), so a level-0 round reaches levels 1–2. No timers anywhere.

## 4. Interaction and hints
- **Island:** N/E/S/W buttons (64 px) around a compass rose, or the arrow keys. One-step missions walk at once; longer plans fill a strip (tap a card to take it out, Backspace removes the last) and walk on **Walk**. Key chips speak the symbol name.
- **World:** postcards and the boat drag onto the map, or tap the card then a place, or Enter on the card then Enter on a place. Every continent / ocean has a ≥44 px drop button (the list of map places for keyboard and screen readers; names stay hidden until solved, so locating is the skill). Direction / hemisphere / season answers are big tray buttons.
- **First miss:** the wrong choice greys out; Zephy gives a line for that miss (opposite direction, look-alike symbol, "Africa is in the middle, below Europe", "places above the line are north"); the compass rose glows, the right half of the map glows, or the grid row and column light up. Yonder hops home; nothing is lost.
- **Second miss (model):** ghost compass cards and numbered footprints (island), a ghost postcard hovering on the right place, or the right button pulsing; the child taps it (errorless).
- Reduced motion: no walking, flying or bobbing; positions change at once, highlights stay.

## 5. Changes from the spec, found in play-testing
- Host renamed Pico → Yonder (character system). Between-beats rewritten so they fit any level ("Two postcards in the bag!" instead of "Yonder knows north from south now", which was wrong at world levels).
- L1 adds a **decoy place the opposite way**, so the east/west swap becomes a visible, nameable miss; L1 prompts still speak the direction (the spec's prompts do), but the postcard is hidden so the words must be used.
- L2 hides the destination: with the postcard visible children walked by sight and ignored the directions. Any order of the same steps is accepted (the child decoded the route correctly).
- L5 and L6 use **one card / one boat per mission** with the card's own spoken line (pre-readers can't read two labels); the multi-card match lives in L9's review.
- L7 asks "which ocean is **east of Africa**?" ("the ocean along that side") rather than "which ocean does she cross?", which was ambiguous for several pairs. Balloon flights that cross the map edge (e.g. North America → Asia) or could land on two continents (Asia south, Australia north) are excluded.
- L8 equator questions use only places ≥12° from the equator (Kenya, the Amazon and Bali are excluded); seasons use July / December and only places outside the tropics (|latitude| > 23.5°; Peru and Madagascar were removed after content review, since wet and dry seasons matter more there than summer and winter, and a unit test holds this).
- "North is at the top" is always said as "on this map" (`pc.help.compass`, `pc.help.worldcompass`), because "north is always up" is itself a misconception.
- L9 alternates the trip with a mixed review, so the top level really "mixes all".

## 6. Accuracy and respect policy
- **Map:** original simplified outlines typed by hand as longitude/latitude points from public-domain geographic knowledge, projected with the Equal Earth formula in `geo.ts` (equal-area; no tiles, images or third-party shape files). North is up; the map says nothing about borders.
- **No country borders and no contested territory:** no political lines are drawn; no question uses a disputed place, a border landmark (Niagara, Victoria Falls, Iguazú, Everest were avoided) or a small island; physical outlines of Taiwan and Sri Lanka are drawn unlabelled like any other island.
- **Models taught:** 7 continents as in US schools (parent copy says some countries teach 5 or 6); 5 oceans including the Southern Ocean (60°S boundary). New Zealand and New Guinea are drawn with Australia (Oceania) but never asked about.
- **Tables are checked against the drawing:** unit tests assert every label sits inside its region, every postcard pin is on its continent (the reef in the sea beside Australia), every balloon flight is a true parallel/meridian from its continent to its continent crossing the ocean it names, every "ocean on that side" boat sits in that ocean on that side, and every hemisphere matches the pin's latitude. An independent solver answers every generated mission (10 levels × 60 seeds) and the engine accepts it.
- **Cultures:** postcards show daylight landmarks and nature, never people, costumes or caricature. Facts use "people in X often…" / "many people in X…" phrasing; no non-English words are spoken (greetings need native-speaker recordings, a later world).

## 7. For a geography educator (and cultural reviewers) to check before publication
1. The 20 postcard facts in `voice.json` (`pc.found.*`), especially Canada (skating), Mexico (tortillas), Peru (potatoes), Kenya (Swahili and English), Japan (rice and soup breakfast), India (Diwali).
2. "North of Europe = Arctic Ocean" and "south of Asia = Indian Ocean" (`SIDES`); "Africa east → Australia" and "Australia west → Africa" across the Indian Ocean from southern Africa (`FLIGHTS`).
3. Coastline simplifications (Caspian, Baltic, Indonesia) and the grouping of New Zealand with Australia.
4. Pronunciation of place names in the rendered clips (Chichén Itzá isn't spoken; Machu Picchu, Patagonia, Madagascar, Diwali are).
5. The relative-location hints (`pc.where.*`) on an Atlantic-centred map ("the Pacific is on both edges").
