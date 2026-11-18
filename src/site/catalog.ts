/**
 * The ONLY place the public site reads game data. Everything the site says about a game's ages,
 * skills, levels and example puzzles is derived from the same definitions the games run on, so the
 * public pages cannot drift from the product.
 *
 * TODO(main agent): repoint these imports at src/content/registry.ts once it lands; the exported
 * shape below is what the site depends on.
 */
import type { Exercise, GameDefinition } from "../engine/types";
import { countingAdventure } from "../games/counting-adventure/definition";
import { glowCaveHops } from "../games/glow-cave-hops/definition";
import { skyBalloonRace } from "../games/sky-balloon-race/definition";
import { cookieKitchen } from "../games/cookie-kitchen/definition";

const DEFINITIONS: readonly GameDefinition[] = [countingAdventure, glowCaveHops, skyBalloonRace, cookieKitchen];

export interface SiteLevel {
  difficulty: number;
  exerciseCount: number;
  /** Smallest and largest correct answer at this level. */
  answerRange: readonly [number, number];
  /** Up to three distinct exercise objectives, straight from the data. */
  examples: readonly string[];
}

export interface SiteGame {
  id: string;
  title: string;
  mascot: string;
  ages: readonly [number, number];
  skillIds: readonly string[];
  learningObjective: string;
  exerciseCount: number;
  roundLength: number;
  levels: readonly SiteLevel[];
  playPath: string;
  achievement: string;
}

function levelsOf(exercises: readonly Exercise[], min: number, max: number): SiteLevel[] {
  const out: SiteLevel[] = [];
  for (let d = min; d <= max; d++) {
    const at = exercises.filter((e) => e.difficulty === d);
    if (at.length === 0) continue;
    const targets = at.map((e) => e.target);
    const examples = [...new Set(at.map((e) => e.objective))].slice(0, 3);
    out.push({ difficulty: d, exerciseCount: at.length, answerRange: [Math.min(...targets), Math.max(...targets)], examples });
  }
  return out;
}

function toSiteGame(g: GameDefinition): SiteGame {
  return {
    id: g.id,
    title: g.title,
    mascot: g.mascot,
    ages: g.ages,
    skillIds: g.skillIds,
    learningObjective: g.learningObjective,
    exerciseCount: g.exercises.length,
    roundLength: g.progression.roundLength,
    levels: levelsOf(g.exercises, g.progression.minDifficulty, g.progression.maxDifficulty),
    playPath: `/play/${g.id}`,
    achievement: g.achievement.title,
  };
}

/** Games in the order a child meets them (youngest first). */
export const GAMES: readonly SiteGame[] = DEFINITIONS.map(toSiteGame).sort((a, b) => a.ages[0] - b.ages[0] || a.ages[1] - b.ages[1]);

export const gameById = (id: string) => GAMES.find((g) => g.id === id);

/** Years shared by a game's age range and an age band (inclusive). */
export function overlapYears(ages: readonly [number, number], band: { min: number; max: number }): number {
  return Math.max(0, Math.min(ages[1], band.max) - Math.max(ages[0], band.min) + 1);
}
