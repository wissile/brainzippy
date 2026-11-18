# Gloop's Shape Squish (`shape-squish`) — maths, 2D shapes, ages 4–6

**Host:** Gloop · **Helper:** Zuzu (traces sides with her pencil) · **Music:** `meadow` · **Sticker:** Shape Squisher
**Skills** (pack `src/content/packs/math-shape-squish`): `math.shape.name` (K.G.A.2), `math.shape.attributes` (1.G.A.1), `math.shape.compose` (K.G.B.6).
**Objective:** name circles, squares, triangles, rectangles and hexagons in any size or turn; sort shapes by their sides and corners; put small shapes together to make bigger ones, in more than one way.

## Story
Every gate into Shape Garden has a shaped hole, and the Jelly Party is on the other side. Gloop can squish into any shape. The intro has 4 beats, there are between-lines after exercises 2, 4 and 6, and the outro has 3 beats. Every line is voiced and captioned.

## Why these interactions
- **Gates (drag Gloop).** Matching a body to a hole shows that a shape is defined by its outline, not by its colour. Gloop is drawn upright, and from level 3 the gates are turned, stretched and resized. The child has to recognise "a turned square is still a square" to get Gloop through.
- **Jelly jar (find every…).** Children choose all the examples from a mixed group. They have to look at every shape instead of stopping at the first match.
- **Sorting jars ("3 sides" / "4 sides").** The jars are labelled with a number and tally sticks, never a picture, so children count sides. Only three colours are used, shared across both jars, so colour can never be the rule. Unnamed quadrilaterals (trapezoid, kite, parallelogram, rhombus) push children past shape names to attributes.
- **Outline gates (compose).** Pattern-block style pieces snap in only when they really fit. The model packs pieces around a ring of cells, so the board can never show an impossible tiling (`shapes.ts`). Tray pieces are shown turned, which targets the "pieces must keep their orientation" misconception.

## Levels (generator `generator.ts`, `maxLevel` 7, R0 level-up after ≥ 50 % first try)
| Level | Mode | Parameters | Misconception / distractor logic |
|---|---|---|---|
| 1 | gate | 2 gates, circle vs square, upright, sizes 84–100 % | round vs straight sides |
| 2 | gate | 3 gates: circle, square, triangle (equilateral or right), upright, sizes 68–100 % | — |
| 3 | gate | 3–4 gates, all turned / stretched (triangles, rectangles) / sized 62–98 %; Gloop is upright | a turned square is a "diamond"; only equilateral triangles count. Each target has a near-miss: circle→oval, square→rectangle or rhombus, triangle→trapezoid or kite, rectangle→parallelogram or trapezoid, hexagon→pentagon. A rectangle target never appears next to a square, because a square is also a rectangle. |
| 4 | find | 6 shapes, 2–3 targets: triangles (thin, wide, right, scalene, turned), or every 3rd item squares (turned and resized) | near-misses are always included (trapezoid, pentagon or kite for triangles; rectangle or rhombus for squares) |
| 5 | sort | 5–6 shapes into "3 sides" / "4 sides", at least 2 per jar, mixed turns and sizes | colour or size defines a shape (colours shared across jars) |
| 6 | fill | Which two triangles make a square? 2 half-square triangles at turns of 45° steps, plus 2 distractors | any two triangles work (equilateral triangle); a small triangle (wrong size); a small square or rectangle (another family) |
| 7 | fill | Hexagon outline, one of 5 ways (2 trapezoids · 3 rhombi · trapezoid + rhombus + triangle · trapezoid + 3 triangles · 2 rhombi + 2 triangles), plus 2 distractors | extra pattern blocks are kept only if the correct pieces stay the ONE subset that fills the outline |
| 8 | two | Two outlines (square or hexagon), each filled a different way; 6 templates; plus 1 distractor | the same shape can be made in more than one way |

Content stays correct at every level. Unit tests run 8 levels × 50 seeds × 8 items and check:
- Every exercise lints.
- Drawn polygons classify geometrically as their name: square = 4 equal sides and 4 right angles, a rectangle is never a square, and unnamed shapes never pass for named ones.
- Exactly one gate carries the target name.
- The find set equals the named shapes.
- Sort pairs equal the side counts.
- Each compose tray has exactly one filling subset, found by brute force over every subset.
- The two level-8 ways are different collections.

## Feedback ladder (engine defaults, world-specific presentation)
- **First miss:** Zuzu explains: "Let's trace the sides with my pencil and count them". The board then adds a support for each mode:
  - gate: Gloop's sides get numbers and corner dots;
  - find: corner dots appear on the shapes;
  - sort: the unsorted shapes get side numbers;
  - compose: the empty gap glows in the outline.

  The wrong pick is greyed out. Pieces that were right stay in place with a ✓.
- **Second miss:** the board models the answer step by step:
  - gate: traces the sides 1, 2, 3… on Gloop and on the right gate;
  - find: puts the targets in the jar while counting;
  - sort: puts each shape in its jar and says its number of sides;
  - compose: places the pieces outline by outline.

  The child then presses the glowing control. Wrong answers are never punished, and retries are unlimited.
- **During play, compose only:** a piece that does not fit wobbles back with "that piece doesn't fit there". This is physical-puzzle feedback, not a scored miss.

## Access
- Every drag has two alternatives: tap or tap-tap (pick up, then choose a gate, jar or outline), and the keyboard. Enter picks up an item and moves focus to the targets; Tab and Enter put it down.
- Tapping a gate also answers directly.
- Tap targets are at least 64 px; the grid sizing never goes below 64 px.
- Shapes are described by their sides and corners, never by colour. Gate labels describe the hole without naming it.
- With reduced motion, the fly, wobble and pulse animations are off and outlines are used instead.
- The game is fully playable muted.

## Open questions / play-test notes
- Level 3 mixes five shape names in one band. Play-testing may show that it needs splitting (turned only first, then stretched).
- Level 8 asks for two ways at once. If children fill both outlines the same way and get stuck, the next step is to add a "Show one way" scaffold.
