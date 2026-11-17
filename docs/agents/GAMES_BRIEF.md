# Wave B — brief for game-world agents

Read `docs/agents/PHASE1_BRIEF.md` and `CLAUDE.md` first, then `docs/GAME_AUTHORING.md`, which is the authoritative contract. Then study the reference worlds:
- `src/games/counting-adventure` — generator-based, uses the generic boards.
- `src/games/sky-balloon-race` — custom drag board.
- `src/games/glow-cave-hops` — custom slide board.
- `src/games/cookie-kitchen` — custom drag/tap board.

## What "outstanding" means here

- **A story with stakes.** Every world opens with a short cinematic `StoryPlayer` intro of 3–5 beats: a character with a small, concrete, kid-sized problem. Story beats between exercises keep it moving, and an outro resolves it.
  - Example: "Bobbo woke up hungry and needs 5 apples for breakfast."
  - Keep beats short: one sentence each, readable by a 6-year-old, with voice for every line.
- **A real interaction, not a quiz card.** Children drag, slide, build, sort, pour, connect or tap things in a scene.
  - Every drag has a tap-tap and keyboard alternative.
  - Objects react to touch: lift, wobble, snap, a sound.
- **A helper character explains the concept.** The skin's `helper` gives a short explanation at round start and after a first miss. The second miss shows a worked or modelled answer on the board itself.
- **Difficulty that grows.** Use a generator with `maxLevel` 6–10. Levels map to clearly documented parameters (number ranges, distractor similarity, number of steps, time pressure: **none**). Level 0 has a short tutorial with a pointing hand.
  - The R0 rule levels the child up after a good round.
  - Content must stay correct at every level. Unit-test the generator across levels × seeds.
- **Original art.** SVG components in your world's `art.tsx`, using the palette in `src/characters/` and the existing Critter Crew characters (Bobbo, Zuzu, Gloop, Hoot, Rumble, Puff; see `src/characters/`).
  - Draw the scene background, the interactive objects, and a sticker reward.
  - No emoji as art, no stock images, nothing resembling existing brands or characters.
- **Original music.** Pick an existing loop (`island`, `meadow`, `sky`, `cave`, `kitchen`). If none fits, add a new loop to `scripts/gen_music.py` (synthesised, original) and say so.
- **Voice.** Every spoken line goes in your world's `voice.json`, with short, warm, natural sentences and praise for process ("You counted carefully!"), not ability. Lines are captioned automatically.
  - Don't render clips yourself; the main agent renders them with Kokoro af_bella.
  - The clip-coverage unit test will fail until then. That's expected, and you should report it.
- **Accessibility.**
  - Playable muted, by keyboard and without drag.
  - Tap targets ≥64px for under-7s and ≥44px otherwise.
  - Reduced-motion path.
  - No overflow at 390×844, 915×412, 1024×1366 and 1280×800. Check screenshots at all four.
- **Learning quality.**
  - The world has an explicit objective and skills registered in the content registry.
  - Hints teach the strategy and don't just give the answer.
  - Wrong answers are never punished.
  - Document the pedagogy (what it teaches, why this interaction, how levels progress, which misconception each distractor targets) in `docs/worlds/<world-id>.md`.

## Files you own
- `src/games/<world-id>/**`
- your registry entry: the pack folder named in your task, under `src/content/packs/`
- `e2e/<world-id>.spec.ts`
- `tests/unit/<world-id>*.test.ts`
- `docs/worlds/<world-id>.md`

Framework changes (`src/engine`, `src/game`, shared CSS, characters): avoid them. If you really need one, make it minimal and backwards-compatible, and call it out in your report.

## Required tests
- Unit: generator determinism; lint of every level × 50 seeds; validation of edge cases.
- Playwright (`--project=desktop` and `--project=phone`, with your assigned `PW_PORT`):
  - enter the world from `/play/<id>` (skip story);
  - finish a whole round by drag, by tap-tap, and by keyboard;
  - first miss shows the helper, second miss shows the model;
  - the reward appears and the level goes up.
- Visual check: save screenshots of intro, play and reward at the four viewports to `/home/claude/review/<world-id>/` and look at them yourself before reporting.

Report in ≤250 words. Include: the world summary, levels table (one line per level), files, shared edits, tests run and their results, and the voice line count.
