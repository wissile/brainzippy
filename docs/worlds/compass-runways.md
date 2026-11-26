# Compass Rose Runways (`compass-runways`)

Ages 10–12 · Pilot ground school library (`pilot`, island "Sky School", journey "Learn to fly with Ziggy") · topics `pilot.nav` and `pilot.wx` (new, registered by this world's pack) · host **Ziggy** (in the control tower), helper **Gloop** (who can stretch into any angle) · music `sky`.
On the Pilot journey it sits between Zephy's Sky Hoops (6–9) and Ziggy's Flight Plan (12–14).
Spec: `docs/curriculum/pilot.md` §3 world 5 (Compass Rose Runways) and world 3 (Windsock Weather Station) for the wind skill. Code: `src/games/compass-runways/`. Registry: `src/content/packs/compass-runways/`.

> **Educational only.** This world is general aviation education for children. It is **not** flight training and not FAA-approved ground training. It does not replace a certificated flight or ground instructor (CFI/AGI/IGI) and does not count toward any certificate or rating. **Sky School Airport is fictional and nothing here is for navigation.** Every item is flagged for instructor review (see "Accuracy and review flags").

## Objective
"Child can read a windsock and name the wind by where it comes from, turn a heading into a runway number and back, work out a new heading after a turn (including past 360), and choose the runway end that faces into the wind."

| Skill | Ages | Levels | Child can… |
|---|---|---|---|
| `pilot.wx.wind` | 7–12 | 0–2, 5–8 | read a windsock (limp / half / full; which way it streams); name the wind by where it comes **from**; choose the runway end that faces into the wind (2 then 4 ends); tell headwind / crosswind / tailwind |
| `pilot.nav.headings` | 10–12 | 0–4, 7–8 | use headings 1–360 (north is 360); runway number = heading ÷ 10 rounded (01–36); opposite ends differ by 18; turn right (add) or left (take away), wrapping past 360 |

`pilot.wx.wind` is registered with ages 7–12 so the planned Windsock Weather Station (7–9) can teach it too. `pilot.nav.headings` lists `pilot.wx.wind` as its prerequisite (taught here too, so the planner never locks the world); `math.geom.angles` stays a **soft** prerequisite (docs only).

## Story ("Signs in the storm", 4 + 3 beats, between lines at 2, 4, 6)
A storm blew Sky School Airport's runway signs and numbers away; planes are arriving and Ziggy, in the tower, needs runway numbers and headings before the first one lands. Between lines track the first plane lining up, the windsock, and "two more, and every plane can come down". Outro: every plane touches down safely; Ziggy hands over the **Compass Rose Pin** (round gold pin with a compass rose, a runway and Ziggy's little orange windsock). No crash, emergency or danger anywhere; a wrong runway end just shows a calm "Go around!" chip.

## Five inner games, one scene
The board is always the airfield from above with a giant compass rose painted on the ground (north up, ticks every 10°, labels every 30° or every 10° on the harder items), plus a deck with the controls. A badge in the deck names the inner game.

| Inner game | What the child does | Answer |
|---|---|---|
| **Windsock Reader** | strength: a side-view sock hangs limp, droops half full, or sticks straight out · direction: a big sock on the rose streams downwind; name where the wind comes FROM (N/E/S/W, 8 points, then degrees) | choice |
| **Runway Painter** | paint: a runway lies at a heading, a landing arrow and a small plane show the direction; enter the number to paint at the touchdown end (steppers − / +, keypad, digit or arrow keys; it previews on the runway) · opposite: one end is painted, paint the other · rotate: the end is painted "14"; **drag round the rose** (snaps to 10°), use the turn buttons or arrow keys until it lines up | number (01–36, or a heading) |
| **Heading Turns** | the plane flies heading H; "turn right 120°": turn the plane's nose (drag, snaps to 5°) or use −10 −1 +1 +10 / keypad / keys; a faint "was" plane stays at the old heading | number (001–360) |
| **Into the Wind** | windsock + wind streaks + "Wind from 240°" chip; tap the runway end to land on (each end is a labelled button on the map at its threshold); then headwind / crosswind / tailwind for a plane on final | choice |
| **Tower Talk** | a radio card ("Sky School Tower") with a short call: "Wind 240 at 10" → which runway (sock hidden); "Cleared to land, runway 31" → which heading; "Fly heading 180, then turn left 90" → which runway is straight ahead; "Runway 27, wind 360 at 10" → what wind | choice |

