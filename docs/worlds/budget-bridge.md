# Brix's Budget Bridge (`budget-bridge`)

Ages 8–12 · engineering library (`engr`, "Build Yard"), topic `engr.struct` · host **Brix**, helper **Budge** (keeps the budget) · music `meadow`.
Spec: `docs/curriculum/engineering.md` §4. Code: `src/games/budget-bridge/`. Registry: `src/content/packs/library-engr/` (library now `live`).

## 1. Objective
"Design a bridge that meets a load requirement within a budget, using supports, materials and triangles, and improve it after testing." The child runs the design loop on every item: **design** (place pieces with prices) → **test** (a vehicle drives across) → **observe** (each span bends by load ÷ capacity; a span that is too weak sags and glows; every span gets a badge with how much it holds) → **improve** (change the weak part and test again).

| Skill | Ages | Levels | Child can… |
|---|---|---|---|
| `engr.struct.span-load` | 8–12 | 0–2, 5 | trade span, material, supports and cost to carry a load |
| `engr.struct.triangle` | 8–12 | 3–4 | use triangle braces across a whole span to make it stronger |
| `engr.design.criteria` | 7–10 | 6 | meet the criterion (hold the bus) inside the constraints (budget, pillars only on ground) |
| `engr.design.iterate` | 8–12 | 7–8 | use a test result to improve only the weak part |

Prerequisites stay inside this world (span-load → triangle, criteria → iterate), so the daily planner can unlock it. The spec's soft links (`math.shape.name`, `money.budget.plan`) get added when those skills exist.

## 2. NGSS ETS alignment
These are alignments for teachers and parents, not claims of efficacy (D-020). An engineering educator should review the world before publication (spec §5).

| Level(s) | Practice in the game | NGSS performance expectation |
|---|---|---|
| all | the problem has a criterion (hold the vehicle) and constraints (budget, deep water) | 3-5-ETS1-1 (define a design problem with criteria and constraints) |
| 0–6, 8 | build, test, compare designs; any valid design passes; many do | 3-5-ETS1-2 (generate and compare multiple solutions) |
| all | a fair, repeatable load test; the badges show the failure point | 3-5-ETS1-3 (plan and carry out fair tests; identify failure points) |
| 4, 6, 8 | budgets that rule out "steel everywhere"; precise criteria (load numbers) | MS-ETS1-1 (criteria and constraints, precisely) |
| 7 | read the test data (which span, holds 2 vs load 5) and fix that part | MS-ETS1-3 (analyse test data), MS-ETS1-4 (iterative testing of a model) |

## 3. The model (deterministic, no physics engine, no randomness in outcomes)
All in `logic.ts`. Game numbers chosen to teach trade-offs; the board says so: "Game numbers: real bridges are designed by engineers using real measurements."

- A gap of G cells (1 cell = 1 plank length) between two banks. Under each cell is **solid ground** (a mound) or **deep water**.
- A cell holds a **deck** (wood $10 or steel $25), a **pillar** ($30, a stone pier one cell wide) and/or a **triangle brace** ($10).
- **Supports** are the two banks and every pillar on ground. A deck cell on a pillar rests on it directly. A pillar in deep water has nothing to stand on: it holds nothing up and breaks the ground rule.
- A **span** (segment) is a run of cells between supports. It is as strong as its **weakest** piece (wood if any cell is wood). Max span: wood 3, steel 4. Capacity (load units):

| span | wood | steel |
|---|---|---|
| 1 | 4 | 10 |
| 2 | 2 | 6 |
| 3 | 1 | 3 |
| 4 | — | 2 |

  A span is **braced** only if every cell in it has a triangle; braced capacity = table × 3.
