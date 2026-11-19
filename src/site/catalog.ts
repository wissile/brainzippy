/**
 * The ONLY place the public site reads game data. Everything the site says about a game's ages, skills and
 * levels comes from the content registry (src/content) — the same metadata that routes and plans the games —
 * so public pages cannot drift from the product. New worlds appear here automatically when their pack lands.
 * Only worlds of LIVE libraries are published (D-028); coming-soon libraries have no public pages at all.
 */
import { playableWorlds, registry } from "../content";
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
  /** Library id (= registry World.subject). */
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
  /** First-try answers in a row that make the next puzzles in a round harder. */
  stepUpAfter: number;
  /** True when puzzles are generated fresh (seeded per day); false for hand-written puzzle sets. */
  generated: boolean;
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
const DEFS = new Map<string, GameDefinition>(await Promise.all(playableWorlds().map(async (w) => [w.id, await w.loadDefinition()] as const)));

const characterName = (id: string | undefined) => registry.characters.find((c) => c.id === id)?.name ?? "Bobbo";

/** Games in the order a child meets them (youngest first). */
// A world gets public pages once its editorial copy exists (src/site/content/games.ts): no thin auto-generated pages.
export const GAMES: readonly SiteGame[] = playableWorlds()
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
    stepUpAfter: DEFS.get(w.id)!.progression.stepUpAfter,
    generated: typeof DEFS.get(w.id)!.generate === "function",
    playPath: `/play/${w.id}`,
  }))
  .sort((a, b) => a.ages[0] - b.ages[0] || a.ages[1] - b.ages[1] || a.title.localeCompare(b.title));

export const gameById = (id: string) => GAMES.find((g) => g.id === id);

/** Years shared by a game's age range and an age band (inclusive). */
export function overlapYears(ages: readonly [number, number], band: { min: number; max: number }): number {
  return Math.max(0, Math.min(ages[1], band.max) - Math.max(ages[0], band.min) + 1);
}

/** Ages covered by the published games today (derived, so it can never go stale). */
export const AGES_NOW = { min: Math.min(...GAMES.map((g) => g.ages[0])), max: Math.max(...GAMES.map((g) => g.ages[1])) } as const;

export interface SiteLibrary {
  id: string;
  /** Grown-up title, e.g. "Maths". */
  title: string;
  kidTitle: string;
  /** Host character id and display name. */
  host: string;
  hostName: string;
  /** Library parent description (registry). */
  description: string;
  pitch: string;
  /** Planned age range of the whole library (the games available today may cover less). */
  ages: readonly [number, number];
  games: readonly SiteGame[];
}
/** @deprecated Libraries replaced subjects (D-028); same shape plus library fields. */
export type SiteSubject = SiteLibrary;

/** Live libraries with at least one published game, most games first (ties: registry title). Coming-soon libraries never appear. */
export const LIBRARIES_NOW: readonly SiteLibrary[] = registry.libraries
  .filter((l) => l.status === "live")
  .map((l) => ({
    id: l.id,
    title: l.title,
    kidTitle: l.kidTitle,
    host: l.host,
    hostName: registry.characters.find((c) => c.id === l.host)?.name ?? l.host,
    description: l.description,
    pitch: l.pitch,
    ages: l.ages,
    games: GAMES.filter((g) => g.subject === l.id),
  }))
  .filter((l) => l.games.length > 0)
  .sort((a, b) => b.games.length - a.games.length || a.title.localeCompare(b.title));

/** @deprecated Use LIBRARIES_NOW. */
export const SUBJECTS_NOW: readonly SiteSubject[] = LIBRARIES_NOW;

/** Public URL of a library page. */
export const libraryPath = (id: string) => `/libraries/${id}`;

/** Fewest and most levels across published games. */
export const LEVEL_RANGE = { min: Math.min(...GAMES.map((g) => g.levelCount)), max: Math.max(...GAMES.map((g) => g.levelCount)) } as const;

/** "a, b and c" */
export const listJoin = (xs: readonly string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
