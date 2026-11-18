# Engineering and inventions library (`engr`)

Ages 7–16. **Host:** Brix (new; a round, steel-navy beaver-monster in a safety-yellow hard hat whose flat tail doubles as a measuring ruler, see `CHARACTERS.md`). Cameos: Gloop (shapes), Loopi (robot code), Dabble (science), Budge (budgets).
**Aligned with:** NGSS **Engineering, Technology and Applications of Science (ETS1)**, the engineering design performance expectations:
- K-2-ETS1-1 (define a simple problem), K-2-ETS1-2 (sketch/model a solution), K-2-ETS1-3 (compare two designed objects);
- 3-5-ETS1-1 (define a design problem with criteria and constraints), 3-5-ETS1-2 (generate and compare multiple solutions), 3-5-ETS1-3 (plan fair tests and identify failure points);
- MS-ETS1-1 (criteria and constraints precisely), MS-ETS1-2 (evaluate competing designs systematically), MS-ETS1-3 (analyse test data to combine the best features), MS-ETS1-4 (develop a model for iterative testing);
- HS-ETS1-2 (break a complex problem into smaller solvable problems), for ages 14–16;
- plus engineering-integrated PEs: 4-PS3-4 (device that converts energy), 3-PS2-4 (design problem with magnets), MS-PS2-1 (design using Newton's third law).
Engineering design-cycle wording (ask, imagine, plan, create, test, improve) is a common teaching model; we use our own wording.

**House rule:** all building is virtual. Structural capacities in games are **game values chosen to teach trade-offs**, not real engineering data, and the UI says so.

## 1. Topics by age band

| Ages | Topic id | Topic |
|---|---|---|
| 7–10 | `engr.design` | Define the problem, criteria and constraints; compare solutions |
| 7–10 | `engr.machine` | Simple machines: lever, ramp, wheel and axle, pulley |
| 8–12 | `engr.struct` | Structures: shapes, triangles, loads, materials, cost |
| 9–13 | `engr.circuit` | Circuits for inventions: switches, buzzers, motors, series/parallel |
| 10–14 | `engr.robot` | Robotics: sensors, actuators, control loops |
| 11–16 | `engr.mech` | Mechanisms: gears and ratios, linkages |
| 12–16 | `engr.test` | Fair tests, data, iteration, failure analysis |
| 14–16 | `engr.struct` · `engr.circuit` | Tension and compression; Ohm's law |

## 2. Skills

| skill_id | Objective (child can…) | Ages | Prereqs | Misconceptions targeted | Lowest-level example | Highest-level example | Aligned with |
|---|---|---|---|---|---|---|---|
| `engr.design.criteria` | state what a design must do (criteria) and limits (constraints) | 7–10 | — | the most expensive design is best; there's one right design | "must hold a car" vs "under $100" sort | write criteria for a new playground | K-2-ETS1-1, 3-5-ETS1-1 |
| `engr.design.compare` | compare two or more designs against criteria | 8–11 | design.criteria | the prettiest or biggest wins | which bridge meets the rules? | score 3 designs on a table | K-2-ETS1-3, 3-5-ETS1-2, MS-ETS1-2 |
| `engr.design.iterate` | use a test result to improve a design | 8–12 | design.compare | failure means start over | fix the sagging span | 3 improvement rounds with data | 3-5-ETS1-3, MS-ETS1-3, MS-ETS1-4 |
| `engr.machine.lever` | predict how fulcrum position changes the force needed | 7–10 | sci.force.push-pull | longer side always harder; fulcrum must be in the middle | move fulcrum closer to the rock | balance 2 loads with distances (3 × 4 = 6 × 2) | 3-5-ETS1-2 (context) |
| `engr.machine.ramp-pulley` | explain that ramps and pulleys trade distance for force | 8–11 | machine.lever | machines reduce work (they reduce force) | ramp vs lift straight up | 2-pulley system halves force, doubles rope | 3-5-ETS1-2 (context) |
| `engr.struct.triangle` | explain why triangles keep shape and strengthen structures | 8–12 | math.shape.name | squares are strongest; thicker always beats shape | square vs triangle frame wobble | add the fewest braces to stop wobble | 3-5-ETS1-2 |
| `engr.struct.span-load` | trade span, material, supports and cost to carry a load | 8–12 | struct.triangle, money.budget.plan (soft) | longer spans are as strong; more material always wins | short plank vs long plank | under-budget bridge for a bus over a river | 3-5-ETS1-1, MS-ETS1-1 |
| `engr.struct.forces` | identify tension and compression in members | 13–16 | struct.span-load | all parts are squeezed | rope vs pillar | label each truss member T/C | HS-ETS1-2 (context), MS-PS2-1 |
| `engr.circuit.invent` | design a working circuit for an invention (switch, buzzer, motor) | 9–13 | sci.elec.circuit | switch adds electricity; one battery per device | doorbell | alarm with 2 switches in parallel | 4-PS3-4 |
| `engr.circuit.ohm` | use V = I × R to choose components | 14–16 | circuit.invent, math.alg.one-step | more resistance = more current | 6 V, 3 Ω → current | pick a resistor for an LED (with a given forward voltage) | HS-ETS1-2 (context) |
| `engr.robot.sense-act` | connect sensors to actions with rules | 10–14 | cs.cond.if-else | robots "see" like people; one sensor knows everything | bump → turn | line-follower with 2 light sensors | MS-ETS1-4, cs E3-ALG-PS-01 |
| `engr.mech.gears` | predict speed and turning force from gear ratios | 11–16 | math.mult.arrays | bigger gear always faster; adjacent gears turn the same way | small drives big: faster or slower? | 3-gear train ratio and direction | MS-ETS1-2 (context) |
| `engr.test.fair` | design a fair test changing one variable | 10–14 | design.iterate | changing many things at once is faster | which test is fair? | plan trials and read results | 3-5-ETS1-3, MS-ETS1-3 |

## 3. World concepts (prioritised)

### 1. Brix's Budget Bridge — **first world** (ages 8–12)
- **Host:** Brix · **Helper:** Budge (keeps the budget) · **Scene:** a river valley on Monster Island where the old bridge washed away.
- **Hook:** The village's bridge washed away in a storm, and Brix has to build a new one that holds the bus without blowing the budget.
- **Interaction:** build on a grid: beams, pillars, triangle braces; load test. **Answer kind:** set-matching (rule checker; any valid build passes).
- **Levels:** see §4 (8 levels).
- **Hints:** load test shows the weakest span; budget bar. **A11y:** piece placement by buttons per grid cell.

### 2. Lever Lift (ages 7–10)
- **Host:** Brix · **Cameo:** Rumble (sleeping on the rock) · **Scene:** a boulder blocking Brix's dam path.
- **Hook:** A huge boulder blocks the dam path, and Brix has only a plank and a log.
- **Interaction:** slide the fulcrum; place weights. **Answer kind:** choice / number.
- **Levels:**
  1. fulcrum nearer the load is easier
  2. find a lifting position
  3. balance equal weights
  4. balance 2:1
  5. distance × weight rule
  6. seesaw for friends of different sizes
  7. design: pick plank length and fulcrum within limits

### 3. Ramp & Pulley Workshop (ages 8–11)
- **Host:** Brix · **Cameo:** Puff · **Scene:** a treehouse that needs supplies lifted.
- **Hook:** Puff's treehouse needs a piano, and it's very heavy.
- **Interaction:** choose ramp lengths and pulley setups; watch force and rope meters. **Answer kind:** choice / number.
- **Levels:**
  1. ramp vs straight lift
  2. longer ramp, less push
  3. fixed pulley changes direction
  4. moving pulley halves force
  5. 2-pulley system
  6. compare designs by force and distance

### 4. Tower Challenge (ages 8–12)
- **Host:** Brix · **Cameo:** Gloop · **Scene:** a windy hill and a pile of straws and connectors.
- **Hook:** The island needs a lookout tower that stands up to the afternoon wind.
- **Interaction:** build with limited pieces; wind test (rule-based). **Answer kind:** set-matching (rule check: height ≥ target, every panel braced, pieces ≤ limit).
- **Levels:**
  1. square wobbles, triangle doesn't
  2. brace a square
  3. wide base
  4. reach a height
  5. fewest pieces
  6. wind from the side
  7. compare 2 designs

### 5. Circuit Doorbell (ages 9–13)
- **Host:** Brix · **Cameo:** Dabble · **Scene:** Brix's lodge door with a broken bell.
- **Hook:** Brix's friends keep knocking and he can't hear them over the waterfall.
- **Interaction:** drag battery, switch, buzzer, light, wires; test. **Answer kind:** set-matching (rule check: closed loop through the switch and buzzer).
- **Levels:**
  1. doorbell loop
  2. light + buzzer
  3. two doors (parallel switches)
  4. series vs parallel lights
  5. motor fan
  6. find the fault
  7. (14+) Ohm's law component choice

### 6. Robo-Rover (ages 10–14)
- **Host:** Brix · **Cameo:** Loopi · **Scene:** a rocky quarry for a rover delivering lunch.
- **Hook:** Brix's rover must deliver lunch across the quarry without bumping into rocks.
- **Interaction:** attach sensors; write sense→act rules (blocks). **Answer kind:** sequence (simulation over test courses).
- **Levels:**
  1. bump → stop
  2. bump → turn
  3. light sensor follow a line
  4. two sensors
  5. stop at the goal colour
  6. pass 3 different test courses
  7. tune a threshold

### 7. Gear Garage (ages 11–16)
- **Host:** Brix · **Scene:** a clock-and-bike workshop.
- **Hook:** Brix is building a bike for steep hills and a clock that keeps time.
- **Interaction:** mesh gears; read ratios and directions. **Answer kind:** number / choice.
- **Levels:**
  1. direction flips
  2. small drives big = slower and stronger
  3. ratio as teeth
  4. 3-gear train
  5. idler gear
  6. bike gears for a hill
  7. clock hands 12:1

### 8. Invention Lab (ages 8–14)
- **Host:** Brix · **Cameo:** any Crew member with a problem · **Scene:** a lab with a whiteboard.
- **Hook:** Friends bring everyday problems (Rumble's alarm doesn't wake him; Bobbo can't reach the apples) and Brix runs the design process.
- **Interaction:** sort criteria/constraints; choose ideas; read test data; improve. **Answer kind:** set-matching / choice.
- **Levels:**
  1. what's the problem?
  2. criteria vs constraints
  3. brainstorm (any ideas accepted)
  4. pick by criteria table
  5. fair test
  6. read test data
  7. improve and retest

## 4. First world to build: **Brix's Budget Bridge**

**Why first:** the owner's example; it practises the full design loop (criteria, constraints, build, test, improve) with a concrete physical model; triangles and budget link to maths and money; the grid-building board is reused by Tower Challenge and Circuit Doorbell.

### 4.1 Objective and skills
"Child can design a bridge that meets a load requirement within a budget, using supports, materials and triangles, and improve it after testing." L0–L2 `engr.struct.span-load` (Lm 2); L3–L4 `engr.struct.triangle` (Lm 4); L5–L6 `engr.design.criteria` / `engr.struct.span-load` (Lm 6); L7–L8 `engr.design.iterate` (Lm 7).

### 4.2 Story
| Beat | Line (`bb.`) |
|---|---|
| intro1 | "Last night a big storm washed the village bridge away!" |
| intro2 | "Now the school bus can't get across the river." |
| intro3 | "Brix is an engineer. Budge holds the budget." |
| intro4 | "Build a bridge that's strong enough, and doesn't cost too much!" |
| between2 | "The scooters are crossing. Next come the cars." |
| between4 | "Triangles! Brix says they're an engineer's best friend." |
| between6 | "The river is deeper here. No pillars in the middle!" |
| outro1 | "The school bus rolls safely across!" |
| outro2 | "You tested, fixed and kept to the budget, just like a real engineer." |
| outro3 | "Here's your Bridge Builder badge!" |

### 4.3 Board and model
- Side view of a gap `G` cells wide (1 cell = 1 "plank length"). Bank tiles at both ends. Cells below the gap are **ground** (pillar allowed) or **deep water** (no pillar).
- Pieces (costs in game dollars):

| Piece | Cost | Rule |
|---|---|---|
| Wood deck (per cell) | $10 | max span 3 cells |
| Steel deck (per cell) | $25 | max span 4 cells |
| Pillar | $30 | only on a ground cell; splits the deck into segments |
| Triangle brace (per cell) | $15 | placed above a deck cell; a segment is "braced" only if every cell in it has a brace |

- **Segment capacity** (load units) for span `s` (cells between supports):

| s | Wood | Steel |
|---|---|---|
| 1 | 4 | 10 |
| 2 | 2 | 6 |
| 3 | 1 | 3 |
| 4 | — | 2 |

  Braced segment capacity = table value × 3. Mixed materials within one segment are not allowed (the board fills a segment with one material).
- **Vehicles (load units):** scooter 1, car 2, van 4, truck 5, bus 8.
- **Validation (rule checker):** deck covers every gap cell; every segment span ≤ material max span; every segment capacity ≥ vehicle load; pillars only on ground; total cost ≤ budget. Any build meeting all rules passes.
- **Load test animation:** the vehicle drives across; each segment shows a sag proportional to load ÷ capacity; segments over capacity bend down and the vehicle stops before them and reverses (no fall, no crash). Reduced motion: colour + icon per segment (OK / too weak).
- Building: tap a cell, then a piece button (or drag a piece). Keyboard: arrow keys move a cursor over cells; number keys 1–4 pick a piece; Delete removes.

### 4.4 Generator (seeded; solver-verified)
For each item: choose `G`, ground/deep pattern, vehicle, then run an exhaustive solver (G ≤ 6: each cell has deck material ∈ {wood, steel}, pillar ∈ {yes, no} if ground, brace ∈ {yes, no}; ≤ 4,096 × pruning) to get the cheapest valid cost `C*`. Set budget `B = round_up_to_5(C* × slack)`.

| Level | G | Ground pattern | Vehicle | Slack | Teaching point |
|---|---|---|---|---|---|
| 0 tutorial | 1 | — | scooter | 2.0 | place one wood deck |
| 1 | 2 | all ground | scooter | 1.6 | a 2-span wood deck holds 2 |
| 2 | 4 | all ground | car | 1.5 | wood can't span 4: add a pillar |
| 3 | 3–4 | all ground | truck | 1.5 | heavier load: steel or more pillars |
| 4 | 4 | all ground | truck | 1.15 | steel everywhere is over budget → wood + triangles (braced 2-span wood = 6) |
| 5 | 5–6 | deep water in the middle 2–3 cells | van/truck | 1.3 | long spans with no middle pillar → braces/steel |
| 6 | 5–6 | mixed | bus | 1.25 | several valid designs; any under budget passes |
| 7 | 4–6 | mixed | truck/bus | — | **improve**: a pre-built failing bridge (one segment too weak) is given; budget = current cost + fix money exactly enough for ≥1 fix |
| 8 | 6 | mixed | bus | 1.1 | tight budget; requires combining pillars, wood and braces |

Constraints (levels × 50 seeds): every item solvable within `B`; at L4 the all-steel design costs > `B`; at L5 no valid design uses a pillar in deep cells; at L7 the given bridge fails exactly one rule and the fix fits the budget.

### 4.5 Misconceptions → feedback
| Observed | Misconception | First-miss response (Budge + Brix) |
|---|---|---|
| Over budget with all steel | "strongest material always best" | `bb.hint.budget` "Strong, but too expensive. Can a cheaper part do the job?" |
| Long unbraced span fails | "a longer plank is just as strong" | `bb.hint.span` "Long spans bend more. Add a support or a triangle." |
| Pillar placed in deep water | "you can build anywhere" | `bb.hint.ground` "Pillars need solid ground, not deep water." |
| Adds braces to only part of a segment | triangles anywhere help | `bb.hint.brace` "Triangles help when they cover the whole span." |
| Rebuilds everything at L7 | "failure means start over" | `bb.hint.improve` "Only one part sagged. Fix that part." |

### 4.6 Hint ladder
- **First miss:** load test plays; the failing segment glows; the matching helper line plays; the budget bar shows money left.
- **Second miss (model):** a ghost of one valid solution (the solver's cheapest) appears cell by cell; the child taps each ghost piece to place it (errorless); then tests.

### 4.7 Helper explanations (Brix and Budge)
- `bb.help.start` (Brix) "A bridge has to be strong enough and cheap enough. Engineers balance both."
- `bb.help.support` (Brix) "Pillars make spans shorter, and shorter spans are stronger."
- `bb.help.triangle` (Brix) "Triangles don't squish out of shape. That makes them super strong."
- `bb.help.material` (Brix) "Steel is stronger than wood, but it costs more."
- `bb.help.budget` (Budge) "This is all the money we have. Let's spend it wisely."
- `bb.help.test` (Brix) "Test it, watch where it sags, then improve that part."

### 4.8 Voice lines (prefix `bb.`; ≈45 ids)
Prompts: `bb.prompt.build` "Build a bridge for the {vehicle}. Budget: {amount}." · `bb.prompt.deep` "The middle is too deep for pillars." · `bb.prompt.improve` "This bridge sagged. Can you fix it?" · `bb.prompt.test` "Ready? Let's test it!"
Test: `bb.test.pass` "It holds! The {vehicle} is across." · `bb.test.sag` "That span is bending. Let's make it stronger."
Praise: `bb.praise.1` "You used triangles to make it strong!" · `bb.praise.2` "Under budget and strong enough!" · `bb.praise.3` "You fixed just the weak part." · `bb.praise.4` "You planned short spans, and they made it stronger."
Retry: `bb.retry.1` "Let's look at where it bent." · Idle: `bb.idle` "Tap a gap to add a piece."
Story 10, helper 6, hints 5. Variables: vehicle (5), amount ($30–$300 in $5 steps, ≈55). **Estimate ≈ 45 ids, ≈ 120 clips.**

### 4.9 Reward
Sticker **"Bridge Builder"**: a round badge with a tiny triangle-truss bridge and Brix's hard hat.

### 4.10 Accessibility
Every grid cell is a button with a label ("Gap cell 3, ground, wood deck, braced"); the budget is a live region; test results also as a text list per segment.

## 5. Accuracy notes
- Capacities, costs and spans are invented teaching values; UI label: "Game numbers. Real bridges are designed by engineers using real measurements."
- Concepts that are true and taught: shorter spans carry more load; supports split spans; triangulated trusses resist deformation; stronger materials usually cost more; designs must meet criteria within constraints.
- Ohm's law and gear ratios use standard formulas; unit-test calculations.
- An engineering educator reviews worlds before release.

## 6. Age-appropriateness and safety
- No collapses with people or animals harmed; failing vehicles stop and reverse.
- Circuits use toy batteries only; a "never play with mains electricity" note appears in parent cards.
- Real-world build suggestions on parent cards use safe household materials (paper, tape, straws) with adult supervision for cutting.
