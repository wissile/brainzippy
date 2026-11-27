# Bobbo's Bakery (`bakery`)

Maths library (Number Hill, host Bobbo), ages **9–11**: the age-10 stop of the Maths journey between Cookie Kitchen /
Rumble's Sleepy Trail (7–9) and Balance Scale Island (11–13). Host Bobbo, helper Puff (both Critter Crew). Music:
`kitchen`. Sticker: **Head Baker's Hat**. Spec roots: `docs/curriculum/maths.md` §3 — Puff's Array Garden (arrays),
Gloop's Room Builder (area/perimeter) and Bar-Model Bakery (bar models) — merged into one bakery with five inner games,
so a single world covers the age-10 band instead of three thin ones (improvement on the spec: one setting, one story,
mixed practice across topics within a round).

## Objective
Use arrays for multiplication facts to 12 × 12 and for division as a missing factor; find the area and perimeter of
rectangles and L-shapes; find a fraction of an amount, show equivalent fractions and compare fractions; solve two-step
word problems by drawing them as bar models. Aligned with Common Core 3.OA.A.1–4, 3.OA.C.7, 3.MD.C.7, 3.MD.D.8,
4.MD.A.3, 3.NF.A.3, 4.NF.A.1–2, 4.NF.B.4 (fraction of a whole number), 4.OA.A.2–3 (multiplicative comparison, multi-step
problems). Alignment is a design reference, not an efficacy claim.

| Skill | Topic (existing) | Inner game |
|---|---|---|
| `math.mult.arrays` (new) | `math.division` | Tray Arrays: count, build, facts |
| `math.div.missing-factor` (new) | `math.division` | Tray Arrays: equal rows |
| `math.geom.area-perimeter` (new) | `math.shape` | Tray Builder |
| `math.frac.of-amount` (new) | `math.frac` | Batch Fractions: fraction of an amount |
| `math.frac.equivalent` (reused, Sleepy Trail) | `math.frac` | Batch Fractions: cakes |
| `math.frac.compare` (reused, Sleepy Trail) | `math.frac` | Batch Fractions: which is more |
| `math.solve.bar-model` (new) | `math.algebra` | Bar-Model Orders + the Festival Order Sheet |

New skills sit under existing topics (no new topic). Prerequisites: `math.div.share-equally` (Cookie Kitchen),
`math.frac.unit-on-line` (Sleepy Trail) and this world's own `math.mult.arrays` — every prerequisite is taught by a
world, so the daily planner never locks the bakery.

## Story ("The festival order", 4 + 3 beats, between lines at 2, 4, 6)
1. Tomorrow is the island festival, and Bobbo's Bakery just got its biggest order ever. (shop front)
2. Bobbo: too much for one baker! (the order scroll drops in)
3. Puff knows a baker's secret: neat rows, fair slices, draw the order first.
4. Bobbo: will you be my head baker? (the hat drops in)
Between: the first trays are in the oven · halfway, the cart waits · nearly done, the order sheet next.
Outro: every tray full, every line ticked · "You planned each batch step by step" · the festival cart rolls out → sticker.

## Five inner games
| Game | Kinds | Interaction (tap · keyboard · drag) | Answer |
|---|---|---|---|
| **Tray Arrays** | `count`, `build`, `fact`, `missing` | keypad / number keys; build: rows + in-each-row steppers, arrow keys, or drag across the tray; missing: stepper, arrow keys, drag along the tray, or keypad | number (build = rows × 100 + columns) |
| **Tray Builder** | `area`, `perim`, `make`, `lshape` | keypad; make: height stepper, arrows, drag the top edge, or keypad | number |
| **Batch Fractions** | `of`, `equiv`, `cmp` | of: keypad (tap boxes to ice them as an optional tool); equiv: tap/drag across slices, stepper or arrows; cmp: three buttons | number / choice |
| **Bar-Model Orders** | `pw`, `cmpb`, `mulb`, `timesb`, `fracb` | place number tags on the bars (tap tag → tap bar, Enter on each, or drag), then keypad | number |
| **Festival Order Sheet** (closer) | `order` | tap a line (or ↑/↓) and type its value as working, then the total; Check submits the total | number |

The order sheet is an engine R5a `closer`: every band has one, it is never served before the round's last slot and is
always the last item. Lines draw on the games unlocked so far (rows of cookies, boxes, a brownie slab's squares, a
fraction of a batch, bags plus extras).

