# Curriculum Framework

## Structure
Subject → Strand → **Skill** (id, objective, prerequisites, exercise types, difficulty bands, mastery criteria) → Exercises (data).

## Mathematics · Number sense · Counting (ages 4–6) — implemented
| Skill id | Objective | Prerequisites | Exercise types | Difficulty bands |
|---|---|---|---|---|
| `math.count.one-to-one` | Touch each object exactly once while saying one number per object | rote counting to 5 | tap-count | 1: 1–3 |
| `math.count.cardinality` | Know the last number counted tells how many | one-to-one | tap-count + "how many?" | 2: 4–5 · 3: 6–7 · 4: 8–10 |
| `math.count.subitize` | Recognise 1–5 at a glance; use ten-frame structure for 6–9 | one-to-one | choose-count (scatter, ten-frame) | 1–4 |
| `math.count.make-set` | Count out N from a larger group and stop ("give me N") | cardinality | make-set | 1: 2–3 of 5 · 2: 4 of 7 · 3: 5 of 8 · 4: 7 of 10 |

Content: 20 exercises (8 at level 1 so a struggling child can complete a full round on easy items; 4 at each of levels 2–4).

## Mastery criteria
- **Milestone 1 (implemented, per round):** progression rules R1–R6 (GAME_ENGINE.md). Tallies per skill (attempts, first-try, completed) are stored anonymously.
- **Phase 4 (planned, evidence-informed):** a skill is *mastered* when, across ≥2 separate sessions, ≥4 of the last 5 items are correct with at most one hint, using varied objects (Vlach & Sandhofer 2012 on varied/spaced practice). Each session opens with 1–2 review items from earlier skills (retrieval practice; evidence in young children still emerging — treat as hypothesis).
- Speed is never used as a mastery signal.

## Instructional design rules
- Demonstrate → do together → do alone: tutorial pointer on the first exercise; count-along hints model the strategy; modelled answer still requires the child's tap (errorless).
- Feedback is richest early in a skill; fade it as accuracy rises (Phase 4; Fyfe & Rittle-Johnson 2015).
- Distractors are ±1 of the target (plausible counting errors).
- Language: ≤12 words, concrete nouns, one instruction per line.

## Milestone 2 games
| Game | Skill id | Objective | Levels |
|---|---|---|---|
| Glow Cave Hops (5–7) | `math.add.number-line` | Addition as moving forward on an evenly spaced number line; counting on | L1 0–5, 1–2 hops · L2 0–10, 2–4 · L3 0–10, 3–6 · L4 0–20, 4–9 |
| Sky Balloon Race (6–8) | `math.add.within-20` | Add within 20 by counting on from the larger number and making ten | L1 ≤5 · L2 ≤10 · L3 bridging ten · L4 ≤20 |
| Cookie Kitchen (7–9) | `math.div.share-equally` | Share a quantity equally into groups (early division) by dealing one at a time | L1 2 groups ≤8 · L2 2–3 ≤12 · L3 3–4 ≤16 · L4 4–5 ≤20 |

## Maths journey worlds: Bubble Bath, Bobbo's Bakery, Lighthouse Night
Topics (new ones declared): `math.measure` Measuring and comparing (in the bubble-bath pack) · `math.geom` Geometry and measure, `math.solve` Problem solving (both in packs/library-math). Lighthouse Night is still on its branch; the topics below are its topics after integration (skill ids unchanged).

Mastery uses the Phase 4 rule above (still a hypothesis) and counts only items from the level shown upward (0-based world levels), so the scaffolded early forms never count towards mastery. No answer is timed.

