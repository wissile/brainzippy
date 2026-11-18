# Geography and world cultures library (`geo`)

Ages 5–adult. **Host:** Pico (new; a round hermit crab whose shell is a little globe and who swaps travel stickers onto it, see `CHARACTERS.md`). Cameos: Zephy (flies postcards), Hoot (languages and stories), Ripple (oceans).
**Aligned with:** *Geography for Life: National Geography Standards*, 2nd edition (2012; NCGE, https://ncge.org/resources/national-geography-standards). 18 standards in 6 essential elements:
- **The World in Spatial Terms:** 1 maps, geospatial tools and spatial thinking · 2 mental maps · 3 spatial organisation of people and places
- **Places and Regions:** 4 physical and human characteristics of places · 5 creating regions · 6 culture and perception of places
- **Physical Systems:** 7 physical processes shaping Earth · 8 ecosystems and biomes
- **Human Systems:** 9 population and migration · 10 cultural mosaics · 11 economic interdependence · 12 human settlement · 13 cooperation and conflict over territory
- **Environment and Society:** 14 human modification of the environment · 15 physical systems affecting human systems · 16 changing use of resources
- **The Uses of Geography:** 17 interpreting the past · 18 interpreting the present and planning for the future

Standards are cited below as "NGS 1", "NGS 10" and so on.

## 1. Topics by age band

| Ages | Topic id | Topic | NGS |
|---|---|---|---|
| 5–8 | `geo.map` | Map basics: directions, map keys, grids, mental maps | 1, 2 |
| 6–9 | `geo.world` | Continents, oceans, equator, hemispheres | 1, 4 |
| 6–11 | `geo.lang` | Greetings and languages around the world | 10 |
| 7–11 | `geo.place` | Landmarks: natural and human-made | 4, 6 |
| 7–12 | `geo.culture` | Homes, food, festivals and daily life (respectful, specific, non-stereotyped) | 6, 10 |
| 8–12 | `geo.country` | Countries, capitals, flags | 4, 5 |
| 8–12 | `geo.physical` | Landforms, rivers, biomes, climate zones | 7, 8 |
| 10–13 | `geo.coord` | Latitude and longitude; time zones | 1 |
| 11–14 | `geo.projection` | Map projections and distortion | 1 |
| 11–adult | `geo.human` | Population, migration, settlement, trade | 9, 11, 12 |
| 13–adult | `geo.env` | People changing environments; resources; hazards | 14, 15, 16 |

## 2. Skills

| skill_id | Objective (learner can…) | Ages | Prereqs | Misconceptions targeted | Lowest-level example | Highest-level example | Aligned with |
|---|---|---|---|---|---|---|---|
| `geo.map.directions` | use north, south, east, west on a map with a compass rose | 5–8 | — | north = "up the page" even when the map is rotated; east/west swapped | move 1 step north | 3-step route using compass words on a rotated map | NGS 1 |
| `geo.map.key` | read symbols with a map key | 5–8 | — | symbols look like the real thing at real size | find the lighthouse symbol | plan a route past 3 key features | NGS 1 |
| `geo.map.grid` | find places with grid references (letter + number) | 6–9 | map.directions | row and column swapped | which square is the cave? | give the reference for 2 places | NGS 1 |
| `geo.world.continents` | name and locate the 7 continents (the model taught in US schools) | 6–9 | map.key | Africa is a country; Australia only a country; Europe and Asia separated by an ocean | drag a postcard to North America | locate all 7 on a blank map | NGS 1, 4 |
| `geo.world.oceans` | name and locate the 5 oceans | 6–9 | world.continents | there's one ocean "the sea"; Southern Ocean doesn't exist | Pacific vs Atlantic | all 5 including Southern and Arctic | NGS 1, 7 |
| `geo.world.equator` | tell northern from southern hemisphere and know seasons are opposite | 7–10 | world.continents | the equator is a real line on the ground; it's always hot at the equator everywhere (mountains) | above or below the equator? | it's July: summer or winter in Argentina? | NGS 1, 7 |
| `geo.place.landmarks` | match famous natural and human-made landmarks to their place | 7–11 | world.continents | landmarks are all in Europe/USA | Great Pyramid → Africa | match 6 landmarks to countries | NGS 4, 6 |
| `geo.lang.greetings` | greet in several languages and know languages don't equal countries | 6–11 | — | one country = one language; everyone in a continent speaks one language | hola = hello (Spanish) | countries where Spanish is an official language | NGS 10 |
| `geo.culture.daily-life` | describe how homes, food and festivals connect to place and history, and avoid generalising | 7–12 | world.continents | everyone in a country lives the same way; other cultures are "strange" | homes on stilts near water — why? | compare two festivals of light from different cultures | NGS 6, 10 |
| `geo.country.capitals` | locate countries and their capitals | 8–12 | world.continents | biggest city = capital | Canada → Ottawa | capitals of 10 countries across continents | NGS 4 |
| `geo.country.flags` | recognise flags and explain what flag symbols can mean | 8–12 | country.capitals | flags with similar colours are the same | pick Japan's flag of 3 | build a flag from parts; explain a symbol | NGS 4, 6 |
| `geo.physical.landforms` | identify mountains, valleys, plains, rivers, deltas, islands | 7–10 | map.key | rivers flow north-to-south; islands float | island vs peninsula | trace a river from source to mouth | NGS 7 |
| `geo.physical.biomes` | match biomes and climate zones to plants, animals and clothing | 8–12 | world.equator | deserts are always hot; rainforests only in Africa | desert vs rainforest | pack for a tundra summer | NGS 8, 15 |
| `geo.coord.latlong` | read and plot latitude and longitude | 10–13 | world.equator, math.add.within-100 | lat/long order swapped; longitude lines are parallel | find 0°, 0° | locate 30°S, 60°W | NGS 1 |
| `geo.coord.timezones` | work out times in other time zones | 11–14 | coord.latlong | time zones are straight 15° strips everywhere | +1 hour east | call a friend 8 hours ahead | NGS 1 |
| `geo.projection.distortion` | explain why flat maps distort size or shape and compare projections | 11–14 | coord.latlong | Greenland is as big as Africa | orange-peel flattening | compare Mercator and an equal-area map | NGS 1 |
| `geo.human.migration` | explain push and pull factors of migration | 11–adult | culture.daily-life | migration is only modern; people move for one reason | push vs pull sort | trace a historical migration with reasons | NGS 9 |
| `geo.human.trade` | describe how places depend on each other through trade | 11–adult | country.capitals | everything is made where it's sold | where a chocolate bar's ingredients come from | supply chain disruption scenario | NGS 11 |
| `geo.env.impact` | evaluate how people change environments and plan responses | 13–adult | physical.biomes | all change is bad; nature can't recover | terraces on hills: why? | weigh options for a growing coastal town | NGS 14, 18 |

## 3. World concepts (prioritised)

### 1. Pico's Postcard Trip — **first world** (ages 6–9)
- **Host:** Pico · **Helper:** Zephy (postcard pilot) · **Scene:** Monster Island map, then a world map.
- **Hook:** Pico's pen pals mailed postcards from all over the world, and Pico wants to visit each one, but needs help reading maps.
- **Interaction:** move Pico by compass buttons, drag postcards to places on the map. **Answer kind:** sequence / choice / set-matching.
- **Levels:** see §4 (9 levels).
- **Hints:** compass rose glows; Zephy flies the route. **A11y:** compass buttons; map regions as a list.

### 2. Landmark Lookout (ages 7–11)
- **Host:** Pico · **Cameo:** Zephy · **Scene:** an observation balloon with a spyglass.
- **Hook:** Pico's sticker book has landmark stickers with the labels missing.
- **Interaction:** drag a landmark sticker to its continent, then its country. **Answer kind:** set-matching.
- **Levels:**
  1. natural vs human-made
  2. landmark → continent (2 options)
  3. → continent (4)
  4. → country
  5. famous rivers and mountains
  6. what the landmark tells about the place (why it was built there)
  7. mixed album
- Landmark art is original and drawn in daylight views.

### 3. Flag Workshop (ages 8–12)
- **Host:** Pico · **Cameo:** Gloop (shapes) · **Scene:** a flag-sewing workshop.
- **Hook:** The island's friendship parade needs flags, and the pattern book got wet.
- **Interaction:** pick flags; build a flag from stripes, shapes and symbols. **Answer kind:** choice / set-matching.
- **Levels:**
  1. pick a flag among 3 very different
  2. similar colours (Ireland vs Côte d'Ivoire)
  3. stripes direction
  4. build simple flags
  5. symbols and meanings
  6. same-region flags
  7. design your own (no checking, just creativity)
- Flag set verified against a single authoritative source (e.g. the CIA World Factbook) at build time.

### 4. Hello Around the World (ages 6–11)
- **Host:** Hoot · **Cameo:** Pico · **Scene:** a friendship train stopping in many places.
- **Hook:** Hoot's friendship train needs the right "hello" at every stop to open the doors.
- **Interaction:** listen and choose greetings; match languages to places where they're spoken. **Answer kind:** choice / set-matching.
- **Levels:**
  1. hello in 3 languages
  2. goodbye and thank you
  3. same language, many countries
  4. many languages, one country
  5. writing systems (alphabets, characters)
  6. mixed journey
- Greetings recorded by **native speakers**; TTS isn't used for non-English words.

### 5. Biome Backpack (ages 8–12)
- **Host:** Pico · **Cameo:** Ripple · **Scene:** a travel shop with backpacks for each trip.
- **Hook:** Pico is visiting friends in a desert, a rainforest and the tundra, and every trip needs a different backpack.
- **Interaction:** pack items; match plants and animals to biomes. **Answer kind:** set-matching (rule check: needed items, no useless ones).
- **Levels:**
  1. hot vs cold
  2. wet vs dry
  3. 4 biomes
  4. seasons by hemisphere
  5. mountains are colder
  6. plants and animals per biome
  7. climate zone map

### 6. Latitude Lagoon Treasure (ages 10–13)
- **Host:** Pico · **Scene:** a gridded globe lagoon with buried treasure chests.
- **Hook:** An old map gives treasure locations as coordinates.
- **Interaction:** slide to coordinates; read coordinates of places. **Answer kind:** number pair / numeric-tolerance (±2°).
- **Levels:**
  1. equator and prime meridian
  2. latitude only
  3. longitude only
  4. both
  5. southern/western values
  6. real cities by coordinates
  7. time zones from longitude (simplified)

### 7. Festival Kitchens (ages 7–12)
- **Host:** Hoot · **Cameo:** Bobbo (hungry) · **Scene:** community kitchen where friends share dishes from their families.
- **Hook:** Friends bring dishes to the island's sharing feast and tell where each recipe comes from.
- **Interaction:** match dish to ingredient source and story; compare festivals. **Answer kind:** set-matching / choice.
- **Levels:**
  1. ingredients come from places
  2. climate shapes food
  3. a festival's meaning
  4. two celebrations compared
  5. one country, many cuisines
  6. how foods travelled (trade history)
- Content co-written or reviewed by people from the cultures shown.

### 8. Map Peel (projections) (ages 11–14)
- **Host:** Pico · **Cameo:** Gloop · **Scene:** an orange-peel globe being flattened.
- **Hook:** Gloop tries to flatten Pico's globe shell without stretching anything, and it's impossible.
- **Interaction:** compare areas on two projections; drag countries to true-size comparisons. **Answer kind:** choice / set-matching.
- **Levels:**
  1. peel can't lie flat
  2. stretching near the poles
  3. Greenland vs Africa true size
  4. equal-area vs shape-keeping
  5. pick a map for a purpose
  6. distance on a globe vs flat map

### 9. Journeys of People (ages 11–adult)
- **Host:** Pico · **Scene:** a timeline map of human journeys.
- **Hook:** Pico collects stories of why people moved across the world.
- **Interaction:** sort push/pull factors; trace routes; read population maps. **Answer kind:** set-matching / choice.
- **Levels:**
  1. push vs pull
  2. ancient migrations
  3. city growth
  4. trade routes
  5. population density map
  6. present-day scenario (neutral, factual)
- Sensitive history reviewed by a historian; neutral, factual framing.

## 4. First world to build: **Pico's Postcard Trip**

**Why first:** maps and directions (NGS 1) are the foundation of every geography skill, the owner's example is "travel missions using map skills", and the board reuses Loopi's grid-move logic and Sky Hoops-style drag-to-target.

### 4.1 Objective and skills
"Child can use compass directions, map keys and grids, and find continents and oceans on a world map." L0–L2 `geo.map.directions` (Lm 2); L3 `geo.map.key` (Lm 3); L4 `geo.map.grid` (Lm 4); L5 `geo.world.continents` (Lm 5); L6 `geo.world.oceans` (Lm 6); L7 `geo.map.directions` on the world map (Lm 7); L8 `geo.world.equator` (Lm 8); L9 trip mission mixing all (Lm 9).

### 4.2 Story
| Beat | Line (`pc.`) |
|---|---|
| intro1 | "This is Pico. Pico's shell is a little globe, covered in travel stickers." |
| intro2 | "One morning, a whole bag of postcards arrived from pen pals around the world!" |
| intro3 | "Pico wants to visit every one. But first, Pico needs to read a map." |
| intro4 | "Zephy will fly the postcards. You read the map!" |
| between2 | "Pico knows north from south now. Time to pack!" |
| between4 | "Look, a postcard from a whole different continent!" |
| between6 | "Last few postcards. Pico's shell is nearly full of stickers." |
| outro1 | "Pico visited every pen pal!" |
| outro2 | "You used the compass, the key and the map to find each place." |
| outro3 | "Here's your Explorer Sticker for your shell!" |

### 4.3 Board
- **L0–L4 Island map:** a 6×6 grid map of Monster Island with an always-visible compass rose (N up), a map key panel (lighthouse, forest, cave, bridge, beach, house), columns A–F and rows 1–6 labelled. Pico moves with four compass buttons (N/E/S/W) placed around the rose (each ≥64 px). Routes are built in a strip like Loopi's program (reuse), then "Walk".
- **L5–L9 World map:** an **equal-area projection** (Equal Earth) with continents as large tappable regions (each with an invisible enlarged hit area so small continents like Europe/Australia stay ≥44 px; ≥64 px for under-7s on tablets). Oceans as labelled regions. Postcards appear in a tray; drag a postcard onto a continent or tap postcard → tap region.
- Postcards show a generic, respectful scene (landscape, animal or landmark) plus a pen pal's monster drawing, never stereotyped people.

### 4.4 Generator rules (seeded)
| Level | Item | Answer | Validation | Distractor / misconception |
|---|---|---|---|---|
| 0 tutorial | Pico one step from the lighthouse (north) | sequence [N] | simulate | pointing hand on N |
| 1 | one step to a named landmark (random N/E/S/W) | sequence of 1 | simulate | east/west buttons look symmetric; E/W items ≥ 50% |
| 2 | 2–3-step route using compass words in the prompt ("Go north 2, then east 1") | sequence | exact path (simulate) | — |
| 3 | "Find the {symbol name}" on the map using the key | choice (tap region) | equality | symbols with similar shapes (cave vs tunnel) |
| 4 | "Which square is the {feature} in?" | choice of 3 references | equality | swapped (3C vs C3 is the same; distractors swap letter/number value: C3 vs D3 vs C4) |
| 5 | postcard → continent (7) | set-matching per card | region equality | adjacent continents (Europe/Asia, North/South America); "Africa is a country" via card text "from Kenya, in Africa" |
| 6 | boat → ocean (5) | set-matching | region equality | Southern vs Indian, Arctic vs Atlantic |
| 7 | "Zephy flies **east** from South America. Which ocean does she cross?" | choice | table of start continent × direction → ocean (authored, ≈20 facts) | opposite direction's ocean |
| 8 | is the postcard place north or south of the equator? / season opposite | choice | authored table | "equator crosses only Africa" |
| 9 | 3-postcard trip: order the stops by the directions given | sequence | exact | — |

Constraints: no continent appears more than twice in a round; L5 round covers ≥5 continents; L7/L8 facts come from the authored, reviewed fact table only.

### 4.5 Hint ladder
- **First miss:** wrong region dims; Zephy (helper) flies a short loop over the compass rose or the correct hemisphere/area (not the exact answer) and gives the concept line.
- **Second miss (model):** Zephy flies the postcard to the right place and hovers; the region pulses; the child taps it (errorless).

### 4.6 Helper explanations (Zephy)
- `pc.help.compass` "North points to the top of this map. Never Eat Soggy Waffles: north, east, south, west, going clockwise."
- `pc.help.key` "A map key tells you what each little picture means."
- `pc.help.grid` "Go along to the letter, then up or down to the number."
- `pc.help.continent` "A continent is a huge piece of land. Most continents have lots of countries."
- `pc.help.ocean` "Five oceans, all joined together: Pacific, Atlantic, Indian, Arctic and Southern."
- `pc.help.equator` "The equator is an imaginary line around the middle of the Earth."

### 4.7 Voice lines (prefix `pc.`; ≈45 ids)
Prompts: `pc.prompt.step` "Help Pico walk {dir} to the {place}." · `pc.prompt.route` "Go {dir} {n}, then {dir2} {n2}." · `pc.prompt.key` "Find the {symbol} on the map." · `pc.prompt.grid` "Which square is the {feature} in?" · `pc.prompt.continent` "This postcard is from {continent}. Where is that?" · `pc.prompt.ocean` "Sail the boat to the {ocean} Ocean." · `pc.prompt.cross` "Zephy flies {dir} from {continent}. Which ocean does she cross?" · `pc.prompt.equator` "Is {place} north or south of the equator?"
Praise: `pc.praise.1` "You used the compass rose!" · `pc.praise.2` "You checked the map key." · `pc.praise.3` "Along, then up. Perfect grid reading." · `pc.praise.4` "You found {continent}!"
Retry: `pc.retry.1` "Let's look at the map again." · Idle: `pc.idle` "Tap a direction to move Pico."
Story 10, helper 6. Variables: directions (4), places/symbols (≈12), continents (7), oceans (5), postcard places (≈20). **Estimate ≈ 45 ids, ≈ 140 clips.**

### 4.8 Reward
Sticker **"Explorer Sticker"**: a round globe sticker with a compass rose, which appears on Pico's shell on the map screen.

### 4.9 Accessibility
Map regions available as a list of buttons ("North America", "Pacific Ocean"); island map described in text with grid references; reduced motion: no Zephy flight animation, just the highlighted region.

## 5. Accuracy notes
- Continents: we teach the 7-continent model used in US schools and note in the parent page that other countries teach 5- or 6-continent models (e.g. combining the Americas or Europe and Asia).
- Oceans: 5 oceans, including the Southern Ocean (recognised by National Geographic in 2021).
- Projections: use an equal-area projection for world maps so sizes aren't misleading (Mercator only in the projection world, labelled).
- Countries, capitals and flags change; verify against one authoritative source at build time and re-check yearly. Disputed territories are not used in quizzes; maps show recognised boundaries with neutral styling.
- Languages: "official language" claims checked; greetings recorded by native speakers and reviewed.

## 6. Age-appropriateness and safety
- Cultures are presented through real, specific, respectful details with reviewers from those cultures; no costumes-as-identity, accents for humour or "exotic" framing.
- No war, conflict or disaster imagery for under-11s; NGS 13 (conflict over territory) is band T only and factual.
- No real-time location data is ever used; "where you live" is never asked.
