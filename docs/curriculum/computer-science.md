# Computer science library (`cs`)

Ages 5–14+. **Host:** Loopi (new; a segmented caterpillar-monster whose body segments are command blocks, see `CHARACTERS.md`). Cameos: Puff (counts repeats), Bobbo (asks for breakfast programs), Fenn (security cross-over).
**Aligned with:** 2026 CSTA PK-12 Computer Science Standards (released 14 July 2026; concepts Algorithms & Design, Programming, Data & Analysis, Systems & Security, Computing & Society) and, for states still on them, the 2017 CSTA K-12 Computer Science Standards. Only codes checked against CSTA text are cited (README §5). Band T (14+) is a later Teen & Adult track (README §2).

## 1. Topics by age band

| Ages | Topic id | Topic | Key ideas |
|---|---|---|---|
| 5–7 | `cs.seq` | Sequences and logical instructions | algorithms in daily life, precise ordered steps, decomposition |
| 5–7 | `cs.debug` (intro) | Fixing a wrong step | find the first step that goes wrong |
| 8–10 | `cs.loop` | Loops | repeat N, repeating a multi-step body |
| 8–10 | `cs.cond` | Conditionals and events | if/else, when-something-happens |
| 8–10 | `cs.debug` | Testing and debugging | test cases, trace, fix |
| 8–10 | `cs.data` | Representing data | numbers and symbols encode pictures |
| 11–13 | `cs.var` | Variables | score, counters, state |
| 11–13 | `cs.game` | Visual programming and game creation | sprites, events, variables, win condition, nested control |
| 11–13 | `cs.ai` | AI fundamentals (concepts) | learning from examples, data bias, AI can be wrong |
| 14+ | `cs.py` · `cs.js` · `cs.web` · `cs.ai` | Python, JavaScript, web development, AI fundamentals | text programming, DOM events, HTML/CSS, model limits |

## 2. Skills

| skill_id | Objective (child can…) | Ages | Prereqs | Misconceptions targeted | Lowest-level example | Highest-level example | Aligned with |
|---|---|---|---|---|---|---|---|
| `cs.seq.order` | put the steps of an everyday task in a working order | 5–6 | — | any order works; skipping a needed step | 3 steps: bread → toaster → plate | 6 steps with two steps that may swap | EK-ALG-PS-01, 1A-AP-08 |
| `cs.seq.follow` | trace a given step list and predict where it ends | 5–7 | — | one arrow moves "all the way" | 2 arrows on a strip | 6 arrows on a 5×5 grid | EK-ALG-PS-01 |
| `cs.seq.build` | build a sequence of moves that reaches a goal | 5–7 | seq.follow | off-by-one step counts; left/right confusion | 1 move | 7 moves around 2 rocks via a berry | E1-PRO-PD-04, 1A-AP-10 |
| `cs.seq.decompose` | break a goal into sub-goals | 6–8 | seq.build | solving everything in one go | goal via 1 berry | goal via 3 berries in a set order | E1-ALG-PS-01, 1A-AP-11 |
| `cs.debug.sequence` | find and fix the first wrong step in a sequence | 6–8 | seq.follow | rewriting the whole program; fixing the last step | 3 blocks, 1 wrong | 7 blocks, 1 wrong near the start | E1-PRO-TR-07, 1A-AP-14 |
| `cs.loop.repeat` | use repeat N to shorten a program | 7–9 | seq.build | repeat 3 runs 4 times; body runs once | repeat 3 [→] | repeat 3 [→ ↑] staircase | 1A-AP-10, E2-ALG-PS-01, E2-PRO-PD-04 |
| `cs.loop.debug` | fix wrong repeat counts and bodies | 8–10 | loop.repeat, debug.sequence | changing the count when the body is wrong | wrong count | wrong body block inside a loop | E2-PRO-TR-07, 1A-AP-14, 1B-AP-15 |
| `cs.cond.events` | start actions when an event happens | 7–9 | seq.build | events run in screen order | "when tapped → blink" | 2 events with different actions | E2-ALG-PS-01, 1B-AP-10 |
| `cs.cond.if-else` | choose actions with if/else on a sensed value | 8–10 | cond.events | "if" runs both branches; else is optional always | if red → left bin | if/else-if with 3 outcomes over 6 test inputs | E3-ALG-PS-01, 1B-AP-10 |
| `cs.debug.test` | pick test cases that reveal a bug | 9–10 | cond.if-else | one passing test proves it works | which input shows the bug? | choose a minimal test set covering every branch | 1B-AP-15, MS-ALG-PS-03 |
| `cs.data.encode` | represent a picture with numbers and decode it back | 7–10 | — | numbers can only mean amounts | 3×3 black/white grid | 8×8 run-length code | 1A-AP-09 |
| `cs.var.counter` | use a variable to count or keep score | 10–12 | loop.repeat | a variable stores a formula, not a value | score + 1 per coin | lives and score interact | E5-ALG-PS-01, 2-AP-11, MS-ALG-PS-01 |
| `cs.game.events` | build a game with events, a variable and a win condition | 11–13 | var.counter, cond.if-else | game must have one script | sprite moves with arrows | win at 10 points, lose at 0 lives | 2-AP-12, MS-ALG-PS-02 |
| `cs.game.nested` | combine nested loops and compound conditions | 11–13 | game.events | "and" vs "or" mixed up | loop inside loop draws a grid | if (key and not wall) | 2-AP-12, MS-ALG-PS-02 |
| `cs.ai.examples` | explain that some AI learns patterns from examples and can be wrong | 10–14 | data.encode | AI "knows" or "thinks" like a person; AI is always right | sort 6 examples to teach the sorter | find why the sorter fails on new data (biased examples) | MS-ALG-PS-05 (AI-tagged concept) |
| `cs.py.basics` | read and write Python with variables, if and loops | 14+ | game.nested | `=` vs `==`; indentation is cosmetic | predict print of 2 lines | fix a loop's off-by-one in `range` | HS-ALG-PS-02 |
| `cs.js.events` | handle a click event and update the page | 14+ | py.basics (soft) | code runs top-to-bottom once only | which function runs on click? | debug a handler attached to the wrong element | HS-ALG-PS-02 |
| `cs.web.html` | structure a page with semantic HTML and style it with CSS | 14+ | — | div for everything; CSS changes content | order heading/paragraph/list tags | fix a page's heading order and contrast | (no CSTA code; web content) |

