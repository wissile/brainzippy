# Ripple's Reef Rescue (`reef-rescue`)

**Ages 8–12 · Nature and oceans (`nature`, "Wild Shore") · reefs, food chains, needs, restoration.** Host Ripple, helper Dabble
(with her zoom lens). Spec: `docs/curriculum/nature.md` §3 item 1 and §4. Pack: `src/content/packs/library-nature` (topics
`nature.habitat`, `nature.web`, `nature.reef`). First world of the nature library, which is now `live`.

## Objective
"Child can explain how a reef food chain works, what corals and other reef species need, why reefs bleach, and which actions help
them recover."

| Skill | Levels | Objective | NGSS (aligned with) |
|---|---|---|---|
| `nature.habitat.needs` | 0–1 | match species to the food and habitat that meet their needs | 3-LS4-3 (some organisms survive well, some less well, some not at all in a habitat) |
| `nature.web.chain` | 2–3 | food chain from the sun; arrows = "gives energy to" | 5-PS3-1 (energy in animals' food was once energy from the sun); 5-LS2-1 (context: matter moving among organisms) |
| `nature.reef.coral` | 4 | coral is an animal; algae partners give food and colour; coral gives them a home | MS-LS2-2 (interactions), 5-LS2-1 |
| `nature.reef.bleaching` | 5, 9 | warm water → algae pushed out → white → weak; recovery; reading a heat chart | MS-LS2-4, MS-ESS3-5 (context) |
| `nature.reef.restore` | 6, 8 | actions that help or harm; planting coral where it can grow | MS-LS2-5, MS-ESS3-3 |
| `nature.web.change` | 7 | removing grazers lets algae smother coral; bringing them back helps | MS-LS2-1, MS-LS2-4 |

Codes come from the spec (MS-LS2-* and MS-ESS3-* were checked on nextgenscience.org by the spec author on 2026-11-17). Revised 2026-11-22 after an independent content review: the sun-energy chain aligns with 5-PS3-1 (5-LS2-1 is about matter), and the kindergarten K-ESS3-1 was replaced by 3-LS4-3 for ages 8+. The others
still need to be re-checked during validation. Prerequisites are registered only inside this world's chain (needs → chain →
coral → bleaching → restore; chain → change). The spec's `sci.life.needs` and `nature.web.decomposers` have no world yet.

## Story ("Bring the Reef Back", spec §4.2)
Lines are verbatim except `between6` (see Deviations). After a hot summer part of Ripple's reef has turned white. "The coral
isn't gone. It's weak, and it needs help to recover." The outro shows a colourful reef full of fish, then the **Reef Guardian**
shell sticker. Music: the existing `island` loop.

## Interaction: a living reef
- **Layout.** A side-view reef scene with 10 coral patches along the bottom (2 healthy, 8 white or pale). A shelf holds the
  cards: species, helpers, story cards, action cards, coral pieces.
- **Moving cards.** Every move works by **drag**, by **tap-then-tap** (tap a card, then tap a spot), or by **keyboard**: Enter on
  a card moves focus into the reef, Enter places it, and Escape cancels.
  - One-card slots swap their cards.
  - Zones and bins hold many cards. A placed card can be picked up again or sent back to the shelf.
  - Coral pieces stay in hand, so repeated taps keep planting.
- **The reef recovers.** Each solved item brings one patch back to colour, with a bloom and a sparkle icon, and another fish swims
  in. Health is shown by colour **and** an icon (sparkle = healthy, half = pale, dashed ring = white), plus an "n/10" meter and a
  screen-reader status.
- **Explain step.** After Check a banner says what is true and why: "Parrotfish scrape algae off the reef rocks with their
  beaks.", "Too deep and dark: the coral's algae need sunlight.", "Weeks 3 to 7: 5 warm weeks in a row."
- **Reduced motion.** No swimming, swaying, bubbles or blooms. Colour changes are instant.

