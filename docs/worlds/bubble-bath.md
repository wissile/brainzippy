# Gloop's Bubble Bath (`bubble-bath`)

Ages 3–4 · Maths library (`math`, "Number Hill"), **first stop of the Maths journey** (journey host Bobbo) · world host **Gloop** (the squishy one), helper **Bobbo** · music `sky` (calm, dusky: it is nearly bedtime).
Code: `src/games/bubble-bath/`. Registry: `src/content/packs/bubble-bath/`.

## Objective
"Child can match and find circles, squares and triangles in any size or turn, see 1–5 at a glance, compare two groups by matching (more, fewer, the same), put three or four things in order of size, and count in order from one to five."

| Skill | Pack | Inner game | Levels (0-based) | Aligned with |
|---|---|---|---|---|
| `math.shape.name` | math-shape-squish (reused) | Shape Splash (sort, find) | 0–7 | K.G.A.2 (pre-K form) |
| `math.count.subitize` | core-math (reused) | Quick Look | 1–7 | K.CC.B.4/5 groundwork (perceptual and conceptual subitizing) |
| `math.count.compare` (**new**, topic `math.counting`) | bubble-bath | More or Fewer | 2–7 | K.CC.C.6 ("by using matching and counting strategies") |
| `math.measure.order-size` (**new**, new topic `math.measure`) | bubble-bath | Size Line | 3–7 | K.MD.A.2 extended to three or four objects (pre-K seriation) |
| `math.count.one-to-one` | core-math (reused) | Bubble Parade (finale) | 0–7 | K.CC.A.1, K.CC.B.4a (one number per object, stable order) |

Prerequisites stay inside the world (`subitize` and `compare` need `one-to-one`, which the finale teaches), so the daily planner never locks the journey's first stop for a new 3-year-old.

## Story (all voiced, all captioned)
Intro: "Splish, splash! It's Gloop's bath time before bed." · "But oh dear! The bath is overflowing with toys." · "Ducks, boats, shapes and bubbles, all in a muddle!" · "Let's help Gloop and Bobbo tidy, count and compare." Between items (after 2, 4, 6): the toys get tidy · the bubbles sparkle · get ready for the bubble parade. Outro: "The bath is calm and clean. Every toy has its place." · "Gloop is snug in a fluffy towel. Time for bed!" · "You looked, matched and kept trying. Here's your **Bubble Buddy** sticker!" (a rubber duck riding a big shiny bubble).

## Five inner games
Every exercise names its game in `params.mode`; a small sign (picture first, word second) floats in at the top of the board. Index 0–6 of each band rotate through the level's games (the newest first, so it opens the round and gets Bobbo's round-start explanation); index 7 is the Bubble Parade (`closer: true`, engine R5a), so **every round ends with the parade**. The engine's selector (R5) mixes answer kinds; a unit test plays every level × 20 seeds and checks no kind appears more than 4 times in a round.

| Game | Scene | Interaction | Answer | Why this interaction |
|---|---|---|---|---|
| **Shape Splash — sort** | foam bath toys float; a toy box with circle / square / triangle holes | drag a toy onto a hole, or tap toy then hole (Enter, Enter); tap a hole to take its last toy back; Ready | `match` toy → hole | a shape sorter is the classic toddler shape toy: posting by shape is a physical judgement, and colours/sizes/turns vary so only shape decides |
| **Shape Splash — find** | Gloop's bathroom wall: mirror, clock, ball, window, tile, tissue box, flag, corner shelf | tap the thing with the named shape | `choice` | moves from shapes-as-toys to shapes in a picture of real things (transfer) |
| **Quick Look** | bubbles bob up on the water for 1.5–2.5 s, then foam covers them | tap a number (each choice is a numeral over its dice-dot picture); **Peek** shows them again, any number of times | `number` + 3 neighbouring choices | brief exposure is what makes it subitizing rather than counting; arrangements move from a row and dice patterns to two "clumps" (conceptual subitizing: 3 and 2 make 5) |
| **More or Fewer** | two tubs of rubber ducks, one above the other | tap the tub (or **Same** in the tray); **Pair up** draws a dashed line from each duck to a partner | `choice` (top / bottom / same) | K.CC.C.6 asks for matching as well as counting; the lonely ducks with no partner *show* "more"; the long-line trap (level 6+) tests that length is not number |
| **Size Line** | 3–4 boats or sponges in the water; empty spaces on the bath edge with a thin-to-thick arrow | tap a piece (it goes to the next space), or drag it onto any space; tap a placed piece or Undo to take it back; Ready | `sequence` | seriation is a physical ordering task; outline levels let the child match each piece to its silhouette before ordering without help |
| **Bubble Parade** (finale) | 3–5 big numbered bubbles float across the bath, never in counting order left to right | tap / Enter each bubble; each pop says its number and drops it into the counting strip; checked automatically when all are popped | `sequence` | one touch, one number, in the stable counting order; numerals carry dots on lower levels |

