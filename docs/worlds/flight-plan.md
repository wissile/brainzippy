# Ziggy's Flight Plan (`flight-plan`)

Ages 12–14 · Pilot ground school library (`pilot`, "Sky School"), last stop of the Pilot journey ("Learn to fly with Ziggy"), after Compass Rose Runways (10–12) · host **Ziggy**, helper **Dabble** (Ziggy's science friend, who tests everything twice), passenger **Bobbo** · music `sky`.
Code: `src/games/flight-plan/`. Registry: `src/content/packs/flight-plan/`. Spec sources: `docs/curriculum/pilot.md` §2 (skills) and §3 worlds 4 (Lift Lab Wind Tunnel), 6 (Landmark Navigator), 8 (METAR Decoder) and 10 (Go/No-Go Briefing Room), adapted for 12–14.

> **Educational only.** This world is general aviation education. It is **not** flight training or FAA-approved ground training, does not replace a certificated flight or ground instructor (CFI/AGI/IGI), and does not count toward any certificate, rating, logbook entry or knowledge-test endorsement. The model wing, the chart, the weather stations, the METARs and Ziggy's minimums card are **fictional**; the chart is marked "not to scale · not for navigation" and the card "not real legal minimums". The notice is spoken and shown at the start of the world (Ziggy's intro line on every visit; a card on the first story beat), per the band T rule in `pilot.md`.

## Objective
"Plan a (fictional) flight like a pilot." The child is Ziggy's co-pilot for tomorrow's flight to the island festival: test the wing, time the route, read the weather, run the checklist, then make the final call.

| Skill (new id) | Ages | Inner game | Child can… |
|---|---|---|---|
| `pilot.aero.aoa` | 11–14 | Wind Tunnel | say lift grows with angle of attack and airspeed; find a wing's critical angle (±1°); know a stall can happen at any speed and is not the engine stopping; lower the nose to recover |
| `pilot.nav.tsd` | 10–14 | Leg Timer | use minutes = distance × 60 ÷ groundspeed; groundspeed = airspeed ∓ head/tailwind; round to the nearest minute; add two legs |
| `pilot.wx.metar` | 12–14 | Weather Brief | decode simplified METAR groups (time Z, wind *from*, visibility SM, cloud cover + base in hundreds of ft, temperature/dew point, gusts) and compare a report with a minimums card (ceiling = lowest BKN/OVC) |
| `pilot.reg.preflight` | 12–14 | Checklist | order planning-to-take-off steps; spot the missing planning item (weather, fuel + reserve, runway lengths, take-off/landing distances, plan B) |
| `pilot.adm.risk` | 12–14 | Checklist (IMSAFE), Briefing | use IMSAFE; combine route, weather, pilot and plane into go / wait / no-go; resist "we can't be late" |

**Adaptation (say so):** `pilot.md` lists METARs, pre-flight action and ADM as 14+ (band T). Here they are deliberately simplified for 12–14: only the groups above (no remarks, RVR, weather phenomena, TAFs or altimeter), a practice card instead of 14 CFR 91.155 minimums, and a planning card "inspired by" 91.103 rather than its text. Full METAR/TAF, VFR minimums and real chart work stay in band T.

**Prerequisites.** Registered: `pilot.aero.aoa` ← `pilot.flight.four-forces` (Sky Hoops, ages 6–9, so the planner assumes it by age and never locks this world); `pilot.adm.risk` ← `pilot.reg.preflight` (same world). Soft (docs only, not registered yet): `pilot.nav.headings`/`nav.pilotage` → `nav.tsd`; `pilot.wx.wind`/`wx.fronts` → `wx.metar`.