## Levels (0-based; the screen shows level + 1). maxLevel 8, band = 8 items, slot 7 = order sheet. No time pressure.
Slot 0 is the level's new idea; slots 1–6 rotate by the band seed (so fast players meet different review games).

| Lv | New ideas | Slots 0–6 | Parameters |
|---|---|---|---|
| 0 | count in rows, build r rows of c, ×2 ×5 ×10 (tutorial: build 2 rows of 3, hand on "+ row") | count, build, fact, count, build, fact, count | rows 2–4, row length 2–5 (rows ≠ length); facts one factor ∈ {2, 5, 10} × 2–6; order: rows + boxes |
| 1 | missing factor (both "n rows" and "rows of n") · ×3 ×4 | missing, fact, build, missing, count, fact, missing | known 2–5, unknown 2–6; facts {3, 4} × 2–10; build up to 5 × 8 |
| 2 | area by tiles, perimeter on the grid · ×6–×9 | area, perim, fact, area, missing, perim, area | sides 3–6 × 2–5 (tiles drawn); facts {6–9} × 3–9; order: rows + brownies |
| 3 | build a tray to an area (missing side) · area and perimeter from side lengths · facts to 12 × 12 | make, area, perim, fact, make, missing, perim | sides 4–9 × 3–8, no grid; perimeter shows two sides (opposite sides equal) |
| 4 | fraction of an amount (boxes drawn) · compare (same numerator or same denominator) | of, cmp, of, area, cmp, fact, of | denominators 2–5, amount ≤ 30; cakes drawn; order: boxes, fraction, brownies |
| 5 | equivalent fractions on a cake · L-shaped trays · fraction of an amount without boxes | equiv, lshape, of, equiv, cmp, lshape, missing | halves/thirds/quarters → ×2/×3 slices (≤ 12); L 5–8 × 4–7, notch ≥ 2; compare adds equal pairs |
| 6 | bar models: part–whole two-step · "more than", then altogether | pw, cmpb, pw, equiv, cmpb, lshape, of | totals 40–99; parts 10–30 |
| 7 | equal trays + extra · times as many (altogether / how many more) · fraction of a bar · covered cakes | mulb, timesb, fracb, pw, mulb, cmp, make | 3–9 per tray × 3–6 + extra; 4–12 × 2–4; compare cakes covered until a miss; order: bags + fraction + rows |
| 8 | festival rush (mixed, hardest) | timesb, lshape, fracb, equiv, fact, cmpb, missing | facts 6–12 × 6–12; L up to 12 × 10; equivalent fractions both ways (6/8 = ?/4); "that is m more than Puff" (find the smaller first); totals 100–200; compare with ½ as a benchmark |

Guards (unit-tested over every level × 50 seeds): area never equals perimeter for the same tray ((w−2)(h−2) ≠ 4) so the
two answers can't coincide; rows ≠ row length in count/build; every fraction-of-amount and equivalent answer is whole;
L-shape parts are at least 2 wide; bar-model "left"/"Puff" parts are ≥ 5 (≥ 8 for "more than Puff"); order totals < 200;
every answer ≤ 4 digits; no objective string contains its answer.