## Conventions (decided here; unit-tested in `tests/unit/compass-runways.test.ts`)
- **Headings** are whole degrees 1–360, clockwise from north. **North is 360, never 000** (a typed "000" becomes 360; steppers wrap 360 → 001).
- **Runway number** = landing heading ÷ 10, rounded to the nearest whole number, two digits **01–36**. 360 → 36; 355–004 → 36; 006 → 01; 354 → 35. There is no runway 00.
- Headings ending in exactly **5** round half up in code (235 → 24, 005 → 01) but are **never generated** for painting: the rule is ambiguous at x5 and real airports choose a number by survey, not by a rounding rule.
- The two ends of one runway differ by **18** (09/27, 18/36, 14/32).
- **Wind is named by where it comes from.** A windsock streams away from the wind, so it points where the wind goes.
- **Into the wind** = the end whose landing heading is closest to the wind's direction; generated items keep a margin of ≥ 30° to the next best end, and the best end is within 30° of the wind.
- **Headwind** ≤ 30° between runway and wind, **crosswind** 60–120°, **tailwind** ≥ 150°; angles in between are never asked (qualitative only, no components).
- Numbers are **spoken digit by digit**, the way a tower says them: "runway two seven", "wind two four zero at one zero". Real radio says "niner" for 9; we say "nine" to keep it simple (noted for review).

## Levels (0-based; the screen shows level + 1). maxLevel 8. No time pressure anywhere.
Bands of 8 are generated in slot order; the engine then interleaves number and choice items (variety rule), so every round mixes inner games. New games unlock across levels: sock + paint (L0), turns (L3), wind (L5), tower (L7).

| Lv | Focus (inner games) | Slots (index % 8) | Parameters |
|---|---|---|---|
| 0 | Windsock strength + from N/E/S/W · paint N/E/S/W runways (+ authored tutorial: wind from the east, pointing hand on East) | strength, card, from4, card, from4, strength, card, from4 | rose labels every 30°; cardinal headings 090/180/270/360 → 09/18/27/36 |
| 1 | Runway number = heading ÷ 10 (tens) · rotate a runway to its number · wind from 8 points | ten, from8, ten, card, from8, ten, rotate, from8 | any multiple of 10; rotate starts 40–130° away; 4 options (right, opposite, ±45°) |
| 2 | Round to the nearest ten · opposite end ±18 · wind in degrees | round, opp, rotate, fromDeg, round, opp, round, opp | rounding headings never end in 0 or 5; ¼ sit next to north (356–004 → 36); opposite covers +18, −18 and 18↔36; fromDeg multiples of 30, options right / opposite / ±30° |
| 3 | Heading Turns: 90° turns from N/E/S/W | quarter ×5, opp, fromDeg, round | results include 360 ("not 000") |
| 4 | Heading Turns: any turn, and past 360 both ways | wrap ×4, turn ×2, opp, rotate | turns 30/45/60/90/120/135/150 (180 in plain turns); wraps never land exactly on 360; right and left in every band |
| 5 | Into the Wind: one runway (2 ends) | two ×5, fromDeg, wrap, round | wind within 30° of one end (multiples of 10) |
| 6 | Into the Wind: two runways (4 ends) · headwind / crosswind / tailwind | four ×4, xwind ×3, turn | runways 50–130° apart; best end ≥ 30° clearer than the next; xwind offsets 0–20° / 80–100° / 160–180° |
| 7 | Tower Talk: radio calls | twind ×2, tline ×2, tjoin ×2, tcomp, xwind | tower winds multiples of 10 at 10 knots; joins use 60/90/120/180° turns that line up with a runway at the airport |
| 8 | Busy tower: everything mixed, hardest settings | tjoin, twind, wrap, round, tcomp, four, tline, fromDeg | as above |

R0 levels the child up after ≥ 50 % first-try answers; within a round difficulty steps up after 2 first-try answers and down after 3+ attempts.

## Distractors and the misconceptions they target
| Item | Distractor | Misconception |
|---|---|---|
| Windsock from | the direction the sock points (always offered) | wind is named by where it blows to |
| Windsock from (8 / degrees) | ±45° / ±30° neighbours | misreading the rose |
| Paint | the opposite end's number (diagnosed) | painting the number at the wrong end / reading the arrow backwards |
| Round | one off (diagnosed) | cutting off instead of rounding (236 → 23) |
| Opposite | the same number (diagnosed) | both ends share a number |
| Rotate | arrow pointed the opposite way; the number read as degrees (14°) | runway numbers are "just names" |
| Turns | turning the other way (diagnosed) | left/right ↔ add/take away; no input above 360 exists, so wrap errors surface as a stuck child, which the round-start explanation for wrap items addresses |
| Into the Wind | the downwind end (always offered); a side-on end | land with the wind; wind named by where it goes |
| Head/cross/tail | the other two | comparing the wind with the plane's position instead of its heading |
| Tower: line-up heading | the opposite end's heading; the runway number read as degrees ("031°") | runway numbers are just names; 360 and 0 differ |
| Tower: join | the runway a wrong-way turn would line up with | turning the wrong way |

