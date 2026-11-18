# Game Authoring Guide — the contract for adding a world

A **world** = one game folder `src/games/<id>/` + one registry entry in a content pack `src/content/packs/<pack>/index.ts`.
You never edit shared files (`src/engine`, `src/game`, `src/app`, `src/audio/voiceLines.json`). If you think you must, stop and ask the lead.
Reference implementation: `src/games/counting-adventure/` (Bobbo's Breakfast: generator + tutorial + story + helper).
Engine background: `docs/GAME_ENGINE.md`. Decisions: D-023.

## 1. Files

| File | Owner | Purpose |
|---|---|---|
| `src/games/<id>/definition.ts` | you | `GameDefinition` — DATA only (§3). May import `generate` from `./generator`. |
| `src/games/<id>/generator.ts` | you | Optional. Pure `(level, rng, index) => exercise` + the level table (§5). |
| `src/games/<id>/voice.json` | you | Every spoken line of the world (§7). |
| `src/games/<id>/art.tsx` | you | Original SVG art: `Background`, objects, `Sticker`; scene props (§8). |
| `src/games/<id>/story.tsx` | you | `StoryBeat[]` intro (≈4 beats), outro (≈3), `between` lines keyed by exercises done (2, 4, 6). |
| `src/games/<id>/Board.tsx` + `<id>.css` | you | Custom board/tray if the default ones don't fit (§6). |
| `src/games/<id>/<Name>.tsx` | you | `export default function <Name>() { return <GameRunner game={def} skin={skin} />; }` |
| `src/content/packs/<pack>/index.ts` | pack owner | Subjects, topics, skills, characters, worlds (§9). A new library = a new pack folder; nothing else to register. |
| `tests/unit/<id>.test.ts` | you | §10 |
| `e2e/<id>.spec.ts` | you | §10 |

Routing, the map, page titles and voice catalogues pick the world up automatically: `/play/<id>` resolves through `getWorld(id)`; the map shows worlds with a `map` position; `src/games/*/voice.json` is globbed.

## 2. Public API (import from `src/engine` and `src/content`)
```ts
// src/engine (pure TS)
type Exercise, Answer, AnswerOption, AnswerValue, AnswerKey, GameDefinition, ExerciseGenerator, Round
createRng(seed) → Rng { next, int, pick, shuffle, chance } · hashSeed(...parts) · seedForDay("YYYY-MM-DD", ...extra) · randomSeed()
buildRound(game, { level, seed }) → Round · generateBand(game, level, seed, count)
validateAnswer(answer, value) · isSubmittable · correctValue · lintExercise(ex) · targetOf(ex) · choicesOf(ex) · asNumber(v)
initExercise · exerciseReducer · ExerciseState · ExerciseEvent · HintStage
startDifficultyFor · levelAfterRound · selectNextExercise · applyResult · initialProgression
// src/content
getWorld(id) · allWorlds() · worldsForAge(age) · worldsBySubject() · skillPrereqs(skillId) · getSkill(id) · checkRegistry()
types Subject, Topic, Skill, Character, World, ContentPack
// src/game
GameRunner({ game, skin, seed? }) · GameSkin · BoardProps · OptionBoard · SequenceBoard
```

## 3. `definition.ts`
```ts
export const myGame: GameDefinition = {
  id: "word-garden",                       // kebab-case = folder = route = registry world id
  title: "Word Garden", mascot: "zuzu", ages: [5, 7],
  skillIds: ["english.phonics.initial-sound"],
  learningObjective: "Hear and match the first sound of a word.",
  progression: { roundLength: 8, maxLevel: 5, stepUpAfter: 2, stepDownAtAttempts: 3 },
  exercises: [tutorial],                   // authored items; with a generator usually just the tutorial
  generate: generateWordGarden,            // optional
  achievement: { id: "sound-spotter", title: "Sound Spotter" },
};
```
Every exercise: `id` (lowercase, unique), `skillId` (declared in a pack), `objective`, `ages`, `difficulty` (= level + 1), `interaction`, `answer`, `objectKind` (prompt icon / art key), `seed`, `a11yDescription`, optional `params` (your numbers), `prompt { line, vars, text }`, `tutorial`, `layout`, `poolSize` (make-set).
- Exactly **one** `tutorial: true` exercise at difficulty 1. Tutorials play on level 0 only.
- Static (no generator) worlds need **≥ 8 exercises at difficulty 1** and **≥ 5 at every other difficulty** (1..maxLevel+1).
- Distractors must be plausible (±1, ±2, a common error, a near-miss word) — never silly.

## 4. Answer kinds (`exercise.answer`)
| kind | Data | Board submits `act({ type: "SUBMIT", value })` with | First miss (hintStage 1) | Second miss (hintStage 2) |
|---|---|---|---|---|
| `number` | `{ value, choices? }` | a number (one of `choices` if given) | wrong pick → `eliminated`; no choices → `direction` (`check.reason` too-high/too-low) | `model = value`, other choices eliminated |
| `choice` | `{ correct, options: AnswerOption[] }` | the option id | wrong option → `eliminated` | `model = correct` id, others eliminated |
| `sequence` | `{ order: ids, pieces: AnswerOption[] }` (pieces may include distractors) | ordered piece ids | `check.parts["i"]` per slot (mark-parts) + first distractor used → `eliminated` | `model = order`, distractors eliminated |
| `set` | `{ correct: ids, options }` | selected ids (any order) | `check.parts[id]` per selected option + first wrong pick → `eliminated` | `model = correct`, wrong options eliminated |
| `match` | `{ pairs: {item→target}, items, targets }` (sorting = many items share a target) | `{ itemId: targetId }` | `check.parts[itemId]` (mark-parts) | `model = pairs` |
| `numeric` | `{ value, tolerance, unit?, min?, max?, step? }` | a number (|v − value| ≤ tolerance is correct) | `direction` via `check.reason` | `model = value` |

`AnswerOption = { id, text?, art?, say? }` — needs `text` or `art`; `art` is rendered by your `ObjectArt`; `say` is a voice-line id for pre-readers. Sequence pieces with the same `text` are interchangeable ("b o o k" works with either "o").
Counting interactions (`tap-count`, `choose-count`, `make-set`) always use `number`. Everything else uses `interaction: "choose"`.
Malformed submissions (wrong shape, unknown ids, eliminated keys) are **ignored**, never counted as wrong. Retries are unlimited.

## 5. Generators and levels (fresh content every day)
```ts
// generator.ts — pure: no Date, no Math.random, no I/O. Same (level, rng, index) → same exercise.
export const LEVELS = [ { maxN: 3 }, { maxN: 5 }, /* ... */ ] as const;   // level → difficulty parameters
export const MAX_LEVEL = LEVELS.length - 1;
export const generateX: ExerciseGenerator = (level, rng, index) => {
  const p = LEVELS[level]!;
  const n = rng.int(1, p.maxN);
  return { id: `xx-${n}-l${level}n${index}`, /* ...every Exercise field except difficulty... */ };
};
```
- `level` is 0-based (Level 1 on screen = level 0); the engine stamps `difficulty = level + 1`. `maxLevel` = `LEVELS.length - 1` (any size, e.g. 0..11).
- Ids must be unique per (level, index): end them with `-l<level>n<index>`, and keep any part e2e helpers read (counting: `ca-<tap|choose|make>-<n>-…`).
- Use `index` for variety you want guaranteed (e.g. rotate interaction kinds by `index % k`) and `rng` for everything else.
- Only generate values your voice lines cover (`vary` lists are finite): e.g. counting stays within 1–10 and four snack kinds.
- `buildRound(game, { level, seed })` = authored exercises (tutorials only at level 0) + `roundLength` generated items for every difficulty the round can reach. Seeds: daily learning passes `seedForDay(day, …)`; free play uses a random seed saved with the round (refresh resumes exactly).
- Levels (R0, D-019): ≥ 50 % first-try in a round → level + 1 (max `maxLevel`); otherwise the same level again. Within a round difficulty still steps up after 2 first-try answers and down after 3+ attempts.
- No generator? Leave `generate` out; the authored pool is used as is.

## 6. Boards (`skin.Board`, `skin.Tray`)
Defaults: counting interactions use the picnic boards; `choice`/`set` answers use `OptionBoard`, `sequence` uses `SequenceBoard` (tap-to-place, no drag). **`match` and `numeric` need your own Board.** Number `choose` games normally ship a custom board.
`BoardProps = { st, act, alongIndex, ObjectArt, Basket, progress, busy }`:
- `st.exercise` (`answer`, `params`), `st.phase` (`counting | answering | feedback | solved`), `st.hintStage` (0/1/2), `st.eliminated` (keys greyed by hints — can't be submitted), `st.model` (stage 2: the answer to show/pulse), `st.lastAnswer`, `st.check` (`reason`, `parts`), `st.feedback?.correct`, `st.attempts`.
- Submit with `act({ type: "SUBMIT", value })` only when `st.phase === "answering"` and nothing in `value` is eliminated. (`CHOOSE` is a deprecated alias for numbers.)
- `alongIndex` — worked-example step (−1 = none). The runner animates 0..`skin.alongSteps(ex) − 1` on the modelled answer (and on choose-count's first miss); your board must SHOW each step (hop i, dot i, piece i placed).
- `progress { done, total }` — round progress for in-world visuals. `busy()` — call while the child drags/deals so idle help waits.
- Every answer control: `<button>` with `data-testid="choice"`, `data-value`, an action-describing `aria-label`; check buttons `data-testid="done"`. ≥ 64 px for under-7s (≥ 44 px always). Drag must also work by tap and keyboard (Enter/Space).
- Classes: chosen-right `is-right` (gold), chosen-wrong `is-wrong` + nudge, eliminated `is-out`, model `is-model` pulse, right part after a miss `is-ok`.
- Layout at 390×844, 915×412, 1024×1366, 1280×800 (container queries / %); animate transform/opacity only; add `prefers-reduced-motion` fallbacks.

## 7. Skin (`GameSkin`) and voice
Required: `Background, ObjectArt, Basket, Sticker, Mascot` (stub what you don't use). Optional: `Board, Tray, music` (`sky | cave | kitchen | meadow | island`), `story { intro, outro, between }`, `helper { Character, name, explainLine, hintLine }` (explains the CONCEPT at round start and on the first miss), `praise: string[]` (vars: `n` for number answers + your `params`), `hintVoice` (map engine ids → your lines: `retry.1`, `hint.countAlong`, `hint.model`, `hint.show`, `hint.modelTap`), `alongSteps(ex)`, `alongSay(ex, i) → number | null`, `numberKeys` (default true for number answers), `tutorialTarget`, `intro { line, text, backLine, backText }`, `idle { line, target }` (never point at the correct answer).
Engine default lines: number answers praise with `correct.1–4` (say the number); other kinds `praise.1–2`; first miss `retry.1` (choose) or counting hints; second miss `hint.model` (number) / `hint.show` (others). Map them to world lines with `praise` / `hintVoice`.
`voice.json`: `{ "lines": { "<prefix>.<name>": { "text": "…{var}…", "vary": { "var": [all values] } } } }`. Prefix every id with your world prefix. `vary` lists every value so clips are pre-rendered (keep combinations < 150; generators must stay inside them). Lines ≤ 14 words for ages 4–8; process praise ("you counted on from 7!"), never "smart". The lead renders clips (Kokoro af_bella); until then the clip-coverage unit test fails — say so in your report.

## 8. Art and characters
Original SVG only (no stock, emoji, fonts or CDNs). Reuse the Critter Crew (`Bobbo` in `src/characters/Bobbo.tsx`; `Zuzu, Gloop, Hoot, Rumble, Puff` in `src/characters/Crew.tsx`; all take `state`, `talking`, `size`) and scene helpers (`Sky, Actor, Zzz, Spark` in `src/game/scenes.tsx`). New characters: declare them in your pack's `characters`, follow `docs/CHARACTER_SYSTEM.md` (silhouette, palette, the eight `MascotState`s, reduced-motion), and get creative-director review.

## 9. Registry entry (`src/content/packs/<pack>/index.ts`, default export `ContentPack`)
```ts
const pack: ContentPack = {
  id: "english-core", title: "English (ages 4–8)",
  subjects: [{ id: "english", title: "English", description: "…" }],
  topics:   [{ id: "english.phonics", subject: "english", title: "Phonics" }],
  skills:   [{ id: "english.phonics.initial-sound", title: "First sounds", topic: "english.phonics", ages: [4, 6],
               prerequisites: [], objective: "Say and match the first sound of a spoken word." }],
  characters: [/* only NEW characters; ids are global */],
  worlds: [{
    id: "word-garden", subject: "english", topic: "english.phonics", skills: ["english.phonics.initial-sound"],
    ages: [5, 7], maxLevel: 5, title: "Word Garden", gameType: "phonics game",
    blurb: "Help Zuzu plant words that start with the same sound!",
    parentDescription: "Children hear a sound and pick the picture whose name starts with it.", // factual; no efficacy claims (D-020)
    characters: ["zuzu"],                                   // first = host shown on maps/cards
    load: () => import("../../../games/word-garden/WordGarden"),
    loadDefinition: () => import("../../../games/word-garden/definition").then((m) => m.wordGarden),
    voice: "src/games/word-garden/voice.json",
    map: { x: 50, y: 55 },                                  // optional: Monster Island stop (%)
  }],
};
export default pack;
```
Packs hold metadata only (no eager game imports). `checkRegistry()` enforces: unique ids, known subject/topic/skill/character references, acyclic prerequisites, ages within 3–14, `maxLevel` matching the game, no "proven" claims.

## 10. Required tests
- `tests/unit/<id>.test.ts`: every authored exercise passes `lintExercise`; params ↔ answer maths; board-independent logic; voice `vary` covers every value your content can produce.
- With a generator: for levels 0..maxLevel × ≥ 50 seeds every generated exercise passes `lintExercise`, has a declared skill, stays in your voice ranges; same seed → same round (see `tests/unit/generator.test.ts`).
- Registry integrity runs automatically (`tests/unit/registry.test.ts`: every world loads, lints at every level, matches its entry).
- `e2e/<id>.spec.ts`: `seed(page, { muted: true })`, `page.goto("/play/<id>")`, skip the story (`story-begin`/`story-skip`), play a full round **without drag** to the sticker; one wrong answer shows the nudge then the model; no overflow at the four viewports.
- Run `npx tsc -b`, `npx vitest run`, `PW_PORT=<port> npx playwright test e2e/<id>.spec.ts --project=desktop` (+ `--project=phone` for layout).

## 11. Minimal worked example — a picture-choice world with a generator
```ts
// src/games/first-sounds/generator.ts
import type { ExerciseGenerator } from "../../engine/types";
const WORDS = { b: ["ball", "bus"], s: ["sun", "sock"], m: ["moon", "mop"] } as const;
export const LEVELS = [{ options: 2 }, { options: 3 }] as const;
export const generateFirstSounds: ExerciseGenerator = (level, rng, index) => {
  const sounds = rng.shuffle(Object.keys(WORDS) as (keyof typeof WORDS)[]).slice(0, LEVELS[level]!.options);
  const target = sounds[0]!;
  const options = rng.shuffle(sounds.map((s) => ({ id: s, art: rng.pick(WORDS[s]) })));
  const word = options.find((o) => o.id === target)!.art;
  return {
    id: `fs-${target}-l${level}n${index}`, skillId: "english.phonics.initial-sound", objective: `Hear the first sound /${target}/`,
    ages: [4, 6], interaction: "choose", objectKind: "speaker", seed: rng.int(1, 1e6),
    answer: { kind: "choice", correct: target, options },
    prompt: { line: "fs.prompt", vars: { sound: target }, text: `Which starts with ${target}?` },
    a11yDescription: `${options.length} pictures. Choose the one that starts with ${target}, like ${word}.`,
  };
};
// definition.ts: progression { roundLength: 8, maxLevel: LEVELS.length - 1, stepUpAfter: 2, stepDownAtAttempts: 3 },
//                exercises: [one authored tutorial with tutorial: true, difficulty: 1], generate: generateFirstSounds
// FirstSounds.tsx: skin without Board → OptionBoard renders the pictures (ObjectArt draws ball, sun, moon…)
// voice.json: "fs.prompt": { "text": "Which picture starts with {sound}?", "vary": { "sound": ["b", "s", "m"] } }
// pack: one World entry pointing at the three files above.
```