## 3. World concepts (prioritised)

### 1. Loopi's Garden Path — **first world** (ages 5–7)
- **Host:** Loopi · **Helper:** Puff · **Scene:** a vegetable garden on a 5×5 grid of soil tiles.
- **Hook:** Loopi is hungry, the berries are across the garden, and Loopi can only move by following arrow cards.
- **Interaction:** build a program from arrow blocks, then press Run. **Answer kind:** sequence (by simulation).
- **Levels:** see §4 (8 levels).
- **Hints:** trace step by step; the first wrong step lights up. **A11y:** block buttons and a text grid description.

### 2. Breakfast Robot (ages 5–6)
- **Host:** Loopi · **Cameo:** Bobbo · **Scene:** Bobbo's kitchen with a toy robot.
- **Hook:** Bobbo's new robot follows instructions exactly, so a missing step means toast on the floor.
- **Interaction:** drag step cards into order. **Answer kind:** sequence (validated against a partial-order graph: independent steps may swap).
- **Levels:**
  1. 3 steps
  2. 4 steps
  3. find the missing step
  4. remove the extra step
  5. 5 steps with one swappable pair
  6. 6 steps, two tasks interleaved (wash hands, then toast)
- **Hints:** robot acts out the child's order and shows exactly where it goes wrong. **A11y:** cards read aloud; keyboard reorder.

### 3. Loopi's Bug Hunt (ages 7–9)
- **Host:** Loopi · **Cameo:** Fenn with a magnifier · **Scene:** greenhouse where beetles hide in programs.
- **Hook:** Garden beetles swapped cards in Loopi's programs, and the plants won't get watered.
- **Interaction:** step through the program, tap the bug block, swap it. **Answer kind:** sequence (by simulation).
- **Levels:**
  1. 3-block, wrong direction
  2. 5-block
  3. missing block
  4. extra block
  5. relative turns (turn left/right + forward)
  6. bug inside repeat body
  7. wrong repeat count
  8. two bugs
- **Hints:** step mode with a play head; "where did it first go wrong?" **A11y:** step buttons, announcements per step.

