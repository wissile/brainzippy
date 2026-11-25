# Learning paths — "Learn to fly with Zephy"

Owner request (2026-11-23): children should know which path they are on ("learn to be a pilot with Ziggy"), every path is for all ages, difficulty follows age and success (step up when a child is clearly not challenged), and a tired child can switch path ("learn English with Sarah"). Decision: D-034 (proposed). These are product rules informed by the curriculum principles in `docs/CURRICULUM.md`; they are not validated learning outcomes (D-020).

## What a path is
- **Every library is a path** (`Library.path` in `src/content/packs/library-<id>/index.ts`): a child-facing title with the host's name as `{host}`, a voice line id, a `live` flag and an optional explicit world order.
- **Title = template + host.** `"Learn to fly with {host}"` + `Library.host` (`zephy` → "Learn to fly with Zephy"). When the new hosts land (Ziggy for pilot, Sarah for English), change `host` in the pack (one line) and the name in the line's `vary.host` in `src/paths/voice.json`; `tests/unit/paths.test.ts` fails until both agree, so the new clip is rendered.
- **Trail** = the library's playable worlds, by youngest age, then oldest age, then id (`pathWorlds`); `path.worlds` may fix the order. A test checks that no world comes before a world that teaches its prerequisite.
- **Levels are shared.** A world's level is `progress.levels[world]`, the same number Explore, the daily trail and the game use. The path only stores *which stop* the child is at and two streaks.

| Path | Title today | Ages with a world | Missing ages |
|---|---|---|---|
| math | Count and build with Bobbo | 4–9, 11–13 | 3, 10, 14 |
| english | Learn English with Sarah | 3–14 (Rhyme Lanterns, Paper Boat Post, Wordroot Grove, The Lantern Press) | — (not live: owner decision) |
| pilot | Learn to fly with Zephy (→ Ziggy) | 6–9 | 3–5, 10–14 |
| cs | Learn to code with Toggle | 5–10 | 3–4, 11–14 |
| cyber | Stay safe online with Fenn | 7–11 | 3–6, 12–14 |
| engr | Build like an engineer with Brix | 8–12 | 3–7, 13–14 |
| geo | Explore the world with Yonder | 5–9 | 3–4, 10–14 |
| money | Learn about money with Budge | 7–10 | 3–6, 11–14 |
| nature | Discover nature with Ripple | 8–12 | 3–7, 13–14 |
| sci | Experiment like a scientist with Dabble | 8–12 | 3–7, 13–14 |
| sel | Understand feelings with Snug | 4–7 | 3, 8–14 |

## Going live (owner decision)
A path goes live when every age 3–14 has at least one of its worlds. Until then `live: false` hides its path UI and the library shelf in Explore works as before.
- **Flip:** set `path: { …, live: true }` in the pack. `tests/unit/paths.test.ts` fails if a live path still has missing ages and lists them (`pathAgeGaps`).
- **Note:** `checkRegistry` keeps a library's worlds inside `Library.ages`, so a library planned for 6–14 (pilot) must widen `ages` to 3–14 before it can get a world for age 3.
- **When no path is visible, nothing changes:** no "My path" tab, `/path` and `/paths` redirect to the map, `PathGate` passes the daily hooks through untouched, and the daily plan is exactly the planner's (unit-tested).
- **Dev override:** `?paths=all` shows every path that has a playable world; `?paths=live` turns it off. It only works on a dev build or on `localhost` / `127.0.0.1` (never on brainzippy.com) and lasts for the browser tab (`sessionStorage bz.paths.override`). The e2e spec uses it.

## Rules (pure: `src/engine/pathProgress.ts`, numbers in `PATH_RULES`)
Revised after the independent learning-design review (D-036). Every rule is unit-tested in `tests/unit/path-progress.test.ts`.

