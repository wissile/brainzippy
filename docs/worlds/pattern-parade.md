# Puff's Pattern Parade (`pattern-parade`)

Ages 4–6 · maths library (`math`), topic `math.pattern` · host **Puff**, helper **Gloop** · music `parade` (new original loop in `scripts/gen_music.py`).
Spec: `docs/curriculum/maths.md` §3 item 3. Code: `src/games/pattern-parade/`. Registry: `src/content/packs/math-pattern-parade/`.

## Objective
"Find the part of a pattern that repeats (or grows) and use it to say what comes next or what is missing."

| Skill | Ages | Levels | Child can… |
|---|---|---|---|
| `math.pattern.repeat` | 4–6 | 0–4 | continue and complete AB, AAB, ABB, ABC patterns, including a missing middle item |
| `math.pattern.translate` | 5–6 | 5–6 | show the same pattern with a different set of things (floats → animals, animals → instruments) |
| `math.pattern.grow-simple` | 5–6 | 7–8 | continue a +1 growing pattern of block towers and find a missing step |

`math.pattern.grow` (ages 8–10, finding a rule such as +3) stays free for a later world. The ages 4–6 "+1 towers" step is a new skill, `grow-simple`, so the two don't clash.

## Story
Puff's big parade is about to start, but a gust of wind knocks the marchers out of line. The child fills every gap so the parade can march. It has 4 intro beats, between-beats after exercises 2, 4 and 6, and 3 outro beats (the parade reaches the big stage, then the Parade Star sticker). A route strip on the board moves Puff's pennant toward the stage after each solved gap.

## Interaction and why
- **The parade line is the pattern.** Marchers stand in a row and the gaps are dashed boxes. The child **drags** a marcher from Puff's cart into a gap. They can also **tap** a marcher (it fills the chosen gap, or else the first empty one), **tap a gap, then a marcher** (tap-tap), or use the **keyboard** (Tab to a marcher, Enter). Tapping a filled gap sends its marcher back. Nothing needs drag.
- One gap uses a `choice` answer and submits at once. Several gaps use a `sequence` answer and are checked with the check button, so the child can change their mind first. Copies of a marcher are interchangeable pieces (same `text`).
- **Shape and colour both change.** Floats are star/gold, heart/pink, moon/blue and leaf/green. Animals, instruments and towers all have distinct silhouettes, so colour is never the only cue.
- **Sound patterns (optional).** Every marcher has its own sound: drum = low thud, bell = ding, shaker = click, each float a marimba note, tower *n* = note *n*. You hear the sounds when a marcher lands, when the solved parade marches past, and in the hints. All of them go through the shared SFX engine (global mute). Each sound has a visual twin (a hop or glow), so the game is fully playable muted.
- Up to 8 marchers per line. `rowLayout` wraps a line onto two balanced rows when the gaps would otherwise drop below 64 px (390 px phones). Translate pairs stay column-aligned.

## Levels (`generator.ts`, `maxLevel` 8, no time pressure)
| Level | Task | Answer | Cart |
|---|---|---|---|
| 1 (0) | AB, what comes next (4–5 shown) | choice | the 2 pattern marchers |
| 2 (1) | AB, next two | sequence ×2 | 2 + 1 new marcher |
| 3 (2) | AAB / ABB, next one (5–7 shown) | choice | 2 + 1 |
| 4 (3) | ABC, next one (even items) or two (odd items) | choice / sequence ×2 | 3 + 1 |
| 5 (4) | missing middle item in AB / AAB / ABB / ABC (6–7 long) | choice | unit + 1 |
| 6 (5) | translate AB (key unit already placed) | sequence ×2 | 2 + 1 of the new family |
| 7 (6) | translate AAB / ABB / ABC (key unit placed) | sequence ×3 | unit + 1 |
| 8 (7) | growing towers +1, next one (starts at 1–3) | choice | last, last+1, last+2 |
| 9 (8) | growing towers: next two (even items) / missing middle (odd items) | sequence ×2 / choice | copy, the answers, skip |

Level 0 opens with the authored tutorial: star, heart, star, heart, star, _ → heart. A hand points at the gap. The spoken prompt reads the pattern aloud, which models the strategy.

## Distractors → misconceptions
- **Copying the last marcher** (the most common error at 4–5): in AB patterns the answer always differs from the last shown marcher, so at level 0 the only wrong option is exactly "copy the last one". For towers, a copy of the last tower is always in the cart.
- **Unit not recognised** (AAB read as AB): the AAB/ABB levels put both pattern marchers in the cart, so a child who repeats only the last two marchers picks wrong.
- **"A new thing comes next"**: a same-family marcher that is not in the pattern.
- **Growing patterns:** "+1 again from the start" is ruled out by design. The cart holds *copy* (no growth), *+1* (right) and *+2 / skip one*.
- **Translate:** pieces come from the new family only, so the child has to map structure (A→A′), not appearance.

## Hints (wrong answers are never punished)
1. **Round start:** Gloop explains the strategy ("Say the parade out loud from the start. Listen for what comes again!").
2. **First miss:** the wrong marcher is greyed out (eliminate). For sequences, the right gaps stay filled (mark-parts). Gloop pops in, coloured **boxes appear around each repeat of the unit** (dashed for the box with the gap), and Puff "sings" the first unit, each marcher hopping in turn. For towers, count badges appear instead (1, 2, 3, ?).
3. **Second miss:** a worked example walks the whole row marcher by marcher (sound + glow, and towers are counted aloud). Ghost marchers show what belongs in each gap, the right cart marchers pulse, and the child still places them (errorless).

## Known limits and follow-ups
- Free "make your own pattern and repeat it twice" (maths.md level 8) is not here: it needs an open-ended rule check, not a fixed answer. It could be a later engine answer kind.
- Clap-stomp body sounds are represented by instrument sounds. Recorded claps/stomps could be added as SFX later.
- Voice clips need rendering (Kokoro af_bella). Until then the clip-coverage unit test fails for the `pp.*` lines.