### 4. Firefly Light Show (ages 8–10)
- **Host:** Loopi · **Scene:** night meadow with programmable fireflies.
- **Hook:** The fireflies forgot their dance for the summer show, and they only dance to code.
- **Interaction:** build blink/move programs with repeat and "when tapped" events. **Answer kind:** sequence (output pattern must match target).
- **Levels:**
  1. blink 3 times (repeat)
  2. repeat 2-step body
  3. when tapped → blink
  4. two fireflies, two events
  5. loop inside an event
  6. match a pattern with the fewest blocks (rule check ≤ N)
  7. wait blocks for rhythm
- **Hints:** the target pattern and the child's pattern play side by side. **A11y:** patterns also shown as a symbol strip; captions describe light.

### 5. Rainy Day Sorter (ages 8–10)
- **Host:** Loopi · **Cameo:** Rumble · **Scene:** fruit conveyor with a colour/shape sensor.
- **Hook:** Rumble's fruit stand needs a machine that sorts fruit while he naps.
- **Interaction:** fill if/else rule slots; run on test fruit. **Answer kind:** sequence (rules must sort every test input correctly).
- **Levels:**
  1. if red → left
  2. if/else
  3. two properties (shape)
  4. else-if 3 bins
  5. pick test fruit that show a bug
  6. compound "and"
  7. fix a rule that passes 3 of 4 tests
- **Hints:** a table shows each test, the expected bin and the actual bin. **A11y:** properties named in text, not colour only.

### 6. Pixel Picture Code (ages 7–10)
- **Host:** Loopi · **Cameo:** Gloop · **Scene:** mosaic workshop.
- **Hook:** Gloop sends pictures to friends as number codes, and the codes must be painted back.
- **Interaction:** tap to paint pixels from a code; write a code for a picture. **Answer kind:** set-matching (grid) / sequence (code).
- **Levels:**
  1. 3×3 1/0
  2. 5×5 decode
  3. encode 3×3
  4. run-length decode
  5. run-length encode
  6. 2-colour palette numbers
  7. find the error in a code
- **Hints:** row-by-row highlight. **A11y:** grid cells are buttons with row/column labels.

### 7. Game Maker Garage (ages 11–13)
- **Host:** Loopi · **Scene:** an arcade workshop.
- **Hook:** The island's arcade is empty, and Loopi wants a game made by you.
- **Interaction:** visual block editor with sprites, events, variables. **Answer kind:** set-matching (rule checker on the program: e.g. "score increases on coin", "game ends at 0 lives").
- **Levels:**
  1. move with arrow keys
  2. collect a coin (event + hide)
  3. score variable
  4. win at 5
  5. enemy with repeat movement
  6. lives and lose condition
  7. nested loop level layout
  8. compound conditions
  9. remix: change rules and test
- **Hints:** a checklist shows which rule passes; play-test button. **A11y:** blocks insertable from a menu; keyboard play controls. No sharing outside friends-only (PHASE1_BRIEF); no free-text titles shown to others.

### 8. Sprout the Sorting Machine (AI concepts) (ages 10–14)
- **Host:** Loopi · **Cameo:** Hoot · **Scene:** seed library with a sorting machine.
- **Hook:** Hoot's new machine learns to sort seeds from examples, but it keeps making odd mistakes.
- **Interaction:** drag example items into "teach" bins; test on new items; inspect mistakes. **Answer kind:** choice / set-matching.
- **Levels:**
  1. teach with 4 examples
  2. test predictions
  3. more examples improve it
  4. biased examples (all big seeds) → fails on small seeds; choose the fix
  5. machine is confident and wrong
  6. what the machine can't know (meaning, feelings)
  7. when to check with a person
- **Hints:** show the training set side by side with the failure. **A11y:** items have text features.
- Runs a tiny in-browser nearest-neighbour model on game objects only; **no external AI service, no child data**.

### 9. Python Pond (14+, Teen & Adult track)
- **Host:** Loopi (older styling) · **Scene:** pond with code lily pads.
- **Hook:** Each lily pad holds a line of Python, and the frogs hop only when the program is right.
- **Interaction:** predict output (choice), reorder lines (sequence), fix one token. **Answer kind:** choice / sequence. No in-browser code execution in v1 (outputs are precomputed and unit-tested).
- **Levels:**
  1. print and strings
  2. variables
  3. if/else
  4. for/range
  5. while
  6. lists
  7. functions
  8. debug off-by-one
- **Hints:** a variable table traces values line by line.