## The round: one flight plan
Eight items: seven planning items from up to four inner games, mixed (the engine's variety rule alternates answer kinds: numeric, number, match, sequence, choice), then the **go / no-go briefing**, which is an engine `closer` (R5a, D-043): never served early, always the last item, at every pace and difficulty (unit-tested over 12 seeds × 8 levels × 3 paces). In-round step-ups and step-downs work as in every world.

## Levels (0-based; the screen shows level + 1)
| Lv | Inner games unlocked / parameters | Briefing factors |
|---|---|---|
| 0 | **Tunnel**: find the stall (live graph, tutorial with pointing hand on the angle slider); lift vs speed, lift vs angle · **Leg**: 60 or 120 kt, whole minutes | route (fuel vs trip + 30 min) · plane |
| 1 | Tunnel: find; stalls at high speed past the critical angle; slow ≠ stalled; "a stall isn't the engine" · Leg: 90–180 kt | route · plane |
| 2 | + **Weather**: decode wind + visibility (1 misconception tile); fly/wait on visibility and wind · find (graph appears only after a miss) | + weather |
| 3 | + **Checklist** order (4 steps) · decode + cloud group; ceiling on the card · head/tailwind (±10–30 kt) · stall recovery | route · weather · plane |
| 4 | + **IMSAFE** · missed planning item · decode + time (Zulu), 2 misconception tiles · flaps (curve shifts up, stalls ~2° sooner) | route · weather · pilot |
| 5 | nearest minute (fractions kept 0.15–0.35 / 0.65–0.85 from a whole) · temperature/dew point · "a scattered layer isn't a ceiling" trap · 5 steps · IMSAFE with "push through" | all four + "Bobbo can't be late" |
| 6 | gusts (decode + card) · a "skip it" card to leave out · rounding with wind · flaps without the graph | all four + pressure |
| 7 | two cloud layers · two chained legs (total) · everything mixed | all four + pressure |

R0 levels the child up after ≥ 50 % first-try answers. No timers anywhere (the wall clock in the room is decoration, and stopped at the same time).

## Inner games and why this interaction
- **Wind Tunnel.** A fictional model wing (five colours, critical angles 14–18°, flaps −2°) with smoke streams that bend down behind the wing (downwash) while attached and break into eddies over the top past the critical angle; a lift arrow and meter; a lift graph that draws itself from the points the child visits, **one trace per airspeed**, so two traces peaking at the same angle show that the stall angle doesn't depend on speed. Answer: set the angle and press "Stall angle" (numeric, ±1°, so the peak or the first stalled angle both count). Choice items keep the tunnel live so the child can test each option (e.g. pull up more → smoke stays broken). Slider by drag, − / + taps or arrow keys; values readable as a hidden table; `aria-valuetext` reads angle, lift and flow.
- **Leg Timer.** Ziggy's original island chart (six fictional places, magenta legs, not to scale), the leg drawn bold with its distance, a wind arrow along or against the leg. Keypad (or number keys) for minutes. First miss: too long/too short + the method card; second miss: the worked division (`groundspeed = 120 − 20 = 100 kt`, `30 × 60 ÷ 100 = 18`), answer filled in to confirm.
- **Weather Brief.** A practice METAR on a dark briefing board; "Read it to me" reads it as pilots say it ("wind two seven zero at ten knots", "broken at three thousand five hundred feet"). Decode = match groups to plain-language tiles (tap-tap either way, drag a tile onto a group, or Tab + Enter); call = compare with Ziggy's practice card and choose fly or which line says wait.
- **Pre-flight Checklist.** Order steps on a kneeboard clipboard (tap, drag or keyboard; Backspace takes the last back); spot the missing card line in Ziggy's notes; IMSAFE morning note.
- **Go / No-go briefing.** Rows for route, weather, pilot and plane (by level) and Bobbo's "we can't be late"; one problem is enough. Second miss marks each row OK / problem in turn. The outro follows the call: take off now, a wise "wait an hour", or "sort it out, then fly".

## Distractors → misconceptions
| Inner game | Distractor | Misconception (source: `pilot.md` §2 unless noted) |
|---|---|---|
| Tunnel | "No stall: it's too fast to stall" | stalls happen only at low speed |
| Tunnel | "Only if the engine stops" / "The engine stops" | a stall means the engine stopped |
| Tunnel | "It stalls: slow always means a stall" | slow = stalled |
| Tunnel | "Pull the nose up even more" / "Add power and keep the nose up" | recovery by pulling up; power fixes a stall |
| Leg | d + s, s × 60 ÷ d, d ÷ s (hours), no wind, wind the wrong way | adds speed and distance; flips the ratio; forgets ×60; ignores or reverses wind |
| Weather | "Wind blowing toward 270°" | wind in METAR is "to" |
| Weather | "Visibility 10 kilometres" | visibility in km |
| Weather | "Broken clouds at 35 ft" | forgets hundreds of feet |
| Weather | "16:50 local time" | times are local |
| Weather | "High of 18 °C, low of 12 °C" | temperature/dew point read as a forecast range |
| Weather call | "Wait: the ceiling is too low" under a low FEW/SCT layer | any cloud layer is a ceiling |
| Checklist | "Skip the walk-around: the plane flew yesterday" etc. | good pilots don't need checklists; get-there-itis |
| Checklist | "Weather: skipped, it's only a short hop" | weather check is optional for local flights |
| IMSAFE | "Ready: Ziggy is experienced, so he can push through" | experience overrides fitness (hazardous attitude) |
| Briefing | "GO anyway: Bobbo can't be late" | external pressure / get-there-itis |

## Hints
First miss: Dabble's line is diagnosed from the miss (`hints.ts`), e.g. too low → "Lift was still climbing there. Keep tilting until it suddenly drops."; wind "to" → "A wind group says where the wind comes from, not where it's going."; noWind → "Don't forget the wind. Work out the groundspeed first." Right parts stay (gold), wrong choices grey out. Second miss: worked steps on the board, one per runner step, and the answer is marked for the child to complete (errorless). Wrong answers are never punished; retries are unlimited.

## Story (voiced, captioned)
Intro (4): Ziggy, the calmest pilot at Sky School · flying Bobbo to the festival tomorrow · good pilots plan first · "Will you be my co-pilot?". Between (2, 4, 6). Outro (3): go / wait / fix beat, Ziggy at the festival, sticker **Co-pilot's Clipboard**.

## Voice
`voice.json`: 118 lines (Ziggy, Dabble, narrator), METAR reading lines with `vary` lists that cover every generated value (unit-tested); no line praises ability. Clips are rendered by the lead (Kokoro); the clip-coverage unit test fails until then.

## Accessibility
Every control is a `<button>` (or a native range input) with an action label; drag is optional everywhere; keyboard: Tab/Enter/Space, arrow keys on sliders, digits/Backspace/Enter on the keypad, Backspace on the checklist. Targets ≥ 44 px (sliders' thumbs 44 px, steppers 48 px, keypad 52 px). Reduced motion: no smoke flow, eddies, windsock or cloud drift, no pulses. Calm mascot states (no bouncy celebrations) for the age group.

## Shared edits (callouts)
- Engine R5a `Exercise.closer` + `selectNextExercise(pool, state, config?)`; GameRunner passes the config (backwards-compatible; unit-tested; D-043 proposed).
- `src/analytics/schema.ts`: `"flight-plan": "fp"` in `EXERCISE_PREFIX` (the registry test requires every world).
- If site copy is added later, the catalogue text about in-round steps still holds (stepUpAfter 2, stepDownAtAttempts 3).

## Instructor review required (every item)
**Every item must be reviewed by a current FAA-certificated flight or ground instructor before release.** Flags:
1. Wind tunnel model: lift ∝ C_L·v², linear C_L to a critical angle of 14–18° then a sharp drop; flaps shift the curve up and lower the stall angle by 2° (qualitatively per PHAK "Aerodynamics of Flight"; numbers are invented). Smoke picture (downwash attached; separation over the top past the critical angle).
2. "A stall can happen at any airspeed" and "lower the nose first to recover" (PHAK; Airplane Flying Handbook stall recovery).
3. TSD conventions: nautical miles and knots; per-leg rounding to the nearest minute then summing; straight head/tailwind only (no crosswind triangle).
4. METAR subset and wording: "10SM = 10 statute miles or more", cloud bases AGL in hundreds of feet, "Zulu = UTC", ceiling = lowest BKN/OVC (no vertical visibility). Fictional station ids XPBF/XFES/XGRK: "X" is believed not to be an ICAO region letter; **verify unassigned before release**.
5. Ziggy's practice card (ceiling 3,000 ft, visibility 5 SM, wind 15 kt, gusts 20 kt) is a personal-minimums style card, explicitly not legal minimums; check the wording can't be read as 91.155.
6. Planning card "inspired by 14 CFR 91.103" (weather, fuel + reserve, runway lengths, take-off/landing distances, alternatives); fuel reserve 30 min "in the spirit of 91.151 day VFR". Check the simplification.
7. Checklist order (weather → route → fuel → walk-around → passenger briefing → engine start → run-up → take-off): confirm it is unambiguous for a generic trainer.
8. IMSAFE letters (Illness, Medication, Stress, Alcohol, Fatigue, Emotion — PHAK; some sources use "Eating"); no alcohol scenarios for this age group.
9. Briefing outcomes (rest = no-go today; fuel/fix = not yet; weather below card = wait) and the "get-there-itis" framing.
