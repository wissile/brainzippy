# Dabble's Rocket Lab (`rocket-lab`)

**Ages 8–12 · Science (`sci`, "Fizz Lab") · forces and motion.** Host Dabble, helper Rumble (with his giant spring scale).
Spec: `docs/curriculum/science.md` §3 item 1 and §4. Pack: `src/content/packs/library-sci` (topic `sci.force`). First world of the
science library, which is now `live`.

## Objective
"Child can predict whether a rocket lifts off by comparing thrust with weight, and explain how mass and gravity change that."

| Skill | Levels | Objective | NGSS (aligned with) |
|---|---|---|---|
| `sci.force.balanced` | 0–3 | lift-off only when push up > pull down; equal forces = no change in motion | 3-PS2-1 |
| `sci.force.weight-mass` | 4–5 | weight = mass × gravity strength; mass is the same on the Moon | 5-PS2-1 (context) |
| `sci.force.net` | 6–8 | net force = thrust − weight; acceleration = net force ÷ mass | MS-PS2-2 (stretch toward HS-PS2-1) |

Prerequisites registered inside the chain only (balanced → weight-mass → net). The spec's `sci.force.push-pull`, `sci.force.gravity`
and multiplication prerequisites have no world yet; registering them would lock this world in the daily planner.

## Story ("The Moon-Flower Seed", spec §4.2, lines verbatim)
Dabble finds a moon-flower seed that only grows in the Moon garden, builds lots of rockets, and needs "a push up that beats the pull
down". Between-lines at 2/4/6; outro: the seed lands in the Moon garden, then the **Launch Patch** sticker. Music: existing `sky` loop.

## Interaction: predict → test → observe → explain
1. **Build.** Parts go onto the rocket by **drag**, **tap-then-tap** (tap a part, tap the rocket) or **keyboard** (Enter on a part moves
   focus to the rocket; Enter places; Escape cancels). Engines (lift/engine levels), seed crates (cargo), fuel tanks + a native thrust
   **slider** (mission), rocket chips into 1st/2nd/3rd slots (ranking). Crates and tanks stay "in hand" so repeated taps keep loading.
2. **Predict.** Prediction cards in the tray (lifts off / stays; a weight; a mass; faster/slower/same). In build levels the build is the prediction.
3. **Test.** One big button: Launch!, Weigh it!, Launch all!, Run the test!
4. **Observe.** The flight is computed from the same model as the answer (`logic.ts` `resultOf`): lift-off rises with exhaust puffs at
   equal time steps (growing gaps = speeding up); balanced rumbles and stays; weaker sputters and stays. **No explosions, ever.**
   A rocket that flies but misses the mission (too few crates; an Earth-sized engine on the Moon; over budget) is shown flying and the
   feedback says so honestly.
5. **Explain.** A result banner writes the comparison (`8 > 5: the push up wins`, `20 kg × 10 N/kg = 200 N`, `Speed-up 4 → 6.7 m/s²`).

Force arrows: thrust up (orange), weight down (blue), from the rocket's middle, **one scale per experiment** (34 % of scene height = the
largest force), numbers + "push up"/"pull down" text on every arrow (colour is never the only cue). A screen-reader live region states
forces and outcomes. Reduced motion: no flight; a faded ghost at the start and the rocket at its end position.

## Levels (generator, `maxLevel` 8, round of 8, step up after 3 first-try)
| L | Experiment | Values | Answer | Distractor → misconception |
|---|---|---|---|---|
| 0 | lift off? (tutorial T 6, W 3 with pointing hand) | pushes; W 2–8, T = W ± 3–6 | choice yes/no | arrows clearly different |
| 1 | lift off? | W 2–10, T = W ± 2–5; every 4th item T = W | choice | "balanced goes up slowly" |
| 2 | attach the engine that lifts | W 4–15; {W − k, W, W + j}, k, j 1–4 | choice (engine) | equal engine; weaker engine |
| 3 | load the most crates and still lift | rocket 4–8, crate 1–3, T 10–20, answer 1–6 | number (crates loaded) | n + 1 where W = T (balanced counted as lift) |
| 4 | weight on Earth / engine for a mass | m 5–40 kg (×5); W = 10 m; engines ±10 N steps | number / choice | weight = mass; m + 10 |
| 5 | Moon: mass / smallest engine | W = 1.6 m (whole N) | number / choice | mass changes; Earth weight; Earth-sized engine |
| 6 | rank 3 rockets by speed-up | a = (T − 10 m)/m ∈ 1–6, distinct, T ≤ 400 | sequence | biggest engine fastest; heaviest fastest (a trap pair is guaranteed) |
| 7 | fuel burns: net force / speed-up | m 10–30, a 1–4, Δ 5 or 10 kg | number / choice | same thrust → same net force; mass instead of weight |
| 8 | mission planner | 3 thrust settings × 1–3 tanks, target band, budget | set (thrust + tanks) | biggest combo always best (it is always over budget) |

