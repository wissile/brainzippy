# Maths library (`math`)

Ages 4–14. **Host:** Bobbo (counting, existing); topic hosts Gloop (shapes), Puff (multiplication), Rumble (measuring). All existing Critter Crew.
**Aligned with:** Common Core State Standards for Mathematics (content standards + Standards for Mathematical Practice MP1–MP8). Fractions design follows the IES/WWC practice guide *Developing Effective Fractions Instruction for Kindergarten Through 8th Grade* (Siegler et al., 2010), which recommends number lines as a central representation (https://ies.ed.gov/ncee/wwc/PracticeGuide/15).
**Implemented already** (see `docs/CURRICULUM.md`): `math.count.one-to-one`, `math.count.cardinality`, `math.count.subitize`, `math.count.make-set`, `math.add.number-line`, `math.add.within-20`, `math.div.share-equally`.

## 1. Topics by age band (owner's bands)

| Ages | Topic id | Topic | Status |
|---|---|---|---|
| 4–6 | `math.count` | Counting and cardinality | implemented (Bobbo's Breakfast) |
| 4–6 | `math.shape` | 2D/3D shapes: name, attributes, compose | planned |
| 4–6 | `math.pattern` | Repeating and growing patterns | planned |
| 7–10 | `math.add` / `math.sub` | Addition and subtraction within 20 / 100 | partly implemented |
| 7–10 | `math.mult` / `math.div` | Multiplication and division as equal groups and arrays | sharing implemented |
| 7–10 | `math.frac` | Fractions as numbers on a line; equivalence; comparison | **first new world** |
| 7–10 | `math.time` | Telling time; elapsed time | planned |
| 7–10 | `math.money` | Coin and bill values; making amounts | planned (shared board with the money library) |
| 11–14 | `math.geom` | Angles, area, perimeter, volume, Pythagoras | planned |
| 11–14 | `math.alg` | Expressions, one- and two-step equations | planned |
| 11–14 | `math.solve` | Problem-solving with bar models and ratios | planned |

## 2. Skills

| skill_id | Objective (child can…) | Ages | Prereqs | Misconceptions targeted | Lowest-level example | Highest-level example | Aligned with |
|---|---|---|---|---|---|---|---|
| `math.shape.name` | name circles, triangles, squares, rectangles, hexagons in any size or orientation | 4–6 | — | a tilted square is a "diamond", not a square; only equilateral triangles are triangles | find the circle among 2 | find every triangle among 8 (thin, rotated, large) | K.G.A.2 |
| `math.shape.attributes` | sort shapes by sides and corners | 5–7 | shape.name | colour or size defines the shape | sort 3-sided / 4-sided | sort by "defining" vs "not defining" attributes | 1.G.A.1 |
| `math.shape.compose` | make a larger shape from smaller ones | 5–7 | shape.name | pieces must keep their orientation | 2 triangles → square | fill a hexagon outline 3 ways | K.G.B.6 |
| `math.pattern.repeat` | continue and complete AB, AAB, ABC patterns | 4–6 | — | copying the last item; unit not recognised | AB: next bead | find the missing middle of ABCABC_BC | MP.7 |
| `math.pattern.grow` | extend a growing pattern and state its rule | 8–10 | pattern.repeat, add.within-20 | adds the same step to each term's position | 2, 4, 6, _ | shapes that grow by +3 each step: the 6th term | 4.OA.C.5 |
| `math.sub.within-20` | subtract within 20 by counting back or thinking addition | 6–8 | add.within-20 | subtracting smaller from larger regardless of order | 5 − 2 | 15 − 8 by "think 8 + ? = 15" | 1.OA.C.6 |
| `math.add.within-100` | add and subtract within 100 using place value | 7–9 | add.within-20 | adding tens to ones | 30 + 20 | 47 + 38 with regrouping | 2.NBT.B.5 |
| `math.mult.arrays` | interpret a × b as a rows of b | 7–9 | div.share-equally (soft) | multiplication as repeated "add one" | 2 rows of 3 | 7 × 8 array, find total by splitting 7 × 4 + 7 × 4 | 3.OA.A.1, 3.OA.C.7 |
| `math.frac.unit-on-line` | place unit fractions 1/d on a 0–1 number line | 7–9 | add.number-line | counts tick marks not spaces; bigger d = bigger fraction | 1/2 with 2 marked parts | 1/8 with 8 marked parts | 3.NF.A.1, 3.NF.A.2a |
| `math.frac.on-line` | place a/d on a number line including values ≥1 | 7–9 | frac.unit-on-line | a/d read as the whole number a; reversal d/a | 2/3 with parts marked | 5/4 on 0–2 | 3.NF.A.2b |
| `math.frac.equivalent` | recognise equivalent fractions as the same point | 8–10 | frac.on-line | larger numbers = larger fraction (4/8 > 1/2) | 1/2 = ?/4 on a line | 3/4 = ?/8, then = ?/12 | 3.NF.A.3a, 3.NF.A.3b |
| `math.frac.compare` | compare fractions with the same numerator or denominator | 8–10 | frac.on-line | bigger denominator = bigger fraction | 1/4 vs 3/4 | 3/8 vs 3/5 | 3.NF.A.3d |
| `math.frac.estimate` | place a fraction on an unmarked line within tolerance | 9–11 | frac.equivalent | ignores the size of 1 | 1/2 on 0–1 unmarked | 7/4 on 0–3 unmarked | 3.NF.A.2 |
| `math.time.hour-half` | read and set times to the hour and half hour | 6–7 | count.cardinality | hour hand points exactly at the number at half past | set 3 o'clock | read half past 11 | 1.MD.B.3 |
| `math.time.five-min` | read and set times to 5 minutes with a.m./p.m. | 7–8 | time.hour-half, mult.arrays (soft) | minute hand number read as minutes (the 2 means 2 minutes) | 4:15 | 10:55 p.m. from a scene clue | 2.MD.C.7 |
| `math.time.elapsed` | tell time to the minute and solve elapsed-time problems | 8–9 | time.five-min | subtracting times as decimals (2:50 − 1:40) | start 3:00, 20 min later | 9:47 → 11:15, how long? | 3.MD.A.1 |
| `math.money.coins` | find the value of coins and bills and make an amount | 7–8 | add.within-100 | bigger coin = more value (nickel vs dime) | 3 pennies | make 87¢ with fewest coins | 2.MD.C.8 |
| `math.geom.area-perimeter` | find area by unit squares and multiplication; distinguish perimeter | 8–10 | mult.arrays | area and perimeter swapped | count squares in a 2 × 3 room | room with area 24 and perimeter 20 | 3.MD.C.7, 3.MD.D.8 |
| `math.geom.angles` | measure and draw angles; use angle facts | 9–13 | geom.area-perimeter (soft) | reads the wrong protractor scale; longer arms = bigger angle | is it more or less than a right angle? | find the missing angle on a straight line | 4.MD.C.5, 4.MD.C.6, 7.G.B.5 |
| `math.geom.triangle-area` | find area of right and other triangles by halving rectangles | 11–12 | geom.area-perimeter | uses slanted side as height | right triangle on a grid | obtuse triangle with outside height | 6.G.A.1 |
| `math.geom.pythagoras` | use the Pythagorean theorem for missing sides | 13–14 | geom.triangle-area | a + b = c; applies to non-right triangles | 3-4-? | ladder problem 5-12-? | 8.G.B.7 |
| `math.alg.expressions` | write and evaluate expressions with a variable | 11–12 | add.within-100, mult.arrays | 3x means 3 + x; variable as label ("a for apples") | n + 4 when n = 2 | 3(n + 2) when n = 5 | 6.EE.A.2 |
| `math.alg.one-step` | solve x + p = q and px = q by balancing | 11–12 | alg.expressions | do the operation shown instead of its inverse | x + 3 = 7 | 6x = 42 | 6.EE.B.7 |
| `math.alg.two-step` | solve px + q = r from word problems | 12–13 | alg.one-step | undoing in the wrong order | 2x + 1 = 7 | word problem → 4x + 15 = 63 | 7.EE.B.4 |
| `math.solve.bar-model` | represent multi-step word problems with bar models | 9–12 | mult.arrays | key-word tricks ("left" means subtract) | one-step comparison | 2-step ratio problem | 4.OA.A.3, 6.RP.A.3 |

## 3. World concepts (prioritised)

### 1. Rumble's Sleepy Trail (fractions) — **first new world** (ages 7–9)
- **Host:** Rumble · **Helper:** Gloop · **Scene:** a mossy trail from Mossy Rock (0) to Big Tree (1), later to Far Hill (2) and Cloud Peak (3).
- **Hook:** Rumble's map marks his favourite nap spots as fractions of the trail, and he needs help finding them before bedtime.
- **Interaction:** slide Rumble along the line and press "Nap here". **Answer kind:** number (exact fraction, via tick stop); numeric-tolerance on L8–L9.
- **Levels:** see §4 (9 levels).
- **Hints:** count the jumps, not the lines; Rumble walks the jumps out loud. **A11y:** arrow keys move one tick; tap a tick directly.

### 2. Gloop's Shape Squish (ages 4–6)
- **Host:** Gloop · **Scene:** jelly pond with shaped holes.
- **Hook:** Gloop must squish into the right shape to fit through each garden gate.
- **Interaction:** drag Gloop onto the matching gate; later drag shape pieces to fill an outline. **Answer kind:** choice; set-matching (compose).
- **Levels:**
  1. circle vs square
  2. 3 shapes
  3. rotated and stretched shapes (a tilted square is still a square)
  4. find all triangles among 6
  5. sort by sides
  6. two triangles make a square
  7. fill a hexagon outline
  8. fill an outline two different ways
- **Hints:** Gloop traces the sides counting "1, 2, 3 sides". **A11y:** shapes described by sides and corners; no colour-only cues.

### 3. Puff's Pattern Parade (ages 4–6)
- **Host:** Puff · **Scene:** bead necklaces on a parade float.
- **Hook:** Puff is stringing the parade necklace and someone keeps nibbling beads.
- **Interaction:** drag beads onto the string. **Answer kind:** sequence.
- **Levels:**
  1. AB next bead
  2. AB next 2
  3. AAB
  4. ABC
  5. missing middle bead
  6. same pattern with shapes instead of colours
  7. translate pattern to sounds (clap-stomp)
  8. make your own pattern and repeat it twice (rule check)
- **Hints:** Puff sings the pattern unit and boxes it. **A11y:** beads differ in shape as well as colour.

### 4. Rumble's Clock Tower (ages 6–9)
- **Host:** Rumble · **Scene:** village clock tower; events happen at set times.
- **Hook:** The tower clock stopped and the village keeps missing lunch and bedtime.
- **Interaction:** drag hands (or ±5 min buttons); read time and choose. **Answer kind:** number (minutes since midnight); choice.
- **Levels:**
  1. set o'clock
  2. read o'clock
  3. half past
  4. quarter past/to
  5. 5-minute
  6. a.m./p.m. from scene
  7. to the minute
  8. elapsed within an hour
  9. elapsed across the hour
- **Hints:** minute hand skip-counts by 5 around the edge; hour hand "creeps" between numbers. **A11y:** buttons for +1 h / ±5 min / ±1 min; time also as text.

### 5. Puff's Array Garden (ages 7–10)
- **Host:** Puff · **Scene:** vegetable garden beds.
- **Hook:** Puff plants seeds in neat rows so every bunny gets a full row.
- **Interaction:** drag to draw rows × columns; split an array with a fence. **Answer kind:** number.
- **Levels:**
  1. 2 × 3 count
  2. ×2, ×5, ×10
  3. ×3, ×4
  4. commutativity (turn the bed)
  5. ×6–×9 by splitting (distributive)
  6. missing factor
  7. two-step (rows of rows)
- **Hints:** model splits 7 × 8 into 7 × 4 + 7 × 4. **A11y:** steppers for rows/columns.

### 6. Lighthouse Angles (ages 9–13)
- **Host:** Gloop · **Cameo:** Zephy (pilot host) · **Scene:** night harbour.
- **Hook:** Ships need the lighthouse beam turned to exactly the right angle to find the harbour.
- **Interaction:** rotate the beam with a dial; place a protractor. **Answer kind:** numeric-tolerance (±2° on measured levels), number on fact levels.
- **Levels:**
  1. more or less than a right angle
  2. right, acute, obtuse
  3. turn by 90°/180°
  4. estimate within 15°
  5. measure with protractor ±2°
  6. angles on a straight line
  7. around a point
  8. vertical angles
- **Hints:** a right-angle corner card; protractor scale highlighted from 0. **A11y:** dial by arrow keys (1° / 10° steps).

### 7. Balance Scale Island (ages 11–13)
- **Host:** Bobbo · **Cameo:** Budge · **Scene:** market scales with mystery bags (x).
- **Hook:** Mystery bags of apples must be weighed without opening them.
- **Interaction:** remove equal items from both pans; split pans into equal groups. **Answer kind:** number.
- **Levels:**
  1. x + 2 = 5
  2. x + p = q to 20
  3. 2x = 8
  4. px = q
  5. 2x + 1 = 7
  6. px + q = r
  7. x on both sides
  8. word problem → equation (choice) → solve
- **Hints:** "Whatever you do to one pan, do to the other." **A11y:** buttons "remove 1 from both".

### 8. Gloop's Room Builder (area and perimeter) (ages 8–11)
- **Host:** Gloop · **Cameo:** Brix (engineering host) · **Scene:** tiled floor plans.
- **Hook:** Monster families order rooms by size, and the builder needs exact floor plans.
- **Interaction:** drag a rectangle's corner on a grid. **Answer kind:** set-matching (rule check: any rectangle meeting the spec).
- **Levels:**
  1. count area squares
  2. area = rows × columns
  3. perimeter by walking the edge
  4. given area, any rectangle
  5. given perimeter
  6. both
  7. L-shaped rooms (split)
  8. triangle halves
- **Hints:** fence posts vs floor tiles visual. **A11y:** arrow keys resize.

### 9. Bar-Model Bakery (ages 9–12)
- **Host:** Puff · **Scene:** cake shop with long cake bars.
- **Hook:** Orders arrive as word puzzles and Puff cuts cake bars to solve them.
- **Interaction:** drag bar pieces to model the problem, then enter the answer. **Answer kind:** set-matching (model) + number.
- **Levels:**
  1. part-whole addition
  2. comparison (how many more)
  3. equal parts multiplication
  4. two-step
  5. fraction of a quantity
  6. ratio 2:3 sharing
  7. ratio with a known difference
- **Hints:** the model bar is built for the child step by step. **A11y:** model pieces chosen by buttons.

## 4. First new world to build: **Rumble's Sleepy Trail**

**Why first:** fractions are the next big gap after addition and sharing (7–10 band), the IES guide recommends number lines, and the slide-on-a-line interaction can reuse the Glow Cave Hops board pattern. Rumble already exists.

### 4.1 Objective and skills
"Child can show a fraction as a point on the number line by counting equal jumps from 0." L0–L1 `math.frac.unit-on-line` (Lm 1); L2–L5 `math.frac.on-line` (Lm 3); L6 `math.frac.equivalent` (Lm 6); L7 `math.frac.compare` (Lm 7); L8–L9 `math.frac.estimate` (Lm 8).

### 4.2 Story
| Beat | Line (`st.`) |
|---|---|
| intro1 | "Rumble loves naps. Big, long, cosy naps." |
| intro2 | "His map shows nap spots on the Sleepy Trail, from Mossy Rock to Big Tree." |
| intro3 | "But the spots are fractions of the trail! One half, one third…" |
| intro4 | "Help Rumble put a pillow on every nap spot." |
| between2 | "Two pillows down. Rumble yawns." |
| between4 | "The trail goes past Big Tree now. Keep counting jumps!" (shown before L5+ rounds) / "Halfway through the pillows!" |
| between6 | "The sun is setting. Two more spots!" |
| outro1 | "Every pillow is on its spot." |
| outro2 | "You counted equal jumps from zero. That's how fractions work!" |
| outro3 | "Rumble is snoring. Here's your Trail Marker!" |

### 4.3 Board
- A horizontal trail (number line) from 0 to M (M = 1, 2 or 3) with 0 and each whole number labelled. Each unit is split into d equal parts by small posts (when shown).
- Rumble stands on a stop; drag him, tap a post, or use ←/→ (one post per press). "Nap here" submits.
- After an answer, the jumps from 0 are drawn as arcs (alongSteps = a, alongSay = "one fourth, two fourths, …").
- Layout: line spans ≥80% width; each post hit area ≥44 px (≥64 px for under-8 levels; for d = 8 on phones portrait, the line wraps into a vertical trail rather than shrinking targets).

### 4.4 Generator rules (seeded)
Item = `{ M, d, a, marks: boolean, mode }`, target value = a/d. Choices = all posts k/d, k = 0…M·d.

| Level | M | d | a | Marks | Mode | Notes |
|---|---|---|---|---|---|---|
| 0 tutorial | 1 | 2 | 1 | yes | place | pointing hand on the middle post |
| 1 | 1 | {2, 3, 4} | 1 | yes | place | unit fractions |
| 2 | 1 | {2, 3, 4, 6} | 1…d−1 | yes | place | |
| 3 | 1 | {3, 4, 5, 6, 8} | 0…d | yes | place | includes d/d = 1 (≤1 per round) and 0/d (≤1 per round) |
| 4 | 1 | {3, 4, 6, 8} | 1…d−1 | yes | name | Rumble already stands at a post; choose the card (3 cards) |
| 5 | 2 | {2, 3, 4} | 1…2d, a ≠ d·k for most items | yes | place | values above 1 (5/4, 3/2) |
| 6 | 1 | posts in 8ths or 6ths | target given as 1/2, 1/4, 3/4 (8ths) or 1/3, 2/3, 1/2 (6ths) | yes | place | equivalence: the line's partition differs from the target's denominator |
| 7 | 1 | pair shares d or shares a | — | yes | compare | place both Rumbles (two placements), then choose "farther along" |
| 8 | 1 | {2, 3, 4, 6, 8} | 1…d−1 | **no** | estimate | numeric-tolerance |
| 9 | {2, 3} | {2, 3, 4} | up to M·d | **no** | estimate | numeric-tolerance |

- **Tolerance (L8–L9):** `tol = 1 / (2 × max(d, 6))` unit lengths (d ≤ 6: ±1/12; d = 8: ±1/16). Feedback reveals the true posts after the answer.
- **Name-mode distractors (L4):** from `{(a−1)/d, (a+1)/d, a/(d+1), a/(d−1), d/a if ≤ 1 and ≠ target}`, pick 2, never equal in value to the target.
- **Compare pairs (L7):** half same denominator (a1 ≠ a2), half same numerator (d1 ≠ d2), never equal values.
- **Constraints (test over levels × 50 seeds):** a/d ≤ M; no repeated item in a round; ≤2 items with the same d in a row; L6 target denominators never equal the partition.

### 4.5 Wrong-answer diagnosis → hint choice (place modes)
| Child's stop | Likely misconception | First-miss helper line |
|---|---|---|
| (a−1)/d or (a+1)/d | counted posts instead of jumps (started counting at 0 as "one") | `st.hint.jumps` "Count the jumps, not the posts. Zero is where we start." |
| post a (whole number a or a/d with a > d) | read a/d as the whole number a | `st.hint.parts` "The bottom number tells how many equal parts make one whole trail." |
| d/a position | swapped numerator and denominator | `st.hint.topbottom` "The top number says how many jumps. The bottom says how big each jump is." |
| L7 picks larger denominator | bigger d = bigger fraction | `st.hint.bigger` "More parts means each part is smaller." |
| anything else | — | `st.hint.general` "Each jump is one {unit}. How many jumps from zero?" |

### 4.6 Hint ladder
- **First miss:** wrong stop dims; Gloop slides in with the diagnosed line; the d equal parts of the first unit flash one by one.
- **Second miss (model):** Rumble walks from 0, a jumps, each arc drawn and spoken ("one third, two thirds"); then the correct post pulses; child taps "Nap here" (errorless).
- **Estimate levels:** first miss shows halfway mark only; model shows all posts.

### 4.7 Helper explanations (Gloop)
- `st.help.start` "A fraction is a spot on the trail. Split the trail into equal parts first."
- `st.help.bottom` "The bottom number: how many equal parts in one whole."
- `st.help.top` "The top number: how many parts we walk from zero."
- `st.help.beyond` "After Big Tree, the trail keeps going. Four fourths is one whole!"
- `st.help.same` "Two halves and four eighths land on the very same spot."
- `st.help.estimate` "No posts now. Find one half first, then guess the rest."

### 4.8 Voice lines (prefix `st.`; ≈40 ids)
Prompts: `st.prompt.place` "Find {frac} of the trail!" · `st.prompt.name` "Where is Rumble? Pick the fraction." · `st.prompt.compare` "Put Rumble on {frac} and Bobbo on {frac2}. Who walked farther?" · `st.prompt.estimate` "No posts! Guess where {frac} is."
Praise: `st.praise.1` "{frac}! You counted equal jumps." · `st.praise.2` "You used the bottom number to split the trail." · `st.praise.3` "Same spot, different name. Nice noticing!" · `st.praise.4` "Great estimate, you used one half to help."
Retry: `st.retry.1` "Almost. Let's look at the jumps." · Idle: `st.idle` "Slide Rumble along the trail."
Story 12, helper 6, hints 5, along-step counting phrases.
Fraction phrases (`frac`): every a/d used, said as US terms ("three fourths", "five halves", "one whole"). ≈110 phrases. **Estimate ≈ 40 ids, ≈ 260 clips** (TTS suitable).

### 4.9 Reward
Sticker **"Trail Marker"**: a wooden signpost with a tiny pillow and Rumble's star horn.

### 4.10 Tests
Unit: fraction equality via reduced pairs (no floats); tolerance maths; diagnosis table; generator constraints. E2E: round by drag, tap, keyboard; diagnosed first-miss line appears; model walk; reward and level-up.

## 5. Accuracy notes
- Use "fourths" (CCSS wording) consistently; "quarter" only in clock contexts.
- Store fractions as integer pairs; compare by cross-multiplication. Store money as integer cents and time as minutes since midnight.
- Number lines must be exactly evenly spaced (Glow Cave Hops precedent); never compress parts to fit a screen.
- Patterns: CCSS has no K pattern standard; we align repeating patterns with MP.7 (look for and make use of structure) and growing patterns with 4.OA.C.5.

## 6. Age-appropriateness and safety
- No timers on answers at any level; clock-tower time is the topic, not a pressure.
- Word problems use neutral, friendly scenarios (no dieting, no gambling, no weapons).
- Money items in maths only compute values; spending decisions live in the money library.