## Levels (screen shows level + 1)
| Lv | New ideas | Shape Splash (sort · find) | Quick Look | More or Fewer | Size Line | Parade |
|---|---|---|---|---|---|---|
| 0 | tutorial + Shape Splash only | ○□ · 2 holes, 2 upright toys · 2 pictures | — | — | — | 1–3, dots |
| 1 | Quick Look; triangles | ○□△ · 3 holes, 3 toys · 3 pictures | 1–3 · row / dice · 2.5 s | — | — | 1–3, dots |
| 2 | More or Fewer ("more") | same | 1–4 · 2.5 s | more · 1–4 ducks · differ by ≥ 2 · rows lined up | — | 1–3, dots |
| 3 | Size Line; "fewer" | same | 1–4 · 2.2 s | + fewer · up to 5 · differ by ≥ 2 | 3 pieces · silhouettes · sizes 46/72/100 % | 1–4, dots |
| 4 | "same"; tipped shapes and mixed sizes; plain spaces | 4 toys, some tipped (square on a corner, triangle on its side or upside down) · tipped pictures | 2–5 (5 always structured) · 2.2 s | + same (¼ of items) · differ by ≥ 1 | 3 · plain spaces · 50/75/100 % | 1–4, dots |
| 5 | 4 pieces; bubble clumps | tipped · 4 pictures | 2–5 · row / dice / clumps · 2 s | up to 6 | 4 · silhouettes · 40/60/80/100 % | 1–5, dots |
| 6 | long-line trap; skinny triangles; numerals only | + long thin triangles | 3–5 · clumps / dice · 1.8 s | the tub with fewer is spread out wider (both rows ≥ 2 ducks) | 4 · plain · 44/63/82/100 % | 1–5, numerals |
| 7 | closer sizes | all | 1–5 · any arrangement · 1.5 s | long-line trap, up to 6 | 4 · plain · 55/70/85/100 % (steps ≥ 15 %) | 1–5, numerals |

Tutorial (level 0 only): two toys (a circle and a square), two holes; the runner's pointing hand rests on a toy and, once it is picked up, a second hand shows its hole. R0 levels the child up after ≥ 50 % first-try answers; difficulty also steps up after 2 first-try answers within a round, so a level-0 round usually meets Quick Look too. **No answer is ever timed**: Quick Look's brief show starts only after the prompt (and helper) have finished, and Peek is unlimited.

## Misconceptions → diagnosed first-miss hint (Bobbo) → board help
The first miss gets a line chosen from the wrong answer (`src/games/bubble-bath/logic.ts`, unit-tested); the second miss shows a worked model on the board, then "Your turn! Press the glowing one" (errorless). Every plausible wrong answer is submittable.