| Rule | What it does | Numbers and reasoning |
|---|---|---|
| A1 age | World choice uses the middle year of the onboarding band; the age guard (U3) uses the band's youngest year | 3–5 → 4 · 6–8 → 7 · 9–11 → 10 · 12–14 → 13. Onboarding stores a band, not an age. |
| A2 start world | Nearest world by years to the placement age (0 = inside its range), then the younger world (lower youngest age), then path order, then id. A child who already played a later world of this path starts there. | Never places a child behind their own progress. |
| A3 start level + placement | A world never played starts at **level 0**, so its tutorial and first skills run (e.g. a skill a later level builds on is never skipped). **Placement phase:** in a child's first **3** rounds in a world, **one** easy round already skips ahead (capped by U1's evidence rule). | Starting low and letting evidence lift the child replaces guessing a level from a 3-year band. Parent start override (review H9): **TODO** — no settings hook for it yet; the place for it is a per-path start world in the Grown-ups page passed to `startPath`. |
| C1 outcomes | **Easy**: ≥ 4 items, ≥ 85 % first try, ≤ 1 hint · **OK**: R0's pass (≥ 50 % first try) · **Practise**: below the pass mark, same level again · **Struggling**: first try < max(**30 %**, chance + **10** points), chance = mean guessing chance of the round's items | Each result records `chance` (src/engine/session.ts → `firstTryChance`: 1/choices, 1/options, 1/(2ⁿ−1) for sets, 1/n! for sequences, 1/targetsⁿ for matching, 0 for built or typed answers). 50 % on two-option items is guessing, so it counts as struggling there. 85 % allows one slip fixed after one hint, not a modelled answer. Speed is never used. **R0 itself is not chance-aware yet** (it would change level-ups in every game and their tests): open item. |
| U1 skip | **2** easy rounds in a row (or 1 in the placement phase) → target = min(level + **2**, max(level + 1, D − 1)), D = highest difficulty answered right first try in that round | Evidence cap: a skip never goes further than the round showed. Within a round the engine steps difficulty up after 2–3 first-try answers (R2), so a strong round serves items 1–3 bands above its level. Checked over all 18 worlds at level 0 and mid-range: every world serves items two levels up in an all-first-try round, so the cap allows + 2 everywhere today; for a world that never served items above its level the formula gives level + 1 (= R0, no skip) automatically. |
| U2 hand forward | At the world's hand-off level **Hn** (optional `World.handoff`, default `maxLevel`) a round with ≥ **75 %** first try → next world at level 0 (or its stored level); also when **every skill of the world is mastered** (daily memory M1) | A new world is a bigger step than a level. |
| U3 age guard | A next world starting above **band minimum + 2** (band 3–5) or **+ 3** (other bands) needs clear mastery = **2 easy rounds in a row** | Owner's guardrail, tighter for preschoolers. |
| D1 down | **2** struggling rounds in a row (practise rounds break the streak) → one level down (never below 0). At level **0–1 of a later world**: **one warm-up stop** in the previous world joins the next daily plan, at that world's Hn − 1 (never above its stored level); the path pointer stays. At level 0 of the first world → T2 | Warm-ups instead of moving the child back keep the path's direction. On screen and spoken: "Great practice! Next time: a warm-up round!" — no level numbers, no failure words (tested). |
| D2 damping | After stepping down from level X, no skip in that world until an OK-or-better round at level ≥ X | Prevents bouncing up and down. |
| T1 tired | From the **3rd** round in a row on one path (same local day), only when that round's first-try rate is ≥ **20** points below the run's first round, or the round is struggling | Steady play is never interrupted. |
| T2 tricky | D1 at level 0 of the first world → offer | Nowhere easier to go on this path. |
| T3 complete | The last world handed forward (with mastery data: only when its skills are mastered, review H8) → note "You explored the whole path!" + offer | The child stays at the top level; nothing is taken away. |
| O1 offers | Only for the chosen path, at most **once per path per local day**, only between rounds, never forced | A dialog after the reward lines and the spoken note: the full spoken line is shown; **"Keep going" is focused and primary**; the rest of the app is `inert`; Escape closes. |
| S1 switching | Change path any time; each path keeps its stop, streaks and warm-up | World levels are shared with Explore and the daily trail. |
| PP1 daily plan | The chosen path's current world takes the first learning stop (moved forward if planned, else replaces the first learning stop; NEW if never played). An owed warm-up (D1) adds **one** stop of the previous world badged "Remember this one", before the path world when neighbours allow (an already planned stop of that world becomes the warm-up). ≤ 2 stops per world (P7), no neighbouring stops of one world (P9), reviews untouched. Choosing another path re-plans the day. | `src/paths/plan.ts`; property-checked over every path × age band × limit 3–10. |

Scope of a round: levels and stops move only when the round was played in the path's **current** world (path view, daily trail or Explore); T1 counts every round in any of the path's worlds; any round in the warm-up world pays the warm-up.

