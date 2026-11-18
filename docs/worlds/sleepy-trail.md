# Rumble's Sleepy Trail (`sleepy-trail`)

Ages 7–9 · subject `math` · topic `math.frac` · host Rumble, helper Gloop (Bobbo joins in compare levels) · music `meadow`.
Spec: `docs/curriculum/maths.md` §4. Code: `src/games/sleepy-trail/`, pack `src/content/packs/math-sleepy-trail/`.

## What it teaches
**Objective:** show a fraction as a point on the number line by counting equal jumps from zero.
Skills: `math.frac.unit-on-line` (3.NF.A.2a), `math.frac.on-line` (3.NF.A.2b), `math.frac.equivalent` (3.NF.A.3a–b),
`math.frac.compare` (3.NF.A.3d), `math.frac.estimate` (3.NF.A.2).

## Why this interaction
The IES practice guide on fractions (Siegler et al., 2010) recommends number lines as a central representation,
because they show that fractions are numbers with a size and a place among other numbers. So a fraction here is
never a slice of a pizza: it is a **spot on a trail** from Mossy Rock (0) to Big Tree (1), later Far Hill (2) and
Cloud Peak (3). Rumble walks there one equal jump at a time. The trail is always split into exactly equal parts
(nothing is squeezed to fit a screen; narrow portrait screens turn the trail vertical instead of shrinking posts).
Only the whole numbers are labelled, so the child must count jumps instead of reading a label.

Story: Rumble's nap map marks his favourite spots as fractions of the trail; the child puts a pillow on each before
bedtime. The sky turns from golden afternoon to starry night as pillows are placed.

## Interaction
- **place:** move Rumble by tapping a post (he walks there post by post), dragging him, ←/→ (↑/↓) or the tray's
  step buttons, then press **Nap here**. Teal dotted arcs show each jump he has walked from zero.
- **name:** Rumble already stands on a post; tap one of three fraction cards.
- **compare:** two trails of the same length, Rumble's in d parts and Bobbo's in d₂ parts. Place both, then tap
  "Rumble/Bobbo walked farther". Submitted as one `match` answer, so the engine marks which part was wrong.
- **estimate:** no posts, only whole-number landmarks. Drag Rumble, tap the trail, or nudge in 24ths of a unit
  (every target with d ∈ {2,3,4,6,8} lies exactly on that grid), then **Nap here**. `numeric` answer with tolerance.
Keyboard: arrows (one post / one 24th), PageUp/PageDown (bigger steps), Home/End, Enter on Rumble = Nap here,
Tab reaches posts, cards and buttons. Every control is a `<button>` (posts ≥ 44 px, tray buttons ≥ 64 px).

## Levels (engine level = spec level − 1; the authored tutorial is spec L0)
| Engine | Spec | Mode | Trail | Content | Skill |
|---|---|---|---|---|---|
| tut | L0 | place | 0–1, halves | 1/2, pointing hand on the middle post | unit-on-line |
| 0 | L1 | place | 0–1 | unit fractions 1/d, d ∈ {2,3,4,5,6,8} | unit-on-line |
| 1 | L2 | place | 0–1 | a/d below one, d ∈ {2,3,4,6} | on-line |
| 2 | L3 | place | 0–1 | d ∈ {3,4,5,6,8}; ≤ 1 d/d and ≤ 1 0/d per band | on-line |
| 3 | L4 | name | 0–1 | d ∈ {3,4,6,8}; 3 cards | on-line |
| 4 | L5 | place | 0–2 | d ∈ {2,3,4}, mostly past one (5/4, 3/2), ≤ 1 whole | on-line |
| 5 | L6 | place | 0–1 in 8ths/6ths/4ths | targets 1/2, 1/4, 3/4, 2/4 (8ths), 1/3, 2/3, 1/2 (6ths), 1/2 (4ths) | equivalent |
| 6 | L7 | compare | two 0–1 trails | 16 curated pairs: same denominator or same numerator | compare |
| 7 | L8 | estimate | 0–1 unmarked | d ∈ {2,3,4,6,8}; ±1/12 (±1/16 for eighths) | estimate |
| 8 | L9 | estimate | 0–2 / 0–3 unmarked | d ∈ {2,3,4}, never a whole number; ±1/12 | estimate |
No timers at any level. A round is 8 exercises. Difficulty steps up after 2 first-try answers (R2). R0 levels up
after ≥ 50 % first try.

