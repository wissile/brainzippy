import { describe, expect, it } from "vitest";
import { initialProgression, isRoundComplete, markPlayed, applyResult, selectNextExercise, startDifficultyFor, levelAfterRound } from "../../src/engine/progression";
import { buildRound, generateBand } from "../../src/engine/round";
import { createRng } from "../../src/engine/rng";
import type { GameDefinition } from "../../src/engine/types";
import { choicesOf, lintExercise, targetOf } from "../../src/engine/validation";
import { COUNTING_LEVELS, generateCounting } from "../../src/games/counting-adventure/generator";
import { countingAdventure } from "../../src/games/counting-adventure/definition";
import { cookieKitchen } from "../../src/games/cookie-kitchen/definition";
import { glowCaveHops } from "../../src/games/glow-cave-hops/definition";
import { skyBalloonRace } from "../../src/games/sky-balloon-race/definition";

const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 1);
const GENERATED: GameDefinition[] = [countingAdventure];
const ALL: GameDefinition[] = [countingAdventure, skyBalloonRace, glowCaveHops, cookieKitchen];

describe("generators: determinism and lint", () => {
  for (const game of GENERATED) {
    it(`${game.id}: every generated exercise for levels 0..max across 50 seeds passes lint`, () => {
      const problems: string[] = [];
      for (const seed of SEEDS) {
        for (let level = 0; level <= game.progression.maxLevel; level++) {
          const band = generateBand(game, level, seed, game.progression.roundLength);
          for (const ex of band) {
            problems.push(...lintExercise(ex));
            if (ex.difficulty !== level + 1) problems.push(`${ex.id}: difficulty ${ex.difficulty} ≠ level + 1`);
            if (!game.skillIds.includes(ex.skillId)) problems.push(`${ex.id}: skill ${ex.skillId} not declared by the game`);
          }
          const round = buildRound(game, { level, seed });
          for (const ex of round.exercises) problems.push(...lintExercise(ex));
        }
      }
      expect(problems).toEqual([]);
    });

    it(`${game.id}: same (level, seed) → identical round; different seed → different round`, () => {
      for (let level = 0; level <= game.progression.maxLevel; level++) {
        expect(buildRound(game, { level, seed: 5 })).toEqual(buildRound(game, { level, seed: 5 }));
        expect(buildRound(game, { level, seed: 5 }).exercises).not.toEqual(buildRound(game, { level, seed: 6 }).exercises);
      }
    });

    it(`${game.id}: a band's content does not depend on which level the round starts at`, () => {
      const lvl1 = buildRound(game, { level: 1, seed: 77 }).exercises.filter((e) => e.difficulty === 2);
      const lvl0 = buildRound(game, { level: 0, seed: 77 }).exercises.filter((e) => e.difficulty === 2);
      expect(lvl1).toEqual(lvl0);
    });
  }

  it("the generator itself is pure: same (level, rng seed, index) → same exercise", () => {
    for (let level = 0; level < COUNTING_LEVELS.length; level++)
      for (let i = 0; i < 10; i++) expect(generateCounting(level, createRng(99), i)).toEqual(generateCounting(level, createRng(99), i));
  });
});