## What the child sees
- **"My path" tab** on Monster Island (Today · My path · Explore), with the chosen host's face; shown only when a path is visible.
- **Choose your adventure** (`/paths`): one big card per visible path with the host, a small subject picture (numbers, letters, a plane, a globe…) so pre-readers can tell paths apart, and the title. The selected card gets a ring in the library's deep colour and a tick. Tap = hear the title (always captioned) and select; the green button ("Let's go!") starts it. The current path is preselected and badged "Your path".
- **Your path** (`/path`): the host (tap to hear the title again), the title, the trail of worlds (visited ✓, "you are here" with the level, later stops dimmed), a big **Play** button that opens the current world at the stored level, and **Change path**.
- **Between rounds:** the reward screen shows and then speaks the path note ("Zoom! You're ready for a bigger challenge!", "You're ready for the next stop on your path!", "Great practice! Next time: a warm-up round!") and, when T1–T3 fire, the host's offer. Back and "Games" return to the path view ("Back to my path") for rounds started there.
- Targets: cards, Go, Play, Change path and the offer buttons are ≥ 64 px tall at every review size; keyboard: every control is a `<button>`, the offer traps focus between its two buttons and closes with Escape; focus moves to the new screen (the selected card or the heading on the picker, the title on your path); reduced motion: no glow, pop or fade.

## Storage
`LocalState.paths` (`bz.v1`, device only, no personal data): `{ v: 1, cur, by: { <path>: { w, easy, hard, n, dn, warm } }, run: { p, day, n, r }, offered: { day, p[] } }`. State from the first version gets defaults for the new fields. Parsed strictly by `parsePathsState`: state saved before paths existed migrates to an empty path state, corrupt entries are dropped one by one, an unknown version resets only the path state; the rest of the progress is never touched (unit-tested). Not synced: paths stay on the device like the daily log (D-011).

## Code map
| Concern | File |
|---|---|
| Rules (pure) | `src/engine/pathProgress.ts` (+ `chance` per result in `src/engine/session.ts`) |
| Pack data | `Library.path` in `src/content/types.ts`, `src/content/packs/library-*/index.ts` |
| Registry view, coverage | `src/paths/registry.ts` |
| Visibility + dev override | `src/paths/flags.ts` |
| Storage + clock glue | `src/paths/state.ts` |
| Daily-plan preference | `src/paths/plan.ts`, applied in `src/daily/store.ts` `ensurePlan` |
| Round hooks (note, offer, back target) | `src/paths/PathGate.tsx` + optional `backTo` / `levelNote` / `rewardExtra` in `src/game/roundHooks.ts` |
| Screens | `src/paths/PathScreens.tsx`, `src/paths/paths.css`, tab + routes in `src/app/MapScreen.tsx`, `src/app/App.tsx` |
| Spoken lines | `src/paths/voice.json` |

## Tests
- `tests/unit/path-progress.test.ts`: every rule and edge (no world for the age, first and last world, top-level cap, age reach, step down across worlds, streak resets, T1 per day and per path, offers only for the chosen path, switching keeps progress, determinism, storage validation).
- `tests/unit/paths.test.ts`: pack data (titles name the host, voice lines match and are pre-rendered for the current host, live ⇒ no missing ages, prerequisite order), visibility, PP1 (synthetic + real plans), app glue (pick, switch, skip, next world, step down, offers, migration, plan re-plan, no change without a visible path), kind reward notes.
- `e2e/paths.spec.ts`: no path UI when none is live; pick → hear → your path → today's trail prefers it → play → back to the path; seeded skip ahead + the host's offer; accepting the offer and switching path both ways; keyboard only; no overflow + target sizes at 390×844, 915×412, 1024×1366, 1280×800 (screenshots in `reviewDir("paths")`).

## How to tune
Every number is in `PATH_RULES` (`src/engine/pathProgress.ts`). Changing one: update this file, add a `docs/DECISIONS.md` row and keep the unit tests green.

## Open
- R0 (the game's own level-up at 50 % first try) is not chance-aware; only the path's struggling rule is.
- Parent start override (H9): TODO, see A3.
- Path state is not synced to a parent account (device only).
- Analytics records no screen name for `/path` and `/paths` yet (the closed screen list in `src/analytics/schema.ts` would need two entries and a privacy-notice check).
- Rhyme Lanterns and other worlds for the youngest ages are still single worlds per path; until a path has two worlds for an age, U2 simply holds the child at the top level of the last suitable world (U3).