**No repeats:** each level fixes which denominator (group) every slot of a band uses, and the j-th slot of a group
draws from the j-th bucket of its candidates. Items in a band never repeat, and neighbouring items never share a
split. **Exception:** level 0. Only six unit fractions exist with d ≤ 8 (no sevenths), so slots 7–8 repeat slots 2
and 1. A child only sees them after six items at that difficulty without stepping up. Fixed slot orders mean L6 and
L7 rounds see their items in a fixed order; L7 still varies (two pairs per slot).

## Distractors and the misconceptions they target
- **Name cards (L4):** chosen from (a−1)/d and (a+1)/d (counted posts, not jumps), a/(d+1) and a/(d−1) (wrong
  size of part), and d/a if ≤ 1. Never equal in value to the target or to each other.
- **Compare pairs (L7):** same numerator, different denominators, which targets "bigger denominator = bigger
  fraction" (3/8 vs 3/6). Same denominator with different numerators is the control.
- **Equivalence (L6):** the trail's split never matches the target's denominator, which targets "bigger numbers =
  bigger fraction" (4/8 vs 1/2).

## Feedback ladder
1. **First miss:** the wrong post greys out (place). Rumble walks back to Mossy Rock. The equal parts of the first
   whole flash one by one. Gloop slides in with a line **diagnosed from the answer** (`logic.ts diagnose`):

| Child's answer | Likely misconception | Line |
|---|---|---|
| post a on a trail in finer parts (L6) | took each post to be 1/d | `st.hint.size.d{d}` |
| one jump off | counted posts, not jumps | `st.hint.jumps` |
| on the whole number a | read a/d as the number a | `st.hint.parts` |
| on d/a | swapped top and bottom | `st.hint.topbottom` |
| L7: right spots, picked the bigger denominator | bigger d = bigger fraction | `st.hint.bigger` |
| L7: right spots, other wrong pick | — | `st.hint.closer` |
| estimate too far / not far enough | — | `st.hint.high` / `st.hint.low` and the ½ marks appear |
| anything else | — | `st.hint.general.d{d}` "Each jump is one fourth…" |

2. **Second miss (model):** Rumble walks the jumps from zero in the target's own unit. Gold arcs are labelled 1/4,
   2/4, 3/4, and the jumps are counted aloud. He stops on the right post, the post and **Nap here** glow, and the
   child taps it (errorless). Estimates reveal all posts. Compare walks Rumble, then Bobbo, and lights the right
   "farther" button.

Praise is about the process and matches the mode: "Three fourths! You counted equal jumps.", "Same spot, different
name. Nice noticing!", and so on.

## Changes from the spec, and why
- Spec L1 used d ∈ {2,3,4}, which gives only three items for an 8-item band. I widened it to the six unit
  fractions up to eighths, matching the skill table's top example (1/8).
- I fixed `st.help.same`. The spec text "Two halves and four eighths land on the very same spot" is false
  (2/2 ≠ 4/8). The line now reads "One half and four eighths…".
- In the worked example the jumps are counted ("one, two, three") and labelled 1/4, 2/4, 3/4 on screen; the final
  line names the fraction. The runner's 700 ms step is too short for clipped fraction phrases.
- Spoken fractions use the voice catalogue's object names: each exercise's `objectKind` is a fraction key
  (`st-f3-4`, `st-n3-4`, `st-c3-8-3-6`), and `{one}` / `{many}` say "three fourths". Captions read naturally and
  clip file names stay safe.
- **Framework hooks** (optional and backwards-compatible, in `src/game/GameRunner.tsx`): `helper.explainFor(ex)`,
  `helper.hintFor(state)` and `praiseFor(ex)`. Without them the diagnosis table and mode-specific praise can't be
  voiced.

## Tests
`tests/unit/sleepy-trail.test.ts`: fraction maths, lint and maths of every level × 50 seeds, determinism, no
repeats, split rotation, level rules, distractors, tolerance, diagnosis table, voice coverage of every reachable
fraction, and even post spacing ≥ 44 px. `e2e/sleepy-trail.spec.ts`: full rounds by tap, keyboard and drag; the
diagnosed hint; the model; compare and estimate; tap targets and overflow; review screenshots at four viewports.