- Vehicles: scooter 1, car 2, van 4, truck 5, bus 8. **Load test passes** when every span's capacity ≥ the load.
- **Rule checker** (the engine's `set` answer lists the five rules): every gap has a deck · every span ≤ its max · every span holds the load · pillars only on ground · cost ≤ budget. The board submits the rules the design meets; it is correct only when all five hold. Any design meeting them passes.

**Simplifications (honest list):** the vehicle is one point load on one span at a time (no load spreading, no dynamics, no impact); the bridge has no self-weight; no wind, water flow, temperature or fatigue; joints and pillars are infinitely strong; a triangle brace simply triples a span (real trusses change how forces flow, tension and compression come at ages 13+ with `engr.struct.forces`); capacities and prices are invented. What is true and taught: shorter spans carry more; supports split spans; triangles keep their shape and stiffen a span; stronger materials usually cost more; a design must meet its criteria within its constraints; a test shows where to improve.

**Solvers.** `cheapest()` enumerates pillar layouts (subsets of ground cells, ≤ 64) and, for each span, the cheapest uniform build (wood/steel × braced/not). Mixed or partly braced spans never need listing: they are only as strong as wood / unbraced and cost more. A unit test proves it equals the spec's exhaustive per-cell solver (`bruteForceCheapest`, 8^G designs) on every level for G ≤ 5. `cheapestFix()` searches exhaustively over the weak span's cells only (improve level).

## 4. Changes from the spec, and why (play-testing the model)
1. **Triangle $10 (spec $15).** With $15, wood + triangle costs exactly the same as steel ($25/cell) and is never cheaper, so level 4's lesson ("all-steel is over budget → wood + triangles") was impossible: the solver found steel and braced wood tied. At $10, triangles are the cheap way to add strength; steel keeps its niche for long spans (4 cells) and heavy loads (braced steel).
2. **Mixed materials allowed (spec: the board fills a segment with one material).** Auto-filling moved pieces the child never touched, which broke "the piece goes where I put it" for drag, tap and keyboard alike. Instead a span is as strong as its weakest piece: honest, and a second lesson (weakest link).
3. **Pillar = a one-cell pier.** The spec puts pillars on ground cells; we make the cell above a pillar fully supported, so spans are whole cells (no half spans) and the a11y label can stay per cell.
4. **Level parameters widened for variety.** With the spec's fixed G and vehicle, levels 1–4 produced the same site 8 times in a round. Now: L0 G 1–2 scooter/car; L1 G 2–3 and steel joins (the budget makes steel-for-everything a miss); L2 G 4–5 car/van; L3 G 3–5 (triangles arrive, matching §4.1's "L3–L4 triangle"); L4 G 4–5. L2 slack 1.3 (spec 1.5) so the pillar, not a steel span of 4, is what fits.
5. **Level 8's "requires pillars, wood and braces"** cannot hold for every design that fits at slack 1.1 (a braced wood span of 1 and a plain steel one differ by $5). The checked rule: the cheapest design combines all three, no pillar-free design fits, and the all-steel design doesn't fit.
6. **Level 7's budget** = the cost of the cheapest fix of the weak span (the given bridge + fix money, exactly enough for at least one fix); items where a fix would cost nothing extra are redrawn.
7. **Helper lines all spoken by Budge.** Brix is already on screen as the mascot; a Brix helper would put two Brixes side by side.
8. **Budget voice.** "Build a bridge for the {vehicle}. Budget: {amount}." would need 5 × 57 = 285 clips (cap 150). The prompt says "Keep it under budget!"; the amount is in the prompt text and the budget bar, and tapping the bar says "Our budget is {amount} dollars."
9. **Story between-beats** at 4 and 6 changed from "Triangles!" and "No pillars in the middle!" to lines that fit every level (they play after exercise 4/6 whatever the level, and level 0 has neither triangles nor deep water).
10. **Test with a hole in the road** is not counted as a miss: the holes blink and Brix says "Put a deck in every gap first." Every submitted design has a full deck.

## 5. Levels (generator.ts, solver-verified for levels 0–8 × 50 seeds in tests)

| Lv (screen) | G | Ground | Vehicle | Pieces | Budget | Teaching point / check |
|---|---|---|---|---|---|---|
| 0 (1) | 1–2 | all | scooter/car | wood | C* × 2.0 | place planks; tutorial: one plank, $20 |
| 1 (2) | 2–3 | all | scooter/car | + steel | × 1.6 | steel is strong but costs more (a car over 3 cells needs it) |
| 2 (3) | 4–5 | all | car/van | + pillar | × 1.3 | wood can't span 4: add a pillar (check: plain wood fails) |
| 3 (4) | 3–5 | all | truck | + triangle | × 1.5 | heavier load: steel, more pillars or triangles all work |
| 4 (5) | 4–5 | all | truck | all | × 1.15 | all-steel costs more than B → wood + triangles (checked) |
| 5 (6) | 5–6 | deep in the middle 2–3 cells | van/truck | all | × 1.3 | long span, no middle pillar → braced steel/wood (no valid design uses a deep pillar) |
| 6 (7) | 5–6 | mixed | bus | all | × 1.25 | ≥ 2 different designs fit (checked) |
| 7 (8) | 4–6 | mixed | truck/bus | all | cheapest fix | improve: a pre-built bridge fails exactly the load rule in one span |
| 8 (9) | 6 | mixed | bus | all | × 1.1 | cheapest combines pillars + wood + triangles; no pillar-free or all-steel design fits |