## Levels (generator, `maxLevel` 9, round of 8, step up after 3 first-try answers)
| L | Item | Answer | Distractor → misconception |
|---|---|---|---|
| 0 | who eats what, 2 foods (tutorial: parrotfish → algae, with pointing hand) · every 3rd item: 2 species → 3 zones | choice · match | a food another animal eats; deep water "is ocean, so fine" |
| 1 | who eats what, 3 foods (a band covers all 6 animals) · every 3rd item: 3 species → 4 zones | choice · match | the same |
| 2 | 3-link chain sun → algae/seagrass → grazer (+ reef-shark card) | sequence | reversed arrows; a shark eating algae |
| 3 | 4-link chain sun → algae → damselfish/parrotfish/surgeonfish → reef shark | sequence | grazer placed as top predator; reversed order |
| 4 | coral facts (rotating): coral is an animal; algae give food and colour; coral gives algae a home; algae need light | choice | rock, plant; "algae build the skeleton"; "shade"; "colder water" |
| 5 | bleaching cause chain / recovery chain (4 cards + a "bleach" card) | sequence | bleaching comes from bleach; bleached = dead (recovery story) |
| 6 | sort 6 actions into Helps / Harms (2–4 of each) | match | "touching coral helps it"; anchors are harmless |
| 7 | algae smothering coral: pick every algae eater of 5 (2–3 grazers; the reef shark always offered) | set | "only the top predator matters" |
| 8 | plant 4 coral pieces on an 8-spot frame (4 good spots, and one each of deep/dark, ledge shade, algae, shifting sand) | set | deep, dark spots |
| 9 | 12-week sea-temperature chart (example data, dashed usual high 29 °C): riskiest warm spell / weeks above the line | choice · number | the single hottest week instead of the longest spell; counting only one spell |

**Hints.**
- **First miss.** Dabble explains, diagnosing the miss (sun first, arrows, shark, bleach chemicals, hottest week, and so on). Her
  zoom lens appears with a clue that is not the answer: the animal's mouth ("Beak-like teeth for scraping rocks"), each species'
  needs, algae inside a polyp, a thermometer. Wrong cards float back to the shelf, right parts stay with a green ring, and the
  wrong food spot or frame spot is greyed out.
- **Second miss.** The worked example: cards move into place one by one. For the chart, warm spells are measured in turn, or warm
  weeks are counted aloud 1, 2, 3… Then the child presses Check, and only the model can be checked (errorless).

## Ecosystem model and accuracy (`facts.ts`, unit-tested)
- **Diets** (eater → food): parrotfish, surgeonfish and sea urchin → algae; green sea turtle → seagrass (adults also eat algae);
  reef shark → small fish; sea cucumber → bits in the sand.
  - **Safety rule:** a food the animal also really eats is never offered as a wrong option. Algae is never a turtle distractor.
    Seagrass is never a distractor for parrotfish, surgeonfish or urchins, because some species nibble it.
- **Chains:** every link is "food → eater" in the table and every chain starts with the sun. A test checks that exactly one
  ordering of the offered cards is a valid chain.
- **Needs:**
  - coral: sunlight + hard ground
  - seagrass: sunlight + soft sand
  - sea cucumber: soft sand
  - cleaner shrimp: a place to hide
  Each item meets its needs in exactly one offered zone. "Deep, dark open water" meets nobody's needs.
- **Bleaching** (NOAA): corals are animals; zooxanthellae live in their tissue and give food and colour. Water that stays too warm
  makes corals expel them, and the coral turns white. A bleached coral is not dead but is stressed, and it can recover if
  conditions improve.
- **Chart:** the riskiest spell is the longest run above the usual high **and** the one with the most heat above the line. This
  is a simplified version of NOAA Coral Reef Watch's "degree heating weeks", so the two can never disagree. Charts are labelled
  "Example data".
- **Planting rules:** shallow (light), unshaded, no algae, a steady base (not shifting sand).

**Sources (primary: NOAA).** WebFetch was refused in this environment, so the pages below were found through web search, and the
facts above are from my own knowledge. **A science educator should verify them against the pages.**
- NOAA Ocean Service, What is coral bleaching? https://oceanservice.noaa.gov/facts/coral_bleach.html
- NOAA Ocean Service, Corals / zooxanthellae tutorial: https://oceanservice.noaa.gov/facts/coral.html ·
  https://oceanservice.noaa.gov/education/tutorial_corals/coral02_zooxanthellae.html
