# Ziggy's Busy Airport (`busy-airport`)

Ages 3–5 · Pilot library (`pilot`, "Sky School"), first stop of the Pilot journey ("Learn to fly with Ziggy") · topic `pilot.airport` (new) · host **Ziggy** (unflappable capybara pilot), helper **Hoot** (in the control tower) · music `sky`.
Code: `src/games/busy-airport/`. Registry: `src/content/packs/busy-airport/`.

> **Educational play only.** Airport jobs for pre-schoolers: sorting, counting, patterns and direction words. Nothing here is flight training. The marshalling signals are a child-sized version of the real ones (see "Accuracy").

## Objective
"Child can sort by one attribute and then two, count up to 10 with one number per object and count out a set, continue a repeating pattern, and follow simple direction signals." The airport opens for the first holiday flights and everything is in a muddle; the child is Ziggy's ground crew.

| Skill | Pack | Inner game | Levels (0-based) |
|---|---|---|---|
| `pilot.airport.sort` (new) | busy-airport | Bag Drop | 0–8 |
| `math.count.one-to-one` | core-math | All Aboard (count 1–3) | 1–4 (mostly 1–2; the count ranges still start at 2–3 up to level 4) |
| `math.count.cardinality` | core-math | All Aboard (count 4–10) | 2–8 |
| `math.count.make-set` | core-math | All Aboard (make) | 4–8 |
| `math.pattern.repeat` | math-pattern-parade | Runway Lights | 2–8 |
| `pilot.airport.signals` (new) | busy-airport | Marshaller | 3–8 |

## Four inner games
Each exercise belongs to one inner game (`params.mode`); a round of 8 rotates through every game the level has unlocked (index-based), and the engine's selector (R5) avoids repeating the same answer kind back to back. A station sign ("Bag Drop", "All Aboard", …) swings in at the top of the board for each item.

| Game | Scene | Interaction | Answer | Why this interaction |
|---|---|---|---|---|
| **Bag Drop** | conveyor belt + 2–4 planes | drag a suitcase onto a plane (or tap bag, tap plane; Enter, Enter); tap a plane to take its last bag back; Ready | `match` bag → plane | sorting is physically putting like with like; the conveyor makes it a job, not a quiz |
| **All Aboard** — count | big plane with 10 windows in two rows of five (a ten-frame) | tap / drag each passenger; each takes the next window with its number; then pick how many (each answer shows the numeral over a mini ten-frame with that many windows full, and says the number) | `number` + 3 choices | one tap = one passenger = one number (one-to-one); the filled windows keep the count visible, and the last number answers "how many" (cardinality) |
| **All Aboard** — make | same plane, a lounge with n + 2–3 passengers, Ziggy's ticket board shows n (numeral + dots) | board exactly n, "Send one back" if too many, Ready | `number` (no choices) | counting out and **stopping** is a separate skill from counting what is there |
| **Runway Lights** | runway with blinking lights and empty sockets | one gap: tap (or drag) the next bulb; 2–3 gaps: fill sockets in order, undo, Ready | `choice` / `sequence` | lights blink left to right so the child hears/sees the rhythm of the unit; the bulb box always holds one bulb that never fits |
| **Marshaller** | taxiway junction, marshaller with glowing wands, plane from behind | big picture buttons: Turn left, Go ahead, Stop, Slow down, Turn right; two-signal levels show a numbered strip and a plan | `choice` / `sequence` | direction vocabulary through a real airport job; the plane rolls the chosen way (wrong = a puzzled wiggle, never a crash) |

## Levels (screen shows level + 1)
| Lv | New | Bag Drop | All Aboard | Runway Lights | Marshaller |
|---|---|---|---|---|---|
| 0 | tutorial + Bag Drop only | colour, 2 planes, 2–3 bags (tutorial: 2 bags, drag-demo hand) | — | — | — |
| 1 | All Aboard | colour, 2 planes, 3 bags | count 1–3 | — | — |
| 2 | Runway Lights | colour, 3 planes, 3–4 bags | count 2–5 | AB, next light (2 bulbs) | — |
| 3 | Marshaller | **shape** (white planes, tail emblem), 2 planes, 3–4 bags | count 2–6 | AB, 2 more lights (+ outsider bulb) | left / right |
| 4 | count out a set | shape, 3 planes, 4 bags | count 3–7 · make 2–4 | AAB / ABB, next light | + stop |
| 5 | — | **colour + shape**, 4 planes (2 × 2), 4 bags | count 4–8 · make 3–6 | AAB / ABB, 2 more | + go ahead |
| 6 | — | colour + shape, 5 bags | count 5–10 · make 4–7 | ABC (mostly), 1–2 more, 4 bulbs | + slow down (all five) |
| 7 | — | colour + shape, 5 bags | count 6–10 · make 5–8 | ABC / AAB / ABB, 3 more | two signals in order (4 moves; never starting with stop) |
| 8 | — | colour + shape, 5 bags | count 6–10 · make 6–8 | missing light in the middle | two signals in order (all five) |

