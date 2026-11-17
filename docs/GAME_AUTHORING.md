# Game Authoring Guide (contract for adding a game)

A game lives entirely in `src/games/<id>/`. You should never need to edit shared files; if you do, stop and ask the lead.
Reference implementation: `src/games/counting-adventure/` ("Bobbo's Breakfast").

## Files you own
| File | Purpose |
|---|---|
| `definition.ts` | `GameDefinition` DATA only: id, title, ages, skills, learningObjective, progression `{ roundLength: 8, minDifficulty: 1, maxDifficulty: 4, stepUpAfter: 2, stepDownAtAttempts: 3 }`, exercises, achievement |
| `voice.json` | `{ "lines": { "<id>.<name>": { "text": "...", "vary": { "a": [..], "b": [..] } } } }` — every spoken line. Prefix every id with a short game prefix. `vary` lists every value a `{var}` can take so audio is pre-rendered (keep combos < 150). |
| `art.tsx` | Original SVG art: `Background`, objects, `Sticker` (achievement art) |
| `story.tsx` | `StoryBeat[]` intro (4 beats) and outro (3 beats) + `between` lines keyed by exercises completed (2, 4, 6) |
| `Board.tsx` | Interactive play board + answer tray (see contract below) |
| `<Name>.tsx` | default-export component: `<GameRunner game={def} skin={skin} />` |
| `tests/unit/<id>.test.ts` | lint all exercises, check params ↔ target math, board-independent logic |
| `e2e/<id>.spec.ts` | Plays a full round (seed state with `seed(page, { muted: true })` from `e2e/helpers.ts`), navigates `page.goto("/play/<id>")`, skips the story via `[data-testid="story-begin"]` then `[data-testid="story-skip"]` |

## Exercise data
Use `interaction: "choose"` for pick-the-answer games rendered by your board. Required: `target` (the correct answer), `choices` (must include target, unique), `params` (your numbers, e.g. `{ a: 7, b: 6 }`), `prompt: { line, vars, text }` (spoken line id + vars and on-screen text, e.g. text `"7 + 6 = ?"`), `seed`, `difficulty` 1–4, `a11yDescription`, `objective`, `skillId`. Exactly one exercise has `tutorial: true` (difficulty 1).
Content volume: **≥ 8 exercises at difficulty 1** (so a struggling child can finish a round on easy items) and **≥ 5 at each of 2, 3, 4**. Distractors must be plausible (±1, ±2, or a common error).
Level-ups are automatic: each completed round starts the next round one difficulty higher.

## Board contract (`skin.Board`, `skin.Tray`)
Both receive `BoardProps = { st, act, alongIndex, ObjectArt, Basket }`.
- `st: ExerciseState` — `st.exercise` (with `params`, `target`, `choices`), `st.phase` (`"answering" | "feedback" | "solved"`), `st.disabledChoices` (greyed by hints), `st.modelChoice` (pulse this one: modelled answer), `st.lastChoice`, `st.feedback?.correct`.
- `act({ type: "CHOOSE", value })` submits an answer. Only act when `st.phase === "answering"` and the value isn't in `disabledChoices`.
- `alongIndex` — worked-example step (−1 = none). The runner animates it from 0 to `skin.alongSteps(ex) - 1` during hints; your board must SHOW the step (e.g. hop arc i, dot i, cookie dealt i).
- Every answer control is a `<button>` with `data-testid="choice"` `data-value={n}` and an `aria-label`; keep them ≥ 64 px. Drag interactions MUST also work by tap and keyboard (Enter/Space).
- Feedback classes: chosen-correct → gold `is-right`; chosen-wrong → `is-wrong` + nudge; disabled → `is-out`; modelled → `is-model` pulse. Celebrate on `st.phase === "solved"` or `st.feedback?.correct` (e.g. the balloon rises).
- Layout must work at 390×844, 915×412, 1024×1366, 1280×800; use container queries / % positions. Animate transform/opacity only; add `@media (prefers-reduced-motion: reduce)` fallbacks. Put CSS in a `<game>.css` imported by your board.

## Skin fields (`GameSkin`)
`Background, ObjectArt, Basket, Sticker, Mascot` (required; pass simple stubs for unused) and optional:
`Board, Tray, music` (`"sky" | "cave" | "kitchen" | "meadow" | "island"`), `story { intro, outro, between }`, `helper { Character, name, explainLine, hintLine }`, `praise: string[]` (your praise line ids; var `n` = answer), `hintVoice` (map `"hint.countAlong" | "hint.lastNumber" | "hint.model" | "hint.modelTap" | "retry.1"` → your lines), `alongSteps(ex)`, `alongSay(ex, i) → number|null` (number spoken at each step), `idle { line, target }` (selector to point at; never point at the correct answer).
Characters: `Bobbo` (`src/characters/Bobbo.tsx`), `Zuzu, Gloop, Hoot, Rumble, Puff` (`src/characters/Crew.tsx`) all accept `state`, `talking`, `size`. Scene helpers: `Sky, Actor, Zzz, Spark` in `src/game/scenes.tsx`; story types in `src/game/story.tsx`.

## Writing rules
Lines ≤ 14 words for ages 4–8; concrete; process praise ("you counted on from 7!"), never "smart". Every story has a problem a child cares about, the child as the hero, and a payoff. The helper character explains the CONCEPT (not just "try again"). Original names, art, and text only.
