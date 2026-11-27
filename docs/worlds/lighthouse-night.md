# Lighthouse Night (`lighthouse-night`)

Ages 12–14 · Maths library (`math`, island Number Hill, journey host **Bobbo**), the last stop of the Maths journey · world host **Hoot** (the Critter Crew owl, here the lighthouse keeper: an owl keeps watch at night) · helper **Ripple** (the nature host, a sea otter who swims the harbour and notices tiny things) · cameo **Bobbo** (his little boat is the last ship home) · music `cave` (the darkest existing loop; no new loop added).
Code: `src/games/lighthouse-night/`. Registry: `src/content/packs/lighthouse-night/`. Spec: `docs/curriculum/maths.md` §3 item 6 ("Lighthouse Angles", ages 9–13, angle measuring), widened here to the 12–14 end of the journey.

## Story
A storm rolls over Number Hill harbour. Hoot keeps the old lighthouse; four ships are still out at sea. His lamp, chart and compass can bring them home "with careful maths". Intro (4 beats): the storm · Hoot and the ships · lamp, chart and compass (Ripple joins) · "Will you keep watch with me?". Between lines at 2, 4, 6 exercises (the last one: "Bobbo's little boat is still out there"). Every round ends with **Last Ship Home** (Bobbo's boat). Outro (3 beats): the ships follow the beam through the rocks · "Every ship is safe in harbour. Thank you, keeper." · the Keeper's Lamp sticker. Calm mascot states only (no bouncy celebrations, no confetti) for this age.

## Objective and skills
"Guide ships home on a stormy night with maths."

| Skill (id) | Topic (existing) | Ages | Inner game | Child can… |
|---|---|---|---|---|
| `math.geom.angles` (planned id, maths.md §2) | `math.shape` | 11–14 | Beam Angles | find missing angles: straight line 180°, round a point 360°, vertically opposite, triangle sum (and isosceles), corresponding / alternate / co-interior on parallel lines; name angle types incl. reflex |
| `math.geom.bearings` (new) | `math.shape` | 12–14 | Beam Angles | write three-figure bearings clockwise from north; back bearing = ±180° |
| `math.geom.pythagoras` (planned id) | `math.shape` | 13–14 | Ladder & Tower | hypotenuse; a shorter side; round to 1 d.p.; the converse |
| `math.solve.scale-ratio` (new) | `math.division` | 11–14 | Chart Scale | map ↔ real distance with 1 cm : k km; scale as 1 : n; share in a ratio |
| `math.alg.linear-graphs` (new) | `math.algebra` | 12–14 | Ship Paths | plot points (4 quadrants), gradient, y-intercept, y = mx + c, crossing point, parallel lines |

Prerequisites outside the world (each ends by age 12, so the daily planner treats it as known for this band and never locks the world): `math.shape.attributes` → angles, `math.div.share-equally` → scale-ratio, `math.alg.one-step` → graphs (Balance Scale Island). Bearings and Pythagoras chain from angles inside the world. Unit-tested.

## The round: one stormy night
Eight items: seven from up to four inner games, mixed by the engine's variety rule (number keypad, numeric keypad/dial, choice), then **Last Ship Home**, an engine `closer` (R5a): never served early, always last, at every pace (unit-tested over 8 seeds × 9 levels × 3 paces). No mode fills more than 3 of the 7 slots; level 0 is one inner game; from level 1 at least two games, from level 4 at least three (unit-tested).

## Levels (0-based; the screen shows level + 1)
Each level adds at most three new ideas, uses all of them, and only practises ideas already introduced (unit-tested against `IDEAS` in generator.ts).

| Lv | New ideas | Slots (7) | Finale |
|---|---|---|---|
| 0 | **Beam**: angles on a line (tutorial, pointing hand on x), round a point, angle types | line ×3 (2 parts; 3 parts with a right angle), point ×3 (3 beams), types | two equal angles on a line: x = (180 − a) ÷ 2 |
| 1 | vertically opposite · triangle sum · **Chart**: cm → km (whole cm, 1 cm : 2 km) | vert ×2, tri ×2, real, line (3 parts), point (4 beams) | exterior angle → inside angle → triangle |
| 2 | parallel lanes (F, Z, C) · **Ladder**: hypotenuse (triples) · km → cm | par ×2, hyp ×2, map, tri, real (half cm) | exterior angle |
| 3 | three-figure bearings (keypad) · back bearings (beam dial) · **Grid**: plot (0–8) | bread ×2, bback, plot, hyp, par (all three), map | back bearing (dial) |
| 4 | a shorter side · gradient (positive) · y-intercept | leg ×2, grad, icpt, plot, bback, real | back bearing / chart + Pythagoras |
| 5 | sharing in a ratio · "which angle fact?" · lengths to 1 d.p. | share ×2, reason, round, icpt, bread, grad | back bearing / chart + Pythagoras |
| 6 | y = mx + c · negative and ½ gradients · four quadrants | eqn ×2, grad, plot, round, reason, share | + course line through two points |
| 7 | scale as 1 : n · the converse · isosceles triangles | conv ×2, ratio, tri (iso), icpt, bback, leg | back / chart / course |
| 8 | where two paths cross · parallel paths · scales 1 cm : 3 or 5 km | para ×2, meet, real, round, bread, tri (iso) | exterior / back / chart / course |

Number ranges: angles in 5° steps (25–155° on lines, 40–200° round a point, 30–150° crossings, triangle angles ≥ 20°), parallel-lane beam 40–75° (mirrored at random); bearings 15–75° from N/E/S/W (never just "N, clockwise"); back bearings 20–340° (not 180°), dial in 5° steps; Pythagorean triples up to 20-21-29 m; rounding items use whole sides 2–15 with the exact value at least 0.008 from a rounding tie; chart routes 1.5–9.5 cm (drawn true to the scale bar); ratios 1:2 … 4:5 with whole shares; grid lines with |c| ≤ 4 through two lattice points. No timers anywhere.

## Inner games and why this interaction
- **Beam Angles.** The lamp's beams make the angles: rays along the straight harbour wall, beams all round the lamp, two crossing beams, the lighthouse–buoy–ship triangle (drawn to scale from its angles), and the beam crossing two parallel shipping lanes (arrow-marked). Unknown angles are gold with "x"; after the answer or in the model they show their value. Bearings: a compass round the lighthouse with the marked angle from N, E, S or W; the display pads to three figures. **Back bearings are answered by turning the beam** (drag it round the compass, ±5°/±30° buttons, or arrow keys / Page Up/Down on the dial) and pressing Shine; the hidden ship appears in the beam when it's right.
- **Ladder & Tower.** Side view of the tower; a ladder to the lamp-room window, a rope to the jetty ring, a storm wire on the mast, or the keeper's line of sight to a rowing boat; right angle marked, unknown side "?". Keypad always has the decimal point. The converse is a lamp-room bracket (sides in cm) with "?" at the corner.
- **Chart Scale.** Hoot's original chart of a made-up sound (Gull Rock, Kelp Point, Seal Island, Lantern Quay, Old Pier, Bell Buoy), labelled **"Fictional chart · not for navigation"** on the chart and in every description. The route is drawn true to the scale bar with a tick each centimetre. Sharing uses a bar model on Hoot's supply card (the share asked for is highlighted).
- **Ship Paths.** A harbour grid (0–8, later −6–6). Plot: move the marker buoy (drag, tap a grid point, ←↑↓→ buttons, arrow keys) and Drop buoy; after a miss the last drop is ghosted. Gradient and intercept: keypad with minus and decimal point. Equations, crossing points and parallel paths: choose.
- **Last Ship Home.** Bobbo's boat waits by the rocks in the corner of the picture; the finale borrows the board of the game its maths comes from and needs two steps; when it's right the boat sails off along the beam.

## Misconceptions → first-miss hints (Ripple)
Every typical wrong answer is *submittable* (keypads accept any digits, decimals and the minus sign where the game uses them; the dial and buoy reach every position) and maps to its own line (`diagnose()` in hints.ts; unit-tested for every generated item). Anything else falls back to the method explanation. The fact card (`methodFor`) appears on the board with the first miss.

| Game | Wrong answer | Misconception → hint |
|---|---|---|
| Line | 360 − rest · the given angle · 90 − a · the sum of the known | full turn instead of half · "the two are equal" · right angle instead of straight · stopped after adding |
| Point | 180 − rest · the sum | straight line instead of full turn · stopped after adding |
| Crossing | 180 − a (asked opposite) · a (asked neighbour) · 360 − a | opposite/neighbour mixed up |
| Triangle | 360 − sum · the sum · isosceles: 180 − apex (no halving) · 180 − base (forgot the other base angle) | |
| Parallel | 180 − g (F/Z) · g (C) · 360 − g | equal vs supplementary mixed up |
| Types / which fact | reflex vs obtuse · right angle · F/Z/C vs vertically opposite | follow the arc, not the gap; trace the letter shape |
| Bearings | the marked angle · the other side of the compass point · 360 − b (anticlockwise) | |
| Back bearing | same bearing · 360 − b · 180 − b | |
| Pythagoras | a + b · a² + b² (no root) · |b − a| · √(c² + a²) for a shorter side · truncated / whole-number rounding | adding sides; wrong side as hypotenuse |
| Converse | "6 + 8 > 10" · "can't tell without measuring" | triangle inequality isn't the test; the converse works from sides |
| Scale | cm ÷ k · cm + k · cm (no scale) · km × k | |
| Scale ratio | 1 : 2 000 / 1 : 20 000 · 1 : 2 | km → cm zeros; mixed units |
| Ratio share | one part · the other share · half · total ÷ one ratio number | |
| Plot | (y, x) · sign of x · sign of y | |
| Gradient | run ÷ rise · sign · rise only · the intercept | |
| Intercept | the x-intercept · the gradient · −c | |
| y = mx + c | m and c swapped · sign · 1/m · wrong c | |
| Crossing point | (y, x) · a y-intercept · (−x, y) | |
| Parallel | −m · same intercept | |
| Finales | (180 − a) not halved · one step only · used the outside angle · forgot the scale · added the legs | |

Second miss: the worked model on the board (`modelSteps`, one line per runner step) and the answer filled in to confirm (keypad digits, dial turned, buoy placed, option pulsing); diagrams show the value / rise-run step / intercept / crossing point. Praise names the process ("You counted the parts first. That's the key to ratios."), never speed or ability.

## Accuracy notes
- Angle facts, triangle sum, F/Z/C rules, three-figure bearings (clockwise from north; back bearing ±180°), Pythagoras and its converse, 1 km = 100 000 cm, y = mx + c: standard KS3 / CCSS grade 7–8 content (7.G.B.5, 8.G.A.5, 8.G.B.6–7, 7.RP.A.2, 8.EE.B.5–6, 8.F.A.3). UK terms are used ("co-interior", "vertically opposite"); US equivalents are "same-side interior" and "vertical angles" (review flag).
- Rounding to 1 d.p. shows the exact surd (√74 m) next to the rounded length, so "exact vs rounded" is visible in the model.
- The chart, its places and its scale are fictional; no real coastline or navigation symbol set is imitated. Ships and the lighthouse are original drawings.
- Objectives (grown-up text) are constant per mode and never contain the item's answer (unit-tested).

## Review flags
1. **Topic placement:** the three geometry skills sit under `math.shape` ("Shapes", the only geometry topic so far). A `math.geom` topic (planned in maths.md §1) would be a cleaner home; it needs an owner decision because topic ids are permanent. Parallel journey agents may add the same skill ids; check for duplicates at merge.
2. `math.geom.pythagoras` is 13–14 (8th grade / Year 9) and unlocks at level 2; a 12-year-old meets it after two good rounds. Curriculum review welcome on whether to move Ladder & Tower to level 3.
3. Music `cave` was chosen as the darkest loop; a "night sea" loop would fit better (audio-designer).
4. Voice: 148 lines in `voice.json` (speakers hoot, ripple, narrator); clips not rendered (main agent renders).