Two-part spec items (L4, L5, L7: "number then choice") are **split into alternating exercises** so each step is validated and logged
by the engine on its own. Hints: first miss → Rumble explains (diagnosed: balanced, mass, Moon, net, fuel, "could carry one more",
"too big an engine", "short"/"over budget"), the rocket hangs on his spring scale (hidden weights are revealed), arrows pulse, the wrong
part greys out and returns to the shelf; ranking keeps right slots. Second miss → worked example: weigh, then both forces drawn upward
side by side with "wins"/"equal"; the right part glows and only it can be launched (errorless).

## Model, units and simplifications (all labelled in the UI)
- Levels 0–3 use made-up whole-number units ("pushes"), not newtons.
- `W = m × g`, g_Earth = **10 N/kg (rounded from 9.8)**, g_Moon = **1.6 N/kg** (NASA: 1.62 m/s²). Masses are multiples of 5 kg so Moon weights are whole.
- Lift-off ⇔ T > W. T = W: balanced, a rocket at rest stays at rest (not "slow motion").
- `F = T − W`, `a = F / m`; **no air resistance**, **constant thrust**, one dimension. L0–L6 ignore the fuel's mass change.
- L7 compares two instants (before/after), not a continuous burn. L7 adds "more cargo" and "fuel burns + engine turned down (same a)"
  to the spec's burn case — **improvement:** with only the burn case the answer would always be "faster" (guessable).
- L8 heights are integrated numerically (dt 0.01 s): thrust constant, mass falls as fuel burns (2.5 kg/s, 5 kg tanks), then a coast up.
  The table shows bands (< 100, 100–199, 200–399, 400 m +); generated missions keep every height ≥ 3 m from a band edge.
  Exactly one combination reaches the target within the budget (costs 2/5/8 + 1 per tank are all different).
- Fins are drawn but not a part: with no air in the lab they would change nothing but mass, and a fins variable would teach a false link.
- Flight animation heights are qualitative (not to scale), except that ranking/fuel race heights are proportional to a.

## Deviations from the spec (and why)
- L0 is a generated easy level (big gaps) after the tutorial; the balanced case is introduced in L1 (spec L1 had none, but praise.2 and
  help.balanced need it before L2's equal-engine distractor).
- L5 engine: "smallest that lifts" kept; options are {balanced or weaker, smallest lifter, Earth-sized engine}. The Earth engine flies,
  and the feedback says it is far bigger than needed.
- `rl.idle` reworded ("Build the rocket, make a prediction, then test it…") because the spec's "Drag an engine" is wrong for half the levels.
- Extra lines beyond §4.8: tutorial/engineKg/moonEngine/fuelNet/load/throttle prompts, 3 helper lines, 4 diagnosed hints, 2 coach lines,
  6 praise lines, intro card lines. 56 ids, 70 clips.

## For the science-teacher review (flagged)
1. NGSS codes are from the spec and memory; the nextgenscience.org pages could not be fetched from this environment. Check 3-PS2-1
   (its assessment boundary is qualitative; L0–L3 use small whole numbers) and MS-PS2-2 (quantitative a = F/m at L6–L8 goes toward HS-PS2-1).
2. "Pushes" as a made-up unit for ages 8–10: acceptable, or use newtons throughout?
3. Treating T = W on the pad as "stays still" is right for a rocket at rest; real launches also need clamps released etc.
4. L8 uses a simple variable-mass integration; check the bands feel plausible for a toy rocket and the cost framing.
5. The Moon level calls 1.6 N/kg "Moon gravity" and never says "no gravity in space".

## Accessibility and layout
Every control is a `<button>` (or a native range input) with an action label; ≥ 44 px targets (checked at 390×844, 915×412, 1024×1366,
1280×800); fully playable muted, by keyboard and without drag; reduced-motion path; arrow values as text.

## Tests
- `tests/unit/rocket-lab.test.ts`: physics model; 9 levels × 60 seeds lint, skill per level, unique ids; per level, the answer and the
  simulated outcome agree (one lifter, n lifts / n + 1 doesn't, ranking matches simulated race, faster/slower/same matches a, one mission
  winner…); hint ladder; build → submission; voice lines used/defined; registry.
- `e2e/rocket-lab.spec.ts`: tutorial by drag (arrows proportional); full round by tap-tap + one item by keyboard → Launch Patch + level up;
  hint ladder; every mode (L3–L8) by drag and tap; four-viewport layout sweep with screenshots; reduced motion.
