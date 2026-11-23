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
| english | Learn English with Hoot (→ Sarah) | 3–5 | 6–14 |
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
| Rule | What it does | Numbers and reasoning |
|---|---|---|
| A1 age | Placement age = the middle year of the onboarding band | 3–5 → 4 · 6–8 → 7 · 9–11 → 10 · 12–14 → 13. Onboarding stores a band, not an age; the middle is wrong by at most a year, and U1/D1 correct it within a few rounds. |
| A2 start world | The first world in trail order whose ages contain the age; if none, the nearest by years (tie → the younger world). If the child has already played a later world of this path (any entry point), start there. | "First containing" is the gentler of the candidates; never placing a child behind their own progress respects earlier play. |
| A3 start level | Only for a world never played: `floor((maxLevel + 1) × yearIndex / years)` with `yearIndex = age − youngest`, clamped to the world's years | Each year of a world's range gets an equal share of its levels and the child starts at the bottom of their year's share. Rhyme Lanterns (3–5, levels 0–7): age 3 → L0, 4 → L2, 5 → L5. |
| C1 round class | **Easy**: ≥ 4 items, ≥ 85 % first try and ≤ 1 hint in the round. **Struggling**: < 40 % first try. Otherwise OK. | 90 % of an 8-item round would mean a perfect round; 85 % allows one slip fixed after one hint (touch slips are common under 7), but not a modelled answer. Within a round the engine already raised difficulty after 2 first-try answers (R2), so an easy round includes harder items. Below 40 % sits clearly under R0's 50 % pass mark. **Speed is never used.** |
| U1 skip ahead | 2 easy rounds in a row in the path's current world → level + 2 instead of R0's + 1 (capped at the top) | One round can be luck or familiar items; two in a row is ≈ 16 items with ≤ 2 slips. A skip of one extra level keeps the jump small, and D1 catches an overshoot. The streak restarts after a skip; when the cap blocks the skip the streak carries on to the top level. |
| U2 next world | At the top level, a round with ≥ 75 % first try → the next world of the trail (at A3's level if never played, else its stored level) | A new world is a bigger step than a level, so it needs more than R0's 50 %, but not perfection. |
| U3 age reach | A next world whose youngest age is more than **3** years above the child's age is entered only with clear mastery: the graduating round is the 2nd easy round in a row. Otherwise the child keeps practising the top level. | Owner's guardrail: nothing older than age + 3 unless mastery is clear. |
| D1 step down | 2 struggling rounds in a row → one level down; at level 0 → the previous world's top level; at level 0 of the first world → stay at 0 (and T2) | One hard round is normal; two in a row means the level is ahead of the child. Never below 0. On screen: "Great practice! Next time: a warm-up on Level 2." — never failure words (tested). |
| T1 tired | 3 rounds in a row on the same path on the same local day → the host offers another path; the count restarts after each offer | With the default daily limit of 5 this is at most one offer on a normal day (≤ 3 at the maximum limit of 10). Interleaving subjects keeps practice varied. A round of another path or a new day restarts the count. |
| T2 tricky | D1 at level 0 of the first world → offer | Nowhere easier to go on this path; a change of subject is kinder than repeating. |
| T3 path end | Graduating from the last world → note "You explored the whole path!" and an offer | The child stays at the top level; nothing is taken away. |
| O1 offers | Offers only for the path the child chose, only between rounds, only ever offers | A dialog on the reward screen after the reward lines finish (900 ms of quiet, at most 12 s): "Another path" opens the picker, "Keep going" or Escape closes it. |
| S1 switching | The child can change path any time ("Change path"). Each path keeps its own stop and streaks; coming back resumes it | World levels are shared, so progress made from Explore or the trail counts on the path too. |
| PP1 daily plan | With a visible chosen path, today's plan puts the path's current world on the first learning stop (not a review, not the final pick): an already planned stop is moved forward, otherwise the first learning stop is replaced (badged NEW if never played). Never more than 2 stops per world (P7), never two neighbouring stops of one world (P9), reviews untouched. Choosing another path re-plans the day (stops already played stay). | `src/paths/plan.ts`; property-checked over every path × age band × limit 3–10. |

Scope of a round: levels and stops move only when the round was played in the path's **current** world (from the path view, the daily trail or Explore); T1 counts every round in any of the path's worlds.

## What the child sees
- **"My path" tab** on Monster Island (Today · My path · Explore), with the chosen host's face; shown only when a path is visible.
- **Choose your adventure** (`/paths`): one big card per visible path with the host and the title. Tap = hear the title (always captioned) and select; the green button ("Let's go!") starts it. The current path is preselected and badged "Your path".
- **Your path** (`/path`): the host (tap to hear the title again), the title, the trail of worlds (visited ✓, "you are here" with the level, later stops dimmed), a big **Play** button that opens the current world at the stored level, and **Change path**.
- **Between rounds:** the reward screen shows the path note ("Zoom! You're ready for Level 5!", "Next stop on your path: Sky Balloon Race!") and, when T1–T3 fire, the host's offer. "Games" goes back to the path view for rounds started there.
- Targets: cards, Go, Play, Change path and the offer buttons are ≥ 64 px tall at every review size; keyboard: every control is a `<button>`, the offer traps focus between its two buttons and closes with Escape; reduced motion: no glow, pop or fade.

## Storage
`LocalState.paths` (`bz.v1`, device only, no personal data): `{ v: 1, cur, by: { <path>: { w, easy, hard } }, run: { p, day, n } }`. Parsed strictly by `parsePathsState`: state saved before paths existed migrates to an empty path state, corrupt entries are dropped one by one, an unknown version resets only the path state; the rest of the progress is never touched (unit-tested). Not synced: paths stay on the device like the daily log (D-011).

## Code map
| Concern | File |
|---|---|
| Rules (pure) | `src/engine/pathProgress.ts` |
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
- Path state is not synced to a parent account (device only).
- Analytics records no screen name for `/path` and `/paths` yet (the closed screen list in `src/analytics/schema.ts` would need two entries and a privacy-notice check).
- Rhyme Lanterns and other worlds for the youngest ages are still single worlds per path; until a path has two worlds for an age, U2 simply holds the child at the top level of the last suitable world (U3).