### 10. Web Workshop (14+, Teen & Adult track)
- **Host:** Loopi · **Scene:** a shop window that is a web page.
- **Hook:** The island bakery needs a website before opening day.
- **Interaction:** drag tags to build a page; toggle CSS properties; attach a click handler. **Answer kind:** set-matching (DOM/rule checker).
- **Levels:**
  1. heading and paragraph
  2. lists and links
  3. heading order
  4. images with alt text
  5. CSS colour/contrast
  6. layout
  7. button + click event
  8. fix an inaccessible form
- Preview in a sandboxed `srcdoc` iframe with no network and no scripts except on JS levels.

## 4. First world to build: **Loopi's Garden Path**

**Why first:** sequencing is the entry point for every later CS skill (CSTA EK/E1), the grid + block board is reused by Bug Hunt, Firefly Light Show and Game Maker, and it fits the current 5–7 audience.

### 4.1 Objective and skills
"Child can build a step-by-step program that gets Loopi to a goal, and fix a wrong step." L0–L3 `cs.seq.build` (Lm 3); L4 `cs.seq.decompose` (Lm 4); L5 `cs.debug.sequence` (Lm 5); L6–L7 `cs.loop.repeat` (Lm 7); L8 `cs.loop.debug` (Lm 8).

### 4.2 Story
| Beat | Line (`gp.`) |
|---|---|
| intro1 | "This is Loopi. Loopi's tummy is rumbling." |
| intro2 | "The juiciest berries are on the other side of the garden." |
| intro3 | "Loopi can only move by following arrow cards, one step at a time." |
| intro4 | "Put the arrows in order, then press Go!" |
| between2 | "Munch! Loopi found a berry. More are growing!" |
| between4 | "Watch out for rocks. Loopi can't climb them." |
| between6 | "Too many arrows? Try a repeat card!" (L6+) / "Nearly full!" |
| outro1 | "Loopi's tummy is full!" |
| outro2 | "You planned every step, and fixed the tricky ones." |
| outro3 | "Here's your Path Finder badge!" |

### 4.3 Board and rules
- Grid 5×5 (L1: one row strip of 5). Tiles ≥64 px on tablets; on 390×844 the grid is 5 × 64 px = 320 px wide.
- Block palette: ↑ ↓ ← → (absolute directions; Loopi turns to face the move). From L6: "repeat ⟨n⟩" block with a body of 1–2 blocks; n set by − / + buttons (2–5).
- Program strip: fixed number of slots `S`. Tap a palette block → fills the next empty slot; tap a slot → removes it; drag also works; keyboard: Tab through palette, Enter adds; Backspace removes the last block; ←/→ move between slots.
- **Go** runs the program: one move per 450 ms (reduced motion: instant moves with a step counter). Each move plays a soft step sound. A move into a rock or off the grid stops the run: Loopi bumps gently and sits down (no crash, no "fail" sound).
- **Validation (simulation):** pass iff, after running all blocks, Loopi is on the goal, every required berry was visited (in the required order on L4 "in order" items), no blocked move happened, and blocks used ≤ `S`. Any program meeting this passes; there is no single "correct sequence".

### 4.4 Generator (solution-first, seeded)
1. Build the intended solution program P for the level (table below).
2. Trace P from a start tile chosen so the path stays on the grid.
3. Place the goal (and berries) on the path; place rocks only on tiles **not** on the path, chosen to block the obvious straight-line shortcut where the level says so.
4. Set `S` = level rule. Verify by BFS that P is valid and that a solution with ≤ `S` blocks exists (P itself).

| Level | Intended solution P | Rocks | Slots `S` | Palette | Notes |
|---|---|---|---|---|---|
| 0 tutorial | → | 0 | 1 | → | pointing hand drags → |
| 1 | 1–3 moves, one direction | 0 | = len(P) | 2 arrows | strip, not grid |
| 2 | 3–4 moves, one turn (L-shape) | 0 | = len(P) | 4 arrows | |
| 3 | 4–6 moves, 1–2 turns | 1–2 blocking the straight route | len(P) + 2 | 4 | longer valid paths accepted |
| 4 | 5–7 moves through 1 berry, then goal | 1–2 | len(P) + 2 | 4 | decomposition: berry first |
| 5 | debug: a program Q = P with exactly one block replaced by a different direction; Q given in the slots | 1–2 | len(P) | 4 | child taps the wrong block and picks a replacement |
| 6 | repeat n [d] with n 3–5, plus ≤1 extra move | 0–2 | 2–3 (forces repeat) | 4 + repeat | |
| 7 | repeat n [d1 d2] staircase, n 2–4 | 1–3 (off path) | 2 | 4 + repeat | |
| 8 | debug loop: P with wrong n (±1) or one wrong body block | 1–2 | as P | 4 + repeat | |