C* = the solver's cheapest valid cost; budgets round up to $5 ($20–$300 voiced).

## 6. Interaction
- **Board:** side view of the river. Ground cells have an earth mound (shape, not just colour); deep cells show water lines. Empty gaps show a dashed deck slot. Top bar: the load sign (vehicle + weight) and Budge's budget bar ($ spent / left; striped orange and "Over by $N" when over; a live region; tap to hear the budget).
- **Building, all equal:** drag a piece from the tray onto a gap; tap a piece (it lifts) then tap gaps (tap again to take it off); tap a gap first, then pieces; keyboard: Tab to a gap, ←/→ move, 1–4 = the tray's pieces (press again to remove), 0/Delete clears, Enter on a piece picks it up, Enter on a gap places it. Every gap is a `<button>` labelled like "Gap 3 of 4, solid ground below, pillar, wood deck, triangle brace. Press to…".
- **Test:** the vehicle drives cell by cell; each span dips by up to 12 units in proportion to load ÷ capacity. A weak span bends down 34 units as the front wheels touch it, Brix says "That span is bending", and the vehicle backs off to the bank (no fall, no crash, no scary sound). Then a badge per span: a green circle with a check and "holds 6", or an orange rounded square with a sag mark and "holds 2" / "too long". Results are also a text list for screen readers.
- **Reduced motion:** no driving or tweening; the result appears at once (vehicle on the far bank, or on the start bank with the weak span shown bent), the same badges, no loops (glow, ghost and Test pulses off).

## 7. Feedback and hints (never punished)
- **First miss:** the weak span keeps glowing and its badge stays; Budge pops in with a line chosen from the miss (spec §4.5): pillar in deep water → `bb.hint.ground`; triangles on part of a weak span → `bb.hint.brace`; a span that bends → `bb.hint.span`; strong but over budget → `bb.hint.budget`; at level 7, changing parts that never sagged → `bb.hint.improve`. The budget bar always shows money left.
- **Second miss (model):** pieces that agree with the solver's design stay, the rest go, and a ghost of that design appears cell by cell (purple dashed pieces); the child taps each glowing gap to build it (errorless), then tests. At level 7 the ghost is the given bridge plus the cheapest fix of the weak span.
- **Praise** names the process used: triangles (`bb.praise.1`), short spans with pillars (`.4`), a cheaper part that does the job (`.5`), fixing just the weak part (`.3`), else "Under budget and strong enough!" (`.2`).

## 8. Misconceptions targeted
| Misconception | Where it shows | Response |
|---|---|---|
| the strongest material is always best | steel everywhere at levels 1, 4, 8 is over budget | budget hint; budget bar |
| a longer plank is just as strong | wood over 4 cells; long unsupported spans | the span bends; span hint; badges show "holds 1" |
| you can build anywhere | pillar in deep water (levels 5–8) | the pillar tilts and holds nothing; ground hint |
| triangles anywhere help | triangles on part of a span | brace hint ("cover the whole span") |
| failure means start over | rebuilding at level 7 | improve hint; the budget only covers a fix |
| there is one right design | — | any valid design passes; level 6 guarantees several |

## 9. Voice
41 line ids (prefix `bb.`), 109 clips: story 10, prompts 4 (+ test), test results 3, budget 1 (57 amounts), praise 5, retry 1, hints 5 + model 2, helper 6, idle 1, intro/back 2. Vehicles vary over scooter, car, van, truck, school bus. Clips are rendered by the lead (Kokoro af_bella).

## 10. Tests
- `tests/unit/budget-bridge.test.ts`: the model and tables; the grader against an independent brute-force rule check on every design of three small sites (and that many different designs pass); fast solver = exhaustive solver; every level × 50 seeds lints, is solvable within budget and meets its level check; level 7 fails exactly one rule with a fix that fits; determinism; params round trip; editing; diagnosis → lines; praise; engine ladder; voice coverage of every vehicle and budget.
- `e2e/budget-bridge.spec.ts`: story → tutorial hand → a full round by tap-tap, drag, gap-first and keyboard → outro → Bridge Builder + level up; first miss (helper, glow, vehicle backs off) and second miss (ghost, errorless); over-budget miss; levels 1, 3, 5, 7, 8 by different inputs; no overflow at 390×844, 915×412, 1024×1366, 1280×800 with screenshots in `/home/claude/review/budget-bridge/`.
