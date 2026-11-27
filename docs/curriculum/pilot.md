# Pilot ground school library (`pilot`)

Ages 3–adult. **Journey host:** Ziggy (D-042: unflappable capybara pilot with a sky-blue headset; hosts the Pilot journey and its new worlds). **Sky Hoops host:** Zephy ( a round albatross chick with oversized wings, aviator goggles and a red scarf, see `CHARACTERS.md`). Cameos: Bobbo (can't fly, loves planes), Gloop (angles), Rumble (weather naps).

> **Educational only.** BrainZippy pilot content is general aviation education. It is **not** FAA-approved ground training. It does not replace a certificated flight or ground instructor (CFI/AGI/IGI), does not count toward any certificate, rating, logbook entry or knowledge-test endorsement, and its maps are **not for navigation**. This notice appears on the library page and the parent page; band T content shows it at the start of each world.

**Aligned with:** FAA-S-ACS-6C *Private Pilot for Airplane Category Airman Certification Standards* (effective 31 May 2024, https://www.faa.gov/training_testing/testing/acs) and FAA-H-8083-25C *Pilot's Handbook of Aeronautical Knowledge* (PHAK). Weather science for children also aligns with NGSS 3-ESS2-1 (weather data) and MS-ESS2-5 (air masses and weather change). ACS codes here are cited at **Task level** (e.g. `PA.I.C` = Area I Preflight Preparation, Task C Weather Information). Element-level codes (`PA.I.C.K1`…) are mapped only after an instructor reviews each item against the ACS text.

ACS Area I tasks (checked against FAA-S-ACS-6C): A Pilot Qualifications · B Airworthiness Requirements · C Weather Information · D Cross-Country Flight Planning · E National Airspace System · F Performance and Limitations (aerodynamics is element PA.I.F.K3) · G Operation of Systems · H Human Factors.

## 1. Topics by age band

| Ages | Topic id | Topic | Primary source |
|---|---|---|---|
| 6–9 | `pilot.flight` | How planes fly: parts, four forces | PHAK chapters "Aircraft Construction", "Principles of Flight", "Aerodynamics of Flight" |
| 6–9 | `pilot.controls` | Controls: pitch, roll, yaw; how a plane turns | PHAK "Flight Controls" |
| 6–9 | `pilot.wx` (basic) | Wind, clouds, why pilots check weather | PHAK "Weather Theory"; NGSS 3-ESS2-1 |
| 10–13 | `pilot.nav` | Headings, runway numbers, pilotage, time-speed-distance | PHAK "Navigation", "Airport Operations" |
| 10–13 | `pilot.aero` | Angle of attack, stalls, lift factors | PHAK "Aerodynamics of Flight" |
| 10–13 | `pilot.airspace` | Airspace layers, controlled vs uncontrolled | PHAK "Airspace" |
| 10–13 | `pilot.wx` | Air masses, fronts, fog, thunderstorms | PHAK "Weather Theory"; NGSS MS-ESS2-5 |
| 14–adult | `pilot.wx` | METAR/TAF and weather services | ACS PA.I.C; PHAK "Aviation Weather Services"; FAA-H-8083-28 *Aviation Weather Handbook* (verify current edition) |
| 14–adult | `pilot.chart` | Sectional chart reading, cross-country planning | ACS PA.I.D; FAA *Aeronautical Chart Users' Guide* |
| 14–adult | `pilot.reg` | Regulations: VFR weather minimums, preflight action, documents | ACS PA.I.A, PA.I.B, PA.I.E; 14 CFR Part 91 (91.3, 91.103, 91.155) |
| 14–adult | `pilot.perf` | Weight and balance, density altitude, performance charts | ACS PA.I.F; PHAK "Weight and Balance", "Aircraft Performance" |
| 14–adult | `pilot.adm` | Aeronautical decision-making, risk, human factors | ACS PA.I.H and risk-management elements; PHAK "Aeronautical Decision-Making", "Aeromedical Factors" |

## 2. Skills

| skill_id | Objective (learner can…) | Ages | Prereqs | Misconceptions targeted | Lowest-level example | Highest-level example | Aligned with |
|---|---|---|---|---|---|---|---|
| `pilot.flight.parts` | name wings, fuselage, tail, propeller, landing gear and the three control surfaces | 6–8 | — | the propeller is the engine; tail is decoration | drag "wing" to the plane | label elevator, ailerons, rudder | PHAK Aircraft Construction |
| `pilot.flight.four-forces` | name lift, weight, thrust, drag and their directions; know they balance in steady level flight | 6–9 | flight.parts | planes "float"; lift only pushes from below; the engine lifts the plane | match force arrows | "level, steady speed: which pairs are equal?" | PHAK Aerodynamics of Flight; NGSS 3-PS2-1 |
| `pilot.controls.axes` | link stick back/forward, left/right and pedals to pitch, roll and yaw | 6–9 | flight.parts | push forward = go up; the rudder steers like a boat | hoop above: pull or push? | name axis + surface for an animation | PHAK Flight Controls |
| `pilot.controls.turn` | explain that a plane turns by banking (tilting its wings), with rudder to coordinate | 7–9 | controls.axes | rudder alone turns the plane like a car's wheel | to turn left, first…? | 3-hoop course needing bank turns | PHAK Flight Controls; Aerodynamics of Flight (forces in turns) |
| `pilot.wx.wind` | read a windsock and name wind by where it comes **from** | 7–9 | — | wind named by where it blows to | windsock points east: wind from…? | choose the runway facing into the wind | PHAK Weather Theory, Airport Operations |
| `pilot.wx.clouds-basic` | recognise fair-weather vs storm clouds and say why pilots wait | 6–9 | — | any cloud is dangerous; clear sky = always safe | sunny cumulus vs tall storm cloud | fog at the airport: fly or wait? | PHAK Weather Theory; NGSS 3-ESS2-1 |
| `pilot.nav.headings` | use headings 0–360° and runway numbers (runway 27 ≈ 270°) | 10–12 | wx.wind; math.geom.angles (soft) | runway numbers are just names; 360 and 0 differ | runway 09 points…? | from 090 turn right 120° → ? | PHAK Airport Operations, Navigation |
| `pilot.nav.pilotage` | follow a route on a map using landmarks and checkpoints | 10–13 | nav.headings, geo.map.grid (soft) | map faces the way you fly | match landmark on map to view | choose checkpoints for a 3-leg route | PHAK Navigation |
| `pilot.nav.tsd` | use time = distance ÷ speed for a leg | 10–14 (registered by Flight Plan, played at 12–14) | soft: nav.headings, nav.pilotage (registered: none) | adds speed and distance | 60 mi at 120 mph → minutes | wind slows groundspeed: new time | PHAK Navigation |
| `pilot.aero.aoa` | explain that lift changes with angle of attack and that a wing stalls past a critical angle of attack | 11–14 | flight.four-forces | stalls happen only at low speed; a stall means the engine stopped | more tilt → more lift? | pick the stall situation among 3 | PHAK Aerodynamics of Flight; ACS PA.I.F |
| `pilot.airspace.layers` | tell controlled from uncontrolled airspace and when pilots talk to controllers | 11–14 | nav.pilotage | airspace is a flat area; all airports have towers | towered vs non-towered airport | which class (B, C, D, E, G) on a layer diagram | PHAK Airspace; ACS PA.I.E |
| `pilot.wx.fronts` | describe air masses, fronts and the weather they bring | 11–14 | wx.clouds-basic | fronts are lines that exist on the ground | warm vs cold front picture | predict fog/storms from a front scenario | PHAK Weather Theory; NGSS MS-ESS2-5 |
| `pilot.wx.metar` | decode a METAR and a TAF into plain language | 12–14 simplified subset (Flight Plan; no TAF, remarks or altimeter); full METAR/TAF 14+ | soft: wx.wind, wx.fronts (registered: none) | wind in METAR is "to"; visibility in km; times local | wind group 27010KT | full METAR with gusts, ceilings, remarks | ACS PA.I.C; PHAK Aviation Weather Services |
| `pilot.reg.vfr-mins` | apply basic VFR weather minimums by airspace class and altitude | 14+ | airspace.layers, wx.metar | same minimums everywhere | Class G day below 1,200 ft AGL | compare minimums for C vs E above 10,000 ft MSL | ACS PA.I.E; 14 CFR 91.155 |
| `pilot.chart.sectional` | read sectional chart symbols, airspace depictions and elevations | 14+ | airspace.layers | blue vs magenta airspace mixed up; MSL vs AGL | identify an airport symbol | find the max elevation figure in a quadrant | ACS PA.I.D, PA.I.E; Chart Users' Guide |
| `pilot.reg.preflight` | list required preflight information and documents | 12–14 simplified (Flight Plan: step order, a planning card inspired by 91.103); documents and full 91.103 14+ | — | weather check is optional for local flights | aircraft documents on board | 91.103 items for a cross-country | ACS PA.I.A, PA.I.B, PA.I.D; 14 CFR 91.103 |
| `pilot.perf.wb` | compute weight, moment and CG and check it against limits | 14+ | math.alg.expressions | CG = average of weights; any weight under max gross is fine | add weights to max gross | CG out of limits: move the bag | ACS PA.I.F; PHAK Weight and Balance |
| `pilot.perf.density-alt` | explain how heat, height and humidity reduce performance | 14+ | aero.aoa | hot day only affects engine | which day needs more runway? | read a fictional takeoff chart | ACS PA.I.F; PHAK Aircraft Performance |
| `pilot.adm.risk` | use PAVE, IMSAFE and DECIDE to make a go/no-go decision | 12–14 IMSAFE + go/no-go (Flight Plan); PAVE, DECIDE and hazardous-attitude antidotes 14+ | reg.preflight (registered) | good pilots don't need checklists; "get-there-itis" is fine if experienced | IMSAFE self-check | multi-factor scenario; hazardous attitudes and antidotes | ACS PA.I.H + risk elements; PHAK Aeronautical Decision-Making |

Rows for `pilot.nav.tsd`, `pilot.wx.metar`, `pilot.reg.preflight` and `pilot.adm.risk` show the ages and prerequisites Ziggy's Flight Plan registers (`src/content/packs/flight-plan`, ages 12–14, deliberately simplified; see `docs/worlds/flight-plan.md`). "Soft" prerequisites are teaching order only, not registry `prerequisites`: `pilot.nav.headings` and `pilot.wx.wind` are registered by Compass Rose Runways, but listing them would make Flight Plan wait for Compass in the daily planner for bands starting below 12.

## 3. World concepts (prioritised)

### 1. Zephy's Sky Hoops — **first world** (ages 6–9)
- **Host:** Zephy · **Helper:** Bobbo (keen passenger) · **Scene:** a sky course of floating hoops above Monster Island.
- **Hook:** Zephy wants to win her first sky-hoop show, but she's still learning which way to move the controls.
- **Interaction:** move a big control stick (and pedals) to steer the plane through hoops; name movements. **Answer kind:** choice; sequence on the final level.
- **Levels:** see §4 (9 levels).
- **Hints:** a "ghost plane" shows the result of each control. **A11y:** arrow keys move the stick; pedals are buttons.

### 2. Hangar Builder (ages 6–8)
- **Host:** Zephy · **Cameo:** Brix (engineering) · **Scene:** a toy-plane hangar.
- **Hook:** Zephy's plane came back from the shop in pieces, and the show starts tomorrow.
- **Interaction:** drag parts onto a plane outline. **Answer kind:** set-matching.
- **Levels:**
  1. wings and body
  2. tail and propeller
  3. landing gear
  4. elevator
  5. ailerons
  6. rudder
  7. which part does what (match part to job)
- **Hints:** parts glow on the outline. **A11y:** parts listed as buttons; outline zones labelled.

### 3. Windsock Weather Station (ages 7–9)
- **Host:** Zephy · **Cameo:** Rumble · **Scene:** small island airfield with windsock and clouds.
- **Hook:** Planes land at Zephy's airfield all day, and she must tell each one which way the wind is blowing.
- **Interaction:** read the windsock; drag a plane to the runway end facing into the wind; sort clouds. **Answer kind:** choice / set-matching.
- **Levels:**
  1. windsock limp vs full
  2. wind comes from…
  3. land into the wind (2 runway ends)
  4. 4 runway ends
  5. fair vs storm clouds
  6. fog: fly or wait
  7. mixed weather briefing
- **Hints:** a leaf blows from the wind's source. **A11y:** wind direction stated in text too.

### 4. Lift Lab Wind Tunnel (ages 10–13)
- **Host:** Zephy · **Cameo:** Dabble (science) · **Scene:** a wind tunnel with a model wing and smoke streams.
- **Hook:** Zephy's model wing lifts more and more as it tilts, until suddenly it doesn't.
- **Interaction:** slide angle of attack and airspeed; read a lift meter. **Answer kind:** choice; numeric-tolerance (find the critical angle on a fictional wing ±1°).
- **Levels:**
  1. more speed → more lift
  2. more angle → more lift
  3. find the stall angle
  4. smoke separates at stall
  5. stall can happen at any speed if the angle is too big
  6. flaps change the curve (qualitative)
  7. recovery: lower the nose
- **Hints:** graph of lift vs angle drawn as the child explores. **A11y:** graph values readable as a table.

### 5. Compass Rose Runways (ages 10–12)
- **Host:** Zephy · **Cameo:** Gloop · **Scene:** airport from above with a giant compass rose.
- **Hook:** The airport's runway signs blew away, and arriving planes need their numbers.
- **Interaction:** rotate a runway; enter the number; turn by degrees. **Answer kind:** number.
- **Levels:**
  1. N/E/S/W headings
  2. runway number = heading ÷ 10
  3. opposite ends differ by 18
  4. turns of 90°
  5. turns past 360
  6. pick runway for a wind
  7. crosswind vs headwind (qualitative)
- **Hints:** compass rose highlights the turn arc. **A11y:** headings spoken; steppers.

### 6. Landmark Navigator (ages 10–13)
- **Host:** Zephy · **Scene:** an **original, fictional** island chart (not a real sectional).
- **Hook:** A storm knocked out Zephy's radio, and she must find the way to Seashell Airfield by landmarks.
- **Interaction:** choose checkpoints, match map symbols to aerial views, compute leg times. **Answer kind:** sequence / number.
- **Levels:**
  1. match landmark to symbol
  2. orient the map
  3. next checkpoint
  4. 2-leg route
  5. leg time
  6. wind slows groundspeed
  7. lost-procedure choices (climb, circle, confess, communicate are taught in band T only; here: "find a big landmark")
- **Hints:** "hold the map the way you're flying". **A11y:** landmarks named in text.

### 7. Airspace Layer Cake (ages 11–14)
- **Host:** Zephy · **Cameo:** Puff · **Scene:** a giant layered cake over a fictional airport, each layer an airspace class.
- **Hook:** Puff baked the airspace as a cake, and pilots must know which layer they're in.
- **Interaction:** place the plane in a layer; choose who to talk to. **Answer kind:** choice.
- **Levels:**
  1. towered vs non-towered airport
  2. controlled vs uncontrolled
  3. Class G and E
  4. Class D
  5. Class C
  6. Class B upside-down wedding cake
  7. altitude AGL vs MSL
  8. mixed scenarios
- **Hints:** slices with labels. **A11y:** 2D side view with text labels. Instructor review required.

### 8. METAR Decoder (14+, Teen & Adult)
- **Host:** Zephy (older styling) · **Scene:** flight-planning room.
- **Hook:** The morning weather arrives as code, and the flight leaves only if it's decoded correctly.
- **Interaction:** drag plain-language tiles onto METAR groups. **Answer kind:** set-matching.
- **Levels:**
  1. station and time (Z)
  2. wind
  3. visibility
  4. clouds and ceilings
  5. temperature/dewpoint
  6. altimeter
  7. gusts and variable wind
  8. TAF groups (FM, TEMPO)
- Uses **fictional** stations (four-letter ids that are not assigned, verified before release) or clearly labelled historical examples.

### 9. Weight & Balance Loader (14+, Teen & Adult)
- **Host:** Zephy · **Scene:** a fictional four-seat trainer with an invented loading chart ("not real aircraft data").
- **Hook:** Friends and their bags must fit in the plane without upsetting its balance.
- **Interaction:** drag people/bags to stations; read CG on an envelope. **Answer kind:** numeric-tolerance (CG ±0.1 in) / choice.
- **Levels:**
  1. total weight
  2. moments
  3. CG
  4. in/out of envelope
  5. move a bag to fix
  6. fuel burn shift
  7. full planning sheet

### 10. Go/No-Go Briefing Room (14+, Teen & Adult)
- **Host:** Zephy · **Scene:** pilot lounge with a briefing board.
- **Hook:** A trip is planned for Saturday, and the briefing board decides whether it should go.
- **Interaction:** sort risk factors into PAVE categories; choose decisions. **Answer kind:** set-matching / choice.
- **Levels:**
  1. IMSAFE self-check
  2. PAVE sort
  3. weather vs personal minimums
  4. hazardous attitudes ↔ antidotes
  5. DECIDE steps in order
  6. multi-factor scenarios
  7. explain the decision
- Instructor review required; scenarios avoid depicting accidents graphically.

## 4. First world to build: **Zephy's Sky Hoops**

**Why first:** the owner's 6–9 band starts with "how planes fly and controls"; the control-to-movement mapping is concrete, interactive and visually rewarding, and it builds vocabulary used by every later pilot world.

### 4.1 Objective and skills
"Child can move the right control to pitch, roll or yaw the plane, and name the movement." L0–L3 `pilot.controls.axes` (Lm 3); L4–L6 `pilot.controls.axes` naming (Lm 5); L7 `pilot.controls.turn` (Lm 7); L8 `pilot.flight.four-forces` (Lm 8); L9 `pilot.controls.turn` course (Lm 9).

### 4.2 Story
| Beat | Line (`sh.`) |
|---|---|
| intro1 | "Meet Zephy. She has big wings and an even bigger dream." |
| intro2 | "Today is the Sky Hoop Show, and Zephy is flying the little red plane." |
| intro3 | "But which way do the controls go? Bobbo is too nervous to watch!" |
| intro4 | "Help Zephy fly through every hoop." |
| between2 | "Whoosh! Two hoops. Bobbo peeks out." |
| between4 | "The crowd is cheering. The hoops are getting trickier!" |
| between6 | "Last part of the course. Steady hands!" |
| outro1 | "Zephy flew through every hoop!" |
| outro2 | "You knew which way to move each control." |
| outro3 | "Here are your Sky Wings!" |

### 4.3 Board
- Main view: the plane from behind (chase view) heading into a hoop. Bottom-right: a large **control stick** (circle ≥120 px) that can be dragged up/down/left/right (snaps to 4 positions); bottom-left: two **rudder pedals** (L6+). Each input is also a button (`aria-label` "Pull the stick back", "Push left pedal"…).
- **Ghost preview:** after an input, a translucent plane shows the resulting movement for 1 s, then the real plane flies (reduced motion: final pose only).
- On correct: plane flies through the hoop with a swoosh and sparkle trail. On wrong: plane moves the other way and gently misses beside the hoop (no crash ever); a new pass begins.
- Naming levels show an animated plane with three labelled axis icons (nose up/down = pitch; wings tip = roll; nose left/right = yaw).

### 4.4 Generator (seeded)
| Level | Item | Choices | Distractor rule (misconception) |
|---|---|---|---|
| 0 tutorial | hoop above | back / forward | pointing hand on "back" |
| 1 | hoop above or below (50/50) | back / forward | the opposite input ("push forward to go up" intuition) |
| 2 | hoop tilted left or right on a curving ribbon of hoops | left / right | opposite roll |
| 3 | above, below, left-bank, right-bank | 4 stick directions | opposite and an adjacent axis |
| 4 | animation shows pitch, roll or yaw | pitch / roll / yaw | the two other axes (roll↔yaw is the most confused pair, appears in ≥50% of items) |
| 5 | child moves a control; "which part moved?" | elevator / ailerons / rudder | surface on the same axis family: elevator↔ailerons for stick inputs |
| 6 | nose must point left/right (lining up with the runway centreline) | left pedal / right pedal / stick left / stick right | stick roll instead of pedal yaw |
| 7 | next hoop is far to the left: "What does Zephy do first to turn?" | tip wings left (stick left) / left pedal only / pull back | "rudder only, like steering a boat or car" |
| 8 | forces questions (one of 4 templates): level and steady → lift = weight and thrust = drag; to speed up → thrust bigger than drag; to slow down → drag bigger than thrust; what pulls the plane down → weight | 3 choices | swapping force pairs (thrust vs lift), "engine holds plane up" |
| 9 | course of 3 hoops (e.g. up, left-bank, down) | sequence of 3 stick inputs | — (validated as exact sequence) |

Constraints (levels × 50 seeds): no more than 2 identical correct inputs in a row; each round covers both directions of each axis present at that level; L8 templates never depict climbing forces (see accuracy notes).

### 4.5 Hint ladder
- **First miss:** the plane moves the wrong way and passes beside the hoop. Bobbo (helper) appears with the concept line for the axis; the wrong input greys out.
- **Second miss (model):** the stick (or pedal) animates to the correct position with a glowing hand and the matching control surface highlights on the plane; the child taps it (errorless); plane flies through.

### 4.6 Helper explanations (Bobbo, cheerful passenger who reads Zephy's manual)
- `sh.help.pitch` "Pull the stick back and the tail goes down, so the nose goes up!"
- `sh.help.roll` "Move the stick left and the wings tip left. That's a roll."
- `sh.help.yaw` "Press a pedal and the nose swings that way. That's yaw."
- `sh.help.turn` "Planes turn by tipping their wings, like a bike leaning into a corner."
- `sh.help.forces` "Lift holds the plane up, weight pulls down, thrust pushes forward, drag holds back."
- `sh.help.parts` "The elevator is on the tail, the ailerons are on the wing tips, and the rudder is the tall flap on the tail."

### 4.7 Voice lines (prefix `sh.`; ≈40 ids)
Prompts: `sh.prompt.hoop` "Fly through the hoop!" · `sh.prompt.name` "How did the plane move?" · `sh.prompt.part` "Which part moved?" · `sh.prompt.turn` "The next hoop is way over there. What does Zephy do first?" · `sh.prompt.force` (4 template lines) · `sh.prompt.course` "Plan all three moves, then fly!"
Praise: `sh.praise.1` "Nose up, right through the hoop!" · `sh.praise.2` "You tipped the wings to turn." · `sh.praise.3` "You knew that was yaw!" · `sh.praise.4` "You thought about the forces." · `sh.praise.5` "You planned the whole course!"
Retry: `sh.retry.1` "The plane went the other way. Let's try again." · Idle: `sh.idle` "Move the stick to steer."
Story 10, helper 6. **Estimate ≈ 40 ids, ≈ 45 clips** (few variables; TTS suitable; aviation terms checked for pronunciation: "aileron" = AY-ler-on).

### 4.8 Reward
Sticker **"Sky Wings"**: a round pin with Zephy's goggles over a pair of stubby wings (original design; not modelled on any airline or military wings).

### 4.9 Accessibility
- Arrow keys = stick directions; `Q`/`E` or on-screen buttons = left/right pedal. Every input is a labelled button.
- Hoop position also announced ("The hoop is above the plane").
- Reduced motion: no camera sway; plane jumps to the result pose.

## 5. Accuracy notes (expert review required)
**Every pilot item must be reviewed by a current FAA-certificated flight or ground instructor before release.** Re-check ACS/PHAK editions and 14 CFR sections each year.
- Controls (PHAK "Flight Controls"): moving the control back raises the elevator's trailing edge and pitches the nose up; moving it left raises the left aileron and lowers the right, rolling left; the left rudder pedal yaws the nose left.
- Turning: banking tilts lift so part of it pulls the plane around the turn; the rudder coordinates the turn. Teaching "rudder steers" is a known misconception and is the L7 distractor.
- Forces: in steady, unaccelerated level flight lift equals weight and thrust equals drag (PHAK). We **avoid** "in a climb, lift is bigger than weight": in a steady climb that is not accurate (the PHAK explains that lift is only momentarily greater during the transition). L8 never asks about climbing.
- Lift explanation: avoid the "equal transit time" myth. Children's version: "the wing pushes air down and the air pushes the wing up"; band C adds pressure difference.
- Game physics is simplified: in reality, pulling back with no added power trades speed for height. Grown-up notes say so.
- Plane art: an original, generic high-wing trainer; no real manufacturer shape, registration number or livery.

## 6. Age-appropriateness and safety
- No crashes, injuries or emergencies for under-10s; a missed hoop is just a miss.
- Band C/T content discusses stalls and decision-making calmly, focusing on how pilots stay safe; no accident footage or casualty statistics.
- No real airport diagrams or charts are presented as usable; all maps are fictional and watermarked "not for navigation".
- Band T (14+) is a later track with its own privacy and UX review (README §2).
