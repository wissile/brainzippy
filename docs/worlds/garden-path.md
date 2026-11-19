# Toggle's Garden Path (`garden-path`)

Ages 5–7 · computer science library (`cs`, "Code Garden"), topic `cs.seq` · host **Toggle** (the spec's "Loopi"), helper **Puff** · music `meadow`.
Spec: `docs/curriculum/computer-science.md` §4. Code: `src/games/garden-path/`. Registry: `src/content/packs/library-cs/` (library now `live`).

## Objective
"Build a step-by-step program that gets Toggle to a goal, and fix a wrong step." The child is programming, not answering a quiz: they put arrow cards in a program strip, press **Go**, and watch Toggle carry out the cards one by one on a garden grid. The card that is running lights up as it runs.

| Skill | Ages | Levels | Child can… |
|---|---|---|---|
| `cs.seq.build` | 5–7 | 0–3 | build a sequence of moves that reaches a goal |
| `cs.seq.decompose` | 6–8 | 4 | break a goal into parts: the berry first, then home |
| `cs.debug.sequence` | 6–8 | 5 | find and fix the first wrong step |
| `cs.loop.repeat` | 7–9 | 6–7 | use repeat N to shorten a program, including a two-step staircase |
| `cs.loop.debug` | 8–10 | 8 | fix a wrong repeat count or a wrong step inside a repeat |

Prerequisites stay inside this world, so the daily planner can unlock it. `cs.seq.follow` (trace a program and predict where it ends) is practised in every run here, because the child watches the trace and the footprints. It gets its own skill id once a world teaches it on its own.

## CSTA alignment
Codes are the ones mapped in `computer-science.md` §2. They come from the verified list in `docs/curriculum/README.md` §5, and the educational-content-validation review re-checks them before publication.

| Level(s) | Skill | CSTA 2026 (PK-12) | CSTA 2017 (K-12) |
|---|---|---|---|
| 0–3 | `cs.seq.build` | `E1-ALG-PS-01` | `1A-AP-10` (programs with sequences) |
| 0–3 (run trace) | `cs.seq.follow` (practised) | `EK-ALG-PS-01` | `1A-AP-08` (follow step-by-step algorithms) |
| 4 | `cs.seq.decompose` | — | `1A-AP-11` (decompose the steps into a precise sequence) |
| 5 | `cs.debug.sequence` | — | `1A-AP-14` (debug errors in sequences) |
| 6–7 | `cs.loop.repeat` | `E2-ALG-PS-01` | `1A-AP-10` (programs with simple loops) |
| 8 | `cs.loop.debug` | — | `1A-AP-14` (debug errors with simple loops), `1B-AP-15` |

`1A` is the K–2 band (ages 5–8) and `1B` is grades 3–5. The world sits at the top of 1A, so `1B-AP-15` is a stretch link for level 8 only. These are alignments, not claims of efficacy (D-020).

## Story
Toggle's tummy is rumbling. The juiciest berries are across the garden, and Toggle can only move by following arrow cards. The world has 4 intro beats and between-beats after exercises 2, 4 and 6 ("Munch!", rocks, "nearly full"). The 3 outro beats end with the Path Finder badge: a leaf shaped like an arrow, with Toggle's antenna bulb on top.

## Interaction and why
- **Garden grid** (5×5; levels 0–1 use a 1×5 strip). Things differ by shape: lumpy grey rocks, a round berry bush, a tall arched leaf hut (home), and a flower ring at the start. Tiles are 96 px on tablets, about 67 px on a 390 px phone, and 45 px in short landscape. Tiles are never tap targets, so 45 px is fine there.
- **Program strip** with a fixed number of spaces (the block budget). Each card is a lime command block with a chunky arrow, the same motif as Toggle's body. The repeat card is violet and has three parts: a head (tap it to take the card out), a count button (2 → 3 → 4 → 5 → 2, or ↑/↓ on a keyboard) with progress pips, and 1–2 body spaces.
- **Three ways to edit, all equal:**
  - **Drag** a card from the palette onto any space (replacing what's there), drag a card between spaces to swap, or drag a card off the strip to remove it.
  - **Tap** a palette card: it fills the next empty space, and a repeat card's body comes right after it. Tap a placed card: it comes out and **its space stays empty**. So "tap the wrong card, tap the right arrow" (tap-tap) is how a debug fix works, with no drag needed.
  - **Keyboard:** Tab to a card and press Enter to add it. Press Enter or Backspace on a placed card to remove it; Backspace elsewhere removes the last card. ←/→ move between spaces, and Go is a button.
- **Spoken labels:** every card says its name when added ("Up", "Repeat", "3 times"), and every control has an action-describing `aria-label`. The garden is also described as text ("Toggle is on row 2, square 1. Berry bush: …"), and the description updates after each run. A polite live region announces each move ("right, right, bump").
- **Go** runs one move per 450 ms. Each step plays a rising count note and leaves a numbered footprint. A move into a rock or the fence makes Toggle bump gently and sit down; there is no fail sound. With reduced motion, moves are instant (220 ms per step, no tweening) and the numbered footprints count the steps.

## Correctness: by simulation, any working program
`logic.ts` `run()` is the judge. A program passes if, after all its cards have run, Toggle stands on the goal, every berry was visited in order, no move bumped, and the program fits the strip. **Any program that does this passes.** The unit test enumerates every program up to 6 cards for a rocky puzzle and finds 8 different winning routes, all accepted.

The engine sees a `sequence` answer of checkpoints (`start → [berry] → goal`). The board submits the checkpoints its run actually reached, so:
- a passing run always equals the answer;
- a failing run is always a strict prefix, which counts as a real miss (never ignored and never greyed out).

**No engine change was needed.**

## Levels (`generator.ts`, `maxLevel` 8, no time pressure)
| Level | Puzzle | Spaces | Cards |
|---|---|---|---|
| 1 (0) | strip, 1–2 moves one way (tutorial: one →, pointing hand) | = moves | 1 arrow |
| 2 (1) | strip, 1–3 moves | = moves | ← → |
| 3 (2) | 5×5, L-shape, 3–4 moves | = moves | 4 arrows |
| 4 (3) | 4–6 moves, 1–2 turns; 1–2 rocks block the other L-route | moves + 2 | 4 arrows |
| 5 (4) | berry first, then home; 5–7 moves; the berry is a detour | moves + 2 | 4 arrows |
| 6 (5) | debug: a 3–6 card program, one arrow replaced (earlier positions likelier) | = moves | 4 arrows |
| 7 (6) | repeat n [move], n 3–5, plus at most one extra move | 2–3 (arrows alone never fit) | 4 + repeat |
| 8 (7) | staircase repeat n [move, move], n 2–4; rocks block both L-routes | 2 (body 2) | 4 + repeat |
| 9 (8) | debug loop: count ±1, or one unhelpful body move | = blocks of P | 4 + repeat |

The generator is solution-first (§4.4). For every puzzle it checks, and `puzzleProblems()` plus the unit tests assert over levels 0–8 × 60 seeds, that:
- P passes, and is a **shortest** solution: BFS length = moves of P; on repeat levels, `minBlocks()` = P's card count;
- P fits the budget;
- rocks are never on the path, the goal ≠ the start, and berries are on the path;
- repeat levels can't be solved by arrows alone;
- debug programs fail, and their **first wrong step is the planted bug**.

## Misconceptions → first-miss feedback
`diagnose()` finds the first step that goes wrong. On the first miss the run replays slowly (700 ms per step) with the play-head, stops at that step, and the card wobbles (orange ring with reduced motion). Puff says a line matched to the misconception:

| Observed | Misconception | Puff (first miss) |
|---|---|---|
| ends one short | counted wrongly / gave up early | `gp.help.short` "Toggle needs more steps. Count the squares…" |
| passes the goal | counted the start square | `gp.help.tooFar` "…but not the one Toggle starts on." |
| moves away / bumps | left/right or up/down mix-up | `gp.help.dir` "Look where the berries are. Which arrow points that way?" |
| home without berry | solving in one go | `gp.help.plan` "Find the berry first…" |
| count n ± 1 would work | "repeat 3 = 3 extra" | `gp.help.repeatCount` "one time, two times, three times" |
| debug levels | fixing the end, rewriting everything | `gp.help.debug` "Fix the first step that goes wrong." |

**Second miss (worked example):** numbered dotted footprints for the intended path appear one by one, counted aloud. The strip keeps the child's matching cards and shows ghost cards in the other spaces. Only the next needed palette card stays lit. The child taps each ghost (errorless), then Go.

## Changes from the spec (from my own test play-throughs and screenshot review; not tested with children)
- **Count button instead of − / +:** at 390 px, two small buttons plus body spaces didn't fit at 64 px, so one 64 px button cycles 2–5. Keyboard users get ↑/↓ as well.
- **A removed card leaves an empty space**, instead of the strip closing up. This turns a debug fix into tap-tap with no drag, and it makes "first empty space" predictable.
- **Two extra first-miss lines** (`short`, `tooFar`) instead of one "count" line, because the two counting errors need opposite advice.
- **Go sits next to the strip**, not in the tray, so the phone tray holds one row of cards beside Toggle.
- Level 8 alternates straight and staircase loops, so both bug shapes appear in a round.

## Voice
53 line ids (`gp.` prefix, all ≤ 14 words, process praise, Toggle's "Beep!" tic), 56 clips including `gp.block.times` n 2–5. Step counting reuses the shared `number.*` clips. Clips are not rendered yet, so `voiceLines.test.ts` clip coverage fails until the lead renders them.
