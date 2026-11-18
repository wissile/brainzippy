# Curriculum roadmap: first world of every library, then deepen

Owner: curriculum-designer (proposal). The main agent decides scheduling. This plan is about **content order**; product phases stay in `docs/ROADMAP.md`.

## 1. Principles
1. **One outstanding first world per library before any second world.** This shows the whole platform and tests the framework across interaction types.
2. **Existing characters first**, because they need no new art. New hosts are designed in parallel by the creative-director.
3. **Engine before content** wherever a new answer kind is needed: build it once, then reuse it.
4. **Expert review is a gate**, not a follow-up, for pilot, money (credit/investing), cyber, SEL and early-literacy audio.
5. Every world passes `docs/agents/GAMES_BRIEF.md` (story, real interaction, helper, generator with 6–10 levels, a11y, tests) and the `game-design-review` and `educational-content-validation` skills.

## 2. Prerequisite work (Wave 0)

| # | Work | Owner | Needed by |
|---|---|---|---|
| E1 | Content registry for libraries → topics → skills (ids, prerequisites, `Lm`, `N`), loaded from data | game-engineer | all |
| E2 | Answer kind `sequence`, validated **exactly** or **by simulation** (pluggable `simulate(program, item)`) | game-engineer | Garden Path, Postcard Trip, Sky Hoops L9, Rocket Lab L6, Reef Rescue |
| E3 | Answer kind `set-matching`: accepted-set comparison **and** a pluggable rule checker (`check(build, item) → {ok, failures[]}`) | game-engineer | Lemonade (coin sums), Bridge, Feelings Garden, Message Mystery, Reef Rescue |
| E4 | Answer kind `numeric-tolerance` with per-level tolerance | game-engineer | Sleepy Trail L8–9, later angles and coordinates |
| E5 | Multiple acceptable answers for a choice item (accepted set) and a per-world "neutral miss" sound option | game-engineer | Feelings Garden |
| E6 | Authored item banks as an alternative to generators (bank + seeded selector with constraints) | game-engineer | Message Mystery, Feelings Garden, Reef Rescue facts |
| E7 | Mastery (M1–M3), spaced review (S1–S4) and daily planner (D1–D9) from `README.md` §3, with unit tests on a fixed clock | game-engineer, reviewed by curriculum-designer | daily mix of new + review |
| E8 | Library shelf UI on the map (child picks among planned worlds; parent enables libraries) | ux-designer | all new libraries |
| E9 | Parent pages per library: objectives, standards ("aligned with"), disclaimers (pilot, SEL) | ux-designer + seo-performance-reviewer | launch of each library |

## 3. First worlds: build order

| Order | World | Library | Host (new?) | Engine needs | Expert gate | Voice (ids / clips) | Size |
|---|---|---|---|---|---|---|---|
| C1-a | Rumble's Sleepy Trail | Maths | Rumble (existing) | E4 (L8–9 only; L1–7 work with today's `choose`) | maths educator light review | 40 / ≈260 | M |
| C1-b | Hoot's Rhyme Lanterns *(English starter; whole words, TTS-friendly)* | English | Hoot (existing) | none | literacy specialist | ≈30 / ≈120 | S |
| C2-a | Loopi's Garden Path | CS | Loopi (new) | E2 | CS educator light review | 38 / ≈70 | M |
| C2-b | Budge's Lemonade Stand | Money | Budge (new) | E3 (sum rule) | financial educator (light: coins, profit) | 45 / ≈260 | M |
| C2-c | Dabble's Rocket Lab | Science | Dabble (new) | E2 (ranking) | science educator | 42 / ≈60 | M |
| C2-d | Pico's Postcard Trip | Geography | Pico (new) | E2 (reuse Garden Path route strip), map region hit-testing | geography educator (fact table) | 45 / ≈140 | L (world map art) |
| C3-a | Snug's Feelings Garden | SEL | Snug (new) | E5, E6 | SEL specialist / school counsellor **(gate)** | 48 / ≈150 | M |
| C3-b | Fenn's Message Mystery | Cyber | Fenn (new) | E3, E6 | cybersecurity educator + child-safety specialist **(gate)** | 50 / ≈125 | M |
| C3-c | Ripple's Reef Rescue | Nature | Ripple (new) | E2, E3, E6 | marine-science educator **(gate)** | 46 / ≈70 | M |
| C3-d | Brix's Budget Bridge | Engineering | Brix (new) | E3 + solver | engineering educator | 45 / ≈120 | L (builder board + solver) |
| C3-e | Zephy's Sky Hoops | Pilot | Zephy (new) | none beyond `choose` (+E2 for L9) | FAA-certificated flight/ground instructor **(gate)** | 40 / ≈45 | M |
| C4 | Zuzu's Word Train *(English flagship)* | English | Zuzu (existing) + Hoot | E2 (exact) | literacy specialist **(gate)**; **human-recorded phonemes** | 42 / ≈330 (≈230 human) | L |

