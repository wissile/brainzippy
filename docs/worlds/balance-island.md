# Balance Scale Island (`balance-island`)

**Ages 11–13 · Maths · pre-algebra.** Host Bobbo (stall keeper), helper Rumble (the careful measurer).
Concept: `docs/curriculum/maths.md` §3 item 7. Pack: `src/content/packs/math-balance-island` (topic `math.algebra`).

## Objective
Solve linear equations by keeping both sides balanced. The child does the same thing to both sides (takes away
equal amounts, splits both sides into equal groups), works up from one-step to two-step equations and unknowns on
both sides, and writes word stories as equations.

| Skill | Objective | Standard (aligned with) |
|---|---|---|
| `math.alg.one-step` | solve x + p = q and px = q by balancing | 6.EE.B.7 |
| `math.alg.two-step` | solve px + q = r, including from word stories | 7.EE.B.4 |
| `math.alg.both-sides` (new) | solve px + q = sx + r, unknowns on both sides | 8.EE.C.7b |

`math.alg.expressions` (prerequisite in the curriculum spec) has no world yet, so `one-step` lists
`math.add.within-20` and `math.div.share-equally` as its registered prerequisites.

## Story
Bobbo's night-market weighing stall: rain has washed the labels off his sealed bags, and nobody may open them.
Rumble: "A level scale never lies." Between-lines at 2/4/6 solved bags; the outro labels every bag and awards the
**Balance Keeper** sticker. Music: the existing `island` loop.

## Interaction (why a scale)
A real balance beam is the concrete model of "=": the beam is driven by the **true** weights (a damped spring,
ζ ≈ 0.5), so a move on one pan only visibly tips it. That makes the rule *do the same to both sides* something the
child sees rather than memorises. Beside the scale a slate writes every balanced state as algebra with the step
taken (`2x + 3 = 11` → `−3 both sides` → `2x = 8` → `÷2 both sides` → `x = 4`), bridging concrete → symbolic.
A tipped state is shown as `≠` in coral.

- Moves: drag a bag/weight off a pan (anywhere off a pan = back on the counter) or from the counter onto a pan.
  The beam reacts while the item is held. Same moves by **tap-then-tap** and **keyboard** (Enter picks up and moves
  focus to the counter; Enter puts back; Escape cancels).
- "Both sides" buttons: −1 kg, −x, ÷g (g = the largest split every count allows), Undo.
- Weights show as 5 kg bars + 1 kg cubes so 40 kg on a pan stays readable.
- The answer ("x = ?", four pills) can be chosen at any time: the scale is a thinking tool, not a gate.
- Reduced motion: the beam jumps straight to its angle (no spring); pulses become outlines.

## Levels (generator, `maxLevel` 7; every equation is built from its answer x ∈ 1..12)
| Level | Shape | Parameters |
|---|---|---|
| 1 | x + q = r | x 1–6, q 1–4 (tutorial x + 3 = 7 with pointing hand on "−1 both") |
| 2 | x + q = r to 20 | x 2–12, q 2–8, r ≤ 20; 35 % have the bag on the right (12 = x + 5) |
| 3 | 2x = r | x 2–9 |
| 4 | px = r | p 3–5, x 2–8, r ≤ 40 |
| 5 | 2x + q = r | x 1–9, q 1–9 |
| 6 | px + q = r | p 3–5, x 1–7, q 1–9, r ≤ 40 |
| 7 | px + q = sx + r | s 1–2, p s+1..5, x 1–8, q 0–6 |
| 8 | word story → equation (choose) → solve | forms rotate two-step / add / both sides / mult |

No time pressure at any level. Within a round difficulty steps up after 3 first-try answers (`stepUpAfter: 3`, so a
round explores rather than races); R0 levels up after a round with ≥ 50 % first-try.
Unit tests check every level × 60 seeds: lint, declared skill, integer answer in 1..12, a non-zero net number of
bags, exactly one whole-number solution (brute force 0..200), pan limits, and that the model solution ends with one
bag alone against x kg.

## Hints and feedback (never punished)
- Round start: Rumble explains "A balanced scale is an equation. Whatever you do to one pan, do to the other."
- Live cues (once each per exercise): tipped → "Do the same to the other pan"; level again → "Look at the new
  equation"; bag alone → "Now you can read what it weighs".
- First miss: the wrong pill is greyed and the guess is **tested on the scale**: every bag gets a coral "5?" tag, the
  beam tilts from those weights, and the slate shows `13 ≠ 11 if x = 5`. Rumble suggests testing and taking the same
  off both pans.
- Second miss: the scale solves itself one balanced step at a time (the slate writes each step), the correct pill
  pulses, and the child taps it (errorless).
- Correct: the bag tag reveals "4 kg"; if the child answered without isolating the bag, the solution is played out.
- Praise names the process ("You undid each step carefully"), never ability.

## Distractors (number choices) and the misconception each targets
P/Q = bags/weights on the pan with more bags, S/R = the other pan, B = P − S. Two misconception values are used
when they are whole and positive, plus a near miss (x ± 1 / + 2); always 4 distinct sorted pills.
| Value | Misconception |
|---|---|
| R + Q | did the operation shown (added instead of took away) |
| R − Q | took the weights away but forgot to split |
| (R + Q) / B | right split, wrong inverse for the weights |
| (R − Q) / (P + S) | added the bags on both sides instead of removing them |
| (R − Q) / P | ignored the bags on the other pan |
| R − P | subtracted the number of bags instead of dividing (px = q) |
| R / P − Q | split only the bags, not the weights |

## Word stories (level 8)
Two templates per form, screen text only (the voice says "Read the story. Which equation matches it?", so clips
stay finite). The child picks the matching equation from 3–4 options, then solves on the scale; answer pills wait
until the story is matched. Wrong options are greyed; after two wrong picks the right one pulses.
| Form | Wrong options model… |
|---|---|
| x + q = r | `qx = r` (weight read as bags), `x + r = q` (part/total swapped), `x = q + r` (add everything) |
| px = r | `x + p = r` (3x read as 3 + x), `rx = p` (swapped), `x = r` (total as one bag) |
| px + q = r | `x + p + q = r`, `p(x + q) = r` (extra weight in every bag), `px = q + r` (wrong side), `qx + p = r` |
| px + q = sx + r | loose weights swapped, bags from both pans added together, bags swapped |

## Play-test notes / changes to the spec
- The spec's single "split pans into equal groups" became a button that splits by the largest common factor, so
  `2x + 4 = 10 → x + 2 = 5` is also allowed (a valid route the child may find).
- Answer kind stays `number`; the story → equation step lives on the board (not engine-validated) so one exercise
  carries the whole "story → equation → solve" flow.
- Budge (cameo in the spec) is not drawn yet; Rumble helps instead.