| Skill id | Title | Topic | Ages | Prerequisites | World | Mastered on | Main misconceptions |
|---|---|---|---|---|---|---|---|
| `math.count.compare` | More, fewer, the same | `math.counting` | 3–5 | one-to-one | Bubble Bath (3–4), More or Fewer, L2–7 | L6+: includes "same" and the long-line trap | answers "more" to "fewer"; longer line = more (conservation); a row that looks longer when the groups are equal |
| `math.count.sequence` | Numbers in counting order | `math.counting` | 3–5 | none | Bubble Bath, numbered Bubble Parade, L4–7 | L7: numerals 1–5 without dots | pops in reading order (left to right); skips a number |
| `math.measure.order-size` | Ordering by size | `math.measure` | 3–5 | none | Bubble Bath, Size Line, L3–7 | L7: 4 pieces, plain spaces, ≈1.2× size steps | biggest first; ends right, middle swapped (compares with one neighbour only) |
| `math.mult.arrays` | Multiplication with arrays | `math.division` | 7–10 | div.share-equally | Bobbo's Bakery (9–11), Tray Arrays, L0–9 | L3+: facts to 12 × 12, plus build | adds rows and row length; counts one row or column; swaps rows and columns; neighbouring fact |
| `math.div.missing-factor` | Division as a missing factor | `math.division` | 8–11 | mult.arrays | Bakery, Tray Arrays (missing), L1–9 | L1+, both "n rows" and "rows of n" | subtracts, adds or multiplies the known factor; off by one |
| `math.geom.area-perimeter` | Area and perimeter | `math.geom` | 8–11 | mult.arrays | Bakery, Tray Builder, L2–9 | L5+: no grid, missing side, L-shapes | area/perimeter swapped; adds two sides; counts only edge tiles; L-shape notch not removed |
| `math.frac.of-amount` | A fraction of an amount | `math.frac` | 9–11 | mult.arrays, frac.unit-on-line | Bakery, Batch Fractions, L4–9 | L5+: no boxes drawn | takes one group only; divides by the numerator; no division; gives the remaining part |
| `math.solve.bar-model` | Word problems with bar models | `math.solve` | 9–12 | mult.arrays | Bakery, Bar-Model Orders + Order Sheet, L6–9 | L8+: whole unknown, "how many more", inverse comparison | one step only; adds everything (keyword reading); "times as many" read as "more"; total instead of difference |
| `math.geom.angles` | Angle facts | `math.geom` | 11–14 | shape.attributes | Lighthouse Night (12–14), Beam Angles, L0–8 | L7+: parallel lines, "which fact?", isosceles | full turn vs straight line; vertically opposite vs neighbour; equal vs supplementary on parallels; isosceles not halved |
| `math.geom.bearings` | Three-figure bearings | `math.geom` | 12–14 | geom.angles | Lighthouse, Beam Angles (compass, dial), L3–8 | L3+, both bearing and back bearing | gives the marked angle; measures anticlockwise (360 − b); back bearing as same or 180 − b |
| `math.geom.pythagoras` | Pythagoras' theorem | `math.geom` | 13–14 | geom.angles | Lighthouse, Ladder & Tower, L3–8 | L7+: shorter side, 1 d.p., converse | adds sides; forgets the square root; adds squares for a shorter side; truncates instead of rounding; triangle inequality used as the converse |
| `math.solve.scale-ratio` | Scale and ratio | `math.solve` | 11–14 | div.share-equally | Lighthouse, Chart Scale, L1–8 | L8+: 1 : n, sharing, 1 cm : 3/5 km | divides by the scale; mixed units or wrong zeros in 1 : n; gives one part, the other share or total ÷ one ratio number |
| `math.alg.linear-graphs` | Coordinates and straight-line graphs | `math.algebra` | 12–14 | alg.one-step | Lighthouse, Ship Paths, L2–8 | L8+: four quadrants, y = mx + c, crossing and parallel lines | plots (y, x); run ÷ rise; sign errors; x-intercept or −c for the y-intercept; m and c swapped |

Reused, not new: Bubble Bath also teaches `math.shape.name`, `math.count.subitize`, `math.count.one-to-one`; the Bakery also teaches `math.frac.equivalent`, `math.frac.compare`. Every prerequisite is taught by some world (Bubble Bath keeps its prerequisites inside the world), so the daily planner never locks these worlds. Level detail, hint lines and accuracy notes: `docs/worlds/{bubble-bath,bakery,lighthouse-night}.md`.

## Next skills (Phase 6 candidates)
`math.number.numeral-match`, `math.add.within-5` (Puff/Rumble games), `literacy.letters.recognise` (Zuzu), `shapes.2d.identify` (Gloop).

## Evidence caveat
These rules are informed by the cited research (REFERENCE_RESEARCH.md §4) but BrainZippy's effectiveness has **not** been validated. Do not market learning outcomes until measured.