Why this order:
- C1 needs no new characters and no new answer kinds, so it can start immediately in parallel with Wave 0 engine work.
- C2 worlds each introduce one engine capability (E2 or E3) with low content risk.
- C3 worlds carry higher accuracy or safety risk and need specialist review scheduled in advance.
- C4 waits only for the phoneme recording session; if recordings arrive early it moves up.

**Totals for 12 first worlds:** ≈ 510 voice line ids, ≈ 1,750 clips (≈ 230 human-recorded phonemes and stretched words; the rest Kokoro af_bella per D-014, with human takes preferred later). Plus ≈ 10 introduction lines per new host (≈ 90).

## 4. Art and character dependencies

| Item | Count | Owner | Blocks |
|---|---|---|---|
| New host characters (concept → SVG, 7 states + mouth, reduced-motion poses) | 9 (Loopi, Zephy, Budge, Fenn, Dabble, Pico, Snug, Brix, Ripple) | creative-director → motion-designer | C2, C3 |
| World scene backgrounds | 12 | creative-director / world agent | each world |
| Interactive object sets (tiles, coins, engines, creatures, bridge pieces, postcards, message cards) | 12 sets, 5–15 objects each | world agent | each world |
| World map (equal-area projection, continents/oceans as regions, original art) | 1 | creative-director | C2-d, later geo worlds |
| Picture word bank (≈95 picturable words for Word Train; ≈60 for Rhyme Lanterns, overlapping) | ≈120 small pictures | creative-director | C1-b, C4 |
| Stickers | 12 | world agent | each world |
| Music loops | reuse `island`, `meadow`, `sky`, `cave`, `kitchen`; propose new: `reef` (Reef Rescue), `lab` (Rocket Lab), `town` (Message Mystery) | audio-designer | optional |

Risk: character art is the critical path for C2/C3. Mitigation: start all 9 concepts in one creative-director batch now; allow world engineering to begin with a placeholder silhouette and swap the final SVG later (the `MascotState` contract stays the same).

## 5. Then deepen (second and third worlds per library)
After every first world ships and passes review, add worlds in skill-graph order, choosing the next world whose prerequisites are covered.

| Library | Next worlds (in order) |
|---|---|
| English | Letter Lagoon → Drum Parade Syllables → Sentence Bridge → Hoot's Story Order → Word Workshop → Mystery Words |
| Maths | Gloop's Shape Squish → Puff's Pattern Parade → Rumble's Clock Tower → Puff's Array Garden → Balance Scale Island |
| CS | Breakfast Robot → Loopi's Bug Hunt → Firefly Light Show → Rainy Day Sorter → Game Maker Garage |
| Pilot | Hangar Builder → Windsock Weather Station → Compass Rose Runways → Lift Lab → (band T later) |
| Money | Three Jars → Market Day Shopper → Budget Island → Seed Bank Interest |
| Cyber | Secret Keeper Sort → Password Locksmith → Kind Words Patrol → Fact Lighthouse → Robot Helper Rules |
| Science | Push & Pull Playground → Ice, Water, Steam Kitchen → Circuit Glowworms → Seed to Sprout |
| Geography | Landmark Lookout → Biome Backpack → Hello Around the World (native-speaker audio) → Flag Workshop |
| SEL | Calm Cove → Friendship Picnic → Kindness Quest → Two Sides Bridge → Talk-It-Out Treehouse |
| Engineering | Lever Lift → Tower Challenge → Ramp & Pulley Workshop → Circuit Doorbell |
| Nature | Habitat Homes → Tide Pool Explorer → Food Web Weaver → Droplet's Big Trip |

Coverage target before broadening further: every library has at least one world in each of the child's likely bands (A–D) so the daily planner always has new and review material.

## 6. Per-world estimate template
Each world plan should state: ids/clips, new art pieces, engine needs, expert gate, and size (S ≤ 1 agent-day, M 1–2, L 3+). Typical M world: ≈ 40–50 voice ids and 60–260 clips depending on variables (spoken numbers or amounts drive clip counts).

## 7. Decisions needed from the owner
1. **Band T (14+/adult)**: build as a separate Teen & Adult track later (recommended), or not at all?
2. **Phoneme recording** for Word Train: book a voice session (≈230 short clips) and a literacy reviewer?
3. **Specialist reviewers**: budget for a CFI/ground instructor, a financial educator, a cybersecurity educator, an SEL specialist, a child-safety specialist, a literacy specialist, a marine-science educator and cultural reviewers.
4. **Daily mix defaults** (README §3.5): 40% review cap, max 1 new skill/day for ages ≤7: accept or change?
5. **Who picks libraries**: parent enables libraries, child picks among planned worlds (recommended), or child browses all?