R0 levels the child up after ≥ 50 % first-try answers; within a round difficulty steps up after 2 first-try answers (so a level-0 round usually meets All Aboard and Runway Lights too). **No time pressure anywhere.**

## Distractors and the misconceptions they target
- **Bag Drop.** Shape levels: bag colours are random and planes are all white, so colour can never be the rule (the classic pre-school slip is to sort by the most salient attribute, colour, whatever the rule). Two-attribute levels: every bag shares one attribute with a wrong plane (red-star vs red-circle vs blue-star), which targets "one match is enough". Every plane gets a bag before any plane gets a second, so no plane is a pure decoy at low levels.
- **All Aboard.** Count choices are three neighbours (n−1, n, n+1, clamped to 1–10): skipping a passenger or counting one twice gives exactly ±1. Each choice carries a quantity picture (a mini ten-frame laid out like the plane's windows) under the numeral, so 3–4-year-olds who don't yet read numerals can match "this many" to the filled windows; the numeral stays the larger cue. Make-a-set: the lounge always holds 2–3 extra passengers, so the child must stop ("keep going past n" is the common error); too many / too few is diagnosed in Hoot's hint.
- **Runway Lights.** Two full repeats show before the first gap (three for AB), so the unit is visible. Single-gap bulb boxes contain the pattern's colours (plus an outsider colour from level 6); multi-gap boxes add one bulb that never fits — an outsider colour, or for AAB/ABB a pattern colour that isn't needed next (targets "copy the last light" and "any pattern colour will do"). Level 8 hides a light in the middle (not only at the end), so the child must check the unit both ways.
- **Marshaller.** Left ↔ right is the most confused pair, and both turns appear in every band. Two-signal plans never start with stop (a plane that has stopped is not then told to slow down); stop can still be the second move. Stop vs go ahead (both arms up) differ in wands crossed vs beckoning; slow down is low and patting.

## Hints (wrong answers are never punished)
- **First miss:** Hoot pops in with the strategy for that game (`hintFor`): check each colour / look at each tag's shape / check colour **and** shape; touch each window and say one number; too many — send some back / we need more; say the pattern out loud; follow the pointing wand / crossed wands mean stop / beckoning means go ahead / patting means slow down. On the board: right bags stay loaded with a tick, wrong ones roll back; the wrong number, bulb or move greys out; right lights stay in their sockets; for make-a-set the n seats Ziggy needs light up as dashed rings.
- **Second miss (modelled answer):** Ziggy says "Watch me", the board does it step by step (bags loaded one by one; windows counted aloud; bulbs placed; plan filled), then "Your turn! Press the glowing one" — the child presses the glowing Ready / number / bulb / move (errorless).
- Idle help replays a short line and points at a bag, the first waiting passenger, the empty socket or the marshaller (never the answer).

## Accessibility
- Everything spoken and captioned; picture-based for pre-readers (station signs have a pictogram; button words are secondary).
- Colour is never the only cue: bag colours have textures (red stripes, blue dots, yellow diagonals, green checks); lamp colours have shapes (red circle, blue square, yellow star, green triangle); tag emblems are ink on white. Labels name colour and shape.
- Every drag has tap-tap and keyboard (Enter) alternatives; focus moves to the next sensible control (bag → planes → next bag → Ready; passenger → next passenger → choices).
- Tap targets ≥ 64 px at 390×844, 915×412, 1024×1366 and 1280×800 (checked in e2e).
- Reduced motion: no belt movement, no wand waving (static poses stay distinct), no light chase, no plane roll; the station sign is skipped (the prompt says the same).

## Story
Intro: Ziggy's airport opens for the first holiday flights · everything is in a muddle · bags mixed up, runway dark, a little plane lost · "Will you be Ziggy's ground crew?" Between items (after 2, 4, 6): the airport wakes up · the travellers cheer · the first plane warms up. Outro: the plane rolls to the lit runway · "Three, two, one… whoosh!" take-off · the **Ground Crew** sticker (a round badge with a little plane taking off over two crossed marshalling wands).

## Accuracy
- Marshalling: real (ICAO-style) signals face the pilot. "Turn left (pilot's view)": the marshaller's right arm (on the pilot's left) points out, the other arm beckons — our "the wand points the way to go". "Stop": wands crossed above the head. "Move ahead": both arms bent, wands beckoning. "Slow down": arms low, patting down. We teach these in simplified, child-sized form and never call them official; there is no "up/down" signal for a taxiing plane, so the brief's up/down became "slow down" (patting down).
- Planes are original generic cartoons (no manufacturer shape, livery or registration).
- No review by a flight instructor is needed for this world's content (no flight procedures); if the signals are reused in an older band, check them against the current ICAO Annex 2 / FAA AIM marshalling figures first.

## Open points
- The marshaller figure is new scene art (an unnamed ground-crew helper, not a registered character); creative-director review requested.
- The pilot library's ages are 6–14; this world (3–5) needs them widened to 3–14 (main agent, together with the host switch to Ziggy).
