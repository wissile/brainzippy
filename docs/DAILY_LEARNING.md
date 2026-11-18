# Daily learning — "Today's Adventure"

Owner goal: children come back every day, learn something new, advance a bit each day, and stop after a few games so they pace themselves. Decision: D-025. Learning rules this builds on: `docs/curriculum/README.md` §3 (mastery, Leitner review, planner D1–D9). These are product rules informed by research, not validated outcomes (D-020).

## What the child sees
1. **Home = Monster Island with today's trail** (`src/app/MapScreen.tsx`). K glowing stops (K = the daily limit). The child's monster walks to the next stop; finished stops turn gold with a tick; a pill shows **"3 of 5"**. Stop badges: *NEW* (new world), circular arrow (review), star (stretch), and the last stop shows two worlds to choose from. Tapping a stop opens the world with its story, as before.
2. **Explore** (`/explore`, `src/daily/Explore.tsx`): every registry world grouped by subject in a scrolling grid. Default = worlds for the child's age band ±1 year; one button shows all ages. Explore rounds count toward today's limit.
3. **Days-learning sparks**: a spark with the number of distinct days the child has played. It never resets or goes down, so missing a day costs nothing (curriculum D8: no streaks, no guilt).
4. **End of day** (`src/daily/EndOfDay.tsx`), shown on the map and on any `/play/<id>` URL once the limit is reached: night sky, the monster yawns and falls asleep (sleeping state + Zzz), a recap of today's worlds in kid language with the skill names for grown-ups, a teaser for tomorrow, and a moon → sun picture with "Come back tomorrow!" (no countdown clock). Everything is voiced and captioned (`src/daily/voice.json`).

## Rules
### Daily limit
- One completed round = one game. Rounds are counted per **local calendar date** (device clock; tampering is out of scope).
- Default **5**, parent range **3–10**, changed on the Grown-ups page behind the parent gate (`src/daily/DailyLimitSetting.tsx`). Read/write goes through `src/daily/settings.ts` (`DailySettingsAdapter`), so the account API (`GET/PUT /api/children/:id/settings`) can replace local storage without UI changes.
- At the limit: the map and every `/play/<id>` show the end-of-day scene. A game that was already open (or a saved unfinished round) **always finishes**; "Again" is hidden once the limit is reached. No child-facing override.
- Rollover while the app is open: `useToday()` re-checks the date at local midnight, every minute and when the tab becomes visible; the trail returns with a new plan.

### Planner (`src/daily/planner.ts`, pure)
Input: day, K, age band, registry worlds + skills, stored world levels, skill memory, last-played dates. Output: K stops.

| Rule | What it does |
|---|---|
| P1 eligible | Worlds whose ages overlap the band ±1 year (U2). If none, the closest worlds by age. |
| P2 unlocked | Each prerequisite of a world's skills (outside the world) is met: mastered, ≥3 qualifying successes (U1), a world teaching it is at/above its mastery level `floor(maxLevel/2)`, or assumed by age (the skill's age range ends at or before the band starts). |
| P3 reviews | Due skills, most overdue first, then lower box, then id; one played world per skill, preferring a different world from last time. Slots = `min(due worlds, max(1, floor(0.4K)))` → K=3: 1, K=5: 2, K=10: 4. |
| P4 learning | Practising worlds (most recently played first) plus at most **1** brand-new world (2 from band 9–11 up), closest to the child's age, placed right after the first practising world. |
| P5 stretch | The most recently played world that can still level up; its round **starts one difficulty step higher** (GameRunner's in-round step-down still applies, so it's never stuck). Only when K ≥ 3. |
| P6 order | Review first (a familiar start), then alternate learning / review, the stretch last before the pick. |
| P7 fill | Empty slots repeat unlocked worlds — today's worlds first, then other played ones, then below-band ones — at most 2 rounds per world while alternatives exist. No extra brand-new worlds. |
| P8 pick | Last slot (K ≥ 2): the child chooses between two worlds; the first option is never the world just played. |
| P9 variety | No two consecutive stops in the same world when avoidable. |
| P10 ties | World id, so plans are reproducible. |

