/**
 * The ONLY place the public site reads game data. Everything the site says about a game's ages, skills and
 * levels comes from the content registry (src/content) — the same metadata that routes and plans the games —
 * so public pages cannot drift from the product. New worlds appear here automatically when their pack lands.
 */
import { allWorlds, registry } from "../content";
import { GAME_COPY } from "./content/games";
import { asNumber, correctValue, generateBand } from "../engine";
import type { Exercise, GameDefinition } from "../engine/types";

export interface SiteLevel {
  /** 1-based level as shown to grown-ups. */
  difficulty: number;
  /** Smallest and largest correct answer at this level, when answers are numbers. */
  answerRange?: readonly [number, number];
  /** Up to three distinct objectives from a sample round at this level, straight from the data. */
  examples: readonly string[];
}

export interface SiteGame {
  id: string;
  title: string;
  /** Host character's display name. */
  mascot: string;
  ages: readonly [number, number];
  subject: string;
  skillIds: readonly string[];
  /** Factual description for grown-ups (registry `parentDescription`). */
  learningObjective: string;
  /** One line a child understands. */
  blurb: string;
  gameType: string;
  /** Number of levels (registry maxLevel is 0-based). */
  levelCount: number;
  levels: readonly SiteLevel[];
  roundLength: number;
  playPath: string;
}

/** Sample exercises for one 0-based level: generated worlds use a fixed seed; static worlds use their authored data. */
function sampleAt(def: GameDefinition, level: number): readonly Exercise[] {
  if (def.generate) return generateBand(def, level, 1, def.progression.roundLength);
  return def.exercises.filter((e) => e.difficulty === level + 1 && !e.tutorial);
}

function levelsOf(def: GameDefinition, maxLevel: number): SiteLevel[] {
  const out: SiteLevel[] = [];
  for (let level = 0; level <= maxLevel; level++) {
    const at = sampleAt(def, level);
    if (at.length === 0) continue;
    const nums = at.map((e) => asNumber(correctValue(e.answer))).filter((n): n is number => n !== null);
    out.push({
      difficulty: level + 1,
      answerRange: nums.length === at.length ? [Math.min(...nums), Math.max(...nums)] : undefined,
      examples: [...new Set(at.map((e) => e.objective))].slice(0, 3),
    });
  }
  return out;
}

// Prerender-only module (never shipped to the browser), so loading every definition up front is fine.
const DEFS = new Map<string, GameDefinition>(await Promise.all(allWorlds().map(async (w) => [w.id, await w.loadDefinition()] as const)));

const characterName = (id: string | undefined) => registry.characters.find((c) => c.id === id)?.name ?? "Bobbo";

/** Games in the order a child meets them (youngest first). */
// A world gets public pages once its editorial copy exists (src/site/content/games.ts): no thin auto-generated pages.
export const GAMES: readonly SiteGame[] = allWorlds()
  .filter((w) => w.id in GAME_COPY)
  .map((w) => ({
    id: w.id,
    title: w.title,
    mascot: characterName(w.characters[0]),
    ages: w.ages,
    subject: w.subject,
    skillIds: w.skills,
    learningObjective: w.parentDescription,
    blurb: w.blurb,
    gameType: w.gameType,
    levelCount: w.maxLevel + 1,
    levels: levelsOf(DEFS.get(w.id)!, w.maxLevel),
    roundLength: DEFS.get(w.id)!.progression.roundLength,
    playPath: `/play/${w.id}`,
  }))
  .sort((a, b) => a.ages[0] - b.ages[0] || a.ages[1] - b.ages[1] || a.title.localeCompare(b.title));

export const gameById = (id: string) => GAMES.find((g) => g.id === id);

/** Years shared by a game's age range and an age band (inclusive). */
export function overlapYears(ages: readonly [number, number], band: { min: number; max: number }): number {
  return Math.max(0, Math.min(ages[1], band.max) - Math.max(ages[0], band.min) + 1);
}