## Hints (never punished; retries unlimited)
- **Round start:** Gloop explains the idea of the first item (e.g. "A windsock is like a tail. It points away from where the wind comes from.").
- **First miss:** Gloop's line is diagnosed from the miss (`hints.ts`, table above) and teaches the strategy, never the answer. The board adds a strategy visual: **a leaf blows from the wind's source** (windsock, into-the-wind, tower wind items); the two nearest tens glow on the rose (rounding); the heading tick glows (paint); a 180° arc joins the two ends (opposite); a short arc shows the turn's **direction** and **"360 = 0"** glows when the turn passes north (turns); an angle arc between runway and wind (head/crosswind); the radio call splits into two steps (tower). Wrong choice options grey out.
- **Second miss (model):** the worked steps appear in the deck ("300 + 120 = 420 → 420 − 360 = 60 → heading 060°"), the full gold turn arc is drawn, a ghost runway shows the target (rotate), the right option / runway end glows and a ghost plane lands on it. The number entry is set to the answer and only Check is live (errorless).

## Accessibility
- Playable muted (every line captioned; the wind is also stated in text and in the board's `aria-label`), by keyboard (digits, ↑ → +, ↓ ← −, Shift for ±1 on headings, PageUp/PageDown ±10, Backspace, Enter = Check; choice buttons are focusable `<button>`s) and **without drag** (steppers and keypad do everything the dial does).
- Targets: answers and runway-end buttons ≥ 56 px, steppers 52 px, keypad keys ≥ 44 px. On short landscape phones the keypad hides (container query) and steppers + dial + keyboard remain.
- Reduced motion: no leaf flight (leaf held mid-path), no streak or flutter loops, no glides or spins; dial changes jump.
- An `aria-live` line announces dial and number changes ("Heading 240", "Painted 27").

## Voice
77 line ids, **267 clips** (prefix `cr.`; speakers: ziggy, gloop, narrator). Variable lines: `cr.prompt.opp`, `cr.prompt.rotate`, `cr.tower.line` (36 runway numbers each), `cr.tower.wind`, `cr.tower.comp` (36 ten-degree winds each), `cr.prompt.turn` (2 directions × 8 turn sizes). Numbers spoken digit by digit. Not rendered yet (main agent renders with Kokoro; the clip-coverage test fails until then).

## Accuracy and review flags (instructor review required before wider release)
Sources: FAA *Pilot's Handbook of Aeronautical Knowledge* (FAA-H-8083-25C), chapters "Airport Operations" (runway numbering, wind direction indicators, landing into the wind) and "Navigation"; FAA *Aeronautical Information Manual* ch. 2 (airport marking aids: runway designators) — re-check current editions.
- **Magnetic vs true:** real runway numbers come from the runway's **magnetic** heading; tower winds are magnetic, written METAR winds are true. This world says "heading" throughout and leaves magnetic variation out. Flag.
- **Runway number rounding:** "nearest 10°, divided by 10" is the general rule; actual designators are assigned by survey and may differ (e.g. parallel runways L/C/R, re-numbering after magnetic drift). Parallel runways are out of scope. Flag.
- **Windsock:** a full, straight sock is commonly taught as about 15 knots or more; partial extension means lighter wind. The world only uses "calm / light breeze / strong wind", no knot values. Flag the wording.
- **Into the wind:** landing into the wind lowers groundspeed and shortens the landing roll ("a slower, shorter landing" in praise). Runway choice in reality also depends on noise rules, length, preferential runways and the tower's instruction; the world simplifies to wind only. Flag.
- **Headwind/crosswind/tailwind** are qualitative only (no components, no limits).
- **Phraseology:** calls are simplified and not real ATC phraseology (no call signs, no "niner", "wind two four zero at one zero" only). Flag.
- **Not for navigation:** fictional airport and layout; no real airport diagram is shown.

## Simplifications (say so to grown-ups)
Wind and runways only (no traffic, no noise rules), magnetic variation left out, qualitative crosswind, simplified tower calls, a flat top-down airfield.

## Files
`logic.ts` (pure maths + model steps) · `generator.ts` (levels, slots, scenarios) · `hints.ts` · `definition.ts` · `Board.tsx` + `compass-runways.css` · `art.tsx` · `story.tsx` · `CompassRunways.tsx` · `voice.json` · tests `tests/unit/compass-runways.test.ts`, `e2e/compass-runways.spec.ts`.
Shared edit: `src/analytics/schema.ts` `EXERCISE_PREFIX` gains `"compass-runways": "cr"` (required by `tests/unit/analytics.test.ts`; the Worker validates exercise ids by prefix).