| Game | Wrong answer | Misconception | Hint line | Board after miss 1 · model after miss 2 |
|---|---|---|---|---|
| Sort / find | a tipped square or triangle in the wrong place | "a tipped square is a diamond"; triangles must sit on their base | `gb.hint.shape.tipped` "A tipped shape is still the same shape. Count its corners!" | sort: right toys stay posted with a tick, wrong ones float back · find: the wrong pick greys out and every thing shows its corner dots · model: toys posted one by one / the right thing glows and its corners are counted aloud (a circle gets one slow trace) |
| Sort / find | a long, thin triangle missed | only equilateral triangles are triangles | `gb.hint.shape.skinny` | same |
| Sort / find | circle / square / triangle confused | shape not yet tied to its defining attribute | `gb.hint.shape.<shape>`: no corners / four corners, sides the same / three corners | same |
| Quick Look | more than shown | counted one twice or guessed big | `gb.hint.look.over` "Not that many. Peek again and look for little groups." | the bubbles stay visible with a dashed ring round each little group · model: each bubble is numbered aloud, the answer glows |
| Quick Look | fewer than shown | missed one | `gb.hint.look.under` | same |
| More or Fewer | asked "fewer", picked the tub with more | "fewer" is a hard word at 3–4 (children often answer "more" to any comparison) | `gb.hint.compare.fewer` "Fewer means not as many. Let's pair them up and see." | ducks pair up by themselves; lonely ducks glow · model: pairs drawn one by one, the right tub glows |
| More or Fewer | asked "more", picked the tub with fewer | — | `gb.hint.compare.more` | same |
| More or Fewer | picked the spread-out row (or the bunched row for "fewer") | length = number (Piaget's number conservation) | `gb.hint.compare.long` "A longer line can still have fewer. Pair the ducks up!" | same |
| More or Fewer | picked a tub when they are equal | one row looks longer | `gb.hint.compare.same` "Every duck has a partner. Nobody is left over." | same |
| More or Fewer | picked Same when they differ | — | `gb.hint.compare.notSame` | same |
| Size Line | biggest to smallest | right idea, wrong direction | `gb.hint.size.reverse` "Small first! The tiniest one goes at the start." | right pieces stay with a tick, others float back · model: pieces placed smallest first |
| Size Line | ends right, middle swapped | compared each piece with only one neighbour | `gb.hint.size.middle` | same |
| Size Line | anything else | no strategy yet | `gb.hint.size.start` "Find the smallest one first. Then the next smallest." | same |
| Parade | popped left to right along the row | reading order instead of number order | `gb.hint.parade.place` | the bubbles popped in the right order stay; the strip shows the next number · model: Gloop pops them in order, then the next bubble glows each time |
| Parade | a number skipped | counting order not yet stable | `gb.hint.parade.skip` | same |

Round-start explanations (`explainFor`): corners decide the shape; tipped shapes are still the same; "the bubbles stay just a moment, look for little groups"; "give each duck a partner"; "careful, a long line can trick you" (trap levels); "find the smallest first"; "pop them in counting order".

## Accessibility
- Pre-readers: every prompt, hint and praise line is spoken and captioned; answers are pictures (shapes, ducks, boats, bubbles; numerals always with dot pictures in Quick Look and on parade levels 0–5). Signs are picture first.
- Targets ≥ 64 px everywhere (≥ 72 px for parade bubbles), checked in e2e at 390×844, 915×412, 863×360, 1024×1366 and 1280×800 in every inner game, at the start, while the helper explains a miss and with the model.
- Colour is never the cue: toys of one shape come in different colours; holes are all the same colour; wall things are described by sides and corners in their labels ("Window: 4 straight sides the same length, 4 corners, turned").
- Every drag (toys, Size Line pieces) has tap / tap-tap and keyboard (Enter) alternatives; focus moves to the next sensible control. Quick Look, More or Fewer, find and the parade are tap/Enter only (nothing to carry).
- Reduced motion: no bobbing, wiggling, breathing, sign or foam animations; modelled answers get a thick outline instead of a pulse. Quick Look still hides its bubbles (that is the task, not decoration); Peek brings them back.
- Screen readers: each board has the exercise description and a polite live region (posted toys, pairs and lonely ducks, spaces filled, popped numbers).

## Accuracy notes
- Shapes: a square turned 45° is still a square; triangles need not be equilateral or sit on a side (CCSS K.G.A.2 "regardless of orientation or overall size"). Only circles, squares and triangles at this age; rectangles and hexagons are left to Shape Squish (4–6).
- Subitizing: perceptual subitizing is reliable to about 4 in young children; 5 is shown only with structure (dice, 3 + 2 row, or two clumps), so it is "conceptual" subitizing (Clements, 1999, *Subitizing: What is it? Why teach it?*, Teaching Children Mathematics 5(7)). Show times (≥ 1.5 s) are design choices for 3–4-year-olds, not research thresholds: **review flag** for the curriculum designer.
- Comparison: equal groups are shown in a quarter of the items from level 4; the long-line trap appears only with at least two ducks in each row. "Fewer" (not "less") is used for countable ducks.
- Size Line: sizes differ by ≥ 15 % of the largest piece; pieces of one item are identical except for size (same colour), so size is the only cue.
- Parade: the bubble row is never already in counting order left to right (unit-tested).
- Nothing fictional is presented as fact.

## Review flags
1. **Library ages.** The `math` library is 4–14; this world (3–4) needs it widened to **3–14** (`packs/library-math/index.ts`, one line, like Pilot's D-042 change). I did not edit library packs (brief rule); until then `checkRegistry()` reports one problem and the registry-dependent unit tests fail on that message only (verified by applying the change locally: all of them pass, only clip coverage remains).
2. New topic `math.measure` ("Measuring and comparing") for `math.measure.order-size`: no measuring topic existed. Rumble is the library's measuring buddy for later worlds.
3. `math.count.compare` sits under the existing `math.counting` topic (K.CC.C.6 is a Counting & Cardinality standard).
4. Quick Look show times and the 15 % size steps: curriculum-designer review.
5. New scene art (bathroom, toy box, wall things, ducks, boats, sponges, sticker) is original SVG in the Critter Crew style; creative-director review requested. No new characters.
6. Voice: 66 `gb.*` lines (74 clips with variants) to render with Kokoro; the clip-coverage test fails for these until then (expected).