Constraints (unit-test levels × 50 seeds): path never leaves the grid; goal ≠ start; rocks never on the path; berries reachable; `S` ≥ shortest solution; L5/L8 bug is never in a position where the buggy program already succeeds.

### 4.5 Misconceptions → feedback
| Observed | Misconception | First-miss response |
|---|---|---|
| Loopi stops one tile short / long | counted tiles including the start | trace mode counts each step aloud: "one, two, three" |
| Wrong direction early | left/right or up/down mix-up | the arrow on the block and Loopi's face turn together; helper points at the goal's side |
| L6+: repeat count one too many | "repeat 3 = 3 extra" | Puff counts each repetition with a paw: "one time, two times, three times" |
| L5/L8: child changes the last block | fixing the end instead of the first error | run pauses at the **first** wrong move; that block wobbles |

### 4.6 Hint ladder
- **First miss:** the run replays slowly with a play-head moving across the program; it pauses on the first block that leads off the path or into a rock; that block wobbles. Puff explains (concept line below).
- **Second miss (model):** a dotted footprint path appears on the grid, numbered 1…n; the slots show ghost blocks for the intended solution; the child taps each ghost to confirm it (errorless), then Go.

### 4.7 Helper explanations (Puff)
- `gp.help.start` "A program is a list of steps. Loopi does them in order, one by one."
- `gp.help.step` "One arrow means one step. Count the squares."
- `gp.help.plan` "Find the berry first. Then plan from the berry to the goal."
- `gp.help.debug` "Run it and watch. Fix the first step that goes wrong."
- `gp.help.repeat` "A repeat card does the same steps again. Repeat 3 means do it 3 times."
- `gp.help.staircase` "Look for a pattern: right, up, right, up… that's one repeat!"

### 4.8 Voice lines (prefix `gp.`; ≈38 ids)
Prompts: `gp.prompt.goal` "Help Loopi reach the berry!" · `gp.prompt.via` "Get the berry first, then go home." · `gp.prompt.debug` "Oops, one card is wrong. Can you find it?" · `gp.prompt.repeat` "Use a repeat card to save space."
Run: `gp.run.go` "Go, Loopi!" · `gp.run.bump` "Bonk! A rock." · `gp.run.edge` "That's the garden fence."
Praise: `gp.praise.1` "You planned every step!" · `gp.praise.2` "You found the bug and fixed it!" · `gp.praise.3` "One repeat card did all that work." · `gp.praise.4` "You spotted the pattern."
Retry: `gp.retry.1` "Let's watch it step by step." · Idle: `gp.idle` "Tap an arrow to add a step."
Story 10, helper 6, counting "{n}" 1–7, repeat counts 2–5. **Estimate ≈ 38 ids, ≈ 70 clips.**

### 4.9 Reward
Sticker **"Path Finder"**: a leaf badge shaped like an arrow, with Loopi's antenna light on top.

### 4.10 Accessibility
- Grid also described as text, updated after every move: "Loopi is on row 2, square 1. Berry: row 2, square 4. Rock: row 2, square 3."
- During Run, each move is announced ("right, right, bump").
- Muted play: footprints and arrows carry all meaning. Colour-blind: rocks, berries, goal differ by shape.

## 5. Accuracy notes
- Absolute arrows first, relative turns later (Bug Hunt L5): relative turns depend on perspective-taking, which young children find harder.
- "Algorithm" and "program" are both used correctly: the step list is an algorithm; the block version Loopi runs is a program.
- AI world wording: "learns patterns from examples" (not "thinks", "knows" or "understands"). Keep claims about real AI general and accurate; an educator with CS background should review the AI world.

## 6. Age-appropriateness and safety
- No external code execution or network calls from child pages; teen web previews are sandboxed iframes.
- Game Maker: games can be shared only via friends-only codes (PHASE1_BRIEF), with no free-text names, chat or comments.
- AI concepts: no generative AI is used inside the child product; the "safe AI use" habits (check with a grown-up, don't share personal information) are taught in `cyber.md`.