- NOAA Coral Reef Watch, Degree Heating Week product: https://coralreefwatch.noaa.gov/product/5km/tutorial/crw10a_dhw_product.php
- NOAA Fisheries, Restoring natural grazing processes can help coral reefs:
  https://www.fisheries.noaa.gov/feature-story/restoring-natural-grazing-processes-can-help-coral-reefs
- NOAA Fisheries, Green turtle: https://www.fisheries.noaa.gov/species/green-turtle
- Smithsonian Ocean, Surgeonfish: https://ocean.si.edu/node/107611 (secondary)

## Tone and safety
The framing is hopeful and action-focused:
- White coral is "weak", never dead, and a recovery story sits beside the bleaching story.
- Help/Harm cards describe what communities do: buoys, nurseries, protecting grazers, clean energy. No guilt messages.
- No dead or suffering animals; the shark smiles with its mouth closed.
- A unit test bans doom words ("dying", "dead", "destroy"…) and ability praise.
- Art avoids clownfish and blue tangs. The surgeonfish is a yellow tang.

## Deviations from the spec (and why)
1. **Habitat placement (L0–L1).** The owner asked for species and helpers to be dragged to zones where their needs are met. L0–L1
   therefore alternate the spec's "who eats what" with "put each one where it gets what it needs". This adds coral pieces,
   seagrass, sea cucumber and cleaner shrimp, plus 4 zones.
2. **L0 is a generated easy level** (2 foods, 2 species) after the tutorial. The spec has only the tutorial at L0.
3. **L4 rotates four coral questions.** The spec has two; with only two, a round would repeat the same item 4 times. The added
   questions are "what does the coral give its algae" (the spec's highest-level example) and "why shallow, clear water".
4. **L5 alternates the bleaching chain with a recovery chain.** One fixed chain would be memorised after one item, and the recovery
   story carries the hopeful message.
5. **L6 "cooler water"** became "Clean energy, so the ocean warms less": an action people take, not a condition.
6. **L9 count item.** It asks for the total number of weeks above the line, with the longest spell's length as a distractor.
7. **`between6` reworded** from "Time to plant new coral pieces on the reef frame." to "Every step you take brings more colour back to
   the reef." The between-lines play at every level, and the original wrongly promised planting at L0–L7.
8. **`rr.idle`** says "Move a card into place, then press Check." because not every card is a creature.
9. **Extra voice lines** beyond §4.7:
   - prompts: tutorial, home, gives, light, recover, count
   - helper: eats, home, chem, recover, sort, count
   - two diagnosed hints, five praise lines, intro lines, model/check lines
   In total: 56 ids, 61 clips. The spec's own helper lines run to 20 words (the ≤ 14 rule is for ages 4–8).

## For the science-teacher review (flagged)
1. Verify the facts against the NOAA pages above (fetching was blocked here).
2. "Damselfish eat algae": true for the many farming damselfish, but some species eat plankton. Is the L3 chain acceptable?
3. Green sea turtles: "seagrass" is the answer, and algae is never a wrong option. Acceptable for ages 8–12?
4. Is "longest warm spell = riskiest" (made to agree with accumulated heat) a fair simplification of degree heating weeks?
5. Cleaner shrimp's key need is shown as "a place to hide" (crevice cleaning stations).

## Tests
- `tests/unit/reef-rescue.test.ts` (23 tests):
  - fact-table rules
  - 10 levels × 60 seeds: lint, skill per level, the correct answer validates
  - per level, solvable and consistent with the documented needs: unique chain ordering, unique meeting zone, diets, 4 good spots,
    fair charts with distinct hottest week ≥ 50 %
  - board model: solved placement submits the right answer, swaps, incomplete arrangements block Check, keep-after-miss, model
    errorless
  - voice coverage and words; registry
- `e2e/reef-rescue.spec.ts`:
  - tutorial by drag (patch blooms)
  - full round by tap-tap, keyboard and drag → sticker + level up
  - hint ladder
  - every level by drag and keyboard
  - four-viewport sweep with screenshots
  - reduced motion