## Misconceptions → first-miss hints (diagnosed from the wrong answer; `logic.ts mistakes()`, `hints.ts hintFor()`)
Keypads take up to 4 digits so each of these can be typed and reach the diagnosis (e.g. 42 × 6 = 252 for 42 ÷ 6).
| Kind | Wrong answer | Line |
|---|---|---|
| count / fact | rows + length (added) · one row · one column · a row too many/few · a neighbouring fact | `bk.hint.added`, `oneRow`, `oneCol`, `rowOff`, `neighbour` |
| build | rows and columns swapped · right total, wrong shape · rows off · columns off | `swap`, `sameTotal`, `rowsOff`, `colsOff` |
| missing | total − known · total + known · total × known · ±1 | `subtracted`, `addedDiv`, `multiplied`, `offByOne` |
| area | the perimeter · width + height · only the edge tiles | `perimeter`, `addedSides`, `edgeTiles` |
| perim | the area · two sides only · edge squares (corners once) · three sides | `area`, `half`, `edgeSquares`, `threeSides` |
| make | the height that gives that *perimeter* · area − width | `perimeter`, `subtracted` |
| lshape | the whole box (notch not removed) · one rectangle · the perimeter · notch added | `box`, `onePart`, `perimeter`, `addedNotch` |
| of | one group only · divided by the numerator · no division · the un-iced rest · subtracted a number | `onePart`, `byNum`, `noDivide`, `rest`, `subNum` |
| equiv | same number of slices · added the same to top and bottom · the un-iced rest | `sameTop`, `addSame`, `rest` |
| cmp | bigger denominator = bigger · fewer same-size slices · "same" when not · not same when equal · benchmark ½ | `cmp.bigDen`, `cmp.smallNum`, `cmp.notSame`, `cmp.isSame`, `cmp.half` |
| bars | one step only · "sold" not "left" · added everything · forgot the "more" part · counted it twice · who has more · trays added not multiplied · forgot the extra · extra on every tray · times-as-many added · Bobbo only · total instead of difference · the fraction part not the rest | `oneStep`, `sold`, `addAll`, `forgotMore`, `moreTwice`, `oneStepPuff`, `whoHasMore`, `addedGroups`, `forgotExtra`, `extraEach`, `wrongGroups`, `oneStepTimes`, `addedTimes`, `bobboOnly`, `total`, `part`, `subNum` |
| order | one line worked the wrong way (rows added, boxes added, brownie perimeter, fraction not divided, extras forgotten) · a line left out | `lineTray`, `lineBoxes`, `lineBrownies`, `lineFrac`, `lineExtra`, `missedLine` |
Any other miss gets the inner game's method line (`bk.help.<kind>`). The board adds a visual strategy on the first
miss: row counts at row ends; the fact split into friendlier facts (7 × 8 = 7 × 5 + 7 × 3); tiles appearing; all four
sides labelled and unit steps dotted round the edge; the L's dashed cut; muffin boxes appearing; matching slice groups
outlined on the cakes; covered cakes uncovered; order lines ticked / marked "check again".
Second miss: the worked steps (`modelSteps`) appear one per runner step, the answer is filled in (tray / height /
slices / labels set) and only Check stays live. Bar-model tags dropped on the wrong bar slide back (not an engine miss);
after two slips the tag settles on its bar so nobody gets stuck.

## Accessibility
All controls are `<button>`s with action labels and `data-testid`s; drag is optional everywhere (tray corner/edge,
grid top edge, cake slices, number tags) with tap and keyboard equivalents (arrows for steppers and order lines, digits
and Backspace for the keypad, Enter to check). Targets ≥ 44 px (ages 9–11). Every scene has a full `a11yDescription`
(the numbers are in it). Reduced motion: no tile pop, oven glow, nudges, pulses or cart roll. Layout sweep: e2e checks
every control is on screen (x and y), ≥ 44 px, unclipped and the `elementFromPoint` at its centre, in every inner game
at start, with the helper and with the model, at 390×844, 915×412, 863×360, 1024×1366 and 1280×800.

## Voice
113 lines in `src/games/bakery/voice.json` (prefix `bk.`; speakers bobbo, puff, narrator), no `vary` (spoken prompts are
generic; numbers are on screen and in the a11y description). Clips not rendered yet — the clip-coverage unit test fails
for these lines until the main agent runs gen_voice.py.

## Accuracy notes and review flags
- "r rows of c" = r × c, rows run across (UK/US classroom convention); the build task checks the shape asked for, so
  3 rows of 5 ≠ 5 rows of 3 there (commutativity is named in the hint: "right cookies, turned sideways").
- Perimeter is in "units", area in "square tiles"; the grid is unitless (no cm claims).
- Bars are drawn roughly to scale; very small parts keep a minimum width so they can be tapped (simplification).
- Fractions compare only the same-sized whole (every cake is the same size; said in the help line).
- Compare at level 8 uses ½ as a benchmark (4.NF.A.2); earlier levels use same numerator or same denominator only.
- All quantities and names are fictional. No real brands.
- Review flags for curriculum-designer: the level-8 "that is m more than Puff" items (inverse comparison) are hard for
  some 10-year-olds; the order-sheet line values are not marked until a miss (they are working, not answers).

## Files
`src/games/bakery/{definition,generator,logic,hints,story,art,Board,Bakery}.ts(x)`, `boards/{shared,Tray,Grid,Frac,Bar,Order}.tsx`,
`bakery.css`, `voice.json` · `src/content/packs/bakery/index.ts` · `tests/unit/bakery.test.ts` · `e2e/bakery.spec.ts`.
