import { clampLevel, maxDifficulty } from "./progression";
import { createRng, hashSeed } from "./rng";
import type { Exercise, GameDefinition, Round } from "./types";

/**
 * Build the exercise pool for one round. Pure and deterministic: same game, level and seed → same round
 * (so a refreshed page resumes exactly, and a day's mix can be rebuilt from its seed).
 *
 *  - Authored exercises are always included, except tutorials, which play on level 0 only.
 *  - With a generator, each difficulty band the round can reach (in-round step-down to 1, step-up by R2)
 *    gets `roundLength` generated exercises. Each one has its own RNG derived from (seed, game, band, index),
 *    so adding a band never changes another band's content.
 */
export function buildRound(game: GameDefinition, opts: { level: number; seed: number }): Round {
  const cfg = game.progression;
  const level = clampLevel(opts.level, cfg);
  const seed = opts.seed >>> 0;
  const authored = game.exercises.filter((e) => level === 0 || !e.tutorial);
  if (!game.generate) return { gameId: game.id, level, seed, exercises: authored };

  const start = level + 1;
  const lo = Math.max(1, start - (cfg.roundLength - 1));
  const hi = Math.min(maxDifficulty(cfg), start + Math.ceil((cfg.roundLength - 1) / Math.max(1, cfg.stepUpAfter)));
  const generated: Exercise[] = [];
  for (let d = lo; d <= hi; d++) generated.push(...generateBand(game, d - 1, seed, cfg.roundLength));

  const exercises = [...authored, ...generated];
  const seen = new Set<string>();
  for (const e of exercises) {
    if (seen.has(e.id)) throw new Error(`buildRound(${game.id}): duplicate exercise id ${e.id}`);
    seen.add(e.id);
  }
  return { gameId: game.id, level, seed, exercises };
}

/** Generate `count` exercises for one 0-based level (difficulty = level + 1). Every index gets its own RNG; all share `band.seed`. */
export function generateBand(game: GameDefinition, level: number, seed: number, count: number): Exercise[] {
  const gen = game.generate;
  if (!gen) return [];
  const band = { seed: hashSeed(seed, game.id, level, "band") };
  return Array.from({ length: count }, (_, i) => ({ ...gen(level, createRng(hashSeed(seed, game.id, level, i)), i, band), difficulty: level + 1 }));
}