- **D1 plan once:** the plan is computed at the first visit of the day (or the first round) and saved in `progress.daily.plan`. It is redone only if the daily limit or the registry's world list changes (fingerprint); stops already completed stay on the trail.
- **Lighting stops:** a round started from a stop lights that stop; Explore/Again rounds light the first unlit stop of the same world, otherwise the earliest unlit stop, so the trail always shows *n of K*.
- **Seeds:** the n-th round of a world on a day uses `seedForDay(day, worldId, n)` — new content every day, identical after a refresh, different for a repeat.

### Mastery and spaced review (`src/daily/memory.ts`, pure)
- Qualifying success = first try, no hint, at or above the world's mastery level.
- **M1:** mastered after 6 qualifying successes with ≥2 of them on a later date than the first. **M2:** assisted answers never subtract.
- **S1–S3 (Leitner):** on mastery box 1, review after 2 days; boxes 1–5 = 2, 4, 8, 16, 32 days. A round in a world while one of its skills is due is that skill's review: ≥60 % of the skill's items first try → box + 1, else box − 1 (min 1). Two failed reviews in a row in box 1 → quietly back to practising with half the evidence kept.

### Storage (`src/engine/progressSchema.ts` → `GuestProgress.daily`, strictly validated)
`days` (last 8 local dates → rounds `{w, l, ft, n, s?}`), `seen` (world → last date), `skills` (memory above), `learned` (distinct days), `plan`. No names, no times of day. A corrupt daily log is dropped on load without touching the rest of the progress. Sync stays off (D-011); if re-enabled, check the payload against `MAX_PROGRESS_BYTES` (8 KB) — a heavy user's log is roughly 3–6 KB.

## Example (K = 5, child 6–8)
State: Bobbo's Breakfast mastered and due for review; Glow Cave Hops practising (level 1, played yesterday); Sky Balloon Race unlocked, never played.
Plan: `[review Bobbo's Breakfast, practice Glow Cave Hops, NEW Sky Balloon Race, stretch Glow Cave Hops (starts one step harder), you choose: Sky Balloon Race or Bobbo's Breakfast]`.
A brand-new 3–5 child today has one unlocked world, so the trail is five Bobbo's Breakfast rounds that climb a level each; Glow Cave Hops unlocks once counting reaches level 3. More worlds in the registry mean more variety automatically.

## How to tune
| Knob | Where |
|---|---|
| Default / range of the limit | `DAILY_LIMIT` in `src/services/storage.ts` |
| Mastery count, unlock count, review intervals, pass mark | `MASTERY_COUNT`, `UNLOCK_COUNT`, `REVIEW_DAYS`, `REVIEW_PASS` in `src/daily/memory.ts` |
| Mastery level per world | `masteryLevel()` in `src/daily/memory.ts` |
| New worlds per day, rounds per world, review share | `newCap`, `MAX_PER_WORLD`, `reviewSlots` in `src/daily/planner.ts` |
| Kid-language recap for a world | add `daily.recap.<worldId>` to `src/daily/voice.json` (fallback: "You tried a great adventure!") and render the clip |

Every change to these rules: update this file, add a `docs/DECISIONS.md` row, and keep `tests/unit/daily-*.test.ts` green.

## Tests
- Unit: `tests/unit/daily-planner.test.ts` (determinism, K stops, mix, prerequisites, reviews, stretch, pick, variety, registry growth, seeds, real registry), `daily-memory.test.ts` (dates, M1/M2, S1–S3, log + schema), `daily-store.test.ts` (limit counting, rollover with a fake clock, re-plan, hooks, corrupt log).
- E2E: `e2e/daily.spec.ts` (limit → end of day, `/play` lock, next day via `page.clock`, Explore, parent gate, no overflow at 390×844 and 915×412).

## Open
- Per-world kid recap lines exist only for the first four worlds; new worlds fall back to a generic line until their author adds one.
- Mastery uses one mastery level per world, not per skill (`Lm` in the curriculum); refine when packs declare it.
- Soft vs hard prerequisites: the registry has only one list, treated as hard for the plan; Explore ignores prerequisites.
