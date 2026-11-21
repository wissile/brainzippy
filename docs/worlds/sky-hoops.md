# Zephy's Sky Hoops (`sky-hoops`)

Ages 6–9 · Pilot ground school library (`pilot`, "Sky School"), topics `pilot.controls` and `pilot.flight` · host **Zephy**, helper **Bobbo** (Zephy's keen passenger, who reads her manual) · music `sky`.
Spec: `docs/curriculum/pilot.md` §4. Code: `src/games/sky-hoops/`. Registry: `src/content/packs/library-pilot/` (library now `live`).

> **Educational only.** This world is general aviation education for children. It is **not** flight training and not FAA-approved ground training. It does not replace a certificated flight or ground instructor (CFI/AGI/IGI) and does not count toward any certificate, rating or logbook entry. The flying is simplified for play (see "Simplifications").

## Objective
"Child can move the right control to pitch, roll or yaw the plane, and name the movement." The child steers Zephy's little red plane (an original, generic high-wing trainer) through sky hoops with an on-screen control stick and rudder pedals, and watches the plane respond. Later levels name the movements and the control surfaces, teach that a plane turns by banking, introduce the four forces, and end with planning a three-hoop course.

| Skill | Ages | Levels | Child can… |
|---|---|---|---|
| `pilot.controls.axes` | 6–9 | 0–6 | move the stick or a pedal to pitch, roll or yaw; name pitch, roll, yaw and the elevator, ailerons, rudder |
| `pilot.controls.turn` | 7–9 | 7, 9 | say that a plane turns by tipping (banking) its wings, not with the rudder alone; plan a short course |
| `pilot.flight.four-forces` | 6–9 | 8 | name lift, weight, thrust and drag and their directions; know they balance in steady level flight |

`pilot.flight.parts` (the spec's prerequisite) is not registered yet; it gets an id with Hangar Builder. A prerequisite that no world teaches would lock this world in the daily planner.

## Levels (0-based; the screen shows level + 1)
Bands of 8 play in index order with a fixed pattern per level: both directions of every axis appear, and the same right input never comes three times in a row. The rng varies demo direction, option order and the course.

| Lv | Item | Answer | Distractor (misconception) |
|---|---|---|---|
| 0 | hoop above / below; stick arrows labelled **Nose up / Nose down** (+ authored tutorial, pointing hand on "back") | choice back / fwd | "push forward to go up" |
| 1 | hoop above / below; labels fade to Pull back / Push | choice back / fwd | same, without the scaffold |
| 2 | tipped hoop on a curving ribbon of faint hoops | choice left / right | opposite roll |
| 3 | above, below, tipped left, tipped right | choice of 4 stick moves | opposite move, and a move on the other axis |
| 4 | the plane moves in place: pitch, roll or yaw? (roll or yaw in 6 of 8) | choice | roll ↔ yaw (most confused pair) |
| 5 | Zephy moves a control by itself; which part moved? (stick in 6 of 8) | elevator / ailerons / rudder | elevator ↔ ailerons for stick moves |
| 6 | runway ahead, nose points off the centre line: swing it straight | L/R pedal, stick L/R | rolling with the stick instead of yawing with a pedal |
| 7 | next hoop far to one side: what does Zephy do first? | tip wings (stick) / pedal only / pull back | "the rudder steers, like a boat or a car" |
| 8 | forces (5 templates): level & steady · speed up · slow down · what pulls down · what holds up | 3 force pictures, or tap one of 4 arrows | thrust must "win" to keep going; lift must "win" to stay up; the engine holds the plane up; drag pulls down |
| 9 | a course of 3 hoops (3 different directions) | sequence of 3 stick moves, then Fly | — (exact order) |

R0 levels the child up after ≥ 50 % first-try answers. Within a round difficulty steps up after 2 first-try answers. No timers anywhere.

## Interaction and why
A flying game, not a quiz card:
- **The plane is 3D.** A tiny projection renderer (`flight.ts`) draws the plane from flat polygons, so pitch, roll and yaw all read from one chase camera, and the control surfaces visibly move on their hinges. Flights come from a small deterministic kinematic simulation: the stick changes climb angle or bank, bank turns the path (rate ∝ tan bank), a pedal swings the nose with only a small skid.
- **Hoops are placed on the right flight path**, so the right move always threads the hoop. Unit tests check, at the moment the plane crosses each hoop's plane, that the right move passes inside the ring and every wrong move passes clearly beside it, never touching ("no crash ever", §6). In a course, a wrong move ends that pass before it reaches the hoop, so the child sees which move missed.
- **Predict, then fly.** Pressing a control makes the plane fly the result (≈1.2 s); the answer is checked when it arrives, so the chime matches the moment of passing through the hoop.
- **Inputs:** drag the stick knob (snaps to the live directions), tap a stick arrow or a pedal, or keys: ↑ push forward · ↓ pull back · ← → stick left/right · Q / E left/right pedal · Backspace undoes a course move. Every control is a labelled `<button>` ("Pull the stick back"). Answer cards have a speaker button for pre-readers.
- **Stick mapping:** the panel is seen from the pilot's seat, so "forward" is up on screen and "back" is down. Level 0 labels the arrows with their effect ("Nose up" on the back arrow) because this mapping is the thing being learned.
- **Gentle motion:** the camera never rolls, sways or follows. Reduced motion: the plane jumps to its result pose, the ghost holds still, pulses stop.

## Hints (spec §4.5)
- **First miss:** the plane has already shown the miss by flying the other way, beside the hoop. Bobbo explains the concept, diagnosed from the miss (`hints.ts`): e.g. pedal-only on a turn → "A pedal only swings the nose. Planes turn by tipping their wings."; roll ↔ yaw → "Roll tips the wings. Yaw swings the nose."; thrust bigger than drag for steady flight → "Steady speed means thrust and drag are equal." The wrong control greys out.
- **Second miss (model):** a see-through **ghost plane** flies the right way on a loop, the right control glows, and the control surface it moves lights up gold on the plane. Only the modelled control can be pressed (errorless). In a course, the model fills the plan slots one at a time.
- Two-choice levels (0–2, 6 partly): after one miss only the right control is left, which is the worked example.

## Accuracy and sources (instructor review required)
Primary source: FAA, *Pilot's Handbook of Aeronautical Knowledge*, **FAA-H-8083-25** (current edition C), chapters "Aircraft Construction", "Principles of Flight", "Aerodynamics of Flight" and "Flight Controls". https://www.faa.gov/regulations_policies/handbooks_manuals/aviation/phak
- Controls (PHAK "Flight Controls"): stick back raises the elevator's trailing edge, the tail goes down and the nose pitches up; stick left raises the left aileron and lowers the right, rolling left; the left pedal moves the rudder left and yaws the nose left. Implemented exactly this way in `flight.ts` and checked by unit tests.
- Turning: a plane turns by banking, which tilts lift so part of it pulls the plane around the turn; the rudder coordinates. "The rudder steers" is the level 7 distractor and gets its own correction.
- Four forces: in steady, unaccelerated level flight lift = weight and thrust = drag. Level 8 **never asks about climbing** (in a steady climb "lift is bigger than weight" is not accurate). The one line about unbalanced vertical force says Zephy "would *start* going up" (an acceleration).
- Lift: explained only as "the wings push air down, and the air pushes the wings up". No "equal transit time" wording anywhere; a unit test rejects it.
- **Flag for CFI review before wider release:** every prompt and helper line; level 6 (using the rudder to line the nose up with the runway is simplified: real crosswind landings combine rudder and aileron); level 8 force-arrow proportions (drawn lift/weight longer than thrust/drag, not to scale); the term "stick" (many trainers have a yoke; same directions).

## Simplifications (say so to grown-ups)
- Pulling back climbs without adding power; in reality it trades speed for height.
- The plane always flies at the same speed; turns are tighter than real ones; no wind.
- Control surfaces are drawn deflecting more than they do (32°) so they can be seen.
- Force arrows show direction and "which is bigger", not real sizes.

## Spec changes from play-testing (please confirm)
1. **Ghost preview moved to the model step.** The spec has a 1 s ghost after every input, then the real plane. Played back to back it doubled the wait before feedback, and the real plane's flight already shows the result. The ghost now loops the right flight on the second miss.
2. **Level 0 labels** the stick arrows "Nose up / Nose down", and level 1 fades them. Without this, levels 0 and 1 were identical.
3. **Level 8 has a 5th template**, "Which force holds the plane up?", which targets the spec's own listed misconception (the engine holds the plane up). The "pulls down" and "holds up" templates use the four arrows on the plane as the answers (4 choices, not 3), because tapping the arrow is the natural action.
4. **Level 5 controls are display-only.** The control moves by itself (Watch again replays it), so "which part moved?" always has one answer.
5. **Courses use three different directions**, and a wrong move ends that pass before the hoop (it can never clip a later hoop).
6. Course turns roll out after the hoop, so the course stays on screen.

## Accessibility
- Fully playable muted, by keyboard and without drag. Arrow keys / Q / E work everywhere a control is live; Tab + Enter work on every button.
- Hoop position is spoken in the prompt ("The hoop is down low") and in the a11y description. An `aria-live` line says what happened ("The wings rolled left and Zephy passed beside the hoop.").
- Controls are ≥ 64 px; the stick well is 176–220 px (132 px when display-only on level 5). No overflow at 390×844, 915×412, 1024×1366 or 1280×800 (e2e checked).
- Force colours (lift blue, weight orange, thrust green, drag purple) always come with a text label or legend.

## Story, reward, voice
- Story beats are those of spec §4.2 ("The Sky Hoop Show"). No crashes, injuries or emergencies; a missed hoop is just a miss.
- Sticker **Sky Wings**: a round pin with Zephy's twin goggles over stubby wings (original; not airline or military wings).
- Voice: 80 ids / 90 clips in `voice.json` (prefix `sh.`), lines ≤ 14 words, process praise only. "Aileron" = AY-ler-on (check the render).

## Tests
- `tests/unit/sky-hoops.test.ts`: control cause and effect, hoop pass/clear geometry for every input (all 1,536 course × plan combinations), runway alignment, generator lint × 10 levels × 50 seeds, determinism, patterns, forces correctness, hint diagnosis, voice coverage, no lift myth, registry.
- `e2e/sky-hoops.spec.ts` (desktop + phone): full round by tap / drag / keyboard to Sky Wings + level up; misses → helper → ghost model; every level type by tap and keyboard (including undo); a viewport sweep at all four sizes. Screenshots in `/home/claude/review/sky-hoops/`.