describe("buildRound", () => {
  it("level 0 includes the tutorial; later levels never do (R1)", () => {
    for (const game of ALL) {
      const tut = game.exercises.find((e) => e.tutorial);
      expect(tut, game.id).toBeDefined();
      expect(buildRound(game, { level: 0, seed: 1 }).exercises.some((e) => e.tutorial), game.id).toBe(true);
      for (let level = 1; level <= game.progression.maxLevel; level++)
        expect(buildRound(game, { level, seed: 1 }).exercises.some((e) => e.tutorial), `${game.id} level ${level}`).toBe(false);
      expect(selectNextExercise(buildRound(game, { level: 0, seed: 3 }), initialProgression(game.progression))?.id).toBe(tut!.id);
    }
  });

  it("static games return their authored pool unchanged (minus tutorials after level 0)", () => {
    for (const game of [skyBalloonRace, glowCaveHops, cookieKitchen]) {
      expect(buildRound(game, { level: 0, seed: 9 }).exercises).toEqual(game.exercises);
      expect(buildRound(game, { level: 2, seed: 9 }).exercises).toEqual(game.exercises.filter((e) => !e.tutorial));
    }
  });

  it("clamps the level into 0..maxLevel", () => {
    expect(buildRound(countingAdventure, { level: -3, seed: 1 }).level).toBe(0);
    expect(buildRound(countingAdventure, { level: 99, seed: 1 }).level).toBe(countingAdventure.progression.maxLevel);
  });

  it("covers every difficulty a round can reach: down to 1 and up by the step-up rule", () => {
    const cfg = countingAdventure.progression;
    for (let level = 0; level <= cfg.maxLevel; level++) {
      const diffs = new Set(buildRound(countingAdventure, { level, seed: 4 }).exercises.map((e) => e.difficulty));
      const start = startDifficultyFor(level, cfg);
      for (let d = 1; d <= Math.min(cfg.maxLevel + 1, start + 4); d++) expect(diffs.has(d), `level ${level} difficulty ${d}`).toBe(true);
    }
  });
});

describe("counting-adventure generator: content", () => {
  it("quantities follow the level table; tap/make never ask for a single object; make-set pools fit", () => {
    for (const seed of SEEDS)
      for (let level = 0; level < COUNTING_LEVELS.length; level++)
        for (const ex of generateBand(countingAdventure, level, seed, 8)) {
          const n = targetOf(ex);
          const { min, max } = COUNTING_LEVELS[level]!;
          expect(n, ex.id).toBeGreaterThanOrEqual(ex.interaction === "choose-count" ? min : Math.max(2, min));
          expect(n, ex.id).toBeLessThanOrEqual(max);
          expect(n, ex.id).toBeLessThanOrEqual(10);
          if (ex.interaction === "make-set") expect(ex.poolSize!, ex.id).toBeLessThanOrEqual(10);
          else expect(choicesOf(ex), ex.id).toHaveLength(3);
          // e2e helpers rely on the interaction being visible in the id
          expect(ex.id).toMatch(/^ca-(tap|choose|make)-\d+-[a-z]+-l\d+n\d+$/);
        }
  });

  it("a level-0 round played all first-try climbs and alternates interactions (R2, R5)", () => {
    const cfg = countingAdventure.progression;
    const round = buildRound(countingAdventure, { level: 0, seed: 2024 });
    let st = initialProgression(cfg, startDifficultyFor(0, cfg));
    const seq: { interaction: string; difficulty: number }[] = [];
    while (!isRoundComplete(st, cfg)) {
      const ex = selectNextExercise(round, st)!;
      seq.push({ interaction: ex.interaction, difficulty: ex.difficulty });
      st = applyResult(markPlayed(st, ex.id), { exerciseId: ex.id, skillId: ex.skillId, difficulty: ex.difficulty, attempts: 1, firstTry: true, hintsShown: 0 }, cfg);
    }
    expect(seq.map((s) => s.difficulty)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    for (let i = 1; i < seq.length; i++) expect(seq[i]!.interaction).not.toBe(seq[i - 1]!.interaction);
    expect(levelAfterRound(0, st.results, cfg)).toEqual({ level: 1, leveledUp: true });
  });

  it("a struggling child at level 0 only meets quantities 1–3", () => {
    const cfg = countingAdventure.progression;
    const round = buildRound(countingAdventure, { level: 0, seed: 31 });
    let st = initialProgression(cfg);
    while (!isRoundComplete(st, cfg)) {
      const ex = selectNextExercise(round, st)!;
      expect(targetOf(ex)).toBeLessThanOrEqual(3);
      st = applyResult(markPlayed(st, ex.id), { exerciseId: ex.id, skillId: ex.skillId, difficulty: ex.difficulty, attempts: 3, firstTry: false, hintsShown: 2 }, cfg);
    }
    expect(levelAfterRound(0, st.results, cfg)).toEqual({ level: 0, leveledUp: false });
  });
});
